/**
 * Minigame Session Paritaetstest (ESM vs Browser-IIFE)
 *
 * Stellt sicher dass beide Versionen identisches Verhalten liefern.
 */
import { test } from 'node:test';
import assert from 'node:assert';
import * as ESM from '../js/minigame-session.js';
import { validateMinigame as esmValidate } from '../js/minigame-contract.js';

// Browser-IIFE laden
import { readFileSync } from 'fs';
import { join } from 'path';
import vm from 'vm';

const browserCode = readFileSync(join(process.cwd(), 'js/minigame-session-browser.js'), 'utf8');
const sandbox = { window: {}, Math, JSON, Object, console };
vm.createContext(sandbox);
vm.runInContext(browserCode, sandbox);
const IIFE = sandbox.window.MinigameSession;

function runGame(adapter, inner) {
  const phases = [];
  let finishedScore = null;
  const game = adapter.createSessionAdapter(
    { id: 'reaction', name: 'Reaktion', play: inner },
    { onPhase: p => phases.push(p), onFinish: s => { finishedScore = s; } }
  );
  const calls = { setScore: [], finish: [] };
  const api = {
    stage: {},
    setScore(v) { calls.setScore.push(v); },
    finish(s) { calls.finish.push(s); },
    timeout() { return 1; },
    interval() { return 1; },
    frameLoop() { return 1; },
  };
  game.play(api.stage, api, { round: 1 });
  return { phases, finishedScore, calls, game };
}

test('Paritaet: Phasen-Reihenfolge identisch', () => {
  const inner = (stage, api) => { api.setScore(10); api.finish(25); };
  const a = runGame(ESM, inner);
  const b = runGame(IIFE, inner);
  assert.deepEqual(a.phases, b.phases);
  assert.deepEqual(a.phases, ['start', 'countdown', 'gameplay', 'winner', 'reward', 'exit']);
});

test('Paritaet: onFinish Score identisch', () => {
  const inner = (stage, api) => { api.finish(42); };
  assert.equal(runGame(ESM, inner).finishedScore, runGame(IIFE, inner).finishedScore);
});

test('Paritaet: doppelter finish ist no-op in beiden', () => {
  const inner = (stage, api) => { api.finish(5); api.finish(9); };
  const a = runGame(ESM, inner);
  const b = runGame(IIFE, inner);
  assert.deepEqual(a.calls.finish, b.calls.finish);
  assert.deepEqual(a.calls.finish, [5]);
});

test('Paritaet: validateMinigame identisch', () => {
  const good = { id: 'x', name: 'X', play() {} };
  const bad = { name: 'X', play() {} };
  assert.equal(esmValidate(good), IIFE.validateMinigame(good));
  assert.equal(esmValidate(bad), IIFE.validateMinigame(bad));
  assert.equal(esmValidate(null), IIFE.validateMinigame(null));
});

test('Paritaet: MINIGAME_PHASES identisch', () => {
  assert.deepEqual(ESM.MINIGAME_PHASES, IIFE.MINIGAME_PHASES);
});
