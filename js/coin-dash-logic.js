/**
 * Coin Dash — Spiellogik (browser-frei, testbar)
 *
 * Reine Logik ohne DOM-Abhaengigkeiten.
 * Das UI-Modul nutzt diese Funktionen.
 *
 * Konzept:
 *  - Spieler bewegt sich (0-1 normalisierte Position) mit Drag
 *  - Muenzen sammeln fuer Punkte + Combo
 *  - Gegner ausweichen (3 Leben)
 *  - Power-Ups: Magnet, Shield, Speed, Freeze
 *  - Zeitlimit: 30 Sekunden
 *  - Combo-System mit Multiplikator
 */

/**
 * Erstellt den Startzustand fuer ein Coin-Dash-Spiel.
 * @param {{maxLives?:number}} opts
 * @returns {CoinDashState}
 */
export function createCoinDashState(opts = {}) {
  return {
    score: 0,
    lives: opts.maxLives ?? 3,
    maxLives: opts.maxLives ?? 3,
    combo: 0,
    maxCombo: 0,
    coins: [],
    enemies: [],
    powerUps: [],
    player: { x: 0.5, y: 0.5, radius: 0.04 },
    activePowerUp: null,
    powerUpTimer: 0,
    gameOver: false,
    time: 0,
    comboTimer: 0,
  };
}

/**
 * Spawnt eine Muenze an der gegebenen Position.
 * @param {CoinDashState} state
 * @param {number} x - 0..1
 * @param {number} y - 0..1
 * @param {number} [value=10]
 * @returns {Coin}
 */
export function spawnCoin(state, x, y, value = 10) {
  const coin = { x, y, value, radius: 0.03 };
  state.coins.push(coin);
  return coin;
}
let _enemyId = 0;

/**
 * Spawnt einen Gegner mit Position und Geschwindigkeit.
 * @param {CoinDashState} state
 * @param {number} x
 * @param {number} y
 * @param {number} vx - Geschwindigkeit x
 * @param {number} vy - Geschwindigkeit y
 * @param {number} type - Gegnertyp (0=normal, 1=schnell)
 * @returns {Enemy}
 */
export function spawnEnemy(state, x, y, vx, vy, type = 0) {
  const enemy = { id: _enemyId++, x, y, vx, vy, type, radius: 0.035 };
  state.enemies.push(enemy);
  return enemy;
}
/** Gueltige Power-Up-Typen */
const POWER_UP_TYPES = ['magnet', 'shield', 'speed', 'freeze'];

/**
 * Spawnt ein Power-Up an der gegebenen Position.
 * @param {CoinDashState} state
 * @param {number} x
 * @param {number} y
 * @param {string} type - magnet/shield/speed/freeze
 * @returns {PowerUp}
 */
export function spawnPowerUp(state, x, y, type) {
  const pu = { x, y, type, radius: 0.04 };
  state.powerUps.push(pu);
  return pu;
}
/**
 * Bewegt den Spieler zur gegebenen Position (geclamped auf 0..1).
 * @param {CoinDashState} state
 * @param {number} x
 * @param {number} y
 */
export function movePlayer(state, x, y) {
  state.player.x = Math.max(0, Math.min(1, x));
  state.player.y = Math.max(0, Math.min(1, y));
}
/**
 * Aktualisiert alle Gegner: bewegt sie und laesst sie an Raendern abprallen.
 * Bei aktivem freeze-PowerUp werden Gegner nicht bewegt.
 * @param {CoinDashState} state
 * @param {number} dt - Zeitdelta in Sekunden
 */
