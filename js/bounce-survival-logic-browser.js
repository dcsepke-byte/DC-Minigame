/**
 * Bounce Survival — Spiellogik (Browser-Kompatibel, IIFE)
 *
 * Gleiche Logik wie bounce-survival-logic.js (ESM),
 * aber als IIFE fuer <script>-Tag ohne Module-Loader.
 */
(function () {
  'use strict';

  function createBounceSurvivalState(opts) {
    opts = opts || {};
    var stageWidth = opts.stageWidth != null ? opts.stageWidth : 300;
    var stageHeight = opts.stageHeight != null ? opts.stageHeight : 600;
    var ballRadius = opts.ballRadius != null ? opts.ballRadius : 10;
    var paddleWidth = opts.paddleWidth != null ? opts.paddleWidth : 80;
    var paddleHeight = opts.paddleHeight != null ? opts.paddleHeight : 14;
    var ballSpeed = opts.ballSpeed != null ? opts.ballSpeed : 0.25;

    var angle = (Math.random() * 0.4 + 0.3) * Math.PI;
    var vx = Math.cos(angle) * ballSpeed * (Math.random() < 0.5 ? -1 : 1);
    var vy = Math.abs(Math.sin(angle)) * ballSpeed;

    return {
      ball: { x: stageWidth / 2, y: stageHeight * 0.35, vx: vx, vy: vy, radius: ballRadius },
      paddle: { x: stageWidth / 2, y: stageHeight - 40, width: paddleWidth, height: paddleHeight },
      score: 0,
      misses: 0,
      maxMisses: opts.maxMisses != null ? opts.maxMisses : 3,
      bounces: 0,
      gameOver: false,
      stageWidth: stageWidth,
      stageHeight: stageHeight,
      ballSpeed: ballSpeed,
    };
  }

  function movePaddle(state, x) {
    var half = state.paddle.width / 2;
    state.paddle.x = Math.max(half, Math.min(state.stageWidth - half, x));
  }

  function tickBall(state, dt) {
    var events = [];
    if (state.gameOver) return events;

    var b = state.ball;
    var r = b.radius;

    b.x += b.vx * dt;
    b.y += b.vy * dt;

    if (b.x - r < 0) {
      b.x = r;
      b.vx = Math.abs(b.vx);
      events.push({ type: 'wall', side: 'left' });
    }
    if (b.x + r > state.stageWidth) {
      b.x = state.stageWidth - r;
      b.vx = -Math.abs(b.vx);
      events.push({ type: 'wall', side: 'right' });
    }
    if (b.y - r < 0) {
      b.y = r;
      b.vy = Math.abs(b.vy);
      events.push({ type: 'wall', side: 'top' });
    }

    var p = state.paddle;
    var paddleTop = p.y;
    var paddleLeft = p.x - p.width / 2;
    var paddleRight = p.x + p.width / 2;
    if (b.vy > 0 && b.y + r >= paddleTop && b.y - r <= paddleTop + p.height &&
        b.x >= paddleLeft && b.x <= paddleRight) {
      b.y = paddleTop - r;
      b.vy = -Math.abs(b.vy);
      var hitOffset = (b.x - p.x) / (p.width / 2);
      var speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
      var maxAngle = Math.PI / 3;
      var angle = hitOffset * maxAngle;
      b.vx = speed * Math.sin(angle);
      b.vy = -Math.abs(speed * Math.cos(angle));
      state.bounces++;
      events.push({ type: 'paddle' });
    }

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

  function resetBall(state) {
    var speed = state.ballSpeed;
    var angle = (Math.random() * 0.4 + 0.3) * Math.PI;
    state.ball.x = state.stageWidth / 2;
    state.ball.y = state.stageHeight * 0.35;
    state.ball.vx = Math.cos(angle) * speed * (Math.random() < 0.5 ? -1 : 1);
    state.ball.vy = Math.abs(Math.sin(angle)) * speed;
  }

  function increaseSpeed(state, factor) {
    state.ball.vx *= factor;
    state.ball.vy *= factor;
  }

  function computeSurvivalScore(ms) {
    if (ms <= 0) return 0;
    return Math.floor(ms / 10);
  }

  function computeBounceBonus(bounces) {
    if (bounces <= 0) return 0;
    return bounces * 50;
  }

  function isGameOver(state) { return state.gameOver; }
  function getMisses(state) { return state.misses; }
  function getScore(state) { return state.score; }
  function getBall(state) { return state.ball; }
  function getPaddle(state) { return state.paddle; }
  function getBounces(state) { return state.bounces; }

  window.BounceSurvivalLogic = {
    createBounceSurvivalState: createBounceSurvivalState,
    movePaddle: movePaddle,
    tickBall: tickBall,
    resetBall: resetBall,
    increaseSpeed: increaseSpeed,
    computeSurvivalScore: computeSurvivalScore,
    computeBounceBonus: computeBounceBonus,
    isGameOver: isGameOver,
    getMisses: getMisses,
    getScore: getScore,
    getBall: getBall,
    getPaddle: getPaddle,
    getBounces: getBounces,
  };
})();