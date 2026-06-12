<?php
/**
 * get_data.php — отдача данных сайту в формате JSON.
 *
 * GET ?table=drivers|teams|calendar|results|news|standings|all
 *
 * Формат ответа совпадает со старой структурой localStorage, чтобы
 * фронтенд (DataManager / PageSync / app.js) работал без изменений логики.
 */

require __DIR__ . '/config.php';

header('Content-Type: application/json; charset=utf-8');

$table = $_GET['table'] ?? '';

// Необязательный параметр ?limit=N — ограничение количества записей (например, новостей).
$limit = isset($_GET['limit']) ? max(0, (int)$_GET['limit']) : 0;

$allowed = ['drivers', 'teams', 'calendar', 'results', 'news', 'standings', 'all'];
if (!in_array($table, $allowed, true)) {
    json_response(['status' => 'error', 'message' => 'Недопустимая таблица'], 400);
}

try {
    if ($table === 'all') {
        json_response([
            'drivers'   => get_drivers(),
            'teams'     => get_teams(),
            'calendar'  => get_calendar(),
            'results'   => get_results(),
            'news'      => get_news(),
            'standings' => get_standings(),
        ]);
    }

    // ?table=results&detailed=1 -> плоский список с JOIN drivers+teams
    // (POS, имя пилота, команда, очки). Обычный ?table=results оставлен
    // без изменений для совместимости с остальным фронтендом.
    if ($table === 'results' && !empty($_GET['detailed'])) {
        json_response(get_results_detailed($limit));
    }

    if ($table === 'news') {
        json_response(get_news($limit));
    }

    $data = call_user_func('get_' . $table);
    json_response($data);
} catch (PDOException $e) {
    json_response(['status' => 'error', 'message' => 'Ошибка чтения данных'], 500);
}

/**
 * Пилоты -> массив объектов { id, firstName, ..., stats:{} }
 */
function get_drivers(): array
{
    $rows = db()->query('SELECT * FROM drivers ORDER BY number ASC')->fetchAll();
    return array_map(function ($r) {
        return [
            'id'          => $r['id'],
            'firstName'   => $r['firstName'],
            'lastName'    => $r['lastName'],
            'number'      => $r['number'] !== null ? (int)$r['number'] : null,
            'teamId'      => $r['team_id'] ?? '',
            'class'       => $r['class'] ?: 'F1',
            'nationality' => $r['nationality'] ?? '',
            'avatar'      => $r['avatar'] ?? '',
            'stats'       => decode_stats($r['stats_json'], ['points' => 0, 'wins' => 0, 'podiums' => 0, 'fastestLaps' => 0]),
        ];
    }, $rows);
}

/**
 * Команды -> массив объектов. Состав (drivers) вычисляется из таблицы drivers.
 */
function get_teams(): array
{
    $teams = db()->query('SELECT * FROM teams ORDER BY name ASC')->fetchAll();
    $driverRows = db()->query('SELECT id, team_id FROM drivers')->fetchAll();

    return array_map(function ($t) use ($driverRows) {
        $members = [];
        foreach ($driverRows as $d) {
            if (($d['team_id'] ?? '') === $t['id']) {
                $members[] = $d['id'];
            }
        }
        return [
            'id'        => $t['id'],
            'name'      => $t['name'],
            'shortName' => $t['short_name'] ?? '',
            'color'     => $t['color'] ?: '#00D4FF',
            'logoUrl'   => $t['logo_url'] ?? '',
            'country'   => $t['country'] ?? '',
            'drivers'   => $members,
            'stats'     => decode_stats($t['stats_json'], ['points' => 0, 'wins' => 0, 'podiums' => 0]),
        ];
    }, $teams);
}

/**
 * Календарь -> { season, rounds: [...] }
 */
function get_calendar(): array
{
    $rows = db()->query('SELECT * FROM calendar ORDER BY round ASC')->fetchAll();
    $rounds = array_map(function ($r) {
        return [
            'id'           => $r['id'],
            'round'        => (int)$r['round'],
            'track'        => $r['track'],
            'date'         => $r['date'],
            'status'       => $r['status'] ?: 'upcoming',
            'trackCountry' => $r['country'] ?? '',
            'timezone'     => $r['timezone'] ?: 'UTC',
            'class'        => $r['class'] ?: 'F1',
            'streamLink'   => $r['stream_link'] ?? '',
        ];
    }, $rows);

    $season = '2026';
    foreach ($rounds as $round) {
        if (!empty($round['date']) && preg_match('/(\d{4})/', $round['date'], $m)) {
            $season = $m[1];
            break;
        }
    }

    return ['season' => $season, 'rounds' => $rounds];
}

/**
 * Результаты -> { race_id: [ { driverId, startPos, finishPos, points, fastestLap } ] }
 */
function get_results(): array
{
    $rows = db()->query('SELECT * FROM results ORDER BY finish ASC')->fetchAll();
    $out = [];
    foreach ($rows as $r) {
        $raceId = $r['race_id'];
        if (!isset($out[$raceId])) {
            $out[$raceId] = [];
        }
        $out[$raceId][] = [
            'driverId'   => $r['driver_id'],
            'startPos'   => (int)$r['grid'],
            'finishPos'  => (int)$r['finish'],
            'points'     => (int)$r['points'],
            'fastestLap' => (bool)$r['fastest_lap'],
        ];
    }
    return $out;
}

