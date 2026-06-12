<?php
/**
 * config.php — подключение к базе данных MySQL через PDO.
 *
 * ВАЖНО: вставь данные из панели Reg.ru (раздел "Базы данных").
 * На Reg.ru shared hosting обычно:
 *   DB_HOST — localhost (или адрес вида mysqlXX.reg.ru)
 *   DB_NAME — uXXXXXX_dbname
 *   DB_USER — uXXXXXX_user
 *   DB_PASS — пароль, заданный при создании БД.
 */

// ====== ВСТАВЬ ДАННЫЕ ИЗ ПАНЕЛИ REG.RU ======
define('DB_HOST', 'DB_HOST'); // например: localhost
define('DB_NAME', 'DB_NAME'); // например: u123456_pfc
define('DB_USER', 'DB_USER'); // например: u123456_admin
define('DB_PASS', 'DB_PASS'); // пароль базы данных
define('DB_CHARSET', 'utf8mb4');
// =============================================

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
