-- ============================================================
-- PFC1Roblox / RFL — структура базы данных (MySQL / MariaDB)
-- Совместимо с Reg.ru Shared Hosting (MySQL 5.7+ / MariaDB 10+)
-- Кодировка: utf8mb4 (полная поддержка emoji и кириллицы)
-- ============================================================
--
-- Как применить на Reg.ru:
--   1. Панель управления -> Базы данных -> создать БД и пользователя.
--   2. Открыть phpMyAdmin -> выбрать созданную БД -> вкладка "Импорт".
--   3. Загрузить этот файл (database.sql) и нажать "Вперёд".
--   4. Прописать данные подключения в api/config.php.
--
-- Все таблицы используют строковые ID (VARCHAR), которые генерирует
-- фронтенд (DataManager.generateId), чтобы сохранить связи между
-- пилотами, командами, этапами и результатами.
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ------------------------------------------------------------
-- Пользователи (админы / зарегистрированные пользователи)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(64) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` VARCHAR(20) NOT NULL DEFAULT 'user',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Пилоты
-- stats_json хранит { points, wins, podiums, fastestLaps }
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `drivers` (
  `id` VARCHAR(64) PRIMARY KEY,
  `firstName` VARCHAR(100) NOT NULL DEFAULT '',
  `lastName` VARCHAR(100) NOT NULL DEFAULT '',
  `number` INT NULL,
  `team_id` VARCHAR(64) NULL,
  `class` VARCHAR(20) NOT NULL DEFAULT 'F1',
  `nationality` VARCHAR(10) NOT NULL DEFAULT '',
  `avatar` VARCHAR(500) NOT NULL DEFAULT '',
  `stats_json` TEXT NULL,
  KEY `idx_drivers_team` (`team_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Команды
