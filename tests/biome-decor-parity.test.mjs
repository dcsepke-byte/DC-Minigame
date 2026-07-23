/**
 * Biome Decor Paritaetstest — ESM vs Browser-IIFE
 *
 * Stellt sicher dass beide Module identische Ergebnisse liefern.
 * Nutzt node:vm als Sandbox (kein jsdom noetig).
 */
import { test } from 'node:test';
import { strictEqual } from 'node:assert';
import {
  generateDecorSpecs as genESM,
  validateSpec as validateESM,
  getDecorCount as countESM,
  BIOME_DECOR_TYPES as typesESM,
} from '../js/biome-decor-logic.js';

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const browserCode = readFileSync(join(__dirname, '..', 'js', 'biome-decor-logic-browser.js'), 'utf-8');

const window = {};
const sandbox = { window, Math, console, Date, isNaN };
const vm = await import('node:vm');
const ctx = vm.createContext(sandbox);
vm.runInContext(browserCode, ctx);
const BDL = window.BiomeDecorLogic;

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

const ALL_BIOMES = ['village', 'desert', 'forest', 'mountain', 'swamp', 'ice', 'volcano', 'clouds'];

test('Paritaet: BIOME_DECOR_TYPES identisch', () => {
  strictEqual(typesESM.length, BDL.BIOME_DECOR_TYPES.length);
  typesESM.forEach((t, i) => {
    strictEqual(t, BDL.BIOME_DECOR_TYPES[i]);
  });
});

test('Paritaet: validateSpec identisch fuer gueltigen Spec', () => {
  const spec = { type: 'tree', x: 1, z: 2, y: 0.3 };
  strictEqual(validateESM(spec), BDL.validateSpec(spec));
});

test('Paritaet: validateSpec identisch fuer ungueltigen Spec', () => {
  const spec = { x: 1, z: 2, y: 0.3 };
  strictEqual(validateESM(spec), BDL.validateSpec(spec));
  strictEqual(false, BDL.validateSpec(spec));
});

ALL_BIOMES.forEach((biome) => {
  test(`Paritaet: generateDecorSpecs fuer ${biome} gleiche Laenge`, () => {
    const rng1 = mulberry32(42);
    const rng2 = mulberry32(42);
    const specsESM = genESM(biome, { x: 5, z: -3 }, rng1);
    const specsBDL = BDL.generateDecorSpecs(biome, { x: 5, z: -3 }, rng2);
    strictEqual(specsESM.length, specsBDL.length, `${biome}: ESM=${specsESM.length} BDL=${specsBDL.length}`);
  });

  test(`Paritaet: generateDecorSpecs fuer ${biome} gleiche Werte`, () => {
    const rng1 = mulberry32(42);
    const rng2 = mulberry32(42);
    const specsESM = genESM(biome, { x: 5, z: -3 }, rng1);
    const specsBDL = BDL.generateDecorSpecs(biome, { x: 5, z: -3 }, rng2);
    for (let i = 0; i < specsESM.length; i++) {
      strictEqual(specsESM[i].type, specsBDL[i].type, `${biome}[${i}].type`);
      strictEqual(specsESM[i].x, specsBDL[i].x, `${biome}[${i}].x`);
      strictEqual(specsESM[i].z, specsBDL[i].z, `${biome}[${i}].z`);
      strictEqual(specsESM[i].y, specsBDL[i].y, `${biome}[${i}].y`);
    }
  });
});

test('Paritaet: getDecorCount identisch fuer alle Biome', () => {
  ALL_BIOMES.forEach((biome) => {
    const rng1 = mulberry32(42);
    const rng2 = mulberry32(42);
    const c1 = countESM(biome, rng1);
    const c2 = BDL.getDecorCount(biome, rng2);
    strictEqual(c1, c2, `${biome}: ESM=${c1} BDL=${c2}`);
  });
});