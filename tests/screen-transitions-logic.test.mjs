/**
 * Screen Transitions — Logik-Tests (TDD RED phase)
 *
 * Testet die reine Logik ohne DOM-Abhaengigkeiten.
 * Node 22 built-in test runner: node --test tests/screen-transitions-logic.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SCREEN_ORDER,
  createTransitionState,
  getDirection,
  startTransition,
  setEnterPhase,
  setExitPhase,
  isTransitioning,
  getEnterPhase,
  getExitPhase,
  getScreenClasses,
  POPUP_TYPES,
  createPopupState,
  triggerPopup,
  setPopupPhase,
  isPopupActive,
  getPopupClasses,
} from '../js/screen-transitions-logic.js';

/* ---------- SCREEN_ORDER ---------- */

test('SCREEN_ORDER: enthaelt die Haupt-Screens in Reihenfolge', () => {
  assert.ok(SCREEN_ORDER.indexOf('start') >= 0);
  assert.ok(SCREEN_ORDER.indexOf('board') >= 0);
  assert.ok(SCREEN_ORDER.indexOf('duel-intro') >= 0);
  assert.ok(SCREEN_ORDER.indexOf('final') >= 0);
});

test('SCREEN_ORDER: start kommt vor board', () => {
  assert.ok(SCREEN_ORDER.indexOf('start') < SCREEN_ORDER.indexOf('board'));
});

/* ---------- createTransitionState ---------- */

test('createTransitionState: erzeugt State mit null currentScreen', () => {
  const s = createTransitionState();
  assert.equal(s.currentScreen, null);
  assert.equal(s.previousScreen, null);
  assert.equal(s.transitioning, false);
  assert.equal(s.activeTransition, null);
});

test('createTransitionState: default Dauer 400ms', () => {
  const s = createTransitionState();
  assert.equal(s.durationMs, 400);
  assert.equal(s.exitDurationMs, 300);
});

test('createTransitionState: optionale Parameter werden uebernommen', () => {
  const s = createTransitionState({ durationMs: 600, exitDurationMs: 500 });
  assert.equal(s.durationMs, 600);
  assert.equal(s.exitDurationMs, 500);
});

/* ---------- getDirection ---------- */

test('getDirection: forward wenn to nach from in SCREEN_ORDER', () => {
  assert.equal(getDirection('start', 'board'), 'forward');
  assert.equal(getDirection('board', 'duel-intro'), 'forward');
  assert.equal(getDirection('duel-intro', 'duel-play'), 'forward');
});

test('getDirection: backward wenn to vor from in SCREEN_ORDER', () => {
  assert.equal(getDirection('board', 'start'), 'backward');
  assert.equal(getDirection('duel-play', 'board'), 'backward');
  assert.equal(getDirection('final', 'start'), 'backward');
});

test('getDirection: lateral bei gleichen Screens', () => {
  assert.equal(getDirection('start', 'start'), 'lateral');
});

test('getDirection: lateral bei Screens nicht in SCREEN_ORDER', () => {
  assert.equal(getDirection('start', 'unknown-screen'), 'lateral');
  assert.equal(getDirection('unknown-screen', 'board'), 'lateral');
});

test('getDirection: lateral bei null oder leer', () => {
  assert.equal(getDirection(null, 'start'), 'lateral');
  assert.equal(getDirection('start', null), 'lateral');
  assert.equal(getDirection('', 'start'), 'lateral');
});

/* ---------- startTransition ---------- */

test('startTransition: erzeugt Transition-Objekt mit from/to/direction', () => {
  const s = createTransitionState();
  s.currentScreen = 'start';
  const t = startTransition(s, 'board');
  assert.equal(t.from, 'start');
  assert.equal(t.to, 'board');
  assert.equal(t.direction, 'forward');
  assert.equal(s.transitioning, true);
  assert.equal(s.currentScreen, 'board');
  assert.equal(s.previousScreen, 'start');
  assert.equal(s.activeTransition, t);
});

test('startTransition: von null aus = erste Navigation, direction lateral', () => {
  const s = createTransitionState();
  const t = startTransition(s, 'start');
  assert.equal(t.from, null);
  assert.equal(t.to, 'start');
  assert.equal(t.direction, 'lateral');
});

test('startTransition: backward direction korrekt', () => {
  const s = createTransitionState();
  s.currentScreen = 'duel-play';
  const t = startTransition(s, 'board');
  assert.equal(t.direction, 'backward');
});

test('startTransition: enterPhase ist before-enter', () => {
  const s = createTransitionState();
  s.currentScreen = 'start';
  const t = startTransition(s, 'board');
  assert.equal(t.enterPhase, 'before-enter');
});

test('startTransition: exitPhase ist before-exit wenn from existiert', () => {
  const s = createTransitionState();
  s.currentScreen = 'start';
  const t = startTransition(s, 'board');
  assert.equal(t.exitPhase, 'before-exit');
});

