/**
 * Paritaets-Test: screen-transitions-logic.js (ESM) vs screen-transitions-logic-browser.js (IIFE)
 *
 * Stellt sicher dass beide Implementierungen identische Ergebnisse liefern.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as ESM from '../js/screen-transitions-logic.js';

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const browserCode = readFileSync(join(__dirname, '..', 'js', 'screen-transitions-logic-browser.js'), 'utf-8');

const window = {};
const sandbox = { window, Math, console, Date };
const vm = await import('node:vm');
const ctx = vm.createContext(sandbox);
vm.runInContext(browserCode, ctx);
const IIFE = window.ScreenTransitions;

/* ---------- SCREEN_ORDER Paritaet ---------- */

test('Paritaet: SCREEN_ORDER identisch', () => {
  assert.equal(ESM.SCREEN_ORDER.length, IIFE.SCREEN_ORDER.length);
  for (let i = 0; i < ESM.SCREEN_ORDER.length; i++) {
    assert.equal(ESM.SCREEN_ORDER[i], IIFE.SCREEN_ORDER[i]);
  }
});

/* ---------- createTransitionState Paritaet ---------- */

test('Paritaet: createTransitionState default', () => {
  const e = ESM.createTransitionState();
  const i = IIFE.createTransitionState();
  assert.equal(e.currentScreen, i.currentScreen);
  assert.equal(e.transitioning, i.transitioning);
  assert.equal(e.durationMs, i.durationMs);
  assert.equal(e.exitDurationMs, i.exitDurationMs);
});

test('Paritaet: createTransitionState mit Optionen', () => {
  const e = ESM.createTransitionState({ durationMs: 600, exitDurationMs: 500 });
  const i = IIFE.createTransitionState({ durationMs: 600, exitDurationMs: 500 });
  assert.equal(e.durationMs, i.durationMs);
  assert.equal(e.exitDurationMs, i.exitDurationMs);
});

/* ---------- getDirection Paritaet ---------- */

for (const [from, to] of [
  ['start', 'board'], ['board', 'start'], ['start', 'start'],
  ['duel-play', 'final'], ['final', 'start'], [null, 'start'],
  ['start', null], ['unknown', 'board'], ['start', 'unknown'],
]) {
  test(`Paritaet: getDirection('${from}', '${to}')`, () => {
    assert.equal(ESM.getDirection(from, to), IIFE.getDirection(from, to));
  });
}

/* ---------- startTransition + Phasen Paritaet ---------- */

test('Paritaet: startTransition von start -> board', () => {
  const es = ESM.createTransitionState(); es.currentScreen = 'start';
  const is = IIFE.createTransitionState(); is.currentScreen = 'start';
  const et = ESM.startTransition(es, 'board');
  const it = IIFE.startTransition(is, 'board');
  assert.equal(et.from, it.from);
  assert.equal(et.to, it.to);
  assert.equal(et.direction, it.direction);
  assert.equal(et.enterPhase, it.enterPhase);
  assert.equal(et.exitPhase, it.exitPhase);
  assert.equal(es.transitioning, is.transitioning);
  assert.equal(es.currentScreen, is.currentScreen);
});

test('Paritaet: startTransition von null', () => {
  const es = ESM.createTransitionState();
  const is = IIFE.createTransitionState();
  const et = ESM.startTransition(es, 'start');
  const it = IIFE.startTransition(is, 'start');
  assert.equal(et.from, it.from);
  assert.equal(et.direction, it.direction);
  assert.equal(et.exitPhase, it.exitPhase);
});

test('Paritaet: setEnterPhase + getEnterPhase', () => {
  const es = ESM.createTransitionState(); es.currentScreen = 'start';
  const is = IIFE.createTransitionState(); is.currentScreen = 'start';
  ESM.startTransition(es, 'board');
  IIFE.startTransition(is, 'board');
  ESM.setEnterPhase(es, 'enter');
  IIFE.setEnterPhase(is, 'enter');
  assert.equal(ESM.getEnterPhase(es), IIFE.getEnterPhase(is));
  ESM.setEnterPhase(es, 'after-enter');
  IIFE.setEnterPhase(is, 'after-enter');
  assert.equal(es.transitioning, is.transitioning);
  assert.equal(ESM.getEnterPhase(es), IIFE.getEnterPhase(is));
});

