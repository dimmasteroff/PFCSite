/**
 * PageSync.js - Синхронизация страниц при изменении данных в админ-панели
 * Автоматически обновляет содержимое страницы при изменении данных в localStorage
 */

class PageSync {
  static init() {
    // Слушать события обновления данных
    window.addEventListener('dataUpdated', (e) => {
      const { dataType, data, source } = e.detail;
      console.log(`🔄 Обновление ${dataType}:`, data);

      // Обновить соответствующие элементы страницы
      PageSync.updatePageContent(dataType, data);
    });
  }

  /**
   * Обновить содержимое страницы при изменении данных
   */
  static updatePageContent(dataType, data) {
    switch (dataType) {
      case 'drivers':
        PageSync.updateDriversDisplay(data);
        PageSync.updateStandingsDisplay();
        break;
      case 'teams':
        PageSync.updateTeamsDisplay(data);
        PageSync.updateStandingsDisplay();
        break;
      case 'calendar':
        PageSync.updateCalendarDisplay(data);
        break;
      case 'results':
        PageSync.updateResultsDisplay(data);
        PageSync.updateStandingsDisplay();
        break;
      case 'news':
        PageSync.updateNewsDisplay(data);
        break;
      case 'standings':
        PageSync.updateStandingsDisplay();
        break;
    }
  }

