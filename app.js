// ===== ECOCUPS - УНИВЕРСАЛЬНЫЙ JAVASCRIPT ФАЙЛ =====
// Объединяет всю логику: авторизация, корзина, токены, UI

const API_BASE_URL = "http://127.0.0.1:8000/api";

// ===== API ФУНКЦИИ =====
async function makeRequest(url, method, body = null) {
  const headers = {
    "Content-Type": "application/json",
  };

  const token = localStorage.getItem("access_token");
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const config = {
    method,
    headers,
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${API_BASE_URL}${url}`, config);
    
    let data;
    try {
      data = await response.json();
    } catch (e) {
      throw new Error('Неверный ответ сервера');
    }

    if (!response.ok) {
      throw new Error(data.error || data.detail || `HTTP ${response.status}: Ошибка сервера`);
    }

    return data;
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Не удается подключиться к серверу. Убедитесь, что сервер запущен на http://127.0.0.1:8000');
    }
    throw error;
  }
}

// ===== УПРАВЛЕНИЕ ПРОФИЛЕМ ПОЛЬЗОВАТЕЛЯ =====
function saveUserProfile(user) {
  if (user) {
    localStorage.setItem("user_profile", JSON.stringify(user));
  } else {
    localStorage.removeItem("user_profile");
  }
}

function getUserProfile() {
  const user = localStorage.getItem("user_profile");
  return user ? JSON.parse(user) : null;
}

// ===== УПРАВЛЕНИЕ JWT ТОКЕНАМИ =====
async function refreshToken() {
  const refreshToken = localStorage.getItem("refresh_token");
  if (!refreshToken) {
    console.log('[Token] Refresh token отсутствует, разлогиниваем пользователя');
    logout();
    return false;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/refresh/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        refresh: refreshToken
      })
    });

    if (response.ok) {
      const data = await response.json();
      localStorage.setItem("access_token", data.access);
      if (data.refresh) {
        localStorage.setItem("refresh_token", data.refresh);
      }
      console.log('[Token] Токен успешно обновлен');
      return true;
    } else {
      console.log('[Token] Ошибка обновления токена:', response.status);
      return false;
    }
  } catch (error) {
    console.error('[Token] Ошибка при обновлении токена:', error);
    return false;
  }
}

async function checkAndRefreshToken() {
  const accessToken = localStorage.getItem("access_token");
  if (!accessToken) {
    console.log('[Token] Access token отсутствует');
    return false;
  }

  try {
    const payload = JSON.parse(atob(accessToken.split('.')[1]));
    const expirationTime = payload.exp * 1000;
    const currentTime = Date.now();
    const timeUntilExpiry = expirationTime - currentTime;

    console.log(`[Token] Токен истекает через ${Math.round(timeUntilExpiry / 1000)} секунд`);

    if (timeUntilExpiry < 5 * 60 * 1000) {
      console.log('[Token] Токен скоро истечет, обновляем...');
      const refreshed = await refreshToken();
      if (!refreshed) {
        console.log('[Token] Не удалось обновить токен, разлогиниваем');
        logout();
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('[Token] Ошибка при проверке токена:', error);
    return false;
  }
}

// ===== АВТОРИЗАЦИЯ =====
async function checkAuth() {
  const token = localStorage.getItem("access_token");
  if (!token) {
    saveUserProfile(null);
    updateAuthUI(false);
    return;
  }

  try {
    const data = await makeRequest("/user/", "GET");
    saveUserProfile(data);
    updateAuthUI(true);
  } catch {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    saveUserProfile(null);
    updateAuthUI(false);
  }
}

async function loadAndDisplayUserProfile() {
  const token = localStorage.getItem("access_token");
  if (!token) return;

  try {
    const response = await fetch(`${API_BASE_URL}/user/`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.ok) {
      const userData = await response.json();
      saveUserProfile(userData);
      updateAuthUI(true);
      console.log('[Profile] Профиль пользователя загружен:', userData.username);
    } else {
      throw new Error('Ошибка получения профиля');
    }
  } catch (error) {
    console.error('[Profile] Ошибка загрузки профиля:', error);
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    saveUserProfile(null);
    updateAuthUI(false);
  }
}

function updateAuthUI(isAuthenticated) {
  const loginLink = document.getElementById("login-link");
  const registerLink = document.getElementById("register-link");
  const profileLink = document.getElementById("profile-link");
  const logoutLink = document.getElementById("logout-link");

  if (isAuthenticated) {
    const user = getUserProfile();
    if (loginLink) loginLink.style.display = "none";
    if (registerLink) registerLink.style.display = "none";
    if (profileLink) {
      profileLink.style.display = "block";
      profileLink.textContent = user && user.username ? user.username : "Личный кабинет";
    }
    if (logoutLink) {
      logoutLink.style.display = "block";
      logoutLink.onclick = logout;
    }
    
    // Добавляем ссылку на админ-панель для администраторов
    if (user && user.is_admin) {
      let adminLink = document.getElementById("admin-link");
      if (!adminLink) {
        // Создаем ссылку на админ-панель, если её нет
        const nav = document.querySelector('nav ul');
        if (nav) {
          const li = document.createElement('li');
          li.innerHTML = '<a href="admin.html" id="admin-link" class="admin-link">Админ-панель</a>';
          nav.appendChild(li);
        }
      } else {
        adminLink.style.display = "block";
      }
    }
    
    console.log('[AuthUI] Пользователь авторизован:', user ? user.username : 'Неизвестно');
  } else {
    if (loginLink) {
      loginLink.style.display = "block";
      loginLink.textContent = "Войти";
      loginLink.href = "login.html";
    }
    if (registerLink) {
      registerLink.style.display = "block";
      registerLink.textContent = "Регистрация";
      registerLink.href = "register.html";
    }
    if (profileLink) {
      profileLink.style.display = "none";
      profileLink.textContent = "Личный кабинет";
    }
    if (logoutLink) logoutLink.style.display = "none";
    
    // Скрываем ссылку на админ-панель
    const adminLink = document.getElementById("admin-link");
    if (adminLink) {
      adminLink.style.display = "none";
    }
    
    console.log('[AuthUI] Пользователь не авторизован');
  }
}

function logout(e) {
  if (e) e.preventDefault();
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  saveUserProfile(null);
  updateAuthUI(false);
  window.location.href = "index.html";
}

// ===== КОРЗИНА =====
function getCart() {
  return JSON.parse(localStorage.getItem('cart')) || [];
}

function setCart(cart) {
  localStorage.setItem('cart', JSON.stringify(cart));
}

function addToCart(id, name, price, btn = null) {
  let cart = getCart();
  const idx = cart.findIndex(item => item.id === id);
  if (idx !== -1) {
    cart[idx].quantity += 1;
  } else {
    cart.push({ id, name, price, quantity: 1 });
  }
  setCart(cart);
  updateCartCount();
  
  if (btn) {
    btn.textContent = 'Добавлено!';
    btn.style.backgroundColor = '#4CAF50';
    btn.disabled = true;
    setTimeout(() => {
      btn.textContent = 'В корзину';
      btn.style.backgroundColor = '#2e8b57';
      btn.disabled = false;
    }, 1000);
  }
}

function removeFromCart(id) {
  let cart = getCart();
  cart = cart.filter(item => item.id !== id);
  setCart(cart);
  updateCartCount();
  updateCartDisplay();
}

function updateQuantity(id, change) {
  let cart = getCart();
  const idx = cart.findIndex(item => item.id === id);
  if (idx !== -1) {
    cart[idx].quantity += change;
    if (cart[idx].quantity < 1) cart[idx].quantity = 1;
    setCart(cart);
    updateCartCount();
    updateCartDisplay();
  }
}

function setQuantity(id, quantity, isLiveUpdate = false) {
  let cart = getCart();
  const idx = cart.findIndex(item => item.id === id);
  if (idx !== -1) {
    cart[idx].quantity = quantity > 0 ? quantity : 1;
    setCart(cart);
    updateCartCount();
    updateCartDisplay();
    if (isLiveUpdate) updateTotalPrice();
  }
}

function clearCart() {
  setCart([]);
  updateCartCount();
  updateCartDisplay();
}

function updateCartCount() {
  const cart = getCart();
  const count = cart.reduce((total, item) => total + item.quantity, 0);
  document.querySelectorAll('#cart-count').forEach(el => {
    el.textContent = count;
  });
}

function updateCartDisplay() {
  const cart = getCart();
  const cartItemsContainer = document.getElementById('cart-items');
  const emptyCartRow = document.querySelector('.empty-cart');
  const checkoutBtn = document.getElementById('checkout-btn');
  const totalItemsEl = document.getElementById('total-items');
  const totalPriceEl = document.getElementById('total-price');
  
  if (!cartItemsContainer) return;
  
  if (cart.length === 0) {
    if (emptyCartRow) emptyCartRow.style.display = '';
    if (checkoutBtn) checkoutBtn.disabled = true;
    if (totalItemsEl) totalItemsEl.textContent = '0';
    if (totalPriceEl) totalPriceEl.textContent = '0 руб.';
    cartItemsContainer.innerHTML = '<tr class="empty-cart"><td colspan="5">Ваша корзина пуста</td></tr>';
    return;
  }
  
  if (emptyCartRow) emptyCartRow.style.display = 'none';
  if (checkoutBtn) checkoutBtn.disabled = false;
  
  cartItemsContainer.innerHTML = '';
  let totalItems = 0;
  let totalPrice = 0;
  
  cart.forEach(item => {
    const itemTotal = item.price * item.quantity;
    totalItems += item.quantity;
    totalPrice += itemTotal;
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${item.name}</td>
      <td>${item.price} руб.</td>
      <td>
        <div class="quantity-control">
          <button class="decrease-qty" data-id="${item.id}">-</button>
          <input type="number" value="${item.quantity}" min="1" class="item-qty" data-id="${item.id}">
          <button class="increase-qty" data-id="${item.id}">+</button>
        </div>
      </td>
      <td class="item-total">${itemTotal} руб.</td>
      <td><span class="remove-item" data-id="${item.id}">×</span></td>
    `;
    cartItemsContainer.appendChild(row);
  });
  
  const totalRow = document.createElement('tr');
  totalRow.className = 'total-row';
  totalRow.innerHTML = `
    <td colspan="3" class="text-right"><strong>Итого:</strong></td>
    <td colspan="2"><strong>${totalPrice} руб.</strong></td>
  `;
  cartItemsContainer.appendChild(totalRow);
  
  if (totalItemsEl) totalItemsEl.textContent = totalItems;
  if (totalPriceEl) totalPriceEl.textContent = `${totalPrice} руб.`;
  
  addCartEventListeners();
}