test('startTransition: exitPhase ist idle wenn kein from', () => {
  const s = createTransitionState();
  const t = startTransition(s, 'start');
  assert.equal(t.exitPhase, 'idle');
});

test('startTransition: enterDurationMs aus state', () => {
  const s = createTransitionState({ durationMs: 600, exitDurationMs: 500 });
  const t = startTransition(s, 'start');
  assert.equal(t.enterDurationMs, 600);
  assert.equal(t.exitDurationMs, 500);
});

/* ---------- setEnterPhase / getEnterPhase ---------- */

test('setEnterPhase: aktualisiert Enter-Phase', () => {
  const s = createTransitionState();
  s.currentScreen = 'start';
  startTransition(s, 'board');
  assert.equal(getEnterPhase(s), 'before-enter');
  setEnterPhase(s, 'enter');
  assert.equal(getEnterPhase(s), 'enter');
});

test('setEnterPhase: after-enter beendet die Transition', () => {
  const s = createTransitionState();
  s.currentScreen = 'start';
  startTransition(s, 'board');
  setEnterPhase(s, 'enter');
  setEnterPhase(s, 'after-enter');
  assert.equal(s.transitioning, false);
  assert.equal(s.activeTransition, null);
  assert.equal(getEnterPhase(s), 'idle');
});

test('setEnterPhase: no-op wenn keine aktive Transition', () => {
  const s = createTransitionState();
  setEnterPhase(s, 'enter');
  assert.equal(s.transitioning, false);
});

/* ---------- setExitPhase / getExitPhase ---------- */

test('setExitPhase: aktualisiert Exit-Phase', () => {
  const s = createTransitionState();
  s.currentScreen = 'start';
  startTransition(s, 'board');
  assert.equal(getExitPhase(s), 'before-exit');
  setExitPhase(s, 'exit');
  assert.equal(getExitPhase(s), 'exit');
});

test('setExitPhase: no-op wenn keine aktive Transition', () => {
  const s = createTransitionState();
  setExitPhase(s, 'exit');
  assert.equal(s.transitioning, false);
});

/* ---------- isTransitioning ---------- */

test('isTransitioning: false bei neuem State', () => {
  const s = createTransitionState();
  assert.equal(isTransitioning(s), false);
});

test('isTransitioning: true nach startTransition', () => {
  const s = createTransitionState();
  s.currentScreen = 'start';
  startTransition(s, 'board');
  assert.equal(isTransitioning(s), true);
});

test('isTransitioning: false nach after-enter', () => {
  const s = createTransitionState();
  s.currentScreen = 'start';
  startTransition(s, 'board');
  setEnterPhase(s, 'enter');
  setEnterPhase(s, 'after-enter');
  assert.equal(isTransitioning(s), false);
});

/* ---------- getScreenClasses ---------- */

test('getScreenClasses: ohne Transition gibt screen-active fuer currentScreen', () => {
  const s = createTransitionState();
  s.currentScreen = 'start';
  assert.deepEqual(getScreenClasses(s, 'start'), ['screen-active']);
  assert.deepEqual(getScreenClasses(s, 'board'), []);
});

test('getScreenClasses: entering-Classes fuer to-Screen', () => {
  const s = createTransitionState();
  s.currentScreen = 'start';
  startTransition(s, 'board');
  const classes = getScreenClasses(s, 'board');
  assert.ok(classes.includes('screen-entering'));
  assert.ok(classes.includes('screen-enter-forward'));
});

test('getScreenClasses: exit-Classes fuer from-Screen', () => {
  const s = createTransitionState();
  s.currentScreen = 'start';
  startTransition(s, 'board');
  const classes = getScreenClasses(s, 'start');
  assert.ok(classes.includes('screen-exiting'));
  assert.ok(classes.includes('screen-exit-forward'));
});

test('getScreenClasses: enter-active wenn enter-Phase aktiv', () => {
  const s = createTransitionState();
  s.currentScreen = 'start';
  startTransition(s, 'board');
  setEnterPhase(s, 'enter');
  const classes = getScreenClasses(s, 'board');
  assert.ok(classes.includes('screen-enter-active'));
});

test('getScreenClasses: backward direction Klassen', () => {
  const s = createTransitionState();
  s.currentScreen = 'duel-play';
  startTransition(s, 'board');
  const enterClasses = getScreenClasses(s, 'board');
  assert.ok(enterClasses.includes('screen-enter-backward'));
  const exitClasses = getScreenClasses(s, 'duel-play');
  assert.ok(exitClasses.includes('screen-exit-backward'));
});

test('getScreenClasses: lateral direction Klassen', () => {
  const s = createTransitionState();
  startTransition(s, 'start');
  const classes = getScreenClasses(s, 'start');
  assert.ok(classes.includes('screen-enter-lateral'));
});

/* ---------- POPUP_TYPES ---------- */

