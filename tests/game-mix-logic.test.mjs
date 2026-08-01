/**
 * Game Mix — Logik-Tests (TDD)
 *
 * Testet die Kategorisierung der Minispiele in zwei Mix-Gruppen:
 *  - 'action'  = die 10 neuen, tieferen Spiele (Action Mix)
 *  - 'classic' = die alten, simplen Spiele (Classic Mix)
 *
 * Reine Logik ohne Browser-Abhaengigkeiten.
 * Node 22 built-in test runner: node --test tests/game-mix-logic.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  getGameMix,
  groupGamesByMix,
  getMixLabel,
  MIXES,
} from '../js/game-mix-logic.js';

/* ---------- getGameMix: Spiel-ID -> Mix ---------- */

test('getGameMix: alle 10 Action-Spiele sind action', () => {
  const actionIds = ['towerstack', 'bubblepop', 'ninjaslash', 'colorcatch', 'dodgeball',
    'bouncesurvival', 'quickdraw', 'rhythmtap', 'coindash', 'tileflip'];
  for (const id of actionIds) {
    assert.equal(getGameMix(id), 'action', `${id} sollte action sein`);
  }
});

test('getGameMix: alte Spiele sind classic', () => {
  const classicIds = ['reaction', 'lavafloor', 'simon', 'math', 'tap', 'targets', 'stroop',
    'precision', 'bombcode', 'sequence', 'quizduel'];
  for (const id of classicIds) {
    assert.equal(getGameMix(id), 'classic', `${id} sollte classic sein`);
  }
});

test('getGameMix: unbekannte ID faellt sicher auf classic zurueck', () => {
  assert.equal(getGameMix('nicht-existierendes-spiel'), 'classic');
});

/* ---------- groupGamesByMix: Liste in zwei Gruppen teilen ---------- */

test('groupGamesByMix: teilt Liste in action und classic', () => {
  const list = [
    { id: 'reaction', name: 'Reaktion' },
    { id: 'towerstack', name: 'Tower Stack' },
    { id: 'math', name: 'Blitz-Rechnen' },
    { id: 'coindash', name: 'Coin Dash' },
  ];
  const groups = groupGamesByMix(list);
  assert.deepEqual(groups.action.map(g => g.id), ['towerstack', 'coindash']);
  assert.deepEqual(groups.classic.map(g => g.id), ['reaction', 'math']);
});

test('groupGamesByMix: erhaelt Reihenfolge innerhalb jeder Gruppe', () => {
  const list = [
    { id: 'a1', name: 'A1' }, { id: 'towerstack', name: 'TS' },
    { id: 'a2', name: 'A2' }, { id: 'coindash', name: 'CD' },
    { id: 'a3', name: 'A3' }, { id: 'tileflip', name: 'TF' },
  ];
  const groups = groupGamesByMix(list);
  assert.deepEqual(groups.action.map(g => g.id), ['towerstack', 'coindash', 'tileflip']);
  assert.deepEqual(groups.classic.map(g => g.id), ['a1', 'a2', 'a3']);
});

test('groupGamesByMix: leere Liste gibt leere Gruppen', () => {
  const groups = groupGamesByMix([]);
  assert.deepEqual(groups.action, []);
  assert.deepEqual(groups.classic, []);
});

test('groupGamesByMix: alle Spiele landen in genau einer Gruppe', () => {
  const list = [
    { id: 'reaction' }, { id: 'towerstack' }, { id: 'math' }, { id: 'bubblepop' },
  ];
  const groups = groupGamesByMix(list);
  const total = groups.action.length + groups.classic.length;
  assert.equal(total, list.length);
});

/* ---------- getMixLabel: Mix -> Anzeige-Name ---------- */

test('getMixLabel: action heisst Action Mix', () => {
  assert.equal(getMixLabel('action'), 'Action Mix');
});

test('getMixLabel: classic heisst Classic Mix', () => {
  assert.equal(getMixLabel('classic'), 'Classic Mix');
});

/* ---------- MIXES: stabile Reihenfolge fuer die UI ---------- */

test('MIXES: enthaelt action und classic in stabiler Reihenfolge', () => {
  assert.deepEqual(MIXES, ['action', 'classic']);
});