export function updateEnemies(state, dt) {
  if (state.activePowerUp === 'freeze') return;
  for (const e of state.enemies) {
    e.x += e.vx * dt;
    e.y += e.vy * dt;
    if (e.x < 0) { e.x = -e.x; e.vx = -e.vx; }
    if (e.x > 1) { e.x = 2 - e.x; e.vx = -e.vx; }
    if (e.y < 0) { e.y = -e.y; e.vy = -e.vy; }
    if (e.y > 1) { e.y = 2 - e.y; e.vy = -e.vy; }
  }
}
/** Distanz zwischen zwei Punkten (2D). */
function dist(ax, ay, bx, by) {
  const dx = ax - bx, dy = ay - by;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Magnet-Reichweite (groesser als normale Sammel-Reichweite) */
const MAGNET_RANGE = 0.2;

/**
 * Prueft Kollisionen zwischen Spieler und Muenzen/Gegnern/PowerUps.
 * @param {CoinDashState} state
 * @returns {Array<{type:string, x?:number, y?:number}>} Events fuer UI-Feedback
 */
export function checkCollisions(state) {
  const events = [];
  const p = state.player;
  const hasShield = state.activePowerUp === 'shield';
  const hasMagnet = state.activePowerUp === 'magnet';

  /* Muenzen */
  for (let i = state.coins.length - 1; i >= 0; i--) {
    const c = state.coins[i];
    const range = (p.radius + c.radius) + (hasMagnet ? MAGNET_RANGE : 0);
    if (dist(p.x, p.y, c.x, c.y) < range) {
      state.coins.splice(i, 1);
      state.combo++;
      if (state.combo > state.maxCombo) state.maxCombo = state.combo;
      const mult = getComboMultiplier(state.combo);
      state.score += c.value * mult;
      state.comboTimer = 3; // 3 Sekunden bis Combo-Reset
      events.push({ type: 'coin', x: c.x, y: c.y, value: c.value * mult });
    }
  }

  /* Gegner */
  for (let i = state.enemies.length - 1; i >= 0; i--) {
    const e = state.enemies[i];
    if (dist(p.x, p.y, e.x, e.y) < p.radius + e.radius) {
      if (hasShield) {
        events.push({ type: 'blocked', x: e.x, y: e.y });
      } else {
        state.lives--;
        state.combo = 0;
        events.push({ type: 'hit', x: e.x, y: e.y });
        if (state.lives <= 0) state.gameOver = true;
      }
      state.enemies.splice(i, 1);
    }
  }

  /* PowerUps */
  for (let i = state.powerUps.length - 1; i >= 0; i--) {
    const pu = state.powerUps[i];
    if (dist(p.x, p.y, pu.x, pu.y) < p.radius + pu.radius) {
      state.powerUps.splice(i, 1);
      activatePowerUp(state, pu.type);
      events.push({ type: 'powerup', x: pu.x, y: pu.y, powerUp: pu.type });
    }
  }

  return events;
}
/**
 * Aktiviert ein Power-Up.
 * @param {CoinDashState} state
 * @param {string} type - magnet/shield/speed/freeze
 */
export function activatePowerUp(state, type) {
  state.activePowerUp = type;
  // Dauer in Sekunden je nach Typ
  const durations = { magnet: 5, shield: 4, speed: 5, freeze: 3 };
  state.powerUpTimer = durations[type] ?? 5;
}

/**
 * Gibt den Combo-Multiplikator zurueck.
 * 0-4: 1x, 5-9: 2x, 10-19: 3x, 20+: 4x
 * @param {number} combo
 * @returns {number}
 */
export function getComboMultiplier(combo) {
  if (combo >= 20) return 4;
  if (combo >= 10) return 3;
  if (combo >= 5) return 2;
  return 1;
}

/**
 * Zeit-Tick: aktualisiert Timer, Combo-Reset, PowerUp-Dauer.
 * @param {CoinDashState} state
 * @param {number} dt - Zeitdelta in Sekunden
 */
export function tick(state, dt) {
  if (state.gameOver) return;
  state.time += dt;
  if (state.comboTimer > 0) {
    state.comboTimer -= dt;
    if (state.comboTimer <= 0) { state.combo = 0; state.comboTimer = 0; }
  }
  if (state.powerUpTimer > 0) {
    state.powerUpTimer -= dt;
    if (state.powerUpTimer <= 0) {
      state.activePowerUp = null;
      state.powerUpTimer = 0;
    }
  }
}

/**
 * Prueft ob das Spiel vorbei ist.
 * @param {CoinDashState} state
 * @returns {boolean}
 */
export function isGameOver(state) {
  return state.gameOver;
}

/**
 * Gibt den aktuellen Score zurueck.
 * @param {CoinDashState} state
 * @returns {number}
 */
export function getScore(state) {
  return state.score;
}