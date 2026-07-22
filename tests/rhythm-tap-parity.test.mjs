/**
 * Paritaets-Test: rhythm-tap-logic.js (ESM) vs rhythm-tap-logic-browser.js (IIFE)
 *
 * Stellt sicher dass beide Implementierungen identische Ergebnisse liefern.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as ESM from '../js/rhythm-tap-logic.js';

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const browserCode = readFileSync(join(__dirname, '..', 'js', 'rhythm-tap-logic-browser.js'), 'utf-8');

const window = {};
const sandbox = { window, Math, console };
const vm = await import('node:vm');
const ctx = vm.createContext(sandbox);
vm.runInContext(browserCode, ctx);
const IIFE = window.RhythmTapLogic;

const cases = [
  ['generateBeats', [60, 10, 1000]],
  ['generateBeats', [120, 3, 0]],
  ['getTimingWindow', [1000, 1000]],
  ['getTimingWindow', [1040, 1000]],
  ['getTimingWindow', [960, 1000]],
  ['getTimingWindow', [900, 1000]],
  ['getTimingWindow', [1100, 1000]],
  ['getComboMultiplier', [0]],
  ['getComboMultiplier', [1]],
  ['getComboMultiplier', [5]],
  ['getComboMultiplier', [10]],
  ['getComboMultiplier', [20]],
  ['getComboMultiplier', [50]],
];

for (const [fn, args] of cases) {
  test(`Paritaet: ${fn}(${args.map(a => JSON.stringify(a)).join(', ')})`, () => {
    const esmResult = ESM[fn](...args);
    const iifeResult = IIFE[fn](...args);
    assert.equal(JSON.stringify(esmResult), JSON.stringify(iifeResult));
  });
}

// State-basierte Paritaetstests
test('Paritaet: createRhythmState + judgeTap Sequenz', () => {
  const esmState = ESM.createRhythmState({ bpm: 120, beatCount: 10 });
  const iifeState = IIFE.createRhythmState({ bpm: 120, beatCount: 10 });

  const taps = [0, 500, 510, 1010, 1500, 2000, 2100, 2500, 3000, 3500];
  for (const t of taps) {
    const esmResult = ESM.judgeTap(esmState, t);
    const iifeResult = IIFE.judgeTap(iifeState, t);
    assert.equal(JSON.stringify(esmResult), JSON.stringify(iifeResult));
    assert.equal(JSON.stringify(esmState), JSON.stringify(iifeState));
  }
});

test('Paritaet: checkMissedBeats Sequenz', () => {
  const esmState = ESM.createRhythmState({ bpm: 120, beatCount: 10, maxMisses: 5 });
  const iifeState = IIFE.createRhythmState({ bpm: 120, beatCount: 10, maxMisses: 5 });

  const times = [100, 600, 700, 1200, 1500, 3000];
  for (const t of times) {
    const esmMissed = ESM.checkMissedBeats(esmState, t);
    const iifeMissed = IIFE.checkMissedBeats(iifeState, t);
    assert.equal(esmMissed, iifeMissed);
    assert.equal(JSON.stringify(esmState), JSON.stringify(iifeState));
  }
});