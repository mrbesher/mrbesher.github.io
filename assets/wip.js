(function () {
'use strict';

var canvas = document.getElementById('wip-art');
var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
if (!canvas || !window.Garden) return;

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function seed() {
  var text = location.pathname + new Date().toISOString().slice(0, 10);
  var value = 2166136261;
  for (var i = 0; i < text.length; i++) {
    value ^= text.charCodeAt(i);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

var garden = Garden.create(canvas, {
  seed: seed(),
  color: function () { return cssVar('--indigo'); },
  alpha: function () {
    return matchMedia('(prefers-color-scheme: dark)').matches ? 0.58 : 0.48;
  },
  centerY: 0.43,
  radiusFactor: 0.36,
  onGeometry: function (geometry) {
    document.documentElement.style.setProperty('--garden-bottom', geometry.bottom + 'px');
  },
  reduced: reduceMotion.matches
});

if (!garden) return;
garden.start();

var resizeTimer;
window.addEventListener('resize', function () {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(garden.resize, 150);
});

reduceMotion.addEventListener('change', function (event) {
  garden.setReduced(event.matches);
});
})();
