/**
 * Biome Decor Logic — reine Spiellogik (browser-frei, testbar)
 *
 * Erzeugt Daten-Spezifikationen fuer Biom-Dekoration auf dem 3D-Board.
 * Die Specs werden vom Browser-Modul (biome-decor-logic-browser.js) in
 * THREE.js-Meshes umgewandelt. Diese Trennung erlaubt Unit-Tests ohne
 * Browser-Abhaengigkeiten.
 *
 * Jede Spec ist ein Object mit mindestens:
 *   { type, x, z, y, rotation?, scale?, color?, userData? }
 *
 * type ist ein String aus BIOME_DECOR_TYPES.
 */

/** Alle Dekorations-Typen die vom System unterstuetzt werden. */
export const BIOME_DECOR_TYPES = Object.freeze([
  // Village
  'house', 'tree', 'flower', 'well', 'fence', 'lamp',
  // Desert
  'dune', 'cactus', 'pyramid', 'skeleton', 'oasis_palm',
  // Forest
  'pine_tree', 'mushroom', 'bush', 'stump', 'fallen_log', 'fern',
  // Mountain
  'rock', 'mountain_peak', 'snow_cap', 'crystal', 'cairn',
  // Swamp
  'swamp_ground', 'reed', 'dead_tree', 'firefly', 'lily_pad',
  // Ice
  'ice_lake', 'ice_crystal', 'igloo', 'snow_pile', 'aurora', 'polar_star',
  // Volcano
  'lava_lake', 'volcano_cone', 'lava_flow', 'fire_pillar', 'smoke_rock', 'ember',
  // Clouds
  'cloud_island', 'cloud_puff', 'rainbow', 'floating_star', 'cloud_bridge',
]);

/** Skalierungsfaktor fuer Positionen (wie scene3d.js DS). */
const DS = 2.4;

/** Validiert einen Decor-Spec. */
export function validateSpec(spec) {
  if (!spec || typeof spec !== 'object') return false;
  if (!spec.type || typeof spec.type !== 'string') return false;
  if (typeof spec.x !== 'number' || isNaN(spec.x)) return false;
  if (typeof spec.z !== 'number' || isNaN(spec.z)) return false;
  if (typeof spec.y !== 'number' || isNaN(spec.y)) return false;
  return true;
}

/** Erzeugt eine gestreute Position innerhalb des Regionsradius. */
function scatter(rng, cx, cz, minR, maxR) {
  const a = rng() * Math.PI * 2;
  const r = (minR + rng() * (maxR - minR)) * DS;
  return { x: cx + Math.cos(a) * r, z: cz + Math.sin(a) * r * 0.85 };
}

/** Gibt die Anzahl Dekorationen fuer ein Biom zurueck (mit rng). */
export function getDecorCount(biome, rng) {
  const generators = BIOME_GENERATORS[biome] || BIOME_GENERATORS.village;
  let count = 0;
  generators.forEach((g) => {
    count += g.count(rng);
  });
  return count;
}

/* --- Generatoren pro Biom ---
   Jeder Generator ist { gen(center, rng) -> Spec[], count(rng) -> number } */

const BIOME_GENERATORS = {};