/**
 * Результаты последней/любой гонки с JOIN на drivers и teams.
 * Возвращает плоский список строк, удобный для таблицы на главной:
 * { race_id, round, track, date, finishPos, startPos, points, fastestLap,
 *   driverId, driverName, teamId, teamName, teamColor }
 *
 * @param int $limit 0 = без ограничения
 */
function get_results_detailed(int $limit = 0): array
{
    $sql = 'SELECT r.race_id, r.driver_id, r.grid, r.finish, r.points, r.fastest_lap,
                   c.round, c.track, c.date,
                   d.firstName, d.lastName, d.number,
                   t.id AS team_id, t.name AS team_name, t.color AS team_color
            FROM results r
            LEFT JOIN drivers  d ON d.id = r.driver_id
            LEFT JOIN teams    t ON t.id = d.team_id
            LEFT JOIN calendar c ON c.id = r.race_id
            ORDER BY c.round DESC, r.finish ASC';
    if ($limit > 0) {
        $sql .= ' LIMIT ' . $limit;
    }

    $rows = db()->query($sql)->fetchAll();
    return array_map(function ($r) {
        $name = trim(($r['firstName'] ?? '') . ' ' . ($r['lastName'] ?? ''));
        return [
            'raceId'     => $r['race_id'],
            'round'      => (int)$r['round'],
            'track'      => $r['track'] ?? '',
            'date'       => $r['date'] ?? '',
            'driverId'   => $r['driver_id'],
            'driverName' => $name !== '' ? $name : 'N/A',
            'number'     => $r['number'] !== null ? (int)$r['number'] : null,
            'teamId'     => $r['team_id'] ?? '',
            'teamName'   => $r['team_name'] ?? '',
            'teamColor'  => $r['team_color'] ?? '#888888',
            'startPos'   => (int)$r['grid'],
            'finishPos'  => (int)$r['finish'],
            'points'     => (int)$r['points'],
            'fastestLap' => (bool)$r['fastest_lap'],
        ];
    }, $rows);
}

/**
 * Новости -> массив объектов.
 *
 * @param int $limit 0 = все новости, иначе максимум N свежих.
 */
function get_news(int $limit = 0): array
{
    $sql = 'SELECT * FROM news ORDER BY date DESC';
    if ($limit > 0) {
        $sql .= ' LIMIT ' . $limit;
    }
    $rows = db()->query($sql)->fetchAll();
    return array_map(function ($r) {
        return [
            'id'       => $r['id'],
            'title'    => $r['title'],
            'category' => $r['category'],
            'content'  => $r['content'] ?? '',
            'image'    => $r['image'] ?? '',
            'date'     => $r['date'],
            'author'   => $r['author'] ?? '',
        ];
    }, $rows);
}

/**
 * Турнирная таблица вычисляется на лету из результатов.
 * -> { drivers: [...], constructors: [...] }
 */
function get_standings(): array
{
    $results = get_results();
    $drivers = get_drivers();

    $teamByDriver = [];
    foreach ($drivers as $d) {
        $teamByDriver[$d['id']] = $d['teamId'];
    }

    $driverAgg = [];
    $teamAgg = [];

    foreach ($results as $roundResults) {
        foreach ($roundResults as $res) {
            $did = $res['driverId'];
            if (!isset($driverAgg[$did])) {
                $driverAgg[$did] = ['driverId' => $did, 'points' => 0, 'wins' => 0, 'podiums' => 0];
            }
            $driverAgg[$did]['points'] += $res['points'];
            if ($res['finishPos'] === 1) {
                $driverAgg[$did]['wins']++;
            }
            if ($res['finishPos'] <= 3) {
                $driverAgg[$did]['podiums']++;
            }

            $tid = $teamByDriver[$did] ?? '';
            if ($tid !== '') {
                if (!isset($teamAgg[$tid])) {
                    $teamAgg[$tid] = ['teamId' => $tid, 'points' => 0, 'wins' => 0, 'podiums' => 0];
                }
                $teamAgg[$tid]['points'] += $res['points'];
                if ($res['finishPos'] === 1) {
                    $teamAgg[$tid]['wins']++;
                }
                if ($res['finishPos'] <= 3) {
                    $teamAgg[$tid]['podiums']++;
                }
            }
        }
    }

    $driverStandings = array_values($driverAgg);
    usort($driverStandings, fn($a, $b) => $b['points'] - $a['points']);

    $constructorStandings = array_values($teamAgg);
    usort($constructorStandings, fn($a, $b) => $b['points'] - $a['points']);

    return ['drivers' => $driverStandings, 'constructors' => $constructorStandings];
}

/**
 * Декодировать stats_json с дефолтами.
 */
function decode_stats(?string $json, array $defaults): array
{
    $decoded = $json ? json_decode($json, true) : null;
    if (!is_array($decoded)) {
        $decoded = [];
    }
    return array_merge($defaults, $decoded);
}
