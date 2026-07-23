/**
 * Particle Burst — Logik (Browser-Kompatibel, IIFE)
 *
 * Gleiche Logik wie particle-burst-logic.js (ESM),
 * aber als IIFE fuer <script>-Tag ohne Module-Loader.
 */
(function () {
  'use strict';

  /* ---------- Seedbarer PRNG (mulberry32) ---------- */
  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  var BURST_TYPES = {
    coin:  { count: 24, speed: 6,  life: 1.2, gravity: 5.0,  color: '#ffe66d' },
    star:  { count: 40, speed: 8,  life: 1.5, gravity: 3.0,  color: '#ff8b94' },
    duel:  { count: 30, speed: 7,  life: 1.3, gravity: 4.0,  color: '#ff6b6b' },
    dice:  { count: 20, speed: 5,  life: 1.0, gravity: 6.0,  color: '#4ecdc4' },
    move:  { count: 12, speed: 3,  life: 0.8, gravity: 2.0,  color: '#95e1d3' },
  };

  function createBurst(opts) {
    opts = opts || {};
    var x = opts.x || 0;
    var y = opts.y || 0;
    var z = opts.z || 0;

    var count = opts.count != null ? opts.count : 20;
    var speed = opts.speed != null ? opts.speed : 5;
    var life  = opts.life  != null ? opts.life  : 1.5;
    var gravity = opts.gravity != null ? opts.gravity : 3.0;
    var color = opts.color || '#ffe66d';

    if (opts.type && BURST_TYPES[opts.type]) {
      var t = BURST_TYPES[opts.type];
      count   = opts.count   != null ? opts.count   : t.count;
      speed   = opts.speed   != null ? opts.speed   : t.speed;
      life    = opts.life    != null ? opts.life    : t.life;
      gravity = opts.gravity != null ? opts.gravity : t.gravity;
      color   = opts.color    != null ? opts.color   : t.color;
    }

    if (count <= 0) return [];

    var rng = mulberry32(opts.seed != null ? opts.seed : (Math.random() * 1e9) | 0);
    var burst = [];

    for (var i = 0; i < count; i++) {
      var theta = rng() * Math.PI * 2;
      var phi = Math.acos(2 * rng() - 1);
      var sp = speed * (0.6 + rng() * 0.4);
      var vx = Math.sin(phi) * Math.cos(theta) * sp;
      var vy = Math.abs(Math.cos(phi)) * sp + speed * 0.3;
      var vz = Math.sin(phi) * Math.sin(theta) * sp;
      var pLife = life * (0.7 + rng() * 0.3);

      burst.push({
        x: x, y: y, z: z,
        vx: vx, vy: vy, vz: vz,
        life: pLife,
        maxLife: pLife,
        gravity: gravity,
        color: color,
      });
    }

    return burst;
  }

  function particleAlive(p) {
    return p.life > 0;
  }

  function aliveCount(burst) {
    var n = 0;
    for (var i = 0; i < burst.length; i++) {
      if (burst[i].life > 0) n++;
    }
    return n;
  }

  function updateBurst(burst, delta, opts) {
    if (!burst || burst.length === 0) return 0;
    var drag = opts && opts.drag != null ? opts.drag : 0;
    var dragFactor = Math.max(0, 1 - drag * delta);
    var alive = 0;

    for (var i = 0; i < burst.length; i++) {
      var p = burst[i];
      if (p.life <= 0) continue;

      p.life -= delta;
      if (p.life < 0) p.life = 0;

      p.vy -= p.gravity * delta;

      if (drag > 0) {
        p.vx *= dragFactor;
        p.vy *= dragFactor;
        p.vz *= dragFactor;
      }

      p.x += p.vx * delta;
      p.y += p.vy * delta;
      p.z += p.vz * delta;

      if (p.life > 0) alive++;
    }

    return alive;
  }

  /* ---------- Export ---------- */
  window.ParticleBurstLogic = {
    BURST_TYPES: BURST_TYPES,
    createBurst: createBurst,
    particleAlive: particleAlive,
    aliveCount: aliveCount,
    updateBurst: updateBurst,
  };
})();