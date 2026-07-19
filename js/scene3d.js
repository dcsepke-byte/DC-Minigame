/* ============================================================
   PARTY ARENA — WebGL 3D Stage
   Shared Three.js scene for lobby, board mode and mini-game arenas.
   The HTML UI remains interactive on top; WebGL supplies the world.

   v4 „Grosses Update": EffectComposer + UnrealBloomPass (Glow),
   VSM-Schatten (4096 mapSize), PMREM Environment-Map (Reflexionen),
   physically-correct lights, ACES Tone Mapping.
   ============================================================ */

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

/* Global exposure fuer Konsumenten (host.js/player.js/main.js pruefen window.Party3D) */
window.THREE = THREE;

const API = {};
window.Party3D = API;
const palette = ['#ff3cac', '#00f0ff', '#2bffb9', '#ffd34e', '#7b2ff7', '#ff6a00', '#3a86ff', '#ff4d6d'];
const state = {
  mode: 'showcase',
  game: null,
  board: { tiles: [], players: [], owners: {} },
  ready: false,
  reducedMotion: window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
};

let renderer = null;
let scene = null;
let camera = null;
let clock = null;
let composer = null;
let pmremEnv = null;
let boardGroup = null;
let arenaGroup = null;
let showcaseGroup = null;
let particles = null;
let pointer = { x: 0, y: 0 };
let activeArenaId = '';
/* Pawn-Hop-Animation — Meshes und Anim-State werden über rebuilds hinweg behalten */
let pawnMeshes = {};   /* playerId -> THREE.Group */
let pawnAnim = {};     /* playerId -> {active, from, to, currentStep, nextStep, progress, ...} */

function noop() {}

function color(value, fallback = '#7b2ff7') {
  return new THREE.Color(value || fallback);
}

function material(hex, options = {}) {
  const base = color(hex);
  return new THREE.MeshStandardMaterial({
    color: base,
    roughness: options.roughness == null ? 0.38 : options.roughness,
    metalness: options.metalness == null ? 0.42 : options.metalness,
    emissive: options.emissive || base,
    emissiveIntensity: options.emissiveIntensity == null ? 0.18 : options.emissiveIntensity,
    transparent: !!options.transparent,
    opacity: options.opacity == null ? 1 : options.opacity,
  });
}

function addGlow(group, hex, radius = 1.2, intensity = 1.3) {
  const light = new THREE.PointLight(color(hex), intensity, radius * 7, 2);
  light.position.y = radius * 0.8;
  group.add(light);
  return light;
}

function clearGroup(group) {
  if (!group) return;
  while (group.children.length) {
    const child = group.children.pop();
    child.traverse(node => {
      if (node.geometry) node.geometry.dispose();
      if (node.material) {
        const materials = Array.isArray(node.material) ? node.material : [node.material];
        materials.forEach(m => m.dispose && m.dispose());
      }
    });
  }
}

/* ---------------- Landkarten-Pfad ----------------
   Statt Kreis: ein geschwungener Pfad mit Knotenpunkten, Regionen
   und Höhenvariation — wie eine Mario-Party-Landkarte.
   Der Pfad verläuft in einer organischen Schleife durch 4 Regionen. */
const MAP_REGIONS = [
  { name: 'Startdorf',  color: '#ffd34e', accent: '#ff6a00', biome: 'village' },
  { name: 'Sternwüste', color: '#ff8c42', accent: '#ffd34e', biome: 'desert'  },
  { name: 'Itemwald',   color: '#2bffb9', accent: '#00f0ff', biome: 'forest'  },
  { name: 'Eventberg',  color: '#7b2ff7', accent: '#ff3cac', biome: 'mountain' },
];

function tilePosition(index, total = 40) {
  /* Geschwungener Pfad: Kombination aus Sinus-Kurven und Radius-Variation
     erzeugt eine organische Landkarten-Schleife mit 4 Regionen.
     Skaliert automatisch mit total — für 40 Felder etwas weitere Schleife. */
  const t = index / Math.max(1, total);
  const angle = t * Math.PI * 2 - Math.PI / 2;
  /* Radius variiert — erzeugt "Beulen" die den Pfad interessanter machen.
     Für mehr Felder: Radius etwas größer, damit Felder nicht überlappen. */
  const radiusBase = total > 30 ? 7.6 : 6.2;
  const radiusVar = Math.sin(t * Math.PI * 4) * 1.4 + Math.cos(t * Math.PI * 6) * 0.6;
  const r = radiusBase + radiusVar;
  /* Höhe variiert leicht — erzeugt Hügel im Pfad */
  const y = Math.sin(t * Math.PI * 3) * 0.35 + Math.cos(t * Math.PI * 5) * 0.18;
  return {
    x: Math.cos(angle) * r,
    z: Math.sin(angle) * (r * 0.72),
    y,
    angle,
  };
}

function tileColor(tile, owner) {
  if (owner && owner.color) return owner.color;
  if (tile && tile.type === 'start') return '#ffd34e';
  if (tile && tile.type === 'event') return '#ff4d6d';
  if (tile && tile.type === 'starshop') return '#ffd34e';
  if (tile && tile.type === 'itemshop') return '#2bffb9';
  if (tile && tile.type === 'lucky') return '#7bff7b';
  if (tile && tile.type === 'bonus') return '#2bffb9';
  return '#00f0ff';
}

function pawn(player, index, totalAtTile) {
  const group = new THREE.Group();
  const baseColor = player.color || palette[index % palette.length];
  const darkMat = material('#10102f', { metalness: 0.8, emissiveIntensity: 0.06 });

  /* Pedestal — hexagonal disc with glowing rim */
  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.42, 0.16, 12), darkMat);
  pedestal.position.y = 0.08;
  pedestal.castShadow = true;
  pedestal.receiveShadow = true;
  group.add(pedestal);
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(0.38, 0.025, 12, 10),
    new THREE.MeshStandardMaterial({ color: color(baseColor), transparent: true, opacity: 0.9, emissive: color(baseColor), emissiveIntensity: 0.3 })
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.16;
  group.add(rim);

  /* Glow ring under pawn */
  addGlow(group, baseColor, 0.85, 0.75);

  /* Haupt-Charakter: großes Emoji-Modell als Körper
     Das Emoji entspricht der Figur, die am Anfang ausgewählt wurde.
     Es schwebt über dem Podest und wackelt leicht (idle-Animation). */
  const emoji = String(player.figure || player.char || player.emoji || '★');
  const charSprite = makeTextSprite(emoji, baseColor);
  charSprite.scale.setScalar(0.85);
  charSprite.position.y = 0.85;
  charSprite.userData.bob = index * 0.5;  /* phasenversetzte Schwebeanimation */
  group.add(charSprite);
  group.userData.charSprite = charSprite;

  /* Name-Badge unter dem Emoji — Spielername klar lesbar */
  const nameText = String(player.name || 'Spieler').slice(0, 12);
  const nameSprite = makeLabelSprite(nameText, '#ffffff', 28);
  nameSprite.scale.setScalar(0.55);
  nameSprite.position.y = -0.05;
  group.add(nameSprite);

  const pos = tilePosition(Number(player.position) || 0, state.board.tiles.length || 24);
  const offset = (index - (totalAtTile - 1) / 2) * 0.46;
  group.position.set(pos.x + offset * Math.cos(pos.angle + Math.PI / 2), pos.y + 0.18, pos.z + offset * Math.sin(pos.angle + Math.PI / 2));
  group.rotation.y = -pos.angle;
  group.userData.phase = index * 0.7;
  group.userData.playerId = player.id;
  return group;
}

function makeTextSprite(text, hex) {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.font = 'bold 180px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = hex || '#fff';
  ctx.shadowColor = 'rgba(0,0,0,0.7)';
  ctx.shadowBlur = 16;
  ctx.fillText(text, 128, 136);
  const tex = new THREE.CanvasTexture(canvas);
  if ('anisotropy' in tex) tex.anisotropy = 8;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  return new THREE.Sprite(mat);
}

/* Label für Feld-Typ — klar verständlich für den Spieler */
function tileLabel(tile) {
  const t = (tile && tile.type) || 'property';
  const labels = {
    start:    'START',
    event:    'EVENT',
    starshop: 'STERN-LADEN',
    itemshop: 'ITEM-LADEN',
    lucky:    'GLÜCK',
    bonus:    'BONUS',
    property: 'FELD',
  };
  return labels[t] || 'FELD';
}

