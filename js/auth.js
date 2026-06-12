/**
 * auth.js - Аутентификация администратора через PHP-сессии (api/auth.php).
 * Реальная защита выполняется на сервере; на клиенте хранится лёгкий
 * маркер сессии (sessionStorage) только для таймера и быстрого UI.
 */

const ADMIN_CONFIG = {
  apiBase: '../api/',
  sessionKey: 'rfl_admin_session',
  sessionTimeout: 30 * 60 * 1000 // 30 минут
};

/**
 * Вход администратора. По умолчанию логин — Admin (страница входа админа).
 * @param {string} password
 * @param {string} username
 * @returns {Promise<boolean>}
 */
async function login(password, username = 'Admin') {
  try {
    const res = await fetch(`${ADMIN_CONFIG.apiBase}auth.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ action: 'login', username, password })
    });
    const data = await res.json().catch(() => ({}));

    if (res.ok && data.status === 'success' && data.role === 'admin') {
      const sessionData = {
        authenticated: true,
        role: data.role,
        username: data.username || username,
        loginTime: Date.now(),
        expiresAt: Date.now() + ADMIN_CONFIG.sessionTimeout
      };
      sessionStorage.setItem(ADMIN_CONFIG.sessionKey, JSON.stringify(sessionData));
      console.log('✓ Вход успешен');
      return true;
    }

    console.error('✗ Неверный логин или пароль');
    return false;
  } catch (e) {
    console.error('Ошибка входа:', e);
    return false;
  }
}

/**
 * Быстрая проверка маркера сессии на клиенте (для UI/таймера).
 * @returns {boolean}
 */
function isAdmin() {
  const session = sessionStorage.getItem(ADMIN_CONFIG.sessionKey);
  if (!session) return false;

  try {
    const sessionData = JSON.parse(session);
    if (Date.now() > sessionData.expiresAt) {
      clearClientSession();
      return false;
    }
    return sessionData.authenticated === true;
  } catch (e) {
    console.error('Ошибка проверки сессии:', e);
    return false;
  }
}

/**
 * Серверная проверка сессии администратора.
 * @returns {Promise<boolean>}
 */
async function checkAdmin() {
  try {
    const res = await fetch(`${ADMIN_CONFIG.apiBase}auth.php?action=check`, {
      credentials: 'same-origin'
    });
    const data = await res.json().catch(() => ({}));
    return Boolean(data.authenticated) && data.role === 'admin';
  } catch (e) {
    console.error('Ошибка проверки сессии:', e);
    return false;
  }
}

/**
 * Очистить клиентский маркер сессии.
 */
function clearClientSession() {
  sessionStorage.removeItem(ADMIN_CONFIG.sessionKey);
}

/**
 * Выход администратора.
 */
async function logout() {
  try {
    await fetch(`${ADMIN_CONFIG.apiBase}auth.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ action: 'logout' })
    });
  } catch (e) {
    console.error('Ошибка выхода:', e);
  }
  clearClientSession();
  console.log('✓ Выход выполнен');
  window.location.href = 'login.html';
}

/**
 * Защитить страницу админа (серверная проверка сессии).
 */
async function protectAdminPage() {
  const ok = await checkAdmin();
  if (!ok) {
    console.warn('Доступ запрещён. Перенаправление на страницу входа...');
    clearClientSession();
    window.location.href = 'login.html';
  }
}

/**
 * Получить оставшееся время сессии (в минутах).
 */
function getSessionTimeRemaining() {
  const session = sessionStorage.getItem(ADMIN_CONFIG.sessionKey);
  if (!session) return 0;

  try {
    const sessionData = JSON.parse(session);
    const remaining = sessionData.expiresAt - Date.now();
    return Math.ceil(remaining / 1000 / 60);
  } catch (e) {
    return 0;
  }
}

// Экспортировать функции
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { login, isAdmin, checkAdmin, logout, protectAdminPage, getSessionTimeRemaining };
}
