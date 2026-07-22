/**
 * Screen Transitions — Logik (Browser-Kompatibel, IIFE)
 *
 * Gleiche Logik wie screen-transitions-logic.js (ESM),
 * aber als IIFE fuer <script>-Tag ohne Module-Loader.
 */
(function () {
  'use strict';

  var SCREEN_ORDER = [
    'start',
    'board',
    'duel-intro',
    'duel-play',
    'duel-result',
    'final',
  ];

  function createTransitionState(opts) {
    opts = opts || {};
    return {
      currentScreen: null,
      previousScreen: null,
      transitioning: false,
      durationMs: opts.durationMs != null ? opts.durationMs : 400,
      exitDurationMs: opts.exitDurationMs != null ? opts.exitDurationMs : 300,
      activeTransition: null,
    };
  }

  function getDirection(from, to) {
    if (!from || !to || from === to) return 'lateral';
    var fromIdx = SCREEN_ORDER.indexOf(from);
    var toIdx = SCREEN_ORDER.indexOf(to);
    if (fromIdx === -1 || toIdx === -1) return 'lateral';
    if (toIdx > fromIdx) return 'forward';
    if (toIdx < fromIdx) return 'backward';
    return 'lateral';
  }

  function startTransition(state, to) {
    var from = state.currentScreen;
    var direction = getDirection(from, to);
    var transition = {
      from: from,
      to: to,
      direction: direction,
      enterPhase: 'before-enter',
      exitPhase: from ? 'before-exit' : 'idle',
      enterDurationMs: state.durationMs,
      exitDurationMs: state.exitDurationMs,
    };
    state.activeTransition = transition;
    state.transitioning = true;
    state.previousScreen = from;
    state.currentScreen = to;
    return transition;
  }

  function setEnterPhase(state, phase) {
    if (!state.activeTransition) return;
    state.activeTransition.enterPhase = phase;
    if (phase === 'after-enter') {
      state.transitioning = false;
      state.activeTransition = null;
    }
  }

  function setExitPhase(state, phase) {
    if (!state.activeTransition) return;
    state.activeTransition.exitPhase = phase;
  }

  function isTransitioning(state) {
    return state.transitioning;
  }

  function getEnterPhase(state) {
    return state.activeTransition ? state.activeTransition.enterPhase : 'idle';
  }

  function getExitPhase(state) {
    return state.activeTransition ? state.activeTransition.exitPhase : 'idle';
  }

  function getScreenClasses(state, screenName) {
    var classes = [];
    if (!state.activeTransition) {
      if (state.currentScreen === screenName) classes.push('screen-active');
      return classes;
    }
    var t = state.activeTransition;
    if (t.to === screenName) {
      classes.push('screen-entering');
      if (t.direction === 'forward') classes.push('screen-enter-forward');
      else if (t.direction === 'backward') classes.push('screen-enter-backward');
      else classes.push('screen-enter-lateral');
      if (t.enterPhase === 'enter') classes.push('screen-enter-active');
      if (t.enterPhase === 'after-enter') classes.push('screen-active');
    }
    if (t.from === screenName) {
      classes.push('screen-exiting');
      if (t.direction === 'forward') classes.push('screen-exit-forward');
      else if (t.direction === 'backward') classes.push('screen-exit-backward');
      else classes.push('screen-exit-lateral');
      if (t.exitPhase === 'exit') classes.push('screen-exit-active');
    }
    return classes;
  }

  var POPUP_TYPES = {
    scaleIn: 'scale-in',
    bounceIn: 'bounce-in',
    fadeIn: 'fade-in',
    slideUp: 'slide-up',
  };

  function createPopupState(opts) {
    opts = opts || {};
    return {
      type: opts.type || POPUP_TYPES.scaleIn,
      delayMs: opts.delayMs != null ? opts.delayMs : 0,
      durationMs: opts.durationMs != null ? opts.durationMs : 350,
      active: false,
      phase: 'idle',
    };
  }

  function triggerPopup(popup) {
    popup.active = true;
    popup.phase = popup.delayMs > 0 ? 'waiting' : 'playing';
  }

  function setPopupPhase(popup, phase) {
    if (!popup.active) return;
    popup.phase = phase;
    if (phase === 'done') {
      popup.active = false;
    }
  }

  function isPopupActive(popup) {
    return popup.active;
  }

  function getPopupClasses(popup) {
    if (!popup.active) return [];
    var classes = ['popup-effect', 'popup-' + popup.type];
    if (popup.phase === 'playing') classes.push('popup-active');
    if (popup.phase === 'waiting') classes.push('popup-waiting');
    return classes;
  }

  /* ---------- Export ---------- */
  window.ScreenTransitions = {
    SCREEN_ORDER: SCREEN_ORDER,
    createTransitionState: createTransitionState,
    getDirection: getDirection,
    startTransition: startTransition,
    setEnterPhase: setEnterPhase,
    setExitPhase: setExitPhase,
    isTransitioning: isTransitioning,
    getEnterPhase: getEnterPhase,
    getExitPhase: getExitPhase,
    getScreenClasses: getScreenClasses,
    POPUP_TYPES: POPUP_TYPES,
    createPopupState: createPopupState,
    triggerPopup: triggerPopup,
    setPopupPhase: setPopupPhase,
    isPopupActive: isPopupActive,
    getPopupClasses: getPopupClasses,
  };
})();