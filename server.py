from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
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
CORS(app, origins=["*"], supports_credentials=True)

# Модели базы данных
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    phone = db.Column(db.String(20), nullable=False)
    password_hash = db.Column(db.String(200), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)

class Product(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    price = db.Column(db.Float, nullable=False)
    image = db.Column(db.String(200))
    category = db.Column(db.String(50))
    stock = db.Column(db.Integer, default=0)
    is_active = db.Column(db.Boolean, default=True)

class Order(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    total_amount = db.Column(db.Float, nullable=False)
    status = db.Column(db.String(20), default='pending')
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    shipping_address = db.Column(db.Text)
    phone = db.Column(db.String(20))

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
        
        # Добавляем тестовые товары, если их нет
        if not Product.query.first():
            products = [
                {
                    'name': 'Стаканчик 200мл',
                    'description': 'Экологичный бумажный стаканчик объемом 200мл',
                    'price': 5.0,
                    'image': 'cup200.png',
                    'category': 'cups',
                    'stock': 1000
                },
                {
                    'name': 'Стаканчик 300мл',
                    'description': 'Экологичный бумажный стаканчик объемом 300мл',
                    'price': 7.0,
                    'image': 'cup300.png',
                    'category': 'cups',
                    'stock': 1000
                },
                {
                    'name': 'Стаканчик 400мл',
                    'description': 'Экологичный бумажный стаканчик объемом 400мл',
                    'price': 9.0,
                    'image': 'cup400.png',
                    'category': 'cups',
                    'stock': 1000
                },
                {
                    'name': 'Крышки для стаканчиков',
                    'description': 'Пластиковые крышки для бумажных стаканчиков',
                    'price': 3.0,
                    'image': 'lids.png',
                    'category': 'accessories',
                    'stock': 2000
                }
            ]
            
            for product_data in products:
                product = Product(**product_data)
                db.session.add(product)
            
            db.session.commit()

# Тестовый endpoint
@app.route('/api/test/', methods=['GET'])
def test():
    return jsonify({'message': 'Сервер работает!', 'status': 'ok'})

# API маршруты

@app.route('/api/register/', methods=['POST'])
def register():
    data = request.get_json()
    
    # Проверка обязательных полей
    required_fields = ['username', 'email', 'phone', 'password', 'password2']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Поле {field} обязательно'}), 400
    
    # Проверка совпадения паролей
    if data['password'] != data['password2']:
        return jsonify({'error': 'Пароли не совпадают'}), 400
    
    # Проверка существования пользователя
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'error': 'Пользователь с таким email уже существует'}), 400
    
    if User.query.filter_by(username=data['username']).first():
        return jsonify({'error': 'Пользователь с таким именем уже существует'}), 400
    
    # Создание нового пользователя
    hashed_password = generate_password_hash(data['password'])
    new_user = User(
        username=data['username'],
        email=data['email'],
        phone=data['phone'],
        password_hash=hashed_password
    )
    
    db.session.add(new_user)
    db.session.commit()
    
    # Генерация токенов
    access_token = jwt.encode(
        {
            'user_id': new_user.id,
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
        },
        app.config['SECRET_KEY'],
        algorithm="HS256"
    )
    
    refresh_token = jwt.encode(
        {
            'user_id': new_user.id,
            'exp': datetime.datetime.utcnow() + datetime.timedelta(days=30)
        },
        app.config['SECRET_KEY'],
        algorithm="HS256"
    )
    
    return jsonify({
        'access': access_token,
        'refresh': refresh_token,
        'user': {
            'id': new_user.id,
            'username': new_user.username,
            'email': new_user.email
        }
    }), 201

@app.route('/api/login/', methods=['POST'])
def login():
    data = request.get_json()
    
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Email и пароль обязательны'}), 400
    
    user = User.query.filter_by(email=data['email']).first()
    
    if not user or not check_password_hash(user.password_hash, data['password']):
        return jsonify({'error': 'Неверный email или пароль'}), 401
    
    # Генерация токенов
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
            'email': user.email
        }
    })

@app.route('/api/user/', methods=['GET'])
@token_required
def get_user(current_user):
    return jsonify({
        'id': current_user.id,
        'username': current_user.username,
        'email': current_user.email,
        'phone': current_user.phone
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

if __name__ == '__main__':
    init_db()
    app.run(debug=True, host='0.0.0.0', port=8000)
