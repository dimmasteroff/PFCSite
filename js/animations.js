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

    var supportsIO = 'IntersectionObserver' in window;
    var io = supportsIO ? new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -5% 0px' }) : null;

    var revealIndex = 0;
    function register(el) {
      if (el.dataset.revealRegistered) return;
      el.dataset.revealRegistered = '1';
      el.style.transitionDelay = (Math.min(revealIndex % 8, 7) * 0.05) + 's';
      revealIndex++;
      if (io) io.observe(el);
      else el.classList.add('is-visible');
    }
    function scan(root) {
      if (root.nodeType !== 1) return;
      if (root.classList && root.classList.contains('animate-on-scroll')) register(root);
      if (root.querySelectorAll) {
        Array.prototype.forEach.call(root.querySelectorAll('.animate-on-scroll'), register);
      }
    }

    scan(document);

    // Reveal elements inserted later (e.g. cards rendered after async API fetch).
    if ('MutationObserver' in window) {
      new MutationObserver(function (mutations) {
        mutations.forEach(function (m) {
          Array.prototype.forEach.call(m.addedNodes, scan);
        });
      }).observe(document.body, { childList: true, subtree: true });
    }

    document.addEventListener('click', function (event) {
      var link = event.target.closest('a[href]');
      if (!link || link.target === '_blank' || link.href.indexOf(location.origin) !== 0 || link.getAttribute('href').charAt(0) === '#') return;
      progress.style.opacity = '1';
      progress.style.width = '100%';
    });
  });
})();
