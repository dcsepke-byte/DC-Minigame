/**
 * Screen Transitions — Spiellogik (browser-frei, testbar)
 *
 * Reine Logik fuer Screen-Wechsel-Animationen:
 *  - Transition-State-Management (entering, exiting, idle)
 *  - Richtungserkennung (forward/backward) basierend auf Screen-Reihenfolge
 *  - Phasen-Tracking (before-enter, enter, after-enter / before-exit, exit, after-exit)
 *  - Dauer-Konfiguration pro Richtung
 *  - Popup-Effekt-Steuerung (scale-in, bounce-in, fade-in, slide-up)
 */

/**
 * Screen-Reihenfolge fuer Richtungserkennung.
 * Screens nicht in dieser Liste = "lateral" (keine Richtung).
 */
export const SCREEN_ORDER = [
  'start',
  'board',
  'duel-intro',
  'duel-play',
  'duel-result',
  'final',
];

/**
 * Erzeugt einen neuen Transition-Manager-State.
 */
export function createTransitionState(opts = {}) {
  return {
    currentScreen: null,
    previousScreen: null,
    transitioning: false,
    durationMs: opts.durationMs ?? 400,
    exitDurationMs: opts.exitDurationMs ?? 300,
    activeTransition: null,
  };
}

/**
 * Bestimmt die Richtung eines Screen-Wechsels.
 */
export function getDirection(from, to) {
  if (!from || !to || from === to) return 'lateral';
  const fromIdx = SCREEN_ORDER.indexOf(from);
  const toIdx = SCREEN_ORDER.indexOf(to);
  if (fromIdx === -1 || toIdx === -1) return 'lateral';
  if (toIdx > fromIdx) return 'forward';
  if (toIdx < fromIdx) return 'backward';
  return 'lateral';
}

/**
 * Erzeugt ein Transition-Objekt fuer den Wechsel von -> to.
 */
export function startTransition(state, to) {
  const from = state.currentScreen;
  const direction = getDirection(from, to);
  const transition = {
    from,
    to,
    direction,
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

/**
 * Aktualisiert die Enter-Phase einer Transition.
 */
export function setEnterPhase(state, phase) {
  if (!state.activeTransition) return;
  state.activeTransition.enterPhase = phase;
  if (phase === 'after-enter') {
    state.transitioning = false;
    state.activeTransition = null;
  }
}

/**
 * Aktualisiert die Exit-Phase einer Transition.
 */
export function setExitPhase(state, phase) {
  if (!state.activeTransition) return;
  state.activeTransition.exitPhase = phase;
}

/**
 * Prueft ob eine Transition aktiv ist.
 */
export function isTransitioning(state) {
  return state.transitioning;
}

/**
 * Gibt die aktuelle Enter-Phase zurueck.
 */
export function getEnterPhase(state) {
  return state.activeTransition ? state.activeTransition.enterPhase : 'idle';
}

/**
 * Gibt die aktuelle Exit-Phase zurueck.
 */
export function getExitPhase(state) {
  return state.activeTransition ? state.activeTransition.exitPhase : 'idle';
}

/**
 * CSS-Klassen fuer einen Screen basierend auf Transition-State generieren.
 */
export function getScreenClasses(state, screenName) {
  const classes = [];
  if (!state.activeTransition) {
    if (state.currentScreen === screenName) classes.push('screen-active');
    return classes;
  }
  const t = state.activeTransition;
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

/* ---------- Popup-Effekte ---------- */

export const POPUP_TYPES = {
  scaleIn: 'scale-in',
  bounceIn: 'bounce-in',
  fadeIn: 'fade-in',
  slideUp: 'slide-up',
};

/**
 * Erzeugt einen Popup-Effekt-State.
 */
export function createPopupState(opts = {}) {
  return {
    type: opts.type ?? POPUP_TYPES.scaleIn,
    delayMs: opts.delayMs ?? 0,
    durationMs: opts.durationMs ?? 350,
    active: false,
    phase: 'idle',
  };
}

/**
 * Startet einen Popup-Effekt.
 */
export function triggerPopup(popup) {
  popup.active = true;
  popup.phase = popup.delayMs > 0 ? 'waiting' : 'playing';
}

/**
 * Aktualisiert die Popup-Phase.
 */
export function setPopupPhase(popup, phase) {
  if (!popup.active) return;
  popup.phase = phase;
  if (phase === 'done') {
    popup.active = false;
  }
}

/**
 * Prueft ob ein Popup aktiv ist.
 */
export function isPopupActive(popup) {
  return popup.active;
}

/**
 * Generiert CSS-Klassen fuer ein Popup-Element.
 */
export function getPopupClasses(popup) {
  if (!popup.active) return [];
  const classes = ['popup-effect', `popup-${popup.type}`];
  if (popup.phase === 'playing') classes.push('popup-active');
  if (popup.phase === 'waiting') classes.push('popup-waiting');
  return classes;
}