/* ========== VILLAGE ========== */
BIOME_GENERATORS.village = [
  { // Haeuser mit Farbvariation
    count: (rng) => 4 + Math.floor(rng() * 2),
    gen: (center, rng) => {
      const out = [];
      const wallColors = ['#ff6b6b', '#4ecdc4', '#ffe66d', '#ffb6b9', '#a8d8ea', '#ffaaa5'];
      const n = 4 + Math.floor(rng() * 2);
      for (let i = 0; i < n; i++) {
        const p = scatter(rng, center.x, center.z, 0.4, 2.2);
        out.push({
          type: 'house', x: p.x, z: p.z, y: 0.3,
          rotation: rng() * Math.PI * 2,
          color: wallColors[i % wallColors.length],
        });
      }
      return out;
    },
  },
  { // Baeume
    count: (rng) => 3 + Math.floor(rng() * 2),
    gen: (center, rng) => {
      const out = [];
      const n = 3 + Math.floor(rng() * 2);
      for (let i = 0; i < n; i++) {
        const p = scatter(rng, center.x, center.z, 0.5, 2.0);
        out.push({ type: 'tree', x: p.x, z: p.z, y: 0.3, scale: 0.9 + rng() * 0.2 });
      }
      return out;
    },
  },
  { // Bluemen
    count: (rng) => 6 + Math.floor(rng() * 4),
    gen: (center, rng) => {
      const out = [];
      const flowerColors = ['#ff6b6b', '#ffe66d', '#ff8b94', '#ba68c8', '#4dd0e1', '#ff80ab'];
      const n = 6 + Math.floor(rng() * 4);
      for (let i = 0; i < n; i++) {
        const p = scatter(rng, center.x, center.z, 0.3, 2.4);
        out.push({
          type: 'flower', x: p.x, z: p.z, y: 0.35,
          color: flowerColors[i % flowerColors.length],
        });
      }
      return out;
    },
  },
  { // Dorfbrunnen (in der Mitte)
    count: () => 1,
    gen: (center) => [{ type: 'well', x: center.x, z: center.z, y: 0.48 }],
  },
  { // Zaeune (neu: mehr Variation)
    count: (rng) => 3 + Math.floor(rng() * 2),
    gen: (center, rng) => {
      const out = [];
      const n = 3 + Math.floor(rng() * 2);
      for (let i = 0; i < n; i++) {
        const p = scatter(rng, center.x, center.z, 0.6, 2.0);
        out.push({ type: 'fence', x: p.x, z: p.z, y: 0.3, rotation: rng() * Math.PI * 2 });
      }
      return out;
    },
  },
  { // Laternen (neu)
    count: (rng) => 2 + Math.floor(rng() * 2),
    gen: (center, rng) => {
      const out = [];
      const n = 2 + Math.floor(rng() * 2);
      for (let i = 0; i < n; i++) {
        const p = scatter(rng, center.x, center.z, 0.5, 1.8);
        out.push({ type: 'lamp', x: p.x, z: p.z, y: 0.3, userData: { glow: true } });
      }
      return out;
    },
  },
];

/* ========== DESERT ========== */
BIOME_GENERATORS.desert = [
  { // Duenen
    count: (rng) => 5 + Math.floor(rng() * 2),
    gen: (center, rng) => {
      const out = [];
      const n = 5 + Math.floor(rng() * 2);
      for (let i = 0; i < n; i++) {
        const p = scatter(rng, center.x, center.z, 0.5, 2.4);
        out.push({ type: 'dune', x: p.x, z: p.z, y: 0.3, scale: 1.0 + rng() * 0.3 });
      }
      return out;
    },
  },
  { // Kakteen
    count: (rng) => 3 + Math.floor(rng() * 2),
    gen: (center, rng) => {
      const out = [];
      const n = 3 + Math.floor(rng() * 2);
      for (let i = 0; i < n; i++) {
        const p = scatter(rng, center.x, center.z, 0.6, 2.0);
        out.push({
          type: 'cactus', x: p.x, z: p.z, y: 0.32,
          scale: 0.9 + rng() * 0.4, arms: 1 + Math.floor(rng() * 2),
        });
      }
      return out;
    },
  },
  { // Pyramide (Landmarke)
    count: () => 1,
    gen: (center) => [{ type: 'pyramid', x: center.x, z: center.z, y: 0.7 }],
  },
  { // Skelette (neu)
    count: (rng) => 2 + Math.floor(rng() * 2),
    gen: (center, rng) => {
      const out = [];
      const n = 2 + Math.floor(rng() * 2);
      for (let i = 0; i < n; i++) {
        const p = scatter(rng, center.x, center.z, 0.8, 2.2);
        out.push({ type: 'skeleton', x: p.x, z: p.z, y: 0.3, rotation: rng() * Math.PI * 2 });
      }
      return out;
    },
  },
  { // Oasen-Palme (neu)
    count: (rng) => 2 + Math.floor(rng() * 2),
    gen: (center, rng) => {
      const out = [];
      const n = 2 + Math.floor(rng() * 2);
      for (let i = 0; i < n; i++) {
        const p = scatter(rng, center.x, center.z, 0.5, 1.8);
        out.push({ type: 'oasis_palm', x: p.x, z: p.z, y: 0.32 });
      }
      return out;
    },
  },
];

