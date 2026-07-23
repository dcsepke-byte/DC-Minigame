/**
 * Pawn-Model-Logic Tests (TDD)
 *
 * Testet die reine Logik fuer den Charakter-Modell-Aufbau:
 * - buildPawnParts: liefert Bauteil-Definitionen (ohne THREE.js)
 * - getPartByName: Hilfsfunktion zum Finden einzelner Teile
 * - Teil-Positionierungen, Farben, Geometrien
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPawnParts,
  getPartByName,
  PAWN_PART_NAMES,
} from '../js/pawn-model-logic.js';

/* ---------- buildPawnParts: Basis ---------- */

test('buildPawnParts: gibt Array zurueck', () => {
  const parts = buildPawnParts({ color: '#ff0000', index: 0 });
  assert.ok(Array.isArray(parts));
  assert.ok(parts.length > 0, 'Mindestens ein Teil');
});

test('buildPawnParts: enthaelt Kopf, Koerper, Augen, Arme, Beine', () => {
  const parts = buildPawnParts({ color: '#ff0000', index: 0 });
  const names = parts.map(p => p.name);
  assert.ok(names.includes('head'), 'Kopf fehlt');
  assert.ok(names.includes('body'), 'Koerper fehlt');
  assert.ok(names.includes('eyeL'), 'Linkes Auge fehlt');
  assert.ok(names.includes('eyeR'), 'Rechtes Auge fehlt');
  assert.ok(names.includes('armL'), 'Linker Arm fehlt');
  assert.ok(names.includes('armR'), 'Rechter Arm fehlt');
  assert.ok(names.includes('legL'), 'Linkes Bein fehlt');
  assert.ok(names.includes('legR'), 'Rechter Arm fehlt');
});

test('buildPawnParts: jedes Teil hat name, geometry, size, position, colorMode', () => {
  const parts = buildPawnParts({ color: '#ff0000', index: 0 });
  for (const part of parts) {
    assert.ok(typeof part.name === 'string', 'name fehlt');
    assert.ok(typeof part.geometry === 'string', 'geometry fehlt');
    assert.ok(Array.isArray(part.size), 'size muss Array sein');
    assert.ok(Array.isArray(part.position), 'position muss Array sein');
    assert.ok(part.position.length === 3, 'position muss 3 Werte haben');
    assert.ok(typeof part.colorMode === 'string', 'colorMode fehlt');
  }
});

/* ---------- buildPawnParts: Positionierung ---------- */

test('buildPawnParts: Kopf ist ueber dem Koerper', () => {
  const parts = buildPawnParts({ color: '#ff0000', index: 0 });
  const head = getPartByName(parts, 'head');
  const body = getPartByName(parts, 'body');
  assert.ok(head.position[1] > body.position[1], 'Kopf muss hoeher als Koerper sein');
});

test('buildPawnParts: Augen sind am Kopf positioniert', () => {
  const parts = buildPawnParts({ color: '#ff0000', index: 0 });
  const head = getPartByName(parts, 'head');
  const eyeL = getPartByName(parts, 'eyeL');
  const eyeR = getPartByName(parts, 'eyeR');
  // Augen sollten in der Naehe des Kopfes sein (y близко к head.y)
  assert.ok(Math.abs(eyeL.position[1] - head.position[1]) < 0.25, 'Linkes Auge nicht am Kopf');
  assert.ok(Math.abs(eyeR.position[1] - head.position[1]) < 0.25, 'Rechtes Auge nicht am Kopf');
  // Linkes Auge links, rechtes rechts
  assert.ok(eyeL.position[0] < 0, 'Linkes Auge sollte negativen x haben');
  assert.ok(eyeR.position[0] > 0, 'Rechtes Auge sollte positiven x haben');
});

test('buildPawnParts: Arme sind links und rechts vom Koerper', () => {
  const parts = buildPawnParts({ color: '#ff0000', index: 0 });
  const armL = getPartByName(parts, 'armL');
  const armR = getPartByName(parts, 'armR');
  const body = getPartByName(parts, 'body');
  assert.ok(armL.position[0] < body.position[0], 'Linker Arm sollte links vom Koerper sein');
  assert.ok(armR.position[0] > body.position[0], 'Rechter Arm sollte rechts vom Koerper sein');
});