function updateTotalPrice() {
  const cart = getCart();
  const totalPrice = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  const totalPriceEl = document.getElementById('total-price');
  if (totalPriceEl) totalPriceEl.textContent = `${totalPrice} руб.`;
  document.querySelectorAll('.total-row td:last-child strong').forEach(el => {
    el.textContent = `${totalPrice} руб.`;
  });
}

function addCartEventListeners() {
  document.querySelectorAll('.decrease-qty').forEach(btn => {
    btn.addEventListener('click', function() {
      const id = parseInt(this.getAttribute('data-id'));
      updateQuantity(id, -1);
    });
  });
  
  document.querySelectorAll('.increase-qty').forEach(btn => {
    btn.addEventListener('click', function() {
      const id = parseInt(this.getAttribute('data-id'));
      updateQuantity(id, 1);
    });
  });
  
  document.querySelectorAll('.item-qty').forEach(input => {
    input.addEventListener('change', function() {
      const id = parseInt(this.getAttribute('data-id'));
      const newQty = parseInt(this.value);
      if (newQty > 0) {
        setQuantity(id, newQty);
      } else {
        this.value = 1;
      }
    });
    
    input.addEventListener('input', function() {
      const id = parseInt(this.getAttribute('data-id'));
      const newQty = parseInt(this.value);
      if (newQty > 0) {
        setQuantity(id, newQty, true);
      }
    });
  });
  
  document.querySelectorAll('.remove-item').forEach(btn => {
    btn.addEventListener('click', function() {
      const id = parseInt(this.getAttribute('data-id'));
      removeFromCart(id);
    });
  });
}

