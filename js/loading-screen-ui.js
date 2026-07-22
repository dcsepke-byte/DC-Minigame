/**
 * Loading Screen — UI-Controller
 *
 * Nutzt LoadingScreenLogic fuer die reine Logik.
 * Zeigt den Loading Screen beim App-Start, simuliert Progress
 * waehrend Assets/Fonts laden, und blendet ihn sanft aus.
 */
(function () {
  'use strict';

  var overlay = document.getElementById('loading-overlay');
  var barFill = document.getElementById('loading-bar-fill');
  var percentEl = document.getElementById('loading-percent');
  if (!overlay || !window.LoadingScreenLogic) return;

  var state = LoadingScreenLogic.createLoadingState({ minDisplayMs: 900 });
  var lastUiProgress = 0;

  function updateUI() {
    var p = LoadingScreenLogic.getProgress(state);
    // Nur updaten wenn sich was geaendert hat (Animationen glatter)
    if (p === lastUiProgress) return;
    lastUiProgress = p;
    if (barFill) barFill.style.width = p + '%';
    if (percentEl) percentEl.textContent = Math.round(p) + '%';
  }

  function dismiss() {
    overlay.classList.add('hidden');
    setTimeout(function () {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }, 600);
  }

  // --- Progress simulieren: Fonts + Assets + Three.js ---
  var steps = [
    { target: 20, delay: 100 },   // Basis-DOM
    { target: 45, delay: 200 },   // Fonts
    { target: 70, delay: 300 },   // Logik-Module
    { target: 90, delay: 200 },   // Three.js / Scene
    { target: 100, delay: 150 },  // Final
  ];

  var stepIdx = 0;
  function nextStep() {
    if (stepIdx >= steps.length) {
      checkDismiss();
      return;
    }
    var s = steps[stepIdx++];
    setTimeout(function () {
      LoadingScreenLogic.updateProgress(state, s.target);
      updateUI();
      nextStep();
    }, s.delay);
  }

  function checkDismiss() {
    if (LoadingScreenLogic.canDismiss(state)) {
      dismiss();
    } else {
      // Warten bis minDisplayTime erreicht, dann dismissen
      setTimeout(checkDismiss, 100);
    }
  }

  // Start: Kurz warten damit der Loading Screen sichtbar wird
  setTimeout(function () {
    nextStep();
  }, 50);

  // Fallback: Falls window.load schon gefeuert hat oder etwas haengt
  // -> nach 3s auf jeden Fall 100% setzen
  setTimeout(function () {
    if (!LoadingScreenLogic.isComplete(state)) {
      LoadingScreenLogic.updateProgress(state, 100);
      updateUI();
      checkDismiss();
    }
  }, 3000);

  // Export fuer externen Aufruf (falls andere Module wissen wollen
  // ob der Loading Screen noch aktiv ist)
  window.PartyArenaLoading = {
    isDone: function () { return LoadingScreenLogic.isComplete(state); },
    forceComplete: function () {
      LoadingScreenLogic.updateProgress(state, 100);
      updateUI();
      checkDismiss();
    },
  };
})();