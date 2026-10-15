(function () {
  var root = document.documentElement;

  // ---- theme ----
  function isDark() {
    var t = root.getAttribute('data-theme');
    if (t) return t === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  function toggleTheme() {
    var next = isDark() ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('theme', next); } catch (e) {}
  }
  document.getElementById('themeToggle').addEventListener('click', toggleTheme);
  document.getElementById('themeToggleMobile').addEventListener('click', toggleTheme);

  // ---- mobile menu ----
  var menuBtn = document.getElementById('menuBtn');
  var mobileMenu = document.getElementById('mobileMenu');
  menuBtn.addEventListener('click', function () {
    var open = mobileMenu.classList.toggle('open');
    menuBtn.setAttribute('aria-expanded', String(open));
  });
  mobileMenu.querySelectorAll('a').forEach(function (a) {
    a.addEventListener('click', function () {
      mobileMenu.classList.remove('open');
      menuBtn.setAttribute('aria-expanded', 'false');
    });
  });

  // ---- live Dhaka clock ----
  var clock = document.getElementById('clock');
  function tick() {
    clock.textContent = new Date().toLocaleTimeString('en-US', {
      timeZone: 'Asia/Dhaka', hour: 'numeric', minute: '2-digit'
    }).toLowerCase();
  }
  tick();
  setInterval(tick, 30000);
  document.getElementById('year').textContent = new Date().getFullYear();

  // ---- scroll progress + nav border + active link ----
  var progress = document.getElementById('progress');
  var nav = document.querySelector('.nav');
  var navLinks = document.querySelectorAll('.nav-links a');
  var sections = ['about', 'experience', 'work', 'expertise', 'connect'].map(function (id) {
    return document.getElementById(id);
  });
  function onScroll() {
    var h = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.width = (h > 0 ? (window.scrollY / h) * 100 : 0) + '%';
    nav.classList.toggle('scrolled', window.scrollY > 8);
    var current = '';
    sections.forEach(function (s) {
      if (s.getBoundingClientRect().top < window.innerHeight * 0.35) current = s.id;
    });
    navLinks.forEach(function (a) {
      a.classList.toggle('active', a.getAttribute('href') === '#' + current);
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // ---- reveal on scroll ----
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('in'); });
  }

  // ---- count-up stats ----
  function countUp(el) {
    var target = parseInt(el.getAttribute('data-count'), 10);
    var start = performance.now();
    var dur = 1400;
    function step(now) {
      var p = Math.min((now - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased).toLocaleString('en-US');
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  var counters = document.querySelectorAll('[data-count]');
  if ('IntersectionObserver' in window) {
    var co = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { countUp(e.target); co.unobserve(e.target); }
      });
    }, { threshold: 0.5 });
    counters.forEach(function (el) { co.observe(el); });
  } else {
    counters.forEach(function (el) { el.textContent = Number(el.getAttribute('data-count')).toLocaleString('en-US'); });
  }

  // ---- timeline accordion ----
  document.querySelectorAll('.tl-head').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var item = btn.parentElement;
      var open = item.classList.toggle('open');
      btn.setAttribute('aria-expanded', String(open));
    });
  });
})();