/* ========== FOREST ========== */
BIOME_GENERATORS.forest = [
  { // Baeume (Nadelbaeume)
    count: (rng) => 6 + Math.floor(rng() * 2),
    gen: (center, rng) => {
      const out = [];
      const n = 6 + Math.floor(rng() * 2);
      for (let i = 0; i < n; i++) {
        const p = scatter(rng, center.x, center.z, 0.5, 2.4);
        out.push({
          type: 'pine_tree', x: p.x, z: p.z, y: 0.32,
          rotation: rng() * Math.PI * 2,
          scale: 0.9 + rng() * 0.3, crowns: 2 + Math.floor(rng() * 2),
        });
      }
      return out;
    },
  },
  { // Pilze
    count: (rng) => 4 + Math.floor(rng() * 2),
    gen: (center, rng) => {
      const out = [];
      const n = 4 + Math.floor(rng() * 2);
      for (let i = 0; i < n; i++) {
        const p = scatter(rng, center.x, center.z, 0.4, 2.0);
        out.push({ type: 'mushroom', x: p.x, z: p.z, y: 0.32 });
      }
      return out;
    },
  },
  { // Buesche
    count: (rng) => 3 + Math.floor(rng() * 2),
    gen: (center, rng) => {
      const out = [];
      const n = 3 + Math.floor(rng() * 2);
      for (let i = 0; i < n; i++) {
        const p = scatter(rng, center.x, center.z, 0.4, 2.2);
        out.push({ type: 'bush', x: p.x, z: p.z, y: 0.35, scale: 0.8 + rng() * 0.2 });
      }
      return out;
    },
  },
  { // Baumstumpf
    count: () => 1,
    gen: (center, rng) => {
      const p = scatter(rng, center.x, center.z, 0.6, 1.8);
      return [{ type: 'stump', x: p.x, z: p.z, y: 0.4 }];
    },
  },
  { // Baumstamm (neu)
    count: (rng) => 2 + Math.floor(rng() * 2),
    gen: (center, rng) => {
      const out = [];
      const n = 2 + Math.floor(rng() * 2);
      for (let i = 0; i < n; i++) {
        const p = scatter(rng, center.x, center.z, 0.5, 2.0);
        out.push({
          type: 'fallen_log', x: p.x, z: p.z, y: 0.3,
          rotation: rng() * Math.PI * 2, scale: 0.8 + rng() * 0.4,
        });
      }
      return out;
    },
  },
  { // Farne (neu)
    count: (rng) => 4 + Math.floor(rng() * 3),
    gen: (center, rng) => {
      const out = [];
      const n = 4 + Math.floor(rng() * 3);
      for (let i = 0; i < n; i++) {
        const p = scatter(rng, center.x, center.z, 0.3, 2.2);
        out.push({ type: 'fern', x: p.x, z: p.z, y: 0.32 });
      }
      return out;
    },
  },
];

