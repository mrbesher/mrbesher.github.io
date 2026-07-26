/* mrbesher.com — small suminagashi marks in the outer margins.
   Transparent everywhere else. Curated positions keep them away from both
   the content column and the central morph. Hidden on narrow viewports. */
window.Marble = (function () {
'use strict';

var TWO_PI = Math.PI * 2;

function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    var t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function parseColor(s) {
  s = (s || '').trim();
  if (s.charAt(0) === '#') {
    return [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
  }
  var m = s.match(/[\d.]+/g);
  return [+m[0], +m[1], +m[2]];
}

function rgba(c, a) {
  return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')';
}

function drawCluster(ctx, cx, cy, radius, rnd, inks, alphaScale) {
  var rings = 8 + Math.floor(rnd() * 5);
  var f1 = 2 + Math.floor(rnd() * 3);
  var f2 = 4 + Math.floor(rnd() * 4);
  var p1 = rnd() * TWO_PI;
  var p2 = rnd() * TWO_PI;
  var drift = radius * (0.03 + rnd() * 0.04);

  for (var ring = 0; ring < rings; ring++) {
    var base = radius * (0.2 + ring / rings * 0.8);
    var wob1 = radius * (0.025 + rnd() * 0.025);
    var wob2 = radius * (0.012 + rnd() * 0.018);
    var color = inks[ring % inks.length];
    var alpha = (0.075 + rnd() * 0.055) * alphaScale;

    ctx.beginPath();
    for (var i = 0; i <= 180; i++) {
      var th = i / 180 * TWO_PI;
      var r = base + wob1 * Math.sin(f1 * th + p1) + wob2 * Math.sin(f2 * th + p2);
      var x = cx + r * Math.cos(th) + drift * Math.sin(th + p2);
      var y = cy + r * Math.sin(th) + drift * Math.sin(2 * th + p1);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = rgba(color, alpha);
    ctx.lineWidth = 0.8 + rnd() * 0.45;
    ctx.stroke();
  }
}

function render(canvas, seed, palette) {
  var vw = palette.width || 1280;
  var vh = palette.height || 720;
  var scale = Math.min(1, 1280 / Math.max(vw, vh));
  var W = Math.max(320, Math.round(vw * scale));
  var H = Math.max(320, Math.round(vh * scale));
  canvas.width = W;
  canvas.height = H;

  var ctx = canvas.getContext('2d');
  if (!ctx || vw < 900) return;

  var rnd = mulberry32((seed >>> 0) || 1);
  var inks = palette.veins.map(parseColor);
  var alphaScale = palette.alphaScale || 1;
  var unit = Math.min(W, H);

  /* Safe zones: outside content (~17-83%) and central morph (~18-82%). */
  var marks = [
    [0.065, 0.17, 0.045],
    [0.085, 0.78, 0.06],
    [0.94, 0.2, 0.05],
    [0.925, 0.8, 0.06]
  ];

  for (var i = 0; i < marks.length; i++) {
    drawCluster(
      ctx,
      marks[i][0] * W,
      marks[i][1] * H,
      marks[i][2] * unit,
      rnd,
      inks,
      alphaScale
    );
  }
}

return { render: render };
})();
