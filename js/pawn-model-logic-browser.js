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
    var kind = opts.kind || 'pawn';

    /* Charakter-spezifische Formvarianten (arch-3): Silhouette pro Typ */
    var VARIANTS = {
      golem:    { head: 'box',    headSize: [0.17, 0.17, 0.17], body: 'box',  bodySize: [0.22, 0.24, 0.22], antenna: false },
      axolotl:  { head: 'sphere', headSize: [0.20, 18, 14],     body: 'sphere', bodySize: [0.20, 16, 12],   antenna: false, fins: true },
      squirrel: { head: 'sphere', headSize: [0.15, 16, 12],     body: 'sphere', bodySize: [0.18, 16, 12],   antenna: false, tail: true },
      panda:    { head: 'sphere', headSize: [0.19, 18, 14],     body: 'sphere', bodySize: [0.22, 16, 12],   antenna: false, ears: true },
      bird:     { head: 'sphere', headSize: [0.15, 16, 12],     body: 'sphere', bodySize: [0.19, 16, 12],   antenna: false, beak: true, wings: true },
      robot:    { head: 'box',    headSize: [0.16, 0.16, 0.16], body: 'box',    bodySize: [0.22, 0.24, 0.20], antenna: true, visor: true },
      cactus:   { head: 'sphere', headSize: [0.16, 16, 12],     body: 'capsule', bodySize: [0.16, 0.16, 0.30], antenna: false, flower: true },
      raccoon:  { head: 'sphere', headSize: [0.18, 18, 14],     body: 'sphere', bodySize: [0.20, 16, 12],   antenna: false, mask: true, tail: true },
    };
    var v = VARIANTS[kind] || { head: 'sphere', headSize: [0.16, 16, 12], body: 'sphere', bodySize: [0.20, 16, 12], antenna: true };

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
        geometry: v.body,
        size: v.bodySize,
        position: v.body === 'capsule' ? [0, 0.48, 0] : [0, 0.42, 0],
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
        geometry: v.head,
        size: v.headSize,
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
    ];

    /* Charakter-Extras (tail/wings/ears/beak/visor/flower/mask/fins) */
    if (v.tail) {
      parts.push({
        name: 'tail', geometry: 'capsule', size: [0.04, 0.16], position: [-0.20, 0.36, 0],
        colorMode: 'primary', material: Object.assign({}, MAT_DEFAULTS.primary), phase: phase,
      });
    }
    if (v.wings) {
      parts.push(
        { name: 'wingL', geometry: 'capsule', size: [0.03, 0.12], position: [-0.22, 0.50, -0.02], rotation: [0, 0, 0.5], colorMode: 'accent', material: Object.assign({}, MAT_DEFAULTS.accent), phase: phase },
        { name: 'wingR', geometry: 'capsule', size: [0.03, 0.12], position: [0.22, 0.50, -0.02], rotation: [0, 0, -0.5], colorMode: 'accent', material: Object.assign({}, MAT_DEFAULTS.accent), phase: phase }
      );
    }
    if (v.ears) {
      parts.push(
        { name: 'earL', geometry: 'sphere', size: [0.05, 8, 6], position: [-0.13, 0.80, 0], colorMode: 'dark', material: Object.assign({}, MAT_DEFAULTS.dark), phase: phase },
        { name: 'earR', geometry: 'sphere', size: [0.05, 8, 6], position: [0.13, 0.80, 0], colorMode: 'dark', material: Object.assign({}, MAT_DEFAULTS.dark), phase: phase }
      );
    }
    if (v.beak) {
      parts.push({
        name: 'beak', geometry: 'cone', size: [0.035, 0.08, 6], position: [0, 0.66, 0.16], rotation: [Math.PI / 2, 0, 0],
        colorMode: 'accent', material: Object.assign({}, MAT_DEFAULTS.accent), phase: phase,
      });
    }
    if (v.visor) {
      parts.push({
        name: 'visor', geometry: 'box', size: [0.15, 0.05, 0.03], position: [0, 0.70, 0.13],
        colorMode: 'accent', material: Object.assign({}, MAT_DEFAULTS.accent), phase: phase,
      });
    }
    if (v.flower) {
      parts.push({
        name: 'flower', geometry: 'sphere', size: [0.05, 8, 6], position: [0, 0.80, 0],
        colorMode: 'accent', material: Object.assign({}, MAT_DEFAULTS.accent), phase: phase,
      });
    }
    if (v.mask) {
      parts.push({
        name: 'mask', geometry: 'box', size: [0.16, 0.04, 0.02], position: [0, 0.70, 0.14],
        colorMode: 'dark', material: Object.assign({}, MAT_DEFAULTS.dark), phase: phase,
      });
    }
    if (v.fins) {
      parts.push(
        { name: 'finL', geometry: 'capsule', size: [0.03, 0.10], position: [-0.18, 0.52, 0], rotation: [0, 0, 0.4], colorMode: 'accent', material: Object.assign({}, MAT_DEFAULTS.accent), phase: phase },
        { name: 'finR', geometry: 'capsule', size: [0.03, 0.10], position: [0.18, 0.52, 0], rotation: [0, 0, -0.4], colorMode: 'accent', material: Object.assign({}, MAT_DEFAULTS.accent), phase: phase }
      );
    }
    if (v.antenna) {
      parts.push({
        name: 'antenna', geometry: 'cylinder', size: [0.015, 0.015, 0.10], position: [0, 0.86, 0],
        colorMode: 'accent', material: Object.assign({}, MAT_DEFAULTS.accent), phase: phase,
      });
    }

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