/* ========== MOUNTAIN ========== */
BIOME_GENERATORS.mountain = [
  { // Felsen
    count: (rng) => 5 + Math.floor(rng() * 2),
    gen: (center, rng) => {
      const out = [];
      const n = 5 + Math.floor(rng() * 2);
      for (let i = 0; i < n; i++) {
        const p = scatter(rng, center.x, center.z, 0.5, 2.4);
        out.push({
          type: 'rock', x: p.x, z: p.z, y: 0.42 + rng() * 0.1,
          rotation: [rng() * Math.PI, rng() * Math.PI, rng() * Math.PI],
          scale: 0.8 + rng() * 0.4,
        });
      }
      return out;
    },
  },
  { // Berggipfel (Landmarke)
    count: () => 1,
    gen: (center) => [{ type: 'mountain_peak', x: center.x, z: center.z, y: 0.85 }],
  },
  { // Schneehaube
    count: () => 1,
    gen: (center) => [{ type: 'snow_cap', x: center.x, z: center.z, y: 1.35 }],
  },
  { // Kristalle (animiert)
    count: (rng) => 3 + Math.floor(rng() * 2),
    gen: (center, rng) => {
      const out = [];
      const n = 3 + Math.floor(rng() * 2);
      for (let i = 0; i < n; i++) {
        const p = scatter(rng, center.x, center.z, 0.6, 2.0);
        out.push({
          type: 'crystal', x: p.x, z: p.z, y: 0.5,
          userData: { spin: 0.4 + rng() * 0.3, orbit: 0.5 + rng() * 0.4 },
        });
      }
      return out;
    },
  },
  { // Steinmaennchen (cairn, neu)
    count: (rng) => 2 + Math.floor(rng() * 2),
    gen: (center, rng) => {
      const out = [];
      const n = 2 + Math.floor(rng() * 2);
      for (let i = 0; i < n; i++) {
        const p = scatter(rng, center.x, center.z, 0.7, 2.2);
        out.push({ type: 'cairn', x: p.x, z: p.z, y: 0.35, stones: 2 + Math.floor(rng() * 2) });
      }
      return out;
    },
  },
];

/* ========== SWAMP ========== */
BIOME_GENERATORS.swamp = [
  { // Sumpfgrund
    count: () => 1,
    gen: (center) => [{ type: 'swamp_ground', x: center.x, z: center.z, y: 0.06 }],
  },
  { // Schilfgras
    count: (rng) => 8 + Math.floor(rng() * 4),
    gen: (center, rng) => {
      const out = [];
      const n = 8 + Math.floor(rng() * 4);
      for (let i = 0; i < n; i++) {
        const p = scatter(rng, center.x, center.z, 0.4, 2.2);
        out.push({
          type: 'reed', x: p.x, z: p.z, y: 0.22,
          rotation: { z: (rng() - 0.5) * 0.2 },
        });
      }
      return out;
    },
  },
  { // Baumleichen
    count: (rng) => 2 + Math.floor(rng() * 2),
    gen: (center, rng) => {
      const out = [];
      const n = 2 + Math.floor(rng() * 2);
      for (let i = 0; i < n; i++) {
        const p = scatter(rng, center.x, center.z, 0.6, 1.8);
        out.push({
          type: 'dead_tree', x: p.x, z: p.z, y: 0.35,
          rotation: { z: (rng() - 0.5) * 0.4 },
        });
      }
      return out;
    },
  },
  { // Gluehwuermchen (animiert)
    count: (rng) => 5 + Math.floor(rng() * 3),
    gen: (center, rng) => {
      const out = [];
      const n = 5 + Math.floor(rng() * 3);
      for (let i = 0; i < n; i++) {
        const p = scatter(rng, center.x, center.z, 0.3, 2.0);
        out.push({
          type: 'firefly', x: p.x, z: p.z, y: 0.5 + rng() * 0.6,
          userData: { spin: 0.3, orbit: 0.3 + rng() * 0.3 },
        });
      }
      return out;
    },
  },
  { // Seerosenblaetter (neu)
    count: (rng) => 3 + Math.floor(rng() * 2),
    gen: (center, rng) => {
      const out = [];
      const n = 3 + Math.floor(rng() * 2);
      for (let i = 0; i < n; i++) {
        const p = scatter(rng, center.x, center.z, 0.4, 1.6);
        out.push({
          type: 'lily_pad', x: p.x, z: p.z, y: 0.1,
          rotation: rng() * Math.PI * 2,
        });
      }
      return out;
    },
  },
];

