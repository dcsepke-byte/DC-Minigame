/**
 * Pawn-Model-Logic — Browser-Kompatibel (IIFE)
 *
 * Gleiche Logik wie pawn-model-logic.js (ESM),
 * aber als IIFE fuer <script>-Tag ohne Module-Loader.
 */
(function () {
  'use strict';

  var PAWN_PART_NAMES = [
    'pedestal',
    'legL',
    'legR',
    'body',
    'armL',
    'armR',
    'head',
    'eyeL',
    'eyeR',
    'antenna',
  ];

  var MAT_DEFAULTS = {
    primary:  { roughness: 0.38, metalness: 0.42 },
    dark:     { roughness: 0.55, metalness: 0.50 },
    eye:      { roughness: 0.40, metalness: 0.10 },
    accent:   { roughness: 0.30, metalness: 0.60 },
  };

  function buildPawnParts(opts) {
    opts = opts || {};
    var index = opts.index != null ? opts.index : 0;
    var phase = index * 0.7;

    var parts = [
      {
        name: 'pedestal',
        geometry: 'cylinder',
        size: [0.34, 0.42, 0.16],
        position: [0, 0.08, 0],
        colorMode: 'dark',
        material: Object.assign({}, MAT_DEFAULTS.dark),
        phase: phase,
      },
      {
        name: 'legL',
        geometry: 'cylinder',
        size: [0.07, 0.07, 0.12],
        position: [-0.09, 0.22, 0],
        colorMode: 'dark',
        material: Object.assign({}, MAT_DEFAULTS.dark),
        phase: phase,
      },
      {
        name: 'legR',
        geometry: 'cylinder',
        size: [0.07, 0.07, 0.12],
        position: [0.09, 0.22, 0],
        colorMode: 'dark',
        material: Object.assign({}, MAT_DEFAULTS.dark),
        phase: phase,
      },
      {
        name: 'body',
        geometry: 'sphere',
        size: [0.20, 16, 12],
        position: [0, 0.42, 0],
        colorMode: 'primary',
        material: Object.assign({}, MAT_DEFAULTS.primary),
        phase: phase,
      },
      {
        name: 'armL',
        geometry: 'cylinder',
        size: [0.05, 0.05, 0.16],
        position: [-0.24, 0.44, 0],
        rotation: [0, 0, 0.3],
        colorMode: 'primary',
        material: Object.assign({}, MAT_DEFAULTS.primary),
        phase: phase,
      },
      {
        name: 'armR',
        geometry: 'cylinder',
        size: [0.05, 0.05, 0.16],
        position: [0.24, 0.44, 0],
        rotation: [0, 0, -0.3],
        colorMode: 'primary',
        material: Object.assign({}, MAT_DEFAULTS.primary),
        phase: phase,
      },
      {
        name: 'head',
        geometry: 'sphere',
        size: [0.16, 16, 12],
        position: [0, 0.68, 0],
        colorMode: 'primary',
        material: Object.assign({}, MAT_DEFAULTS.primary),
        phase: phase,
      },
      {
        name: 'eyeL',
        geometry: 'sphere',
        size: [0.035, 6, 4],
        position: [-0.06, 0.70, 0.14],
        colorMode: 'eye',
        material: Object.assign({}, MAT_DEFAULTS.eye),
        phase: phase,
      },
      {
        name: 'eyeR',
        geometry: 'sphere',
        size: [0.035, 6, 4],
        position: [0.06, 0.70, 0.14],
        colorMode: 'eye',
        material: Object.assign({}, MAT_DEFAULTS.eye),
        phase: phase,
      },
      {
        name: 'antenna',
        geometry: 'cylinder',
        size: [0.015, 0.015, 0.10],
        position: [0, 0.86, 0],
        colorMode: 'accent',
        material: Object.assign({}, MAT_DEFAULTS.accent),
        phase: phase,
      },
    ];

    return parts;
  }

  function getPartByName(parts, name) {
    if (!Array.isArray(parts)) return null;
    for (var i = 0; i < parts.length; i++) {
      if (parts[i].name === name) return parts[i];
    }
    return null;
  }

  window.PawnModelLogic = {
    PAWN_PART_NAMES: PAWN_PART_NAMES,
    buildPawnParts: buildPawnParts,
    getPartByName: getPartByName,
  };
})();