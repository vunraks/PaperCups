from flask import Flask, request, jsonify, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
import datetime
import os
import sqlite3
from functools import wraps

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key-here'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///ecocups.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# Убираем CORS для локального проекта
@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response

# Модели базы данных
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    phone = db.Column(db.String(20))
    password_hash = db.Column(db.String(128))
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    is_active = db.Column(db.Boolean, default=True)
    is_admin = db.Column(db.Boolean, default=False)
    
    # Связи
    orders = db.relationship('Order', backref='user', lazy=True)

class Product(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    price = db.Column(db.Float, nullable=False)
    category = db.Column(db.String(50))
    image_url = db.Column(db.String(200))
    stock = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    
    # Связи
    order_items = db.relationship('OrderItem', backref='product', lazy=True)

class Order(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    total_amount = db.Column(db.Float, nullable=False)
    status = db.Column(db.String(20), default='pending')  # pending, confirmed, shipped, delivered
    shipping_address = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    
    # Связи
    items = db.relationship('OrderItem', backref='order', lazy=True, cascade='all, delete-orphan')

class OrderItem(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey('order.id'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('product.id'), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    price = db.Column(db.Float, nullable=False)

class CartItem(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('product.id'), nullable=False)
    quantity = db.Column(db.Integer, nullable=False, default=1)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    
    # Связи с другими таблицами
    user = db.relationship('User', backref='cart_items')
    product = db.relationship('Product', backref='cart_items')

# Функция для проверки JWT токена
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            token = request.headers['Authorization'].split(" ")[1]
        
        if not token:
            return jsonify({'message': 'Токен отсутствует!'}), 401
        
        try:
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
            current_user = User.query.filter_by(id=data['user_id']).first()
        except:
            return jsonify({'message': 'Неверный токен!'}), 401
        
        return f(current_user, *args, **kwargs)
    
    return decorated

# Инициализация базы данных с тестовыми данными
def init_db():
    with app.app_context():
        db.create_all()
        
        # Создаем админа по умолчанию, если его нет
        admin = User.query.filter_by(email='admin@ecocups.ru').first()
        if not admin:
            admin = User(
                username='admin',
                email='admin@ecocups.ru',
                phone='+7 (999) 123-45-67',
                password_hash=generate_password_hash('admin123'),
                is_admin=True,
                is_active=True
            )
            db.session.add(admin)
            db.session.commit()
            print("Админ создан: admin@ecocups.ru / admin123")
        
        # Добавляем тестовые товары, если их нет
        if Product.query.count() == 0:
            test_products = [
                Product(
                    name='Стаканчик 200мл',
                    description='Экологичный бумажный стаканчик объемом 200мл',
                    price=5.0,
                    category='cups',
                    image_url='images/cup200.png',
                    stock=1000
                ),
                Product(
                    name='Стаканчик 300мл',
                    description='Экологичный бумажный стаканчик объемом 300мл',
                    price=7.0,
                    category='cups',
                    image_url='images/cup300.png',
                    stock=1000
                ),
                Product(
                    name='Стаканчик 400мл',
                    description='Экологичный бумажный стаканчик объемом 400мл',
                    price=9.0,
                    category='cups',
                    image_url='images/cup400.png',
                    stock=1000
                ),
                Product(
                    name='Крышки для стаканчиков',
                    description='Пластиковые крышки для бумажных стаканчиков',
                    price=3.0,
                    category='lids',
                    image_url='images/lids.png',
                    stock=2000
                )
            ]
            
            for product in test_products:
                db.session.add(product)
            
            db.session.commit()
            print("Тестовые товары добавлены")

# Тестовый endpoint
@app.route('/api/test/', methods=['GET'])
def test():
    return jsonify({'message': 'Сервер работает!', 'status': 'ok'})

# Временный endpoint для проверки пользователей
@app.route('/api/debug/users/', methods=['GET'])
def debug_users():
    users = User.query.all()
    users_data = []
    for user in users:
        users_data.append({
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'is_admin': user.is_admin,
            'is_active': user.is_active
        })
    return jsonify(users_data)

# Временный endpoint для назначения прав администратора
@app.route('/api/debug/make-admin/<email>/', methods=['POST'])
def make_admin(email):
    user = User.query.filter_by(email=email).first()
    if user:
        user.is_admin = True
        user.is_active = True
        db.session.commit()
        return jsonify({'message': f'Пользователь {email} назначен администратором'})
    else:
        return jsonify({'error': 'Пользователь не найден'}), 404

# API маршруты

@app.route('/api/register/', methods=['POST'])
def register():
    data = request.get_json()
    
    # Проверяем обязательные поля
    required_fields = ['username', 'email', 'password', 'password2']
    for field in required_fields:
        if not data.get(field):
            return jsonify({'error': f'Поле {field} обязательно'}), 400
    
    # Проверяем совпадение паролей
    if data['password'] != data['password2']:
        return jsonify({'error': 'Пароли не совпадают'}), 400
    
    # Проверяем длину пароля
    if len(data['password']) < 6:
        return jsonify({'error': 'Пароль должен содержать минимум 6 символов'}), 400
    
    # Проверяем, существует ли пользователь с таким email
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'error': 'Пользователь с таким email уже существует'}), 400
    
    # Проверяем, существует ли пользователь с таким username
    if User.query.filter_by(username=data['username']).first():
        return jsonify({'error': 'Пользователь с таким именем уже существует'}), 400
    
    try:
        # Создаем нового пользователя
        user = User(
            username=data['username'],
            email=data['email'],
            phone=data.get('phone', ''),
            password_hash=generate_password_hash(data['password']),
            is_admin=False,  # По умолчанию обычный пользователь
            is_active=True
        )
        
        db.session.add(user)
        db.session.commit()
        
        # Генерируем JWT токены
        access_token = jwt.encode(
            {
                'user_id': user.id,
                'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
            },
            app.config['SECRET_KEY'],
            algorithm="HS256"
        )
        
        refresh_token = jwt.encode(
            {
                'user_id': user.id,
                'exp': datetime.datetime.utcnow() + datetime.timedelta(days=30)
            },
            app.config['SECRET_KEY'],
            algorithm="HS256"
        )
        
        return jsonify({
            'access': access_token,
            'refresh': refresh_token,
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'phone': user.phone,
                'is_admin': user.is_admin,
                'is_active': user.is_active
            }
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/login/', methods=['POST'])
def login():
    data = request.get_json()
    
    if not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Email и пароль обязательны'}), 400
    
    user = User.query.filter_by(email=data['email']).first()
    
    if user and check_password_hash(user.password_hash, data['password']):
        if not user.is_active:
            return jsonify({'error': 'Аккаунт заблокирован'}), 403
        
        # Генерируем JWT токены
        access_token = jwt.encode(
            {
                'user_id': user.id,
                'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
            },
            app.config['SECRET_KEY'],
            algorithm="HS256"
        )
        
        refresh_token = jwt.encode(
            {
                'user_id': user.id,
                'exp': datetime.datetime.utcnow() + datetime.timedelta(days=30)
            },
            app.config['SECRET_KEY'],
            algorithm="HS256"
        )
        
        return jsonify({
            'access': access_token,
            'refresh': refresh_token,
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'phone': user.phone,
                'is_admin': user.is_admin,
                'is_active': user.is_active
            }
        })
    else:
        return jsonify({'error': 'Неверный email или пароль'}), 401

@app.route('/api/user/', methods=['GET'])
@token_required
def get_user_profile(current_user):
    return jsonify({
        'id': current_user.id,
        'username': current_user.username,
        'email': current_user.email,
        'phone': current_user.phone,
        'is_admin': current_user.is_admin,
        'is_active': current_user.is_active,
        'created_at': current_user.created_at.isoformat()
    })

@app.route('/api/products/', methods=['GET'])
def get_products():
    products = Product.query.filter_by(is_active=True).all()
    return jsonify([{
        'id': p.id,
        'name': p.name,
        'description': p.description,
        'price': p.price,
        'image': p.image,
        'category': p.category,
        'stock': p.stock
    } for p in products])

@app.route('/api/products/<int:product_id>/', methods=['GET'])
def get_product(product_id):
    product = Product.query.get_or_404(product_id)
    return jsonify({
        'id': product.id,
        'name': product.name,
        'description': product.description,
        'price': product.price,
        'image': product.image,
        'category': product.category,
        'stock': product.stock
    })

@app.route('/api/orders/', methods=['POST'])
@token_required
def create_order(current_user):
    data = request.get_json()
    
    if not data or not data.get('shipping_address'):
        return jsonify({'error': 'Необходим адрес доставки'}), 400
    
    # Получаем товары из корзины пользователя
    cart_items = CartItem.query.filter_by(user_id=current_user.id).all()
    
    if not cart_items:
        return jsonify({'error': 'Корзина пуста'}), 400
    
    # Создание заказа
    total_amount = 0
    for cart_item in cart_items:
        product = Product.query.get(cart_item.product_id)
        if product:
            total_amount += product.price * cart_item.quantity
    
    order = Order(
        user_id=current_user.id,
        total_amount=total_amount,
        shipping_address=data['shipping_address'],
        phone=data.get('phone', current_user.phone)
    )
    
    db.session.add(order)
    db.session.flush()  # Получаем ID заказа
    
    # Добавление товаров в заказ из корзины
    for cart_item in cart_items:
        product = Product.query.get(cart_item.product_id)
        if product:
            order_item = OrderItem(
                order_id=order.id,
                product_id=cart_item.product_id,
                quantity=cart_item.quantity,
                price=product.price
            )
            db.session.add(order_item)
    
    # Очищаем корзину после создания заказа
    CartItem.query.filter_by(user_id=current_user.id).delete()
    
    db.session.commit()
    
    return jsonify({
        'order_id': order.id,
        'total_amount': order.total_amount,
        'status': order.status
    }), 201

@app.route('/api/orders/', methods=['GET'])
@token_required
def get_user_orders(current_user):
    orders = Order.query.filter_by(user_id=current_user.id).order_by(Order.created_at.desc()).all()
    
    result = []
    for order in orders:
        order_items = OrderItem.query.filter_by(order_id=order.id).all()
        items = []
        for item in order_items:
            product = Product.query.get(item.product_id)
            items.append({
                'product_name': product.name if product else 'Товар не найден',
                'quantity': item.quantity,
                'price': item.price
            })
        
        result.append({
            'id': order.id,
            'total_amount': order.total_amount,
            'status': order.status,
            'created_at': order.created_at.isoformat(),
            'items': items
        })
    
    return jsonify(result)

@app.route('/api/cart/', methods=['GET'])
@token_required
def get_cart(current_user):
    """Получить содержимое корзины пользователя"""
    cart_items = CartItem.query.filter_by(user_id=current_user.id).all()
    
    result = []
    for item in cart_items:
        product = Product.query.get(item.product_id)
        if product:
            result.append({
                'id': item.id,
                'product_id': item.product_id,
                'name': product.name,
                'price': product.price,
                'image': product.image,
                'quantity': item.quantity,
                'total': product.price * item.quantity
            })
    
    return jsonify(result)

@app.route('/api/cart/', methods=['POST'])
@token_required
def add_to_cart(current_user):
    """Добавить товар в корзину"""
    data = request.get_json()
    
    if not data or not data.get('product_id'):
        return jsonify({'error': 'Необходим ID товара'}), 400
    
    product_id = data['product_id']
    quantity = data.get('quantity', 1)
    
    # Проверяем существование товара
    product = Product.query.get(product_id)
    if not product:
        return jsonify({'error': 'Товар не найден'}), 404
    
    # Проверяем, есть ли уже такой товар в корзине
    existing_item = CartItem.query.filter_by(
        user_id=current_user.id, 
        product_id=product_id
    ).first()
    
    if existing_item:
        # Увеличиваем количество
        existing_item.quantity += quantity
    else:
        # Создаем новый элемент корзины
        cart_item = CartItem(
            user_id=current_user.id,
            product_id=product_id,
            quantity=quantity
        )
        db.session.add(cart_item)
    
    db.session.commit()
    
    return jsonify({'message': 'Товар добавлен в корзину'})

@app.route('/api/cart/<int:cart_item_id>/', methods=['PUT'])
@token_required
def update_cart_item(current_user, cart_item_id):
    """Обновить количество товара в корзине"""
    data = request.get_json()
    
    if not data or 'quantity' not in data:
        return jsonify({'error': 'Необходимо указать количество'}), 400
    
    quantity = data['quantity']
    if quantity < 1:
        return jsonify({'error': 'Количество должно быть больше 0'}), 400
    
    cart_item = CartItem.query.filter_by(
        id=cart_item_id, 
        user_id=current_user.id
    ).first()
    
    if not cart_item:
        return jsonify({'error': 'Элемент корзины не найден'}), 404
    
    cart_item.quantity = quantity
    db.session.commit()
    
    return jsonify({'message': 'Количество обновлено'})

@app.route('/api/cart/<int:cart_item_id>/', methods=['DELETE'])
@token_required
def remove_from_cart(current_user, cart_item_id):
    """Удалить товар из корзины"""
    cart_item = CartItem.query.filter_by(
        id=cart_item_id, 
        user_id=current_user.id
    ).first()
    
    if not cart_item:
        return jsonify({'error': 'Элемент корзины не найден'}), 404
    
    db.session.delete(cart_item)
    db.session.commit()
    
    return jsonify({'message': 'Товар удален из корзины'})

@app.route('/api/cart/clear/', methods=['DELETE'])
@token_required
def clear_cart(current_user):
    """Очистить корзину пользователя"""
    CartItem.query.filter_by(user_id=current_user.id).delete()
    db.session.commit()
    
    return jsonify({'message': 'Корзина очищена'})

@app.route('/api/refresh/', methods=['POST'])
def refresh_token():
    data = request.get_json()
    
    if not data or not data.get('refresh'):
        return jsonify({'error': 'Refresh token обязателен'}), 400
    
    try:
        # Декодируем refresh token
        payload = jwt.decode(data['refresh'], app.config['SECRET_KEY'], algorithms=["HS256"])
        user_id = payload['user_id']
        
        # Проверяем, существует ли пользователь
        user = User.query.filter_by(id=user_id).first()
        if not user:
            return jsonify({'error': 'Пользователь не найден'}), 401
        
        # Генерируем новые токены
        access_token = jwt.encode(
            {
                'user_id': user.id,
                'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
            },
            app.config['SECRET_KEY'],
            algorithm="HS256"
        )
        
        refresh_token = jwt.encode(
            {
                'user_id': user.id,
                'exp': datetime.datetime.utcnow() + datetime.timedelta(days=30)
            },
            app.config['SECRET_KEY'],
            algorithm="HS256"
        )
        
        return jsonify({
            'access': access_token,
            'refresh': refresh_token
        })
        
    except jwt.ExpiredSignatureError:
        return jsonify({'error': 'Refresh token истек'}), 401
    except jwt.InvalidTokenError:
        return jsonify({'error': 'Неверный refresh token'}), 401

# Обработчик ошибок
@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Страница не найдена'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Внутренняя ошибка сервера'}), 500

