/* mrbesher.com — main.js: theme, marbled background, garden layer */
(function () {
'use strict';

var root = document.documentElement;
var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
var Marble = window.Marble;
var Garden = window.Garden;

function $(s) { return document.querySelector(s); }
function cssVar(n) { return getComputedStyle(root).getPropertyValue(n).trim(); }

var fmtYMD = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Helsinki', year: 'numeric', month: '2-digit', day: '2-digit' });
function helsinkiYMD(ms) {
  var p = fmtYMD.formatToParts(ms), o = {};
  for (var i = 0; i < p.length; i++) o[p[i].type] = +p[i].value;
  return o;
}

/* ================= theme ================= */

var metaTheme = $('#meta-theme-color');

function paintTheme(t, mode) {
  root.dataset.theme = t;
  root.dataset.themeMode = mode;
  if (metaTheme) metaTheme.setAttribute('content', t === 'dark' ? '#1B1A18' : '#F7F6F3');
  var control = $('#theme-toggle');
  if (control) {
    var state = mode === 'auto'
      ? 'automatic, currently ' + t
      : t + ', manual';
    var label = 'Theme: ' + state + '. Click to toggle. Press Escape for automatic.';
    control.setAttribute('aria-label', label);
    control.title = label;
  }
}
function coarseElevation() {
  var d = new Date();
  var doy = (d - Date.UTC(d.getUTCFullYear(), 0, 0)) / 864e5;
  var dec = -23.44 * Math.cos(2 * Math.PI * (doy + 10) / 365) * Math.PI / 180;
  var lat = 62.2426 * Math.PI / 180;
  var minsUTC = d.getUTCHours() * 60 + d.getUTCMinutes();
  var ha = (((minsUTC + 4 * 25.7473) % 1440) / 4 - 180) * Math.PI / 180;
  return Math.asin(Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(ha));
}
function autoTheme() {
  var next = coarseElevation() > -0.02 ? 'light' : 'dark';
  var changed = currentTheme() !== next;
  paintTheme(next, 'auto');
  return changed;
}
function currentTheme() { return root.dataset.theme === 'dark' ? 'dark' : 'light'; }

var pressAt = 0, longPressed = false;
var themeBtn = $('#theme-toggle');

themeBtn.addEventListener('pointerdown', function () { pressAt = Date.now(); longPressed = false; });
themeBtn.addEventListener('pointerup', function () {
  if (Date.now() - pressAt > 550) {
    longPressed = true;
    try { localStorage.removeItem('theme'); } catch (e) {}
    autoTheme();
    onThemeChanged();
  }
});
themeBtn.addEventListener('click', function () {
  if (longPressed) { longPressed = false; return; }
  var t = currentTheme() === 'dark' ? 'light' : 'dark';
  try { localStorage.setItem('theme', t); } catch (e) {}
  paintTheme(t, 'manual');
  onThemeChanged();
});
themeBtn.addEventListener('keydown', function (e) {
  if (e.key !== 'Escape') return;
  try { localStorage.removeItem('theme'); } catch (err) {}
  autoTheme();
  onThemeChanged();
});

function onThemeChanged() {
  renderBg();
  if (garden) garden.redraw();
}

/* ================= marbled background ================= */

var bgLayers = [$('#bg-1'), $('#bg-2')];
var bgActive = 0;
var bgTiles = {};
var bgRequest = 0;

function marbleSeed() {
  var d = helsinkiYMD(Date.now());
  return d.year * 10000 + d.month * 100 + d.day;
}
function marblePalette() {
  return {
    paper: cssVar('--paper'),
    veins: [cssVar('--ink1'), cssVar('--ink2'), cssVar('--ink3')],
    alphaScale: currentTheme() === 'dark' ? 0.9 : 1.05,
    width: window.innerWidth,
    height: window.innerHeight
  };
}
function bgKey() {
  return currentTheme() + '-' + marbleSeed() + '-' +
    Math.round(window.innerWidth / 100) + 'x' + Math.round(window.innerHeight / 100);
}

function fillBgLayer(el, tile) {
  el.width = window.innerWidth;
  el.height = window.innerHeight;
  var c = el.getContext('2d');
  if (!c) return;
  c.drawImage(tile, 0, 0, el.width, el.height);
}

function showBg(tile) {
  var next = 1 - bgActive;
  fillBgLayer(bgLayers[next], tile);
  bgLayers[next].classList.add('on');
  bgLayers[bgActive].classList.remove('on');
  bgActive = next;
}

function renderBg() {
  if (!Marble) return;
  var request = ++bgRequest;
  var key = bgKey();
  if (bgTiles[key]) { showBg(bgTiles[key]); return; }
  var capturedPalette = marblePalette();
  var work = function () {
    if (request !== bgRequest || key !== bgKey()) return;
    var tile = document.createElement('canvas');
    Marble.render(tile, marbleSeed(), capturedPalette);
    if (request !== bgRequest || key !== bgKey()) return;
    bgTiles = {};
    bgTiles[key] = tile;
    showBg(tile);
  };
  if ('requestIdleCallback' in window) {
    requestIdleCallback(work, { timeout: 500 });
  } else {
    setTimeout(work, 80);
  }
}

/* ================= garden layer ================= */

var garden = null;
var gardenCanvas = $('#garden');
if (Garden && gardenCanvas) {
  garden = Garden.create(gardenCanvas, {
    seed: marbleSeed() ^ 0x5bd1e995,
    color: function () { return cssVar('--indigo'); },
    alpha: function () { return root.dataset.theme === 'dark' ? 0.13 : 0.16; },
    reduced: reduceMotion.matches
  });
  reduceMotion.addEventListener('change', function (e) {
    if (garden) garden.setReduced(e.matches);
  });
}

/* ================= housekeeping ================= */

var resizeT;
window.addEventListener('resize', function () {
  clearTimeout(resizeT);
  resizeT = setTimeout(function () {
    renderBg();
    if (garden) garden.resize();
  }, 150);
});

var tickTimer = 0;
function scheduleTick() {
  clearTimeout(tickTimer);
  if (!document.hidden) tickTimer = setTimeout(tick, 60000);
}
function tick() {
  if (root.dataset.themeMode === 'auto' && autoTheme()) onThemeChanged();
  if (!bgTiles[bgKey()]) renderBg();
  scheduleTick();
}
document.addEventListener('visibilitychange', function () {
  if (document.hidden) {
    clearTimeout(tickTimer);
    return;
  }
  if (root.dataset.themeMode === 'auto' && autoTheme()) onThemeChanged();
  scheduleTick();
});

/* ================= init ================= */

if (root.dataset.themeMode === 'auto') autoTheme();
renderBg();
if (garden) garden.start();
scheduleTick();

})();
