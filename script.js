(function () {
  'use strict';
  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var SVG = 'http://www.w3.org/2000/svg';

  /* ---------- theme ---------- */
  var themeBtn = document.getElementById('themeToggle');
  function isDark() {
    // dark is the default until a visitor picks light
    return root.getAttribute('data-theme') !== 'light';
  }
  function syncThemeLabel() {
    themeBtn.setAttribute('aria-label', isDark() ? 'Switch to light theme' : 'Switch to dark theme');
  }
  themeBtn.addEventListener('click', function () {
    var next = isDark() ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('theme', next); } catch (e) {}
    syncThemeLabel();
  });
  syncThemeLabel();

  /* ---------- mobile menu ---------- */
  var menuBtn = document.getElementById('menuBtn');
  var nav = document.getElementById('nav');
  function setMenu(open) {
    nav.classList.toggle('open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }
  menuBtn.addEventListener('click', function () { setMenu(!nav.classList.contains('open')); });
  nav.addEventListener('click', function (e) { if (e.target.tagName === 'A') setMenu(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });

  document.getElementById('year').textContent = new Date().getFullYear();

  /* ---------- current section in nav ---------- */
  var navLinks = nav.querySelectorAll('a');
  if ('IntersectionObserver' in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        navLinks.forEach(function (a) {
          a.setAttribute('aria-current', a.getAttribute('href') === '#' + en.target.id ? 'true' : 'false');
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    // 'top' (the hero) matches no link, so it clears the highlight
    ['top', 'work', 'path', 'about', 'toolkit', 'contact'].forEach(function (id) {
      spy.observe(document.getElementById(id));
    });
  }

  /* ---------- chromatogram (hero) ---------- */
  var trace = document.getElementById('trace');
  var CHANNELS = { A: '--nt-a', C: '--nt-c', G: '--nt-g', T: '--nt-t' };
  var traceDrawn = false;

  function seeded(seed) {
    return function () {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };
  }

  function drawTrace() {
    var W = trace.clientWidth, H = trace.clientHeight;
    if (!W) return;
    var rand = seeded(20220101);
    var spacing = W < 600 ? 16 : 19;
    var n = Math.floor(W / spacing);
    var bases = 'ACGT';
    // start codon first, stop codon last, random-but-stable bases between
    var seq = ['A', 'T', 'G'];
    while (seq.length < n - 3) seq.push(bases[Math.floor(rand() * 4)]);
    seq.push('T', 'A', 'G');

    var plotBottom = H - 26, plotTop = 8;
    var peaks = seq.map(function (b, i) {
      return { base: b, x: (i + 0.5) * (W / n), h: 0.55 + rand() * 0.45 };
    });
    var sigma = (W / n) * 0.32;

    var svg = document.createElementNS(SVG, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.setAttribute('preserveAspectRatio', 'none');

    Object.keys(CHANNELS).forEach(function (ch) {
      var d = '';
      for (var x = 0; x <= W; x += 2) {
        var v = 0;
        for (var i = 0; i < peaks.length; i++) {
          var dx = x - peaks[i].x;
          if (Math.abs(dx) > sigma * 4) continue;
          var amp = peaks[i].base === ch ? peaks[i].h : 0.035;
          v += amp * Math.exp(-(dx * dx) / (2 * sigma * sigma));
        }
        var y = plotBottom - v * (plotBottom - plotTop);
        d += (x === 0 ? 'M' : 'L') + x + ' ' + y.toFixed(1);
      }
      var p = document.createElementNS(SVG, 'path');
      p.setAttribute('d', d);
      p.setAttribute('pathLength', '1');
      p.setAttribute('class', 'peak' + (traceDrawn || reduceMotion ? '' : ' draw'));
      p.style.stroke = 'var(' + CHANNELS[ch] + ')';
      svg.appendChild(p);
    });

    peaks.forEach(function (pk) {
      var t = document.createElementNS(SVG, 'text');
      t.setAttribute('x', pk.x.toFixed(1));
      t.setAttribute('y', H - 7);
      t.setAttribute('class', 'call');
      t.style.fill = 'var(' + CHANNELS[pk.base] + ')';
      if (traceDrawn || reduceMotion) {
        t.style.animation = 'none';
        t.style.opacity = '1';
      } else {
        t.style.animationDelay = (0.3 + 2.0 * pk.x / W).toFixed(2) + 's';
      }
      t.textContent = pk.base;
      svg.appendChild(t);
    });

    trace.replaceChildren(svg);
    traceDrawn = true;
  }

  /* ---------- genome-browser timeline ---------- */
  var browser = document.getElementById('browser');
  var canvas = document.getElementById('browserCanvas');
  var detail = document.getElementById('detail');
  var listItems = Array.prototype.slice.call(document.querySelectorAll('#pathList > li'));

  var START_YEAR = 2018, END_YEAR = 2026;
  var TOTAL = (END_YEAR - START_YEAR + 1) * 12;
  var today = new Date();
  var NOW = Math.min(TOTAL - 1, (today.getFullYear() - START_YEAR) * 12 + today.getMonth());
  var TRACKS = [
    { id: 'science', name: 'Genomics and study' },
    { id: 'community', name: 'Open knowledge' },
    { id: 'venture', name: 'Ventures' }
  ];
  var LABEL_W = 150, LANE_H = 40;

  function monthIndex(s) {
    var p = s.split('-');
    return (parseInt(p[0], 10) - START_YEAR) * 12 + parseInt(p[1], 10) - 1;
  }

  var items = listItems.map(function (li, i) {
    var end = li.dataset.end;
    return {
      i: i,
      track: li.dataset.track,
      short: li.dataset.short,
      start: monthIndex(li.dataset.start),
      end: end ? monthIndex(end) : NOW,
      ongoing: !end,
      org: li.querySelector('.org').textContent,
      role: li.querySelector('.role').textContent,
      dates: li.querySelector('.dates').textContent,
      body: li.querySelector('.item-body').innerHTML
    };
  });

  var selected = items.findIndex(function (it) { return it.short === 'Invent Technologies'; });
  if (selected < 0) selected = 0;

  var measureCtx = document.createElement('canvas').getContext('2d');

  function renderDetail() {
    var it = items[selected];
    var track = TRACKS.filter(function (t) { return t.id === it.track; })[0];
    detail.setAttribute('data-track', it.track);
    detail.innerHTML =
      '<div><p class="d-dates"></p><p class="d-track"></p></div>' +
      '<div><h3></h3><p class="d-role"></p><div class="item-body"></div></div>';
    detail.querySelector('.d-dates').textContent = it.dates;
    detail.querySelector('.d-track').textContent = track.name;
    detail.querySelector('h3').textContent = it.org;
    detail.querySelector('.d-role').textContent = it.role;
    detail.querySelector('.item-body').innerHTML = it.body;
  }

  function select(i, focus) {
    selected = i;
    canvas.querySelectorAll('.bar').forEach(function (b) {
      b.setAttribute('aria-pressed', String(+b.dataset.i === i));
    });
    renderDetail();
    if (focus) {
      var b = canvas.querySelector('.bar[data-i="' + i + '"]');
      if (b) b.focus();
    }
  }

  function renderBrowser() {
    var cw = canvas.clientWidth;
    if (!cw) return;
    var tw = cw - LABEL_W;
    var px = function (m) { return (m / TOTAL) * tw; };
    var bodyStyle = getComputedStyle(document.body);
    measureCtx.font = (parseFloat(bodyStyle.fontSize) * 0.85) + 'px ' + bodyStyle.fontFamily;

    canvas.style.setProperty('--label-w', LABEL_W + 'px');
    canvas.innerHTML = '';

    // ruler
    var ruler = document.createElement('div');
    ruler.className = 'ruler';
    for (var y = START_YEAR; y <= END_YEAR; y++) {
      var tick = document.createElement('div');
      tick.className = 'tick';
      tick.style.left = px((y - START_YEAR) * 12) + 'px';
      tick.innerHTML = '<span>' + y + '</span>';
      ruler.appendChild(tick);
    }
    canvas.appendChild(ruler);

    TRACKS.forEach(function (track) {
      var row = document.createElement('div');
      row.className = 'track';
      row.setAttribute('data-track', track.id);
      row.setAttribute('role', 'group');
      row.setAttribute('aria-label', track.name);
      var label = document.createElement('div');
      label.className = 'track-label';
      label.textContent = track.name;
      var lanes = document.createElement('div');
      lanes.className = 'lanes';
      row.appendChild(label);
      row.appendChild(lanes);

      // pack bars into lanes, like stacked reads, so labels never collide
      var laneEnds = [];
      items.filter(function (it) { return it.track === track.id; })
        .sort(function (a, b) { return a.start - b.start; })
        .forEach(function (it) {
          var x = px(it.start);
          var w = Math.max(6, px(it.end + 1) - x);
          var lw = measureCtx.measureText(it.short).width;
          var inside = w >= lw + 22;
          // near the right edge, a label that won't fit inside goes on the bar's left
          var flip = !inside && x + w + 8 + lw > tw;
          var occupied = inside ? w : w + 8 + lw;
          var left = flip ? x - 8 - lw : x;
          var lane = laneEnds.findIndex(function (e) { return e + 10 <= left; });
          if (lane < 0) { lane = laneEnds.length; laneEnds.push(0); }
          laneEnds[lane] = left + occupied;

          var b = document.createElement('button');
          b.type = 'button';
          b.className = 'bar' + (inside ? '' : flip ? ' outside-left' : ' outside') + (it.ongoing ? ' ongoing' : '');
          b.dataset.i = it.i;
          b.style.left = left + 'px';
          b.style.top = (6 + lane * LANE_H) + 'px';
          b.style.width = Math.ceil(occupied) + 'px';
          b.style.setProperty('--w', w + 'px');
          b.setAttribute('aria-pressed', String(it.i === selected));
          b.setAttribute('aria-label', it.org + ', ' + it.role + ', ' + it.dates);
          b.innerHTML = '<span class="fill"></span><span class="lbl"></span>';
          b.querySelector('.lbl').textContent = it.short;
          b.addEventListener('click', function () { select(it.i); });
          lanes.appendChild(b);
        });
      lanes.style.height = (laneEnds.length * LANE_H + 4) + 'px';
      canvas.appendChild(row);
    });

    var now = document.createElement('div');
    now.className = 'now';
    now.style.left = (LABEL_W + px(NOW + 0.5)) + 'px';
    now.innerHTML = '<span>now</span>';
    canvas.appendChild(now);

    // arrow keys move between bars in time order
    canvas.onkeydown = function (e) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      var order = items.slice().sort(function (a, b) { return a.start - b.start || a.i - b.i; });
      var pos = order.findIndex(function (it) { return it.i === selected; });
      pos = e.key === 'ArrowRight' ? Math.min(order.length - 1, pos + 1) : Math.max(0, pos - 1);
      e.preventDefault();
      select(order[pos].i, true);
    };
  }

  browser.hidden = false;
  root.classList.add('has-browser');
  renderDetail();

  function renderAll() {
    drawTrace();
    renderBrowser();
  }

  var lastW = 0, resizeTimer;
  window.addEventListener('resize', function () {
    if (window.innerWidth === lastW) return;
    lastW = window.innerWidth;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(renderAll, 150);
  });

  lastW = window.innerWidth;
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(renderAll);
  } else {
    renderAll();
  }
})();
