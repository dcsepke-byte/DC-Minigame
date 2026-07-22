/**
 * Onboarding-Logic — Spiellogik (browser-frei, testbar)
 *
 * Reine Logik fuer Erstbenutzer-Erkennung und Tutorial-Fortschritt.
 * Keine DOM-Abhaengigkeiten.
 */

/** Tutorial-Schritt-Definitionen */
const TUTORIAL_STEPS = [
  {
    id: 'welcome',
    title: 'Willkommen bei Party Arena!',
    text: 'Lust auf Mini-Spiele? Ich zeig dir kurz, wie alles funktioniert.',
    target: '#screen-start',
  },
  {
    id: 'add_players',
    title: 'Spieler hinzufuegen',
    text: 'Tippe hier einen Namen ein und druecke den Plus-Knopf. Du brauchst mindestens 2 Spieler.',
    target: '#player-name-input',
  },
  {
    id: 'choose_games',
    title: 'Spiele auswaehlen',
    text: 'Hier siehst du alle Mini-Spiele. Tippe ein Spiel an, um es ein- oder auszuschalten.',
    target: '#games-grid',
  },
  {
    id: 'start_game',
    title: 'Spiel starten',
    text: 'Wenn alle Spieler bereit sind, druecke hier, um das Spiel zu beginnen!',
    target: '#btn-start-game',
  },
  {
    id: 'daily_challenge',
    title: 'Taegliche Challenge',
    text: 'Jeden Tag gibt es ein neues Mini-Spiel mit Bonus-Sternen. Schau jeden Tag vorbei!',
    target: '#daily-challenge-card',
  },
];

/**
 * Erstellt den Startzustand fuer Onboarding.
 * @returns {{onboardingCompleted:boolean, currentStep:number, stepsTotal:number, skipped:boolean}}
 */
export function createOnboardingState() {
  return {
    onboardingCompleted: false,
    currentStep: 0,
    stepsTotal: TUTORIAL_STEPS.length,
    skipped: false,
  };
}

/**
 * Prueft ob der Nutzer ein Erstbenutzer ist (Onboarding noch nicht abgeschlossen/uebersprungen).
 * @param {{onboardingCompleted:boolean, skipped:boolean}} state
 * @returns {boolean}
 */
export function isFirstTimeUser(state) {
  return !state.onboardingCompleted && !state.skipped;
}

/**
 * Prueft ob das Tutorial angezeigt werden soll.
 * @param {{onboardingCompleted:boolean, skipped:boolean}} state
 * @returns {boolean}
 */
export function shouldShowTutorial(state) {
  return !state.onboardingCompleted && !state.skipped;
}

/**
 * Gibt alle Tutorial-Schritt-Definitionen zurueck.
 * @returns {Array<{id:string, title:string, text:string, target:string}>}
 */
export function getTutorialSteps() {
  return TUTORIAL_STEPS;
}

/**
 * Gibt den aktuellen Tutorial-Schritt zurueck.
 * @param {{currentStep:number}} state
 * @returns {object|null} Schritt-Definition oder null
 */
export function getCurrentStep(state) {
  const steps = getTutorialSteps();
  if (state.currentStep < 0 || state.currentStep >= steps.length) return null;
  return steps[state.currentStep];
}

/**
 * Schreitet einen Schritt im Tutorial vor.
 * Beim letzten Schritt wird onboardingCompleted auf true gesetzt.
 * @param {{currentStep:number, stepsTotal:number, onboardingCompleted:boolean}} state - wird mutiert
 * @returns {{completed:boolean}}
 */
export function advanceStep(state) {
  if (state.onboardingCompleted) return { completed: true };
  const steps = getTutorialSteps();
  if (state.currentStep >= steps.length - 1) {
    state.onboardingCompleted = true;
    return { completed: true };
  }
  state.currentStep += 1;
  return { completed: false };
}

/**
 * Schliesst das Onboarding ab.
 * @param {{onboardingCompleted:boolean}} state - wird mutiert
 */
export function completeOnboarding(state) {
  state.onboardingCompleted = true;
}

/**
 * Ueberspringt das Tutorial.
 * @param {{skipped:boolean, onboardingCompleted:boolean}} state - wird mutiert
 */
export function skipTutorial(state) {
  state.skipped = true;
  state.onboardingCompleted = true;
}

/**
 * Gibt die Willkommensnachricht zurueck.
 * @returns {string}
 */
export function getWelcomeMessage() {
  return 'Willkommen bei Party Arena! Bereit fuer deine erste Mini-Spiel-Challenge?';
}

/**
 * Berechnet den Fortschritt in Prozent.
 * @param {{currentStep:number, stepsTotal:number, onboardingCompleted:boolean}} state
 * @returns {number} 0-100
 */
export function getProgressPercent(state) {
  if (state.onboardingCompleted) return 100;
  if (state.stepsTotal === 0) return 0;
  return Math.min(100, Math.round((state.currentStep / state.stepsTotal) * 100));
}