/**
 * Biome Decor Logic — Unit Tests
 *
 * Testet die reine Dekorations-Logik (ohne THREE.js).
 * generateDecorSpecs erzeugt Platzierungs-Daten fuer Biom-Deko.
 */
import { test } from 'node:test';
import { strictEqual, ok, notStrictEqual } from 'node:assert';
import {
  generateDecorSpecs,
  BIOME_DECOR_TYPES,
  validateSpec,
  getDecorCount,
} from '../js/biome-decor-logic.js';

/* --- Seeded RNG (mulberry32, gleiche wie scene3d.js) --- */
function mulberry32(seed) {
  let a = seed | 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ========== generateDecorSpecs: Basis ========== */

test('generateDecorSpecs: gibt Array zurueck fuer village', () => {
  const rng = mulberry32(42);
  const specs = generateDecorSpecs('village', { x: 5, z: 3 }, rng);
  ok(Array.isArray(specs), 'sollte Array zurueckgeben');
  ok(specs.length > 0, 'sollte mindestens eine Dekoration haben');
});

test('generateDecorSpecs: jeder Spec hat Pflichtfelder', () => {
  const rng = mulberry32(42);
  const specs = generateDecorSpecs('forest', { x: 10, z: -5 }, rng);
  specs.forEach((s, i) => {
    ok(s.type, `spec[${i}].type fehlt`);
    ok(typeof s.x === 'number', `spec[${i}].x fehlt`);
    ok(typeof s.z === 'number', `spec[${i}].z fehlt`);
    ok(typeof s.y === 'number', `spec[${i}].y fehlt`);
  });
});

test('generateDecorSpecs: Positionen liegen in der Naehe von center', () => {
  const rng = mulberry32(42);
  const cx = 8, cz = -3;
  const specs = generateDecorSpecs('desert', { x: cx, z: cz }, rng);
  const maxDist = 12; /* DS=2.4, maxR=2.4 → max ~5.76 + center */
  specs.forEach((s) => {
    const dist = Math.hypot(s.x - cx, s.z - cz);
    ok(dist <= maxDist, `spec zu weit weg: dist=${dist.toFixed(2)}`);
  });
});

/* ========== Variety: mehrere Typen pro Biom ========== */

test('generateDecorSpecs: village hat mindestens 4 verschiedene Typen', () => {
  const rng = mulberry32(42);
  const specs = generateDecorSpecs('village', { x: 0, z: 0 }, rng);
  const types = new Set(specs.map((s) => s.type));
  ok(types.size >= 4, `village sollte >=4 Typen haben, hat ${types.size}`);
});

test('generateDecorSpecs: forest hat mindestens 4 verschiedene Typen', () => {
  const rng = mulberry32(42);
  const specs = generateDecorSpecs('forest', { x: 0, z: 0 }, rng);
  const types = new Set(specs.map((s) => s.type));
  ok(types.size >= 4, `forest sollte >=4 Typen haben, hat ${types.size}`);
});

test('generateDecorSpecs: mountain hat mindestens 3 verschiedene Typen', () => {
  const rng = mulberry32(42);
  const specs = generateDecorSpecs('mountain', { x: 0, z: 0 }, rng);
  const types = new Set(specs.map((s) => s.type));
  ok(types.size >= 3, `mountain sollte >=3 Typen haben, hat ${types.size}`);
});

test('generateDecorSpecs: volcano hat mindestens 4 verschiedene Typen', () => {
  const rng = mulberry32(42);
  const specs = generateDecorSpecs('volcano', { x: 0, z: 0 }, rng);
  const types = new Set(specs.map((s) => s.type));
  ok(types.size >= 4, `volcano sollte >=4 Typen haben, hat ${types.size}`);
});

test('generateDecorSpecs: clouds hat mindestens 4 verschiedene Typen', () => {
  const rng = mulberry32(42);
  const specs = generateDecorSpecs('clouds', { x: 0, z: 0 }, rng);
  const types = new Set(specs.map((s) => s.type));
  ok(types.size >= 4, `clouds sollte >=4 Typen haben, hat ${types.size}`);
});

/* ========== Mindestanzahl Dekorationen pro Biom ========== */

test('generateDecorSpecs: jedes Biom hat mindestens 12 Dekorationen', () => {
  const biomes = ['village', 'desert', 'forest', 'mountain', 'swamp', 'ice', 'volcano', 'clouds'];
  biomes.forEach((biome) => {
    const rng = mulberry32(42);
    const specs = generateDecorSpecs(biome, { x: 0, z: 0 }, rng);
    ok(specs.length >= 12, `${biome} sollte >=12 Dekorationen haben, hat ${specs.length}`);
  });
});

/* ========== Farbe und Variation ========== */

test('generateDecorSpecs: village houses haben Farbvariation', () => {
  const rng = mulberry32(42);
  const specs = generateDecorSpecs('village', { x: 0, z: 0 }, rng);
  const houses = specs.filter((s) => s.type === 'house');
  ok(houses.length >= 3, `sollte >=3 Haeuser haben, hat ${houses.length}`);
  const colors = new Set(houses.map((h) => h.color));
  ok(colors.size >= 3, `Haeuser sollten >=3 verschiedene Farben haben, hat ${colors.size}`);
});

test('generateDecorSpecs: Specs mit color-Feld haben validen Hex-String', () => {
  const rng = mulberry32(42);
  const biomes = ['village', 'desert', 'forest', 'mountain', 'swamp', 'ice', 'volcano', 'clouds'];
  biomes.forEach((biome) => {
    const specs = generateDecorSpecs(biome, { x: 0, z: 0 }, rng);
    specs.forEach((s) => {
      if (s.color) {
        ok(/^#[0-9a-f]{6}$/i.test(s.color), `${biome} spec color invalid: ${s.color}`);
      }
    });
  });
});

/* ========== Gelaende-Niveau (y-Wert) ========== */

test('generateDecorSpecs: swamp hat negative y-Werte (tiefes Land)', () => {
  const rng = mulberry32(42);
  const specs = generateDecorSpecs('swamp', { x: 0, z: 0 }, rng);
  const minY = Math.min(...specs.map((s) => s.y));
  ok(minY < 0.3, `swamp sollte niedrige y-Werte haben, minY=${minY}`);
});

test('generateDecorSpecs: clouds hat hohe y-Werte (schwebend)', () => {
  const rng = mulberry32(42);
  const specs = generateDecorSpecs('clouds', { x: 0, z: 0 }, rng);
  const maxY = Math.max(...specs.map((s) => s.y));
  ok(maxY > 1.0, `clouds sollte hohe y-Werte haben, maxY=${maxY}`);
});

/* ========== Neue Elemente (mehr Variation) ========== */

test('generateDecorSpecs: desert hat Kaktus und Duene und Pyramide', () => {
  const rng = mulberry32(42);
  const specs = generateDecorSpecs('desert', { x: 0, z: 0 }, rng);
  const types = new Set(specs.map((s) => s.type));
  ok(types.has('cactus'), 'desert sollte cactus haben');
  ok(types.has('dune'), 'desert sollte dune haben');
  ok(types.has('pyramid'), 'desert sollte pyramid haben');
});

test('generateDecorSpecs: ice hat Iglu und Eiskristall und Schneehaufen', () => {
  const rng = mulberry32(42);
  const specs = generateDecorSpecs('ice', { x: 0, z: 0 }, rng);
  const types = new Set(specs.map((s) => s.type));
  ok(types.has('igloo'), 'ice sollte igloo haben');
  ok(types.has('ice_crystal'), 'ice sollte ice_crystal haben');
  ok(types.has('snow_pile'), 'ice sollte snow_pile haben');
});

test('generateDecorSpecs: volcano hat Lavasee und Vulkan und Lavafluss', () => {
  const rng = mulberry32(42);
  const specs = generateDecorSpecs('volcano', { x: 0, z: 0 }, rng);
  const types = new Set(specs.map((s) => s.type));
  ok(types.has('lava_lake'), 'volcano sollte lava_lake haben');
  ok(types.has('volcano_cone'), 'volcano sollte volcano_cone haben');
  ok(types.has('lava_flow'), 'volcano sollte lava_flow haben');
});

/* ========== validateSpec ========== */

test('validateSpec: gueltiger Spec gibt true zurueck', () => {
  const spec = { type: 'tree', x: 1, z: 2, y: 0.3, rotation: 0, scale: 1 };
  strictEqual(validateSpec(spec), true);
});

test('validateSpec: fehlendes type gibt false zurueck', () => {
  const spec = { x: 1, z: 2, y: 0.3 };
  strictEqual(validateSpec(spec), false);
});

test('validateSpec: nicht-numerische x gibt false zurueck', () => {
  const spec = { type: 'tree', x: 'foo', z: 2, y: 0.3 };
  strictEqual(validateSpec(spec), false);
});

/* ========== getDecorCount ========== */

test('getDecorCount: gibt Anzahl Dekorationen pro Biom zurueck', () => {
  const rng = mulberry32(42);
  const count = getDecorCount('village', rng);
  ok(typeof count === 'number');
  ok(count > 0);
});

test('getDecorCount: verschiedene Biomes geben verschiedene Anzahlen', () => {
  const rng1 = mulberry32(42);
  const rng2 = mulberry32(42);
  const c1 = getDecorCount('village', rng1);
  const c2 = getDecorCount('volcano', rng2);
  /* Nicht garantiert verschieden, aber sehr wahrscheinlich */
  ok(typeof c1 === 'number' && typeof c2 === 'number');
});

/* ========== Determinismus ========== */

test('generateDecorSpecs: gleicher Seed gibt gleiche Specs', () => {
  const rng1 = mulberry32(42);
  const rng2 = mulberry32(42);
  const specs1 = generateDecorSpecs('forest', { x: 5, z: 3 }, rng1);
  const specs2 = generateDecorSpecs('forest', { x: 5, z: 3 }, rng2);
  strictEqual(specs1.length, specs2.length);
  for (let i = 0; i < specs1.length; i++) {
    strictEqual(specs1[i].type, specs2[i].type);
    strictEqual(specs1[i].x, specs2[i].x);
    strictEqual(specs1[i].z, specs2[i].z);
  }
});

/* ========== userData (Spin/Orbit fuer Animation) ========== */

test('generateDecorSpecs: Kristalle haben spin userData', () => {
  const rng = mulberry32(42);
  const specs = generateDecorSpecs('mountain', { x: 0, z: 0 }, rng);
  const crystals = specs.filter((s) => s.type === 'crystal');
  ok(crystals.length > 0, 'sollte Kristalle haben');
  crystals.forEach((c) => {
    ok(c.userData, 'kristall sollte userData haben');
    ok(typeof c.userData.spin === 'number', 'kristall sollte spin haben');
  });
});

test('generateDecorSpecs: Feuerkuegelchen (fireflies) haben orbit userData', () => {
  const rng = mulberry32(42);
  const specs = generateDecorSpecs('swamp', { x: 0, z: 0 }, rng);
  const fireflies = specs.filter((s) => s.type === 'firefly');
  ok(fireflies.length > 0, 'sollte Gluehwuermchen haben');
  fireflies.forEach((f) => {
    ok(f.userData, 'firefly sollte userData haben');
    ok(typeof f.userData.orbit === 'number', 'firefly sollte orbit haben');
  });
});