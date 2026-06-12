/**
 * admin.js - Логика админ-панели
 */

// Защитить страницу
protectAdminPage();

// Переменные для редактирования
let editingId = null;
let editingType = null;

function driverFullName(driver) {
  return DataManager.getDriverFullName(driver);
}

function teamLogoUrl(team) {
  return DataManager.getTeamLogoUrl(team);
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', async () => {
  await loadAllData();
  updateSessionTimer();
  setInterval(updateSessionTimer, 1000);

  // Слушать обновления данных
  window.addEventListener('dataUpdated', (e) => {
    console.log('Данные обновлены:', e.detail.dataType);
    loadAllData();
  });
});

/**
 * Загрузить все данные
 */
async function loadAllData() {
  await loadDrivers();
  await loadTeams();
  await loadCalendar();
  await loadNews();
  await loadStandings();
  await updateStats();
}

/**
 * Переключение вкладок
 */
function switchTab(tabName) {
  // Скрыть все секции
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  // Показать выбранную
  document.getElementById(tabName).classList.add('active');
  event.target.classList.add('active');
}

/**
 * ========== ПИЛОТЫ ==========
 */
async function loadDrivers() {
  const drivers = await DataManager.load('drivers');
  const teams = await DataManager.load('teams');
  const tbody = document.querySelector('#driversTable tbody');
  tbody.innerHTML = '';

  drivers.forEach(driver => {
    const team = teams.find(t => t.id === driver.teamId);
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${driver.id}</td>
      <td>${driver.firstName || ''}</td>
      <td>${driver.lastName || ''}</td>
      <td>${driver.number}</td>
      <td>${team ? team.name : 'N/A'}</td>
      <td>${driver.nationality}</td>
      <td>${driver.stats?.points || 0}</td>
      <td class="table-actions">
        <button class="btn btn-secondary" onclick="editDriver('${driver.id}')">✏️</button>
        <button class="btn btn-danger" onclick="deleteDriver('${driver.id}')">🗑️</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

const DEFAULT_DRIVER_AVATAR = '../logos/default-driver.png';

function openDriverModal() {
  editingId = null;
  editingType = 'driver';
  document.getElementById('driverModalTitle').textContent = 'Добавить пилота';
  document.getElementById('driverForm').reset();
  // Сброс фото
  document.getElementById('driverAvatarData').value = '';
  document.getElementById('driverAvatarPreview').src = DEFAULT_DRIVER_AVATAR;
  loadTeamSelect();
  document.getElementById('driverModal').classList.add('active');
}

/**
 * Предпросмотр и конвертация загруженного фото пилота в Base64.
 * Base64 удобнее для shared-хостинга: фото хранится прямо в БД (поле avatar),
 * не нужно настраивать загрузку файлов на диск.
 */
function previewDriverAvatar(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  if (!['image/png', 'image/jpeg'].includes(file.type)) {
    alert('Допустимы только изображения PNG или JPEG.');
    event.target.value = '';
    return;
  }
  // Ограничение размера (~2 МБ), чтобы Base64 не раздул строку в БД
  if (file.size > 2 * 1024 * 1024) {
    alert('Файл слишком большой. Максимум 2 МБ.');
    event.target.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const base64 = e.target.result; // data:image/...;base64,....
    document.getElementById('driverAvatarData').value = base64;
    document.getElementById('driverAvatarPreview').src = base64;
  };
  reader.onerror = () => alert('Не удалось прочитать файл.');
  reader.readAsDataURL(file);
}

function clearDriverAvatar() {
  document.getElementById('driverAvatar').value = '';
  document.getElementById('driverAvatarData').value = '';
  document.getElementById('driverAvatarPreview').src = DEFAULT_DRIVER_AVATAR;
}

async function loadTeamSelect() {
  const teams = await DataManager.load('teams');
  const select = document.getElementById('driverTeam');
  select.innerHTML = '<option value="">-- Выберите команду --</option>';
  teams.forEach(team => {
    const option = document.createElement('option');
    option.value = team.id;
    option.textContent = team.name;
    select.appendChild(option);
  });
}

async function editDriver(id) {
  const drivers = await DataManager.load('drivers');
  const driver = drivers.find(d => d.id === id);

  if (!driver) return;

  editingId = id;
  editingType = 'driver';
  document.getElementById('driverModalTitle').textContent = 'Редактировать пилота';
  document.getElementById('driverFirstName').value = driver.firstName || '';
  document.getElementById('driverLastName').value = driver.lastName || '';
  document.getElementById('driverNumber').value = driver.number;
  await loadTeamSelect();
  document.getElementById('driverTeam').value = driver.teamId;
  document.getElementById('driverNationality').value = driver.nationality;
  // Загрузить текущее фото в превью и скрытое поле
  const currentAvatar = driver.avatar || '';
  document.getElementById('driverAvatar').value = '';
  document.getElementById('driverAvatarData').value = currentAvatar;
  document.getElementById('driverAvatarPreview').src = currentAvatar || DEFAULT_DRIVER_AVATAR;
  document.getElementById('driverModal').classList.add('active');
}

async function saveDriver(e) {
  e.preventDefault();

  const drivers = await DataManager.load('drivers');
  const firstName = document.getElementById('driverFirstName').value.trim();
  const lastName = document.getElementById('driverLastName').value.trim();
  const number = parseInt(document.getElementById('driverNumber').value, 10);
  const teamId = document.getElementById('driverTeam').value;
  const nationality = document.getElementById('driverNationality').value.trim();
  // Фото: Base64 из загрузки (или пусто -> заглушка подставится на сайте)
  const avatar = document.getElementById('driverAvatarData').value || '';

  if (editingId) {
    const driver = drivers.find(d => d.id === editingId);
    if (driver) {
      driver.firstName = firstName;
      driver.lastName = lastName;
      driver.number = number;
      driver.teamId = teamId;
      driver.nationality = nationality;
      driver.class = driver.class || 'F1';
      driver.avatar = avatar;
      delete driver.name;
    }
  } else {
    drivers.push({
      id: DataManager.generateId('driver'),
      firstName,
      lastName,
      number,
      teamId,
      nationality,
      class: 'F1',
      avatar,
      stats: { points: 0, wins: 0, podiums: 0, fastestLaps: 0 }
    });
  }

  await DataManager.save('drivers', drivers);
  closeModal('driverModal');
  await loadDrivers();
}

async function deleteDriver(id) {
  if (!confirm('Удалить пилота?')) return;

  let drivers = await DataManager.load('drivers');
  drivers = drivers.filter(d => d.id !== id);
  await DataManager.save('drivers', drivers);
  await loadDrivers();
}

/**
 * ========== КОМАНДЫ ==========
 */
async function loadTeams() {
  const teams = await DataManager.load('teams');
  const drivers = await DataManager.load('drivers');
  const tbody = document.querySelector('#teamsTable tbody');
  tbody.innerHTML = '';

  teams.forEach(team => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${team.id}</td>
      <td>
        <span style="display: inline-flex; align-items: center; gap: 0.5rem;">
          <img class="team-logo-thumb" src="${teamLogoUrl(team)}" alt="${team.name}" onerror="this.src='../logos/pfcnewlogo.png'">
          <span><strong>${team.name}</strong><br><small>${team.shortName || ''}</small></span>
        </span>
      </td>
      <td>${team.country || '—'}</td>
      <td><input type="color" value="${team.color}" onchange="updateTeamColor('${team.id}', this.value)" style="cursor: pointer; width: 50px;"></td>
      <td>${drivers.filter(d => d.teamId === team.id).length}</td>
      <td>${team.stats?.points || 0}</td>
      <td class="table-actions">
        <button class="btn btn-secondary" onclick="editTeam('${team.id}')">✏️</button>
        <button class="btn btn-danger" onclick="deleteTeam('${team.id}')">🗑️</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

function openTeamModal() {
  editingId = null;
  editingType = 'team';
  document.getElementById('teamModalTitle').textContent = 'Добавить команду';
  document.getElementById('teamForm').reset();
  document.getElementById('teamModal').classList.add('active');
}

async function editTeam(id) {
  const teams = await DataManager.load('teams');
  const team = teams.find(t => t.id === id);
  if (!team) return;

  editingId = id;
  editingType = 'team';
  document.getElementById('teamModalTitle').textContent = 'Редактировать команду';
  document.getElementById('teamName').value = team.name;
  document.getElementById('teamShortName').value = team.shortName || '';
  document.getElementById('teamColor').value = team.color || '#00D4FF';
  document.getElementById('teamLogoUrl').value = team.logoUrl || '';
  document.getElementById('teamCountry').value = team.country || '';
  document.getElementById('teamModal').classList.add('active');
}

async function saveTeam(e) {
  e.preventDefault();
  const teams = await DataManager.load('teams');
  const drivers = await DataManager.load('drivers');
  const name = document.getElementById('teamName').value.trim();
  const shortName = document.getElementById('teamShortName').value.trim().toUpperCase();
  const color = document.getElementById('teamColor').value;
  const logoUrl = document.getElementById('teamLogoUrl').value.trim();
  const country = document.getElementById('teamCountry').value.trim();

  if (editingId) {
    const team = teams.find(t => t.id === editingId);
    if (team) {
      team.name = name;
      team.shortName = shortName;
      team.color = color;
      team.logoUrl = logoUrl;
      team.country = country;
      delete team.logo;
    }
  } else {
    teams.push({
      id: DataManager.generateId('team'),
      name,
      shortName,
      color,
      logoUrl,
      country,
      drivers: [],
      stats: { points: 0, wins: 0 }
    });
  }

  // синхронизировать составы команд
  teams.forEach(team => {
    team.drivers = drivers.filter(d => d.teamId === team.id).map(d => d.id);
  });

  await DataManager.save('teams', teams);
  closeModal('teamModal');
  await loadTeams();
}

async function updateTeamColor(teamId, color) {
  const teams = await DataManager.load('teams');
  const team = teams.find(t => t.id === teamId);
  if (team) {
    team.color = color;
    await DataManager.save('teams', teams);
  }
}

async function deleteTeam(id) {
  if (!confirm('Удалить команду?')) return;

  let teams = await DataManager.load('teams');
  teams = teams.filter(t => t.id !== id);
  await DataManager.save('teams', teams);
  await loadTeams();
}

/**
 * ========== КАЛЕНДАРЬ ==========
 */
async function loadCalendar() {
  const calendar = await DataManager.load('calendar');
  const tbody = document.querySelector('#calendarTable tbody');
  tbody.innerHTML = '';

  calendar.rounds?.forEach(round => {
    const row = document.createElement('tr');
    const date = new Date(round.date).toLocaleDateString('ru-RU');
    row.innerHTML = `
      <td>${round.round}</td>
      <td>${date}</td>
      <td>${round.track}</td>
      <td>${round.trackCountry || '—'}</td>
      <td class="mono">${round.timezone || 'UTC'}</td>
      <td>
        <select onchange="updateRoundStatus('${round.id}', this.value)" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: white; padding: 0.5rem;">
          <option value="upcoming" ${round.status === 'upcoming' ? 'selected' : ''}>Предстоит</option>
          <option value="live" ${round.status === 'live' ? 'selected' : ''}>Прямой эфир</option>
          <option value="finished" ${round.status === 'finished' ? 'selected' : ''}>Завершено</option>
        </select>
      </td>
      <td class="table-actions">
        <button class="btn btn-secondary" onclick="editRound('${round.id}')">✏️</button>
        <button class="btn btn-danger" onclick="deleteRound('${round.id}')">🗑️</button>
      </td>
    `;
    tbody.appendChild(row);
  });

  // Заполнить селект результатов
  const roundSelect = document.getElementById('roundSelect');
  roundSelect.innerHTML = '<option value="">-- Выберите этап --</option>';
  calendar.rounds?.forEach(round => {
    const option = document.createElement('option');
    option.value = round.id;
    option.textContent = `Этап ${round.round} - ${round.track}`;
    roundSelect.appendChild(option);
  });
}

function openRoundModal() {
  editingId = null;
  editingType = 'round';
  document.getElementById('roundModalTitle').textContent = 'Добавить этап';
  document.getElementById('roundForm').reset();
  document.getElementById('roundModal').classList.add('active');
}

async function editRound(id) {
  const calendar = await DataManager.load('calendar');
  const round = calendar.rounds?.find(r => r.id === id);
  if (!round) return;

  editingId = id;
  editingType = 'round';
  document.getElementById('roundModalTitle').textContent = 'Редактировать этап';
  document.getElementById('roundNumber').value = round.round;
  document.getElementById('roundTrack').value = round.track;
  document.getElementById('roundTrackCountry').value = round.trackCountry || '';
  document.getElementById('roundTimezone').value = round.timezone || 'UTC';
  document.getElementById('roundDate').value = round.date;
  document.getElementById('roundStatus').value = round.status;
  document.getElementById('roundModal').classList.add('active');
}

async function saveRound(e) {
  e.preventDefault();
  const calendar = await DataManager.load('calendar');
  if (!calendar.rounds) calendar.rounds = [];

  const roundData = {
    round: parseInt(document.getElementById('roundNumber').value, 10),
    track: document.getElementById('roundTrack').value.trim(),
    trackCountry: document.getElementById('roundTrackCountry').value.trim(),
    timezone: document.getElementById('roundTimezone').value.trim() || 'UTC',
    date: document.getElementById('roundDate').value,
    status: document.getElementById('roundStatus').value,
    class: 'F1'
  };

  if (editingId) {
    const round = calendar.rounds.find(r => r.id === editingId);
    if (round) Object.assign(round, roundData);
  } else {
    calendar.rounds.push({ id: DataManager.generateId('round'), ...roundData });
  }

  calendar.rounds.sort((a, b) => a.round - b.round);
  await DataManager.save('calendar', calendar);
  closeModal('roundModal');
  await loadCalendar();
}

async function updateRoundStatus(roundId, status) {
  const calendar = await DataManager.load('calendar');
  const round = calendar.rounds?.find(r => r.id === roundId);
  if (round) {
    round.status = status;
    await DataManager.save('calendar', calendar);
  }
}

async function deleteRound(id) {
  if (!confirm('Удалить этап?')) return;

  const calendar = await DataManager.load('calendar');
  calendar.rounds = calendar.rounds?.filter(r => r.id !== id) || [];
  await DataManager.save('calendar', calendar);
  await loadCalendar();
}

/**
 * ========== РЕЗУЛЬТАТЫ ==========
 */
async function loadRoundResults() {
  const roundId = document.getElementById('roundSelect').value;
  if (!roundId) return;

  const results = await DataManager.load('results');
  const drivers = await DataManager.load('drivers');
  const teams = await DataManager.load('teams');
  let roundResults = results[roundId] || [];
  if (roundResults.length === 0) {
    roundResults = drivers.map((driver, index) => ({
      driverId: driver.id,
      startPos: index + 1,
      finishPos: index + 1,
      points: 0,
      fastestLap: false
    }));
  }

  const tbody = document.querySelector('#resultsTable tbody');
  tbody.innerHTML = '';

  roundResults.forEach((result, index) => {
    const driver = drivers.find(d => d.id === result.driverId);
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${driverFullName(driver)}</td>
      <td>${teams.find(t => t.id === driver?.teamId)?.name || 'N/A'}</td>
      <td><input type="number" value="${result.startPos}" style="width: 60px;"></td>
      <td><input type="number" value="${result.finishPos}" style="width: 60px;"></td>
      <td><input type="number" value="${result.points}" style="width: 80px;"></td>
      <td><input type="checkbox" ${result.fastestLap ? 'checked' : ''}></td>
    `;
    row.dataset.driverId = result.driverId;
    tbody.appendChild(row);
  });
}

async function saveResults() {
  const roundId = document.getElementById('roundSelect').value;
  if (!roundId) {
    alert('Выберите этап');
    return;
  }

  const results = await DataManager.load('results');
  const rows = document.querySelectorAll('#resultsTable tbody tr');
  const roundResults = [];

  rows.forEach((row) => {
    const cells = row.querySelectorAll('td');
    roundResults.push({
      driverId: row.dataset.driverId,
      startPos: parseInt(cells[3].querySelector('input').value),
      finishPos: parseInt(cells[4].querySelector('input').value),
      points: parseInt(cells[5].querySelector('input').value),
      fastestLap: cells[6].querySelector('input').checked
    });
  });

  results[roundId] = roundResults;
  await DataManager.save('results', results);
  alert('✓ Результаты сохранены');
}

/**
 * ========== НОВОСТИ ==========
 */
async function loadNews() {
  const news = await DataManager.load('news');
  const tbody = document.querySelector('#newsTable tbody');
  tbody.innerHTML = '';

  news.forEach(article => {
    const date = new Date(article.date).toLocaleDateString('ru-RU');
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${article.title}</td>
      <td>${article.category}</td>
      <td>${date}</td>
      <td class="table-actions">
        <button class="btn btn-secondary" onclick="editNews('${article.id}')">✏️</button>
        <button class="btn btn-danger" onclick="deleteNews('${article.id}')">🗑️</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

function openNewsModal() {
  editingId = null;
  editingType = 'news';
  document.getElementById('newsModalTitle').textContent = 'Добавить новость';
  document.getElementById('newsForm').reset();
  document.getElementById('newsModal').classList.add('active');
}

async function editNews(id) {
  const news = await DataManager.load('news');
  const article = news.find(n => n.id === id);
  if (!article) return;

  editingId = id;
  editingType = 'news';
  document.getElementById('newsModalTitle').textContent = 'Редактировать новость';
  document.getElementById('newsTitle').value = article.title;
  document.getElementById('newsCategory').value = article.category;
  document.getElementById('newsContent').value = article.content;
  document.getElementById('newsImage').value = article.image || '';
  document.getElementById('newsModal').classList.add('active');
}

async function saveNews(e) {
  e.preventDefault();
  const news = await DataManager.load('news');
  const payload = {
    title: document.getElementById('newsTitle').value.trim(),
    category: document.getElementById('newsCategory').value.trim(),
    content: document.getElementById('newsContent').value.trim(),
    image: document.getElementById('newsImage').value.trim(),
    date: new Date().toISOString(),
    author: 'Администратор'
  };

  if (editingId) {
    const idx = news.findIndex(n => n.id === editingId);
    if (idx !== -1) news[idx] = { ...news[idx], ...payload };
  } else {
    news.push({ id: DataManager.generateId('news'), ...payload });
  }

  await DataManager.save('news', news);
  closeModal('newsModal');
  await loadNews();
}

async function deleteNews(id) {
  if (!confirm('Удалить новость?')) return;

  let news = await DataManager.load('news');
  news = news.filter(n => n.id !== id);
  await DataManager.save('news', news);
  await loadNews();
}

/**
 * ========== ТАБЛИЦА ЧЕМПИОНАТА ==========
 */
async function loadStandings() {
  const standings = await DataManager.load('standings');
  const drivers = await DataManager.load('drivers');
  const teams = await DataManager.load('teams');

  const tbody = document.querySelector('#driverStandingsTable tbody');
  tbody.innerHTML = '';

  standings.drivers?.forEach((standing, index) => {
    const driver = drivers.find(d => d.id === standing.driverId);
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${driverFullName(driver)}</td>
      <td>${teams.find(t => t.id === driver?.teamId)?.name || 'N/A'}</td>
      <td>${standing.points}</td>
      <td>${standing.wins}</td>
      <td>${standing.podiums}</td>
    `;
    tbody.appendChild(row);
  });
}

async function recalculateStandings() {
  const drivers = await DataManager.load('drivers');
  const results = await DataManager.load('results');

  const standings = {
    drivers: [],
    constructors: []
  };

  // Пересчитать личный зачёт
  drivers.forEach(driver => {
    let points = 0, wins = 0, podiums = 0;

    Object.values(results).forEach(roundResults => {
      const result = roundResults.find(r => r.driverId === driver.id);
      if (result) {
        points += result.points;
        if (result.finishPos === 1) wins++;
        if (result.finishPos <= 3) podiums++;
      }
    });

    standings.drivers.push({
      driverId: driver.id,
      points,
      wins,
      podiums
    });
  });

  standings.drivers.sort((a, b) => b.points - a.points);
  await DataManager.save('standings', standings);
  await loadStandings();
  alert('✓ Таблица пересчитана');
}

/**
 * ========== УТИЛИТЫ ==========
 */
async function updateStats() {
  const drivers = await DataManager.load('drivers');
  const teams = await DataManager.load('teams');
  const calendar = await DataManager.load('calendar');
  const news = await DataManager.load('news');

  document.getElementById('driversCount').textContent = drivers.length;
  document.getElementById('teamsCount').textContent = teams.length;
  document.getElementById('roundsCount').textContent = calendar.rounds?.length || 0;
  document.getElementById('newsCount').textContent = news.length;
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('active');
}

function updateSessionTimer() {
  const remaining = getSessionTimeRemaining();
  const mins = Math.max(0, remaining);
  const secs = Math.max(0, ((remaining % 1) * 60).toFixed(0));
  document.getElementById('sessionTime').textContent = `${mins}:${secs.toString().padStart(2, '0')}`;

  if (remaining <= 1) {
    alert('Сессия истекла. Пожалуйста, авторизуйтесь снова.');
    logout();
  }
}

async function exportData() {
  const allData = await DataManager.exportAllData();
  const json = JSON.stringify(allData, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `rfl-data-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

async function importData() {
  const file = document.getElementById('importFile').files[0];
  if (!file) {
    alert('Выберите файл');
    return;
  }

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const data = JSON.parse(e.target.result);
      await DataManager.importAll(data);
      await loadAllData();
      alert('✓ Данные импортированы');
    } catch (error) {
      alert('Ошибка импорта: ' + error.message);
    }
  };
  reader.readAsText(file);
}

function changePassword() {
  alert('Функция смены пароля требует перестройки auth.js. Свяжитесь с разработчиком.');
}
