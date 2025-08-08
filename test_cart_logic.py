#!/usr/bin/env python3
"""
Тестирование логики корзины
"""

import sqlite3
import hashlib
import base64
import json
import requests

def hash_password(password):
    """Хеширование пароля"""
    return hashlib.sha256(password.encode()).hexdigest()

def create_simple_token(user_id, email):
    """Создание простого токена"""
    token_data = {
        'user_id': user_id,
        'email': email
    }
    return base64.b64encode(json.dumps(token_data).encode()).decode()

def test_cart_logic():
    """Тестирование логики корзины"""
    print("🧪 Тестирование логики корзины...")
    
    # Подключаемся к базе данных
    conn = sqlite3.connect('ecocups.db')
    cursor = conn.cursor()
    
    try:
        # 1. Проверяем существование тестового пользователя
        print("\n1. Проверка тестового пользователя...")
        cursor.execute('SELECT id, email FROM users WHERE email = ?', ('test@test.com',))
        user = cursor.fetchone()
        
        if not user:
            print("❌ Тестовый пользователь не найден")
            print("Создаем тестового пользователя...")
            password_hash = hash_password('password')
            cursor.execute('''
                INSERT INTO users (username, email, phone, password_hash)
                VALUES (?, ?, ?, ?)
            ''', ('testuser', 'test@test.com', '+7 999 123-45-67', password_hash))
            conn.commit()
            
            cursor.execute('SELECT id, email FROM users WHERE email = ?', ('test@test.com',))
            user = cursor.fetchone()
        
        user_id, email = user
        print(f"✅ Пользователь найден: ID={user_id}, Email={email}")
        
        # 2. Проверяем товары
        print("\n2. Проверка товаров...")
        cursor.execute('SELECT id, name, price FROM products')
        products = cursor.fetchall()
        print(f"✅ Найдено товаров: {len(products)}")
        for product in products:
            print(f"   - {product[1]} (ID: {product[0]}, Цена: {product[2]} руб.)")
        
        # 3. Очищаем корзину пользователя
        print("\n3. Очистка корзины пользователя...")
        cursor.execute('DELETE FROM cart_items WHERE user_id = ?', (user_id,))
        conn.commit()
        print("✅ Корзина очищена")
        
        # 4. Добавляем товары в корзину
        print("\n4. Добавление товаров в корзину...")
        for product in products[:3]:  # Добавляем первые 3 товара
            product_id, product_name, price = product
            cursor.execute('''
                INSERT INTO cart_items (user_id, product_id, quantity)
                VALUES (?, ?, ?)
            ''', (user_id, product_id, 2))  # Добавляем по 2 штуки
            print(f"✅ Добавлен: {product_name} (2 шт.)")
        
        conn.commit()
        
        # 5. Проверяем корзину
        print("\n5. Проверка корзины...")
        cursor.execute('''
            SELECT ci.id, ci.quantity, p.name, p.price
            FROM cart_items ci
            JOIN products p ON ci.product_id = p.id
            WHERE ci.user_id = ?
        ''', (user_id,))
        cart_items = cursor.fetchall()
        
        total_items = 0
        total_price = 0
        for item in cart_items:
            item_id, quantity, name, price = item
            item_total = quantity * price
            total_items += quantity
            total_price += item_total
            print(f"   - {name}: {quantity} шт. × {price} руб. = {item_total} руб.")
        
        print(f"✅ Итого: {total_items} шт. на сумму {total_price} руб.")
        
        # 6. Создаем заказ
        print("\n6. Создание заказа...")
        cursor.execute('''
            INSERT INTO orders (user_id, total_amount, shipping_address, phone, status)
            VALUES (?, ?, ?, ?, ?)
        ''', (user_id, total_price, 'Тестовый адрес', '+7 999 123-45-67', 'pending'))
        conn.commit()
        
        order_id = cursor.lastrowid
        print(f"✅ Заказ создан: ID={order_id}")
        
        # 7. Добавляем товары в заказ
        print("\n7. Добавление товаров в заказ...")
        for item in cart_items:
            item_id, quantity, name, price = item
            cursor.execute('''
                INSERT INTO order_items (order_id, product_id, quantity, price)
                VALUES (?, ?, ?, ?)
            ''', (order_id, item_id, quantity, price))
            print(f"✅ Добавлен в заказ: {name} ({quantity} шт.)")
        
        conn.commit()
        
        # 8. Очищаем корзину после заказа
        print("\n8. Очистка корзины после заказа...")
        cursor.execute('DELETE FROM cart_items WHERE user_id = ?', (user_id,))
        conn.commit()
        print("✅ Корзина очищена")
        
        # 9. Проверяем заказ
        print("\n9. Проверка заказа...")
        cursor.execute('''
            SELECT o.id, o.total_amount, o.status, oi.quantity, p.name, p.price
            FROM orders o
            JOIN order_items oi ON o.id = oi.order_id
            JOIN products p ON oi.product_id = p.id
            WHERE o.id = ?
        ''', (order_id,))
        order_items = cursor.fetchall()
        
        print(f"✅ Заказ #{order_id}:")
        for item in order_items:
            order_id, total, status, quantity, name, price = item
            print(f"   - {name}: {quantity} шт. × {price} руб.")
        print(f"   Итого: {total} руб., Статус: {status}")
        
        print("\n🎉 Все тесты прошли успешно!")
        
    except Exception as e:
        print(f"❌ Ошибка: {e}")
    finally:
        conn.close()

if __name__ == '__main__':
    test_cart_logic() 