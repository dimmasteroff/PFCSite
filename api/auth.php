<?php
/**
 * auth.php — аутентификация через PHP-сессии.
 *
 * POST action=login    { username, password } -> вход
 * POST action=register { username, password } -> регистрация нового пользователя
 * POST action=logout                          -> выход
 * GET  action=check                           -> текущий статус сессии
 *
 * Спец-логика админа: логин Admin + пароль RFL2025Admin всегда дают роль admin
 * (даже если строки в таблице users ещё нет — удобно для первого входа).
 */

require __DIR__ . '/config.php';

session_start();

const ADMIN_USERNAME = 'Admin';
const ADMIN_PASSWORD = 'RFL2025Admin';

$action = $_GET['action'] ?? $_POST['action'] ?? '';

// Тело может прийти как JSON (fetch) или как form-data.
$input = [];
$raw = file_get_contents('php://input');
if ($raw !== '' && $raw !== false) {
    $decoded = json_decode($raw, true);
    if (is_array($decoded)) {
        $input = $decoded;
    }
}
$action   = $input['action']   ?? $action;
$username = trim((string)($input['username'] ?? $_POST['username'] ?? ''));
$password = (string)($input['password'] ?? $_POST['password'] ?? '');

switch ($action) {
    case 'login':
        handle_login($username, $password);
        break;
    case 'register':
        handle_register($username, $password);
        break;
    case 'logout':
        handle_logout();
        break;
    case 'check':
        handle_check();
        break;
    default:
        json_response(['status' => 'error', 'message' => 'Неизвестное действие'], 400);
}

/**
 * Вход пользователя.
 */
function handle_login(string $username, string $password): void
{
    if ($username === '' || $password === '') {
        json_response(['status' => 'error', 'message' => 'Введите логин и пароль'], 400);
    }

    // Спец-доступ администратора по умолчанию.
    if ($username === ADMIN_USERNAME && $password === ADMIN_PASSWORD) {
        start_session_for($username, 'admin');
        json_response(['status' => 'success', 'role' => 'admin', 'username' => $username]);
    }

    $stmt = db()->prepare('SELECT username, password_hash, role FROM users WHERE username = :u LIMIT 1');
    $stmt->execute([':u' => $username]);
    $user = $stmt->fetch();

    if ($user && password_verify($password, $user['password_hash'])) {
        start_session_for($user['username'], $user['role']);
        json_response(['status' => 'success', 'role' => $user['role'], 'username' => $user['username']]);
    }

    json_response(['status' => 'error', 'message' => 'Неверный логин или пароль'], 401);
}

/**
 * Регистрация нового пользователя (роль user).
 */
function handle_register(string $username, string $password): void
{
    if (strlen($username) < 3 || strlen($password) < 6) {
        json_response([
            'status'  => 'error',
            'message' => 'Логин минимум 3 символа, пароль минимум 6 символов',
        ], 400);
    }

    $stmt = db()->prepare('SELECT id FROM users WHERE username = :u LIMIT 1');
    $stmt->execute([':u' => $username]);
    if ($stmt->fetch()) {
        json_response(['status' => 'error', 'message' => 'Пользователь уже существует'], 409);
    }

    $hash = password_hash($password, PASSWORD_DEFAULT);
    $insert = db()->prepare(
        'INSERT INTO users (username, password_hash, role) VALUES (:u, :h, :r)'
    );
    $insert->execute([':u' => $username, ':h' => $hash, ':r' => 'user']);

    start_session_for($username, 'user');
    json_response(['status' => 'success', 'role' => 'user', 'username' => $username]);
}

/**
 * Выход — очистка сессии.
 */
function handle_logout(): void
{
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'], $params['secure'], $params['httponly']);
    }
    session_destroy();
    json_response(['status' => 'success']);
}

/**
 * Проверка текущей сессии (для защиты страниц на клиенте).
 */
function handle_check(): void
{
    $authenticated = isset($_SESSION['user']);
    json_response([
        'status'        => 'success',
        'authenticated' => $authenticated,
        'role'          => $_SESSION['role'] ?? null,
        'username'      => $_SESSION['user'] ?? null,
    ]);
}

/**
 * Записать данные пользователя в сессию.
 */
function start_session_for(string $username, string $role): void
{
    session_regenerate_id(true);
    $_SESSION['user'] = $username;
    $_SESSION['role'] = $role;
}
