// ===== АДМИН-ПАНЕЛЬ ECOCUPS =====
// Управление товарами и просмотр данных

const API_BASE_URL = "http://127.0.0.1:8000/api";

// ===== ПРОВЕРКА АДМИН ПРАВ =====
function checkAdminAuth() {
    const token = localStorage.getItem("access_token");
    if (!token) {
        window.location.href = 'login.html';
        return;
    }
    
    // Проверяем, является ли пользователь админом
    // В реальном проекте здесь должна быть проверка роли пользователя
    const user = JSON.parse(localStorage.getItem("user_profile") || "{}");
    if (!user.is_admin) {
        alert("Доступ запрещен. Требуются права администратора.");
        window.location.href = 'index.html';
        return;
    }
}

// ===== ПЕРЕКЛЮЧЕНИЕ ВКЛАДОК =====
function showTab(tabName) {
    // Скрываем все вкладки
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Убираем активный класс со всех кнопок
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Показываем нужную вкладку
    document.getElementById(tabName + '-tab').classList.add('active');
    
    // Делаем кнопку активной
    event.target.classList.add('active');
    
    // Загружаем данные для вкладки "Все данные"
    if (tabName === 'data') {
        loadAllData();
    }
}

// ===== УПРАВЛЕНИЕ ТОВАРАМИ =====
document.getElementById('product-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const productData = {
        name: formData.get('name'),
        description: formData.get('description'),
        price: parseFloat(formData.get('price')),
        category: formData.get('category'),
        image_url: formData.get('image'),
        stock: parseInt(formData.get('stock'))
    };
    
    try {
        const response = await fetch(`${API_BASE_URL}/admin/products/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem("access_token")}`
            },
            body: JSON.stringify(productData)
        });
        
        if (response.ok) {
            showMessage('Товар успешно добавлен!', 'success');
            clearForm();
        } else {
            const error = await response.json();
            showMessage(error.error || 'Ошибка при добавлении товара', 'error');
        }
    } catch (error) {
        showMessage('Ошибка подключения к серверу', 'error');
    }
});

function clearForm() {
    document.getElementById('product-form').reset();
}

function showMessage(message, type) {
    const messageDiv = document.getElementById('product-message');
    messageDiv.innerHTML = `<div class="${type === 'success' ? 'success-message' : 'error-message'}">${message}</div>`;
    
    setTimeout(() => {
        messageDiv.innerHTML = '';
    }, 5000);
}

// ===== ЗАГРУЗКА ВСЕХ ДАННЫХ =====
async function loadAllData() {
    await Promise.all([
        loadStatistics(),
        loadUsers(),
        loadOrders(),
        loadProducts()
    ]);
}

// ===== СТАТИСТИКА =====
async function loadStatistics() {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/stats/`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem("access_token")}`
            }
        });
        
        if (response.ok) {
            const stats = await response.json();
            document.getElementById('total-users').textContent = stats.total_users || 0;
            document.getElementById('total-orders').textContent = stats.total_orders || 0;
            document.getElementById('total-revenue').textContent = (stats.total_revenue || 0).toLocaleString();
            document.getElementById('total-products').textContent = stats.total_products || 0;
        }
    } catch (error) {
        console.error('Ошибка загрузки статистики:', error);
    }
}

// ===== ЗАГРУЗКА ПОЛЬЗОВАТЕЛЕЙ =====
async function loadUsers() {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/users/`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem("access_token")}`
            }
        });
        
        if (response.ok) {
            const users = await response.json();
            displayUsers(users);
        } else {
            showTableError('users-table-container', 'Ошибка загрузки пользователей');
        }
    } catch (error) {
        showTableError('users-table-container', 'Ошибка подключения к серверу');
    }
}

