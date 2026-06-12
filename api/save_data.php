<?php
/**
 * save_data.php — приём данных от админ-панели и запись в БД.
 *
 * POST JSON body: { "table": "drivers", "data": [...] }
 *
 * Защита: доступ только для администратора (PHP-сессия).
 * Для каждой таблицы выполняется атомарная "полная синхронизация"
 * (в транзакции: очистка + вставка), что соответствует тому, как
 * админка сохраняет данные целыми наборами. Все запросы —
 * подготовленные (prepared statements) для защиты от SQL-инъекций.
 */

require __DIR__ . '/config.php';

session_start();

header('Content-Type: application/json; charset=utf-8');

// ====== ПРОВЕРКА ПРАВ АДМИНИСТРАТОРА ======
if (($_SESSION['role'] ?? null) !== 'admin') {
    http_response_code(403);
    exit(json_encode(['status' => 'error', 'message' => 'Access Denied'], JSON_UNESCAPED_UNICODE));
}

$raw = file_get_contents('php://input');
$payload = json_decode($raw, true);

if (!is_array($payload) || !isset($payload['table'])) {
    json_response(['status' => 'error', 'message' => 'Некорректный запрос'], 400);
}

$table = $payload['table'];
$data  = $payload['data'] ?? null;

$allowed = ['drivers', 'teams', 'calendar', 'results', 'news', 'standings'];
if (!in_array($table, $allowed, true)) {
    json_response(['status' => 'error', 'message' => 'Недопустимая таблица'], 400);
}

try {
    switch ($table) {
        case 'drivers':
            save_drivers(is_array($data) ? $data : []);
            break;
        case 'teams':
            save_teams(is_array($data) ? $data : []);
            break;
        case 'calendar':
            save_calendar(is_array($data) ? $data : []);
            break;
        case 'results':
            save_results(is_array($data) ? $data : []);
            break;
        case 'news':
            save_news(is_array($data) ? $data : []);
            break;
        case 'standings':
            // Турнирная таблица вычисляется на лету в get_data.php,
            // отдельно её не храним — просто подтверждаем успех.
            break;
    }

    json_response(['status' => 'success', 'table' => $table]);
} catch (Throwable $e) {
    if (db()->inTransaction()) {
        db()->rollBack();
    }
    json_response(['status' => 'error', 'message' => 'Ошибка сохранения данных'], 500);
}

/**
 * Полная синхронизация таблицы пилотов.
 */
function save_drivers(array $drivers): void
{
    $pdo = db();
    $pdo->beginTransaction();
    $pdo->exec('DELETE FROM drivers');

    $stmt = $pdo->prepare(
        'INSERT INTO drivers (id, firstName, lastName, number, team_id, class, nationality, avatar, stats_json)
         VALUES (:id, :firstName, :lastName, :number, :team_id, :class, :nationality, :avatar, :stats_json)'
    );

    foreach ($drivers as $d) {
        $stats = $d['stats'] ?? ['points' => 0, 'wins' => 0, 'podiums' => 0, 'fastestLaps' => 0];
        $stmt->execute([
            ':id'          => (string)($d['id'] ?? gen_id('driver')),
            ':firstName'   => (string)($d['firstName'] ?? ''),
            ':lastName'    => (string)($d['lastName'] ?? ''),
            ':number'      => isset($d['number']) && $d['number'] !== '' ? (int)$d['number'] : null,
            ':team_id'     => (string)($d['teamId'] ?? ''),
            ':class'       => (string)($d['class'] ?? 'F1'),
            ':nationality' => (string)($d['nationality'] ?? ''),
            ':avatar'      => (string)($d['avatar'] ?? ''),
            ':stats_json'  => json_encode($stats, JSON_UNESCAPED_UNICODE),
        ]);
    }

    $pdo->commit();
}

/**
 * Полная синхронизация таблицы команд.
 */
