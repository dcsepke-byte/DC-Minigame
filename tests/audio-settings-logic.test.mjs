/**
 * Audio-Settings-Logic Tests (TDD)
 *
 * Testet die reine Logik fuer Audio-Einstellungen:
 * - createAudioSettings: Default-State
 * - setMusicVolume / setSfxVolume: Lautstaerkeregelung 0-1
 * - toggleMusic / toggleSfx: an/aus
 * - isMusicOn / isSfxOn: Status-Abfrage
 * - applyToSettings: Settings-Objekt fuer UI
 * - saveAudioSettings / loadAudioSettings: Persistenz (mit Mock)
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createAudioSettings,
  setMusicVolume,
  setSfxVolume,
  toggleMusic,
  toggleSfx,
  isMusicOn,
  isSfxOn,
  getMusicVolume,
  getSfxVolume,
  saveAudioSettings,
  loadAudioSettings,
} from '../js/audio-settings-logic.js';

/* ---------- createAudioSettings ---------- */

test('createAudioSettings: gibt Default-State mit Musik und SFX an zurueck', () => {
  const s = createAudioSettings();
  assert.equal(s.musicEnabled, true);
  assert.equal(s.sfxEnabled, true);
});

test('createAudioSettings: Music-Volume ist 0.5 (mittlere Lautstaerke)', () => {
  const s = createAudioSettings();
  assert.equal(s.musicVolume, 0.5);
});

test('createAudioSettings: SFX-Volume ist 0.7 (etwas lauter als Musik)', () => {
  const s = createAudioSettings();
  assert.equal(s.sfxVolume, 0.7);
});

/* ---------- setMusicVolume ---------- */

test('setMusicVolume: setzt Lautstaerke auf 0.3', () => {
  let s = createAudioSettings();
  s = setMusicVolume(s, 0.3);
  assert.equal(s.musicVolume, 0.3);
});

test('setMusicVolume: 0 ist erlaubt (Stumm)', () => {
  let s = createAudioSettings();
  s = setMusicVolume(s, 0);
  assert.equal(s.musicVolume, 0);
});

test('setMusicVolume: 1 ist erlaubt (volle Lautstaerke)', () => {
  let s = createAudioSettings();
  s = setMusicVolume(s, 1);
  assert.equal(s.musicVolume, 1);
});

test('setMusicVolume: Werte >1 werden auf 1 geclamped', () => {
  let s = createAudioSettings();
  s = setMusicVolume(s, 1.5);
  assert.equal(s.musicVolume, 1);
});

test('setMusicVolume: negative Werte werden auf 0 geclamped', () => {
  let s = createAudioSettings();
  s = setMusicVolume(s, -0.5);
  assert.equal(s.musicVolume, 0);
});

/* ---------- setSfxVolume ---------- */

test('setSfxVolume: setzt Lautstaerke auf 0.9', () => {
  let s = createAudioSettings();
  s = setSfxVolume(s, 0.9);
  assert.equal(s.sfxVolume, 0.9);
});

test('setSfxVolume: clamps auf [0, 1]', () => {
  let s = createAudioSettings();
  s = setSfxVolume(s, 2);
  assert.equal(s.sfxVolume, 1);
  s = setSfxVolume(s, -1);
  assert.equal(s.sfxVolume, 0);
});

/* ---------- toggleMusic / toggleSfx ---------- */

test('toggleMusic: schaltet Musik von an auf aus', () => {
  let s = createAudioSettings();
  assert.equal(s.musicEnabled, true);
  s = toggleMusic(s);
  assert.equal(s.musicEnabled, false);
});

test('toggleMusic: schaltet Musik von aus auf an', () => {
  let s = createAudioSettings();
  s = toggleMusic(s); // aus
  s = toggleMusic(s); // an
  assert.equal(s.musicEnabled, true);
});

test('toggleSfx: schaltet SFX von an auf aus', () => {
  let s = createAudioSettings();
  s = toggleSfx(s);
  assert.equal(s.sfxEnabled, false);
});

test('toggleSfx: schaltet SFX von aus auf an', () => {
  let s = createAudioSettings();
  s = toggleSfx(s);
  s = toggleSfx(s);
  assert.equal(s.sfxEnabled, true);
});