// ===== ПРОВЕРКА ГОТОВНОСТИ ХЕДЕРА =====
function isHeaderReady() {
  const token = localStorage.getItem("access_token");
  const user = getUserProfile();
  const loginLink = document.getElementById("login-link");
  const profileLink = document.getElementById("profile-link");
  const logoutLink = document.getElementById("logout-link");
  
  if (token && user) {
    return profileLink && profileLink.style.display !== "none" && 
           logoutLink && logoutLink.style.display !== "none" && 
           loginLink && loginLink.style.display === "none";
  } else {
    return loginLink && loginLink.style.display !== "none" && 
           profileLink && profileLink.style.display === "none" && 
           logoutLink && logoutLink.style.display === "none";
  }
}

// ===== ОБРАБОТЧИКИ ФОРМ =====
document.getElementById("register-form")?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const formData = {
    username: document.getElementById("name").value,
    email: document.getElementById("email").value,
    phone: document.getElementById("phone").value,
    password: document.getElementById("password").value,
    password2: document.getElementById("confirm-password").value,
  };

  try {
    const data = await makeRequest("/register/", "POST", formData);
    localStorage.setItem("access_token", data.access);
    localStorage.setItem("refresh_token", data.refresh);
    saveUserProfile(data.user);
    updateAuthUI(true);
    alert("Регистрация успешна!");
    window.location.href = "index.html";
  } catch (error) {
    alert(error.message || "Ошибка регистрации");
  }
});