test('buildPawnParts: Beine sind unter dem Koerper', () => {
  const parts = buildPawnParts({ color: '#ff0000', index: 0 });
  const legL = getPartByName(parts, 'legL');
  const legR = getPartByName(parts, 'legR');
  const body = getPartByName(parts, 'body');
  assert.ok(legL.position[1] < body.position[1], 'Linkes Bein sollte unter dem Koerper sein');
  assert.ok(legR.position[1] < body.position[1], 'Rechtes Bein sollte unter dem Koerper sein');
});

/* ---------- buildPawnParts: Farben ---------- */

test('buildPawnParts: Koerper und Kopf verwenden primary colorMode', () => {
  const parts = buildPawnParts({ color: '#ff0000', index: 0 });
  const head = getPartByName(parts, 'head');
  const body = getPartByName(parts, 'body');
  assert.equal(head.colorMode, 'primary');
  assert.equal(body.colorMode, 'primary');
});

test('buildPawnParts: Augen verwenden eye colorMode', () => {
  const parts = buildPawnParts({ color: '#ff0000', index: 0 });
  const eyeL = getPartByName(parts, 'eyeL');
  const eyeR = getPartByName(parts, 'eyeR');
  assert.equal(eyeL.colorMode, 'eye');
  assert.equal(eyeR.colorMode, 'eye');
});

test('buildPawnParts: Pedestal verwendet dark colorMode', () => {
  const parts = buildPawnParts({ color: '#ff0000', index: 0 });
  const pedestal = getPartByName(parts, 'pedestal');
  assert.ok(pedestal, 'Pedestal sollte existieren');
  assert.equal(pedestal.colorMode, 'dark');
});

/* ---------- buildPawnParts: Geometrien ---------- */

test('buildPawnParts: Kopf ist sphere geometry', () => {
  const parts = buildPawnParts({ color: '#ff0000', index: 0 });
  const head = getPartByName(parts, 'head');
  assert.equal(head.geometry, 'sphere');
});

test('buildPawnParts: Koerper ist sphere geometry', () => {
  const parts = buildPawnParts({ color: '#ff0000', index: 0 });
  const body = getPartByName(parts, 'body');
  assert.ok(body.geometry === 'sphere' || body.geometry === 'capsule', 'Koerper sollte sphere oder capsule sein');
});

test('buildPawnParts: Augen sind sphere geometry', () => {
  const parts = buildPawnParts({ color: '#ff0000', index: 0 });
  const eyeL = getPartByName(parts, 'eyeL');
  assert.equal(eyeL.geometry, 'sphere');
});

test('buildPawnParts: Arme und Beine sind cylinder oder sphere', () => {
  const parts = buildPawnParts({ color: '#ff0000', index: 0 });
  const armL = getPartByName(parts, 'armL');
  const legL = getPartByName(parts, 'legL');
  assert.ok(['cylinder', 'sphere', 'capsule'].includes(armL.geometry), 'Arm geometry sollte cylinder/sphere/capsule sein');
  assert.ok(['cylinder', 'sphere', 'capsule'].includes(legL.geometry), 'Bein geometry sollte cylinder/sphere/capsule sein');
});

/* ---------- buildPawnParts: Index-Variation ---------- */

test('buildPawnParts: unterschiedlicher index aendert phase (Schwebe-Phase)', () => {
  const parts0 = buildPawnParts({ color: '#ff0000', index: 0 });
  const parts2 = buildPawnParts({ color: '#ff0000', index: 2 });
  // Die phase sollte unterschiedlich sein fuer phasenversetzte Animation
  assert.notEqual(parts0[0].phase, parts2[0].phase, 'Phase sollte sich mit index aendern');
});

/* ---------- getPartByName ---------- */

test('getPartByName: findet Teil nach Namen', () => {
  const parts = buildPawnParts({ color: '#ff0000', index: 0 });
  const head = getPartByName(parts, 'head');
  assert.ok(head);
  assert.equal(head.name, 'head');
});

test('getPartByName: nicht gefundener Name → null', () => {
  const parts = buildPawnParts({ color: '#ff0000', index: 0 });
  const result = getPartByName(parts, 'nonexistent');
  assert.equal(result, null);
});