-- stats_json хранит { points, wins, podiums }
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `teams` (
  `id` VARCHAR(64) PRIMARY KEY,
  `name` VARCHAR(150) NOT NULL,
  `short_name` VARCHAR(20) NOT NULL DEFAULT '',
  `logo_url` VARCHAR(500) NOT NULL DEFAULT '',
  `country` VARCHAR(100) NOT NULL DEFAULT '',
  `color` VARCHAR(20) NOT NULL DEFAULT '#00D4FF',
  `stats_json` TEXT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Календарь (этапы сезона)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `calendar` (
  `id` VARCHAR(64) PRIMARY KEY,
  `round` INT NOT NULL DEFAULT 0,
  `track` VARCHAR(200) NOT NULL DEFAULT '',
  `country` VARCHAR(100) NOT NULL DEFAULT '',
  `timezone` VARCHAR(64) NOT NULL DEFAULT 'UTC',
  `date` VARCHAR(40) NOT NULL DEFAULT '',
  `status` VARCHAR(20) NOT NULL DEFAULT 'upcoming',
  `class` VARCHAR(20) NOT NULL DEFAULT 'F1',
  `stream_link` VARCHAR(500) NOT NULL DEFAULT ''
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Результаты гонок
-- grid = стартовая позиция, finish = финишная позиция
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `results` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `race_id` VARCHAR(64) NOT NULL,
  `driver_id` VARCHAR(64) NOT NULL,
  `grid` INT NOT NULL DEFAULT 0,
  `finish` INT NOT NULL DEFAULT 0,
  `points` INT NOT NULL DEFAULT 0,
  `fastest_lap` TINYINT(1) NOT NULL DEFAULT 0,
  KEY `idx_results_race` (`race_id`),
  KEY `idx_results_driver` (`driver_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Новости (нужны для страницы news.html, не входили в исходный
-- список, но добавлены, чтобы сохранить функционал сайта)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `news` (
  `id` VARCHAR(64) PRIMARY KEY,
  `title` VARCHAR(255) NOT NULL DEFAULT '',
  `category` VARCHAR(100) NOT NULL DEFAULT '',
  `content` TEXT NULL,
  `image` VARCHAR(500) NOT NULL DEFAULT '',
  `date` VARCHAR(40) NOT NULL DEFAULT '',
  `author` VARCHAR(150) NOT NULL DEFAULT ''
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- НАЧАЛЬНЫЕ ДАННЫЕ (seed)
-- ============================================================

-- Администратор по умолчанию: логин Admin / пароль RFL2025Admin
-- Хэш сгенерирован через password_hash('RFL2025Admin', PASSWORD_DEFAULT).
-- При желании пароль можно сменить через регистрацию/админку.
INSERT INTO `users` (`username`, `password_hash`, `role`) VALUES
  ('Admin', '$2y$10$scsAECsCmLa5suxgd3Oo3eiyKB7eAFWVcUYhSBzDIXyi4EMYH4Te6', 'admin')
ON DUPLICATE KEY UPDATE `role` = 'admin';

-- Команды
INSERT INTO `teams` (`id`, `name`, `short_name`, `logo_url`, `country`, `color`, `stats_json`) VALUES
  ('team_1', 'Red Racers', 'RR', '', 'Россия', '#E10600', '{"points":443,"wins":5,"podiums":12}'),
  ('team_2', 'Blue Thunder', 'BT', '', 'Беларусь', '#00D4FF', '{"points":156,"wins":1,"podiums":4}')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- Пилоты
INSERT INTO `drivers` (`id`, `firstName`, `lastName`, `number`, `team_id`, `class`, `nationality`, `avatar`, `stats_json`) VALUES
  ('driver_1', 'Максим', 'Петров', 1, 'team_1', 'F1', 'RU', '', '{"points":245,"wins":3,"podiums":7,"fastestLaps":2}'),
  ('driver_2', 'Иван', 'Смирнов', 2, 'team_1', 'F1', 'RU', '', '{"points":198,"wins":2,"podiums":5,"fastestLaps":1}'),
  ('driver_3', 'Алексей', 'Волков', 3, 'team_2', 'F1', 'BY', '', '{"points":156,"wins":1,"podiums":4,"fastestLaps":0}')
ON DUPLICATE KEY UPDATE `firstName` = VALUES(`firstName`);

-- Календарь
INSERT INTO `calendar` (`id`, `round`, `track`, `country`, `timezone`, `date`, `status`, `class`, `stream_link`) VALUES
  ('round_1', 1, 'Monaco Street Circuit', 'Monaco', 'Europe/Monaco', '2026-03-15T14:00:00Z', 'finished', 'F1', 'https://twitch.tv/example'),
  ('round_2', 2, 'Silverstone Grand Prix', 'United Kingdom', 'Europe/London', '2026-04-05T14:00:00Z', 'finished', 'F1', 'https://twitch.tv/example'),
  ('round_3', 3, 'Monza Speed Track', 'Italy', 'Europe/Rome', '2026-05-10T14:00:00Z', 'live', 'F1', 'https://twitch.tv/example'),
  ('round_4', 4, 'Spa-Francorchamps', 'Belgium', 'Europe/Brussels', '2026-06-07T14:00:00Z', 'upcoming', 'F1', 'https://twitch.tv/example')
ON DUPLICATE KEY UPDATE `track` = VALUES(`track`);

-- Результаты (этап 1)
INSERT INTO `results` (`race_id`, `driver_id`, `grid`, `finish`, `points`, `fastest_lap`) VALUES
  ('round_1', 'driver_1', 2, 1, 25, 1),
  ('round_1', 'driver_2', 3, 2, 18, 0),
  ('round_1', 'driver_3', 1, 3, 15, 0);

-- Новости
INSERT INTO `news` (`id`, `title`, `category`, `content`, `image`, `date`, `author`) VALUES
  ('news_1', 'Максим Петров побеждает на Монако!', 'Результаты', 'В захватывающей гонке на улицах Монако Максим Петров одержал первую победу сезона.', '', '2026-03-15T16:00:00Z', 'Редакция RFL'),
  ('news_2', 'Новый сезон RFL стартует с рекордной аудиторией', 'Новости', 'Первый этап чемпионата собрал рекордное количество зрителей.', '', '2026-03-16T10:00:00Z', 'Редакция RFL')
ON DUPLICATE KEY UPDATE `title` = VALUES(`title`);
