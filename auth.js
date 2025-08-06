const API_BASE_URL = "http://127.0.0.1:8000/api"; // Замените на ваш URL в продакшене

fetch(`${API_BASE_URL}/products/`)
  .then(response => response.json())
  .then(data => console.log(data));

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
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || "Ошибка сервера");
    }

    return data;
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
}

// Регистрация
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

// Вход
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

    window.location.href = "index.html";
  } catch (error) {
    alert(error.message || "Ошибка входа");
  }
});

// Проверка аутентификации при загрузке страницы
async function checkAuth() {
  const token = localStorage.getItem("access_token");
  if (!token) return;

  try {
    await makeRequest("/user/", "GET");
    // Пользователь аутентифицирован
    updateAuthUI(true);
  } catch {
    // Токен невалидный
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    updateAuthUI(false);
  }
}

// Обновление UI в зависимости от статуса аутентификации
function updateAuthUI(isAuthenticated) {
  const authLinks = document.querySelectorAll(".auth-link");
  const protectedElements = document.querySelectorAll(".protected");

  authLinks.forEach((link) => {
    link.style.display = isAuthenticated ? "none" : "block";
  });

  protectedElements.forEach((element) => {
    element.style.display = isAuthenticated ? "block" : "none";
  });
}

// При загрузке страницы
document.addEventListener("DOMContentLoaded", () => {
  checkAuth();
});
document.getElementById("logout-btn")?.addEventListener("click", (e) => {
  e.preventDefault();
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  window.location.href = "index.html";
});