/* Beschreibung was das Feld macht — kurz und klar */
function tileDescription(tile) {
  const t = (tile && tile.type) || 'property';
  const descs = {
    start:    'Sammle Bonus beim Überqueren',
    event:    'Zufälliges Event wird ausgelöst',
    starshop: 'Kaufe Sterne mit Münzen',
    itemshop: 'Kaufe Items mit Münzen',
    lucky:    'Glücks-Karte: Bonus oder Risiko',
    bonus:    'Sammle Bonus-Münzen',
    property: 'Normales Feld — Punkte sammeln',
  };
  return descs[t] || 'Punkte sammeln';
}

/* Größeres Text-Sprite mit mehreren Zeilen für Feld-Beschriftung */
function makeLabelSprite(text, hex, fontSize) {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 192;
  const ctx = canvas.getContext('2d');
  ctx.font = `bold ${(fontSize || 40) * 2}px "Segoe UI", system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = hex || '#fff';
  ctx.shadowColor = 'rgba(0,0,0,0.9)';
  ctx.shadowBlur = 20;
  ctx.fillText(text, 256, 96);
  const tex = new THREE.CanvasTexture(canvas);
  if ('anisotropy' in tex) tex.anisotropy = 8;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  return new THREE.Sprite(mat);
}

/* Seeded Pseudo-Zufall — deterministic Layout über rebuilds hinweg */
function mulberry32(seed) {
  let a = seed | 0;
  return function() {
    a = (a + 0x6D2B79F5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* Biom-spezifische Dekoration — gibt Array von THREE.Object3D zurück.
   center = {x, z} = Regionsmittelpunkt, rng = mulberry32-seeded RNG.
   Deko wird in einem Radius um center gestreut, avoidPath schneidet nahe Felder aus. */
function biomeDecor(biome, center, rng) {
  const out = [];
  const cx = center.x, cz = center.z;
  /* Helfer: gestreute Position innerhalb des Regionsradius, nicht auf dem Pfad */
  function scatter(minR, maxR) {
    const a = rng() * Math.PI * 2;
    const r = minR + rng() * (maxR - minR);
    return { x: cx + Math.cos(a) * r, z: cz + Math.sin(a) * r * 0.85 };
  }

  if (biome === 'village') {
    /* Startdorf: kleine Häuser mit Satteldach + ein Dorfbrunnen + Laternen */
    for (let i = 0; i < 4; i++) {
      const p = scatter(0.4, 2.2);
      const house = new THREE.Group();
      const walls = new THREE.Mesh(
        new THREE.BoxGeometry(0.55, 0.5, 0.5),
        new THREE.MeshStandardMaterial({ color: 0xe8d4a0, roughness: 0.85 })
      );
      walls.position.y = 0.25;
      walls.castShadow = true;
      walls.receiveShadow = true;
      house.add(walls);
      /* Satteldach — Pyramide */
      const roof = new THREE.Mesh(
        new THREE.ConeGeometry(0.45, 0.35, 4),
        new THREE.MeshStandardMaterial({ color: 0x8a3a2a, roughness: 0.8 })
      );
      roof.position.y = 0.65;
      roof.rotation.y = Math.PI / 4;
      roof.castShadow = true;
      house.add(roof);
      /* Kleine Tür */
      const door = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.24, 0.02),
        new THREE.MeshStandardMaterial({ color: 0x4a2a1a, roughness: 0.7 })
      );
      door.position.set(0, 0.12, 0.26);
      house.add(door);
      /* Fenster-Glow */
      const win = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.12, 0.02),
        new THREE.MeshStandardMaterial({ color: 0xffd34e, emissive: 0xffd34e, emissiveIntensity: 0.5 })
      );
      win.position.set(-0.18, 0.3, 0.26);
      house.add(win);
      house.position.set(p.x, 0.3, p.z);
      house.rotation.y = rng() * Math.PI * 2;
      out.push(house);
    }
    /* Dorfbrunnen in der Mitte */
    const wellBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.34, 0.35, 12),
      new THREE.MeshStandardMaterial({ color: 0x9a8a78, roughness: 0.9 })
    );
    wellBase.position.set(cx, 0.48, cz);
    wellBase.castShadow = true;
    out.push(wellBase);
    const wellWater = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.24, 0.04, 12),
      new THREE.MeshStandardMaterial({ color: 0x2a4a8a, emissive: 0x1a3a6a, emissiveIntensity: 0.3, roughness: 0.2, metalness: 0.6 })
    );
    wellWater.position.set(cx, 0.66, cz);
    out.push(wellWater);
    /* Pfosten + Dach des Brunnens */
    for (let i = 0; i < 2; i++) {
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.025, 0.025, 0.55, 6),
        new THREE.MeshStandardMaterial({ color: 0x5a3a2a, roughness: 0.85 })
      );
      post.position.set(cx + (i ? 0.22 : -0.22), 0.95, cz);
      post.castShadow = true;
      out.push(post);
    }
    const wellRoof = new THREE.Mesh(
      new THREE.ConeGeometry(0.4, 0.22, 4),
      new THREE.MeshStandardMaterial({ color: 0x8a3a2a, roughness: 0.8 })
    );
    wellRoof.position.set(cx, 1.3, cz);
    wellRoof.rotation.y = Math.PI / 4;
    wellRoof.castShadow = true;
    out.push(wellRoof);
  }

  else if (biome === 'desert') {
    /* Sternwüste: Dünen (flache Kuppen), Kakteen, Pyramide, vertrocknete Büsche */
    for (let i = 0; i < 5; i++) {
      const p = scatter(0.5, 2.4);
      /* Düne — flache Halbkugel in Sandfarbe */
      const dune = new THREE.Mesh(
        new THREE.SphereGeometry(0.45 + rng() * 0.25, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
        new THREE.MeshStandardMaterial({ color: 0xd9a85a, roughness: 0.95 })
      );
      dune.scale.set(1.4, 0.5, 1.1);
      dune.position.set(p.x, 0.3, p.z);
      dune.receiveShadow = true;
      out.push(dune);
    }
    /* Kakteen — zylindrische Säulen mit Armen */
    for (let i = 0; i < 3; i++) {
      const p = scatter(0.6, 2.0);
      const cactus = new THREE.Group();
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.12, 0.7 + rng() * 0.3, 8),
        new THREE.MeshStandardMaterial({ color: 0x3a7a3a, roughness: 0.85, emissive: 0x1a3a1a, emissiveIntensity: 0.1 })
      );
      trunk.position.y = 0.35;
      trunk.castShadow = true;
      cactus.add(trunk);
      /* 1-2 Arme */
      const arms = 1 + Math.floor(rng() * 2);
      for (let j = 0; j < arms; j++) {
        const arm = new THREE.Mesh(
          new THREE.CylinderGeometry(0.06, 0.07, 0.3, 6),
          trunk.material
        );
        arm.position.set((j ? 0.15 : -0.15), 0.45, 0);
        arm.rotation.z = (j ? -0.5 : 0.5);
        arm.castShadow = true;
        cactus.add(arm);
      }
      cactus.position.set(p.x, 0.32, p.z);
      out.push(cactus);
    }
    /* Pyramide als Landmarke */
    const pyramid = new THREE.Mesh(
      new THREE.ConeGeometry(0.55, 0.8, 4),
      new THREE.MeshStandardMaterial({ color: 0xc89b5a, roughness: 0.9, emissive: 0x8a6a3a, emissiveIntensity: 0.1 })
    );
    pyramid.position.set(cx, 0.7, cz);
    pyramid.rotation.y = Math.PI / 4;
    pyramid.castShadow = true;
    out.push(pyramid);
  }

  else if (biome === 'forest') {
    /* Itemwald: Bäume (Stamm + Krone), Pilze, Baumstümpfe, Farnbüschel */
    for (let i = 0; i < 6; i++) {
      const p = scatter(0.5, 2.4);
      const tree = new THREE.Group();
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.11, 0.55, 8),
        new THREE.MeshStandardMaterial({ color: 0x4a2a1a, roughness: 0.9 })
      );
      trunk.position.y = 0.3;
      trunk.castShadow = true;
      tree.add(trunk);
      /* Baumkrone — 2-3 Kugeln gestapelt für organische Form */
      const crownMat = new THREE.MeshStandardMaterial({ color: 0x2a6a3a, roughness: 0.85, emissive: 0x1a3a2a, emissiveIntensity: 0.12 });
      const crowns = 2 + Math.floor(rng() * 2);
      for (let j = 0; j < crowns; j++) {
        const crown = new THREE.Mesh(
          new THREE.IcosahedronGeometry(0.28 + rng() * 0.1, 1),
          crownMat
        );
        crown.position.set((rng() - 0.5) * 0.2, 0.65 + j * 0.18, (rng() - 0.5) * 0.2);
        crown.castShadow = true;
        tree.add(crown);
      }
      tree.position.set(p.x, 0.32, p.z);
      tree.rotation.y = rng() * Math.PI * 2;
      out.push(tree);
    }
    /* Pilze — rote Hüte mit weißen Punkten (Mario-Party-Vibe) */
    for (let i = 0; i < 4; i++) {
      const p = scatter(0.4, 2.0);
      const mushroom = new THREE.Group();
      const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.06, 0.18, 8),
        new THREE.MeshStandardMaterial({ color: 0xf0e0c0, roughness: 0.8 })
      );
      stem.position.y = 0.09;
      mushroom.add(stem);
      const cap = new THREE.Mesh(
        new THREE.SphereGeometry(0.13, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
        new THREE.MeshStandardMaterial({ color: 0xe84a3a, roughness: 0.6, emissive: 0x8a2a1a, emissiveIntensity: 0.2 })
      );
      cap.position.y = 0.18;
      cap.castShadow = true;
      mushroom.add(cap);
      /* Weißer Punkt auf dem Hut */
      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(0.03, 6, 4),
        new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 })
      );
      dot.position.set(0.05, 0.22, 0.04);
      mushroom.add(dot);
      mushroom.position.set(p.x, 0.32, p.z);
      out.push(mushroom);
    }
    /* Baumstumpf */
    const stumpPos = scatter(0.6, 1.8);
    const stump = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.18, 0.18, 10),
      new THREE.MeshStandardMaterial({ color: 0x6a4a2a, roughness: 0.95 })
    );
    stump.position.set(stumpPos.x, 0.4, stumpPos.z);
    stump.castShadow = true;
    out.push(stump);
  }

  else if (biome === 'mountain') {
    /* Eventberg: Felsbrocken, spitzer Gipfel, Schneeflecken, Kristalle */
    for (let i = 0; i < 5; i++) {
      const p = scatter(0.5, 2.4);
      const rock = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.18 + rng() * 0.18, 0),
        new THREE.MeshStandardMaterial({ color: 0x5a5a6a, roughness: 0.95, metalness: 0.05 })
      );
      rock.position.set(p.x, 0.42 + rng() * 0.1, p.z);
      rock.rotation.set(rng() * Math.PI, rng() * Math.PI, rng() * Math.PI);
      rock.castShadow = true;
      out.push(rock);
    }
    /* Berggipfel — markante spitze Form in Regionsmitte */
    const peak = new THREE.Mesh(
      new THREE.ConeGeometry(0.55, 1.1, 6),
      new THREE.MeshStandardMaterial({ color: 0x6a6a7a, roughness: 0.85, metalness: 0.1, emissive: 0x3a3a4a, emissiveIntensity: 0.12 })
    );
    peak.position.set(cx, 0.85, cz);
    peak.castShadow = true;
    out.push(peak);
    /* Schneehaube auf der Spitze — kleine weiße Kugel */
    const snow = new THREE.Mesh(
      new THREE.ConeGeometry(0.3, 0.4, 6),
      new THREE.MeshStandardMaterial({ color: 0xf0f0ff, roughness: 0.4, metalness: 0.1, emissive: 0xd0d0ff, emissiveIntensity: 0.15 })
    );
    snow.position.set(cx, 1.35, cz);
    out.push(snow);
    /* Leuchtende Kristalle — magisch, passend zu Event-Feldern */
    for (let i = 0; i < 3; i++) {
      const p = scatter(0.6, 2.0);
      const crystal = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.12 + rng() * 0.05, 0),
        new THREE.MeshStandardMaterial({ color: 0x9b5cff, emissive: 0x7b2ff7, emissiveIntensity: 0.7, roughness: 0.3, metalness: 0.4 })
      );
      crystal.position.set(p.x, 0.5, p.z);
      crystal.userData.spin = 0.4 + rng() * 0.3;
      crystal.userData.orbit = 0.5 + rng() * 0.4;
      out.push(crystal);
    }
  }

  return out;
}

function buildBoard() {
  if (!scene) return;
  if (boardGroup) {
    scene.remove(boardGroup);
    clearGroup(boardGroup);
  }
  boardGroup = new THREE.Group();
  boardGroup.position.y = -0.85;
  scene.add(boardGroup);

  /* Landkarten-Basis: große unregelmäßige Plattform statt Scheibe */
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(7.2, 7.6, 0.5, 96),
    material('#1a3a2e', { metalness: 0.3, roughness: 0.8, emissive: '#0a1a14', emissiveIntensity: 0.1 })
  );
  base.scale.set(1.15, 1, 0.95);
  base.receiveShadow = true;
  base.castShadow = true;
  boardGroup.add(base);

  /* Regionen: 4 farbige Zonen auf der Karte mit biom-spezifischer Dekoration.
     Jede Region bekommt eine optisch unterscheidbare Landschaft:
     village → Häuser + Brunnen + Brunnen, desert → Dünen + Kakteen + Pyramide,
     forest → Bäume + Pilze + Baumstümpfe, mountain → Felsen + Schnee + Gipfel. */
  MAP_REGIONS.forEach((region, ri) => {
    const rAngle = (ri / 4) * Math.PI * 2 - Math.PI / 2;
    const rPos = { x: Math.cos(rAngle) * 4.5, z: Math.sin(rAngle) * 3.5 };
    /* Boden-Textur pro Biom — unterschiedlicher Farbton auf der Plattform */
    const biomeColors = {
      village:  { ground: '#6b5236', tint: '#a0784a' },  /* sandiger Dorf-Boden */
      desert:   { ground: '#c89b5a', tint: '#e0b070' },  /* warmes Sandgelb */
      forest:   { ground: '#1f3a26', tint: '#2d5a3a' },  /* dunkles Waldboden-Grün */
      mountain: { ground: '#4a4a5a', tint: '#6a6a7a' },  /* graues Felsgestein */
    };
    const bc = biomeColors[region.biome] || biomeColors.village;
    /* Großer Biom-Boden — kreisförmige Fläche in Regionsfarbe */
    const biomeGround = new THREE.Mesh(
      new THREE.CircleGeometry(3.0, 36),
      new THREE.MeshStandardMaterial({
        color: color(bc.ground), roughness: 0.95, metalness: 0.0,
        emissive: color(bc.tint), emissiveIntensity: 0.04
      })
    );
    biomeGround.rotation.x = -Math.PI / 2;
    biomeGround.position.set(rPos.x, 0.27, rPos.z);
    biomeGround.receiveShadow = true;
    boardGroup.add(biomeGround);

    /* Sanfte Glow-Zone (wie bisher, aber dezenter — Biom-Boden dominiert jetzt) */
    const zone = new THREE.Mesh(
      new THREE.CircleGeometry(2.8, 32),
      new THREE.MeshStandardMaterial({
        color: color(region.color), transparent: true, opacity: 0.08,
        emissive: color(region.color), emissiveIntensity: 0.05, roughness: 0.9
      })
    );
    zone.rotation.x = -Math.PI / 2;
    zone.position.set(rPos.x, 0.28, rPos.z);
    boardGroup.add(zone);

    /* Region-Beschriftung */
    const regionLabel = makeLabelSprite(region.name.toUpperCase(), region.color, 32);
    regionLabel.position.set(rPos.x, 0.4, rPos.z);
    regionLabel.scale.setScalar(1.1);
    boardGroup.add(regionLabel);

    /* Biom-spezifische Dekoration — gestreut um den Regionsmittelpunkt.
       Seeded Pseudo-Zufall damit Layout deterministic & stabil über rebuilds. */
    const rng = mulberry32(ri * 1337 + 42);
    const decor = biomeDecor(region.biome, rPos, rng);
    decor.forEach(d => boardGroup.add(d));
  });

  /* Zentrale Landmarke — großer Stern in der Mitte */
  const centerStar = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.9, 2),
    material('#ffd34e', { metalness: 0.5, emissive: '#ffd34e', emissiveIntensity: 0.78 })
  );
  centerStar.position.y = 1.4;
  centerStar.userData.spin = 0.5;
  centerStar.castShadow = true;
  boardGroup.add(centerStar);
  addGlow(centerStar, '#ffd34e', 1.8, 1.5);

  /* Grasbüschel & Streudeko auf der ganzen Karte (nicht nur Regionen) — mehr Leben */
  const globalRng = mulberry32(98765);
  for (let i = 0; i < 36; i++) {
    const a = globalRng() * Math.PI * 2;
    const rad = 3.2 + globalRng() * 4.0;
    const gx = Math.cos(a) * rad;
    const gz = Math.sin(a) * rad * 0.9;
    /* Kleine Stein- oder Gras-Häufchen verstreut — nicht auf dem Pfad */
    if (globalRng() < 0.5) {
      const pebble = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.08 + globalRng() * 0.06, 0),
        new THREE.MeshStandardMaterial({ color: 0x6a6a78, roughness: 0.9 })
      );
      pebble.position.set(gx, 0.32 + globalRng() * 0.05, gz);
      pebble.castShadow = true;
      boardGroup.add(pebble);
    } else {
      const grass = new THREE.Mesh(
        new THREE.ConeGeometry(0.07, 0.22 + globalRng() * 0.1, 5),
        new THREE.MeshStandardMaterial({ color: 0x3a6a3a, roughness: 0.95, emissive: 0x1a3a1a, emissiveIntensity: 0.08 })
      );
      grass.position.set(gx, 0.36, gz);
      grass.castShadow = true;
      boardGroup.add(grass);
    }
  }

  /* Pfad-Verbindungen zwischen Feldern — sichtbare Wege auf der Karte */
  const tiles = state.board.tiles.length ? state.board.tiles : Array.from({ length: 24 }, (_, idx) => ({ idx, type: idx === 0 ? 'start' : idx % 6 === 0 ? 'event' : 'property' }));
  const players = state.board.players || [];
  const totalByTile = {};
  players.forEach(player => {
    const position = Number(player.position) || 0;
    totalByTile[position] = (totalByTile[position] || 0) + 1;
  });

  /* Pfad-Stücke zwischen aufeinanderfolgenden Feldern */
  const pathMat = new THREE.MeshStandardMaterial({ color: 0x8b7355, roughness: 0.85, metalness: 0.05 });
  for (let i = 0; i < tiles.length; i++) {
    const pos1 = tilePosition(Number(tiles[i].idx) || i, tiles.length);
    const pos2 = tilePosition(Number(tiles[(i + 1) % tiles.length].idx) || ((i + 1) % tiles.length), tiles.length);
    /* Pfad als dünnes Band zwischen den Feldern */
    const dx = pos2.x - pos1.x, dz = pos2.z - pos1.z;
    const len = Math.sqrt(dx * dx + dz * dz);
    const midX = (pos1.x + pos2.x) / 2, midZ = (pos1.z + pos2.z) / 2;
    const angle = Math.atan2(dz, dx);
    const path = new THREE.Mesh(new THREE.BoxGeometry(len, 0.08, 0.42), pathMat);
    path.position.set(midX, 0.3, midZ);
    path.rotation.y = -angle;
    path.receiveShadow = true;
    path.castShadow = true;
    boardGroup.add(path);
  }

  tiles.forEach((tile, index) => {
    const pos = tilePosition(Number(tile.idx) || index, tiles.length);
    const tileY = 0.46 + pos.y;
    const ownerId = (state.board.owners || {})[String(tile.idx == null ? index : tile.idx)];
    const owner = players.find(player => player.id === ownerId);
    const tileMat = material(tileColor(tile, owner), { metalness: 0.5, emissiveIntensity: owner ? 0.44 : 0.24 });
    /* Feld — abgerundete Box, flach auf dem Pfad */
    const tileMesh = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.3, 0.8, 4, 2, 4), tileMat);
    tileMesh.position.set(pos.x, tileY, pos.z);
    tileMesh.rotation.y = -pos.angle;
    tileMesh.userData.index = tile.idx == null ? index : tile.idx;
    tileMesh.castShadow = true;
    tileMesh.receiveShadow = true;
    boardGroup.add(tileMesh);

    /* Cap — farbige Oberfläche zeigt Feld-Typ */
    const cap = new THREE.Mesh(
      new THREE.BoxGeometry(0.85, 0.03, 0.55),
      new THREE.MeshStandardMaterial({ color: color(tileColor(tile, owner)), transparent: true, opacity: 0.82, roughness: 0.5, emissive: color(tileColor(tile, owner)), emissiveIntensity: 0.12 })
    );
    cap.position.set(pos.x, tileY + 0.18, pos.z);
    cap.rotation.y = -pos.angle;
    cap.receiveShadow = true;
    boardGroup.add(cap);

    /* Feld-Typ-Label — klar lesbar über dem Feld */
    const label = makeLabelSprite(tileLabel(tile), tileColor(tile, owner), 28);
    label.position.set(pos.x, tileY + 0.95, pos.z);
    label.scale.setScalar(0.7);
    boardGroup.add(label);

    /* Feld-Nummer — klein unten */
    const numSprite = makeTextSprite(String(tile.idx == null ? index : tile.idx), '#ffffff');
    numSprite.position.set(pos.x, tileY + 0.5, pos.z);
    numSprite.scale.setScalar(0.18);
    boardGroup.add(numSprite);

    /* Dekoration nach Typ */
    if (tile.type === 'event') {
      const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.18, 1), material('#ff4d6d', { emissiveIntensity: 0.75 }));
      orb.position.set(pos.x, tileY + 0.7, pos.z);
      orb.userData.orbit = 0.8 + index * 0.05;
      boardGroup.add(orb);
    }
    if (tile.type === 'starshop') {
      const shopStar = new THREE.Mesh(new THREE.OctahedronGeometry(0.2, 1), material('#ffd34e', { emissiveIntensity: 0.85 }));
      shopStar.position.set(pos.x, tileY + 0.7, pos.z);
      shopStar.userData.spin = 0.6;
      shopStar.userData.orbit = 0.6 + index * 0.05;
      boardGroup.add(shopStar);
      addGlow(shopStar, '#ffd34e', 0.9, 0.6);
    }
    if (tile.type === 'itemshop') {
      const gift = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.26, 0.26), material('#2bffb9', { emissiveIntensity: 0.7 }));
      gift.position.set(pos.x, tileY + 0.7, pos.z);
      gift.userData.spin = 0.4;
      gift.userData.orbit = 0.5 + index * 0.05;
      boardGroup.add(gift);
      const ribbon = new THREE.Mesh(
        new THREE.BoxGeometry(0.28, 0.04, 0.06),
        new THREE.MeshStandardMaterial({ color: 0xff3cac, emissive: 0xff3cac, emissiveIntensity: 0.6 })
      );
      ribbon.position.set(pos.x, tileY + 0.85, pos.z);
      ribbon.userData.orbit = 0.5 + index * 0.05;
      boardGroup.add(ribbon);
    }
    if (tile.type === 'lucky') {
      const cloverGroup = new THREE.Group();
      const cloverMat = material('#7bff7b', { emissiveIntensity: 0.65 });
      [[0.09, 0.09], [-0.09, 0.09], [0.09, -0.09], [-0.09, -0.09]].forEach(([cx, cz]) => {
        const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), cloverMat);
        leaf.scale.set(1.3, 0.6, 1.3);
        leaf.position.set(pos.x + cx, tileY + 0.7, pos.z + cz);
        cloverGroup.add(leaf);
      });
      cloverGroup.userData.spin = 0.3;
      cloverGroup.userData.orbit = 0.7 + index * 0.05;
      boardGroup.add(cloverGroup);
    }
    if (tile.type === 'start') {
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.025, 0.025, 0.45, 8),
        new THREE.MeshStandardMaterial({ color: 0x888899, metalness: 0.8 })
      );
      pole.position.set(pos.x, tileY + 0.75, pos.z);
      boardGroup.add(pole);
      const flag = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, 0.13, 0.02),
        material('#ffd34e', { emissiveIntensity: 0.6 })
      );
      flag.position.set(pos.x + 0.12, tileY + 0.9, pos.z);
      flag.userData.orbit = 0.5;
      boardGroup.add(flag);
    }
  });

  /* Pawns: wenn eine Hop-Animation läuft, behalte existierende Pawn-Meshes
     und re-parente sie ins neue boardGroup — sonst teleportiert der rebuild. */
  const livePawns = new Set(Object.keys(pawnAnim).filter(pid => pawnAnim[pid] && pawnAnim[pid].active));
  players.forEach((player, index) => {
    const position = Number(player.position) || 0;
    const sameIndex = players.slice(0, index).filter(p => (Number(p.position) || 0) === position).length;
    const existing = pawnMeshes[player.id];
    if (livePawns.has(player.id) && existing) {
      /* Hop läuft — Mesh behalten, nur ins neue boardGroup umhängen.
         Position wird von updatePawnHops() weiter getrieben. */
      boardGroup.add(existing);
    } else {
      const p = pawn(player, sameIndex, totalByTile[position] || 1);
      pawnMeshes[player.id] = p;
      boardGroup.add(p);
    }
  });
  /* Verwaiste Pawn-Meshes entfernen (Spieler nicht mehr da) */
  Object.keys(pawnMeshes).forEach(pid => {
    if (!players.find(pl => pl.id === pid)) {
      delete pawnMeshes[pid];
      delete pawnAnim[pid];
    }
  });

  addGlow(boardGroup, '#7b2ff7', 4, 1.0);
}

/* Pawn-Hop-Animation: Pawns hüpfen Feld-für-Feld statt zu teleportieren.
   Wird von host.js/player.js bei 'board:rolled' aufgerufen. */
function animatePawnMove(playerId, from, to, total) {
  if (!playerId || !Number.isFinite(from) || !Number.isFinite(to)) return;
  const size = Math.max(1, total || state.board.tiles.length || 24);
  /* Vorwärts-Richtung (mit wrap-around) */
  let steps = to - from;
  if (steps < 0) steps += size;  /* wrap */
  if (steps === 0) return;
  pawnAnim[playerId] = {
    active: true,
    from: from,
    to: to,
    currentStep: from,
    nextStep: (from + 1) % size,
    size: size,
    progress: 0,
    hopDuration: 0.28,  /* Sekunden pro Feld-Hop */
    stepsRemaining: steps,
  };
}

/* Berechnet Pawn-Position auf einem Feld (mit Offset wenn mehrere drauf). */
function pawnPosOnTile(tileIdx, playerIdx, totalAtTile) {
  const pos = tilePosition(tileIdx, state.board.tiles.length || 24);
  const offset = (playerIdx - (totalAtTile - 1) / 2) * 0.46;
  return {
    x: pos.x + offset * Math.cos(pos.angle + Math.PI / 2),
    y: pos.y + 0.18,
    z: pos.z + offset * Math.sin(pos.angle + Math.PI / 2),
    angle: pos.angle,
  };
}

/* Hop-Bogen: Parabel y(t) = 4 * hop * t * (1-t) — steigt und fällt symmetrisch. */
function hopArc(t, hopHeight) {
  return 4 * hopHeight * t * (1 - t);
}

function updatePawnHops(delta) {
  Object.keys(pawnAnim).forEach(pid => {
    const anim = pawnAnim[pid];
    if (!anim || !anim.active) return;
    const mesh = pawnMeshes[pid];
    if (!mesh) { anim.active = false; return; }

    anim.progress += delta / anim.hopDuration;
    /* Fertig mit aktuellem Hop? → nächsten Schritt beginnen */
    while (anim.progress >= 1 && anim.stepsRemaining > 0) {
      anim.progress -= 1;
      anim.currentStep = anim.nextStep;
      anim.stepsRemaining -= 1;
      if (anim.stepsRemaining <= 0) {
        anim.active = false;
        anim.progress = 0;
        break;
      }
      anim.nextStep = (anim.currentStep + 1) % anim.size;
    }

    if (!anim.active) {
      /* Animation beendet — Pawn auf Zielfeld platzieren */
      const target = pawnPosOnTile(anim.to, 0, 1);
      mesh.position.set(target.x, target.y, target.z);
      mesh.rotation.y = -target.angle;
      return;
    }

    /* Zwischen currentStep und nextStep interpolieren + Hop-Bogen */
    const t = Math.min(1, anim.progress);
    const fromPos = pawnPosOnTile(anim.currentStep, 0, 1);
    const toPos = pawnPosOnTile(anim.nextStep, 0, 1);
    /* Pawn schaut in Laufrichtung */
    const x = fromPos.x + (toPos.x - fromPos.x) * t;
    const z = fromPos.z + (toPos.z - fromPos.z) * t;
    const hop = hopArc(t, 0.55);  /* 0.55 Einheiten Hop-Höhe */
    mesh.position.set(x, fromPos.y + hop, z);
    /* Rotation sanft in Laufrichtung drehen */
    const targetAngle = -Math.atan2(toPos.z - fromPos.z, toPos.x - fromPos.x);
    mesh.rotation.y = targetAngle;
  });
}

function themeForGame(id) {
  const key = String(id || '').toLowerCase();
  if (key.includes('bomb')) return { a: '#ff4d6d', b: '#ff6a00', shape: 'danger' };
  if (key.includes('math') || key.includes('number') || key.includes('prime') || key.includes('fraction')) return { a: '#00f0ff', b: '#3a86ff', shape: 'data' };
  if (key.includes('memory') || key.includes('simon') || key.includes('sequence') || key.includes('quiz')) return { a: '#7b2ff7', b: '#ff3cac', shape: 'memory' };
  if (key.includes('target') || key.includes('reflex') || key.includes('reaction') || key.includes('tap')) return { a: '#2bffb9', b: '#00f0ff', shape: 'reflex' };
  if (key.includes('color') || key.includes('stroop') || key.includes('odd')) return { a: '#ff3cac', b: '#ffd34e', shape: 'color' };
  return { a: '#7b2ff7', b: '#00f0ff', shape: 'arena' };
}

function arenaShape(group, theme, index) {
  const angle = (index / 12) * Math.PI * 2;
  const radius = 4.2 + (index % 2) * 0.45;
  const holder = new THREE.Group();
  holder.position.set(Math.cos(angle) * radius, 0.8 + (index % 3) * 0.35, Math.sin(angle) * radius);
  holder.userData.phase = index * 0.42;

  let mesh;
  if (theme.shape === 'danger') {
    mesh = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.15, 8), material(index % 2 ? theme.a : theme.b, { emissiveIntensity: 0.55 }));
  } else if (theme.shape === 'data') {
    mesh = new THREE.Mesh(new THREE.BoxGeometry(0.62, 1.2 + (index % 3) * 0.35, 0.62), material(index % 2 ? theme.a : theme.b, { emissiveIntensity: 0.42 }));
  } else if (theme.shape === 'memory') {
    mesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.5, 2), material(index % 2 ? theme.a : theme.b, { emissiveIntensity: 0.52 }));
  } else if (theme.shape === 'color') {
    mesh = new THREE.Mesh(new THREE.TorusKnotGeometry(0.38, 0.1, 48, 12), material(index % 2 ? theme.a : theme.b, { emissiveIntensity: 0.48 }));
  } else {
    mesh = new THREE.Mesh(new THREE.SphereGeometry(0.45, 32, 24), material(index % 2 ? theme.a : theme.b, { emissiveIntensity: 0.5 }));
  }
  mesh.castShadow = true;
  holder.add(mesh);
  holder.add(addGlow(holder, index % 2 ? theme.a : theme.b, 0.75, 0.55));
  group.add(holder);
}

function buildArena(gameId) {
  if (!scene) return;
  if (arenaGroup) {
    scene.remove(arenaGroup);
    clearGroup(arenaGroup);
  }
  arenaGroup = new THREE.Group();
  arenaGroup.position.y = -1.1;
  scene.add(arenaGroup);

  const theme = themeForGame(gameId);
  const floor = new THREE.Mesh(
    new THREE.CylinderGeometry(6.65, 7.1, 0.42, 96),
    material('#11163d', { metalness: 0.82, roughness: 0.24, emissive: theme.b, emissiveIntensity: 0.24 })
  );
  floor.receiveShadow = true;
  arenaGroup.add(floor);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(5.35, 0.13, 16, 120),
    new THREE.MeshStandardMaterial({ color: color(theme.a), transparent: true, opacity: 0.88, emissive: color(theme.a), emissiveIntensity: 0.35 })
  );
  ring.rotation.x = Math.PI / 2;
  arenaGroup.add(ring);

  const inner = new THREE.Mesh(
    new THREE.CylinderGeometry(3.2, 3.55, 0.28, 64),
    material('#181456', { metalness: 0.7, emissive: theme.a, emissiveIntensity: 0.36 })
  );
  inner.position.y = 0.34;
  inner.receiveShadow = true;
  arenaGroup.add(inner);

  let core;
  if (theme.shape === 'danger') core = new THREE.Mesh(new THREE.IcosahedronGeometry(1.1, 2), material(theme.a, { emissiveIntensity: 0.7 }));
  else if (theme.shape === 'data') core = new THREE.Mesh(new THREE.BoxGeometry(1.35, 1.35, 1.35), material(theme.a, { emissiveIntensity: 0.58 }));
  else if (theme.shape === 'memory') core = new THREE.Mesh(new THREE.OctahedronGeometry(1.15, 2), material(theme.a, { emissiveIntensity: 0.72 }));
  else core = new THREE.Mesh(new THREE.TorusKnotGeometry(0.9, 0.22, 96, 16), material(theme.a, { emissiveIntensity: 0.64 }));
  core.position.y = 1.55;
  core.userData.spin = 0.55;
  core.castShadow = true;
  arenaGroup.add(core);
  addGlow(core, theme.a, 2.4, 1.4);

  for (let i = 0; i < 12; i += 1) arenaShape(arenaGroup, theme, i);
  addGlow(arenaGroup, theme.b, 4.5, 0.85);
}

function buildWorld() {
  /* Sky dome — gradient from deep purple to warm horizon */
  const skyGeo = new THREE.SphereGeometry(48, 32, 24);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: {
      top: { value: new THREE.Color(0x0a0a2f) },
      mid: { value: new THREE.Color(0x2b1a5e) },
      bot: { value: new THREE.Color(0x6b2a8e) },
    },
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'varying vec3 vP; uniform vec3 top; uniform vec3 mid; uniform vec3 bot; void main(){ float h = normalize(vP).y; vec3 c = mix(bot, mid, smoothstep(-0.1, 0.3, h)); c = mix(c, top, smoothstep(0.3, 0.8, h)); gl_FragColor = vec4(c, 1.0); }',
  });
  const sky = new THREE.Mesh(skyGeo, skyMat);
  scene.add(sky);

  /* Ground — large grassy disc */
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(40, 96),
    new THREE.MeshStandardMaterial({ color: 0x1a4d2e, roughness: 0.9, metalness: 0.05 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -1.4;
  ground.receiveShadow = true;
  scene.add(ground);

  /* Rolling hills — low-poly cones around the board */
  const hillColors = [0x2d6e3e, 0x3a8a4a, 0x2560b0, 0x4a2a6e];
  for (let i = 0; i < 14; i += 1) {
    const ang = (i / 14) * Math.PI * 2 + (i % 2) * 0.3;
    const dist = 16 + (i % 4) * 3;
    const h = 2.5 + (i % 5) * 1.2;
    const hill = new THREE.Mesh(
      new THREE.ConeGeometry(3 + (i % 3) * 1.5, h, 10),
      new THREE.MeshStandardMaterial({ color: hillColors[i % hillColors.length], roughness: 0.88, flatShading: true })
    );
    hill.position.set(Math.cos(ang) * dist, h / 2 - 1.4, Math.sin(ang) * dist);
    hill.rotation.y = i * 0.7;
    hill.castShadow = true;
    hill.receiveShadow = true;
    scene.add(hill);
  }

  /* Trees — simple cone + trunk, scattered around */
  for (let i = 0; i < 22; i += 1) {
    const ang = (i / 22) * Math.PI * 2 + Math.random() * 0.4;
    const dist = 11 + Math.random() * 18;
    const tree = new THREE.Group();
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.18, 0.8, 8),
      new THREE.MeshStandardMaterial({ color: 0x5a3a1a, roughness: 0.9 })
    );
    trunk.position.y = -0.9;
    trunk.castShadow = true;
    tree.add(trunk);
    const leafColor = [0x2d8a3e, 0x3aa050, 0x226e30][i % 3];
    const leaves = new THREE.Mesh(
      new THREE.ConeGeometry(0.85, 1.6, 8),
      new THREE.MeshStandardMaterial({ color: leafColor, roughness: 0.82, flatShading: true })
    );
    leaves.position.y = -0.1;
    leaves.castShadow = true;
    tree.add(leaves);
    tree.position.set(Math.cos(ang) * dist, -1.3, Math.sin(ang) * dist);
    tree.scale.setScalar(0.8 + Math.random() * 0.6);
    scene.add(tree);
  }

  /* Floating clouds — soft spheres drifting above */
  for (let i = 0; i < 10; i += 1) {
    const cloud = new THREE.Group();
    const cloudMat = new THREE.MeshStandardMaterial({ color: 0xe8e0ff, roughness: 0.95, transparent: true, opacity: 0.78, emissive: 0x4a3a6e, emissiveIntensity: 0.08 });
    for (let j = 0; j < 4; j += 1) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(0.7 + Math.random() * 0.4, 10, 8), cloudMat);
      puff.position.set(j * 0.7 - 1, Math.random() * 0.3, Math.random() * 0.4);
      cloud.add(puff);
    }
    cloud.position.set((Math.random() - 0.5) * 36, 6 + Math.random() * 4, (Math.random() - 0.5) * 30);
    cloud.userData.drift = 0.3 + Math.random() * 0.4;
    cloud.userData.driftX = (Math.random() - 0.5) * 0.2;
    scene.add(cloud);
    if (!state.clouds) state.clouds = [];
    state.clouds.push(cloud);
  }

  /* Stars — twinkling points high in the sky */
  const starGeo = new THREE.BufferGeometry();
  const starPos = new Float32Array(300 * 3);
  for (let i = 0; i < 300; i += 1) {
    const phi = Math.acos(2 * Math.random() - 1);
    const theta = Math.random() * Math.PI * 2;
    const r = 35;
    starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    starPos[i * 3 + 1] = r * Math.cos(phi) * 0.5 + 6;
    starPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const starMat = new THREE.PointsMaterial({ color: 0xffeecc, size: 0.12, transparent: true, opacity: 0.85, sizeAttenuation: true });
  state.stars = new THREE.Points(starGeo, starMat);
  scene.add(state.stars);

  /* Central glow light under the board */
  const worldLight = new THREE.PointLight(0x7b2ff7, 1.8, 30, 2);
  worldLight.position.set(0, -1, 0);
  scene.add(worldLight);
}

/* ---------------- 3D Dice ---------------- */
let diceMesh = null;
let diceState = { rolling: false, value: 1, t: 0 };

function buildDice() {
  if (!scene || diceMesh) return;
  const diceMat = material('#ffffff', { metalness: 0.2, roughness: 0.35, emissive: 0x111111, emissiveIntensity: 0.1 });
  const pipMat = new THREE.MeshStandardMaterial({ color: 0xff3cac, emissive: 0xff3cac, emissiveIntensity: 0.6 });
  const size = 0.6;
  const dice = new THREE.Group();
  const cube = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), diceMat);
  cube.castShadow = true;
  dice.add(cube);
  /* Pips on each face — arranged like a real die */
  const faces = [
    { n: 1, axis: 'y', sign: 1, pips: [[0, 0]] },
    { n: 6, axis: 'y', sign: -1, pips: [[-0.15, -0.15], [0.15, -0.15], [-0.15, 0], [0.15, 0], [-0.15, 0.15], [0.15, 0.15]] },
    { n: 2, axis: 'x', sign: 1, pips: [[-0.15, -0.15], [0.15, 0.15]] },
    { n: 5, axis: 'x', sign: -1, pips: [[-0.15, -0.15], [0.15, -0.15], [0, 0], [-0.15, 0.15], [0.15, 0.15]] },
    { n: 3, axis: 'z', sign: 1, pips: [[-0.15, -0.15], [0, 0], [0.15, 0.15]] },
    { n: 4, axis: 'z', sign: -1, pips: [[-0.15, -0.15], [0.15, -0.15], [-0.15, 0.15], [0.15, 0.15]] },
  ];
  faces.forEach(face => {
    face.pips.forEach(([px, py]) => {
      const pip = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 10), pipMat);
      if (face.axis === 'y') { pip.position.set(px, face.sign * size / 2 + face.sign * 0.01, py); }
      else if (face.axis === 'x') { pip.position.set(face.sign * size / 2 + face.sign * 0.01, px, py); }
      else { pip.position.set(px, py, face.sign * size / 2 + face.sign * 0.01); }
      pip.castShadow = true;
      dice.add(pip);
    });
  });
  dice.visible = false;
  scene.add(dice);
  diceMesh = dice;
}

function rollDice(value, durationMs = 1700) {
  if (!diceMesh) return;
  buildDice();
  const v = Math.max(1, Math.min(6, Number(value) || 1));
  diceState.rolling = true;
  diceState.value = v;
  diceState.t = 0;
  diceState.duration = durationMs / 1000;
  diceMesh.visible = true;
  /* Start: Würfel fällt von oben — realistisches „Wurf aus der Hand" */
  diceMesh.position.set(0, 5.5, 0);
  diceMesh.rotation.set(0, 0, 0);
  /* target rotation to land on value v (face 1 up) */
  const faceRot = {
    1: { x: 0, z: 0 },
    2: { x: -Math.PI / 2, z: 0 },
    3: { x: 0, z: Math.PI / 2 },
    4: { x: 0, z: -Math.PI / 2 },
    5: { x: Math.PI / 2, z: 0 },
    6: { x: Math.PI, z: 0 },
  };
  diceState.targetRot = faceRot[v] || faceRot[1];
  /* Wilder Spin während des Falls — mehrere Umdrehungen pro Achse */
  diceState.startRot = {
    x: Math.random() * Math.PI * 4 + Math.PI * 2,
    y: Math.random() * Math.PI * 4 + Math.PI * 2,
    z: Math.random() * Math.PI * 4 + Math.PI * 2,
  };
  /* Vorzeichen für Drehrichtung — Würfel rotiert konsistent in eine Richtung */
  diceState.spinSign = { x: 1, y: 1, z: 1 };
  diceState.bounces = 0;  /* zählt Abpraller für Dämpfung */
  return v;
}

function animateDice(delta, elapsed) {
  if (!diceMesh || !diceState.rolling) return;
  diceState.t += delta;
  const p = Math.min(1, diceState.t / diceState.duration);
  /* Fall-Phase (0..0.6): Gravitation + mehrfaches Abprallen
     Danach (0.6..1.0): sanftes Settlen auf Zielausrichtung */
  if (p < 0.65) {
    /* Fall-Höhe: exponentiell gedämpfte Sinus-Bögen = mehrfaches Abprallen
       y(t) = groundY + amp * e^(-k*t) * |sin(omega*t)|
       Erzeugt: fällt, prallt ab, prallt weniger, prallt weniger, kommt zur Ruhe. */
    const fallT = p / 0.65;
    const groundY = 0.55;
    const amp = 5.0;
    const damp = Math.exp(-3.2 * fallT);
    const bounce = Math.abs(Math.sin(fallT * Math.PI * 3.5)) * amp * damp;
    diceMesh.position.y = groundY + bounce;
    /* Wilder Spin — wird mit der Zeit langsamer (Reibung auf dem Boden) */
    const spinDamp = 1 - fallT * 0.6;
    const spinSpeed = 8 * spinDamp;
    diceMesh.rotation.x += diceState.spinSign.x * spinSpeed * delta;
    diceMesh.rotation.y += diceState.spinSign.y * spinSpeed * delta * 0.7;
    diceMesh.rotation.z += diceState.spinSign.z * spinSpeed * delta * 0.8;
  } else {
    /* Settle-Phase: sanftes Herunterblenden vom wilden Spin auf Ziel-Ausrichtung.
       Würfel kippt in die richtige Lage für die gewürfelte Zahl. */
    const settleT = (p - 0.65) / 0.35;
    const ease = 1 - Math.pow(1 - settleT, 4);
    /* Position: bleibt am Boden, minimales Wackeln das abklingt */
    diceMesh.position.y = 0.55 + Math.sin(settleT * Math.PI * 3) * 0.04 * (1 - settleT);
    /* Rotation: nähert sich der Ziel-Ausrichtung — mit kurzem „Kippen" davor */
    const wobble = Math.sin(settleT * Math.PI * 2) * 0.3 * (1 - settleT);
    diceMesh.rotation.x = diceState.targetRot.x + wobble * (1 - ease);
    diceMesh.rotation.y = 0;
    diceMesh.rotation.z = diceState.targetRot.z + wobble * 0.5 * (1 - ease);
  }
  if (p >= 1) {
    diceState.rolling = false;
    diceMesh.position.y = 0.55;
    diceMesh.rotation.x = diceState.targetRot.x;
    diceMesh.rotation.z = diceState.targetRot.z;
    /* Würfel bleibt 1.8s sichtbar, dann ausblenden */
    setTimeout(() => { if (diceMesh) diceMesh.visible = false; }, 1800);
  }
}

function buildShowcase() {
  if (!scene) return;
  if (showcaseGroup) {
    scene.remove(showcaseGroup);
    clearGroup(showcaseGroup);
  }
  showcaseGroup = new THREE.Group();
  showcaseGroup.position.y = -1.35;
  scene.add(showcaseGroup);

  const platform = new THREE.Mesh(
    new THREE.CylinderGeometry(5.2, 6.2, 0.5, 96),
    material('#11163d', { metalness: 0.8, emissive: '#7b2ff7', emissiveIntensity: 0.28 })
  );
  platform.receiveShadow = true;
  showcaseGroup.add(platform);

  const portal = new THREE.Mesh(
    new THREE.TorusGeometry(2.5, 0.18, 20, 100),
    new THREE.MeshStandardMaterial({ color: 0xff3cac, transparent: true, opacity: 0.9, emissive: 0xff3cac, emissiveIntensity: 0.4 })
  );
  portal.position.y = 2.2;
  showcaseGroup.add(portal);

  const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(1.1, 2), material('#00f0ff', { emissiveIntensity: 0.75 }));
  crystal.position.y = 2.25;
  crystal.userData.spin = 0.5;
  crystal.castShadow = true;
  showcaseGroup.add(crystal);
  addGlow(crystal, '#00f0ff', 2.6, 1.5);

  for (let i = 0; i < 8; i += 1) {
    const angle = (i / 8) * Math.PI * 2;
    const pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.28, 1.8 + (i % 3) * 0.4, 16),
      material(palette[i], { emissiveIntensity: 0.45 })
    );
    pillar.position.set(Math.cos(angle) * 4.3, 0.9, Math.sin(angle) * 3.1);
    pillar.castShadow = true;
    showcaseGroup.add(pillar);
  }
}

function buildParticles() {
  const count = state.reducedMotion ? 160 : 420;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    positions[i * 3] = (Math.random() - 0.5) * 32;
    positions[i * 3 + 1] = Math.random() * 14 - 2;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 24 - 3;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const pointsMaterial = new THREE.PointsMaterial({ color: 0x9da7ff, size: 0.045, transparent: true, opacity: 0.7, depthWrite: false });
  particles = new THREE.Points(geometry, pointsMaterial);
  scene.add(particles);
}

function lookTarget() {
  if (state.mode === 'board') return new THREE.Vector3(0, 0.2, 0);
  if (state.mode === 'game') return new THREE.Vector3(0, 0.25, 0);
  return new THREE.Vector3(0, 0.75, 0);
}

function updateCamera() {
  if (!camera) return;
  const board = state.mode === 'board';
  const game = state.mode === 'game';
  const base = board ? { x: 0, y: 10.2, z: 10.6 } : game ? { x: 0, y: 8.2, z: 11.4 } : { x: 0, y: 6.8, z: 12.6 };
  const targetX = base.x + pointer.x * 1.2;
  const targetY = base.y + pointer.y * 0.45;
  camera.position.x += (targetX - camera.position.x) * 0.035;
  camera.position.y += (targetY - camera.position.y) * 0.035;
  camera.position.z += (base.z - camera.position.z) * 0.035;
  camera.lookAt(lookTarget());
}

function animate() {
  if (!renderer || !scene) return;
  const elapsed = clock.getElapsedTime();
  const delta = Math.min(0.04, clock.getDelta());
  updateCamera();
  updatePawnHops(delta);

  if (particles) particles.rotation.y += delta * 0.008;
  animateDice(delta, elapsed);
  /* World animations: cloud drift + star twinkle */
  if (state.clouds) {
    state.clouds.forEach(c => {
      c.position.x += c.userData.driftX * delta;
      if (c.position.x > 22) c.position.x = -22;
      if (c.position.x < -22) c.position.x = 22;
    });
  }
  if (state.stars) {
    state.stars.material.opacity = 0.6 + Math.sin(elapsed * 1.5) * 0.25;
  }
  if (boardGroup && boardGroup.visible) {
    boardGroup.rotation.y += delta * (state.reducedMotion ? 0.006 : 0.018);
    boardGroup.traverse(node => {
      if (node.userData && node.userData.spin) node.rotation.y += delta * node.userData.spin;
      if (node.userData && node.userData.orbit) node.position.y = 0.95 + Math.sin(elapsed * node.userData.orbit) * 0.12;
      if (node.userData && node.userData.playerId) node.position.y = 0.18 + Math.abs(Math.sin(elapsed * 2.4 + node.userData.phase)) * 0.08;
    });
  }
  if (arenaGroup && arenaGroup.visible) {
    arenaGroup.rotation.y += delta * (state.reducedMotion ? 0.008 : 0.026);
    arenaGroup.traverse(node => {
      if (node.userData && node.userData.spin) node.rotation.y += delta * node.userData.spin;
      if (node.userData && node.userData.phase != null) {
        node.position.y += Math.sin(elapsed * 1.5 + node.userData.phase) * delta * 0.3;
        node.rotation.y += delta * 0.4;
      }
    });
  }
  if (showcaseGroup && showcaseGroup.visible) {
    showcaseGroup.rotation.y += delta * (state.reducedMotion ? 0.006 : 0.018);
    showcaseGroup.traverse(node => {
      if (node.userData && node.userData.spin) node.rotation.y += delta * node.userData.spin;
    });
  }

  if (composer && composer.passes && composer.passes.length) composer.render();
  else renderer.render(scene, camera);
  window.requestAnimationFrame(animate);
}

function syncVisibility() {
  if (!boardGroup || !arenaGroup || !showcaseGroup) return;
  boardGroup.visible = state.mode === 'board';
  arenaGroup.visible = state.mode === 'game';
  showcaseGroup.visible = state.mode !== 'board' && state.mode !== 'game';
}

function showBoard() {
  state.mode = 'board';
  if (state.ready) {
    buildBoard();
    syncVisibility();
  }
}

function showMiniGame(id, meta) {
  const nextId = String(id || (meta && meta.id) || 'reaction');
  state.game = Object.assign({}, state.game || {}, meta || {}, { id: nextId });
  state.mode = 'game';
  if (state.ready && activeArenaId !== nextId) {
    activeArenaId = nextId;
    buildArena(nextId);
  }
  syncVisibility();
}

function showShowcase() {
  state.mode = 'showcase';
  if (state.ready) syncVisibility();
}

function setBoardState(payload) {
  if (!payload) return;
  state.board = {
    tiles: Array.isArray(payload.tiles) ? payload.tiles : state.board.tiles,
    players: Array.isArray(payload.players) ? payload.players : state.board.players,
    owners: payload.owners || state.board.owners || {},
  };
  if (state.ready) {
    buildBoard();
    if (state.mode !== 'game') state.mode = 'board';
    syncVisibility();
  }
}

function syncFromScreen() {
  const active = document.querySelector('.screen.active');
  if (!active) return;
  const screen = active.dataset.screen;
  if (screen === 'board') showBoard();
  else if (screen === 'play' || screen === 'playing' || screen === 'round-intro') {
    if (state.game && state.game.id) showMiniGame(state.game.id, state.game);
    else showMiniGame('reaction', { id: 'reaction' });
  } else showShowcase();
}

function init() {
  if (!THREE) {
    console.error('Three.js not loaded — 3D only mode');
    return;
  }
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    // Hoehere Pixel-Ratio fuer schaerfe 3D-Elemente auf HiDPI/Retina-Displays
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2.5));
    renderer.setSize(window.innerWidth, window.innerHeight);
    if ('outputColorSpace' in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;
    else if ('outputEncoding' in renderer) renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.85;  /* vorher 1.18 → Spielfeld war zu hell */
    // Echte Schatten fuer Tiefe und Professionnalitaet — VSM = filmische weiche Schatten
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.VSMShadowMap;
    // Physikalisch korrekte Lichtstaerken (candela/lumen-Metrik) — realistischer Lichtfall
    if ('physicallyCorrectLights' in renderer) renderer.physicallyCorrectLights = true;
    renderer.domElement.id = 'party-3d-canvas';
    renderer.domElement.setAttribute('aria-hidden', 'true');
    document.body.appendChild(renderer.domElement);

    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x08091f, 0.032);
    camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 7, 13);
    clock = new THREE.Clock();

    /* Environment-Map fuer Reflexionen auf Pawns/Tiles (lackiertes Plastik-Look)
       PMREM generiert aus einer sanften Himmelstextur eine diffuse IBL-Map. */
    try {
      pmremEnv = new THREE.PMREMGenerator(renderer);
      const envScene = new THREE.Scene();
      // Sanfter Gradient: kuehles Blau von oben, warmer Pink von der Seite
      // Intensitaet 0.45 (vorher 1.0) — EnvMap war Haupttreiber fuer „zu hell"
      const topLight = new THREE.HemisphereLight(0x88aaff, 0xff66bb, 0.45);
      envScene.add(topLight);
      const envRT = pmremEnv.fromScene(envScene, 0.04);
      scene.environment = envRT.texture;
    } catch (_) { /* silent — Environment ist kosmetisch */ }

    scene.add(new THREE.HemisphereLight(0x9ba6ff, 0x110c32, 0.9));  /* vorher 1.4 → zu hell */
    const key = new THREE.DirectionalLight(0xffffff, 1.5);  /* vorher 2.4 → mit physicallyCorrectLights zu hell */
    key.position.set(4, 10, 7);
    // Schattenwerfendes Hauptlicht — hochaufloesende 4096 mapSize fuer scharfe Kanten
    key.castShadow = true;
    key.shadow.mapSize.set(4096, 4096);
    key.shadow.camera.near = 0.5;
    key.shadow.camera.far = 35;
    key.shadow.camera.left = -12;
    key.shadow.camera.right = 12;
    key.shadow.camera.top = 12;
    key.shadow.camera.bottom = -12;
    key.shadow.bias = -0.0004;
    key.shadow.radius = 6;
    scene.add(key);
    const fill = new THREE.PointLight(0xff3cac, 1.4, 20, 2);  /* vorher 2.4 */
    fill.position.set(-7, 4, 4);
    scene.add(fill);
    const rim = new THREE.PointLight(0x00f0ff, 1.6, 20, 2);  /* vorher 2.8 */
    rim.position.set(7, 3, -5);
    scene.add(rim);

    /* Postprocessing-Pipeline: RenderPass + UnrealBloomPass
       Bloom macht leuchtende Sterne/Items/Neon-Kanten richtig glowen —
       der groesste „professionell vs. amateur"-Unterschied. */
    try {
      composer = new EffectComposer(renderer);
      const renderPass = new RenderPass(scene, camera);
      composer.addPass(renderPass);
      const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        0.45,  /* strength: vorher 0.85 → zu viel Ueberstrahlung, jetzt dezentes Glow */
        0.4,   /* radius: vorher 0.55, etwas enger */
        0.7    /* threshold: vorher 0.2 (erfasste mittelhelle Flaechen → „zu hell"), jetzt 0.7 = nur echte Highlights glühen */
      );
      composer.addPass(bloomPass);
      composer.setSize(window.innerWidth, window.innerHeight);
      composer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2.5));
    } catch (err) {
      console.warn('[Party3D] Composer init failed, fallback to direct render', err);
      composer = null;
    }

    buildParticles();
    buildWorld();
    buildDice();
    buildShowcase();
    buildBoard();
    buildArena('reaction');
    state.ready = true;
    activeArenaId = 'reaction';
    syncVisibility();

    const observer = new MutationObserver(syncFromScreen);
    document.querySelectorAll('.screen').forEach(screen => observer.observe(screen, { attributes: true, attributeFilter: ['class'] }));
    syncFromScreen();
    window.addEventListener('resize', () => {
      if (!renderer || !camera) return;
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      if (composer) {
        composer.setSize(window.innerWidth, window.innerHeight);
        composer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2.5));
      }
    });
    window.addEventListener('pointermove', event => {
      pointer.x = (event.clientX / Math.max(1, window.innerWidth) - 0.5) * 2;
      pointer.y = (event.clientY / Math.max(1, window.innerHeight) - 0.5) * -2;
    }, { passive: true });
    window.requestAnimationFrame(animate);
  } catch (error) {
    console.error('Party3D init failed:', error);
  }
}

API.init = init;
API.setBoardState = setBoardState;
API.showBoard = showBoard;
API.showMiniGame = showMiniGame;
API.showShowcase = showShowcase;
API.setGame = (meta) => showMiniGame(meta && meta.id, meta);
API.rollDice = rollDice;
API.animatePawnMove = animatePawnMove;
API.pulse = noop;

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
else init();
