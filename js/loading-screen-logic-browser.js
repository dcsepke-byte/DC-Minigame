/**
 * Loading Screen — Logik (Browser-Kompatibel, IIFE)
 *
 * Gleiche Logik wie loading-screen-logic.js (ESM),
 * aber als IIFE fuer <script>-Tag ohne Module-Loader.
 */
(function () {
  'use strict';

  function createLoadingState(opts) {
    opts = opts || {};
    return {
      progress: 0,
      complete: false,
      startTime: Date.now(),
      minDisplayMs: opts.minDisplayMs != null ? opts.minDisplayMs : 800,
    };
  }

  function updateProgress(state, value) {
    var clamped = Math.max(0, Math.min(100, value));
    if (clamped > state.progress) {
      state.progress = clamped;
    }
    if (state.progress >= 100) {
      state.complete = true;
    }
  }

  function getProgress(state) {
    return state.progress;
  }

  function isComplete(state) {
    return state.complete;
  }

  function getElapsed(state) {
    return Date.now() - state.startTime;
  }

  function canDismiss(state) {
    return state.complete && getElapsed(state) >= state.minDisplayMs;
  }

  function shouldDismiss(state) {
    return canDismiss(state);
  }

  function setMinDisplayTime(state, ms) {
    state.minDisplayMs = ms;
  }

  /* ---------- Export ---------- */
  window.LoadingScreenLogic = {
    createLoadingState: createLoadingState,
    updateProgress: updateProgress,
    getProgress: getProgress,
    isComplete: isComplete,
    getElapsed: getElapsed,
    canDismiss: canDismiss,
    shouldDismiss: shouldDismiss,
    setMinDisplayTime: setMinDisplayTime,
  };
})();