/**
 * Game Mix — Spiellogik (Browser-Kompatibel, IIFE)
 *
 * Gleiche Logik wie game-mix-logic.js (ESM),
 * aber als IIFE fuer <script>-Tag ohne Module-Loader.
 */
(function () {
  'use strict';

  var ACTION_GAME_IDS = {
    towerstack: true, bubblepop: true, ninjaslash: true, colorcatch: true,
    dodgeball: true, bouncesurvival: true, quickdraw: true, rhythmtap: true,
    coindash: true, tileflip: true,
  };

  var MIXES = ['action', 'classic'];

  function getGameMix(id) {
    return ACTION_GAME_IDS[id] ? 'action' : 'classic';
  }

  function groupGamesByMix(list) {
    var groups = { action: [], classic: [] };
    for (var i = 0; i < list.length; i++) {
      groups[getGameMix(list[i].id)].push(list[i]);
    }
    return groups;
  }

  function getMixLabel(mix) {
    return mix === 'action' ? 'Action Mix' : 'Classic Mix';
  }

  window.GameMixLogic = {
    getGameMix: getGameMix,
    groupGamesByMix: groupGamesByMix,
    getMixLabel: getMixLabel,
    MIXES: MIXES,
  };
})();
