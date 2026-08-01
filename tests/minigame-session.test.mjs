/**
 * Minigame Session Adapter — Tests (TDD)
 *
 * Der Adapter bringt bestehende games.js-Spiele (play(stage, api)) auf den
 * Minispiel-Vertrag: er erzeugt pro Spiel eine Session-State-Machine
 * (start -> countdown -> gameplay -> winner -> reward -> exit) und leitet
 * setScore/finish durch deren Guards.
 *
 * Reine Logik ohne Browser-Abhaengigkeiten.
 * Node 22 built-in test runner: node --test tests/minigame-session.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createSessionAdapter,
  wrapPlay,
} from '../js/minigame-session.js';
import { validateMinigame } from '../js/minigame-contract.js';

/* ---------- Test-Helfer ---------- */

/** Fake-API wie createGameApi in player.js (ohne DOM). */
function fakeApi() {
  const calls = { setScore: [], finish: [], timeout: [], interval: [], frameLoop: [] };
  return {
    calls,
    stage: {},
    setScore(v) { calls.setScore.push(v); },
    finish(s) { calls.finish.push(s); },
    timeout(fn, ms) { calls.timeout.push(ms); return 1; },
    interval(fn, ms) { calls.interval.push(ms); return 1; },
    frameLoop(fn) { calls.frameLoop.push(true); return 1; },
  };
}

/** Fake-Spiel das einfach nur setScore/finish aufruft. */
function fakeGame(inner) {
  return {
    id: 'reaction',
    name: 'Reaktion',
    play(stage, api, runMeta) { inner && inner(stage, api, runMeta); },
  };
}

/* ---------- wrapPlay / createSessionAdapter: Grundverhalten ---------- */

test('createSessionAdapter: liefert ein vertragskonformes Spiel', () => {
  const g = createSessionAdapter(fakeGame(), {});
  assert.equal(validateMinigame(g), true);
  assert.equal(g.id, 'reaction');
  assert.equal(typeof g.play, 'function');
});

test('createSessionAdapter: ohne play wird abgelehnt', () => {
  assert.throws(() => createSessionAdapter({ id: 'x', name: 'X' }, {}), /play/i);
});

test('wrapPlay: leitet Phasen start->countdown->gameplay in Reihenfolge', () => {
  const phases = [];
  const g = createSessionAdapter(fakeGame(), { onPhase: p => phases.push(p) });
  const api = fakeApi();
  g.play(api.stage, api, { round: 1 });
  assert.deepEqual(phases, ['start', 'countdown', 'gameplay']);
});

test('wrapPlay: reicht setScore waehrend gameplay durch und aktualisiert Session', () => {
  let session = null;
  const g = createSessionAdapter(fakeGame((stage, api, runMeta) => {
    api.setScore(42);
  }), { onSession: s => { session = s; } });
  const api = fakeApi();
  g.play(api.stage, api, {});
  assert.deepEqual(api.calls.setScore, [42]);
  assert.equal(session.score(), 42);
});

test('wrapPlay: finish laeuft winner->reward->exit und ruft api.finish mit Score', () => {
  const phases = [];
  const g = createSessionAdapter(fakeGame((stage, api) => {
    api.finish(37);
  }), { onPhase: p => phases.push(p) });
  const api = fakeApi();
  g.play(api.stage, api, {});
  assert.deepEqual(phases, ['start', 'countdown', 'gameplay', 'winner', 'reward', 'exit']);
  assert.deepEqual(api.calls.finish, [37]);
});

test('wrapPlay: onFinish-Hook bekommt den End-Score', () => {
  let finishedScore = null;
  const g = createSessionAdapter(fakeGame((stage, api) => {
    api.finish(99);
  }), { onFinish: s => { finishedScore = s; } });
  g.play({}, fakeApi(), {});
  assert.equal(finishedScore, 99);
});

test('wrapPlay: doppelter finish-Aufruf ist ein No-Op (Guard)', () => {
  const g = createSessionAdapter(fakeGame((stage, api) => {
    api.finish(10);
    api.finish(20);
  }), {});
  const api = fakeApi();
  g.play(api.stage, api, {});
  assert.deepEqual(api.calls.finish, [10]);
});

test('wrapPlay: setScore nach finish wird ignoriert (Session-Guard)', () => {
  const g = createSessionAdapter(fakeGame((stage, api) => {
    api.finish(5);
    api.setScore(100);
  }), {});
  const api = fakeApi();
  g.play(api.stage, api, {});
  assert.deepEqual(api.calls.setScore, []);
  assert.deepEqual(api.calls.finish, [5]);
});

test('wrapPlay: runMeta wird an das innere Spiel durchgereicht', () => {
  let gotMeta = null;
  const g = createSessionAdapter(fakeGame((stage, api, runMeta) => {
    gotMeta = runMeta;
  }), {});
  const meta = { round: 3, variant: 'mix' };
  g.play({}, fakeApi(), meta);
  assert.deepEqual(gotMeta, meta);
});

test('wrapPlay: timeout/interval/frameLoop werden durchgereicht', () => {
  const g = createSessionAdapter(fakeGame((stage, api) => {
    api.timeout(() => {}, 500);
    api.interval(() => {}, 1000);
    api.frameLoop(() => true);
  }), {});
  const api = fakeApi();
  g.play(api.stage, api, {});
  assert.deepEqual(api.calls.timeout, [500]);
  assert.deepEqual(api.calls.interval, [1000]);
  assert.deepEqual(api.calls.frameLoop, [true]);
});

test('wrapPlay: wirft nicht, wenn das Spiel selbst eine Exception wirft', () => {
  const g = createSessionAdapter(fakeGame(() => {
    throw new Error('boom');
  }), {});
  assert.doesNotThrow(() => g.play({}, fakeApi(), {}));
});
