/**
 * DataManager - управление данными через PHP + MySQL бэкенд.
 * Чтение: api/get_data.php, запись: api/save_data.php (fetch API).
 * Интерфейс (load/save) сохранён, чтобы остальной фронтенд не менялся.
 */

class DataManager {
  // Префикс localStorage (используется только устаревшим clearAll)
  static PREFIX = 'rfl_data_';

  // Базовый путь к API. Страницы лежат в public/ и admin/ (на один
  // уровень ниже корня), поэтому путь относительный — '../api/'.
  static API_BASE = '../api/';

  /**
   * Загрузить данные с сервера.
   * @param {string} dataType - тип данных (drivers, teams, calendar, results, news, standings)
   * @returns {Array|Object} данные
   */
  static async load(dataType) {
    try {
      const res = await fetch(`${this.API_BASE}get_data.php?table=${encodeURIComponent(dataType)}`, {
        credentials: 'same-origin'
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return this.normalize(dataType, data);
    } catch (e) {
      console.error(`Ошибка загрузки ${dataType}:`, e);
      return this.normalize(dataType, this.getDefaultData(dataType));
    }
  }

  /**
   * Сохранить данные на сервере.
   * @param {string} dataType - тип данных
   * @param {Array|Object} data - данные для сохранения
   */
  static async save(dataType, data) {
    const normalizedData = this.normalize(dataType, data);
    try {
      const res = await fetch(`${this.API_BASE}save_data.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ table: dataType, data: normalizedData })
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok || result.status !== 'success') {
        throw new Error(result.message || `HTTP ${res.status}`);
      }
      console.log(`✓ ${dataType} сохранены`);

      // Уведомить страницу об изменении данных
      window.dispatchEvent(new CustomEvent('dataUpdated', {
        detail: { dataType, data: normalizedData, timestamp: Date.now() }
      }));

      return true;
    } catch (e) {
      console.error(`Ошибка сохранения ${dataType}:`, e);
      return false;
    }
  }

  /**
   * Получить данные по умолчанию для каждого типа
   */
  static getDefaultData(dataType) {
    const defaults = {
      drivers: [],
      teams: [],
      calendar: { season: '2026', rounds: [] },
      news: [],
      standings: {
        drivers: [],
        constructors: []
      },
      results: {}
    };
    return defaults[dataType] || [];
  }

  /**
   * Имя пилота для отображения на публичных страницах и в админке.
   */
  static getDriverFullName(driver) {
    if (!driver) return 'N/A';
    const firstName = (driver.firstName || '').trim();
    const lastName = (driver.lastName || '').trim();
    const fullName = `${firstName} ${lastName}`.trim();
    return fullName || driver.name || 'N/A';
  }

  /**
   * URL логотипа команды с обратной совместимостью для старого поля logo.
   */
  static getTeamLogoUrl(team) {
    return team?.logoUrl || team?.logo || '../logos/pfcnewlogo.png';
  }

  /**
   * Нормализовать данные к актуальной JSON-структуре.
   */
  static normalize(dataType, data) {
    if (dataType === 'drivers') {
      return (Array.isArray(data) ? data : []).map(driver => {
        const [fallbackFirst = '', ...rest] = String(driver.name || '').trim().split(/\s+/).filter(Boolean);
        const firstName = (driver.firstName || fallbackFirst || '').trim();
        const lastName = (driver.lastName || rest.join(' ') || '').trim();
        const normalized = {
          ...driver,
          firstName,
          lastName,
          number: driver.number,
          teamId: driver.teamId || '',
          class: driver.class || 'F1',
          avatar: driver.avatar || driver.photo || `https://via.placeholder.com/150?text=${encodeURIComponent((firstName || 'PFC').slice(0, 3))}`,
          stats: {
            points: 0,
            wins: 0,
            podiums: 0,
            fastestLaps: 0,
            ...(driver.stats || {})
          }
        };
        delete normalized.name;
        delete normalized.photo;
        return normalized;
      });
    }

    if (dataType === 'teams') {
      return (Array.isArray(data) ? data : []).map(team => {
        const normalized = {
          ...team,
          logoUrl: team.logoUrl || team.logo || '',
          country: team.country || '',
          drivers: Array.isArray(team.drivers) ? team.drivers : [],
          stats: {
            points: 0,
            wins: 0,
            podiums: 0,
            ...(team.stats || {})
          }
        };
        delete normalized.logo;
        return normalized;
      });
    }

    if (dataType === 'calendar') {
      const calendar = data && typeof data === 'object' ? data : { season: '2026', rounds: [] };
      return {
        ...calendar,
        season: calendar.season || '2026',
        rounds: (calendar.rounds || []).map(round => ({
          ...round,
          trackCountry: round.trackCountry || '',
          timezone: round.timezone || 'UTC',
          class: round.class || 'F1',
          streamLink: round.streamLink || ''
        }))
      };
    }

    return data;
  }

  /**
   * Экспортировать все данные в JSON
   * @returns {Object} все данные
   */
  static async exportAll() {
    return {
      drivers: await this.load('drivers'),
      teams: await this.load('teams'),
      calendar: await this.load('calendar'),
      news: await this.load('news'),
      standings: await this.load('standings'),
      results: await this.load('results'),
      exportedAt: new Date().toISOString()
    };
  }

  /**
   * Импортировать данные из JSON
   * @param {Object} data - данные для импорта
   */
  static async exportAllData() {
    return this.exportAll();
  }

  static async importAll(data) {
    try {
      if (data.drivers) await this.save('drivers', data.drivers);
      if (data.teams) await this.save('teams', data.teams);
      if (data.calendar) await this.save('calendar', data.calendar);
      if (data.news) await this.save('news', data.news);
      if (data.standings) await this.save('standings', data.standings);
      if (data.results) await this.save('results', data.results);

      console.log('✓ Все данные импортированы');
      return true;
    } catch (e) {
      console.error('Ошибка импорта:', e);
      return false;
    }
  }

  /**
   * Очистить все данные
   */
  static clearAll() {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(this.PREFIX));
    keys.forEach(key => localStorage.removeItem(key));
    console.log('✓ Все данные очищены');
  }

  /**
   * Генерировать уникальный ID
   */
  static generateId(prefix = 'id') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
