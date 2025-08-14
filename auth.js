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

    alert("Вход выполнен успешно!");
    window.location.href = "index.html";
  } catch (error) {
    alert(error.message || "Ошибка входа");
  }
});

async function checkAuth() {
  const token = localStorage.getItem("access_token");
  if (!token) return;

  try {
    await makeRequest("/user/", "GET");
    updateAuthUI(true);
  } catch {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    updateAuthUI(false);
  }
}

function updateAuthUI(isAuthenticated) {
  const authLinks = document.querySelectorAll(".auth-link");
  const protectedElements = document.querySelectorAll(".protected");
  const loginLinks = document.querySelectorAll('a[href="login.html"]');
  const registerLinks = document.querySelectorAll('a[href="register.html"]');

  authLinks.forEach((link) => {
    link.style.display = isAuthenticated ? "none" : "block";
  });

  protectedElements.forEach((element) => {
    element.style.display = isAuthenticated ? "block" : "none";
  });

  if (isAuthenticated) {
    loginLinks.forEach(link => {
      link.textContent = "Личный кабинет";
      link.href = "profile.html";
    });
    registerLinks.forEach(link => {
      link.textContent = "Выйти";
      link.href = "#";
      link.addEventListener('click', logout);
    });
  } else {
    loginLinks.forEach(link => {
      link.textContent = "Войти";
      link.href = "login.html";
    });
    registerLinks.forEach(link => {
      link.textContent = "Регистрация";
      link.href = "register.html";
    });
  }
}

function logout(e) {
  e.preventDefault();
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  window.location.href = "index.html";
}

document.addEventListener("DOMContentLoaded", () => {
  checkAuth();
  updateCartCount();
});

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
