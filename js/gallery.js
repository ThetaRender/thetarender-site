// ---------------------------------------------------------------
// THETA Render gallery - tabs + before/after compare sliders.
// Nothing to edit here: the pictures come from img/gallery/manifest.json,
// which is generated from the files in img/gallery (see img/gallery/README.txt).
// ---------------------------------------------------------------
(function () {
  var DIR = 'img/gallery/';
  var TABS = [
    { key: 'highlights', cat: null, label: 'Highlights' },
    { key: 'exterior', cat: 'ex', label: 'Exterior scenes' },
    { key: 'interior', cat: 'in', label: 'Interior scenes' },
    { key: 'objects', cat: 'ob', label: 'Objects' },
    { key: 'sketches', cat: 'sk', label: 'Sketches' }
  ];
  var host = document.getElementById('gallery');
  var bar = document.getElementById('gallery-tabs');
  if (!host) return;

  var lists = {}, shown = [], buttons = [], current = null;

  // ?v= changes when a picture's content changes, so browsers never show an old saved copy
  function src(name, v) { return DIR + encodeURIComponent(name) + (v ? '?v=' + v : ''); }

  function message(text) {
    if (bar) bar.hidden = true;
    host.innerHTML = '<p class="gmsg"></p>';
    host.firstChild.textContent = text;
  }

  // ---- one compare slider ------------------------------------------------
  function makeFigure(it) {
    var hasNight = !!it.c;
    var nightFirst = hasNight && !!it.nf;   // file named ..._N_... : show the night render first
    var f = document.createElement('figure');
    f.innerHTML =
      '<div class="cmp" tabindex="0" role="slider" aria-valuemin="0" aria-valuemax="100" aria-valuenow="50">' +
      '<img class="after" alt="THETA render" draggable="false" loading="lazy" decoding="async">' +
      '<div class="before"><img alt="Original image" draggable="false" loading="lazy" decoding="async"></div>' +
      '<div class="handle"></div><span class="tag l">Original</span><span class="tag r"></span></div>' +
      (hasNight ? '<div class="modes" role="group" aria-label="Lighting"></div>' : '') +
      (it.caption ? '<figcaption></figcaption>' : '');
    var cmp = f.querySelector('.cmp'), imgs = f.querySelectorAll('img'), tag = f.querySelector('.tag.r');
    var label = it.caption || 'example';
    cmp.setAttribute('aria-label', 'Compare original and render: ' + label);
    if (it.w && it.h) {
      cmp.style.setProperty('--ar', it.w + '/' + it.h);
      for (var i = 0; i < imgs.length; i++) { imgs[i].width = it.w; imgs[i].height = it.h; }
    } else {
      imgs[0].addEventListener('load', function () {
        cmp.style.setProperty('--ar', this.naturalWidth + '/' + this.naturalHeight);
      }, { once: true });
    }
    imgs[0].alt = 'THETA render' + (it.caption ? ' - ' + it.caption : '');
    imgs[1].alt = 'Original image' + (it.caption ? ' - ' + it.caption : '');
    imgs[0].src = src(nightFirst ? it.c : it.b, it.v);
    imgs[1].src = src(it.a, it.v);
    tag.textContent = hasNight ? (nightFirst ? 'Night' : 'Day') : 'THETA render';

    if (hasNight) {
      var box = f.querySelector('.modes');
      var modes = [['Day', it.b], ['Night', it.c]];
      if (nightFirst) modes.reverse();
      modes.forEach(function (m, k) {
        var b = document.createElement('button');
        b.type = 'button';
        b.textContent = m[0];
        b.setAttribute('aria-pressed', k === 0 ? 'true' : 'false');
        b.addEventListener('click', function () {
          // the other picture is only requested the first time its button is pressed
          if (imgs[0].getAttribute('src') !== src(m[1], it.v)) imgs[0].src = src(m[1], it.v);
          tag.textContent = m[0];
          box.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        });
        box.appendChild(b);
      });
    }
    if (it.caption) f.querySelector('figcaption').textContent = it.caption;
    bindSlider(cmp);
    return f;
  }

  function bindSlider(el) {
    var dragging = false;
    function put(p) {
      p = Math.max(0, Math.min(100, p));
      el.style.setProperty('--p', p + '%');
      el.setAttribute('aria-valuenow', Math.round(p));
    }
    function set(x) { var r = el.getBoundingClientRect(); put((x - r.left) / r.width * 100); }
    el.addEventListener('pointerdown', function (e) { dragging = true; try { el.setPointerCapture(e.pointerId); } catch (_) {} set(e.clientX); });
    el.addEventListener('pointermove', function (e) { if (dragging) set(e.clientX); });
    ['pointerup', 'pointercancel'].forEach(function (t) { el.addEventListener(t, function () { dragging = false; }); });
    el.addEventListener('keydown', function (e) {
      var v = parseFloat(el.getAttribute('aria-valuenow') || '50');
      if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') v -= 5;
      else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') v += 5;
      else if (e.key === 'Home') v = 0;
      else if (e.key === 'End') v = 100;
      else return;
      put(v);
      e.preventDefault();
    });
  }

  // ---- tabs --------------------------------------------------------------
  function select(i, focus, fromUser) {
    var t = shown[i];
    if (!t || t === current) { if (focus) buttons[i].focus(); return; }
    current = t;
    buttons.forEach(function (b, k) {
      var on = k === i;
      b.setAttribute('aria-selected', on ? 'true' : 'false');
      b.tabIndex = on ? 0 : -1;
    });
    if (focus) buttons[i].focus();
    host.setAttribute('aria-labelledby', 'gtab-' + t.key);
    // only the active tab's sliders exist on the page
    host.textContent = '';
    var frag = document.createDocumentFragment();
    lists[t.key].forEach(function (it) { frag.appendChild(makeFigure(it)); });
    host.appendChild(frag);
    if (fromUser) {
      try { history.replaceState(null, '', i === 0 ? location.pathname + location.search : '#' + t.key); } catch (_) {}
      // if the tab bar is stuck at the top of the window, bring the start of the list into view
      var r = bar.getBoundingClientRect();
      var head = bar.parentNode.querySelector('h2') || bar;
      if (head.getBoundingClientRect().top < 0 && r.top <= parseFloat(getComputedStyle(bar).top) + 1) {
        window.scrollBy(0, host.getBoundingClientRect().top - r.bottom - 12);
      }
    }
  }

  function fromHash() {
    var h = (location.hash || '').slice(1).toLowerCase();
    for (var i = 0; i < shown.length; i++) if (shown[i].key === h) return i;
    return -1;
  }

  function buildTabs() {
    bar.textContent = '';
    shown.forEach(function (t, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.id = 'gtab-' + t.key;
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-controls', 'gallery');
      b.setAttribute('aria-selected', 'false');
      b.tabIndex = -1;
      b.textContent = t.label;
      b.addEventListener('click', function () { select(i, false, true); });
      bar.appendChild(b);
      buttons.push(b);
    });
    bar.addEventListener('keydown', function (e) {
      var i = buttons.indexOf(document.activeElement);
      if (i < 0) return;
      var n = buttons.length, j;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') j = (i + 1) % n;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') j = (i - 1 + n) % n;
      else if (e.key === 'Home') j = 0;
      else if (e.key === 'End') j = n - 1;
      else return;
      e.preventDefault();
      select(j, true, true);
    });
    bar.hidden = false;
  }

  function start(data) {
    var items = (data && data.items) || [];
    var byId = {};
    TABS.forEach(function (t) { if (t.cat) lists[t.key] = []; });
    items.forEach(function (it) {
      byId[it.id] = it;
      TABS.forEach(function (t) { if (t.cat === it.cat) lists[t.key].push(it); });
    });
    TABS.forEach(function (t) { if (t.cat) lists[t.key].sort(function (a, b) { return a.n - b.n; }); });
    var hl = [];
    ((data && data.highlights) || []).forEach(function (id) { if (byId[id] && hl.indexOf(byId[id]) < 0) hl.push(byId[id]); });
    if (!hl.length) TABS.forEach(function (t) { if (t.cat && lists[t.key].length) hl.push(lists[t.key][0]); });
    lists.highlights = hl;

    shown = TABS.filter(function (t) { return lists[t.key].length; });
    if (!shown.length) { message('The examples will be added here soon.'); return; }
    buildTabs();
    var k = fromHash();
    select(k < 0 ? 0 : k, false, false);
    window.addEventListener('hashchange', function () { var j = fromHash(); if (j >= 0) select(j, false, false); });
  }

  if (location.protocol === 'file:') {
    message('The examples cannot be shown when the page is opened directly from a folder. Please use a local web server (see img/gallery/README.txt).');
    return;
  }
  fetch(DIR + 'manifest.json?v=' + Date.now(), { cache: 'no-store' })
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(start)
    .catch(function () { message('The examples could not be loaded at the moment. Please try again later.'); });
})();
