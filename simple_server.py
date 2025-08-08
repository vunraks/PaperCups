import json
import sqlite3
import os
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import hashlib
import datetime
import base64
import uuid

# Простой секретный ключ
SECRET_KEY = "your-secret-key-here"

class SimpleHTTPRequestHandler(BaseHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        self.init_database()
        super().__init__(*args, **kwargs)
    
    def init_database(self):
        """Инициализация базы данных"""
        conn = sqlite3.connect('ecocups.db')
        cursor = conn.cursor()
        
        # Создание таблицы пользователей
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                phone TEXT NOT NULL,
                password_hash TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Создание таблицы товаров
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT,
                price REAL NOT NULL,
                image TEXT,
                category TEXT,
                stock INTEGER DEFAULT 0,
                is_active BOOLEAN DEFAULT 1
            )
        ''')
        
        # Создание таблицы корзины
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS cart_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                product_id INTEGER NOT NULL,
                quantity INTEGER NOT NULL DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id),
                FOREIGN KEY (product_id) REFERENCES products (id),
                UNIQUE(user_id, product_id)
            )
        ''')
        
        # Создание таблицы заказов
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                total_amount REAL NOT NULL,
                status TEXT DEFAULT 'pending',
                shipping_address TEXT,
                phone TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        ''')
        
        # Создание таблицы позиций заказа
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS order_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_id INTEGER NOT NULL,
                product_id INTEGER NOT NULL,
                quantity INTEGER NOT NULL,
                price REAL NOT NULL,
                FOREIGN KEY (order_id) REFERENCES orders (id),
                FOREIGN KEY (product_id) REFERENCES products (id)
            )
        ''')
        
        # Добавление тестовых товаров, если их нет
        cursor.execute('SELECT COUNT(*) FROM products')
        if cursor.fetchone()[0] == 0:
            products = [
                ('Стаканчик 200мл', 'Экологичный бумажный стаканчик объемом 200мл', 5.0, 'cup200.png', 'cups', 1000),
                ('Стаканчик 300мл', 'Экологичный бумажный стаканчик объемом 300мл', 7.0, 'cup300.png', 'cups', 1000),
                ('Стаканчик 400мл', 'Экологичный бумажный стаканчик объемом 400мл', 9.0, 'cup400.png', 'cups', 1000),
                ('Крышки для стаканчиков', 'Пластиковые крышки для бумажных стаканчиков', 3.0, 'lids.png', 'accessories', 2000)
            ]
            cursor.executemany('''
                INSERT INTO products (name, description, price, image, category, stock)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', products)
        
        conn.commit()
        conn.close()
    
    def get_db_connection(self):
        """Получение соединения с базой данных"""
        return sqlite3.connect('ecocups.db')
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()
    
    def do_GET(self):
        if self.path.startswith('/api/'):
            self.handle_api_get()
        else:
            self.serve_static_file()
    
    def do_POST(self):
        if self.path.startswith('/api/'):
            self.handle_api_post()
        else:
            self.send_error(404)
    
    def do_PUT(self):
        if self.path.startswith('/api/'):
            self.handle_api_put()
        else:
            self.send_error(404)
    
    def do_DELETE(self):
        if self.path.startswith('/api/'):
            self.handle_api_delete()
        else:
            self.send_error(404)
    
    def handle_api_get(self):
        if self.path == '/api/test/':
            self.send_json_response({'message': 'Сервер работает!', 'status': 'ok'})
        elif self.path == '/api/products/':
            self.get_products()
        elif self.path == '/api/user/':
            self.get_user()
        elif self.path == '/api/orders/':
            self.get_user_orders()
        elif self.path == '/api/cart/':
            self.get_user_cart()
        else:
            self.send_error(404)
    
    def handle_api_post(self):
        if self.path == '/api/register/':
            self.register_user()
        elif self.path == '/api/login/':
            self.login_user()
        elif self.path == '/api/orders/':
            self.create_order()
        elif self.path == '/api/cart/':
            self.add_to_cart()
        else:
            self.send_error(404)
    
    def handle_api_put(self):
        if self.path.startswith('/api/cart/'):
            self.update_cart_item()
        else:
            self.send_error(404)
    
    def handle_api_delete(self):
        if self.path.startswith('/api/cart/'):
            self.remove_from_cart()
        else:
            self.send_error(404)
    
    def get_products(self):
        conn = self.get_db_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT id, name, description, price, image, category, stock FROM products WHERE is_active = 1')
        products = []
        for row in cursor.fetchall():
            products.append({
                'id': row[0],
                'name': row[1],
                'description': row[2],
                'price': row[3],
                'image': row[4],
                'category': row[5],
                'stock': row[6]
            })
        conn.close()
        self.send_json_response(products)
    
    def get_user_cart(self):
        # Проверка токена
        auth_header = self.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            self.send_json_response({'error': 'Токен отсутствует'}, 401)
            return
        
        token = auth_header.split(' ')[1]
        user_data = self.decode_simple_token(token)
        
        if not user_data:
            self.send_json_response({'error': 'Неверный токен'}, 401)
            return
        
        conn = self.get_db_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute('''
                SELECT ci.id, ci.quantity, p.id, p.name, p.price, p.image
                FROM cart_items ci
                JOIN products p ON ci.product_id = p.id
                WHERE ci.user_id = ?
            ''', (user_data['user_id'],))
            
            cart_items = []
            for row in cursor.fetchall():
                cart_items.append({
                    'id': row[0],
                    'product_id': row[2],
                    'name': row[3],
                    'price': row[4],
                    'image': row[5],
                    'quantity': row[1],
                    'total': row[4] * row[1]
                })
            
            self.send_json_response(cart_items)
            
        except Exception as e:
            self.send_json_response({'error': f'Ошибка получения корзины: {str(e)}'}, 500)
        finally:
            conn.close()
    
    def add_to_cart(self):
        # Проверка токена
        auth_header = self.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            self.send_json_response({'error': 'Токен отсутствует'}, 401)
            return
        
        token = auth_header.split(' ')[1]
        user_data = self.decode_simple_token(token)
        
        if not user_data:
            self.send_json_response({'error': 'Неверный токен'}, 401)
            return
        
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        data = json.loads(post_data.decode('utf-8'))
        
        if not data.get('product_id') or not data.get('quantity'):
            self.send_json_response({'error': 'Необходимы ID товара и количество'}, 400)
            return
        
        conn = self.get_db_connection()
        cursor = conn.cursor()
        
        try:
            # Проверяем, есть ли уже товар в корзине
            cursor.execute('SELECT id, quantity FROM cart_items WHERE user_id = ? AND product_id = ?', 
                         (user_data['user_id'], data['product_id']))
            existing_item = cursor.fetchone()
            
            if existing_item:
                # Обновляем количество
                new_quantity = existing_item[1] + data['quantity']
                cursor.execute('UPDATE cart_items SET quantity = ? WHERE id = ?', 
                             (new_quantity, existing_item[0]))
            else:
                # Добавляем новый товар
                cursor.execute('INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?)',
                             (user_data['user_id'], data['product_id'], data['quantity']))
            
            conn.commit()
            self.send_json_response({'message': 'Товар добавлен в корзину'})
            
        except Exception as e:
            conn.rollback()
            self.send_json_response({'error': f'Ошибка добавления в корзину: {str(e)}'}, 500)
        finally:
            conn.close()
    
    def update_cart_item(self):
        # Проверка токена
        auth_header = self.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            self.send_json_response({'error': 'Токен отсутствует'}, 401)
            return
        
        token = auth_header.split(' ')[1]
        user_data = self.decode_simple_token(token)
        
        if not user_data:
            self.send_json_response({'error': 'Неверный токен'}, 401)
            return
        
        # Получаем ID товара из URL
        path_parts = self.path.split('/')
        if len(path_parts) < 4:
            self.send_json_response({'error': 'Неверный URL'}, 400)
            return
        
        try:
            cart_item_id = int(path_parts[3])
        except ValueError:
            self.send_json_response({'error': 'Неверный ID товара'}, 400)
            return
        
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        data = json.loads(post_data.decode('utf-8'))
        
        if not data.get('quantity') or data['quantity'] < 1:
            self.send_json_response({'error': 'Количество должно быть больше 0'}, 400)
            return
        
        conn = self.get_db_connection()
        cursor = conn.cursor()
        
        try:
            # Проверяем, принадлежит ли товар пользователю
            cursor.execute('SELECT id FROM cart_items WHERE id = ? AND user_id = ?', 
                         (cart_item_id, user_data['user_id']))
            if not cursor.fetchone():
                self.send_json_response({'error': 'Товар не найден в корзине'}, 404)
                return
            
            # Обновляем количество
            cursor.execute('UPDATE cart_items SET quantity = ? WHERE id = ?', 
                         (data['quantity'], cart_item_id))
            
            conn.commit()
            self.send_json_response({'message': 'Количество обновлено'})
            
        except Exception as e:
            conn.rollback()
            self.send_json_response({'error': f'Ошибка обновления корзины: {str(e)}'}, 500)
        finally:
            conn.close()
    
    def remove_from_cart(self):
        # Проверка токена
        auth_header = self.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            self.send_json_response({'error': 'Токен отсутствует'}, 401)
            return
        
        token = auth_header.split(' ')[1]
        user_data = self.decode_simple_token(token)
        
        if not user_data:
            self.send_json_response({'error': 'Неверный токен'}, 401)
            return
        
        # Получаем ID товара из URL
        path_parts = self.path.split('/')
        if len(path_parts) < 4:
            self.send_json_response({'error': 'Неверный URL'}, 400)
            return
        
        try:
            cart_item_id = int(path_parts[3])
        except ValueError:
            self.send_json_response({'error': 'Неверный ID товара'}, 400)
            return
        
        conn = self.get_db_connection()
        cursor = conn.cursor()
        
        try:
            # Проверяем, принадлежит ли товар пользователю
            cursor.execute('SELECT id FROM cart_items WHERE id = ? AND user_id = ?', 
                         (cart_item_id, user_data['user_id']))
            if not cursor.fetchone():
                self.send_json_response({'error': 'Товар не найден в корзине'}, 404)
                return
            
            # Удаляем товар
            cursor.execute('DELETE FROM cart_items WHERE id = ?', (cart_item_id,))
            
            conn.commit()
            self.send_json_response({'message': 'Товар удален из корзины'})
            
        except Exception as e:
            conn.rollback()
            self.send_json_response({'error': f'Ошибка удаления из корзины: {str(e)}'}, 500)
        finally:
            conn.close()
    
    def create_simple_token(self, user_data):
        """Создает простой токен без JWT"""
        token_data = {
            'user_id': user_data.get('id', 1),
            'username': user_data.get('username', 'user'),
            'email': user_data.get('email', ''),
            'exp': (datetime.datetime.utcnow() + datetime.timedelta(hours=24)).isoformat()
        }
        token_str = json.dumps(token_data)
        return base64.b64encode(token_str.encode()).decode()
    
    def decode_simple_token(self, token):
        """Декодирует простой токен"""
        try:
            token_str = base64.b64decode(token.encode()).decode()
            return json.loads(token_str)
        except:
            return None
    
    def hash_password(self, password):
        """Хеширование пароля"""
        return hashlib.sha256(password.encode()).hexdigest()
    
    def verify_password(self, password, password_hash):
        """Проверка пароля"""
        return self.hash_password(password) == password_hash
    
    def register_user(self):
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        data = json.loads(post_data.decode('utf-8'))
        
        # Простая валидация
        required_fields = ['username', 'email', 'phone', 'password', 'password2']
        for field in required_fields:
            if field not in data:
                self.send_json_response({'error': f'Поле {field} обязательно'}, 400)
                return
        
        if data['password'] != data['password2']:
            self.send_json_response({'error': 'Пароли не совпадают'}, 400)
            return
        
        # Проверка длины пароля
        if len(data['password']) < 6:
            self.send_json_response({'error': 'Пароль должен содержать минимум 6 символов'}, 400)
            return
        
        conn = self.get_db_connection()
        cursor = conn.cursor()
        
        try:
            # Проверка существования пользователя
            cursor.execute('SELECT id FROM users WHERE email = ? OR username = ?', (data['email'], data['username']))
            if cursor.fetchone():
                self.send_json_response({'error': 'Пользователь с таким email или именем уже существует'}, 400)
                return
            
            # Создание нового пользователя
            password_hash = self.hash_password(data['password'])
            cursor.execute('''
                INSERT INTO users (username, email, phone, password_hash)
                VALUES (?, ?, ?, ?)
            ''', (data['username'], data['email'], data['phone'], password_hash))
            
            user_id = cursor.lastrowid
            conn.commit()
            
            # Создание токена
            user_data = {
                'id': user_id,
                'username': data['username'],
                'email': data['email']
            }
            
            access_token = self.create_simple_token(user_data)
            refresh_token = self.create_simple_token(user_data)
            
            response = {
                'access': access_token,
                'refresh': refresh_token,
                'user': user_data
            }
            self.send_json_response(response, 201)
            
        except sqlite3.IntegrityError:
            self.send_json_response({'error': 'Пользователь с таким email или именем уже существует'}, 400)
        except Exception as e:
            self.send_json_response({'error': f'Ошибка создания пользователя: {str(e)}'}, 500)
        finally:
            conn.close()
    
    def login_user(self):
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        data = json.loads(post_data.decode('utf-8'))
        
        if not data.get('email') or not data.get('password'):
            self.send_json_response({'error': 'Email и пароль обязательны'}, 400)
            return
        
        conn = self.get_db_connection()
        cursor = conn.cursor()
        
        try:
            # Поиск пользователя
            cursor.execute('SELECT id, username, email, password_hash FROM users WHERE email = ?', (data['email'],))
            user = cursor.fetchone()
            
            if user and self.verify_password(data['password'], user[3]):
                user_data = {
                    'id': user[0],
                    'username': user[1],
                    'email': user[2]
                }
                
                access_token = self.create_simple_token(user_data)
                refresh_token = self.create_simple_token(user_data)
                
                response = {
                    'access': access_token,
                    'refresh': refresh_token,
                    'user': user_data
                }
                self.send_json_response(response)
            else:
                self.send_json_response({'error': 'Неверный email или пароль'}, 401)
                
        except Exception as e:
            self.send_json_response({'error': f'Ошибка входа: {str(e)}'}, 500)
        finally:
            conn.close()
    
    def get_user(self):
        # Проверка токена
        auth_header = self.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            self.send_json_response({'error': 'Токен отсутствует'}, 401)
            return
        
        token = auth_header.split(' ')[1]
        user_data = self.decode_simple_token(token)
        
        if not user_data:
            self.send_json_response({'error': 'Неверный токен'}, 401)
            return
        
        # Проверка срока действия
        try:
            exp_time = datetime.datetime.fromisoformat(user_data['exp'])
            if datetime.datetime.utcnow() > exp_time:
                self.send_json_response({'error': 'Токен истек'}, 401)
                return
        except:
            self.send_json_response({'error': 'Неверный формат токена'}, 401)
            return
        
        # Получение данных пользователя из базы
        conn = self.get_db_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute('SELECT id, username, email, phone FROM users WHERE id = ?', (user_data['user_id'],))
            user = cursor.fetchone()
            
            if user:
                response = {
                    'id': user[0],
                    'username': user[1],
                    'email': user[2],
                    'phone': user[3]
                }
                self.send_json_response(response)
            else:
                self.send_json_response({'error': 'Пользователь не найден'}, 404)
                
        except Exception as e:
            self.send_json_response({'error': f'Ошибка получения данных пользователя: {str(e)}'}, 500)
        finally:
            conn.close()
    
    def get_user_orders(self):
        # Проверка токена
        auth_header = self.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            self.send_json_response({'error': 'Токен отсутствует'}, 401)
            return
        
        token = auth_header.split(' ')[1]
        user_data = self.decode_simple_token(token)
        
        if not user_data:
            self.send_json_response({'error': 'Неверный токен'}, 401)
            return
        
        conn = self.get_db_connection()
        cursor = conn.cursor()
        
        try:
            # Получение заказов пользователя
            cursor.execute('''
                SELECT o.id, o.total_amount, o.status, o.created_at, o.shipping_address
                FROM orders o
                WHERE o.user_id = ?
                ORDER BY o.created_at DESC
            ''', (user_data['user_id'],))
            
            orders = []
            for row in cursor.fetchall():
                order = {
                    'id': row[0],
                    'total_amount': row[1],
                    'status': row[2],
                    'created_at': row[3],
                    'shipping_address': row[4],
                    'items': []
                }
                
                # Получение позиций заказа
                cursor.execute('''
                    SELECT p.name, oi.quantity, oi.price
                    FROM order_items oi
                    JOIN products p ON oi.product_id = p.id
                    WHERE oi.order_id = ?
                ''', (row[0],))
                
                for item_row in cursor.fetchall():
                    order['items'].append({
                        'product_name': item_row[0],
                        'quantity': item_row[1],
                        'price': item_row[2]
                    })
                
                orders.append(order)
            
            self.send_json_response(orders)
            
        except Exception as e:
            self.send_json_response({'error': f'Ошибка получения заказов: {str(e)}'}, 500)
        finally:
            conn.close()
    
    def create_order(self):
        # Проверка токена
        auth_header = self.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            self.send_json_response({'error': 'Токен отсутствует'}, 401)
            return
        
        token = auth_header.split(' ')[1]
        user_data = self.decode_simple_token(token)
        
        if not user_data:
            self.send_json_response({'error': 'Неверный токен'}, 401)
            return
        
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        data = json.loads(post_data.decode('utf-8'))
        
        if not data.get('shipping_address'):
            self.send_json_response({'error': 'Необходим адрес доставки'}, 400)
            return
        
        conn = self.get_db_connection()
        cursor = conn.cursor()
        
        try:
            # Получаем товары из корзины пользователя
            cursor.execute('''
                SELECT ci.product_id, ci.quantity, p.price, p.name
                FROM cart_items ci
                JOIN products p ON ci.product_id = p.id
                WHERE ci.user_id = ?
            ''', (user_data['user_id'],))
            
            cart_items = cursor.fetchall()
            
            if not cart_items:
                self.send_json_response({'error': 'Корзина пуста'}, 400)
                return
            
            # Вычисляем общую сумму
            total_amount = sum(item[1] * item[2] for item in cart_items)
            
            # Создаем заказ
            cursor.execute('''
                INSERT INTO orders (user_id, total_amount, shipping_address, phone)
                VALUES (?, ?, ?, ?)
            ''', (user_data['user_id'], total_amount, data['shipping_address'], data.get('phone', '')))
            
            order_id = cursor.lastrowid
            
            # Добавляем позиции заказа
            for item in cart_items:
                cursor.execute('''
                    INSERT INTO order_items (order_id, product_id, quantity, price)
                    VALUES (?, ?, ?, ?)
                ''', (order_id, item[0], item[1], item[2]))
            
            # Очищаем корзину пользователя
            cursor.execute('DELETE FROM cart_items WHERE user_id = ?', (user_data['user_id'],))
            
            conn.commit()
            
            response = {
                'order_id': order_id,
                'total_amount': total_amount,
                'status': 'pending',
                'message': 'Заказ успешно создан'
            }
            self.send_json_response(response, 201)
            
        except Exception as e:
            conn.rollback()
            self.send_json_response({'error': f'Ошибка создания заказа: {str(e)}'}, 500)
        finally:
            conn.close()
    
    def send_json_response(self, data, status_code=200):
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode('utf-8'))
    
    def serve_static_file(self):
        if self.path == '/':
            self.path = '/index.html'
        
        try:
            with open('.' + self.path, 'rb') as f:
                content = f.read()
            
            self.send_response(200)
            if self.path.endswith('.html'):
                self.send_header('Content-Type', 'text/html')
            elif self.path.endswith('.css'):
                self.send_header('Content-Type', 'text/css')
            elif self.path.endswith('.js'):
                self.send_header('Content-Type', 'application/javascript')
            elif self.path.endswith('.png') or self.path.endswith('.jpg'):
                self.send_header('Content-Type', 'image/png')
            else:
                self.send_header('Content-Type', 'text/plain')
            
            self.end_headers()
            self.wfile.write(content)
        except FileNotFoundError:
            self.send_error(404)

if __name__ == '__main__':
    server_address = ('', 8000)
    httpd = HTTPServer(server_address, SimpleHTTPRequestHandler)
    print('Сервер запущен на http://127.0.0.1:8000')
    print('База данных инициализирована')
    print('Нажмите Ctrl+C для остановки')
    httpd.serve_forever() 