/* ========== ICE ========== */
BIOME_GENERATORS.ice = [
  { // Eissee
    count: () => 1,
    gen: (center) => [{ type: 'ice_lake', x: center.x, z: center.z, y: 0.08 }],
  },
  { // Eiskristalle
    count: (rng) => 6 + Math.floor(rng() * 2),
    gen: (center, rng) => {
      const out = [];
      const n = 6 + Math.floor(rng() * 2);
      for (let i = 0; i < n; i++) {
        const p = scatter(rng, center.x, center.z, 0.5, 2.2);
        out.push({
          type: 'ice_crystal', x: p.x, z: p.z, y: 0.35 + rng() * 0.15,
          rotation: [rng() * Math.PI, rng() * Math.PI, rng() * Math.PI],
        });
      }
      return out;
    },
  },
  { // Iglu
    count: () => 1,
    gen: (center) => [{ type: 'igloo', x: center.x + 0.8, z: center.z - 0.5, y: 0.3 }],
  },
  { // Schneehaufen
    count: (rng) => 4 + Math.floor(rng() * 2),
    gen: (center, rng) => {
      const out = [];
      const n = 4 + Math.floor(rng() * 2);
      for (let i = 0; i < n; i++) {
        const p = scatter(rng, center.x, center.z, 0.4, 2.0);
        out.push({ type: 'snow_pile', x: p.x, z: p.z, y: 0.18, scale: 0.8 + rng() * 0.2 });
      }
      return out;
    },
  },
  { // Polarlicht
    count: () => 1,
    gen: (center) => [{ type: 'aurora', x: center.x, z: center.z, y: 2.8, userData: { spin: 0.1 } }],
  },
  { // Polarlicht-Sterne (neu)
    count: (rng) => 3 + Math.floor(rng() * 2),
    gen: (center, rng) => {
      const out = [];
      const n = 3 + Math.floor(rng() * 2);
      for (let i = 0; i < n; i++) {
        const p = scatter(rng, center.x, center.z, 0.5, 1.8);
        out.push({
          type: 'polar_star', x: p.x, z: p.z, y: 2.2 + rng() * 0.8,
          userData: { spin: 0.4 + rng() * 0.2 },
        });
      }
      return out;
    },
  },
];

/* ========== VOLCANO ========== */
BIOME_GENERATORS.volcano = [
  { // Lavasee
    count: () => 1,
    gen: (center) => [{ type: 'lava_lake', x: center.x, z: center.z, y: 0.08 }],
  },
  { // Vulkan-Kegel
    count: () => 1,
    gen: (center) => [{ type: 'volcano_cone', x: center.x, z: center.z, y: 0.65 }],
  },
  { // Lavafluesse
    count: (rng) => 4 + Math.floor(rng() * 2),
    gen: (center, rng) => {
      const out = [];
      const n = 4 + Math.floor(rng() * 2);
      for (let i = 0; i < n; i++) {
        const angle = (i / n) * Math.PI * 2 + rng() * 0.3;
        const len = 1.2 + rng() * 0.5;
        out.push({
          type: 'lava_flow',
          x: center.x + Math.cos(angle) * len * 0.5,
          z: center.z + Math.sin(angle) * len * 0.5,
          y: 0.1, rotation: -angle, length: len,
        });
      }
      return out;
    },
  },
  { // Feuersaeulen
    count: (rng) => 3 + Math.floor(rng() * 2),
    gen: (center, rng) => {
      const out = [];
      const n = 3 + Math.floor(rng() * 2);
      for (let i = 0; i < n; i++) {
        const p = scatter(rng, center.x, center.z, 0.6, 2.0);
        out.push({
          type: 'fire_pillar', x: p.x, z: p.z, y: 0.5 + rng() * 0.2,
          userData: { spin: 0.2, orbit: 0.4 + rng() * 0.2 },
        });
      }
      return out;
    },
  },
  { // Rauchende Felsen
    count: (rng) => 5 + Math.floor(rng() * 2),
    gen: (center, rng) => {
      const out = [];
      const n = 5 + Math.floor(rng() * 2);
      for (let i = 0; i < n; i++) {
        const p = scatter(rng, center.x, center.z, 0.6, 2.2);
        out.push({
          type: 'smoke_rock', x: p.x, z: p.z, y: 0.32 + rng() * 0.12,
          rotation: [rng() * Math.PI, rng() * Math.PI, rng() * Math.PI],
          scale: 0.8 + rng() * 0.4,
        });
      }
      return out;
    },
  },
  { // Glutfunken (ember, neu)
    count: (rng) => 4 + Math.floor(rng() * 3),
    gen: (center, rng) => {
      const out = [];
      const n = 4 + Math.floor(rng() * 3);
      for (let i = 0; i < n; i++) {
        const p = scatter(rng, center.x, center.z, 0.4, 2.0);
        out.push({
          type: 'ember', x: p.x, z: p.z, y: 0.8 + rng() * 1.0,
          userData: { spin: 0.5 + rng() * 0.3, orbit: 0.3 + rng() * 0.3 },
        });
      }
      return out;
    },
  },
];