function save_teams(array $teams): void
{
    $pdo = db();
    $pdo->beginTransaction();
    $pdo->exec('DELETE FROM teams');

    $stmt = $pdo->prepare(
        'INSERT INTO teams (id, name, short_name, logo_url, country, color, stats_json)
         VALUES (:id, :name, :short_name, :logo_url, :country, :color, :stats_json)'
    );

    foreach ($teams as $t) {
        $stats = $t['stats'] ?? ['points' => 0, 'wins' => 0, 'podiums' => 0];
        $stmt->execute([
            ':id'         => (string)($t['id'] ?? gen_id('team')),
            ':name'       => (string)($t['name'] ?? ''),
            ':short_name' => (string)($t['shortName'] ?? ''),
            ':logo_url'   => (string)($t['logoUrl'] ?? ($t['logo'] ?? '')),
            ':country'    => (string)($t['country'] ?? ''),
            ':color'      => (string)($t['color'] ?? '#00D4FF'),
            ':stats_json' => json_encode($stats, JSON_UNESCAPED_UNICODE),
        ]);
    }

    $pdo->commit();
}

/**
 * Полная синхронизация календаря. data = { season, rounds: [...] }
 */
function save_calendar(array $calendar): void
{
    $rounds = $calendar['rounds'] ?? [];
    if (!is_array($rounds)) {
        $rounds = [];
    }

    $pdo = db();
    $pdo->beginTransaction();
    $pdo->exec('DELETE FROM calendar');

    $stmt = $pdo->prepare(
        'INSERT INTO calendar (id, round, track, country, timezone, date, status, class, stream_link)
         VALUES (:id, :round, :track, :country, :timezone, :date, :status, :class, :stream_link)'
    );

    foreach ($rounds as $r) {
        $stmt->execute([
            ':id'          => (string)($r['id'] ?? gen_id('round')),
            ':round'       => (int)($r['round'] ?? 0),
            ':track'       => (string)($r['track'] ?? ''),
            ':country'     => (string)($r['trackCountry'] ?? ($r['country'] ?? '')),
            ':timezone'    => (string)($r['timezone'] ?? 'UTC'),
            ':date'        => (string)($r['date'] ?? ''),
            ':status'      => (string)($r['status'] ?? 'upcoming'),
            ':class'       => (string)($r['class'] ?? 'F1'),
            ':stream_link' => (string)($r['streamLink'] ?? ''),
        ]);
    }

    $pdo->commit();
}

/**
 * Полная синхронизация результатов. data = { race_id: [ {...} ] }
 */
function save_results(array $results): void
{
    $pdo = db();
    $pdo->beginTransaction();
    $pdo->exec('DELETE FROM results');

    $stmt = $pdo->prepare(
        'INSERT INTO results (race_id, driver_id, grid, finish, points, fastest_lap)
         VALUES (:race_id, :driver_id, :grid, :finish, :points, :fastest_lap)'
    );

    foreach ($results as $raceId => $roundResults) {
        if (!is_array($roundResults)) {
            continue;
        }
        foreach ($roundResults as $res) {
            $stmt->execute([
                ':race_id'     => (string)$raceId,
                ':driver_id'   => (string)($res['driverId'] ?? ''),
                ':grid'        => (int)($res['startPos'] ?? 0),
                ':finish'      => (int)($res['finishPos'] ?? 0),
                ':points'      => (int)($res['points'] ?? 0),
                ':fastest_lap' => !empty($res['fastestLap']) ? 1 : 0,
            ]);
        }
    }

    $pdo->commit();
}

/**
 * Полная синхронизация новостей.
 */
function save_news(array $news): void
{
    $pdo = db();
    $pdo->beginTransaction();
    $pdo->exec('DELETE FROM news');

    $stmt = $pdo->prepare(
        'INSERT INTO news (id, title, category, content, image, date, author)
         VALUES (:id, :title, :category, :content, :image, :date, :author)'
    );

    foreach ($news as $n) {
        $stmt->execute([
            ':id'       => (string)($n['id'] ?? gen_id('news')),
            ':title'    => (string)($n['title'] ?? ''),
            ':category' => (string)($n['category'] ?? ''),
            ':content'  => (string)($n['content'] ?? ''),
            ':image'    => (string)($n['image'] ?? ''),
            ':date'     => (string)($n['date'] ?? date('c')),
            ':author'   => (string)($n['author'] ?? ''),
        ]);
    }

    $pdo->commit();
}

/**
 * Сгенерировать строковый ID на стороне сервера (резервный вариант).
 */
function gen_id(string $prefix): string
{
    return $prefix . '_' . time() . '_' . bin2hex(random_bytes(4));
}
