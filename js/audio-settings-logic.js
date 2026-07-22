/**
 * Audio-Settings-Logic — reine Funktionen fuer Audio-Einstellungen (ESM)
 *
 * Getrennte Steuerung fuer Musik und Sound-Effekte:
 *  - musicEnabled / sfxEnabled (an/aus)
 *  - musicVolume / sfxVolume (0..1)
 *  - Persistenz ueber Store-Objekt (localStorage-kompatibel)
 *
 * Alle Funktionen sind rein (immutable): sie geben neue Objekte zurueck.
 */

const STORAGE_KEY = 'pa_audio_settings';

/**
 * Erzeugt einen Default-Audio-Settings-State.
 * Musik ist an mit 0.5 Lautstaerke, SFX ist an mit 0.7 Lautstaerke.
 * @returns {object} Audio-Settings-State
 */
export function createAudioSettings() {
  return {
    musicEnabled: true,
    sfxEnabled: true,
    musicVolume: 0.5,
    sfxVolume: 0.7,
  };
}

/**
 * Setzt die Musik-Lautstaerke (geclampet auf 0..1).
 * @param {object} state - Audio-Settings-State
 * @param {number} vol - Lautstaerke 0..1
 * @returns {object} Neuer State mit aktualisierter Musik-Lautstaerke
 */
export function setMusicVolume(state, vol) {
  const clamped = Math.max(0, Math.min(1, vol));
  return { ...state, musicVolume: clamped };
}

/**
 * Setzt die SFX-Lautstaerke (geclampet auf 0..1).
 * @param {object} state - Audio-Settings-State
 * @param {number} vol - Lautstaerke 0..1
 * @returns {object} Neuer State mit aktualisierter SFX-Lautstaerke
 */
export function setSfxVolume(state, vol) {
  const clamped = Math.max(0, Math.min(1, vol));
  return { ...state, sfxVolume: clamped };
}

/**
 * Schaltet Musik an oder aus.
 * @param {object} state - Audio-Settings-State
 * @returns {object} Neuer State mit umgeschaltetem Musik-Status
 */
export function toggleMusic(state) {
  return { ...state, musicEnabled: !state.musicEnabled };
}

/**
 * Schaltet SFX an oder aus.
 * @param {object} state - Audio-Settings-State
 * @returns {object} Neuer State mit umgeschaltetem SFX-Status
 */
export function toggleSfx(state) {
  return { ...state, sfxEnabled: !state.sfxEnabled };
}

/**
 * Gibt zurueck ob Musik aktiviert ist.
 * @param {object} state - Audio-Settings-State
 * @returns {boolean}
 */
export function isMusicOn(state) {
  return !!state.musicEnabled;
}

/**
 * Gibt zurueck ob SFX aktiviert ist.
 * @param {object} state - Audio-Settings-State
 * @returns {boolean}
 */
export function isSfxOn(state) {
  return !!state.sfxEnabled;
}

/**
 * Gibt die aktuelle Musik-Lautstaerke zurueck.
 * @param {object} state - Audio-Settings-State
 * @returns {number} 0..1
 */
export function getMusicVolume(state) {
  return state.musicVolume;
}

/**
 * Gibt die aktuelle SFX-Lautstaerke zurueck.
 * @param {object} state - Audio-Settings-State
 * @returns {number} 0..1
 */
export function getSfxVolume(state) {
  return state.sfxVolume;
}

/**
 * Speichert Audio-Settings in einem Store-Objekt (localStorage-kompatibel).
 * @param {object} state - Audio-Settings-State
 * @param {object} store - Storage-Objekt mit setItem/getItem
 */
export function saveAudioSettings(state, store) {
  try {
    store[STORAGE_KEY] = JSON.stringify(state);
  } catch (_) {}
}

/**
 * Laedt Audio-Settings aus einem Store-Objekt (localStorage-kompatibel).
 * @param {object} store - Storage-Objekt mit getItem
 * @returns {object} Audio-Settings-State (Default falls nichts gespeichert)
 */
export function loadAudioSettings(store) {
  try {
    const raw = store[STORAGE_KEY];
    if (!raw) return createAudioSettings();
    const parsed = JSON.parse(raw);
    return {
      musicEnabled: !!parsed.musicEnabled,
      sfxEnabled: !!parsed.sfxEnabled,
      musicVolume: Math.max(0, Math.min(1, parsed.musicVolume ?? 0.5)),
      sfxVolume: Math.max(0, Math.min(1, parsed.sfxVolume ?? 0.7)),
    };
  } catch (_) {
    return createAudioSettings();
  }
}