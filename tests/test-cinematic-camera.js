/**
 * Cinematic Camera — Unit-Tests
 *
 * Testet die reine Logik fuer filmische Kamera-Fuehrung:
 *  - State-Machine (idle, dice_roll, pawn_move, settle)
 *  - Kamera-Positionsberechnung pro Phase
 *  - Smooth Interpolation-Parameter
 *  - Zoom-Dynamik (auszoomen bei Wuerfel, verfolgen bei Zug, naeher beim Landen)
 */

import {
  createCameraState,
  setPhase,
  getPhase,
  getCameraTarget,
  startDiceRoll,
  startPawnMove,
  finishPawnMove,
  finishDiceRoll,
  getInterpolationSpeed,
  getFov,
  shouldLookAtPawn,
  isCinematicActive,
} from '../js/cinematic-camera-logic.js';

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) { passed++; }
  else { failed++; console.error('FAIL: ' + msg); }
}

function assertApprox(actual, expected, tolerance, msg) {
  assert(Math.abs(actual - expected) <= tolerance, `${msg} (got ${actual}, expected ~${expected})`);
}

/* ===== Tracer Bullet 1: State-Machine ===== */

function test_createCameraState_returnsIdle() {
  const cs = createCameraState();
  assert(cs.phase === 'idle', 'createCameraState should start in idle phase');
  assert(cs.active === false, 'createCameraState should not be active');
}

function test_setPhase_transitionsState() {
  const cs = createCameraState();
  setPhase(cs, 'pawn_move');
  assert(cs.phase === 'pawn_move', 'setPhase should update phase');
  assert(cs.active === true, 'setPhase to non-idle should set active=true');
}

function test_setPhase_toIdle_deactivates() {
  const cs = createCameraState();
  setPhase(cs, 'pawn_move');
  setPhase(cs, 'idle');
  assert(cs.phase === 'idle', 'setPhase to idle should update phase');
  assert(cs.active === false, 'setPhase to idle should set active=false');
}

function test_getPhase_returnsCurrentPhase() {
  const cs = createCameraState();
  setPhase(cs, 'dice_roll');
  assert(getPhase(cs) === 'dice_roll', 'getPhase should return current phase');
}

/* ===== Tracer Bullet 2: Camera Position Calculation ===== */

function test_getCameraTarget_idle_returnsOverview() {
  const cs = createCameraState();
  const t = getCameraTarget(cs, { x: 5, y: 2, z: 3 });
  // Idle = Uebersicht: hoch und weiter weg
  assert(t.position.y > 10, 'idle camera should be high up (y > 10)');
  assert(t.lookAt.x === 0 && t.lookAt.z === 0, 'idle camera should look at board center');
}

function test_getCameraTarget_diceRoll_zoomsOut() {
  const cs = createCameraState();
  const pawnPos = { x: 5, y: 2, z: 3 };
  startDiceRoll(cs, pawnPos);
  const t = getCameraTarget(cs, pawnPos);
  // Bei Wuerfel: Kamera zieht weiter zurueck fuer Dramatik
  const idleT = getCameraTarget(createCameraState(), pawnPos);
  assert(t.position.y > idleT.position.y, 'dice_roll camera should be higher than idle');
  assert(t.lookAt.x === pawnPos.x && t.lookAt.z === pawnPos.z, 'dice_roll should look at pawn');
}

function test_getCameraTarget_pawnMove_followsClose() {
  const cs = createCameraState();
  const pawnPos = { x: 5, y: 2, z: 3 };
  startPawnMove(cs, pawnPos);
  const t = getCameraTarget(cs, pawnPos);
  // Bei Zug: Kamera naeher am Pawn, folgt von schraeg hinten
  const idleT = getCameraTarget(createCameraState(), pawnPos);
  assert(t.position.y < idleT.position.y, 'pawn_move camera should be lower than idle (closer)');
  assert(t.lookAt.x === pawnPos.x && t.lookAt.z === pawnPos.z, 'pawn_move should look at pawn');
  // Kamera steht hinter dem Pawn (weiter aussen)
  const distToCenter = Math.hypot(pawnPos.x, pawnPos.z);
  const camDistToCenter = Math.hypot(t.position.x, t.position.z);
  assert(camDistToCenter > distToCenter, 'pawn_move camera should be further out than pawn');
}

