#!/usr/bin/env python3
"""
Скрипт для создания тестового пользователя
"""

import sqlite3
import hashlib

def hash_password(password):
    """Хеширование пароля"""
    return hashlib.sha256(password.encode()).hexdigest()

def create_test_user():
    """Создание тестового пользователя"""
    conn = sqlite3.connect('ecocups.db')
    cursor = conn.cursor()
    
    try:
        # Проверяем, существует ли уже тестовый пользователь
        cursor.execute('SELECT id FROM users WHERE email = ?', ('test@test.com',))
        existing_user = cursor.fetchone()
        
        if existing_user:
            print("✅ Тестовый пользователь уже существует")
            print("Email: test@test.com")
            print("Пароль: password")
            return
        
        # Создаем тестового пользователя
        password_hash = hash_password('password')
        cursor.execute('''
            INSERT INTO users (username, email, phone, password_hash)
            VALUES (?, ?, ?, ?)
        ''', ('testuser', 'test@test.com', '+7 999 123-45-67', password_hash))
        
        conn.commit()
        print("✅ Тестовый пользователь создан успешно!")
        print("Email: test@test.com")
        print("Пароль: password")
        
    except Exception as e:
        print(f"❌ Ошибка создания пользователя: {e}")
    finally:
        conn.close()

def check_database():
    """Проверка базы данных"""
    conn = sqlite3.connect('ecocups.db')
    cursor = conn.cursor()
    
    try:
        # Проверяем таблицы
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()
        print("📊 Таблицы в базе данных:")
        for table in tables:
            print(f"  - {table[0]}")
        
        # Проверяем пользователей
        cursor.execute('SELECT COUNT(*) FROM users')
        user_count = cursor.fetchone()[0]
        print(f"👥 Пользователей: {user_count}")
        
        # Проверяем товары
        cursor.execute('SELECT COUNT(*) FROM products')
        product_count = cursor.fetchone()[0]
        print(f"📦 Товаров: {product_count}")
        
    except Exception as e:
        print(f"❌ Ошибка проверки базы данных: {e}")
    finally:
        conn.close()

if __name__ == '__main__':
    print("🔧 Создание тестового пользователя...")
    create_test_user()
    print("\n📋 Проверка базы данных:")
    check_database()
    print("\n🚀 Теперь можно тестировать корзину!")
    print("1. Запустите сервер: python simple_server.py")
    print("2. Откройте: http://127.0.0.1:8000")
    print("3. Войдите с email: test@test.com, пароль: password") 