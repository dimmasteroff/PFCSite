# 🏁 RFL - Roblox Formula League Website

Полнофункциональный сайт Roblox Formula League с админ-панелью для управления данными в реальном времени.

> **Архитектура:** фронтенд (HTML/CSS/JS) + бэкенд на **PHP + MySQL** (PDO).
> Данные сохраняются в БД мгновенно через API (`api/`), без экспорта файлов.
> Совместимо с shared hosting Reg.ru (PHP 7.4+). Подробности развёртывания — в `DEPLOYMENT.md`.

## 📋 Структура проекта

```
rfl-html-project/
├── public/              # Публичные страницы
│   ├── index.html      # Главная страница
│   ├── drivers.html    # Страница пилотов
│   ├── teams.html      # Страница команд
│   ├── calendar.html   # Календарь сезона
│   ├── results.html    # Результаты гонок
│   └── news.html       # Новости
├── admin/              # Админ-панель
│   ├── index.html      # Админ-панель (защищена паролем)
│   ├── login.html      # Страница входа
│   └── admin.js        # Логика админ-панели
├── api/                # Бэкенд (PHP)
│   ├── config.php      # Подключение к MySQL (PDO) — впишите данные Reg.ru
│   ├── auth.php        # Вход/регистрация через PHP-сессии
│   ├── get_data.php    # Отдача данных сайту (JSON)
│   └── save_data.php   # Приём данных от админки (только админ)
├── database.sql        # SQL-дамп для создания таблиц
├── js/                 # JavaScript
│   ├── DataManager.js  # Управление данными (fetch -> api/)
│   └── auth.js         # Аутентификация администратора (PHP-сессии)
├── css/
│   └── styles.css      # Глобальные стили (Neon Asphalt)
├── data/
│   └── sample-data.json # Пример данных
└── README.md           # Этот файл
```

## 🚀 Быстрый старт

### Локально (разработка)

Требуется PHP 7.4+ и MySQL/MariaDB.

```bash
# 1. Создать БД и импортировать схему
mysql -u root -p -e "CREATE DATABASE pfc_site CHARACTER SET utf8mb4"
mysql -u root -p pfc_site < database.sql

# 2. Прописать доступы в api/config.php (DB_HOST/DB_NAME/DB_USER/DB_PASS)

# 3. Запустить встроенный сервер PHP
php -S localhost:8000

# Открыть http://localhost:8000
```

### На хостинге (production)

1. Загрузить все файлы на хостинг (например, через FTP)
2. Убедиться, что файлы доступны по HTTP
3. Открыть `index.html` в браузере

## 🔐 Доступ в админ-панель

1. Перейти на `/admin/login.html`
2. Логин: `Admin`, пароль: `RFL2025Admin`
3. Нажать "Войти"
4. Попадёте в админ-панель

Авторизация выполняется на сервере (`api/auth.php`) через PHP-сессии
(`$_SESSION`). Сохранение данных (`api/save_data.php`) доступно только
пользователю с ролью `admin`.

### Смена пароля администратора

Логин `Admin` / `RFL2025Admin` зашит как доступ по умолчанию в
`api/auth.php` (константы `ADMIN_USERNAME` / `ADMIN_PASSWORD`). Чтобы
использовать БД-пользователя, обновите строку в таблице `users`:

```sql
UPDATE users SET password_hash = '<новый_хеш>' WHERE username = 'Admin';
```

Хеш генерируется в PHP:
```php
echo password_hash('ВАШ_ПАРОЛЬ', PASSWORD_DEFAULT);
```

## 📊 Функционал админ-панели

- ✅ **Пилоты** — добавить, редактировать, удалить
- ✅ **Команды** — управление командами и цветами
- ✅ **Календарь** — расписание этапов
- ✅ **Результаты** — запись результатов гонок
- ✅ **Новости** — публикация статей
- ✅ **Таблица** — просмотр личного и кубка конструкторов
- ✅ **Экспорт/Импорт** — сохранение и загрузка данных

## 💾 Хранение данных

Все данные хранятся в **базе MySQL** и доступны через API:

- Чтение: `GET api/get_data.php?table=drivers|teams|calendar|results|news|standings`
- Запись: `POST api/save_data.php` с телом `{ "table": "drivers", "data": [...] }`

Таблицы БД: `users`, `drivers`, `teams`, `calendar`, `results`, `news`
(см. `database.sql`). Турнирная таблица (`standings`) вычисляется на лету
из результатов. Структура JSON, отдаваемого API:

```javascript
{
  "drivers": [...],
  "teams": [...],
  "calendar": {...},
  "results": {...},
  "news": [...],
  "standings": {...}
}
```

### Экспорт данных

В админ-панели → Настройки → "Экспортировать данные" (скачивается JSON файл)

### Импорт данных

В админ-панели → Настройки → выберите JSON файл → "Импортировать данные"

## 🎨 Дизайн (Neon Asphalt)

- **Фон:** Тёмный (#0F0F13)
- **Акцент 1:** Красный (#E10600) — кнопки, флаги
- **Акцент 2:** Неоновый синий (#00D4FF) — ссылки, выделение
- **Шрифты:** Orbitron (заголовки) + Inter (текст)

## 📱 Адаптивность

Сайт полностью адаптивен:
- ✅ Десктоп (1200px+)
- ✅ Планшет (768px - 1200px)
- ✅ Мобильный (< 768px)

## 🔧 Технологии

- **HTML5** — структура
- **CSS3** — стили и анимации
- **JavaScript (ES6+)** — логика, `fetch` к API
- **PHP (vanilla)** — бэкенд, без фреймворков
- **MySQL + PDO** — хранение данных, prepared statements
- **PHP Sessions** — аутентификация
- **password_hash / password_verify** — хеширование паролей

## 📝 Примеры использования

### Добавить пилота

```javascript
const drivers = await DataManager.load('drivers');
drivers.push({
  id: 'driver_4',
  name: 'Новый пилот',
  number: 4,
  teamId: 'team_1',
  nationality: 'RU',
  stats: { points: 0, wins: 0, podiums: 0, fastestLaps: 0 }
});
await DataManager.save('drivers', drivers);
```

### Добавить новость

```javascript
const news = await DataManager.load('news');
news.push({
  id: 'news_' + Date.now(),
  title: 'Заголовок новости',
  category: 'Результаты',
  content: 'Содержание новости...',
  date: new Date().toISOString(),
  author: 'Редакция RFL'
});
await DataManager.save('news', news);
```

## 🆘 Решение проблем

### Данные не сохраняются

- Проверьте, что localStorage не отключен в браузере
- Используйте приватный режим браузера (данные не сохраняются)
- Очистите кэш браузера

### Админ-панель не открывается

- Убедитесь, что вы авторизованы (пароль правильный)
- Проверьте консоль браузера (F12) на ошибки
- Очистите sessionStorage: `sessionStorage.clear()`

### Стили не загружаются

- Проверьте пути к CSS файлам
- Убедитесь, что все файлы загружены на хостинг
- Очистите кэш браузера (Ctrl+Shift+Delete)

## 📞 Поддержка

Если у вас есть вопросы или проблемы, свяжитесь с разработчиком.

---

**Версия:** 1.0.0  
**Дата:** Май 2026  
**Лицензия:** MIT