/* ========== CLOUDS ========== */
BIOME_GENERATORS.clouds = [
  { // Schwebende Hauptinsel
    count: () => 1,
    gen: (center) => [{ type: 'cloud_island', x: center.x, z: center.z, y: 0.15 }],
  },
  { // Kleine schwebende Inseln
    count: (rng) => 3 + Math.floor(rng() * 2),
    gen: (center, rng) => {
      const out = [];
      const n = 3 + Math.floor(rng() * 2);
      for (let i = 0; i < n; i++) {
        const p = scatter(rng, center.x, center.z, 0.6, 2.4);
        out.push({
          type: 'cloud_island', x: p.x, z: p.z, y: 0.6 + rng() * 0.5,
          scale: 0.4 + rng() * 0.2, userData: { spin: 0.08 },
        });
      }
      return out;
    },
  },
  { // Wolkenbueschel
    count: (rng) => 4 + Math.floor(rng() * 2),
    gen: (center, rng) => {
      const out = [];
      const n = 4 + Math.floor(rng() * 2);
      for (let i = 0; i < n; i++) {
        const p = scatter(rng, center.x, center.z, 0.6, 2.4);
        out.push({
          type: 'cloud_puff', x: p.x, z: p.z, y: 0.5 + rng() * 0.8,
          userData: { spin: 0.05 },
        });
      }
      return out;
    },
  },
  { // Regenbogen
    count: () => 1,
    gen: (center) => [{ type: 'rainbow', x: center.x, z: center.z, y: 0.9, userData: { spin: 0.1 } }],
  },
  { // Leuchtende Sterne
    count: (rng) => 4 + Math.floor(rng() * 2),
    gen: (center, rng) => {
      const out = [];
      const n = 4 + Math.floor(rng() * 2);
      for (let i = 0; i < n; i++) {
        const p = scatter(rng, center.x, center.z, 0.4, 1.8);
        out.push({
          type: 'floating_star', x: p.x, z: p.z, y: 1.2 + rng() * 0.6,
          userData: { spin: 0.6, orbit: 0.3 + rng() * 0.2 },
        });
      }
      return out;
    },
  },
  { // Wolkenbruecke (neu)
    count: (rng) => 2 + Math.floor(rng() * 2),
    gen: (center, rng) => {
      const out = [];
      const n = 2 + Math.floor(rng() * 2);
      for (let i = 0; i < n; i++) {
        const p = scatter(rng, center.x, center.z, 0.5, 2.0);
        out.push({
          type: 'cloud_bridge', x: p.x, z: p.z, y: 0.4 + rng() * 0.3,
          rotation: rng() * Math.PI * 2,
        });
      }
      return out;
    },
  },
];

/**
 * Erzeugt alle Decor-Specs fuer ein Biom.
 * @param {string} biome - Biom-Name
 * @param {{x:number, z:number}} center - Regionsmittelpunkt
 * @param {function} rng - Seeded RNG (mulberry32)
 * @returns {Array<{type:string, x:number, z:number, y:number, ...}>}
 */
export function generateDecorSpecs(biome, center, rng) {
  const generators = BIOME_GENERATORS[biome] || BIOME_GENERATORS.village;
  const all = [];
  generators.forEach((g) => {
    const specs = g.gen(center, rng);
    specs.forEach((s) => {
      if (validateSpec(s)) all.push(s);
    });
  });
  return all;
}