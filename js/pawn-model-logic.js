/**
 * Pawn-Model-Logic — reine Funktionen fuer Charakter-Modell-Aufbau (ESM)
 *
 * Liefert Bauteil-Definitionen (Geometrie, Position, Farbe) fuer
 * den 3D-Charakter. Ohne THREE.js-Abhaengigkeit — die Szene
 * wandelt diese Definitionen in THREE.Mesh-Objekte um.
 *
 * Ein Pawn besteht aus:
 *   pedestal (dunkle Basis), body, head, eyeL, eyeR,
 *   armL, armR, legL, legR, antenna
 */

/* Alle Teile in definierter Reihenfolge */
export const PAWN_PART_NAMES = [
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

/* Default-Material-Eigenschaften pro colorMode */
const MAT_DEFAULTS = {
  primary:  { roughness: 0.38, metalness: 0.42 },
  dark:     { roughness: 0.55, metalness: 0.50 },
  eye:      { roughness: 0.40, metalness: 0.10 },
  accent:   { roughness: 0.30, metalness: 0.60 },
};

/**
 * Baut die Liste aller Bauteile fuer einen Charakter-Pawn.
 * Alle Positionen sind relativ zur Pawn-Gruppe (y=0 = Boden).
 *
 * @param {object} opts
 * @param {string} [opts.color] - Spielerfarbe (hex)
 * @param {number} [opts.index] - Index des Spielers am Tile (fuer Phasenversatz)
 * @returns {Array<{name,geometry,size,position,rotation?,colorMode,material,phase}>}
 */
export function buildPawnParts(opts = {}) {
  const index = opts.index ?? 0;
  const phase = index * 0.7;

  const parts = [
    {
      name: 'pedestal',
      geometry: 'cylinder',
      size: [0.34, 0.42, 0.16],
      position: [0, 0.08, 0],
      colorMode: 'dark',
      material: { ...MAT_DEFAULTS.dark },
      phase,
    },
    {
      name: 'legL',
      geometry: 'cylinder',
      size: [0.07, 0.07, 0.12],
      position: [-0.09, 0.22, 0],
      colorMode: 'dark',
      material: { ...MAT_DEFAULTS.dark },
      phase,
    },
    {
      name: 'legR',
      geometry: 'cylinder',
      size: [0.07, 0.07, 0.12],
      position: [0.09, 0.22, 0],
      colorMode: 'dark',
      material: { ...MAT_DEFAULTS.dark },
      phase,
    },
    {
      name: 'body',
      geometry: 'sphere',
      size: [0.20, 16, 12],
      position: [0, 0.42, 0],
      colorMode: 'primary',
      material: { ...MAT_DEFAULTS.primary },
      phase,
    },
    {
      name: 'armL',
      geometry: 'cylinder',
      size: [0.05, 0.05, 0.16],
      position: [-0.24, 0.44, 0],
      rotation: [0, 0, 0.3],
      colorMode: 'primary',
      material: { ...MAT_DEFAULTS.primary },
      phase,
    },
    {
      name: 'armR',
      geometry: 'cylinder',
      size: [0.05, 0.05, 0.16],
      position: [0.24, 0.44, 0],
      rotation: [0, 0, -0.3],
      colorMode: 'primary',
      material: { ...MAT_DEFAULTS.primary },
      phase,
    },
    {
      name: 'head',
      geometry: 'sphere',
      size: [0.16, 16, 12],
      position: [0, 0.68, 0],
      colorMode: 'primary',
      material: { ...MAT_DEFAULTS.primary },
      phase,
    },
    {
      name: 'eyeL',
      geometry: 'sphere',
      size: [0.035, 6, 4],
      position: [-0.06, 0.70, 0.14],
      colorMode: 'eye',
      material: { ...MAT_DEFAULTS.eye },
      phase,
    },
    {
      name: 'eyeR',
      geometry: 'sphere',
      size: [0.035, 6, 4],
      position: [0.06, 0.70, 0.14],
      colorMode: 'eye',
      material: { ...MAT_DEFAULTS.eye },
      phase,
    },
    {
      name: 'antenna',
      geometry: 'cylinder',
      size: [0.015, 0.015, 0.10],
      position: [0, 0.86, 0],
      colorMode: 'accent',
      material: { ...MAT_DEFAULTS.accent },
      phase,
    },
  ];

  return parts;
}

/**
 * Sucht ein Teil anhand seines Namens in der parts-Liste.
 * @param {Array} parts - Ergebnis von buildPawnParts
 * @param {string} name - Teilename
 * @returns {object|null} Das gefundene Teil oder null
 */
export function getPartByName(parts, name) {
  if (!Array.isArray(parts)) return null;
  return parts.find(p => p.name === name) || null;
}