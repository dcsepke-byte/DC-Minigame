/**
 * Onboarding-Logic Tests (TDD)
 *
 * Testet die reine Logik fuer Erstbenutzer-Erkennung,
 * Tutorial-Schritte und Onboarding-Fortschritt.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createOnboardingState,
  isFirstTimeUser,
  getTutorialSteps,
  getCurrentStep,
  advanceStep,
  completeOnboarding,
  getWelcomeMessage,
  shouldShowTutorial,
  skipTutorial,
  getProgressPercent,
} from '../js/onboarding-logic.js';

/* ---------- createOnboardingState ---------- */

test('createOnboardingState: gibt State mit onboardingCompleted=false zurueck', () => {
  const state = createOnboardingState();
  assert.equal(state.onboardingCompleted, false);
  assert.equal(state.currentStep, 0);
  assert.equal(state.skipped, false);
});

test('createOnboardingState: hat stepsTotal als Zahl >= 0', () => {
  const state = createOnboardingState();
  assert.ok(typeof state.stepsTotal === 'number');
  assert.ok(state.stepsTotal >= 0);
});

/* ---------- isFirstTimeUser ---------- */

test('isFirstTimeUser: neuen State → true', () => {
  const state = createOnboardingState();
  assert.equal(isFirstTimeUser(state), true);
});

test('isFirstTimeUser: abgeschlossenes Onboarding → false', () => {
  const state = createOnboardingState();
  state.onboardingCompleted = true;
  assert.equal(isFirstTimeUser(state), false);
});

test('isFirstTimeUser: uebersprungenes Onboarding → false', () => {
  const state = createOnboardingState();
  state.skipped = true;
  assert.equal(isFirstTimeUser(state), false);
});

/* ---------- shouldShowTutorial ---------- */

test('shouldShowTutorial: neuen State → true', () => {
  const state = createOnboardingState();
  assert.equal(shouldShowTutorial(state), true);
});

test('shouldShowTutorial: abgeschlossenes Onboarding → false', () => {
  const state = createOnboardingState();
  state.onboardingCompleted = true;
  assert.equal(shouldShowTutorial(state), false);
});

test('shouldShowTutorial: uebersprungenes Onboarding → false', () => {
  const state = createOnboardingState();
  state.skipped = true;
  assert.equal(shouldShowTutorial(state), false);
});

/* ---------- getTutorialSteps ---------- */

test('getTutorialSteps: gibt Array mit Schritt-Definitionen zurueck', () => {
  const steps = getTutorialSteps();
  assert.ok(Array.isArray(steps));
  assert.ok(steps.length >= 4, 'Mindestens 4 Tutorial-Schritte');
});

test('getTutorialSteps: jeder Schritt hat id, title, text, target', () => {
  const steps = getTutorialSteps();
  for (const step of steps) {
    assert.ok(typeof step.id === 'string', 'id fehlt');
    assert.ok(typeof step.title === 'string', 'title fehlt');
    assert.ok(typeof step.text === 'string', 'text fehlt');
    assert.ok(typeof step.target === 'string', 'target fehlt');
  }
});

test('getTutorialSteps: erster Schritt ist Welcome/Begruessung', () => {
  const steps = getTutorialSteps();
  assert.ok(steps[0].id.toLowerCase().includes('welcome') || steps[0].title.toLowerCase().includes('willkommen'),
    'Erster Schritt sollte Welcome sein');
});

/* ---------- getCurrentStep ---------- */

test('getCurrentStep: Schritt 0 bei neuem State', () => {
  const state = createOnboardingState();
  const step = getCurrentStep(state);
  assert.ok(step);
  assert.equal(step.id, getTutorialSteps()[0].id);
});

test('getCurrentStep: gibt null bei ueberschrittenem Index', () => {
  const state = createOnboardingState();
  state.currentStep = 999;
  const step = getCurrentStep(state);
  assert.equal(step, null);
});

/* ---------- advanceStep ---------- */

test('advanceStep: erhoeht currentStep um 1', () => {
  const state = createOnboardingState();
  const result = advanceStep(state);
  assert.equal(state.currentStep, 1);
  assert.equal(result.completed, false);
});

test('advanceStep: beim letzten Schritt wird onboardingCompleted true', () => {
  const state = createOnboardingState();
  state.currentStep = state.stepsTotal - 1;
  const result = advanceStep(state);
  assert.equal(result.completed, true);
  assert.equal(state.onboardingCompleted, true);
});

test('advanceStep: nach Abgeschlossen keine weitere Erhoehung', () => {
  const state = createOnboardingState();
  state.onboardingCompleted = true;
  const before = state.currentStep;
  const result = advanceStep(state);
  assert.equal(state.currentStep, before);
  assert.equal(result.completed, true);
});

/* ---------- completeOnboarding ---------- */

test('completeOnboarding: setzt onboardingCompleted auf true', () => {
  const state = createOnboardingState();
  completeOnboarding(state);
  assert.equal(state.onboardingCompleted, true);
});

/* ---------- skipTutorial ---------- */

test('skipTutorial: setzt skipped auf true und onboardingCompleted auf true', () => {
  const state = createOnboardingState();
  skipTutorial(state);
  assert.equal(state.skipped, true);
  assert.equal(state.onboardingCompleted, true);
});

/* ---------- getWelcomeMessage ---------- */

test('getWelcomeMessage: gibt nicht-leeren String zurueck', () => {
  const msg = getWelcomeMessage();
  assert.ok(typeof msg === 'string');
  assert.ok(msg.length > 0);
});

/* ---------- getProgressPercent ---------- */

test('getProgressPercent: 0% bei neuem State', () => {
  const state = createOnboardingState();
  assert.equal(getProgressPercent(state), 0);
});

test('getProgressPercent: 100% bei abgeschlossenem Onboarding', () => {
  const state = createOnboardingState();
  state.onboardingCompleted = true;
  state.currentStep = state.stepsTotal;
  assert.equal(getProgressPercent(state), 100);
});

test('getProgressPercent: korrekter Prozentwert in der Mitte', () => {
  const state = createOnboardingState();
  state.stepsTotal = 4;
  state.currentStep = 2;
  assert.equal(getProgressPercent(state), 50);
});