/* ---------- isMusicOn / isSfxOn ---------- */

test('isMusicOn: true wenn Musik aktiviert', () => {
  const s = createAudioSettings();
  assert.equal(isMusicOn(s), true);
});

test('isMusicOn: false wenn Musik deaktiviert', () => {
  let s = createAudioSettings();
  s = toggleMusic(s);
  assert.equal(isMusicOn(s), false);
});

test('isSfxOn: true wenn SFX aktiviert', () => {
  const s = createAudioSettings();
  assert.equal(isSfxOn(s), true);
});

test('isSfxOn: false wenn SFX deaktiviert', () => {
  let s = createAudioSettings();
  s = toggleSfx(s);
  assert.equal(isSfxOn(s), false);
});

/* ---------- getMusicVolume / getSfxVolume ---------- */

test('getMusicVolume: gibt aktuelle Musik-Lautstaerke zurueck', () => {
  let s = createAudioSettings();
  s = setMusicVolume(s, 0.8);
  assert.equal(getMusicVolume(s), 0.8);
});

test('getSfxVolume: gibt aktuelle SFX-Lautstaerke zurueck', () => {
  let s = createAudioSettings();
  s = setSfxVolume(s, 0.3);
  assert.equal(getSfxVolume(s), 0.3);
});

/* ---------- Immutability ---------- */

test('setMusicVolume: aendert nicht das Original-Objekt', () => {
  const s = createAudioSettings();
  const original = s.musicVolume;
  setMusicVolume(s, 0.2);
  assert.equal(s.musicVolume, original, 'Original unveraendert');
});

test('toggleMusic: aendert nicht das Original-Objekt', () => {
  const s = createAudioSettings();
  const original = s.musicEnabled;
  toggleMusic(s);
  assert.equal(s.musicEnabled, original, 'Original unveraendert');
});

/* ---------- saveAudioSettings / loadAudioSettings ---------- */

test('saveAudioSettings: speichert JSON in localStorage-Store', () => {
  const store = {};
  const s = createAudioSettings();
  saveAudioSettings(s, store);
  assert.ok(store['pa_audio_settings'], 'Key existiert im Store');
  const parsed = JSON.parse(store['pa_audio_settings']);
  assert.equal(parsed.musicEnabled, true);
  assert.equal(parsed.sfxEnabled, true);
  assert.equal(parsed.musicVolume, 0.5);
  assert.equal(parsed.sfxVolume, 0.7);
});

test('loadAudioSettings: laedt aus Store und gibt State zurueck', () => {
  const store = { 'pa_audio_settings': JSON.stringify({
    musicEnabled: false, sfxEnabled: true, musicVolume: 0.3, sfxVolume: 0.9
  })};
  const s = loadAudioSettings(store);
  assert.equal(s.musicEnabled, false);
  assert.equal(s.sfxEnabled, true);
  assert.equal(s.musicVolume, 0.3);
  assert.equal(s.sfxVolume, 0.9);
});

test('loadAudioSettings: leerer Store gibt Default zurueck', () => {
  const store = {};
  const s = loadAudioSettings(store);
  assert.equal(s.musicEnabled, true);
  assert.equal(s.sfxEnabled, true);
  assert.equal(s.musicVolume, 0.5);
  assert.equal(s.sfxVolume, 0.7);
});

test('loadAudioSettings: ungueltiges JSON gibt Default zurueck', () => {
  const store = { 'pa_audio_settings': '{bad json' };
  const s = loadAudioSettings(store);
  assert.equal(s.musicEnabled, true);
  assert.equal(s.sfxVolume, 0.7);
});

test('save dann load: Roundtrip erhaelt alle Werte', () => {
  const store = {};
  let s = createAudioSettings();
  s = setMusicVolume(s, 0.4);
  s = setSfxVolume(s, 0.6);
  s = toggleMusic(s);
  saveAudioSettings(s, store);
  const loaded = loadAudioSettings(store);
  assert.equal(loaded.musicVolume, 0.4);
  assert.equal(loaded.sfxVolume, 0.6);
  assert.equal(loaded.musicEnabled, false);
  assert.equal(loaded.sfxEnabled, true);
});