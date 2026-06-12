(function () {
  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  ready(function () {
    var progress = document.createElement('div');
    progress.className = 'page-progress';
    document.body.prepend(progress);
    requestAnimationFrame(function () { progress.style.width = '72%'; });
    window.addEventListener('load', function () {
      progress.style.width = '100%';
      setTimeout(function () { progress.style.opacity = '0'; }, 350);
    });

    var header = document.querySelector('.site-header');
    if (header) {
      var updateHeader = function () { header.classList.toggle('is-stuck', window.scrollY > 8); };
      updateHeader();
      window.addEventListener('scroll', updateHeader, { passive: true });
    }

    var burger = document.querySelector('[data-menu-toggle]');
    if (burger) {
      burger.addEventListener('click', function () {
        var open = document.body.classList.toggle('menu-open');
        burger.setAttribute('aria-expanded', String(open));
      });
    }

    var animated = Array.prototype.slice.call(document.querySelectorAll('.animate-on-scroll'));
    animated.forEach(function (el, index) { el.style.transitionDelay = (Math.min(index % 8, 7) * 0.05) + 's'; });
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -5% 0px' });
      animated.forEach(function (el) { io.observe(el); });
    } else {
      animated.forEach(function (el) { el.classList.add('is-visible'); });
    }

    document.addEventListener('click', function (event) {
      var link = event.target.closest('a[href]');
      if (!link || link.target === '_blank' || link.href.indexOf(location.origin) !== 0 || link.getAttribute('href').charAt(0) === '#') return;
      progress.style.opacity = '1';
      progress.style.width = '100%';
    });
  });
})();
