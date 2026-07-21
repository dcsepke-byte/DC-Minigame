/**
 * Dodgeball — Spiellogik (browser-frei, testbar)
 *
 * Reine Logik ohne DOM-Abhaengigkeiten.
 * Das UI-Modul nutzt diese Funktionen.
 *
 * Konzept:
 *  - Spieler-Figur am unteren Bildschirmrand (x, y, radius)
 *  - Baelle fliegen von den Raendern herein (vx, vy, radius)
 *  - Spieler bewegt sich in alle Richtungen (Tasten/Touch/Joystick)
 *  - Ball trifft Spieler (Distanz < Summe Radien) -> hit +1, Ball entfernt
 *  - Ball verlaesst Bildschirm (mit Margin) -> Ball entfernt (kein hit)
 *  - Ball knapp vorbei (innerhalb close-call Toleranz) -> closecall Event
 *  - maxHits erreicht -> Game Over
 *  - Score steigt mit ueberlebter Zeit + Close-Call-Bonus
 */

let _nextId = 1;

/**
 * Erstellt den Startzustand fuer ein Dodgeball-Spiel.
 * @param {{maxHits?:number, stageWidth?:number, stageHeight?:number, playerRadius?:number, playerYRatio?:number}} opts
 * @returns {DodgeballState}
 */
export function createDodgeballState(opts = {}) {
  const stageWidth = opts.stageWidth ?? 300;
  const stageHeight = opts.stageHeight ?? 600;
  const playerRadius = opts.playerRadius ?? 20;
  const playerYRatio = opts.playerYRatio ?? 0.82;
  return {
    balls: [],
    score: 0,
    hits: 0,
    maxHits: opts.maxHits ?? 3,
    gameOver: false,
    stageWidth,
    stageHeight,
    player: {
      x: stageWidth / 2,
      y: Math.round(stageHeight * playerYRatio),
      radius: playerRadius,
    },
    closeCallTolerance: 15,
  };
}

/**
 * Erzeugt einen neuen Ball der vom angegebenen Rand einfliegt.
 * @param {DodgeballState} state
 * @param {'top'|'bottom'|'left'|'right'} side
 * @param {number} speed - Geschwindigkeit in px/ms
 * @returns {Ball}
 */
export function spawnBall(state, side, speed) {
  const sw = state.stageWidth;
  const sh = state.stageHeight;
  const radius = 16;
  let x, y, vx, vy;

  // Leicht diagonal fuer mehr Herausforderung
  const diagVariance = 0.3; // Anteil der diagonalen Geschwindigkeit

  if (side === 'top') {
    x = Math.random() * sw;
    y = -radius;
    vx = (Math.random() - 0.5) * speed * diagVariance;
    vy = speed;
  } else if (side === 'bottom') {
    x = Math.random() * sw;
    y = sh + radius;
    vx = (Math.random() - 0.5) * speed * diagVariance;
    vy = -speed;
  } else if (side === 'left') {
    x = -radius;
    y = Math.random() * sh * 0.7 + sh * 0.15;
    vx = speed;
    vy = (Math.random() - 0.5) * speed * diagVariance;
  } else { // right
    x = sw + radius;
    y = Math.random() * sh * 0.7 + sh * 0.15;
    vx = -speed;
    vy = (Math.random() - 0.5) * speed * diagVariance;
  }

  const ball = {
    id: _nextId++,
    x, y, vx, vy,
    radius,
    side,
  };
  state.balls.push(ball);
  return ball;
}

/**
 * Bewegt den Spieler zur gegebenen Position (Zentrum des Spielers).
 * Klemmt an Buehnenraendern unter Beruecksichtigung des Radius.
 * @param {DodgeballState} state
 * @param {number} x - gewuenschte x-Position (Zentrum)
 * @param {number} y - gewuenschte y-Position (Zentrum)
 */
export function movePlayer(state, x, y) {
  const r = state.player.radius;
  state.player.x = Math.max(r, Math.min(state.stageWidth - r, x));
  state.player.y = Math.max(r, Math.min(state.stageHeight - r, y));
}

/**
 * Bewegt den Spieler um ein Delta.
 * @param {DodgeballState} state
 * @param {number} dx
 * @param {number} dy
 */
export function movePlayerBy(state, dx, dy) {
  movePlayer(state, state.player.x + dx, state.player.y + dy);
}

/**
 * Berechnet den Survival-Score basierend auf ueberlebter Zeit.
 * @param {number} ms - ueberlebte Zeit in Millisekunden
 * @returns {number}
 */
