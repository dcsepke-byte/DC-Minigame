/**
 * Paritaets-Test: tower-stack-logic.js (ESM) vs tower-stack-logic-browser.js (IIFE)
 *
 * Stellt sicher dass beide Implementierungen identische Ergebnisse liefern.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as ESM from '../js/tower-stack-logic.js';

// Browser-Version als Text laden und im globalen Scope ausfuehren
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const browserCode = readFileSync(join(__dirname, '..', 'js', 'tower-stack-logic-browser.js'), 'utf-8');

// Simuliere window-Objekt
const window = {};
const sandbox = { window, Math, console };
const vm = await import('node:vm');
const ctx = vm.createContext(sandbox);
vm.runInContext(browserCode, ctx);
const IIFE = window.TowerStackLogic;

const cases = [
  // [funcName, args]
  ['calculateOverlap', [{ x: 100, width: 80 }, { x: 100, width: 80 }]],
  ['calculateOverlap', [{ x: 100, width: 80 }, { x: 120, width: 80 }]],
  ['calculateOverlap', [{ x: 100, width: 80 }, { x: 80, width: 80 }]],
  ['calculateOverlap', [{ x: 100, width: 80 }, { x: 200, width: 80 }]],
  ['isMissed', [50]],
  ['isMissed', [0]],
  ['computePlacementScore', [0, 80]],
  ['computePlacementScore', [10, 80]],
  ['computePlacementScore', [70, 80]],
  ['nextBlockWidth', [80, 80]],
  ['nextBlockWidth', [80, 60]],
  ['nextBlockWidth', [80, 10]],
];

for (const [fn, args] of cases) {
  test(`Paritaet: ${fn}(${args.map(a => JSON.stringify(a)).join(', ')})`, () => {
    const esmResult = ESM[fn](...args);
    const iifeResult = IIFE[fn](...args);
    assert.equal(JSON.stringify(esmResult), JSON.stringify(iifeResult));
  });
}

// State-basierte Paritaetstests
test('Paritaet: createTowerState + placeBlock Sequenz', () => {
  const esmState = ESM.createTowerState({ baseWidth: 80, baseX: 100 });
  const iifeState = IIFE.createTowerState({ baseWidth: 80, baseX: 100 });

  const moves = [100, 110, 105, 130, 100, 95, 200];
  for (const x of moves) {
    const esmResult = ESM.placeBlock(esmState, x);
    const iifeResult = IIFE.placeBlock(iifeState, x);
    assert.equal(JSON.stringify(esmResult), JSON.stringify(iifeResult));
    assert.equal(JSON.stringify(esmState), JSON.stringify(iifeState));
  }
});