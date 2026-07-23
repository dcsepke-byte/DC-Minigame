/**
 * Cinematic Camera — Logik (Browser-Kompatibel, IIFE)
 *
 * Gleiche Logik wie cinematic-camera-logic.js (ESM),
 * aber als IIFE fuer <script>-Tag ohne Module-Loader.
 */
(function () {
  'use strict';

  var PHASES = {
    IDLE: 'idle',
    DICE_ROLL: 'dice_roll',
    PAWN_MOVE: 'pawn_move',
    SETTLE: 'settle',
    GAME: 'game',
  };

  var SETTLE_DURATION_MS = 1200;

  function createCameraState() {
    return {
      phase: PHASES.IDLE,
      active: false,
      settleStartTime: null,
      moveStartPos: null,
    };
  }

  function setPhase(state, phase) {
    state.phase = phase;
    state.active = (phase !== PHASES.IDLE);
    if (phase !== PHASES.SETTLE) {
      state.settleStartTime = null;
    }
  }

  function getPhase(state) {
    return state.phase;
  }

  function startDiceRoll(state, pawnPos) {
    setPhase(state, PHASES.DICE_ROLL);
  }

  function finishDiceRoll(state) {
    setPhase(state, PHASES.IDLE);
  }

  function startPawnMove(state, pawnPos) {
    state.moveStartPos = pawnPos ? { x: pawnPos.x, y: pawnPos.y, z: pawnPos.z } : null;
    setPhase(state, PHASES.PAWN_MOVE);
  }

  function finishPawnMove(state) {
    setPhase(state, PHASES.SETTLE);
    state.settleStartTime = Date.now();
  }

  function checkSettleExpiry(state) {
    if (state.phase === PHASES.SETTLE && state.settleStartTime != null) {
      if (Date.now() - state.settleStartTime >= SETTLE_DURATION_MS) {
        setPhase(state, PHASES.IDLE);
        state.settleStartTime = null;
      }
    }
  }

  function getCameraTarget(state, pawnPos) {
    checkSettleExpiry(state);
    var p = pawnPos || { x: 0, y: 0, z: 0 };
    var outLen = Math.hypot(p.x, p.z) || 1;

    switch (state.phase) {
      case PHASES.DICE_ROLL: {
        var camDist = 12, camHeight = 14;
        return {
          position: {
            x: p.x + (p.x / outLen) * camDist,
            y: p.y + camHeight,
            z: p.z + (p.z / outLen) * camDist,
          },
          lookAt: { x: p.x, y: p.y + 0.5, z: p.z },
        };
      }
      case PHASES.PAWN_MOVE: {
        var camDist2 = 6, camHeight2 = 6;
        return {
          position: {
            x: p.x + (p.x / outLen) * camDist2,
            y: p.y + camHeight2,
            z: p.z + (p.z / outLen) * camDist2,
          },
          lookAt: { x: p.x, y: p.y + 0.3, z: p.z },
        };
      }
      case PHASES.SETTLE: {
        var camDist3 = 5, camHeight3 = 7;
        return {
          position: {
            x: p.x + (p.x / outLen) * camDist3,
            y: p.y + camHeight3,
            z: p.z + (p.z / outLen) * camDist3,
          },
          lookAt: { x: p.x, y: p.y + 0.3, z: p.z },
        };
      }
      case PHASES.GAME: {
        return {
          position: { x: 0, y: 8.2, z: 11.4 },
          lookAt: { x: 0, y: 0.25, z: 0 },
        };
      }
      default: {
        return {
          position: { x: 0, y: 14, z: 14 },
          lookAt: { x: 0, y: 0, z: 0 },
        };
      }
    }
  }

  function getInterpolationSpeed(state) {
    switch (state.phase) {
      case PHASES.PAWN_MOVE: return 0.08;
      case PHASES.SETTLE:    return 0.06;
      case PHASES.DICE_ROLL: return 0.018;
      case PHASES.GAME:      return 0.045;
      default:               return 0.045;
    }
  }

  function getFov(state) {
    switch (state.phase) {
      case PHASES.DICE_ROLL: return 55;
      case PHASES.PAWN_MOVE: return 38;
      case PHASES.SETTLE:    return 40;
      case PHASES.GAME:      return 42;
      default:               return 42;
    }
  }

  function shouldLookAtPawn(state) {
    return state.phase !== PHASES.IDLE;
  }

  function isCinematicActive(state) {
    return state.active;
  }

  window.CinematicCamera = {
    PHASES: PHASES,
    createCameraState: createCameraState,
    setPhase: setPhase,
    getPhase: getPhase,
    startDiceRoll: startDiceRoll,
    finishDiceRoll: finishDiceRoll,
    startPawnMove: startPawnMove,
    finishPawnMove: finishPawnMove,
    getCameraTarget: getCameraTarget,
    getInterpolationSpeed: getInterpolationSpeed,
    getFov: getFov,
    shouldLookAtPawn: shouldLookAtPawn,
    isCinematicActive: isCinematicActive,
  };
})();