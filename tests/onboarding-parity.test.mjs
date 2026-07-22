/**
 * Onboarding-Logic Paritaetstest (TDD)
 *
 * Stellt sicher dass ESM- und Browser-Version identische
 * Ergebnisse liefern.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as ESM from '../js/onboarding-logic.js';

// Browser-Version als eval im globalen Scope laden
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const browserCode = readFileSync(new URL('../js/onboarding-logic-browser.js', import.meta.url), 'utf-8');
const sandbox = { window: {}, console };
vm.createContext(sandbox);
vm.runInContext(browserCode, sandbox);
const Browser = sandbox.window.OnboardingLogic;

/* ---------- Paritaet createOnboardingState ---------- */

test('Paritaet: createOnboardingState gleiche Struktur', () => {
  const e = ESM.createOnboardingState();
  const b = Browser.createOnboardingState();
  assert.equal(b.onboardingCompleted, e.onboardingCompleted);
  assert.equal(b.currentStep, e.currentStep);
  assert.equal(b.stepsTotal, e.stepsTotal);
  assert.equal(b.skipped, e.skipped);
});

/* ---------- Paritaet isFirstTimeUser ---------- */

test('Paritaet: isFirstTimeUser neue State', () => {
  const s = ESM.createOnboardingState();
  assert.equal(Browser.isFirstTimeUser(s), ESM.isFirstTimeUser(s));
});

test('Paritaet: isFirstTimeUser abgeschlossen', () => {
  const s = ESM.createOnboardingState();
  s.onboardingCompleted = true;
  assert.equal(Browser.isFirstTimeUser(s), ESM.isFirstTimeUser(s));
});

/* ---------- Paritaet shouldShowTutorial ---------- */

test('Paritaet: shouldShowTutorial uebersprungen', () => {
  const s = ESM.createOnboardingState();
  s.skipped = true;
  assert.equal(Browser.shouldShowTutorial(s), ESM.shouldShowTutorial(s));
});

/* ---------- Paritaet getTutorialSteps ---------- */

test('Paritaet: getTutorialSteps gleiche Laenge und IDs', () => {
  const eSteps = ESM.getTutorialSteps();
  const bSteps = Browser.getTutorialSteps();
  assert.equal(bSteps.length, eSteps.length);
  for (let i = 0; i < eSteps.length; i++) {
    assert.equal(bSteps[i].id, eSteps[i].id);
    assert.equal(bSteps[i].title, eSteps[i].title);
    assert.equal(bSteps[i].text, eSteps[i].text);
    assert.equal(bSteps[i].target, eSteps[i].target);
  }
});

/* ---------- Paritaet getCurrentStep ---------- */

test('Paritaet: getCurrentStep bei Schritt 0', () => {
  const s = ESM.createOnboardingState();
  const e = ESM.getCurrentStep(s);
  const b = Browser.getCurrentStep(s);
  assert.equal(b.id, e.id);
});

test('Paritaet: getCurrentStep bei ueberschrittenem Index → null', () => {
  const s = ESM.createOnboardingState();
  s.currentStep = 999;
  assert.equal(Browser.getCurrentStep(s), ESM.getCurrentStep(s));
});

/* ---------- Paritaet advanceStep ---------- */

test('Paritaet: advanceStep mittlerer Schritt', () => {
  const se = ESM.createOnboardingState();
  const sb = ESM.createOnboardingState();
  const re = ESM.advanceStep(se);
  const rb = Browser.advanceStep(sb);
  assert.equal(sb.currentStep, se.currentStep);
  assert.equal(rb.completed, re.completed);
});

test('Paritaet: advanceStep letzter Schritt → completed', () => {
  const se = ESM.createOnboardingState();
  const sb = ESM.createOnboardingState();
  se.currentStep = se.stepsTotal - 1;
  sb.currentStep = sb.stepsTotal - 1;
  const re = ESM.advanceStep(se);
  const rb = Browser.advanceStep(sb);
  assert.equal(sb.onboardingCompleted, se.onboardingCompleted);
  assert.equal(rb.completed, re.completed);
});

/* ---------- Paritaet completeOnboarding ---------- */

test('Paritaet: completeOnboarding', () => {
  const se = ESM.createOnboardingState();
  const sb = ESM.createOnboardingState();
  ESM.completeOnboarding(se);
  Browser.completeOnboarding(sb);
  assert.equal(sb.onboardingCompleted, se.onboardingCompleted);
});

/* ---------- Paritaet skipTutorial ---------- */

test('Paritaet: skipTutorial', () => {
  const se = ESM.createOnboardingState();
  const sb = ESM.createOnboardingState();
  ESM.skipTutorial(se);
  Browser.skipTutorial(sb);
  assert.equal(sb.skipped, se.skipped);
  assert.equal(sb.onboardingCompleted, se.onboardingCompleted);
});

/* ---------- Paritaet getWelcomeMessage ---------- */

test('Paritaet: getWelcomeMessage identisch', () => {
  assert.equal(Browser.getWelcomeMessage(), ESM.getWelcomeMessage());
});

/* ---------- Paritaet getProgressPercent ---------- */

test('Paritaet: getProgressPercent 0%', () => {
  const s = ESM.createOnboardingState();
  assert.equal(Browser.getProgressPercent(s), ESM.getProgressPercent(s));
});

test('Paritaet: getProgressPercent 50%', () => {
  const s = ESM.createOnboardingState();
  s.stepsTotal = 4;
  s.currentStep = 2;
  assert.equal(Browser.getProgressPercent(s), ESM.getProgressPercent(s));
});

test('Paritaet: getProgressPercent 100%', () => {
  const s = ESM.createOnboardingState();
  s.onboardingCompleted = true;
  assert.equal(Browser.getProgressPercent(s), ESM.getProgressPercent(s));
});