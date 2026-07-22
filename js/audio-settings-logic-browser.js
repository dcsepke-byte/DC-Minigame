/**
 * Audio-Settings-Logic — Browser-Kompatibel (IIFE)
 *
 * Gleiche Logik wie audio-settings-logic.js (ESM),
 * aber als IIFE fuer <script>-Tag ohne Module-Loader.
 *
 * Getrennte Steuerung fuer Musik und Sound-Effekte.
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'pa_audio_settings';

  function createAudioSettings() {
    return {
      musicEnabled: true,
      sfxEnabled: true,
      musicVolume: 0.5,
      sfxVolume: 0.7,
    };
  }

  function setMusicVolume(state, vol) {
    var clamped = Math.max(0, Math.min(1, vol));
    return Object.assign({}, state, { musicVolume: clamped });
  }

  function setSfxVolume(state, vol) {
    var clamped = Math.max(0, Math.min(1, vol));
    return Object.assign({}, state, { sfxVolume: clamped });
  }

  function toggleMusic(state) {
    return Object.assign({}, state, { musicEnabled: !state.musicEnabled });
  }

  function toggleSfx(state) {
    return Object.assign({}, state, { sfxEnabled: !state.sfxEnabled });
  }

  function isMusicOn(state) {
    return !!state.musicEnabled;
  }

  function isSfxOn(state) {
    return !!state.sfxEnabled;
  }

  function getMusicVolume(state) {
    return state.musicVolume;
  }

  function getSfxVolume(state) {
    return state.sfxVolume;
  }

  function saveAudioSettings(state, store) {
    try {
      store[STORAGE_KEY] = JSON.stringify(state);
    } catch (e) {}
  }

  function loadAudioSettings(store) {
    try {
      var raw = store[STORAGE_KEY];
      if (!raw) return createAudioSettings();
      var parsed = JSON.parse(raw);
      return {
        musicEnabled: !!parsed.musicEnabled,
        sfxEnabled: !!parsed.sfxEnabled,
        musicVolume: Math.max(0, Math.min(1, parsed.musicVolume != null ? parsed.musicVolume : 0.5)),
        sfxVolume: Math.max(0, Math.min(1, parsed.sfxVolume != null ? parsed.sfxVolume : 0.7)),
      };
    } catch (e) {
      return createAudioSettings();
    }
  }

  window.AudioSettingsLogic = {
    createAudioSettings: createAudioSettings,
    setMusicVolume: setMusicVolume,
    setSfxVolume: setSfxVolume,
    toggleMusic: toggleMusic,
    toggleSfx: toggleSfx,
    isMusicOn: isMusicOn,
    isSfxOn: isSfxOn,
    getMusicVolume: getMusicVolume,
    getSfxVolume: getSfxVolume,
    saveAudioSettings: saveAudioSettings,
    loadAudioSettings: loadAudioSettings,
  };
})();