function test_getCameraTarget_settle_closeup() {
  const cs = createCameraState();
  const pawnPos = { x: 5, y: 2, z: 3 };
  startPawnMove(cs, pawnPos);
  finishPawnMove(cs);
  assert(cs.phase === 'settle', 'finishPawnMove should transition to settle');
  const t = getCameraTarget(cs, pawnPos);
  // Settle: naeher als idle, zeigt das Zielfeld
  assert(t.lookAt.x === pawnPos.x && t.lookAt.z === pawnPos.z, 'settle should look at pawn');
}

function test_getCameraTarget_game_returnsArenaView() {
  const cs = createCameraState();
  setPhase(cs, 'game');
  const t = getCameraTarget(cs, { x: 0, y: 0, z: 0 });
  assertApprox(t.position.y, 8.2, 1.0, 'game camera y should be ~8.2');
  assertApprox(t.position.z, 11.4, 1.0, 'game camera z should be ~11.4');
}

/* ===== Tracer Bullet 3: Dice Roll Cinematic ===== */

function test_startDiceRoll_setsPhase() {
  const cs = createCameraState();
  startDiceRoll(cs, { x: 0, y: 0, z: 0 });
  assert(cs.phase === 'dice_roll', 'startDiceRoll should set phase to dice_roll');
  assert(cs.active === true, 'startDiceRoll should set active=true');
}

function test_finishDiceRoll_transitionsToIdleOrFollow() {
  const cs = createCameraState();
  startDiceRoll(cs, { x: 0, y: 0, z: 0 });
  finishDiceRoll(cs);
  assert(cs.phase === 'idle' || cs.phase === 'follow', 'finishDiceRoll should go to idle or follow');
}

/* ===== Tracer Bullet 4: Pawn Move Tracking ===== */

function test_startPawnMove_setsPhaseAndStoresTarget() {
  const cs = createCameraState();
  const pos = { x: 3, y: 1, z: 4 };
  startPawnMove(cs, pos);
  assert(cs.phase === 'pawn_move', 'startPawnMove should set phase to pawn_move');
  assert(cs.moveStartPos.x === 3, 'startPawnMove should store start position');
}

function test_finishPawnMove_transitionsToSettle() {
  const cs = createCameraState();
  startPawnMove(cs, { x: 0, y: 0, z: 0 });
  finishPawnMove(cs);
  assert(cs.phase === 'settle', 'finishPawnMove should set phase to settle');
}

function test_settleAutoTransitionsToIdle() {
  const cs = createCameraState();
  startPawnMove(cs, { x: 0, y: 0, z: 0 });
  finishPawnMove(cs);
  assert(cs.phase === 'settle', 'should be in settle');
  // Nach settleDuration -> idle
  assert(cs.settleStartTime != null, 'settle should have a start time');
  // Simulate time passing by setting start time far in past
  cs.settleStartTime = Date.now() - 5000;
  // getCameraTarget with auto-transition check
  getCameraTarget(cs, { x: 0, y: 0, z: 0 });
  assert(cs.phase === 'idle', 'settle should auto-transition to idle after duration');
}

/* ===== Tracer Bullet 5: Interpolation + FOV ===== */

function test_getInterpolationSpeed_pawnMove_isFaster() {
  const cs = createCameraState();
  const idleSpeed = getInterpolationSpeed(createCameraState());
  startPawnMove(cs, { x: 0, y: 0, z: 0 });
  const moveSpeed = getInterpolationSpeed(cs);
  assert(moveSpeed > idleSpeed, 'pawn_move interpolation should be faster than idle');
}

function test_getInterpolationSpeed_diceRoll_isSlower() {
  const cs = createCameraState();
  const idleSpeed = getInterpolationSpeed(createCameraState());
  startDiceRoll(cs, { x: 0, y: 0, z: 0 });
  const diceSpeed = getInterpolationSpeed(cs);
  assert(diceSpeed < idleSpeed, 'dice_roll interpolation should be slower (dramatic)');
}

function test_getFov_diceRoll_isWider() {
  const cs = createCameraState();
  const idleFov = getFov(createCameraState());
  startDiceRoll(cs, { x: 0, y: 0, z: 0 });
  const diceFov = getFov(cs);
  assert(diceFov > idleFov, 'dice_roll FOV should be wider (dramatic zoom-out effect)');
}