test('Paritaet: setExitPhase + getExitPhase', () => {
  const es = ESM.createTransitionState(); es.currentScreen = 'start';
  const is = IIFE.createTransitionState(); is.currentScreen = 'start';
  ESM.startTransition(es, 'board');
  IIFE.startTransition(is, 'board');
  ESM.setExitPhase(es, 'exit');
  IIFE.setExitPhase(is, 'exit');
  assert.equal(ESM.getExitPhase(es), IIFE.getExitPhase(is));
});

/* ---------- getScreenClasses Paritaet ---------- */

for (const [from, to, screen] of [
  ['start', 'board', 'board'],
  ['start', 'board', 'start'],
  ['board', 'start', 'start'],
  ['duel-play', 'board', 'board'],
  [null, 'start', 'start'],
]) {
  test(`Paritaet: getScreenClasses ${from || 'null'} -> ${to}, screen=${screen}`, () => {
    const es = ESM.createTransitionState(); if (from) es.currentScreen = from;
    const is = IIFE.createTransitionState(); if (from) is.currentScreen = from;
    ESM.startTransition(es, to);
    IIFE.startTransition(is, to);
    const ec = ESM.getScreenClasses(es, screen);
    const ic = IIFE.getScreenClasses(is, screen);
    assert.equal(ec.length, ic.length);
    for (let k = 0; k < ec.length; k++) assert.equal(ec[k], ic[k]);
  });
}

/* ---------- POPUP_TYPES Paritaet ---------- */

test('Paritaet: POPUP_TYPES identisch', () => {
  assert.equal(ESM.POPUP_TYPES.scaleIn, IIFE.POPUP_TYPES.scaleIn);
  assert.equal(ESM.POPUP_TYPES.bounceIn, IIFE.POPUP_TYPES.bounceIn);
  assert.equal(ESM.POPUP_TYPES.fadeIn, IIFE.POPUP_TYPES.fadeIn);
  assert.equal(ESM.POPUP_TYPES.slideUp, IIFE.POPUP_TYPES.slideUp);
});

/* ---------- Popup Paritaet ---------- */

test('Paritaet: createPopupState default', () => {
  const e = ESM.createPopupState();
  const i = IIFE.createPopupState();
  assert.equal(e.type, i.type);
  assert.equal(e.delayMs, i.delayMs);
  assert.equal(e.durationMs, i.durationMs);
  assert.equal(e.active, i.active);
});

test('Paritaet: createPopupState mit Optionen', () => {
  const e = ESM.createPopupState({ type: ESM.POPUP_TYPES.bounceIn, delayMs: 100, durationMs: 500 });
  const i = IIFE.createPopupState({ type: IIFE.POPUP_TYPES.bounceIn, delayMs: 100, durationMs: 500 });
  assert.equal(e.type, i.type);
  assert.equal(e.delayMs, i.delayMs);
  assert.equal(e.durationMs, i.durationMs);
});

test('Paritaet: triggerPopup + isPopupActive', () => {
  const e = ESM.createPopupState();
  const i = IIFE.createPopupState();
  ESM.triggerPopup(e);
  IIFE.triggerPopup(i);
  assert.equal(e.active, i.active);
  assert.equal(e.phase, i.phase);
  assert.equal(ESM.isPopupActive(e), IIFE.isPopupActive(i));
});

test('Paritaet: triggerPopup mit delay', () => {
  const e = ESM.createPopupState({ delayMs: 200 });
  const i = IIFE.createPopupState({ delayMs: 200 });
  ESM.triggerPopup(e);
  IIFE.triggerPopup(i);
  assert.equal(e.phase, i.phase);
});

test('Paritaet: setPopupPhase done', () => {
  const e = ESM.createPopupState();
  const i = IIFE.createPopupState();
  ESM.triggerPopup(e);
  IIFE.triggerPopup(i);
  ESM.setPopupPhase(e, 'done');
  IIFE.setPopupPhase(i, 'done');
  assert.equal(e.active, i.active);
  assert.equal(ESM.isPopupActive(e), IIFE.isPopupActive(i));
});

test('Paritaet: getPopupClasses', () => {
  const e = ESM.createPopupState({ type: ESM.POPUP_TYPES.slideUp });
  const i = IIFE.createPopupState({ type: IIFE.POPUP_TYPES.slideUp });
  ESM.triggerPopup(e);
  IIFE.triggerPopup(i);
  const ec = ESM.getPopupClasses(e);
  const ic = IIFE.getPopupClasses(i);
  assert.equal(ec.length, ic.length);
  for (let k = 0; k < ec.length; k++) assert.equal(ec[k], ic[k]);
});