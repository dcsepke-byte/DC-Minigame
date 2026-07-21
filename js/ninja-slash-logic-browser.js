/**
 * Ninja Slash — Spiellogik (Browser-Kompatibel, IIFE)
 *
 * Gleiche Logik wie ninja-slash-logic.js (ESM),
 * aber als IIFE fuer <script>-Tag ohne Module-Loader.
 *
 * Konzept:
 *  - Objekte (Fruechte + Bomben) fliegen von unten nach oben (parabolische Bahn)
 *  - Tippen = schlitzern → Punkte
 *  - Fruechte entkommen → missed +1, Combo-Reset
 *  - Bombe tippen → sofort Game Over
 *  - Combos bei aufeinanderfolgenden Treffern → Bonus-Punkte
 */
(function () {
  'use strict';

  var FRUIT_TYPES = [
    { id: 'watermelon', icon: '🍉', points: 10, radius: 38 },
    { id: 'apple',      icon: '🍎', points: 8,  radius: 32 },
    { id: 'orange',     icon: '🍊', points: 8,  radius: 32 },
    { id: 'banana',     icon: '🍌', points: 6,  radius: 34 },
    { id: 'grape',      icon: '🍇', points: 7,  radius: 28 },
    { id: 'strawberry', icon: '🍓', points: 9,  radius: 30 },
    { id: 'pineapple',  icon: '🍍', points: 12, radius: 36 },
    { id: 'kiwi',       icon: '🥝', points: 7,  radius: 28 },
    { id: 'bomb',       icon: '💣', points: 0,  radius: 34 },
  ];

  var TYPE_BY_ID = {};
  for (var i = 0; i < FRUIT_TYPES.length; i++) {
    TYPE_BY_ID[FRUIT_TYPES[i].id] = FRUIT_TYPES[i];
  }

  var _nextId = 1;

  function createNinjaState(opts) {
    opts = opts || {};
    return {
      objects: [],
      score: 0,
      combo: 0,
      bestCombo: 0,
      missed: 0,
      maxMissed: opts.maxMissed != null ? opts.maxMissed : 5,
      gravity: opts.gravity != null ? opts.gravity : 0.0009,
      gameOver: false,
    };
  }

  function spawnObject(state, x, y, typeId, vel) {
    vel = vel || {};
    var type = TYPE_BY_ID[typeId] || FRUIT_TYPES[0];
    var obj = {
      id: _nextId++,
      x: x,
      y: y,
      typeId: type.id,
      icon: type.icon,
      points: type.points,
      radius: type.radius,
      isBomb: type.id === 'bomb',
      vx: vel.vx != null ? vel.vx : 0,
      vy: vel.vy != null ? vel.vy : -0.5,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.01,
    };
    state.objects.push(obj);
    return obj;
  }

  function slashObject(state, objId) {
    if (state.gameOver) return { hit: false, bomb: false, points: 0, combo: 0, comboBonus: 0 };

    var idx = -1;
    for (var i = 0; i < state.objects.length; i++) {
      if (state.objects[i].id === objId) { idx = i; break; }
    }
    if (idx === -1) return { hit: false, bomb: false, points: 0, combo: 0, comboBonus: 0 };

    var obj = state.objects[idx];
    state.objects.splice(idx, 1);

    if (obj.isBomb) {
      state.gameOver = true;
      state.combo = 0;
      return { hit: true, bomb: true, points: 0, combo: 0, comboBonus: 0 };
    }

    state.combo++;
    if (state.combo > state.bestCombo) state.bestCombo = state.combo;
    var comboBonus = computeComboBonus(state.combo);
    var totalPoints = obj.points + comboBonus;
    state.score += totalPoints;
    return { hit: true, bomb: false, points: totalPoints, combo: state.combo, comboBonus: comboBonus };
  }

  function computeComboBonus(combo) {
    if (combo <= 1) return 0;
    return (combo - 1) * 5;
  }

  function tickObjects(state, dt, stageH) {
    var events = [];
    if (state.gameOver) return events;

    var survivors = [];
    for (var i = 0; i < state.objects.length; i++) {
      var o = state.objects[i];
      // Explicit Euler: erst Position mit aktueller Geschwindigkeit updaten,
      // dann Schwerkraft auf Geschwindigkeit anwenden.
      o.x += o.vx * dt;
      o.y += o.vy * dt;
      o.vy += state.gravity * dt;
      o.rotation += o.rotSpeed * dt;

      // Objekt ist unten aus dem Bild gefallen (y > stageH + radius)
      if (o.y - o.radius > stageH) {
        events.push({ type: 'escaped', object: o });
        if (!o.isBomb) {
          state.missed++;
          state.combo = 0;
          if (state.missed >= state.maxMissed) state.gameOver = true;
        }
      } else {
        survivors.push(o);
      }
    }
    state.objects = survivors;
    return events;
  }

  function getActiveObjects(state) { return state.objects; }
  function isGameOver(state) { return state.gameOver; }
  function getMissedCount(state) { return state.missed; }
  function getScore(state) { return state.score; }
  function getCombo(state) { return state.combo; }

  function setPlayerColor(state, idx) {
    state.playerColorIdx = idx;
  }

  window.NinjaSlashLogic = {
    FRUIT_TYPES: FRUIT_TYPES,
    createNinjaState: createNinjaState,
    spawnObject: spawnObject,
    slashObject: slashObject,
    computeComboBonus: computeComboBonus,
    tickObjects: tickObjects,
    getActiveObjects: getActiveObjects,
    isGameOver: isGameOver,
    getMissedCount: getMissedCount,
    getScore: getScore,
    getCombo: getCombo,
    setPlayerColor: setPlayerColor,
  };
})();