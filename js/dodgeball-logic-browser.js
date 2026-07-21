/**
 * Dodgeball — Spiellogik (Browser-Kompatibel, IIFE)
 *
 * Gleiche Logik wie dodgeball-logic.js (ESM),
 * aber als IIFE fuer <script>-Tag ohne Module-Loader.
 */
(function () {
  'use strict';

  var _nextId = 1;

  function createDodgeballState(opts) {
    opts = opts || {};
    var stageWidth = opts.stageWidth != null ? opts.stageWidth : 300;
    var stageHeight = opts.stageHeight != null ? opts.stageHeight : 600;
    var playerRadius = opts.playerRadius != null ? opts.playerRadius : 20;
    var playerYRatio = opts.playerYRatio != null ? opts.playerYRatio : 0.82;
    return {
      balls: [],
      score: 0,
      hits: 0,
      maxHits: opts.maxHits != null ? opts.maxHits : 3,
      gameOver: false,
      stageWidth: stageWidth,
      stageHeight: stageHeight,
      player: {
        x: stageWidth / 2,
        y: Math.round(stageHeight * playerYRatio),
        radius: playerRadius,
      },
      closeCallTolerance: 15,
    };
  }

  function spawnBall(state, side, speed) {
    var sw = state.stageWidth;
    var sh = state.stageHeight;
    var radius = 16;
    var x, y, vx, vy;
    var diagVariance = 0.3;

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
    } else {
      x = sw + radius;
      y = Math.random() * sh * 0.7 + sh * 0.15;
      vx = -speed;
      vy = (Math.random() - 0.5) * speed * diagVariance;
    }

    var ball = { id: _nextId++, x: x, y: y, vx: vx, vy: vy, radius: radius, side: side };
    state.balls.push(ball);
    return ball;
  }

  function movePlayer(state, x, y) {
    var r = state.player.radius;
    state.player.x = Math.max(r, Math.min(state.stageWidth - r, x));
    state.player.y = Math.max(r, Math.min(state.stageHeight - r, y));
  }

  function movePlayerBy(state, dx, dy) {
    movePlayer(state, state.player.x + dx, state.player.y + dy);
  }

  function computeSurvivalScore(ms) {
    if (ms <= 0) return 0;
    return Math.floor(ms / 10);
  }

  function computeCloseCallBonus(distance, playerRadius, ballRadius, tolerance) {
    var collisionDist = playerRadius + ballRadius;
    var closeCallDist = collisionDist + tolerance;
    if (distance > closeCallDist) return 0;
    if (distance < collisionDist) return 0;
    var t = (closeCallDist - distance) / tolerance;
    return Math.round(tolerance * t);
  }

  function dist(x1, y1, x2, y2) {
    var dx = x2 - x1;
    var dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function isOffScreen(ball, sw, sh) {
    var margin = ball.radius + 20;
    return ball.x < -margin || ball.x > sw + margin ||
           ball.y < -margin || ball.y > sh + margin;
  }

  function tickBalls(state, dt) {
    var events = [];
    if (state.gameOver) return events;
    var survivors = [];
    for (var i = 0; i < state.balls.length; i++) {
      var b = state.balls[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      var d = dist(b.x, b.y, state.player.x, state.player.y);
      var collisionDist = b.radius + state.player.radius;
      if (d <= collisionDist) {
        events.push({ type: 'hit', ball: b });
        state.hits++;
        if (state.hits >= state.maxHits) state.gameOver = true;
        continue;
      }
      var closeCallDist = collisionDist + state.closeCallTolerance;
      if (d <= closeCallDist) {
        events.push({ type: 'closecall', ball: b });
      }
      if (isOffScreen(b, state.stageWidth, state.stageHeight)) {
        events.push({ type: 'escaped', ball: b });
        continue;
      }
      survivors.push(b);
    }
    state.balls = survivors;
    return events;
  }

  function isGameOver(state) { return state.gameOver; }
  function getHits(state) { return state.hits; }
  function getScore(state) { return state.score; }
  function getActiveBalls(state) { return state.balls; }
  function getPlayer(state) { return state.player; }

  window.DodgeballLogic = {
    createDodgeballState: createDodgeballState,
    spawnBall: spawnBall,
    movePlayer: movePlayer,
    movePlayerBy: movePlayerBy,
    tickBalls: tickBalls,
    computeSurvivalScore: computeSurvivalScore,
    computeCloseCallBonus: computeCloseCallBonus,
    isGameOver: isGameOver,
    getHits: getHits,
    getScore: getScore,
    getActiveBalls: getActiveBalls,
    getPlayer: getPlayer,
  };
})();