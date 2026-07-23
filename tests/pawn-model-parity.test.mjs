/**
 * Pawn-Model-Logic Paritaetstest (ESM vs Browser-IIFE)
 *
 * Stellt sicher, dass beide Versionen identische Ergebnisse liefern.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPawnParts as buildESM,
  getPartByName as getESM,
  PAWN_PART_NAMES as NAMES_ESM,
} from '../js/pawn-model-logic.js';

/* Browser-Version als IIFE in einem simulierten window laden */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const browserCode = readFileSync(join(__dirname, '..', 'js', 'pawn-model-logic-browser.js'), 'utf-8');

const window = {};
const sandbox = { window, Math, console, Date };
const vm = await import('node:vm');
const ctx = vm.createContext(sandbox);
vm.runInContext(browserCode, ctx);
const Browser = window.PawnModelLogic;

/* ---------- PAWN_PART_NAMES ---------- */

test('Paritaet: PAWN_PART_NAMES identisch', () => {
  assert.deepEqual([...NAMES_ESM], [...Browser.PAWN_PART_NAMES]);
});

/* ---------- buildPawnParts: identische Struktur ---------- */

test('Paritaet: buildPawnParts liefert gleiche Anzahl Teile', () => {
  const opts = { color: '#ff0000', index: 0 };
  const esm = buildESM(opts);
  const browser = Browser.buildPawnParts(opts);
  assert.equal(esm.length, browser.length);
});

test('Paritaet: jeder Teil hat gleiche Felder und Werte', () => {
  const opts = { color: '#ff0000', index: 1 };
  const esm = buildESM(opts);
  const browser = Browser.buildPawnParts(opts);
  for (let i = 0; i < esm.length; i++) {
    assert.equal(esm[i].name, browser[i].name, 'name mismatch at ' + i);
    assert.equal(esm[i].geometry, browser[i].geometry, 'geometry mismatch at ' + i);
    assert.deepEqual([...esm[i].size], [...browser[i].size], 'size mismatch at ' + i);
    assert.deepEqual([...esm[i].position], [...browser[i].position], 'position mismatch at ' + i);
    const rE = esm[i].rotation ? [...esm[i].rotation] : null;
    const rB = browser[i].rotation ? [...browser[i].rotation] : null;
    assert.deepEqual(rE, rB, 'rotation mismatch at ' + i);
    assert.equal(esm[i].colorMode, browser[i].colorMode, 'colorMode mismatch at ' + i);
    assert.deepEqual({ ...esm[i].material }, { ...browser[i].material }, 'material mismatch at ' + i);
    assert.equal(esm[i].phase, browser[i].phase, 'phase mismatch at ' + i);
  }
});

/* ---------- getPartByName ---------- */

test('Paritaet: getPartByName findet gleiche Teile', () => {
  const opts = { color: '#ff0000', index: 0 };
  const esm = buildESM(opts);
  const browser = Browser.buildPawnParts(opts);
  for (const name of NAMES_ESM) {
    const e = getESM(esm, name);
    const b = Browser.getPartByName(browser, name);
    assert.ok(e, 'ESM sollte ' + name + ' finden');
    assert.ok(b, 'Browser sollte ' + name + ' finden');
    assert.equal(e.name, b.name);
  }
});

test('Paritaet: getPartByName mit nicht-existentem Namen → null', () => {
  const esm = buildESM({ index: 0 });
  const browser = Browser.buildPawnParts({ index: 0 });
  assert.equal(getESM(esm, 'xxx'), null);
  assert.equal(Browser.getPartByName(browser, 'xxx'), null);
});

/* ---------- Verschiedene Indizes ---------- */

test('Paritaet: unterschiedlicher index erzeugt gleiche phase in beiden', () => {
  for (const idx of [0, 1, 2, 5, 7]) {
    const esm = buildESM({ index: idx });
    const browser = Browser.buildPawnParts({ index: idx });
    assert.equal(esm[0].phase, browser[0].phase, 'phase mismatch at index ' + idx);
  }
});

/* ---------- Default-Werte (kein opts) ---------- */

test('Paritaet: ohne opts gleiche Ergebnisse', () => {
  const esm = buildESM();
  const browser = Browser.buildPawnParts();
  assert.equal(esm.length, browser.length);
  for (let i = 0; i < esm.length; i++) {
    assert.deepEqual([...esm[i].position], [...browser[i].position], 'position default mismatch at ' + i);
  }
});