document.getElementById("login-form")?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const formData = {
    email: document.getElementById("login-email").value,
    password: document.getElementById("login-password").value,
  };

  try {
    const data = await makeRequest("/login/", "POST", formData);
    localStorage.setItem("access_token", data.access);
    localStorage.setItem("refresh_token", data.refresh);
    saveUserProfile(data.user);
    updateAuthUI(true);
    alert("Вход выполнен успешно!");
    window.location.href = "index.html";
  } catch (error) {
    alert(error.message || "Ошибка входа");
  }
});

// ===== ДЕЛЕГИРОВАНИЕ СОБЫТИЙ =====
document.body.addEventListener('click', function(e) {
  const btn = e.target.closest('.add-to-cart');
  if (btn) {
    const id = parseInt(btn.getAttribute('data-id'));
    const name = btn.getAttribute('data-name');
    const price = parseInt(btn.getAttribute('data-price'));
    addToCart(id, name, price, btn);
  }
});

// ===== АВТОМАТИЧЕСКОЕ ОБНОВЛЕНИЕ ТОКЕНА =====
(function autoRefreshToken() {
  setInterval(async () => {
    const token = localStorage.getItem("access_token");
    if (token) {
      await checkAndRefreshToken();
    }
  }, 1000);
})();

// ===== ГАРАНТИРОВАННОЕ ОБНОВЛЕНИЕ ХЕДЕРА =====
(function ensureHeader() {
  let tries = 0;
  const interval = setInterval(() => {
    tries++;
    const token = localStorage.getItem("access_token");
    if (token) {
      loadAndDisplayUserProfile();
    } else {
      updateAuthUI(false);
    }
    
    if (isHeaderReady()) {
      console.log(`[Header] Хедер успешно обновлён за ${tries} попыток.`);
      clearInterval(interval);
    } else {
      console.log(`[Header] Попытка обновить хедер #${tries}...`);
    }
  }, 1000);
})();

// ===== ДОПОЛНИТЕЛЬНЫЕ ОБРАБОТЧИКИ =====
window.addEventListener('storage', function() {
  const token = localStorage.getItem("access_token");
  updateAuthUI(!!token && !!getUserProfile());
});

document.addEventListener('click', function(e) {
  let el = e.target;
  while (el) {
    if (el.tagName === 'NAV' || el.classList && el.classList.contains('logo')) {
      const token = localStorage.getItem("access_token");
      updateAuthUI(!!token && !!getUserProfile());
      break;
    }
    el = el.parentElement;
  }
});

window.onload = function() {
  const token = localStorage.getItem("access_token");
  updateAuthUI(!!token && !!getUserProfile());
};