export function computeSurvivalScore(ms) {
  if (ms <= 0) return 0;
  // 1 Punkt pro 10ms = 100 Punkte pro Sekunde
  return Math.floor(ms / 10);
}

/**
 * Berechnet den Close-Call-Bonus.
 * @param {number} distance - Distanz zwischen Ball und Spieler-Zentren
 * @param {number} playerRadius
 * @param {number} ballRadius
 * @param {number} tolerance - zusaetzliche Toleranz in px
 * @returns {number}
 */
export function computeCloseCallBonus(distance, playerRadius, ballRadius, tolerance) {
  const collisionDist = playerRadius + ballRadius;
  const closeCallDist = collisionDist + tolerance;
  if (distance > closeCallDist) return 0;
  if (distance < collisionDist) return 0; // echte Kollision ist kein close-call
  // Je naeher an Kollision, desto mehr Bonus
  // Bonus = tolerance (max) wenn direkt nach Kollision, linear abnehmend
  const t = (closeCallDist - distance) / tolerance;
  return Math.round(tolerance * t);
}

/**
 * Berechnet die Distanz zwischen zwei Punkten.
 * @param {number} x1
 * @param {number} y1
 * @param {number} x2
 * @param {number} y2
 * @returns {number}
 */
function dist(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Prueft ob ein Ball den Bildschirm verlassen hat (mit Margin).
 * @param {Ball} ball
 * @param {number} sw
 * @param {number} sh
 * @returns {boolean}
 */
function isOffScreen(ball, sw, sh) {
  const margin = ball.radius + 20;
  return ball.x < -margin || ball.x > sw + margin ||
         ball.y < -margin || ball.y > sh + margin;
}

/**
 * Bewegt alle Baelle, prueft Kollisionen und Bildschirm-Verlassen.
 * @param {DodgeballState} state
 * @param {number} dt - Delta-Zeit in ms
 * @returns {Array<{type:string, ball?:Ball}>} Events
 */
export function tickBalls(state, dt) {
  const events = [];
  if (state.gameOver) return events;

  const survivors = [];
  for (const b of state.balls) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;

    const d = dist(b.x, b.y, state.player.x, state.player.y);
    const collisionDist = b.radius + state.player.radius;

    // Kollision
    if (d <= collisionDist) {
      events.push({ type: 'hit', ball: b });
      state.hits++;
      if (state.hits >= state.maxHits) state.gameOver = true;
      continue; // Ball entfernt
    }

    // Close Call: Ball ist nah, aber keine Kollision
    const closeCallDist = collisionDist + state.closeCallTolerance;
    if (d <= closeCallDist) {
      events.push({ type: 'closecall', ball: b });
    }

    // Bildschirm verlassen
    if (isOffScreen(b, state.stageWidth, state.stageHeight)) {
      events.push({ type: 'escaped', ball: b });
      continue; // Ball entfernt
    }

    survivors.push(b);
  }
  state.balls = survivors;
  return events;
}

/**
 * Prueft ob das Spiel vorbei ist.
 * @param {DodgeballState} state
 * @returns {boolean}
 */
export function isGameOver(state) {
  return state.gameOver;
}

/**
 * Gibt die Anzahl Treffer zurueck.
 * @param {DodgeballState} state
 * @returns {number}
 */
export function getHits(state) {
  return state.hits;
}

/**
 * Gibt den aktuellen Score zurueck.
 * @param {DodgeballState} state
 * @returns {number}
 */
export function getScore(state) {
  return state.score;
}

/**
 * Gibt die aktiven Baelle zurueck.
 * @param {DodgeballState} state
 * @returns {Ball[]}
 */
export function getActiveBalls(state) {
  return state.balls;
}

/**
 * Gibt das Spieler-Objekt zurueck.
 * @param {DodgeballState} state
 * @returns {{x:number,y:number,radius:number}}
 */
export function getPlayer(state) {
  return state.player;
}

/**
 * @typedef {Object} Ball
 * @property {number} id
 * @property {number} x
 * @property {number} y
 * @property {number} vx
 * @property {number} vy
 * @property {number} radius
 * @property {string} side
 */

/**
 * @typedef {Object} DodgeballState
 * @property {Ball[]} balls
 * @property {number} score
 * @property {number} hits
 * @property {number} maxHits
 * @property {boolean} gameOver
 * @property {number} stageWidth
 * @property {number} stageHeight
 * @property {{x:number,y:number,radius:number}} player
 * @property {number} closeCallTolerance
 */