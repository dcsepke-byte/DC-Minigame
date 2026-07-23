/**
 * Particle Burst — Spiellogik (browser-frei, testbar)
 *
 * Reine Logik fuer 3D-Partikel-Bursts bei Events:
 *  - Erzeugt Partikel-Arrays mit Position, Geschwindigkeit, Leben
 *  - Update mit Gravitation, Drag, Positions- und Lebens-Update
 *  - Burst-Typen mit vordefinierten Parametern (coin, star, duel, dice, move)
 *
 * Browser-Version: particle-burst-logic-browser.js (IIFE)
 * 3D-Integration: scene3d.js nutzt burst-Array als THREE.Points
 */

/* ---------- Seedbarer PRNG (mulberry32) ---------- */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- Burst-Typen ---------- */
export const BURST_TYPES = {
  coin:  { count: 24, speed: 6,  life: 1.2, gravity: 5.0,  color: '#ffe66d' },
  star:  { count: 40, speed: 8,  life: 1.5, gravity: 3.0,  color: '#ff8b94' },
  duel:  { count: 30, speed: 7,  life: 1.3, gravity: 4.0,  color: '#ff6b6b' },
  dice:  { count: 20, speed: 5,  life: 1.0, gravity: 6.0,  color: '#4ecdc4' },
  move:  { count: 12, speed: 3,  life: 0.8, gravity: 2.0,  color: '#95e1d3' },
};

/**
 * Erzeugt einen Partikel-Burst (Array von Partikel-Objekten).
 * @param {{x:number,y:number,z:number,count?:number,speed?:number,life?:number,gravity?:number,color?:string,seed?:number,type?:string}} opts
 * @returns {Array<{x:number,y:number,z:number,vx:number,vy:number,vz:number,life:number,maxLife:number,gravity:number,color:string}>}
 */
export function createBurst(opts) {
  const x = opts.x || 0;
  const y = opts.y || 0;
  const z = opts.z || 0;

  let count = opts.count != null ? opts.count : 20;
  let speed = opts.speed != null ? opts.speed : 5;
  let life  = opts.life  != null ? opts.life  : 1.5;
  let gravity = opts.gravity != null ? opts.gravity : 3.0;
  let color = opts.color || '#ffe66d';

  /* Typ-Parameter laden wenn type angegeben */
  if (opts.type && BURST_TYPES[opts.type]) {
    const t = BURST_TYPES[opts.type];
    count   = opts.count   != null ? opts.count   : t.count;
    speed   = opts.speed   != null ? opts.speed   : t.speed;
    life    = opts.life    != null ? opts.life    : t.life;
    gravity = opts.gravity != null ? opts.gravity : t.gravity;
    color   = opts.color    != null ? opts.color   : t.color;
  }

  if (count <= 0) return [];

  const rng = mulberry32(opts.seed != null ? opts.seed : (Math.random() * 1e9) | 0);
  const burst = [];

  for (let i = 0; i < count; i++) {
    /* Kugelkoordinaten fuer gleichmaessige Verteilung */
    const theta = rng() * Math.PI * 2;
    const phi = Math.acos(2 * rng() - 1);
    const sp = speed * (0.6 + rng() * 0.4);  /* Variation */
    const vx = Math.sin(phi) * Math.cos(theta) * sp;
    const vy = Math.abs(Math.cos(phi)) * sp + speed * 0.3;  /* Bias nach oben */
    const vz = Math.sin(phi) * Math.sin(theta) * sp;
    const pLife = life * (0.7 + rng() * 0.3);  /* Variation im Leben */

    burst.push({
      x, y, z,
      vx, vy, vz,
      life: pLife,
      maxLife: pLife,
      gravity,
      color,
    });
  }

  return burst;
}

/**
 * Prueft ob ein einzelner Partikel noch lebt.
 * @param {{life:number}} p
 * @returns {boolean}
 */
export function particleAlive(p) {
  return p.life > 0;
}

/**
 * Zaehlt lebende Partikel in einem Burst.
 * @param {Array<{life:number}>} burst
 * @returns {number}
 */
export function aliveCount(burst) {
  let n = 0;
  for (const p of burst) {
    if (p.life > 0) n++;
  }
  return n;
}

/**
 * Aktualisiert alle Partikel in einem Burst.
 * Bewegt sie, wendet Gravitation und Drag an, reduziert Leben.
 * Tote Partikel bleiben im Array (life=0), werden aber nicht bewegt.
 * @param {Array} burst - Partikel-Array (wird mutiert)
 * @param {number} delta - Zeit in Sekunden
 * @param {{drag?:number}} [opts] - Drag-Faktor (0=kein Drag, 1=sofort stop)
 * @returns {number} Anzahl lebender Partikel nach Update
 */
export function updateBurst(burst, delta, opts) {
  if (!burst || burst.length === 0) return 0;
  const drag = opts && opts.drag != null ? opts.drag : 0;
  const dragFactor = Math.max(0, 1 - drag * delta);
  let alive = 0;

  for (const p of burst) {
    if (p.life <= 0) continue;

    /* Leben reduzieren */
    p.life -= delta;
    if (p.life < 0) p.life = 0;

    /* Gravitation */
    p.vy -= p.gravity * delta;

    /* Drag */
    if (drag > 0) {
      p.vx *= dragFactor;
      p.vy *= dragFactor;
      p.vz *= dragFactor;
    }

    /* Position */
    p.x += p.vx * delta;
    p.y += p.vy * delta;
    p.z += p.vz * delta;

    if (p.life > 0) alive++;
  }

  return alive;
}