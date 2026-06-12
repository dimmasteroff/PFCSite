<?php
/**
 * config.php — подключение к базе данных MySQL через PDO.
 *
 * ====== НАСТРОЙКИ ПОДКЛЮЧЕНИЯ (ДАННЫЕ ИЗ ПАНЕЛИ REG.RU) ======
 * Константы DB_HOST / DB_NAME / DB_USER / DB_PASS / DB_CHARSET ниже
 * использует функция db(). Имена констант менять НЕЛЬЗЯ — db() ждёт
 * именно их.
 *
 * ВАЖНО ПРО ПАРОЛЬ И ПУБЛИЧНЫЙ РЕПОЗИТОРИЙ:
 * Этот репозиторий публичный, поэтому реальный пароль БД здесь НЕ
 * хранится (его моментально воруют боты, сканирующие GitHub).
 * Реальный пароль задаётся одним из двух способов:
 *   1) создать рядом файл api/config.local.php (он в .gitignore и НЕ
 *      попадает в git) со строкой:
 *         <?php define('DB_PASS', 'ВАШ_ПАРОЛЬ_ИЗ_REG_RU');
 *      Можно переопределить там и любые другие константы (DB_HOST и т.д.).
 *   2) либо просто впишите пароль прямо в DB_PASS ниже НА СЕРВЕРЕ
 *      (через FTP/файловый менеджер Reg.ru), не коммитя его в git.
 * ===============================================================
 */

// Необязательный локальный конфиг с реальными доступами (вне git).
// Если файл есть — заданные в нём константы имеют приоритет.
$__local = __DIR__ . '/config.local.php';
if (is_file($__local)) {
    require $__local;
}

// Значения по умолчанию. define() сработает только если константа ещё
// не задана в config.local.php (defined() || define()).
defined('DB_HOST')    || define('DB_HOST', 'localhost');                 // адрес сервера БД Reg.ru
defined('DB_NAME')    || define('DB_NAME', 'u3503126_PFCRoblox');        // имя базы данных
defined('DB_USER')    || define('DB_USER', 'u3503126_dimmasteroff');     // пользователь БД
defined('DB_PASS')    || define('DB_PASS', 'ВСТАВЬ_ПАРОЛЬ_БД');          // !!! пароль: задать в config.local.php или на сервере
defined('DB_CHARSET') || define('DB_CHARSET', 'utf8mb4');

/**
 * Вернуть единственный экземпляр PDO-соединения.
 *
 * @return PDO
 */
function db(): PDO
{
    static $pdo = null;

    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $dsn = sprintf('mysql:host=%s;dbname=%s;charset=%s', DB_HOST, DB_NAME, DB_CHARSET);

    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ];

    try {
        $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
    } catch (PDOException $e) {
        // Детали ошибки НЕ показываем в браузере (безопасность).
        http_response_code(500);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            'status'  => 'error',
            'message' => 'Ошибка подключения к базе данных. Проверьте api/config.php.',
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    return $pdo;
}

/**
 * Отправить JSON-ответ и завершить выполнение.
 *
 * @param mixed $data
 * @param int   $statusCode
 */
function json_response($data, int $statusCode = 200): void
{
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}