/* ---------- PAWN_PART_NAMES ---------- */

test('PAWN_PART_NAMES: enthaelt alle erwarteten Teile', () => {
  assert.ok(Array.isArray(PAWN_PART_NAMES));
  assert.ok(PAWN_PART_NAMES.includes('head'));
  assert.ok(PAWN_PART_NAMES.includes('body'));
  assert.ok(PAWN_PART_NAMES.includes('eyeL'));
  assert.ok(PAWN_PART_NAMES.includes('eyeR'));
  assert.ok(PAWN_PART_NAMES.includes('armL'));
  assert.ok(PAWN_PART_NAMES.includes('armR'));
  assert.ok(PAWN_PART_NAMES.includes('legL'));
  assert.ok(PAWN_PART_NAMES.includes('legR'));
});

/* ---------- Material-Eigenschaften ---------- */

test('buildPawnParts: Teile haben material mit roughness und metalness', () => {
  const parts = buildPawnParts({ color: '#ff0000', index: 0 });
  for (const part of parts) {
    assert.ok(typeof part.material === 'object', 'material fehlt bei ' + part.name);
    assert.ok(typeof part.material.roughness === 'number', 'roughness fehlt bei ' + part.name);
    assert.ok(typeof part.material.metalness === 'number', 'metalness fehlt bei ' + part.name);
  }
});

/* ---------- Rotation (optional) ---------- */

test('buildPawnParts: rotation ist Array[3] oder undefined', () => {
  const parts = buildPawnParts({ color: '#ff0000', index: 0 });
  for (const part of parts) {
    if (part.rotation !== undefined) {
      assert.ok(Array.isArray(part.rotation), 'rotation muss Array sein bei ' + part.name);
      assert.ok(part.rotation.length === 3, 'rotation muss 3 Werte haben bei ' + part.name);
    }
  }
});

/* ---------- Optionale Teile: Antenna / Hut ---------- */

test('buildPawnParts: enthaelt optionales accent-Teil (antenna oder hat)', () => {
  const parts = buildPawnParts({ color: '#ff0000', index: 0 });
  const names = parts.map(p => p.name);
  const hasAccent = names.includes('antenna') || names.includes('hat') || names.includes('crest');
  assert.ok(hasAccent, 'Sollte accent-Teil haben (antenna/hat/crest)');
});

/* ---------- size Werte sind positiv ---------- */

test('buildPawnParts: size-Werte sind positive Zahlen', () => {
  const parts = buildPawnParts({ color: '#ff0000', index: 0 });
  for (const part of parts) {
    for (const s of part.size) {
      assert.ok(typeof s === 'number', 'size-Wert muss Zahl sein bei ' + part.name);
      assert.ok(s > 0, 'size-Wert muss positiv sein bei ' + part.name);
    }
  }
});

/* ---------- position Werte sind Zahlen ---------- */

test('buildPawnParts: position-Werte sind Zahlen', () => {
  const parts = buildPawnParts({ color: '#ff0000', index: 0 });
  for (const part of parts) {
    for (const p of part.position) {
      assert.ok(typeof p === 'number', 'position-Wert muss Zahl sein bei ' + part.name);
    }
  }
});

/* ---------- Default-Werte / Robustheit ---------- */

test('buildPawnParts: funktioniert ohne index (default 0)', () => {
  const parts = buildPawnParts({ color: '#00ff00' });
  assert.ok(Array.isArray(parts));
  assert.ok(parts.length > 0);
});

test('buildPawnParts: funktioniert ohne color (default)', () => {
  const parts = buildPawnParts({});
  assert.ok(Array.isArray(parts));
  assert.ok(parts.length > 0);
});

test('buildPawnParts: unterschiedliche Farben aendern nicht die Geometrie', () => {
  const partsRed = buildPawnParts({ color: '#ff0000', index: 0 });
  const partsBlue = buildPawnParts({ color: '#0000ff', index: 0 });
  assert.equal(partsRed.length, partsBlue.length);
  for (let i = 0; i < partsRed.length; i++) {
    assert.equal(partsRed[i].geometry, partsBlue[i].geometry);
    assert.deepEqual(partsRed[i].size, partsBlue[i].size);
    assert.deepEqual(partsRed[i].position, partsBlue[i].position);
  }
});