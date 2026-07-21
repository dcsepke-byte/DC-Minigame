/**
 * Bounce Survival — Spiellogik (browser-frei, testbar)
 *
 * Reine Logik ohne DOM-Abhaengigkeiten.
 * Das UI-Modul nutzt diese Funktionen.
 *
 * Konzept:
 *  - Ball springt im Spielfeld (Wande oben/links/rechts)
 *  - Paddle unten, bewegt sich nur horizontal
 *  - Ball prallt am Paddle ab (Winkel abhaengig vom Trefferpunkt)
 *  - Ball faellt unter Paddle -> miss +1, Ball wird resettet
 *  - maxMisses erreicht -> Game Over
 *  - Geschwindigkeit steigt mit der Zeit
 *  - Score = Survival-Zeit + Bounce-Bonus
 */

/**
 * Erstellt den Startzustand fuer ein Bounce Survival Spiel.
 * @param {{maxMisses?:number, stageWidth?:number, stageHeight?:number, ballRadius?:number, paddleWidth?:number, paddleHeight?:number, ballSpeed?:number}} opts
 * @returns {BounceSurvivalState}
 */
export function createBounceSurvivalState(opts = {}) {
  const stageWidth = opts.stageWidth ?? 300;
  const stageHeight = opts.stageHeight ?? 600;
  const ballRadius = opts.ballRadius ?? 10;
  const paddleWidth = opts.paddleWidth ?? 80;
  const paddleHeight = opts.paddleHeight ?? 14;
  const ballSpeed = opts.ballSpeed ?? 0.25; // px/ms

  // Ball startet in der Mitte, bewegt sich diagonal nach unten
  const angle = (Math.random() * 0.4 + 0.3) * Math.PI; // 54-126 Grad
  const vx = Math.cos(angle) * ballSpeed * (Math.random() < 0.5 ? -1 : 1);
  const vy = Math.abs(Math.sin(angle)) * ballSpeed; // immer positiv (nach unten)

  return {
    ball: {
      x: stageWidth / 2,
      y: stageHeight * 0.35,
      vx,
      vy,
      radius: ballRadius,
    },
    paddle: {
      x: stageWidth / 2, // Zentrum
      y: stageHeight - 40,
      width: paddleWidth,
      height: paddleHeight,
    },
    score: 0,
    misses: 0,
    maxMisses: opts.maxMisses ?? 3,
    bounces: 0,
    gameOver: false,
    stageWidth,
    stageHeight,
    ballSpeed,
  };
}

/** @returns {any} */
export function getPaddle(state) { return state.paddle; }
/** @returns {any} */
export function getBall(state) { return state.ball; }
export function getMisses(state) { return state.misses; }
export function getScore(state) { return state.score; }
export function getBounces(state) { return state.bounces; }
export function isGameOver(state) { return state.gameOver; }

/**
 * Bewegt das Paddle zur gegebenen x-Position (Zentrum).
 * Klemmt an Buehnenraendern unter Beruecksichtigung der Haelfte der Breite.
 * @param {BounceSurvivalState} state
 * @param {number} x - gewuenschte x-Position (Zentrum)
 */
export function movePaddle(state, x) {
  const half = state.paddle.width / 2;
  state.paddle.x = Math.max(half, Math.min(state.stageWidth - half, x));
}

/**
 * Bewegt den Ball, prueft Wand- und Paddle-Kollisionen.
 * @param {BounceSurvivalState} state
 * @param {number} dt - Delta-Zeit in ms
 * @returns {Array<{type:string}>} Events
 */
export function tickBall(state, dt) {
  const events = [];
  if (state.gameOver) return events;

  const b = state.ball;
  const r = b.radius;

  // Bewegen
  b.x += b.vx * dt;
  b.y += b.vy * dt;

  // Wand links
  if (b.x - r < 0) {
    b.x = r;
    b.vx = Math.abs(b.vx);
    events.push({ type: 'wall', side: 'left' });
  }
  // Wand rechts
  if (b.x + r > state.stageWidth) {
    b.x = state.stageWidth - r;
    b.vx = -Math.abs(b.vx);
    events.push({ type: 'wall', side: 'right' });
  }
  // Wand oben
  if (b.y - r < 0) {
    b.y = r;
    b.vy = Math.abs(b.vy);
    events.push({ type: 'wall', side: 'top' });
  }

  // Paddle-Kollision: Ball kommt von oben (vy > 0) und trifft Paddle-Oberflaeche
  const p = state.paddle;
  const paddleTop = p.y;
  const paddleLeft = p.x - p.width / 2;
  const paddleRight = p.x + p.width / 2;
  if (b.vy > 0 && b.y + r >= paddleTop && b.y - r <= paddleTop + p.height &&
      b.x >= paddleLeft && b.x <= paddleRight) {
    // Auf Y zuruecksetzen, vy umkehren
    b.y = paddleTop - r;
    b.vy = -Math.abs(b.vy);
    // Winkel abhaengig vom Trefferpunkt: -1 (links) bis +1 (rechts)
    const hitOffset = (b.x - p.x) / (p.width / 2); // -1 .. +1
    const speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
    // Winkel: 0 Grad (senkrecht) bei Mitte, bis ~60 Grad am Rand
    const maxAngle = Math.PI / 3; // 60 Grad
    const angle = hitOffset * maxAngle;
    b.vx = speed * Math.sin(angle);
    b.vy = -Math.abs(speed * Math.cos(angle)); // immer nach oben
    state.bounces++;
    events.push({ type: 'paddle' });
  }

  // Ball unter Bildschirm -> miss
  if (b.y - r >= state.stageHeight) {
    state.misses++;
    events.push({ type: 'miss' });
    if (state.misses >= state.maxMisses) {
      state.gameOver = true;
    } else {
      resetBall(state);
    }
  }

  return events;
}

/**
 * Setzt den Ball in die Mitte zurueck.
 * @param {BounceSurvivalState} state
 */
export function resetBall(state) {
  const speed = state.ballSpeed;
  const angle = (Math.random() * 0.4 + 0.3) * Math.PI;
  state.ball.x = state.stageWidth / 2;
  state.ball.y = state.stageHeight * 0.35;
  state.ball.vx = Math.cos(angle) * speed * (Math.random() < 0.5 ? -1 : 1);
  state.ball.vy = Math.abs(Math.sin(angle)) * speed;
}

/**
 * Erhoeht die Ballgeschwindigkeit um den gegebenen Faktor.
 * Behaelt die Richtung (Vorzeichen) bei.
 * @param {BounceSurvivalState} state
 * @param {number} factor - Multiplikator (z.B. 1.1 fuer 10% schneller)
 */
export function increaseSpeed(state, factor) {
  state.ball.vx *= factor;
  state.ball.vy *= factor;
}

/**
 * Berechnet den Survival-Score basierend auf ueberlebter Zeit.
 * @param {number} ms - ueberlebte Zeit in Millisekunden
 * @returns {number}
 */
export function computeSurvivalScore(ms) {
  if (ms <= 0) return 0;
  return Math.floor(ms / 10);
}

/**
 * Berechnet den Bounce-Bonus basierend auf Anzahl Bounces.
 * @param {number} bounces - Anzahl Paddle-Treffer
 * @returns {number}
 */
export function computeBounceBonus(bounces) {
  if (bounces <= 0) return 0;
  return bounces * 50;
}