// ===== ИНИЦИАЛИЗАЦИЯ =====
document.addEventListener("DOMContentLoaded", () => {
  checkAuth();
  updateCartCount();
  
  const logoutLink = document.getElementById("logout-link");
  if (logoutLink) logoutLink.onclick = logout;
  
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) logoutBtn.addEventListener("click", logout);
  
  const checkoutBtn = document.getElementById("checkout-btn");
  if (checkoutBtn) {
    checkoutBtn.addEventListener("click", function() {
      alert('Заказ оформлен! Спасибо за покупку.');
      clearCart();
      window.location.href = 'index.html';
    });
  }
  
  // Инициализация корзины на странице корзины
  if (window.location.pathname.includes('cart.html')) {
    updateCartDisplay();
  }
  
  // Инициализация профиля на странице профиля
  if (window.location.pathname.includes('profile.html')) {
    loadProfilePage();
  }
});

// ===== ФУНКЦИИ ПРОФИЛЯ =====
async function loadProfilePage() {
  const token = localStorage.getItem('access_token');
  if (!token) {
    window.location.href = 'login.html';
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}/user/`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Ошибка получения данных пользователя');
    }
    
    const userData = await response.json();
    displayUserInfo(userData);
    loadUserOrders();
  } catch (error) {
    console.error('Error loading user profile:', error);
    showProfileError('Ошибка загрузки профиля. Попробуйте войти заново.');
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setTimeout(() => {
      window.location.href = 'login.html';
    }, 2000);
  }
}

function displayUserInfo(userData) {
  const profileInfo = document.getElementById('profile-info');
  if (!profileInfo) return;
  
  profileInfo.innerHTML = `
    <div>
      <div class="info-group">
        <div class="info-label">Имя пользователя</div>
        <div class="info-value">${userData.username}</div>
      </div>
      <div class="info-group">
        <div class="info-label">Email</div>
        <div class="info-value">${userData.email}</div>
      </div>
    </div>
    <div>
      <div class="info-group">
        <div class="info-label">Телефон</div>
        <div class="info-value">${userData.phone || 'Не указан'}</div>
      </div>
      <div class="info-group">
        <div class="info-label">Дата регистрации</div>
        <div class="info-value">${new Date().toLocaleDateString()}</div>
      </div>
    </div>
  `;
}

async function loadUserOrders() {
  const token = localStorage.getItem('access_token');
  if (!token) return;
  
  try {
    const response = await fetch(`${API_BASE_URL}/orders/`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Ошибка получения заказов');
    }
    
    const orders = await response.json();
    displayOrders(orders);
  } catch (error) {
    console.error('Error loading orders:', error);
    showProfileError('Ошибка загрузки заказов.');
  }
}

function displayOrders(orders) {
  const ordersList = document.getElementById('orders-list');
  if (!ordersList) return;
  
  if (orders.length === 0) {
    ordersList.innerHTML = `
      <div class="no-orders">
        <h3>У вас пока нет заказов</h3>
        <p>Сделайте свой первый заказ в нашем каталоге!</p>
        <a href="products.html" class="btn">Перейти к товарам</a>
      </div>
    `;
    return;
  }
  
  ordersList.innerHTML = orders.map(order => `
    <div class="order-card">
      <div class="order-header">
        <div>
          <span class="order-id">Заказ №${order.id}</span>
          <span class="order-date">${new Date(order.created_at).toLocaleDateString()}</span>
        </div>
        <span class="order-status status-${order.status}">${getStatusText(order.status)}</span>
      </div>
      
      <div class="order-items">
        ${order.items.map(item => `
          <div class="order-item">
            <span>${item.product_name}</span>
            <span>${item.quantity} шт. × ${item.price} руб. = ${item.quantity * item.price} руб.</span>
          </div>
        `).join('')}
      </div>
      
      <div class="order-total">
        Итого: ${order.total_amount} руб.
      </div>
      
      <div style="margin-top: 15px; font-size: 14px; color: #666;">
        <strong>Адрес доставки:</strong> ${order.shipping_address}
      </div>
    </div>
  `).join('');
}

function getStatusText(status) {
  const statusMap = {
    'pending': 'Ожидает подтверждения',
    'confirmed': 'Подтвержден',
    'shipped': 'Отправлен',
    'delivered': 'Доставлен'
  };
  return statusMap[status] || status;
}

function showProfileError(message) {
  const ordersList = document.getElementById('orders-list');
  if (ordersList) {
    ordersList.innerHTML = `<div class="error-message">${message}</div>`;
  }
}

console.log('[App] EcoCups JavaScript загружен и инициализирован');