# Статические файлы
@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:filename>')
def serve_static(filename):
    return send_from_directory('.', filename)

@app.route('/images/<path:filename>')
def serve_images(filename):
    return send_from_directory('images', filename)

# ===== АДМИН ЭНДПОИНТЫ =====

@app.route('/api/admin/stats/', methods=['GET'])
@token_required
def admin_stats(current_user):
    try:
        # Проверяем права администратора
        if not current_user.is_admin:
            return jsonify({'error': 'Доступ запрещен'}), 403
        
        # Получаем статистику
        total_users = User.query.count()
        total_orders = Order.query.count()
        total_products = Product.query.count()
        
        # Считаем общую выручку
        orders = Order.query.filter_by(status='delivered').all()
        total_revenue = sum(order.total_amount for order in orders)
        
        return jsonify({
            'total_users': total_users,
            'total_orders': total_orders,
            'total_revenue': total_revenue,
            'total_products': total_products
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/users/', methods=['GET'])
@token_required
def admin_users(current_user):
    try:
        # Проверяем права администратора
        if not current_user.is_admin:
            return jsonify({'error': 'Доступ запрещен'}), 403
        
        users = User.query.all()
        users_data = []
        
        for user in users:
            users_data.append({
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'phone': user.phone,
                'created_at': user.created_at.isoformat(),
                'is_active': user.is_active,
                'is_admin': user.is_admin
            })
        
        return jsonify(users_data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/orders/', methods=['GET'])
@token_required
def admin_orders(current_user):
    try:
        # Проверяем права администратора
        if not current_user.is_admin:
            return jsonify({'error': 'Доступ запрещен'}), 403
        
        orders = Order.query.all()
        orders_data = []
        
        for order in orders:
            order_items = []
            for item in order.items:
                order_items.append({
                    'product_name': item.product.name,
                    'quantity': item.quantity,
                    'price': item.price
                })
            
            orders_data.append({
                'id': order.id,
                'user_username': order.user.username,
                'items': order_items,
                'total_amount': order.total_amount,
                'status': order.status,
                'created_at': order.created_at.isoformat(),
                'shipping_address': order.shipping_address
            })
        
        return jsonify(orders_data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/products/', methods=['GET', 'POST'])
@token_required
def admin_products(current_user):
    try:
        # Проверяем права администратора
        if not current_user.is_admin:
            return jsonify({'error': 'Доступ запрещен'}), 403
        
        if request.method == 'GET':
            # Получить все товары
            products = Product.query.all()
            products_data = []
            
            for product in products:
                products_data.append({
                    'id': product.id,
                    'name': product.name,
                    'description': product.description,
                    'price': product.price,
                    'category': product.category,
                    'image_url': product.image_url,
                    'stock': product.stock,
                    'created_at': product.created_at.isoformat()
                })
            
            return jsonify(products_data)
        
        elif request.method == 'POST':
            # Добавить новый товар
            data = request.get_json()
            
            new_product = Product(
                name=data['name'],
                description=data['description'],
                price=data['price'],
                category=data['category'],
                image_url=data['image_url'],
                stock=data['stock']
            )
            
            db.session.add(new_product)
            db.session.commit()
            
            return jsonify({'message': 'Товар успешно добавлен', 'id': new_product.id}), 201
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/products/<int:product_id>/', methods=['DELETE'])
@token_required
def admin_delete_product(current_user, product_id):
    try:
        # Проверяем права администратора
        if not current_user.is_admin:
            return jsonify({'error': 'Доступ запрещен'}), 403
        
        product = Product.query.get_or_404(product_id)
        db.session.delete(product)
        db.session.commit()
        
        return jsonify({'message': 'Товар успешно удален'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    init_db()
    app.run(debug=True, host='0.0.0.0', port=8000)