function displayUsers(users) {
    const container = document.getElementById('users-table-container');
    
    if (users.length === 0) {
        container.innerHTML = '<p>Пользователи не найдены</p>';
        return;
    }
    
    const table = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Имя пользователя</th>
                    <th>Email</th>
                    <th>Телефон</th>
                    <th>Дата регистрации</th>
                    <th>Статус</th>
                </tr>
            </thead>
            <tbody>
                ${users.map(user => `
                    <tr>
                        <td>${user.id}</td>
                        <td>${user.username}</td>
                        <td>${user.email}</td>
                        <td>${user.phone || 'Не указан'}</td>
                        <td>${new Date(user.created_at).toLocaleDateString()}</td>
                        <td>
                            <span class="status-badge ${user.is_active ? 'status-confirmed' : 'status-pending'}">
                                ${user.is_active ? 'Активен' : 'Неактивен'}
                            </span>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    
    container.innerHTML = table;
}

// ===== ЗАГРУЗКА ЗАКАЗОВ =====
async function loadOrders() {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/orders/`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem("access_token")}`
            }
        });
        
        if (response.ok) {
            const orders = await response.json();
            displayOrders(orders);
        } else {
            showTableError('orders-table-container', 'Ошибка загрузки заказов');
        }
    } catch (error) {
        showTableError('orders-table-container', 'Ошибка подключения к серверу');
    }
}

function displayOrders(orders) {
    const container = document.getElementById('orders-table-container');
    
    if (orders.length === 0) {
        container.innerHTML = '<p>Заказы не найдены</p>';
        return;
    }
    
    const table = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>ID заказа</th>
                    <th>Пользователь</th>
                    <th>Товары</th>
                    <th>Сумма</th>
                    <th>Статус</th>
                    <th>Дата заказа</th>
                    <th>Адрес доставки</th>
                </tr>
            </thead>
            <tbody>
                ${orders.map(order => `
                    <tr>
                        <td>${order.id}</td>
                        <td>${order.user_username}</td>
                        <td>${order.items.map(item => `${item.product_name} (${item.quantity} шт.)`).join(', ')}</td>
                        <td>${order.total_amount} руб.</td>
                        <td>
                            <span class="status-badge status-${order.status}">
                                ${getStatusText(order.status)}
                            </span>
                        </td>
                        <td>${new Date(order.created_at).toLocaleDateString()}</td>
                        <td>${order.shipping_address || 'Не указан'}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    
    container.innerHTML = table;
}

// ===== ЗАГРУЗКА ТОВАРОВ =====
async function loadProducts() {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/products/`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem("access_token")}`
            }
        });
        
        if (response.ok) {
            const products = await response.json();
            displayProducts(products);
        } else {
            showTableError('products-table-container', 'Ошибка загрузки товаров');
        }
    } catch (error) {
        showTableError('products-table-container', 'Ошибка подключения к серверу');
    }
}

function displayProducts(products) {
    const container = document.getElementById('products-table-container');
    
    if (products.length === 0) {
        container.innerHTML = '<p>Товары не найдены</p>';
        return;
    }
    
    const table = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Название</th>
                    <th>Категория</th>
                    <th>Цена</th>
                    <th>Остаток</th>
                    <th>Дата добавления</th>
                    <th>Действия</th>
                </tr>
            </thead>
            <tbody>
                ${products.map(product => `
                    <tr>
                        <td>${product.id}</td>
                        <td>${product.name}</td>
                        <td>${getCategoryText(product.category)}</td>
                        <td>${product.price} руб.</td>
                        <td>${product.stock} шт.</td>
                        <td>${new Date(product.created_at).toLocaleDateString()}</td>
                        <td>
                            <button class="btn-admin" onclick="editProduct(${product.id})">Редактировать</button>
                            <button class="btn-admin danger" onclick="deleteProduct(${product.id})">Удалить</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    
    container.innerHTML = table;
}

// ===== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =====
function getStatusText(status) {
    const statusMap = {
        'pending': 'Ожидает подтверждения',
        'confirmed': 'Подтвержден',
        'shipped': 'Отправлен',
        'delivered': 'Доставлен'
    };
    return statusMap[status] || status;
}

function getCategoryText(category) {
    const categoryMap = {
        'cups': 'Стаканчики',
        'lids': 'Крышки',
        'accessories': 'Аксессуары'
    };
    return categoryMap[category] || category;
}

function showTableError(containerId, message) {
    document.getElementById(containerId).innerHTML = `<div class="error-message">${message}</div>`;
}

// ===== ДЕЙСТВИЯ С ТОВАРАМИ =====
async function editProduct(productId) {
    // В реальном проекте здесь должна быть форма редактирования
    alert(`Редактирование товара ${productId} - функция в разработке`);
}

async function deleteProduct(productId) {
    if (!confirm('Вы уверены, что хотите удалить этот товар?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/admin/products/${productId}/`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem("access_token")}`
            }
        });
        
        if (response.ok) {
            alert('Товар успешно удален');
            loadProducts(); // Перезагружаем список товаров
        } else {
            alert('Ошибка при удалении товара');
        }
    } catch (error) {
        alert('Ошибка подключения к серверу');
    }
}

// ===== ВЫХОД =====
function logout() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user_profile");
    window.location.href = "index.html";
}

// ===== ИНИЦИАЛИЗАЦИЯ =====
document.addEventListener('DOMContentLoaded', () => {
    checkAdminAuth();
    
    // Загружаем данные для активной вкладки
    if (document.getElementById('data-tab').classList.contains('active')) {
        loadAllData();
    }
});

console.log('[Admin] Админ-панель загружена');
