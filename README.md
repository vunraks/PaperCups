# Cup Supply Automation 🥤

Автоматизированная система управления поставками бумажных стаканчиков в торговые автоматы. Веб-платформа для мониторинга, учета и оптимизации процесса пополнения запасов расходных материалов.

## 🎯 Цель проекта

Автоматизация и оптимизация процесса поставки бумажных стаканчиков в торговые автоматы через централизованную систему управления с возможностью:
- Мониторинга остатков в реальном времени
- Прогнозирования потребности в пополнении
- Автоматического создания заявок на поставку
- Отслеживания статуса выполнения заказов

## 🚀 Технологический стек

### Backend
- **Python 3.x** - основной язык программирования
- **Django** - веб-фреймворк для создания REST API и админ-панели
- **SQL** - система управления базами данных

### Frontend
- **HTML5** - структура веб-страниц
- **SCSS** - препроцессор CSS для стилизации
- **JavaScript** - интерактивность пользовательского интерфейса

## 📋 Функциональные возможности

### 🎛️ Панель управления
- Дашборд с общей статистикой по автоматам
- Мониторинг уровня запасов в реальном времени
- Система уведомлений о критически низких остатках

### 📊 Аналитика и отчетность
- Статистика потребления по автоматам
- Прогнозирование потребности в стаканчиках
- Отчеты по поставкам и расходу материалов

### 🚛 Управление поставками
- Автоматическое создание заявок на пополнение
- Отслеживание статуса доставки
- Планирование маршрутов для курьеров

### 👥 Система ролей
- Администратор системы
- Менеджер по поставкам
- Оператор торгового автомата
- Курьер

## 🏗️ Архитектура проекта

```
cup-supply-automation/
├── backend/
│   ├── apps/
│   │   ├── machines/          # Управление автоматами
│   │   ├── supplies/          # Поставки и заказы
│   │   ├── analytics/         # Аналитика и отчеты
│   │   └── users/            # Управление пользователями
│   ├── config/
│   ├── static/
│   └── templates/
├── frontend/
│   ├── scss/
│   ├── js/
│   └── assets/
├── docs/
└── requirements.txt
```

## 🛠️ Установка и запуск

### Предварительные требования
- Python 3.8+
- Node.js 14+ (для сборки SCSS)
- База данных PostgreSQL/MySQL

### Шаги установки

1. **Клонирование репозитория**
   ```bash
   git clone https://github.com/your-team/cup-supply-automation.git
   cd cup-supply-automation
   ```

2. **Создание виртуального окружения**
   ```bash
   python -m venv venv
   source venv/bin/activate  # Linux/Mac
   # или
   venv\Scripts\activate     # Windows
   ```

3. **Установка зависимостей**
   ```bash
   pip install -r requirements.txt
   ```

4. **Настройка базы данных**
   ```bash
   python manage.py makemigrations
   python manage.py migrate
   python manage.py createsuperuser
   ```

5. **Компиляция стилей**
   ```bash
   npm install
   npm run build-css
   ```

6. **Запуск сервера разработки**
   ```bash
   python manage.py runserver
   ```

Приложение будет доступно по адресу: `http://localhost:8000`

## 🔧 Конфигурация

### Переменные окружения
Создайте файл `.env` в корне проекта:

```env
DEBUG=True
SECRET_KEY=your-secret-key
DATABASE_URL=postgresql://user:password@localhost:5432/cupdb
ALLOWED_HOSTS=localhost,127.0.0.1
```

### Настройка API интеграций
- Настройка подключения к API торговых автоматов
- Интеграция с системами учета поставщиков
- Подключение уведомлений (email/SMS/Telegram)

## 📱 API документация

### Основные эндпоинты

- `GET /api/machines/` - список всех автоматов
- `GET /api/machines/{id}/status/` - статус конкретного автомата
- `POST /api/supplies/orders/` - создание заказа на поставку
- `GET /api/analytics/consumption/` - данные по потреблению

Полная документация API доступна по адресу: `/api/docs/`

## 🧪 Тестирование

```bash
# Запуск всех тестов
python manage.py test

# Запуск тестов конкретного приложения
python manage.py test apps.machines

# Запуск с покрытием кода
coverage run manage.py test
coverage report
```

## 🚀 Деплой

### Production сборка
```bash
# Сборка статических файлов
python manage.py collectstatic --noinput

# Компиляция SCSS для production
npm run build-css-prod

# Применение миграций
python manage.py migrate --run-syncdb
```

### Docker deployment
```bash
docker-compose up -d
```

## 👥 Команда разработки

Проект разрабатывается командой из 4 человек:

- **Backend Developer** - Django API, интеграции
- **Frontend Developer** - UI/UX, SCSS, JavaScript
- **DevOps Engineer** - деплой, мониторинг, CI/CD
- **Project Manager** - координация, тестирование

## 📈 Планы развития

### v2.0
- [ ] Мобильное приложение для курьеров
- [ ] Интеграция с IoT сенсорами автоматов
- [ ] Машинное обучение для прогнозирования спроса

### v2.1
- [ ] Интеграция с ERP системами
- [ ] Расширенная аналитика и BI дашборды
- [ ] Автоматическое ценообразование

## 🤝 Вклад в проект

1. Форкните репозиторий
2. Создайте ветку для новой функции (`git checkout -b feature/AmazingFeature`)
3. Зафиксируйте изменения (`git commit -m 'Add some AmazingFeature'`)
4. Отправьте в ветку (`git push origin feature/AmazingFeature`)
5. Откройте Pull Request

## 📄 Лицензия

Этот проект лицензирован под MIT License - подробности в файле [LICENSE](LICENSE).

## 📞 Контакты

- Email: team@cupsupply.com
- Telegram: @cupsupply_dev
- Slack: #cup-supply-automation

---

⭐ Поставьте звезду, если проект был полезен!