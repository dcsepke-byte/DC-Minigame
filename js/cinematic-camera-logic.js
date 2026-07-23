/**
 * Cinematic Camera — Spiellogik (browser-frei, testbar)
 *
 * Reine Logik fuer filmische Kamera-Fuehrung bei Board-Zuegen:
 *  - State-Machine: idle -> dice_roll -> pawn_move -> settle -> idle
 *  - Kamera-Positionsberechnung pro Phase (Uebersicht, Wuerfel-Drama, Zug-Verfolgung, Lande-Closeup)
 *  - Smooth Interpolation-Parameter (Speed pro Phase)
 *  - FOV-Dynamik (weit bei Wuerfel, eng bei Zug)
 *  - Settle-Auto-Transition nach duration
 */

/** Moegliche Phasen der Kamera-State-Machine. */
export const PHASES = {
  IDLE: 'idle',
  DICE_ROLL: 'dice_roll',
  PAWN_MOVE: 'pawn_move',
  SETTLE: 'settle',
  GAME: 'game',
};

/** Settle-Dauer in ms — wie lange die Kamera nach Landung auf dem Zielfeld verweilt. */
const SETTLE_DURATION_MS = 1200;

/**
 * Erzeugt einen neuen Kamera-State.
 * @returns {{phase:string,active:boolean,settleStartTime:?number,moveStartPos:?object}}
 */
export function createCameraState() {
  return {
    phase: PHASES.IDLE,
    active: false,
    settleStartTime: null,
    moveStartPos: null,
  };
}

/**
 * Setzt die Phase und aktualisiert active-Flag.
 * @param {object} state - Kamera-State
 * @param {string} phase - Neue Phase
 */
export function setPhase(state, phase) {
  state.phase = phase;
  state.active = (phase !== PHASES.IDLE);
  if (phase !== PHASES.SETTLE) {
    state.settleStartTime = null;
  }
}

/**
 * Gibt die aktuelle Phase zurueck.
 */
export function getPhase(state) {
  return state.phase;
}

/**
 * Startet die Wuerfel-Cinematic — Kamera zieht zurueck fuer Dramatik.
 */
export function startDiceRoll(state, pawnPos) {
  setPhase(state, PHASES.DICE_ROLL);
}

/**
 * Beendet die Wuerfel-Cinematic — zurueck zu idle (oder follow wenn Zug folgt).
 */
export function finishDiceRoll(state) {
  setPhase(state, PHASES.IDLE);
}

/**
 * Startet die Zug-Verfolgung — Kamera folgt dem Pawn von schraeg hinten.
 */
export function startPawnMove(state, pawnPos) {
  state.moveStartPos = pawnPos ? { x: pawnPos.x, y: pawnPos.y, z: pawnPos.z } : null;
  setPhase(state, PHASES.PAWN_MOVE);
}

/**
 * Beendet den Zug — Uebergang in settle-Phase (Lande-Closeup).
 */
export function finishPawnMove(state) {
  setPhase(state, PHASES.SETTLE);
  state.settleStartTime = Date.now();
}

/* ---- Auto-Transition: settle -> idle nach SETTLE_DURATION_MS ---- */
function checkSettleExpiry(state) {
  if (state.phase === PHASES.SETTLE && state.settleStartTime != null) {
    if (Date.now() - state.settleStartTime >= SETTLE_DURATION_MS) {
      setPhase(state, PHASES.IDLE);
      state.settleStartTime = null;
    }
  }
}

/**
 * Berechnet das Kamera-Ziel (Position + LookAt) fuer die aktuelle Phase.
 * @param {object} state - Kamera-State
 * @param {?{x:number,y:number,z:number}} pawnPos - Welt-Position des aktiven Pawns
 * @returns {{position:{x,y,z},lookAt:{x,y,z}}}
 */
export function getCameraTarget(state, pawnPos) {
  checkSettleExpiry(state);

  const p = pawnPos || { x: 0, y: 0, z: 0 };
  const outLen = Math.hypot(p.x, p.z) || 1;

  switch (state.phase) {
    case PHASES.DICE_ROLL: {
      /* Dramatic: hoch und weit zurueck, blickt auf den Pawn */
      const camDist = 12;
      const camHeight = 14;
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
      /* Follow: naeher am Pawn, schraeg hinten-aussen */
      const camDist = 6;
      const camHeight = 6;
      return {
        position: {
          x: p.x + (p.x / outLen) * camDist,
          y: p.y + camHeight,
          z: p.z + (p.z / outLen) * camDist,
        },
        lookAt: { x: p.x, y: p.y + 0.3, z: p.z },
      };
    }
    case PHASES.SETTLE: {
      /* Closeup: aehnlich pawn_move aber etwas naeher und hoeher fuer Lande-Effekt */
      const camDist = 5;
      const camHeight = 7;
      return {
        position: {
          x: p.x + (p.x / outLen) * camDist,
          y: p.y + camHeight,
          z: p.z + (p.z / outLen) * camDist,
        },
        lookAt: { x: p.x, y: p.y + 0.3, z: p.z },
      };
    }
    case PHASES.GAME: {
      /* Arena-Ansicht fuer Minispiele */
      return {
        position: { x: 0, y: 8.2, z: 11.4 },
        lookAt: { x: 0, y: 0.25, z: 0 },
      };
    }
    default: {
      /* IDLE: Uebersicht — hoch, zentriert */
      return {
        position: { x: 0, y: 14, z: 14 },
        lookAt: { x: 0, y: 0, z: 0 },
      };
    }
  }
}

/**
 * Interpolations-Speed pro Phase — bestimmt wie schnell die Kamera sich bewegt.
 * Hoeher = schnelle Bewegung, niedriger = langsam/dramatisch.
 */
export function getInterpolationSpeed(state) {
  switch (state.phase) {
    case PHASES.PAWN_MOVE: return 0.08;   /* schnell — folgt dem hupfenden Pawn */
    case PHASES.SETTLE:    return 0.06;   /* mittelschnell — sanftes Einpendeln */
    case PHASES.DICE_ROLL: return 0.018;  /* langsam — dramatisches Zurueckziehen */
    case PHASES.GAME:      return 0.045;
    default:               return 0.045;  /* idle */
  }
}

/**
 * FOV (Field of View) pro Phase — bestimmt den "Zoom"-Effekt.
 * Hoeher = weiterer Blickwinkel (weniger Zoom), niedriger = enger/naeher.
 */
export function getFov(state) {
  switch (state.phase) {
    case PHASES.DICE_ROLL: return 55;     /* weit — dramatischer Zoom-out */
    case PHASES.PAWN_MOVE: return 38;     /* eng — close-up Verfolgung */
    case PHASES.SETTLE:    return 40;     /* leicht eng — Lande-Closeup */
    case PHASES.GAME:      return 42;
    default:               return 42;     /* idle = default */
  }
}

/**
 * Ob die Kamera in der aktuellen Phase auf den Pawn schauen soll.
 * idle = auf Board-Mitte, alle anderen = auf Pawn.
 */
export function shouldLookAtPawn(state) {
  return state.phase !== PHASES.IDLE;
}

/**
 * Ob aktuell eine Cinematic-Phase aktiv ist (nicht idle).
 */
export function isCinematicActive(state) {
  return state.active;
}