function test_getFov_pawnMove_isNarrower() {
  const cs = createCameraState();
  const idleFov = getFov(createCameraState());
  startPawnMove(cs, { x: 0, y: 0, z: 0 });
  const moveFov = getFov(cs);
  assert(moveFov < idleFov, 'pawn_move FOV should be narrower (close-up feel)');
}

/* ===== Tracer Bullet 6: LookAt + Active checks ===== */

function test_shouldLookAtPawn_idle_returnsFalse() {
  const cs = createCameraState();
  assert(shouldLookAtPawn(cs) === false, 'idle should not look at pawn (look at center)');
}

function test_shouldLookAtPawn_pawnMove_returnsTrue() {
  const cs = createCameraState();
  startPawnMove(cs, { x: 0, y: 0, z: 0 });
  assert(shouldLookAtPawn(cs) === true, 'pawn_move should look at pawn');
}

function test_shouldLookAtPawn_diceRoll_returnsTrue() {
  const cs = createCameraState();
  startDiceRoll(cs, { x: 0, y: 0, z: 0 });
  assert(shouldLookAtPawn(cs) === true, 'dice_roll should look at pawn');
}

function test_shouldLookAtPawn_settle_returnsTrue() {
  const cs = createCameraState();
  startPawnMove(cs, { x: 0, y: 0, z: 0 });
  finishPawnMove(cs);
  assert(shouldLookAtPawn(cs) === true, 'settle should look at pawn');
}

function test_isCinematicActive_idle_returnsFalse() {
  assert(isCinematicActive(createCameraState()) === false, 'idle should not be cinematic active');
}

function test_isCinematicActive_pawnMove_returnsTrue() {
  const cs = createCameraState();
  startPawnMove(cs, { x: 0, y: 0, z: 0 });
  assert(isCinematicActive(cs) === true, 'pawn_move should be cinematic active');
}

/* ===== Edge Cases ===== */

function test_startPawnMove_overwritesDiceRoll() {
  const cs = createCameraState();
  startDiceRoll(cs, { x: 0, y: 0, z: 0 });
  startPawnMove(cs, { x: 1, y: 0, z: 1 });
  assert(cs.phase === 'pawn_move', 'startPawnMove should override dice_roll phase');
}

function test_getCameraTarget_nullPawnPos_fallsBack() {
  const cs = createCameraState();
  const t = getCameraTarget(cs, null);
  assert(t !== null, 'getCameraTarget with null pawnPos should not crash');
  assert(t.lookAt.x === 0, 'getCameraTarget with null should look at center');
}

/* ===== Run all tests ===== */

const tests = [
  test_createCameraState_returnsIdle,
  test_setPhase_transitionsState,
  test_setPhase_toIdle_deactivates,
  test_getPhase_returnsCurrentPhase,
  test_getCameraTarget_idle_returnsOverview,
  test_getCameraTarget_diceRoll_zoomsOut,
  test_getCameraTarget_pawnMove_followsClose,
  test_getCameraTarget_settle_closeup,
  test_getCameraTarget_game_returnsArenaView,
  test_startDiceRoll_setsPhase,
  test_finishDiceRoll_transitionsToIdleOrFollow,
  test_startPawnMove_setsPhaseAndStoresTarget,
  test_finishPawnMove_transitionsToSettle,
  test_settleAutoTransitionsToIdle,
  test_getInterpolationSpeed_pawnMove_isFaster,
  test_getInterpolationSpeed_diceRoll_isSlower,
  test_getFov_diceRoll_isWider,
  test_getFov_pawnMove_isNarrower,
  test_shouldLookAtPawn_idle_returnsFalse,
  test_shouldLookAtPawn_pawnMove_returnsTrue,
  test_shouldLookAtPawn_diceRoll_returnsTrue,
  test_shouldLookAtPawn_settle_returnsTrue,
  test_isCinematicActive_idle_returnsFalse,
  test_isCinematicActive_pawnMove_returnsTrue,
  test_startPawnMove_overwritesDiceRoll,
  test_getCameraTarget_nullPawnPos_fallsBack,
];

tests.forEach(fn => {
  try { fn(); }
  catch (e) { failed++; console.error('ERROR in ' + fn.name + ': ' + e.message); }
});

console.log(`\n${passed}/${tests.length} passed, ${failed} failed`);
if (failed > 0) process.exit(1);