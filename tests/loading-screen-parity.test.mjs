/**
 * Paritaets-Test: loading-screen-logic.js (ESM) vs loading-screen-logic-browser.js (IIFE)
 *
 * Stellt sicher dass beide Implementierungen identische Ergebnisse liefern.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as ESM from '../js/loading-screen-logic.js';

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const browserCode = readFileSync(join(__dirname, '..', 'js', 'loading-screen-logic-browser.js'), 'utf-8');

const window = {};
const sandbox = { window, Math, console, Date };
const vm = await import('node:vm');
const ctx = vm.createContext(sandbox);
vm.runInContext(browserCode, ctx);
const IIFE = window.LoadingScreenLogic;

/* ---------- createLoadingState Paritaet ---------- */

test('Paritaet: createLoadingState default', () => {
  const esmState = ESM.createLoadingState();
  const iifeState = IIFE.createLoadingState();
  assert.equal(esmState.progress, iifeState.progress);
  assert.equal(esmState.complete, iifeState.complete);
  assert.equal(esmState.minDisplayMs, iifeState.minDisplayMs);
});

test('Paritaet: createLoadingState mit minDisplayMs', () => {
  const esmState = ESM.createLoadingState({ minDisplayMs: 1500 });
  const iifeState = IIFE.createLoadingState({ minDisplayMs: 1500 });
  assert.equal(esmState.minDisplayMs, iifeState.minDisplayMs);
});

/* ---------- updateProgress + getProgress Paritaet ---------- */

for (const val of [0, 25, 50, 75, 100, -10, 150]) {
  test(`Paritaet: updateProgress/getProgress mit ${val}`, () => {
    const esmState = ESM.createLoadingState();
    const iifeState = IIFE.createLoadingState();
    ESM.updateProgress(esmState, val);
    IIFE.updateProgress(iifeState, val);
    assert.equal(ESM.getProgress(esmState), IIFE.getProgress(iifeState));
    assert.equal(ESM.isComplete(esmState), IIFE.isComplete(iifeState));
  });
}

/* ---------- monoton steigend Paritaet ---------- */

test('Paritaet: Progress monoton steigend', () => {
  const esmState = ESM.createLoadingState();
  const iifeState = IIFE.createLoadingState();
  ESM.updateProgress(esmState, 60);
  IIFE.updateProgress(iifeState, 60);
  ESM.updateProgress(esmState, 30);
  IIFE.updateProgress(iifeState, 30);
  assert.equal(ESM.getProgress(esmState), IIFE.getProgress(iifeState));
});

/* ---------- setMinDisplayTime Paritaet ---------- */

test('Paritaet: setMinDisplayTime', () => {
  const esmState = ESM.createLoadingState();
  const iifeState = IIFE.createLoadingState();
  ESM.setMinDisplayTime(esmState, 2000);
  IIFE.setMinDisplayTime(iifeState, 2000);
  assert.equal(esmState.minDisplayMs, iifeState.minDisplayMs);
});

/* ---------- canDismiss Paritaet ---------- */

test('Paritaet: canDismiss false wenn nicht complete', () => {
  const esmState = ESM.createLoadingState({ minDisplayMs: 0 });
  const iifeState = IIFE.createLoadingState({ minDisplayMs: 0 });
  assert.equal(ESM.canDismiss(esmState), IIFE.canDismiss(iifeState));
});

test('Paritaet: canDismiss true wenn complete und minDisplay 0', () => {
  const esmState = ESM.createLoadingState({ minDisplayMs: 0 });
  const iifeState = IIFE.createLoadingState({ minDisplayMs: 0 });
  ESM.updateProgress(esmState, 100);
  IIFE.updateProgress(iifeState, 100);
  assert.equal(ESM.canDismiss(esmState), IIFE.canDismiss(iifeState));
});