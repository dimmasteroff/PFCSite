# 🚀 Инструкция по развёртыванию

## На GitHub

### 1. Инициализировать Git репозиторий

```bash
cd rfl-final
git init
git add .
git commit -m "Initial commit: RFL website with admin panel"
```

### 2. Создать репозиторий на GitHub

1. Перейти на https://github.com/new
2. Назвать репозиторий: `rfl-website`
3. Добавить описание: "Roblox Formula League website with admin panel"
4. Выбрать "Public" или "Private"
5. Нажать "Create repository"

### 3. Добавить удалённый репозиторий и push

```bash
git remote add origin https://github.com/ВАШ_ЮЗЕР/rfl-website.git
git branch -M main
git push -u origin main
```

---

## На Vercel (рекомендуется)

### 1. Подключить GitHub репозиторий

1. Перейти на https://vercel.com/new
2. Нажать "Import Git Repository"
3. Выбрать GitHub репозиторий `rfl-website`
4. Нажать "Import"

### 2. Настроить проект

- **Project name:** `rfl-website` (или ваше имя)
- **Root directory:** `./` (корневая папка)
- **Framework preset:** `Other` (выбрать "Other")

### 3. Deploy

1. Нажать "Deploy"
2. Дождаться завершения (2-5 минут)
3. Сайт будет доступен на `https://rfl-website.vercel.app`

### 4. Привязать собственный домен (опционально)

1. В Vercel → Project Settings → Domains
2. Добавить ваш домен
3. Обновить DNS записи у провайдера домена

---

## На Netlify

### 1. Подключить GitHub репозиторий

1. Перейти на https://app.netlify.com/start
2. Нажать "Connect to Git"
3. Выбрать GitHub
4. Авторизоваться
5. Выбрать репозиторий `rfl-website`

### 2. Настроить сборку

- **Base directory:** (оставить пусто)
- **Build command:** (оставить пусто)
- **Publish directory:** `./`

### 3. Deploy

1. Нажать "Deploy site"
2. Дождаться завершения
3. Сайт будет доступен на `https://*.netlify.app`

---

## На собственном хостинге

### 1. Загрузить файлы через FTP/SFTP

```bash
# Используя sftp:
sftp user@host.com
cd public_html
put -r rfl-final/* .
```

### 2. Или через FTP клиент

1. Открыть FileZilla или другой FTP клиент
2. Подключиться к хостингу
3. Загрузить все файлы из папки `rfl-final/` в `public_html/`

### 3. Проверить доступ

1. Открыть браузер
2. Перейти на `https://ваш-домен.com`
3. Должна открыться главная страница

---

## На локальной машине (разработка)

### Python 3

```bash
cd rfl-final
python -m http.server 8000
# Открыть http://localhost:8000
```

### Node.js

```bash
cd rfl-final
npx http-server
# Открыть http://localhost:8080
```

### VS Code + Live Server

1. Установить расширение "Live Server"
2. Кликнуть правой кнопкой на `index.html`
3. Выбрать "Open with Live Server"

---

## Проверка после развёртывания

✅ Открывается главная страница  
✅ Работают ссылки навигации  
✅ Загружаются стили и изображения  
✅ Админ-панель доступна по `/admin/login.html`  
✅ Админ-панель работает с паролем `RFL2025Admin`  
✅ Данные сохраняются в localStorage  

---

## Решение проблем при развёртывании

### Ошибка 404 при открытии страниц

**Проблема:** Маршруты не работают  
**Решение:** Убедитесь, что все файлы загружены на хостинг

### Стили не загружаются

**Проблема:** CSS файлы не найдены  
**Решение:** Проверьте пути в HTML файлах (должны быть относительные пути)

### Админ-панель не открывается

**Проблема:** Ошибка при входе  
**Решение:** Проверьте пароль и консоль браузера на ошибки

### Данные не сохраняются

**Проблема:** localStorage не работает  
**Решение:** Используйте обычный режим браузера (не приватный)

---

**Готово к развёртыванию!** 🚀
