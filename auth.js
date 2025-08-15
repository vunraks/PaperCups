const API_BASE_URL = "http://127.0.0.1:8000/api";

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

// Сохраняет профиль пользователя в localStorage
function saveUserProfile(user) {
  if (user) {
    localStorage.setItem("user_profile", JSON.stringify(user));
  } else {
    localStorage.removeItem("user_profile");
  }
}

// Получает профиль пользователя из localStorage
function getUserProfile() {
  const user = localStorage.getItem("user_profile");
  return user ? JSON.parse(user) : null;
}

document
  .getElementById("register-form")
  ?.addEventListener("submit", async (e) => {
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

document.addEventListener("DOMContentLoaded", () => {
  checkAuth();
  updateCartCount();
  // Навешиваем обработчик на logout-link (на случай если DOM обновился)
  const logoutLink = document.getElementById("logout-link");
  if (logoutLink) logoutLink.onclick = logout;
});

// Гарантированное обновление хедера при любом изменении localStorage (например, между вкладками)
window.addEventListener('storage', function() {
  const token = localStorage.getItem("access_token");
  updateAuthUI(!!token && !!getUserProfile());
});

// Гарантированное обновление хедера при клике по меню (на случай, если что-то не успело обновиться)
document.addEventListener('click', function(e) {
  // Проверяем, был ли клик по nav или его потомкам
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
  // Гарантируем обновление хедера даже если DOM уже был готов
  const token = localStorage.getItem("access_token");
  updateAuthUI(!!token && !!getUserProfile());
};

document.getElementById("logout-btn")?.addEventListener("click", logout);

async function updateCartCount() {
  const token = localStorage.getItem('access_token');
  if (!token) {
    document.querySelectorAll('#cart-count').forEach(el => {
      el.textContent = '0';
    });
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}/cart/`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.ok) {
      const cartItems = await response.json();
      const count = cartItems.reduce((total, item) => total + item.quantity, 0);
      document.querySelectorAll('#cart-count').forEach(el => {
        el.textContent = count;
      });
    } else {
      document.querySelectorAll('#cart-count').forEach(el => {
        el.textContent = '0';
      });
    }
  } catch (error) {
    document.querySelectorAll('#cart-count').forEach(el => {
      el.textContent = '0';
    });
  }
}

// Функция для проверки, актуален ли хедер (виден ли нужный пункт)
function isHeaderReady() {
  const token = localStorage.getItem("access_token");
  const user = getUserProfile();
  const loginLink = document.getElementById("login-link");
  const profileLink = document.getElementById("profile-link");
  const logoutLink = document.getElementById("logout-link");
  if (token && user) {
    // Авторизован: должен быть виден profileLink и logoutLink, скрыт loginLink
    return profileLink && profileLink.style.display !== "none" && logoutLink && logoutLink.style.display !== "none" && loginLink && loginLink.style.display === "none";
  } else {
    // Не авторизован: должен быть виден loginLink, скрыт profileLink и logoutLink
    return loginLink && loginLink.style.display !== "none" && profileLink && profileLink.style.display === "none" && logoutLink && logoutLink.style.display === "none";
  }
}

// Функция для загрузки и отображения профиля пользователя
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
    // Если токен невалидный, разлогиниваем
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    saveUserProfile(null);
    updateAuthUI(false);
  }
}

// Функция для показа имени пользователя в хедере
function displayUserNameInHeader() {
  const user = getUserProfile();
  const profileLink = document.getElementById("profile-link");
  
  if (user && user.username && profileLink) {
    profileLink.textContent = user.username;
    console.log('[Header] Имя пользователя отображено:', user.username);
  }
}

// Пытаемся обновлять хедер каждую секунду, пока не станет актуальным
(function ensureHeader() {
  let tries = 0;
  const interval = setInterval(() => {
    tries++;
    const token = localStorage.getItem("access_token");
    if (token) {
      // Если есть токен, загружаем профиль
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
