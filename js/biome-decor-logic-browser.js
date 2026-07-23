/**
 * Biome Decor Logic — Browser-Kompatibel (IIFE)
 *
 * Gleiche Logik wie biome-decor-logic.js (ESM),
 * aber als IIFE fuer <script>-Tag ohne Module-Loader.
 * Gleicht die Specs aus biome-decor-logic.js ab.
 */
(function () {
  'use strict';

  // Re-implementiert die Logik identisch zum ESM-Modul

  var BIOME_DECOR_TYPES = Object.freeze([
    'house', 'tree', 'flower', 'well', 'fence', 'lamp',
    'dune', 'cactus', 'pyramid', 'skeleton', 'oasis_palm',
    'pine_tree', 'mushroom', 'bush', 'stump', 'fallen_log', 'fern',
    'rock', 'mountain_peak', 'snow_cap', 'crystal', 'cairn',
    'swamp_ground', 'reed', 'dead_tree', 'firefly', 'lily_pad',
    'ice_lake', 'ice_crystal', 'igloo', 'snow_pile', 'aurora', 'polar_star',
    'lava_lake', 'volcano_cone', 'lava_flow', 'fire_pillar', 'smoke_rock', 'ember',
    'cloud_island', 'cloud_puff', 'rainbow', 'floating_star', 'cloud_bridge',
  ]);

  var DS = 2.4;

  function validateSpec(spec) {
    if (!spec || typeof spec !== 'object') return false;
    if (!spec.type || typeof spec.type !== 'string') return false;
    if (typeof spec.x !== 'number' || isNaN(spec.x)) return false;
    if (typeof spec.z !== 'number' || isNaN(spec.z)) return false;
    if (typeof spec.y !== 'number' || isNaN(spec.y)) return false;
    return true;
  }

  function scatter(rng, cx, cz, minR, maxR) {
    var a = rng() * Math.PI * 2;
    var r = (minR + rng() * (maxR - minR)) * DS;
    return { x: cx + Math.cos(a) * r, z: cz + Math.sin(a) * r * 0.85 };
  }

  // Generator-Definitionen (identisch zum ESM)
  var G = {};

  G.village = [
    {
      count: function (rng) { return 4 + Math.floor(rng() * 2); },
      gen: function (center, rng) {
        var out = [];
        var wallColors = ['#ff6b6b', '#4ecdc4', '#ffe66d', '#ffb6b9', '#a8d8ea', '#ffaaa5'];
        var n = 4 + Math.floor(rng() * 2);
        for (var i = 0; i < n; i++) {
          var p = scatter(rng, center.x, center.z, 0.4, 2.2);
          out.push({ type: 'house', x: p.x, z: p.z, y: 0.3, rotation: rng() * Math.PI * 2, color: wallColors[i % wallColors.length] });
        }
        return out;
      },
    },
    {
      count: function (rng) { return 3 + Math.floor(rng() * 2); },
      gen: function (center, rng) {
        var out = [];
        var n = 3 + Math.floor(rng() * 2);
        for (var i = 0; i < n; i++) {
          var p = scatter(rng, center.x, center.z, 0.5, 2.0);
          out.push({ type: 'tree', x: p.x, z: p.z, y: 0.3, scale: 0.9 + rng() * 0.2 });
        }
        return out;
      },
    },
    {
      count: function (rng) { return 6 + Math.floor(rng() * 4); },
      gen: function (center, rng) {
        var out = [];
        var flowerColors = ['#ff6b6b', '#ffe66d', '#ff8b94', '#ba68c8', '#4dd0e1', '#ff80ab'];
        var n = 6 + Math.floor(rng() * 4);
        for (var i = 0; i < n; i++) {
          var p = scatter(rng, center.x, center.z, 0.3, 2.4);
          out.push({ type: 'flower', x: p.x, z: p.z, y: 0.35, color: flowerColors[i % flowerColors.length] });
        }
        return out;
      },
    },
    { count: function () { return 1; }, gen: function (center) { return [{ type: 'well', x: center.x, z: center.z, y: 0.48 }]; } },
    {
      count: function (rng) { return 3 + Math.floor(rng() * 2); },
      gen: function (center, rng) {
        var out = [];
        var n = 3 + Math.floor(rng() * 2);
        for (var i = 0; i < n; i++) {
          var p = scatter(rng, center.x, center.z, 0.6, 2.0);
          out.push({ type: 'fence', x: p.x, z: p.z, y: 0.3, rotation: rng() * Math.PI * 2 });
        }
        return out;
      },
    },
    {
      count: function (rng) { return 2 + Math.floor(rng() * 2); },
      gen: function (center, rng) {
        var out = [];
        var n = 2 + Math.floor(rng() * 2);
        for (var i = 0; i < n; i++) {
          var p = scatter(rng, center.x, center.z, 0.5, 1.8);
          out.push({ type: 'lamp', x: p.x, z: p.z, y: 0.3, userData: { glow: true } });
        }
        return out;
      },
    },
  ];

  G.desert = [
    {
      count: function (rng) { return 5 + Math.floor(rng() * 2); },
      gen: function (center, rng) {
        var out = [];
        var n = 5 + Math.floor(rng() * 2);
        for (var i = 0; i < n; i++) {
          var p = scatter(rng, center.x, center.z, 0.5, 2.4);
          out.push({ type: 'dune', x: p.x, z: p.z, y: 0.3, scale: 1.0 + rng() * 0.3 });
        }
        return out;
      },
    },
    {
      count: function (rng) { return 3 + Math.floor(rng() * 2); },
      gen: function (center, rng) {
        var out = [];
        var n = 3 + Math.floor(rng() * 2);
        for (var i = 0; i < n; i++) {
          var p = scatter(rng, center.x, center.z, 0.6, 2.0);
          out.push({ type: 'cactus', x: p.x, z: p.z, y: 0.32, scale: 0.9 + rng() * 0.4, arms: 1 + Math.floor(rng() * 2) });
        }
        return out;
      },
    },
    { count: function () { return 1; }, gen: function (center) { return [{ type: 'pyramid', x: center.x, z: center.z, y: 0.7 }]; } },
    {
      count: function (rng) { return 2 + Math.floor(rng() * 2); },
      gen: function (center, rng) {
        var out = [];
        var n = 2 + Math.floor(rng() * 2);
        for (var i = 0; i < n; i++) {
          var p = scatter(rng, center.x, center.z, 0.8, 2.2);
          out.push({ type: 'skeleton', x: p.x, z: p.z, y: 0.3, rotation: rng() * Math.PI * 2 });
        }
        return out;
      },
    },
    {
      count: function (rng) { return 2 + Math.floor(rng() * 2); },
      gen: function (center, rng) {
        var out = [];
        var n = 2 + Math.floor(rng() * 2);
        for (var i = 0; i < n; i++) {
          var p = scatter(rng, center.x, center.z, 0.5, 1.8);
          out.push({ type: 'oasis_palm', x: p.x, z: p.z, y: 0.32 });
        }
        return out;
      },
    },
  ];

  G.forest = [
    {
      count: function (rng) { return 6 + Math.floor(rng() * 2); },
      gen: function (center, rng) {
        var out = [];
        var n = 6 + Math.floor(rng() * 2);
        for (var i = 0; i < n; i++) {
          var p = scatter(rng, center.x, center.z, 0.5, 2.4);
          out.push({ type: 'pine_tree', x: p.x, z: p.z, y: 0.32, rotation: rng() * Math.PI * 2, scale: 0.9 + rng() * 0.3, crowns: 2 + Math.floor(rng() * 2) });
        }
        return out;
      },
    },
    {
      count: function (rng) { return 4 + Math.floor(rng() * 2); },
      gen: function (center, rng) {
        var out = [];
        var n = 4 + Math.floor(rng() * 2);
        for (var i = 0; i < n; i++) {
          var p = scatter(rng, center.x, center.z, 0.4, 2.0);
          out.push({ type: 'mushroom', x: p.x, z: p.z, y: 0.32 });
        }
        return out;
      },
    },
    {
      count: function (rng) { return 3 + Math.floor(rng() * 2); },
      gen: function (center, rng) {
        var out = [];
        var n = 3 + Math.floor(rng() * 2);
        for (var i = 0; i < n; i++) {
          var p = scatter(rng, center.x, center.z, 0.4, 2.2);
          out.push({ type: 'bush', x: p.x, z: p.z, y: 0.35, scale: 0.8 + rng() * 0.2 });
        }
        return out;
      },
    },
    {
      count: function () { return 1; },
      gen: function (center, rng) {
        var p = scatter(rng, center.x, center.z, 0.6, 1.8);
        return [{ type: 'stump', x: p.x, z: p.z, y: 0.4 }];
      },
    },
    {
      count: function (rng) { return 2 + Math.floor(rng() * 2); },
      gen: function (center, rng) {
        var out = [];
        var n = 2 + Math.floor(rng() * 2);
        for (var i = 0; i < n; i++) {
          var p = scatter(rng, center.x, center.z, 0.5, 2.0);
          out.push({ type: 'fallen_log', x: p.x, z: p.z, y: 0.3, rotation: rng() * Math.PI * 2, scale: 0.8 + rng() * 0.4 });
        }
        return out;
      },
    },
    {
      count: function (rng) { return 4 + Math.floor(rng() * 3); },
      gen: function (center, rng) {
        var out = [];
        var n = 4 + Math.floor(rng() * 3);
        for (var i = 0; i < n; i++) {
          var p = scatter(rng, center.x, center.z, 0.3, 2.2);
          out.push({ type: 'fern', x: p.x, z: p.z, y: 0.32 });
        }
        return out;
      },
    },
  ];

  G.mountain = [
    {
      count: function (rng) { return 5 + Math.floor(rng() * 2); },
      gen: function (center, rng) {
        var out = [];
        var n = 5 + Math.floor(rng() * 2);
        for (var i = 0; i < n; i++) {
          var p = scatter(rng, center.x, center.z, 0.5, 2.4);
          out.push({ type: 'rock', x: p.x, z: p.z, y: 0.42 + rng() * 0.1, rotation: [rng() * Math.PI, rng() * Math.PI, rng() * Math.PI], scale: 0.8 + rng() * 0.4 });
        }
        return out;
      },
    },
    { count: function () { return 1; }, gen: function (center) { return [{ type: 'mountain_peak', x: center.x, z: center.z, y: 0.85 }]; } },
    { count: function () { return 1; }, gen: function (center) { return [{ type: 'snow_cap', x: center.x, z: center.z, y: 1.35 }]; } },
    {
      count: function (rng) { return 3 + Math.floor(rng() * 2); },
      gen: function (center, rng) {
        var out = [];
        var n = 3 + Math.floor(rng() * 2);
        for (var i = 0; i < n; i++) {
          var p = scatter(rng, center.x, center.z, 0.6, 2.0);
          out.push({ type: 'crystal', x: p.x, z: p.z, y: 0.5, userData: { spin: 0.4 + rng() * 0.3, orbit: 0.5 + rng() * 0.4 } });
        }
        return out;
      },
    },
    {
      count: function (rng) { return 2 + Math.floor(rng() * 2); },
      gen: function (center, rng) {
        var out = [];
        var n = 2 + Math.floor(rng() * 2);
        for (var i = 0; i < n; i++) {
          var p = scatter(rng, center.x, center.z, 0.7, 2.2);
          out.push({ type: 'cairn', x: p.x, z: p.z, y: 0.35, stones: 2 + Math.floor(rng() * 2) });
        }
        return out;
      },
    },
  ];

  G.swamp = [
    { count: function () { return 1; }, gen: function (center) { return [{ type: 'swamp_ground', x: center.x, z: center.z, y: 0.06 }]; } },
    {
      count: function (rng) { return 8 + Math.floor(rng() * 4); },
      gen: function (center, rng) {
        var out = [];
        var n = 8 + Math.floor(rng() * 4);
        for (var i = 0; i < n; i++) {
          var p = scatter(rng, center.x, center.z, 0.4, 2.2);
          out.push({ type: 'reed', x: p.x, z: p.z, y: 0.22, rotation: { z: (rng() - 0.5) * 0.2 } });
        }
        return out;
      },
    },
    {
      count: function (rng) { return 2 + Math.floor(rng() * 2); },
      gen: function (center, rng) {
        var out = [];
        var n = 2 + Math.floor(rng() * 2);
        for (var i = 0; i < n; i++) {
          var p = scatter(rng, center.x, center.z, 0.6, 1.8);
          out.push({ type: 'dead_tree', x: p.x, z: p.z, y: 0.35, rotation: { z: (rng() - 0.5) * 0.4 } });
        }
        return out;
      },
    },
    {
      count: function (rng) { return 5 + Math.floor(rng() * 3); },
      gen: function (center, rng) {
        var out = [];
        var n = 5 + Math.floor(rng() * 3);
        for (var i = 0; i < n; i++) {
          var p = scatter(rng, center.x, center.z, 0.3, 2.0);
          out.push({ type: 'firefly', x: p.x, z: p.z, y: 0.5 + rng() * 0.6, userData: { spin: 0.3, orbit: 0.3 + rng() * 0.3 } });
        }
        return out;
      },
    },
    {
      count: function (rng) { return 3 + Math.floor(rng() * 2); },
      gen: function (center, rng) {
        var out = [];
        var n = 3 + Math.floor(rng() * 2);
        for (var i = 0; i < n; i++) {
          var p = scatter(rng, center.x, center.z, 0.4, 1.6);
          out.push({ type: 'lily_pad', x: p.x, z: p.z, y: 0.1, rotation: rng() * Math.PI * 2 });
        }
        return out;
      },
    },
  ];

  G.ice = [
    { count: function () { return 1; }, gen: function (center) { return [{ type: 'ice_lake', x: center.x, z: center.z, y: 0.08 }]; } },
    {
      count: function (rng) { return 6 + Math.floor(rng() * 2); },
      gen: function (center, rng) {
        var out = [];
        var n = 6 + Math.floor(rng() * 2);
        for (var i = 0; i < n; i++) {
          var p = scatter(rng, center.x, center.z, 0.5, 2.2);
          out.push({ type: 'ice_crystal', x: p.x, z: p.z, y: 0.35 + rng() * 0.15, rotation: [rng() * Math.PI, rng() * Math.PI, rng() * Math.PI] });
        }
        return out;
      },
    },
    { count: function () { return 1; }, gen: function (center) { return [{ type: 'igloo', x: center.x + 0.8, z: center.z - 0.5, y: 0.3 }]; } },
    {
      count: function (rng) { return 4 + Math.floor(rng() * 2); },
      gen: function (center, rng) {
        var out = [];
        var n = 4 + Math.floor(rng() * 2);
        for (var i = 0; i < n; i++) {
          var p = scatter(rng, center.x, center.z, 0.4, 2.0);
          out.push({ type: 'snow_pile', x: p.x, z: p.z, y: 0.18, scale: 0.8 + rng() * 0.2 });
        }
        return out;
      },
    },
    { count: function () { return 1; }, gen: function (center) { return [{ type: 'aurora', x: center.x, z: center.z, y: 2.8, userData: { spin: 0.1 } }]; } },
    {
      count: function (rng) { return 3 + Math.floor(rng() * 2); },
      gen: function (center, rng) {
        var out = [];
        var n = 3 + Math.floor(rng() * 2);
        for (var i = 0; i < n; i++) {
          var p = scatter(rng, center.x, center.z, 0.5, 1.8);
          out.push({ type: 'polar_star', x: p.x, z: p.z, y: 2.2 + rng() * 0.8, userData: { spin: 0.4 + rng() * 0.2 } });
        }
        return out;
      },
    },
  ];

  G.volcano = [
    { count: function () { return 1; }, gen: function (center) { return [{ type: 'lava_lake', x: center.x, z: center.z, y: 0.08 }]; } },
    { count: function () { return 1; }, gen: function (center) { return [{ type: 'volcano_cone', x: center.x, z: center.z, y: 0.65 }]; } },
    {
      count: function (rng) { return 4 + Math.floor(rng() * 2); },
      gen: function (center, rng) {
        var out = [];
        var n = 4 + Math.floor(rng() * 2);
        for (var i = 0; i < n; i++) {
          var angle = (i / n) * Math.PI * 2 + rng() * 0.3;
          var len = 1.2 + rng() * 0.5;
          out.push({ type: 'lava_flow', x: center.x + Math.cos(angle) * len * 0.5, z: center.z + Math.sin(angle) * len * 0.5, y: 0.1, rotation: -angle, length: len });
        }
        return out;
      },
    },
    {
      count: function (rng) { return 3 + Math.floor(rng() * 2); },
      gen: function (center, rng) {
        var out = [];
        var n = 3 + Math.floor(rng() * 2);
        for (var i = 0; i < n; i++) {
          var p = scatter(rng, center.x, center.z, 0.6, 2.0);
          out.push({ type: 'fire_pillar', x: p.x, z: p.z, y: 0.5 + rng() * 0.2, userData: { spin: 0.2, orbit: 0.4 + rng() * 0.2 } });
        }
        return out;
      },
    },
    {
      count: function (rng) { return 5 + Math.floor(rng() * 2); },
      gen: function (center, rng) {
        var out = [];
        var n = 5 + Math.floor(rng() * 2);
        for (var i = 0; i < n; i++) {
          var p = scatter(rng, center.x, center.z, 0.6, 2.2);
          out.push({ type: 'smoke_rock', x: p.x, z: p.z, y: 0.32 + rng() * 0.12, rotation: [rng() * Math.PI, rng() * Math.PI, rng() * Math.PI], scale: 0.8 + rng() * 0.4 });
        }
        return out;
      },
    },
    {
      count: function (rng) { return 4 + Math.floor(rng() * 3); },
      gen: function (center, rng) {
        var out = [];
        var n = 4 + Math.floor(rng() * 3);
        for (var i = 0; i < n; i++) {
          var p = scatter(rng, center.x, center.z, 0.4, 2.0);
          out.push({ type: 'ember', x: p.x, z: p.z, y: 0.8 + rng() * 1.0, userData: { spin: 0.5 + rng() * 0.3, orbit: 0.3 + rng() * 0.3 } });
        }
        return out;
      },
    },
  ];

  G.clouds = [
    { count: function () { return 1; }, gen: function (center) { return [{ type: 'cloud_island', x: center.x, z: center.z, y: 0.15 }]; } },
    {
      count: function (rng) { return 3 + Math.floor(rng() * 2); },
      gen: function (center, rng) {
        var out = [];
        var n = 3 + Math.floor(rng() * 2);
        for (var i = 0; i < n; i++) {
          var p = scatter(rng, center.x, center.z, 0.6, 2.4);
          out.push({ type: 'cloud_island', x: p.x, z: p.z, y: 0.6 + rng() * 0.5, scale: 0.4 + rng() * 0.2, userData: { spin: 0.08 } });
        }
        return out;
      },
    },
    {
      count: function (rng) { return 4 + Math.floor(rng() * 2); },
      gen: function (center, rng) {
        var out = [];
        var n = 4 + Math.floor(rng() * 2);
        for (var i = 0; i < n; i++) {
          var p = scatter(rng, center.x, center.z, 0.6, 2.4);
          out.push({ type: 'cloud_puff', x: p.x, z: p.z, y: 0.5 + rng() * 0.8, userData: { spin: 0.05 } });
        }
        return out;
      },
    },
    { count: function () { return 1; }, gen: function (center) { return [{ type: 'rainbow', x: center.x, z: center.z, y: 0.9, userData: { spin: 0.1 } }]; } },
    {
      count: function (rng) { return 4 + Math.floor(rng() * 2); },
      gen: function (center, rng) {
        var out = [];
        var n = 4 + Math.floor(rng() * 2);
        for (var i = 0; i < n; i++) {
          var p = scatter(rng, center.x, center.z, 0.4, 1.8);
          out.push({ type: 'floating_star', x: p.x, z: p.z, y: 1.2 + rng() * 0.6, userData: { spin: 0.6, orbit: 0.3 + rng() * 0.2 } });
        }
        return out;
      },
    },
    {
      count: function (rng) { return 2 + Math.floor(rng() * 2); },
      gen: function (center, rng) {
        var out = [];
        var n = 2 + Math.floor(rng() * 2);
        for (var i = 0; i < n; i++) {
          var p = scatter(rng, center.x, center.z, 0.5, 2.0);
          out.push({ type: 'cloud_bridge', x: p.x, z: p.z, y: 0.4 + rng() * 0.3, rotation: rng() * Math.PI * 2 });
        }
        return out;
      },
    },
  ];

  function getDecorCount(biome, rng) {
    var generators = G[biome] || G.village;
    var count = 0;
    generators.forEach(function (gen) {
      count += gen.count(rng);
    });
    return count;
  }

  function generateDecorSpecs(biome, center, rng) {
    var generators = G[biome] || G.village;
    var all = [];
    generators.forEach(function (g) {
      var specs = g.gen(center, rng);
      specs.forEach(function (s) {
        if (validateSpec(s)) all.push(s);
      });
    });
    return all;
  }

  window.BiomeDecorLogic = {
    BIOME_DECOR_TYPES: BIOME_DECOR_TYPES,
    validateSpec: validateSpec,
    getDecorCount: getDecorCount,
    generateDecorSpecs: generateDecorSpecs,
  };
})();