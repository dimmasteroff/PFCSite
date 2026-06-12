(function () {
  function formatTime(date, timeZone) {
    try {
      return new Intl.DateTimeFormat('en-GB', {
        timeZone,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).format(date);
    } catch (error) {
      console.warn('Invalid timezone for PFC clock:', timeZone, error);
      return new Intl.DateTimeFormat('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).format(date);
    }
  }

  function getDriverDisplayName(driver) {
    return window.DataManager?.getDriverFullName
      ? DataManager.getDriverFullName(driver)
      : `${driver?.firstName || ''} ${driver?.lastName || ''}`.trim() || driver?.name || 'N/A';
  }

  function getTeamLogoUrl(team) {
    return window.DataManager?.getTeamLogoUrl
      ? DataManager.getTeamLogoUrl(team)
      : team?.logoUrl || team?.logo || '../logos/pfcnewlogo.png';
  }

  async function findNextRace() {
    if (!window.DataManager) return null;
    const calendar = await DataManager.load('calendar');
    const now = new Date();
    const upcoming = (calendar.rounds || [])
      .filter(round => round.status === 'upcoming')
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    return upcoming.find(round => new Date(round.date) >= now) || upcoming[0] || null;
  }

  async function startClocks() {
    const userClock = document.getElementById('userClock');
    const trackClock = document.getElementById('trackClock');
    const nextTrackName = document.getElementById('nextTrackName');
    if (!userClock || !trackClock || !nextTrackName) return;

    if (window.PFCClockTimer) {
      clearInterval(window.PFCClockTimer);
      window.PFCClockTimer = null;
    }

    const nextRace = await findNextRace();
    if (!nextRace) {
      nextTrackName.textContent = 'SEASON ENDED';
      trackClock.textContent = '--:--:--';
    } else {
      nextTrackName.textContent = `${nextRace.track || 'NEXT RACE'}${nextRace.trackCountry ? `, ${nextRace.trackCountry}` : ''}`.toUpperCase();
    }

    function tick() {
      const now = new Date();
      userClock.textContent = formatTime(now, undefined);
      if (nextRace) {
        trackClock.textContent = formatTime(now, nextRace.timezone || 'UTC');
      }
    }

    tick();
    window.PFCClockTimer = setInterval(tick, 1000);
  }

  window.PFCApp = {
    formatTime,
    findNextRace,
    startClocks,
    getDriverDisplayName,
    getTeamLogoUrl
  };

  document.addEventListener('DOMContentLoaded', startClocks);
  window.addEventListener('dataUpdated', event => {
    if (event.detail?.dataType === 'calendar') startClocks();
  });
})();
