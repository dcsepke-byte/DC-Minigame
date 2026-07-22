/**
 * Onboarding-Logic — Browser-Kompatibel (IIFE)
 *
 * Gleiche Logik wie onboarding-logic.js (ESM),
 * aber als IIFE fuer <script>-Tag ohne Module-Loader.
 */
(function () {
  'use strict';

  var TUTORIAL_STEPS = [
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

  function createOnboardingState() {
    return {
      onboardingCompleted: false,
      currentStep: 0,
      stepsTotal: TUTORIAL_STEPS.length,
      skipped: false,
    };
  }

  function isFirstTimeUser(state) {
    return !state.onboardingCompleted && !state.skipped;
  }

  function shouldShowTutorial(state) {
    return !state.onboardingCompleted && !state.skipped;
  }

  function getTutorialSteps() {
    return TUTORIAL_STEPS;
  }

  function getCurrentStep(state) {
    if (state.currentStep < 0 || state.currentStep >= TUTORIAL_STEPS.length) return null;
    return TUTORIAL_STEPS[state.currentStep];
  }

  function advanceStep(state) {
    if (state.onboardingCompleted) return { completed: true };
    if (state.currentStep >= TUTORIAL_STEPS.length - 1) {
      state.onboardingCompleted = true;
      return { completed: true };
    }
    state.currentStep += 1;
    return { completed: false };
  }

  function completeOnboarding(state) {
    state.onboardingCompleted = true;
  }

  function skipTutorial(state) {
    state.skipped = true;
    state.onboardingCompleted = true;
  }

  function getWelcomeMessage() {
    return 'Willkommen bei Party Arena! Bereit fuer deine erste Mini-Spiel-Challenge?';
  }

  function getProgressPercent(state) {
    if (state.onboardingCompleted) return 100;
    if (state.stepsTotal === 0) return 0;
    return Math.min(100, Math.round((state.currentStep / state.stepsTotal) * 100));
  }

  window.OnboardingLogic = {
    createOnboardingState: createOnboardingState,
    isFirstTimeUser: isFirstTimeUser,
    shouldShowTutorial: shouldShowTutorial,
    getTutorialSteps: getTutorialSteps,
    getCurrentStep: getCurrentStep,
    advanceStep: advanceStep,
    completeOnboarding: completeOnboarding,
    skipTutorial: skipTutorial,
    getWelcomeMessage: getWelcomeMessage,
    getProgressPercent: getProgressPercent,
  };
})();