test('POPUP_TYPES: enthaelt scale-in, bounce-in, fade-in, slide-up', () => {
  assert.equal(POPUP_TYPES.scaleIn, 'scale-in');
  assert.equal(POPUP_TYPES.bounceIn, 'bounce-in');
  assert.equal(POPUP_TYPES.fadeIn, 'fade-in');
  assert.equal(POPUP_TYPES.slideUp, 'slide-up');
});

/* ---------- createPopupState ---------- */

test('createPopupState: default Werte', () => {
  const p = createPopupState();
  assert.equal(p.type, POPUP_TYPES.scaleIn);
  assert.equal(p.delayMs, 0);
  assert.equal(p.durationMs, 350);
  assert.equal(p.active, false);
  assert.equal(p.phase, 'idle');
});

test('createPopupState: optionale Parameter', () => {
  const p = createPopupState({ type: POPUP_TYPES.bounceIn, delayMs: 100, durationMs: 500 });
  assert.equal(p.type, POPUP_TYPES.bounceIn);
  assert.equal(p.delayMs, 100);
  assert.equal(p.durationMs, 500);
});

/* ---------- triggerPopup / isPopupActive ---------- */

test('triggerPopup: aktiviert Popup mit phase playing wenn kein delay', () => {
  const p = createPopupState();
  triggerPopup(p);
  assert.equal(p.active, true);
  assert.equal(p.phase, 'playing');
  assert.equal(isPopupActive(p), true);
});

test('triggerPopup: phase waiting wenn delay > 0', () => {
  const p = createPopupState({ delayMs: 200 });
  triggerPopup(p);
  assert.equal(p.phase, 'waiting');
});

test('isPopupActive: false bei neuem Popup', () => {
  const p = createPopupState();
  assert.equal(isPopupActive(p), false);
});

/* ---------- setPopupPhase ---------- */

test('setPopupPhase: playing nach waiting', () => {
  const p = createPopupState({ delayMs: 200 });
  triggerPopup(p);
  setPopupPhase(p, 'playing');
  assert.equal(p.phase, 'playing');
  assert.equal(p.active, true);
});

test('setPopupPhase: done beendet das Popup', () => {
  const p = createPopupState();
  triggerPopup(p);
  setPopupPhase(p, 'done');
  assert.equal(p.active, false);
  assert.equal(p.phase, 'done');
  assert.equal(isPopupActive(p), false);
});

test('setPopupPhase: no-op wenn nicht aktiv', () => {
  const p = createPopupState();
  setPopupPhase(p, 'playing');
  assert.equal(p.active, false);
  assert.equal(p.phase, 'idle');
});

/* ---------- getPopupClasses ---------- */

test('getPopupClasses: leer wenn nicht aktiv', () => {
  const p = createPopupState();
  assert.deepEqual(getPopupClasses(p), []);
});

test('getPopupClasses: enthaelt popup-effect und type-Klasse', () => {
  const p = createPopupState({ type: POPUP_TYPES.bounceIn });
  triggerPopup(p);
  const classes = getPopupClasses(p);
  assert.ok(classes.includes('popup-effect'));
  assert.ok(classes.includes('popup-bounce-in'));
});

test('getPopupClasses: popup-active wenn phase playing', () => {
  const p = createPopupState();
  triggerPopup(p);
  assert.ok(getPopupClasses(p).includes('popup-active'));
});

test('getPopupClasses: popup-waiting wenn phase waiting', () => {
  const p = createPopupState({ delayMs: 100 });
  triggerPopup(p);
  assert.ok(getPopupClasses(p).includes('popup-waiting'));
});

/* ---------- Kompletter Transition-Zyklus ---------- */

test('Kompletter Zyklus: start -> board -> duel-intro -> final', () => {
  const s = createTransitionState();
  // 1. Start -> Board
  let t = startTransition(s, 'start');
  assert.equal(t.direction, 'lateral');
  setEnterPhase(s, 'enter');
  setEnterPhase(s, 'after-enter');
  assert.equal(isTransitioning(s), false);

  // 2. Board -> duel-intro (forward)
  t = startTransition(s, 'board');
  assert.equal(t.direction, 'forward');
  setEnterPhase(s, 'enter');
  setEnterPhase(s, 'after-enter');

  // Re-check
  const s2 = createTransitionState();
  s2.currentScreen = 'board';
  t = startTransition(s2, 'duel-intro');
  assert.equal(t.direction, 'forward');
  setEnterPhase(s2, 'enter');
  setEnterPhase(s2, 'after-enter');

  // 3. duel-intro -> final (forward)
  const s3 = createTransitionState();
  s3.currentScreen = 'duel-intro';
  t = startTransition(s3, 'final');
  assert.equal(t.direction, 'forward');
});

test('Kompletter Zyklus: final -> start (backward reset)', () => {
  const s = createTransitionState();
  s.currentScreen = 'final';
  const t = startTransition(s, 'start');
  assert.equal(t.direction, 'backward');
  assert.equal(s.currentScreen, 'start');
  assert.equal(s.previousScreen, 'final');
});