  /**
   * Обновить отображение пилотов
   */
  static async updateDriversDisplay(drivers) {
    const container = document.getElementById('driversContainer');
    if (!container) return;

    const teams = await DataManager.load('teams');
    const html = drivers.map(driver => {
      const team = teams.find(t => t.id === driver.teamId);
      return `
        <div class="driver-card">
          <div class="driver-number">${driver.number}</div>
          <img src="${driver.avatar}" alt="${DataManager.getDriverFullName(driver)}" class="driver-avatar">
          <div class="driver-info">
            <h3>${DataManager.getDriverFullName(driver)}</h3>
            <p class="team-name">${team?.name || 'N/A'}</p>
            <p class="nationality">🌍 ${driver.nationality}</p>
          </div>
          <div class="driver-stats">
            <div class="stat">
              <span class="stat-label">Очки</span>
              <span class="stat-value">${driver.stats?.points || 0}</span>
            </div>
            <div class="stat">
              <span class="stat-label">Побед</span>
              <span class="stat-value">${driver.stats?.wins || 0}</span>
            </div>
            <div class="stat">
              <span class="stat-label">Подиумы</span>
              <span class="stat-value">${driver.stats?.podiums || 0}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = html || '<p>Пилотов еще нет</p>';
    console.log('✅ Пилоты обновлены');
  }

  /**
   * Обновить отображение команд
   */
  static async updateTeamsDisplay(teams) {
    const container = document.getElementById('teamsContainer');
    if (!container) return;

    const drivers = await DataManager.load('drivers');
    const html = teams.map(team => {
      const teamDrivers = drivers.filter(d => d.teamId === team.id);
      return `
        <div class="team-card">
          <div class="team-header" style="background: ${team.color};">
            <img class="team-logo-thumb" src="${DataManager.getTeamLogoUrl(team)}" alt="${team.name}" onerror="this.src='../logos/pfcnewlogo.png'">
            <h3>${team.name}</h3>
            <span class="team-short">${team.shortName}${team.country ? ` · ${team.country}` : ''}</span>
          </div>
          <div class="team-body">
            <div class="team-drivers">
              <h4>Пилоты (${teamDrivers.length})</h4>
              ${teamDrivers.map(d => `<p>• ${DataManager.getDriverFullName(d)}</p>`).join('') || '<p>Нет пилотов</p>'}
            </div>
            <div class="team-stats">
              <div class="stat">
                <span>Очки</span>
                <strong>${team.stats?.points || 0}</strong>
              </div>
              <div class="stat">
                <span>Побед</span>
                <strong>${team.stats?.wins || 0}</strong>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = html || '<p>Команд еще нет</p>';
    console.log('✅ Команды обновлены');
  }

  /**
   * Обновить отображение календаря
   */
  static updateCalendarDisplay(calendar) {
    const container = document.getElementById('calendarContainer');
    if (!container) return;

    const rounds = calendar.rounds || [];
    const html = rounds.map(round => {
      const statusClass = `status-${round.status}`;
      const statusText = {
        upcoming: 'Предстоит',
        live: '🔴 ПРЯМОЙ ЭФИР',
        finished: 'Завершено'
      }[round.status] || 'N/A';

      return `
        <div class="timeline-item">
          <div class="timeline-marker"></div>
          <div class="timeline-content">
            <div class="round-number">Этап ${round.round}</div>
            <div class="track-name">🏁 ${round.track}</div>
            <div class="round-date">📅 ${new Date(round.date).toLocaleDateString('ru-RU')} · ${round.trackCountry || '—'} · ${round.timezone || 'UTC'}</div>
            <div class="round-status ${statusClass}">${statusText}</div>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = html || '<p>Календарь еще не заполнен</p>';
    console.log('✅ Календарь обновлен');
  }

  /**
   * Обновить отображение результатов
   */
  static async updateResultsDisplay(results) {
    const container = document.getElementById('resultsContainer');
    if (!container) return;

    const calendar = await DataManager.load('calendar');
    const drivers = await DataManager.load('drivers');
    const teams = await DataManager.load('teams');

    // Обновить селектор раундов
    const roundSelect = document.getElementById('roundSelect');
    if (roundSelect) {
      const currentValue = roundSelect.value;
      roundSelect.innerHTML = '<option value="">-- Выберите этап --</option>';
      calendar.rounds?.forEach(round => {
        const option = document.createElement('option');
        option.value = round.id;
        option.textContent = `Этап ${round.round} - ${round.track}`;
        roundSelect.appendChild(option);
      });
      roundSelect.value = currentValue;
    }

    console.log('✅ Результаты обновлены');
  }

  /**
   * Обновить отображение новостей
   */
  static updateNewsDisplay(news) {
    const container = document.getElementById('newsContainer');
    if (!container) return;

    const html = news.slice().reverse().map(article => `
      <div class="news-card">
        <div class="news-header">
          <div class="news-category">${article.category}</div>
          <div class="news-title">${article.title}</div>
          <div class="news-date">📅 ${new Date(article.date).toLocaleDateString('ru-RU')}</div>
        </div>
        <div class="news-body">
          <div class="news-content">${article.content.substring(0, 200)}...</div>
          <div class="read-more">Читать полностью →</div>
        </div>
      </div>
    `).join('');

    container.innerHTML = html || '<p>Новостей еще нет</p>';
    console.log('✅ Новости обновлены');
  }

  /**
   * Обновить отображение таблицы чемпионата
   */
  static async updateStandingsDisplay() {
    const drivers = await DataManager.load('drivers');
    const teams = await DataManager.load('teams');
    const standings = await DataManager.load('standings');

    // Обновить таблицу пилотов
    const driversTable = document.getElementById('driversStandingsTable');
    if (driversTable) {
      const tbody = driversTable.querySelector('tbody');
      if (tbody) {
        const rows = standings.drivers?.map((standing, idx) => {
          const driver = drivers.find(d => d.id === standing.driverId);
          const team = teams.find(t => t.id === driver?.teamId);
          return `
            <tr>
              <td>${idx + 1}</td>
              <td>${DataManager.getDriverFullName(driver)}</td>
              <td>${team?.name || 'N/A'}</td>
              <td><strong>${standing.points}</strong></td>
              <td>${standing.wins}</td>
              <td>${standing.podiums}</td>
            </tr>
          `;
        }).join('') || '<tr><td colspan="6">Нет данных</td></tr>';
        tbody.innerHTML = rows;
      }
    }

    // Обновить таблицу конструкторов
    const constructorsTable = document.getElementById('constructorsStandingsTable');
    if (constructorsTable) {
      const tbody = constructorsTable.querySelector('tbody');
      if (tbody) {
        const rows = standings.constructors?.map((standing, idx) => {
          const team = teams.find(t => t.id === standing.teamId);
          return `
            <tr>
              <td>${idx + 1}</td>
              <td>${team?.name || 'N/A'}</td>
              <td><strong>${standing.points}</strong></td>
              <td>${standing.wins}</td>
              <td>${standing.podiums}</td>
            </tr>
          `;
        }).join('') || '<tr><td colspan="5">Нет данных</td></tr>';
        tbody.innerHTML = rows;
      }
    }

    console.log('✅ Таблица обновлена');
  }
}

// Инициализировать синхронизацию при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
  PageSync.init();
});
