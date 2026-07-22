/**
 * Audio-Settings Paritaetstest (ESM vs Browser-IIFE)
 *
 * Stellt sicher dass beide Versionen identische Ergebnisse liefern.
 */
import { test } from 'node:test';
import assert from 'node:assert';
import * as ESM from '../js/audio-settings-logic.js';

// Browser-IIFE laden
import { readFileSync } from 'fs';
import { join } from 'path';
import vm from 'vm';

const browserCode = readFileSync(join(process.cwd(), 'js/audio-settings-logic-browser.js'), 'utf8');
const sandbox = { window: {}, Math, JSON, Object, console };
vm.createContext(sandbox);
vm.runInContext(browserCode, sandbox);
const IIFE = sandbox.window.AudioSettingsLogic;

/* ---------- createAudioSettings ---------- */
test('Paritaet: createAudioSettings identisch', () => {
  const a = ESM.createAudioSettings();
  const b = IIFE.createAudioSettings();
  assert.deepEqual(a, b);
});

/* ---------- setMusicVolume ---------- */
test('Paritaet: setMusicVolume identisch', () => {
  const s1 = ESM.createAudioSettings();
  const s2 = IIFE.createAudioSettings();
  const r1 = ESM.setMusicVolume(s1, 0.3);
  const r2 = IIFE.setMusicVolume(s2, 0.3);
  assert.deepEqual(r1, r2);
});

test('Paritaet: setMusicVolume clamp identisch', () => {
  const s1 = ESM.createAudioSettings();
  const s2 = IIFE.createAudioSettings();
  assert.deepEqual(ESM.setMusicVolume(s1, 1.5), IIFE.setMusicVolume(s2, 1.5));
  assert.deepEqual(ESM.setMusicVolume(s1, -0.5), IIFE.setMusicVolume(s2, -0.5));
});

/* ---------- setSfxVolume ---------- */
test('Paritaet: setSfxVolume identisch', () => {
  const s1 = ESM.createAudioSettings();
  const s2 = IIFE.createAudioSettings();
  assert.deepEqual(ESM.setSfxVolume(s1, 0.9), IIFE.setSfxVolume(s2, 0.9));
});

/* ---------- toggleMusic ---------- */
test('Paritaet: toggleMusic identisch', () => {
  const s1 = ESM.createAudioSettings();
  const s2 = IIFE.createAudioSettings();
  assert.deepEqual(ESM.toggleMusic(s1), IIFE.toggleMusic(s2));
});

/* ---------- toggleSfx ---------- */
test('Paritaet: toggleSfx identisch', () => {
  const s1 = ESM.createAudioSettings();
  const s2 = IIFE.createAudioSettings();
  assert.deepEqual(ESM.toggleSfx(s1), IIFE.toggleSfx(s2));
});

/* ---------- isMusicOn / isSfxOn ---------- */
test('Paritaet: isMusicOn identisch', () => {
  const s1 = ESM.createAudioSettings();
  const s2 = IIFE.createAudioSettings();
  assert.equal(ESM.isMusicOn(s1), IIFE.isMusicOn(s2));
});

test('Paritaet: isSfxOn identisch', () => {
  const s1 = ESM.createAudioSettings();
  const s2 = IIFE.createAudioSettings();
  assert.equal(ESM.isSfxOn(s1), IIFE.isSfxOn(s2));
});

/* ---------- getMusicVolume / getSfxVolume ---------- */
test('Paritaet: getMusicVolume identisch', () => {
  const s1 = ESM.setMusicVolume(ESM.createAudioSettings(), 0.6);
  const s2 = IIFE.setMusicVolume(IIFE.createAudioSettings(), 0.6);
  assert.equal(ESM.getMusicVolume(s1), IIFE.getMusicVolume(s2));
});

test('Paritaet: getSfxVolume identisch', () => {
  const s1 = ESM.setSfxVolume(ESM.createAudioSettings(), 0.4);
  const s2 = IIFE.setSfxVolume(IIFE.createAudioSettings(), 0.4);
  assert.equal(ESM.getSfxVolume(s1), IIFE.getSfxVolume(s2));
});

/* ---------- saveAudioSettings / loadAudioSettings ---------- */
test('Paritaet: saveAudioSettings identisch', () => {
  const store1 = {};
  const store2 = {};
  const s1 = ESM.createAudioSettings();
  const s2 = IIFE.createAudioSettings();
  ESM.saveAudioSettings(s1, store1);
  IIFE.saveAudioSettings(s2, store2);
  assert.deepEqual(store1, store2);
});

test('Paritaet: loadAudioSettings identisch (leer)', () => {
  assert.deepEqual(ESM.loadAudioSettings({}), IIFE.loadAudioSettings({}));
});

test('Paritaet: loadAudioSettings identisch (mit Daten)', () => {
  const data = JSON.stringify({
    musicEnabled: false, sfxEnabled: true, musicVolume: 0.3, sfxVolume: 0.9
  });
  assert.deepEqual(
    ESM.loadAudioSettings({ 'pa_audio_settings': data }),
    IIFE.loadAudioSettings({ 'pa_audio_settings': data })
  );
});

test('Paritaet: save-then-load Roundtrip identisch', () => {
  const store1 = {};
  const store2 = {};
  let s1 = ESM.createAudioSettings();
  let s2 = IIFE.createAudioSettings();
  s1 = ESM.setMusicVolume(s1, 0.35);
  s2 = IIFE.setMusicVolume(s2, 0.35);
  s1 = ESM.toggleSfx(s1);
  s2 = IIFE.toggleSfx(s2);
  ESM.saveAudioSettings(s1, store1);
  IIFE.saveAudioSettings(s2, store2);
  assert.deepEqual(ESM.loadAudioSettings(store1), IIFE.loadAudioSettings(store2));
});