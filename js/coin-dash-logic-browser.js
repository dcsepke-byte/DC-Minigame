/**
 * Coin Dash — Spiellogik (Browser-Kompatibel, IIFE)
 *
 * Gleiche Logik wie coin-dash-logic.js (ESM),
 * aber als IIFE fuer <script>-Tag ohne Module-Loader.
 */
(function () {
  'use strict';

  var POWER_UP_TYPES = ['magnet', 'shield', 'speed', 'freeze'];
  var MAGNET_RANGE = 0.2;
  var _enemyId = 0;

  function createCoinDashState(opts) {
    opts = opts || {};
    var ml = opts.maxLives != null ? opts.maxLives : 3;
    return {
      score: 0,
      lives: ml,
      maxLives: ml,
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

  function spawnCoin(state, x, y, value) {
    value = value != null ? value : 10;
    var coin = { x: x, y: y, value: value, radius: 0.03 };
    state.coins.push(coin);
    return coin;
  }

  function spawnEnemy(state, x, y, vx, vy, type) {
    type = type || 0;
    var enemy = { id: _enemyId++, x: x, y: y, vx: vx, vy: vy, type: type, radius: 0.035 };
    state.enemies.push(enemy);
    return enemy;
  }

  function spawnPowerUp(state, x, y, type) {
    var pu = { x: x, y: y, type: type, radius: 0.04 };
    state.powerUps.push(pu);
    return pu;
  }

  function movePlayer(state, x, y) {
    state.player.x = Math.max(0, Math.min(1, x));
    state.player.y = Math.max(0, Math.min(1, y));
  }

  function updateEnemies(state, dt) {
    if (state.activePowerUp === 'freeze') return;
    for (var i = 0; i < state.enemies.length; i++) {
      var e = state.enemies[i];
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      if (e.x < 0) { e.x = -e.x; e.vx = -e.vx; }
      if (e.x > 1) { e.x = 2 - e.x; e.vx = -e.vx; }
      if (e.y < 0) { e.y = -e.y; e.vy = -e.vy; }
      if (e.y > 1) { e.y = 2 - e.y; e.vy = -e.vy; }
    }
  }

  function dist(ax, ay, bx, by) {
    var dx = ax - bx, dy = ay - by;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function getComboMultiplier(combo) {
    if (combo >= 20) return 4;
    if (combo >= 10) return 3;
    if (combo >= 5) return 2;
    return 1;
  }

  function activatePowerUp(state, type) {
    state.activePowerUp = type;
    var durations = { magnet: 5, shield: 4, speed: 5, freeze: 3 };
    state.powerUpTimer = durations[type] != null ? durations[type] : 5;
  }

  function checkCollisions(state) {
    var events = [];
    var p = state.player;
    var hasShield = state.activePowerUp === 'shield';
    var hasMagnet = state.activePowerUp === 'magnet';

    /* Muenzen */
    for (var i = state.coins.length - 1; i >= 0; i--) {
      var c = state.coins[i];
      var range = (p.radius + c.radius) + (hasMagnet ? MAGNET_RANGE : 0);
      if (dist(p.x, p.y, c.x, c.y) < range) {
        state.coins.splice(i, 1);
        state.combo++;
        if (state.combo > state.maxCombo) state.maxCombo = state.combo;
        var mult = getComboMultiplier(state.combo);
        state.score += c.value * mult;
        state.comboTimer = 3;
        events.push({ type: 'coin', x: c.x, y: c.y, value: c.value * mult });
      }
    }

    /* Gegner */
    for (var j = state.enemies.length - 1; j >= 0; j--) {
      var e = state.enemies[j];
      if (dist(p.x, p.y, e.x, e.y) < p.radius + e.radius) {
        if (hasShield) {
          events.push({ type: 'blocked', x: e.x, y: e.y });
        } else {
          state.lives--;
          state.combo = 0;
          events.push({ type: 'hit', x: e.x, y: e.y });
          if (state.lives <= 0) state.gameOver = true;
        }
        state.enemies.splice(j, 1);
      }
    }

    /* PowerUps */
    for (var k = state.powerUps.length - 1; k >= 0; k--) {
      var pu = state.powerUps[k];
      if (dist(p.x, p.y, pu.x, pu.y) < p.radius + pu.radius) {
        state.powerUps.splice(k, 1);
        activatePowerUp(state, pu.type);
        events.push({ type: 'powerup', x: pu.x, y: pu.y, powerUp: pu.type });
      }
    }

    return events;
  }

  function tick(state, dt) {
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

  function isGameOver(state) {
    return state.gameOver;
  }

  function getScore(state) {
    return state.score;
  }

  /* ---------- Export ---------- */
  window.CoinDashLogic = {
    createCoinDashState: createCoinDashState,
    spawnCoin: spawnCoin,
    spawnEnemy: spawnEnemy,
    spawnPowerUp: spawnPowerUp,
    movePlayer: movePlayer,
    updateEnemies: updateEnemies,
    checkCollisions: checkCollisions,
    activatePowerUp: activatePowerUp,
    tick: tick,
    isGameOver: isGameOver,
    getScore: getScore,
    getComboMultiplier: getComboMultiplier,
  };
})();