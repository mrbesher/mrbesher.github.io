/* mrbesher.com — the garden layer. Large, faint parametric flowers
   (two integer harmonics per axis, always closed curves) drawn once,
   then morphed point-by-point into the next form every 8s.
   rAF exists only during a morph. Idle CPU is zero. Daily seed. */
window.Garden = (function () {
'use strict';

var TWO_PI = 6.2832;
var N = 2200; /* points per curve */

function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    var t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function smootherstep(s) { return s * s * s * (s * (s * 6 - 15) + 10); }

function create(canvas, opts) {
  var ctx = canvas.getContext('2d');
  if (!ctx) return null;

  var rnd = mulberry32((opts.seed >>> 0) || 1);
  var W = 0, H = 0, CX = 0, CY = 0, R = 1;
  var current = null, scratch = new Float32Array(N * 2);
  var rafId = 0, morphTimer = 0, morphing = null;
  var baseRot = 0; /* accumulated rotation, baked in so morphs never snap */
  var reduced = !!opts.reduced;
  var nextMorphAt = 0;

  /* Always-beautiful families, all closed and symmetric:
     roses, hypotrochoids, epitrochoids, superformula flowers. */
  function newFlower() {
    var pick = rnd();
    if (pick < 0.32) {
      /* rose: r = cos(k*th + ph) modulated by a gentle inner wave */
      var k = 3 + Math.floor(rnd() * 6); /* petal count */
      return {
        kind: 'rose',
        k: k,
        ph: rnd() * TWO_PI,
        w: rnd() * 0.16,
        m: 2 * k - 1,
        mp: rnd() * TWO_PI
      };
    }
    if (pick < 0.58) {
      /* hypotrochoid (spirograph): coprime-ish small ints */
      var Rr = 5 + Math.floor(rnd() * 4);
      var rr = 1 + Math.floor(rnd() * 3);
      while (Rr % rr === 0 && rr > 1) rr = 1 + Math.floor(rnd() * 3);
      return { kind: 'hypo', R: Rr, r: rr, d: (0.45 + rnd() * 0.75) * rr };
    }
    if (pick < 0.78) {
      /* epitrochoid (outer spirograph) */
      var Re = 4 + Math.floor(rnd() * 4);
      var re = 1 + Math.floor(rnd() * 3);
      while (Re % re === 0 && re > 1) re = 1 + Math.floor(rnd() * 3);
      return { kind: 'epi', R: Re, r: re, d: (0.4 + rnd() * 0.65) * re };
    }
    /* superformula flower: rounded polygons and petaled stars */
    return {
      kind: 'super',
      m: 3 + Math.floor(rnd() * 6),
      n: 0.55 + rnd() * 1.15
    };
  }

  function points(f) {
    var pts = new Float32Array(N * 2);
    var period = f.kind === 'rose' || f.kind === 'super' ? TWO_PI : TWO_PI * f.r;
    var i, th, x, y, max = 0.0001;
    for (i = 0; i < N; i++) {
      th = i / N * period;
      if (f.kind === 'rose') {
        var rr2 = Math.cos(f.k * th + f.ph) * (1 + f.w * Math.sin(f.m * th + f.mp));
        x = rr2 * Math.cos(th);
        y = rr2 * Math.sin(th);
      } else if (f.kind === 'hypo') {
        var a = f.R - f.r, b = a / f.r;
        x = a * Math.cos(th) + f.d * Math.cos(b * th);
        y = a * Math.sin(th) - f.d * Math.sin(b * th);
      } else if (f.kind === 'epi') {
        var a2 = f.R + f.r, b2 = a2 / f.r;
        x = a2 * Math.cos(th) - f.d * Math.cos(b2 * th);
        y = a2 * Math.sin(th) - f.d * Math.sin(b2 * th);
      } else {
        var c = Math.abs(Math.cos(f.m * th / 4));
        var s = Math.abs(Math.sin(f.m * th / 4));
        var rs = Math.pow(Math.pow(c, f.n) + Math.pow(s, f.n), -1 / f.n);
        if (rs > 3) rs = 3;
        x = rs * Math.cos(th);
        y = rs * Math.sin(th);
      }
      pts[i * 2] = x;
      pts[i * 2 + 1] = y;
      var q = x * x + y * y;
      if (q > max) max = q;
    }
    var scale = R / Math.sqrt(max);
    for (i = 0; i < N * 2; i++) pts[i] *= scale;
    return pts;
  }

  function size() {
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    CX = W * 0.5;
    CY = H * (opts.centerY || 0.46);
    R = Math.min(W, H) * (opts.radiusFactor || 0.42);
    if (opts.onGeometry) {
      opts.onGeometry({ centerY: CY, radius: R, bottom: CY + R });
    }
  }

  function draw(pts, rot) {
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    ctx.translate(CX, CY);
    if (baseRot + rot) ctx.rotate(baseRot + rot);
    ctx.beginPath();
    ctx.moveTo(pts[0], pts[1]);
    for (var i = 1; i < N; i++) ctx.lineTo(pts[i * 2], pts[i * 2 + 1]);
    ctx.closePath();
    ctx.strokeStyle = opts.color();
    ctx.globalAlpha = opts.alpha();
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  function staticDraw() {
    if (current) draw(current, 0);
  }

  function scheduleMorphAt(at) {
    clearTimeout(morphTimer);
    nextMorphAt = at;
    if (reduced || document.hidden) return;
    morphTimer = setTimeout(beginMorph, Math.max(0, at - performance.now()));
  }

  function beginMorph() {
    if (reduced || document.hidden) return;
    nextMorphAt = performance.now() + 8000;
    var target = points(newFlower());
    var turn = (rnd() < 0.5 ? -1 : 1) * (0.15 + rnd() * 0.3) * Math.PI;
    var t0 = performance.now();
    var dur = 5000;
    morphing = { target: target, turn: turn };
    function step(t) {
      var s = (t - t0) / dur;
      if (s >= 1) {
        baseRot += turn;
        current = target;
        morphing = null;
        staticDraw();
        scheduleMorphAt(nextMorphAt);
        return;
      }
      var e = smootherstep(s);
      for (var i = 0; i < N * 2; i++) {
        scratch[i] = current[i] + (target[i] - current[i]) * e;
      }
      draw(scratch, turn * e);
      rafId = requestAnimationFrame(step);
    }
    rafId = requestAnimationFrame(step);
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      clearTimeout(morphTimer);
      cancelAnimationFrame(rafId);
      if (morphing) {
        /* settle on the target while hidden; no visible snap */
        baseRot += morphing.turn;
        current = morphing.target;
        morphing = null;
      }
    } else if (!reduced) {
      staticDraw();
      scheduleMorphAt(performance.now() + 8000);
    }
  });

  size();
  current = points(newFlower());

  return {
    start: function () {
      staticDraw();
      canvas.classList.add('on');
      scheduleMorphAt(performance.now() + 8000);
    },
    redraw: staticDraw,
    resize: function () {
      if (morphing) {
        cancelAnimationFrame(rafId);
        baseRot += morphing.turn;
        current = morphing.target;
        morphing = null;
        scheduleMorphAt(performance.now() + 8000);
      }
      size();
      current = pointsRefit();
      staticDraw();
      function pointsRefit() {
        /* refit current flower to the new R by regenerating from scratch is
           not possible (rng moved on); rescale the existing points instead */
        var max = 0.0001, i;
        for (i = 0; i < N; i++) {
          var r = current[i * 2] * current[i * 2] + current[i * 2 + 1] * current[i * 2 + 1];
          if (r > max) max = r;
        }
        var scale = R / Math.sqrt(max);
        var out = new Float32Array(N * 2);
        for (i = 0; i < N * 2; i++) out[i] = current[i] * scale;
        return out;
      }
    },
    setReduced: function (value) {
      reduced = !!value;
      clearTimeout(morphTimer);
      cancelAnimationFrame(rafId);
      if (morphing) {
        baseRot += morphing.turn;
        current = morphing.target;
        morphing = null;
      }
      staticDraw();
      if (!reduced && !document.hidden) {
        scheduleMorphAt(performance.now() + 8000);
      }
    }
  };
}

return { create: create };
})();
