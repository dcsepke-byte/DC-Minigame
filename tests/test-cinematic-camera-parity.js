/**
 * Cinematic Camera — Paritaetstest ESM vs Browser
 *
 * Stellt sicher dass beide Versionen identische Ergebnisse liefern.
 */
import * as ESM from '../js/cinematic-camera-logic.js';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Browser-Version als eval im globalen Scope laden
const browserCode = readFileSync(join(__dirname, '..', 'js', 'cinematic-camera-logic-browser.js'), 'utf-8');
const sandbox = { window: {} };
const fn = new Function('window', browserCode);
fn(sandbox.window);
const Browser = sandbox.window.CinematicCamera;

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) { passed++; }
  else { failed++; console.error('FAIL: ' + msg); }
}

function assertApprox(a, b, tol, msg) {
  assert(Math.abs(a - b) <= tol, `${msg} (ESM=${a}, Browser=${b})`);
}

const scenarios = [
  { name: 'idle', setup: cs => {}, pawnPos: { x: 5, y: 2, z: 3 } },
  { name: 'dice_roll', setup: cs => ESM.startDiceRoll(cs, { x: 5, y: 2, z: 3 }), pawnPos: { x: 5, y: 2, z: 3 } },
  { name: 'pawn_move', setup: cs => ESM.startPawnMove(cs, { x: 5, y: 2, z: 3 }), pawnPos: { x: 5, y: 2, z: 3 } },
  { name: 'settle', setup: cs => { ESM.startPawnMove(cs, { x: 0, y: 0, z: 0 }); ESM.finishPawnMove(cs); }, pawnPos: { x: 5, y: 2, z: 3 } },
  { name: 'game', setup: cs => ESM.setPhase(cs, 'game'), pawnPos: { x: 0, y: 0, z: 0 } },
  { name: 'null_pawnPos', setup: cs => {}, pawnPos: null },
];

for (const sc of scenarios) {
  const esmState = ESM.createCameraState();
  const brwState = Browser.createCameraState();
  sc.setup(esmState);
  sc.setup(brwState);

  // Phase parity
  assert(ESM.getPhase(esmState) === Browser.getPhase(brwState), `${sc.name}: phase parity`);

  // Camera target parity
  const esmTarget = ESM.getCameraTarget(esmState, sc.pawnPos);
  const brwTarget = Browser.getCameraTarget(brwState, sc.pawnPos);
  assertApprox(esmTarget.position.x, brwTarget.position.x, 0.001, `${sc.name}: position.x parity`);
  assertApprox(esmTarget.position.y, brwTarget.position.y, 0.001, `${sc.name}: position.y parity`);
  assertApprox(esmTarget.position.z, brwTarget.position.z, 0.001, `${sc.name}: position.z parity`);
  assertApprox(esmTarget.lookAt.x, brwTarget.lookAt.x, 0.001, `${sc.name}: lookAt.x parity`);
  assertApprox(esmTarget.lookAt.y, brwTarget.lookAt.y, 0.001, `${sc.name}: lookAt.y parity`);
  assertApprox(esmTarget.lookAt.z, brwTarget.lookAt.z, 0.001, `${sc.name}: lookAt.z parity`);

  // Interpolation speed parity
  assertApprox(ESM.getInterpolationSpeed(esmState), Browser.getInterpolationSpeed(brwState), 0.001, `${sc.name}: interp speed parity`);

  // FOV parity
  assertApprox(ESM.getFov(esmState), Browser.getFov(brwState), 0.001, `${sc.name}: fov parity`);

  // shouldLookAtPawn parity
  assert(ESM.shouldLookAtPawn(esmState) === Browser.shouldLookAtPawn(brwState), `${sc.name}: shouldLookAtPawn parity`);

  // isCinematicActive parity
  assert(ESM.isCinematicActive(esmState) === Browser.isCinematicActive(brwState), `${sc.name}: isCinematicActive parity`);
}

console.log(`\n${passed} parity assertions passed, ${failed} failed`);
if (failed > 0) process.exit(1);