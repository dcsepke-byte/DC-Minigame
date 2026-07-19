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
let bloomPass = null;  /* Etappe 2.5 Perf: Bloom im Board-Modus abstellbar */
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
   Kleeblatt-Topologie: 8 Biome je als Lappen eines Achten/Kleeblatts.
   Hauptpfad 160 Felder → 8 Segmente à 20 Felder, je Segment = 1 Biom.
   Pro Biom ein Side-Path (10 Felder) der als Ausbuchtung nach außen ragt.
   BRANCH_STARTS muss mit server.py übereinstimmen (8 Branches). */
const MAP_REGIONS = [
  { name: 'Startdorf',  color: '#ffd34e', accent: '#ff6a00', biome: 'village'  },
  { name: 'Sternwüste', color: '#ff8c42', accent: '#ffd34e', biome: 'desert'   },
  { name: 'Itemwald',   color: '#2bffb9', accent: '#00f0ff', biome: 'forest'   },
  { name: 'Eventberg',  color: '#7b2ff7', accent: '#ff3cac', biome: 'mountain' },
  { name: 'Sumpf',      color: '#7bff7b', accent: '#2bffb9', biome: 'swamp'    },
  { name: 'Eisland',    color: '#9ad8ff', accent: '#ffffff', biome: 'ice'      },
  { name: 'Vulkanland', color: '#ff3c3c', accent: '#ffaa00', biome: 'volcano'  },
  { name: 'Wolkenreich',color: '#c8a8ff', accent: '#ffffff', biome: 'clouds'   },
];
/* Biome-Farben für jeden Hauptpfad-Abschnitt (idx // 20). */
const BIOME_BY_INDEX = ['village','desert','forest','mountain','swamp','ice','volcano','clouds'];

/* Etappe 2.5: Graph-bewusstes Kleeblatt-Layout.
   Hauptpfad (idx < 160): 8-Lappen-Kleeblatt — je Biom ein Lappen der nach außen beult.
   Side-Paths (idx 160..239): Ausbuchtungen die vom Branch-Start weiter nach außen führen
   und in einem Bogen zum Rejoin-Punkt zurückkehren.
   BRANCH_STARTS_3D muss mit server.py übereinstimmen. */
const BRANCH_STARTS_3D = [10, 30, 50, 70, 90, 110, 130, 150];
const BRANCH_LEN_3D = 10;
const BRANCH_REJOIN_3D = [20, 40, 60, 80, 100, 120, 140, 0];  // (bstart+10)%160 — Side-Path bleibt im eigenen Biom

/* Kleeblatt-Position: i = 0..159, segment = i // 20 (0..7), localT = (i%20)/20.
   Jedes Segment ist ein Lappen: Basis bei radiusBase, beult nach außen zur Segmentmitte.
   Höhe variiert pro Biom (Berg hoch, Sumpf tief, Wolken schwebend). */
function biomeHeightOffset(biome, t) {
  /* Biom-spezifische Höhenprofile — geben dem Board 3D-Tiefe. */
  if (biome === 'mountain') return 1.2 + Math.sin(t * Math.PI) * 0.8;       // Berg: hoch
  if (biome === 'clouds')   return 1.8 + Math.sin(t * Math.PI) * 0.6;       // Wolken: schwebend hoch
  if (biome === 'volcano')  return 0.6 + Math.sin(t * Math.PI) * 0.5;       // Vulkan: mittel
  if (biome === 'ice')      return 0.4 + Math.sin(t * Math.PI) * 0.4;       // Eis: leicht erhöht
  if (biome === 'swamp')    return -0.3 - Math.sin(t * Math.PI) * 0.3;      // Sumpf: tief
  if (biome === 'forest')   return 0.2 + Math.sin(t * Math.PI) * 0.3;       // Wald: leicht hügelig
  if (biome === 'desert')   return 0.0 + Math.sin(t * Math.PI) * 0.2;       // Wüste: flach
  return 0.1 + Math.sin(t * Math.PI) * 0.15;                                // Dorf: sanft
}

/* Etappe 2.5 Landschaft: Terrain-Heightmap-Funktion (Modul-global).
   Zentraler Berg + Rand-Wall + Biom-Lift + Rauschen. Wird vom Terrain-Mesh
   und von den Tiles/Pawns genutzt damit sie auf dem Terrain aufsitzen. */
function terrainHeight(x, z) {
  const r = Math.hypot(x, z);
  /* Zentraler Berg — steiler Kegel mit Plateau, Höhe 6. */
  const central = Math.max(0, 6 - r * 0.35) * (1 - Math.exp(-r * 0.15));
  /* Äußerer Ring-Wall (Berge am Rand) — bei r ≈ 20, Höhe bis 4. */
  const ring = Math.max(0, 4 - Math.abs(r - 19) * 0.6) * Math.exp(-Math.abs(r - 19) * 0.3);
  /* Organisches Rauschen — deterministisch über Sinus-Mix. */
  const noise = Math.sin(x * 0.45) * Math.cos(z * 0.38) * 0.6
              + Math.sin(x * 0.21 + z * 0.17) * 0.9;
  /* Biom-spezifische Höhen: Segment-Winkel bestimmt Biom. */
  const ang = Math.atan2(z, x);
  const seg = Math.floor(((ang / (Math.PI * 2)) + 0.5) * 8 + 8) % 8;
  const biome = BIOME_BY_INDEX[seg] || 'village';
  let biomeLift = 0;
  if (biome === 'mountain') biomeLift = 1.2;
  else if (biome === 'clouds') biomeLift = 2.0;
  else if (biome === 'volcano') biomeLift = 0.8;
  else if (biome === 'ice') biomeLift = 0.5;
  else if (biome === 'swamp') biomeLift = -0.4;
  /* Sanftes Radialprofil pro Biom (bei Bulge-Mitte segT=0.5 am höchsten). */
  biomeLift *= Math.sin(Math.max(0, Math.min(1, (r - 6) / 10)) * Math.PI);
  return central + ring * 0.7 + noise + biomeLift;
}

function mainPathPosition(i, mainLen = 160) {
  const t = i / mainLen;
  const segLen = mainLen / 8;                    // Segmentlänge (generalisiert)
  const segment = Math.floor(i / segLen);        // 0..7 → Biom
  const segT = (i % segLen) / segLen;            // 0..1 im Segment
  /* Basiswinkel: 8 Segmente auf Kreis verteilt, Segment-Mitte als Referenz. */
  const segAngle = (segment + 0.5) / 8 * Math.PI * 2 - Math.PI / 2;
  /* Lappen-Bulge: Segmentmitte (segT=0.5) beult am weitesten nach außen,
     Segmentränder (segT=0,1) sind näher am Zentrum → Kleeblatt-Form. */
  const bulge = Math.sin(segT * Math.PI);       // 0..1..0
  /* Basisradius klein (Zentrum), Lappen ragt nach außen. */
  const radiusBase = 8.0;                       // Zentrum-Rand
  const radiusBulge = 7.5 * bulge;              // Lappenlänge
  const r = radiusBase + radiusBulge;
  /* Winkel within Segment: segT von -0.5..+0.5 um segAngle.
     Etappe 2.5 fix: angleSpread 0.95 (fast volle Segment-Breite) statt 0.7,
     damit 20 Felder pro Segment nicht überlappen. Kleine Lücken zwischen
     Biomen bleiben sichtbar — gewollt, betont Biom-Grenzen. */
  const angleSpread = (Math.PI * 2 / 8) * 0.95;
  const angle = segAngle + (segT - 0.5) * angleSpread;
  /* Biom-spezifische Höhe */
  const biome = BIOME_BY_INDEX[segment] || 'village';
  const y = biomeHeightOffset(biome, segT);
  /* Leichte organische Wackel für natürliche Kanten */
  const wobble = Math.sin(t * Math.PI * 16) * 0.12;
  return {
    x: Math.cos(angle) * (r + wobble),
    z: Math.sin(angle) * (r + wobble) * 0.92,
    y,
    angle,
  };
}

function sidePathPosition(idx) {
  /* Side-Path idx 160..239: bi = (idx-160)//10, j = (idx-160)%10.
     Verläuft als Bogen vom Branch-Start (Biom-Mitte) weiter nach außen und
     zurück zum Rejoin-Punkt. Bulge deutlich größer als Hauptpfad → sichtbare Abzweigung. */
  const bi = Math.floor((idx - 160) / BRANCH_LEN_3D);
  const j = (idx - 160) % BRANCH_LEN_3D;
  const bstart = BRANCH_STARTS_3D[bi] || 10;
  const rejoin = BRANCH_REJOIN_3D[bi] || 30;
  const p0 = mainPathPosition(bstart, 160);
  const p1 = mainPathPosition(rejoin, 160);
  /* Mittelpunkt des Bogens: zwischen p0 und p1, stark nach außen verschoben. */
  const midX = (p0.x + p1.x) / 2;
  const midZ = (p0.z + p1.z) / 2;
  const outLen = Math.hypot(midX, midZ) || 1;
  const outDir = { x: midX / outLen, z: midZ / outLen };
  const bulge = 6.0;  /* Side-Path ragt weiter nach außen als Hauptpfad */
  const midOut = { x: midX + outDir.x * bulge, z: midZ + outDir.z * bulge };
  /* Quadratische Bezier: p0 → midOut → p1, Parameter t = j/(BRANCH_LEN-1). */
  const t = j / (BRANCH_LEN_3D - 1);
  const oneMinusT = 1 - t;
  const x = oneMinusT * oneMinusT * p0.x + 2 * oneMinusT * t * midOut.x + t * t * p1.x;
  const z = oneMinusT * oneMinusT * p0.z + 2 * oneMinusT * t * midOut.z + t * t * p1.z;
  /* Höhe: Bezier-interpoliert zwischen p0.y und p1.y, plus leichter Höhenrücken */
  const yBase = oneMinusT * p0.y + t * p1.y;
  const biome = BIOME_BY_INDEX[bi] || 'village';
  const y = yBase + Math.sin(t * Math.PI) * (biome === 'mountain' || biome === 'clouds' ? 1.2 : 0.5);
  /* angle: Tangente an Bezier-Kurve */
  const dx = 2 * oneMinusT * (midOut.x - p0.x) + 2 * t * (p1.x - midOut.x);
  const dz = 2 * oneMinusT * (midOut.z - p0.z) + 2 * t * (p1.z - midOut.z);
  const angle = Math.atan2(dz, dx);
  return { x, z, y, angle };
}

function tilePosition(index, total = 240) {
  if (index < 160) return mainPathPosition(index, 160);
  return sidePathPosition(index);
}

function tileColor(tile, owner) {
  if (owner && owner.color) return owner.color;
  if (tile && tile.type === 'start') return '#ffd34e';
  if (tile && tile.type === 'event') return '#ff4d6d';
  if (tile && tile.type === 'starshop') return '#ffd34e';
  if (tile && tile.type === 'itemshop') return '#2bffb9';
  if (tile && tile.type === 'lucky') return '#7bff7b';
  if (tile && tile.type === 'bonus') return '#2bffb9';
  if (tile && tile.type === 'junction') return '#ff9e3c';  /* Etappe 2: Wegweiser-Orange */
  return '#00f0ff';
}

/* Etappe 2: Pfad-Band zwischen zwei 3D-Positionen zeichnen (Graph-Edge). */
function drawPathBand(pos1, pos2) {
  const dx = pos2.x - pos1.x, dz = pos2.z - pos1.z;
  const len = Math.sqrt(dx * dx + dz * dz);
  if (len < 0.001) return;
  const midX = (pos1.x + pos2.x) / 2, midZ = (pos1.z + pos2.z) / 2;
  const midY = (pos1.y + pos2.y) / 2;
  const angle = Math.atan2(dz, dx);
  const path = new THREE.Mesh(
    new THREE.BoxGeometry(len, 0.08, 0.42),
    new THREE.MeshStandardMaterial({ color: 0x8b7355, roughness: 0.85, metalness: 0.05 })
  );
  path.position.set(midX, 0.3 + midY, midZ);
  path.rotation.y = -angle;
  path.receiveShadow = true;
  path.castShadow = false;
  boardGroup.add(path);
}

function pawn(player, index, totalAtTile) {
  const group = new THREE.Group();
  /* Etappe 2: Pawns größer für das 200-Felder-Board (Kamera weiter weg). */
  const PS = 1.6;
  group.scale.setScalar(PS);
  const baseColor = player.color || palette[index % palette.length];
  const darkMat = material('#10102f', { metalness: 0.8, emissiveIntensity: 0.06 });

  /* Pedestal — hexagonal disc with glowing rim */
  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.42, 0.16, 12), darkMat);
  pedestal.position.y = 0.08;
  pedestal.castShadow = true;   /* Etappe 2.5 Perf: Pawn-Pedestal wirft Schatten */
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
  group.position.set(pos.x + offset * Math.cos(pos.angle + Math.PI / 2), terrainHeight(pos.x, pos.z) + 0.18, pos.z + offset * Math.sin(pos.angle + Math.PI / 2));
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
  /* Etappe 2: Skalierung für größeres Board (Regionen bei Radius ~10). */
  const DS = 2.4;
  /* Helfer: gestreute Position innerhalb des Regionsradius, nicht auf dem Pfad */
  function scatter(minR, maxR) {
    const a = rng() * Math.PI * 2;
    const r = (minR + rng() * (maxR - minR)) * DS;
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
      walls.castShadow = false;
      walls.receiveShadow = true;
      house.add(walls);
      /* Satteldach — Pyramide */
      const roof = new THREE.Mesh(
        new THREE.ConeGeometry(0.45, 0.35, 4),
        new THREE.MeshStandardMaterial({ color: 0x8a3a2a, roughness: 0.8 })
      );
      roof.position.y = 0.65;
      roof.rotation.y = Math.PI / 4;
      roof.castShadow = false;
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
    wellBase.castShadow = false;
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
      post.castShadow = false;
      out.push(post);
    }
    const wellRoof = new THREE.Mesh(
      new THREE.ConeGeometry(0.4, 0.22, 4),
      new THREE.MeshStandardMaterial({ color: 0x8a3a2a, roughness: 0.8 })
    );
    wellRoof.position.set(cx, 1.3, cz);
    wellRoof.rotation.y = Math.PI / 4;
    wellRoof.castShadow = false;
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
      trunk.castShadow = false;
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
        arm.castShadow = false;
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
    pyramid.castShadow = false;
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
      trunk.castShadow = false;
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
        crown.castShadow = false;
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
      cap.castShadow = false;
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
    stump.castShadow = false;
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
      rock.castShadow = false;
      out.push(rock);
    }
    /* Berggipfel — markante spitze Form in Regionsmitte */
    const peak = new THREE.Mesh(
      new THREE.ConeGeometry(0.55, 1.1, 6),
      new THREE.MeshStandardMaterial({ color: 0x6a6a7a, roughness: 0.85, metalness: 0.1, emissive: 0x3a3a4a, emissiveIntensity: 0.12 })
    );
    peak.position.set(cx, 0.85, cz);
    peak.castShadow = false;
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

  else if (biome === 'swamp') {
    /* Sumpf: trübes Wasser, Schilf, Moosbüschel, Baumleichen, Glühwürmchen */
    /* Sumpfgrund — flache dunkle Wasserfläche */
    const swampGround = new THREE.Mesh(
      new THREE.CircleGeometry(1.8, 24),
      new THREE.MeshStandardMaterial({ color: 0x2a3a2a, roughness: 0.3, metalness: 0.5, emissive: 0x1a2a1a, emissiveIntensity: 0.2, transparent: true, opacity: 0.85 })
    );
    swampGround.rotation.x = -Math.PI / 2;
    swampGround.position.set(cx, 0.06, cz);
    out.push(swampGround);
    /* Schilfgras — schmale Zylinderbüschel */
    for (let i = 0; i < 8; i++) {
      const p = scatter(0.4, 2.2);
      for (let j = 0; j < 3; j++) {
        const reed = new THREE.Mesh(
          new THREE.CylinderGeometry(0.02, 0.025, 0.35 + rng() * 0.15, 4),
          new THREE.MeshStandardMaterial({ color: 0x6a8a3a, roughness: 0.9 })
        );
        reed.position.set(p.x + (j - 1) * 0.06, 0.22, p.z + (rng() - 0.5) * 0.08);
        reed.rotation.z = (rng() - 0.5) * 0.2;
        out.push(reed);
      }
    }
    /* Baumleiche — toter Baumstumpf, krumm und kahl */
    for (let i = 0; i < 2; i++) {
      const p = scatter(0.6, 1.8);
      const deadTree = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.09, 0.5, 6),
        new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.98 })
      );
      deadTree.position.set(p.x, 0.35, p.z);
      deadTree.rotation.z = (rng() - 0.5) * 0.4;
      deadTree.castShadow = false;
      out.push(deadTree);
    }
    /* Glühwürmchen — kleine gelb-grüne Lichtpunkte */
    for (let i = 0; i < 5; i++) {
      const p = scatter(0.3, 2.0);
      const firefly = new THREE.Mesh(
        new THREE.SphereGeometry(0.04, 8, 6),
        new THREE.MeshStandardMaterial({ color: 0xfffa6e, emissive: 0xfffa6e, emissiveIntensity: 1.2 })
      );
      firefly.position.set(p.x, 0.5 + rng() * 0.6, p.z);
      firefly.userData.spin = 0.3;
      firefly.userData.orbit = 0.3 + rng() * 0.3;
      out.push(firefly);
    }
  }

  else if (biome === 'ice') {
    /* Eisland: Eiskristalle, Schneehaufen, gefrorener See, Polarlicht */
    /* Gefrorener See — flache hellblaue Fläche */
    const iceLake = new THREE.Mesh(
      new THREE.CircleGeometry(1.6, 24),
      new THREE.MeshStandardMaterial({ color: 0xb8d8f8, roughness: 0.1, metalness: 0.8, emissive: 0x9ac8e8, emissiveIntensity: 0.25, transparent: true, opacity: 0.9 })
    );
    iceLake.rotation.x = -Math.PI / 2;
    iceLake.position.set(cx, 0.08, cz);
    iceLake.receiveShadow = true;
    out.push(iceLake);
    /* Eiskristalle — spitze weiße Oktaeder */
    for (let i = 0; i < 6; i++) {
      const p = scatter(0.5, 2.2);
      const crystal = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.15 + rng() * 0.1, 0),
        new THREE.MeshStandardMaterial({ color: 0xe8f0ff, roughness: 0.2, metalness: 0.6, emissive: 0xc8e0ff, emissiveIntensity: 0.35, transparent: true, opacity: 0.88 })
      );
      crystal.position.set(p.x, 0.35 + rng() * 0.15, p.z);
      crystal.rotation.set(rng() * Math.PI, rng() * Math.PI, rng() * Math.PI);
      crystal.castShadow = false;
      out.push(crystal);
    }
    /* Schneehaufen — weiße Kugeln */
    for (let i = 0; i < 4; i++) {
      const p = scatter(0.4, 2.0);
      const snow = new THREE.Mesh(
        new THREE.SphereGeometry(0.18 + rng() * 0.1, 10, 6),
        new THREE.MeshStandardMaterial({ color: 0xf8f8ff, roughness: 0.85 })
      );
      snow.position.set(p.x, 0.18, p.z);
      snow.castShadow = false;
      out.push(snow);
    }
    /* Polarlicht — hängender leuchtender Streifen (deko, nicht begehbar) */
    const aurora = new THREE.Mesh(
      new THREE.PlaneGeometry(3.0, 0.35),
      new THREE.MeshStandardMaterial({ color: 0x7bff7b, emissive: 0x7bff7b, emissiveIntensity: 0.6, transparent: true, opacity: 0.4, side: THREE.DoubleSide })
    );
    aurora.position.set(cx, 2.8, cz);
    aurora.userData.spin = 0.1;
    out.push(aurora);
  }

  else if (biome === 'volcano') {
    /* Vulkanland: Lavasee, Lavaspritzer, rauchende Felsen, glühende Risse */
    /* Lavasee — flache glühend-rote Fläche */
    const lavaLake = new THREE.Mesh(
      new THREE.CircleGeometry(1.5, 20),
      new THREE.MeshStandardMaterial({ color: 0xff4a1a, emissive: 0xff2a00, emissiveIntensity: 1.4, roughness: 0.4, metalness: 0.3 })
    );
    lavaLake.rotation.x = -Math.PI / 2;
    lavaLake.position.set(cx, 0.08, cz);
    out.push(lavaLake);
    addGlow(lavaLake, '#ff5a2a', 1.5, 1.2);
    /* Vulkan-Kegel — kleiner Krater in der Mitte */
    const volcano = new THREE.Mesh(
      new THREE.ConeGeometry(0.7, 0.9, 12, 1, true),
      new THREE.MeshStandardMaterial({ color: 0x3a2a2a, roughness: 0.95, side: THREE.DoubleSide })
    );
    volcano.position.set(cx, 0.65, cz);
    volcano.castShadow = false;
    out.push(volcano);
    /* Lava im Krater — kleine glühende Kappe */
    const lavaCap = new THREE.Mesh(
      new THREE.CircleGeometry(0.25, 12),
      new THREE.MeshStandardMaterial({ color: 0xffaa00, emissive: 0xff6a00, emissiveIntensity: 1.6 })
    );
    lavaCap.rotation.x = -Math.PI / 2;
    lavaCap.position.set(cx, 1.05, cz);
    out.push(lavaCap);
    /* Rauchende Felsen — schwarze Brocken mit kleinem Glühen */
    for (let i = 0; i < 5; i++) {
      const p = scatter(0.6, 2.2);
      const rock = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.16 + rng() * 0.16, 0),
        new THREE.MeshStandardMaterial({ color: 0x2a1a1a, roughness: 0.98, emissive: 0xff3a00, emissiveIntensity: rng() * 0.25 })
      );
      rock.position.set(p.x, 0.32 + rng() * 0.12, p.z);
      rock.rotation.set(rng() * Math.PI, rng() * Math.PI, rng() * Math.PI);
      rock.castShadow = false;
      out.push(rock);
    }
    /* Glühende Risse — schmale Streifen */
    for (let i = 0; i < 3; i++) {
      const p = scatter(0.5, 1.8);
      const crack = new THREE.Mesh(
        new THREE.BoxGeometry(0.35, 0.03, 0.04),
        new THREE.MeshStandardMaterial({ color: 0xff6a00, emissive: 0xff4a00, emissiveIntensity: 1.5 })
      );
      crack.position.set(p.x, 0.08, p.z);
      crack.rotation.y = rng() * Math.PI;
      out.push(crack);
    }
  }

  else if (biome === 'clouds') {
    /* Wolkenreich: schwebende Wolken, Regenbogenbögen, schwebende Insel,
       leuchtende Sterne. Höher als andere Biome (biomeHeightOffset). */
    /* Schwebende Wolkeninsel — flache weiß-zyanfläche */
    const cloudIsland = new THREE.Mesh(
      new THREE.CylinderGeometry(1.8, 1.5, 0.18, 16),
      new THREE.MeshStandardMaterial({ color: 0xf0e8ff, roughness: 0.95, emissive: 0xc8b8e8, emissiveIntensity: 0.18 })
    );
    cloudIsland.position.set(cx, 0.15, cz);
    cloudIsland.castShadow = false;
    out.push(cloudIsland);
    /* Wolkenbüschel — weiße Kugelgruppen die scheinbar schweben */
    for (let i = 0; i < 5; i++) {
      const p = scatter(0.6, 2.4);
      const cloud = new THREE.Group();
      const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, emissive: 0xe8d8f8, emissiveIntensity: 0.15, transparent: true, opacity: 0.9 });
      for (let j = 0; j < 3; j++) {
        const puff = new THREE.Mesh(
          new THREE.SphereGeometry(0.22 + rng() * 0.1, 10, 6),
          cloudMat
        );
        puff.position.set((j - 1) * 0.22, rng() * 0.1, 0);
        cloud.add(puff);
      }
      cloud.position.set(p.x, 0.5 + rng() * 0.8, p.z);
      cloud.userData.spin = 0.05;
      out.push(cloud);
    }
    /* Regenbogenbogen — leuchtender farbiger Ring (halb) */
    const rainbow = new THREE.Mesh(
      new THREE.TorusGeometry(1.0, 0.06, 8, 32, Math.PI),
      new THREE.MeshStandardMaterial({ color: 0xff6acb, emissive: 0xff6acb, emissiveIntensity: 0.8, roughness: 0.3, metalness: 0.4, transparent: true, opacity: 0.85 })
    );
    rainbow.position.set(cx, 0.9, cz);
    rainbow.userData.spin = 0.15;
    out.push(rainbow);
    /* Leuchtende Sterne — kleine gelbe Oktaeder */
    for (let i = 0; i < 4; i++) {
      const p = scatter(0.4, 1.8);
      const star = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.08, 0),
        new THREE.MeshStandardMaterial({ color: 0xffd34e, emissive: 0xffd34e, emissiveIntensity: 1.0 })
      );
      star.position.set(p.x, 1.2 + rng() * 0.6, p.z);
      star.userData.spin = 0.6;
      star.userData.orbit = 0.3 + rng() * 0.2;
      out.push(star);
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

  /* Etappe 2.5 Landschaft: Terrain-Heightmap statt flacher Plattform.
     Der Pfad verläuft IN der Landschaft — mittiger Berg, Biome in Tälern/Hängen.
     Plane wird pro Vertex auf Höhe gesetzt via terrainHeight() (Modul-global). */
  const TERRAIN_SIZE = 52;   /* Ausdehnung */
  const TERRAIN_SEG = 96;    /* Vertex-Auflösung (96×96 = ~9k Verts, ok für Performance) */
  const terrainGeo = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, TERRAIN_SEG, TERRAIN_SEG);
  terrainGeo.rotateX(-Math.PI / 2);   /* Plane liegt flach in XZ */
  const tpos = terrainGeo.attributes.position;
  for (let v = 0; v < tpos.count; v++) {
    const x = tpos.getX(v);
    const z = tpos.getZ(v);
    tpos.setY(v, terrainHeight(x, z));
  }
  terrainGeo.computeVertexNormals();
  /* Terrain-Material: grün-braune Basis, Vertex-Colors nach Höhe für Schnee/Gipfel. */
  const terrainColors = new Float32Array(tpos.count * 3);
  const colLow = new THREE.Color('#3a5a3a');    /* Tal — grün */
  const colMid = new THREE.Color('#6a5a3a');    /* Hang — braun */
  const colHigh = new THREE.Color('#aab8c0');   /* Gipfel — grau */
  const colSnow = new THREE.Color('#f0f4f8');   /* Schneegipfel */
  for (let v = 0; v < tpos.count; v++) {
    const y = tpos.getY(v);
    const c = new THREE.Color();
    if (y < 1.5) c.copy(colLow);
    else if (y < 3.5) c.lerpColors(colLow, colMid, (y - 1.5) / 2.0);
    else if (y < 5.0) c.lerpColors(colMid, colHigh, (y - 3.5) / 1.5);
    else c.lerpColors(colHigh, colSnow, Math.min(1, (y - 5.0) / 1.5));
    terrainColors[v * 3] = c.r;
    terrainColors[v * 3 + 1] = c.g;
    terrainColors[v * 3 + 2] = c.b;
  }
  terrainGeo.setAttribute('color', new THREE.BufferAttribute(terrainColors, 3));
  const terrainMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    metalness: 0.15,
    roughness: 0.92,
    flatShading: false,
  });
  const base = new THREE.Mesh(terrainGeo, terrainMat);
  base.receiveShadow = true;
  base.castShadow = true;   /* Etappe 2.5 Perf: Terrain wirft Schatten auf sich selbst */
  boardGroup.add(base);

  /* Regionen als fließende Landschaft — Kleeblatt: 8 Biome je ein Lappen.
     Jede Region liegt im Mittelpunkt ihres Biom-Segments (bei Feld idx = segment*20 + 10).
     Biome sind jetzt zusammenhängende Zonen entlang des Pfads, keine isolierten Kreise mehr. */
  MAP_REGIONS.forEach((region, ri) => {
    /* Etappe 2.5: Region-Mittelpunkt = Position des mittleren Feldes im Biom-Segment. */
    const midIdx = ri * 20 + 10;
    const midPos = mainPathPosition(midIdx, 160);
    /* Etwas weiter nach außen als der Pfad → Deko liegt neben dem Pfad, nicht drauf. */
    const outLen = Math.hypot(midPos.x, midPos.z) || 1;
    const outPush = 2.5;
    const rPos = {
      x: midPos.x + (midPos.x / outLen) * outPush,
      z: midPos.z + (midPos.z / outLen) * outPush,
    };
    const biomeColors = {
      village:  { ground: '#6b5236', tint: '#a0784a', edge: '#8a6a4a' },
      desert:   { ground: '#c89b5a', tint: '#e0b070', edge: '#a87a3a' },
      forest:   { ground: '#1f3a26', tint: '#2d5a3a', edge: '#1a2a1a' },
      mountain: { ground: '#4a4a5a', tint: '#6a6a7a', edge: '#2a2a3a' },
      swamp:    { ground: '#2a3a2a', tint: '#4a6a3a', edge: '#1a2a1a' },
      ice:      { ground: '#a8c8e8', tint: '#d8e8f8', edge: '#88a8c8' },
      volcano:  { ground: '#3a1a1a', tint: '#6a2a1a', edge: '#2a0a0a' },
      clouds:   { ground: '#c8b8e8', tint: '#e8d8f8', edge: '#a898c8' },
    };
    const bc = biomeColors[region.biome] || biomeColors.village;
    /* 6-8 organische Shape-Patches pro Region — entlang des Biom-Segments gestreut. */
    const rng = mulberry32(ri * 1337 + 42);
    const patchCount = 8 + Math.floor(rng() * 3);
    for (let pi = 0; pi < patchCount; pi++) {
      /* Patches entlang des Segments verteilen, nicht nur um rPos. */
      const segT = (pi + 0.5) / patchCount;
      const patchIdx = ri * 20 + Math.floor(segT * 20);
      const patchPathPos = mainPathPosition(patchIdx, 160);
      /* Patch-Position: neben dem Pfad, leicht nach außen versetzt. */
      const pOut = Math.hypot(patchPathPos.x, patchPathPos.z) || 1;
      const pPush = 1.5 + rng() * 2.0;
      const px = patchPathPos.x + (patchPathPos.x / pOut) * pPush + (rng() - 0.5) * 2.0;
      const pz = patchPathPos.z + (patchPathPos.z / pOut) * pPush + (rng() - 0.5) * 2.0;
      const prad = 2.5 + rng() * 1.8;  /* große Patches für Biom-Zonen */
      /* Haupt-Patch in Biom-Farbe */
      const patch = new THREE.Mesh(
        new THREE.CircleGeometry(prad, 14 + Math.floor(rng() * 6)),
        new THREE.MeshStandardMaterial({
          color: color(bc.ground), roughness: 0.96, metalness: 0.0,
          emissive: color(bc.tint), emissiveIntensity: 0.05
        })
      );
      patch.rotation.x = -Math.PI / 2;
      patch.position.set(px, 0.265 + rng() * 0.03, pz);
      patch.receiveShadow = true;
      boardGroup.add(patch);
      /* 2-3 Unter-Patches mit Edge-Farbe → organische Kanten, kein harter Kreis */
      const subs = 2 + Math.floor(rng() * 2);
      for (let si = 0; si < subs; si++) {
        const sa = rng() * Math.PI * 2;
        const sr = prad * (0.4 + rng() * 0.3);
        const sub = new THREE.Mesh(
          new THREE.CircleGeometry(prad * (0.7 + rng() * 0.2), 10),
          new THREE.MeshStandardMaterial({
            color: color(bc.edge), roughness: 0.95,
            emissive: color(bc.tint), emissiveIntensity: 0.03,
            transparent: true, opacity: 0.6
          })
        );
        sub.rotation.x = -Math.PI / 2;
        sub.position.set(px + Math.cos(sa) * sr * 0.6, 0.27, pz + Math.sin(sa) * sr * 0.6);
        sub.receiveShadow = true;
        boardGroup.add(sub);
      }
    }
    /* Dezenter Glow-Verlauf in Regionsfarbe — sehr sanft, nicht mehr als Kreis erkennbar.
       Liegt knapp über dem Biom-Boden, sehr niedrige Opacity. */
    const glow = new THREE.Mesh(
      new THREE.CircleGeometry(5.0, 24),  /* Etappe 2: größerer Glow */
      new THREE.MeshStandardMaterial({
        color: color(region.color), transparent: true, opacity: 0.06,
        emissive: color(region.color), emissiveIntensity: 0.04, roughness: 0.95
      })
    );
    glow.rotation.x = -Math.PI / 2;
    glow.position.set(rPos.x, 0.29, rPos.z);
    boardGroup.add(glow);
    /* Region-Beschriftung — schwebt über der Region */
    const regionLabel = makeLabelSprite(region.name.toUpperCase(), region.color, 32);
    regionLabel.position.set(rPos.x, 0.4, rPos.z);
    regionLabel.scale.setScalar(1.1);
    boardGroup.add(regionLabel);
    /* Biom-spezifische Deko (Häuser/Brunnen, Dünen/Kakteen, Bäume/Pilze, Felsen/Kristalle) */
    const decor = biomeDecor(region.biome, rPos, rng);
    decor.forEach(d => boardGroup.add(d));
  });

  /* Zentrale Landmarke — großer Stern in der Mitte (Etappe 2: größer für größeres Board) */
  const centerStar = new THREE.Mesh(
    new THREE.OctahedronGeometry(1.8, 2),
    material('#ffd34e', { metalness: 0.5, emissive: '#ffd34e', emissiveIntensity: 0.78 })
  );
  /* Etappe 2.5 Landschaft: Stern auf dem zentralen Berg (terrainHeight(0,0)+4). */
  centerStar.position.y = terrainHeight(0, 0) + 3.2;
  centerStar.userData.spin = 0.5;
  centerStar.castShadow = false;
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
      pebble.castShadow = false;
      boardGroup.add(pebble);
    } else {
      const grass = new THREE.Mesh(
        new THREE.ConeGeometry(0.07, 0.22 + globalRng() * 0.1, 5),
        new THREE.MeshStandardMaterial({ color: 0x3a6a3a, roughness: 0.95, emissive: 0x1a3a1a, emissiveIntensity: 0.08 })
      );
      grass.position.set(gx, 0.36, gz);
      grass.castShadow = false;
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
  /* Pfad-Bänder entlang der Graph-Verbindungen (tile.next).
     Etappe 2: statt (i+1)%length nutzen wir das next-Array aus dem Tile. */
  const drawnEdges = new Set();  /* "a-b" Key um Doppelkanten zu vermeiden */
  tiles.forEach((tile, i) => {
    const idxA = Number(tile.idx == null ? i : tile.idx);
    const pos1 = tilePosition(idxA, tiles.length);
    const nxts = tile.next || [];
    if (!nxts.length) {
      /* Fallback: linearer Wrap (alte Boards ohne next-Array) */
      const nextIdx = (i + 1) % tiles.length;
      const pos2 = tilePosition(Number(tiles[nextIdx].idx || nextIdx), tiles.length);
      drawPathBand(pos1, pos2);
      return;
    }
    nxts.forEach(nIdx => {
      const key = idxA < nIdx ? `${idxA}-${nIdx}` : `${nIdx}-${idxA}`;
      if (drawnEdges.has(key)) return;
      drawnEdges.add(key);
      const pos2 = tilePosition(Number(nIdx), tiles.length);
      drawPathBand(pos1, pos2);
    });
  });

  tiles.forEach((tile, index) => {
    const pos = tilePosition(Number(tile.idx) || index, tiles.length);
    /* Etappe 2.5 Landschaft: Tiles sitzen auf dem Terrain auf (terrainHeight + Versatz).
       pos.y aus mainPathPosition wird nicht mehr genutzt — terrainHeight gibt die echte Höhe. */
    const tileY = terrainHeight(pos.x, pos.z) + 0.15;
    const ownerId = (state.board.owners || {})[String(tile.idx == null ? index : tile.idx)];
    const owner = players.find(player => player.id === ownerId);
    /* Junction-Tiles bekommen eine besondere Farbe (Wegweiser-Look) */
    const isJunction = tile.type === 'junction' || (tile.next && tile.next.length > 1);
    const baseTileColor = tileColor(tile, owner);
    const tileMat = material(baseTileColor, { metalness: 0.5, emissiveIntensity: owner ? 0.44 : (isJunction ? 0.5 : 0.24) });
    /* Feld — abgerundete Box, flach auf dem Pfad. Etappe 2.5 Perf: Segmente 1,1,1
       (vorher 4,2,4) → bei 240 Feldern massig weniger Polygone. */
    const tileMesh = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.22, 0.36, 1, 1, 1), tileMat);
    tileMesh.position.set(pos.x, tileY, pos.z);
    tileMesh.rotation.y = -pos.angle;
    tileMesh.userData.index = tile.idx == null ? index : tile.idx;
    tileMesh.castShadow = true;   /* Etappe 2.5 Perf: Tiles werfen Schatten (wichtig für Tiefe) */
    tileMesh.receiveShadow = true;
    boardGroup.add(tileMesh);

    /* Cap — farbige Oberfläche zeigt Feld-Typ */
    const cap = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.03, 0.28),
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
      /* Etappe 2.5: Item-Shop als 3D-Gebäude (Laden/Hütte) statt Popup-Box.
         Gebäude steht auf dem Feld: Basis aus Holz, markantes grünes Dach,
         Eingang mit Vorhang, Waren-Tische außen, schwebendes Gift-Icon als
         Blickfang darüber. Gebäudemodell immer in Pfad-Richtung ausgerichtet. */
      const shop = new THREE.Group();
      /* Bodenplatte — leicht erhöhter Steinsockel */
      const shopBase = new THREE.Mesh(
        new THREE.BoxGeometry(0.42, 0.06, 0.32),
        new THREE.MeshStandardMaterial({ color: 0x8a7a6a, roughness: 0.95 })
      );
      shopBase.position.y = 0.05;
      shopBase.castShadow = false;
      shopBase.receiveShadow = true;
      shop.add(shopBase);
      /* Wände — holzfarbene Box, offen an der Vorderseite (Richtung Pfad-Außenseite) */
      const walls = new THREE.Mesh(
        new THREE.BoxGeometry(0.38, 0.27, 0.28),
        new THREE.MeshStandardMaterial({ color: 0x6a4a2a, roughness: 0.88 })
      );
      walls.position.y = 0.22;
      walls.castShadow = false;
      walls.receiveShadow = true;
      shop.add(walls);
      /* Markantes grünes Satteldach — Pyramidkegel, passend zur Item-Shop-Farbe */
      const roof = new THREE.Mesh(
        new THREE.ConeGeometry(0.34, 0.24, 4),
        new THREE.MeshStandardMaterial({ color: 0x2bffb9, roughness: 0.5, emissive: 0x0a8a6a, emissiveIntensity: 0.3, metalness: 0.3 })
      );
      roof.position.y = 0.47;
      roof.rotation.y = Math.PI / 4;
      roof.castShadow = false;
      shop.add(roof);
      /* Dachhaube — kleine goldene Kugel auf der Spitze */
      const roofKnob = new THREE.Mesh(
        new THREE.SphereGeometry(0.04, 8, 6),
        new THREE.MeshStandardMaterial({ color: 0xffd34e, emissive: 0xffd34e, emissiveIntensity: 0.6, metalness: 0.7, roughness: 0.2 })
      );
      roofKnob.position.y = 0.62;
      shop.add(roofKnob);
      /* Eingangsvorhang — leuchtender Vorhang aus kleinen Boxen */
      const curtainMat = new THREE.MeshStandardMaterial({ color: 0xff3cac, emissive: 0xff3cac, emissiveIntensity: 0.4, roughness: 0.6 });
      for (let ci = 0; ci < 3; ci++) {
        const curtain = new THREE.Mesh(
          new THREE.BoxGeometry(0.06, 0.19, 0.015),
          curtainMat
        );
        curtain.position.set(-0.11 + ci * 0.11, 0.22, 0.15);
        shop.add(curtain);
      }
      /* Theke / Waren-Tisch außen vor dem Eingang — zwei kleine Kisten mit Items */
      for (let ti = 0; ti < 2; ti++) {
        const crate = new THREE.Mesh(
          new THREE.BoxGeometry(0.1, 0.07, 0.07),
          new THREE.MeshStandardMaterial({ color: 0x8a6a3a, roughness: 0.9 })
        );
        crate.position.set(-0.12 + ti * 0.24, 0.1, 0.2);
        crate.castShadow = false;
        shop.add(crate);
        /* Kleines leuchtendes Item auf der Kiste — als Ware angedeutet */
        const wareColor = ti === 0 ? 0xff3cac : 0xffd34e;
        const ware = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.04, 0),
          new THREE.MeshStandardMaterial({ color: wareColor, emissive: wareColor, emissiveIntensity: 0.9 })
        );
        ware.position.set(-0.12 + ti * 0.24, 0.15, 0.2);
        ware.userData.spin = 0.5;
        ware.userData.orbit = 0.4 + ti * 0.1;
        shop.add(ware);
      }
      /* Ausrichtung: Gebäude blickt zur Pfad-Außenseite (Richtung = -pos.angle + π/2) */
      shop.position.set(pos.x, tileY, pos.z);
      shop.rotation.y = -pos.angle + Math.PI / 2;
      shop.userData.isShop = true;
      boardGroup.add(shop);
      /* Schwebendes Gift-Icon über dem Dach — als Werbeschild / Blickfang.
         Dreht und hüpft leicht → signalisiert Item-Shop von weitem. */
      const gift = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.22), material('#2bffb9', { emissiveIntensity: 0.85 }));
      gift.position.set(pos.x, tileY + 1.15, pos.z);
      gift.userData.spin = 0.5;
      gift.userData.orbit = 0.5 + index * 0.05;
      boardGroup.add(gift);
      addGlow(gift, '#2bffb9', 0.6, 0.5);
      /* Schleife auf dem Icon */
      const ribbon = new THREE.Mesh(
        new THREE.BoxGeometry(0.24, 0.04, 0.06),
        new THREE.MeshStandardMaterial({ color: 0xff3cac, emissive: 0xff3cac, emissiveIntensity: 0.7 })
      );
      ribbon.position.set(pos.x, tileY + 1.3, pos.z);
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
    if (isJunction) {
      /* Etappe 2: Wegweiser-Pfahl mit Pfeil-Schild an Junctions. */
      const signPole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 0.85, 8),
        new THREE.MeshStandardMaterial({ color: 0x5a3a1a, roughness: 0.85 })
      );
      signPole.position.set(pos.x, tileY + 0.45, pos.z);
      signPole.castShadow = false;
      boardGroup.add(signPole);
      const arrow = new THREE.Mesh(
        new THREE.ConeGeometry(0.22, 0.4, 4),
        material('#ff9e3c', { emissiveIntensity: 0.55, metalness: 0.3 })
      );
      arrow.position.set(pos.x, tileY + 1.05, pos.z);
      arrow.userData.spin = 0.8;
      arrow.userData.orbit = 0.5 + index * 0.05;
      boardGroup.add(arrow);
      const jlabel = makeLabelSprite('⇄', '#ff9e3c', 24);
      jlabel.position.set(pos.x, tileY + 1.45, pos.z);
      jlabel.scale.setScalar(0.5);
      boardGroup.add(jlabel);
    }
  });

  /* Pawns: wenn eine Hop-Animation läuft, behalte existierende Pawn-Meshes
     und re-parente sie ins neue boardGroup — sonst teleportiert der rebuild. */
  /* BUGFIX: Object.keys() liefert Strings, player.id ist Number aus JSON.
     Set.has(1) !== Set.has("1") → der Schutz griff nie → Pawns wurden bei
     jedem board:update neu gebaut → Hop-Animation sofort abgebrochen.
     Fix: String-Konvertierung für konsistente Keys. */
  const livePawns = new Set(Object.keys(pawnAnim).filter(pid => pawnAnim[pid] && pawnAnim[pid].active));
  players.forEach((player, index) => {
    const position = Number(player.position) || 0;
    const sameIndex = players.slice(0, index).filter(p => (Number(p.position) || 0) === position).length;
    const pid = String(player.id);
    const existing = pawnMeshes[pid];
    if (livePawns.has(pid) && existing) {
      /* Hop läuft — Mesh behalten, nur ins neue boardGroup umhängen.
         Position wird von updatePawnHops() weiter getrieben. */
      boardGroup.add(existing);
    } else {
      const p = pawn(player, sameIndex, totalByTile[position] || 1);
      pawnMeshes[pid] = p;
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
/* Etappe 2: Path-basierte Hop-Animation.
   API: animatePawnMove(playerId, path) — path = [idx0, idx1, ..., idxN]
   Der Pawn hüpft Feld für Feld entlang des Pfads.
   Rückwärts-kompatibel: (playerId, from, to, total) wird zu einem
   zirkulären Pfad expandiert (altes 40-Felder-Board). */
function animatePawnMove(playerId, from, to, total) {
  if (!playerId) return;
  const pidKey = String(playerId);  /* konsistente String-Keys für pawnMeshes/pawnAnim */
  let path;
  if (Array.isArray(from)) {
    /* Neue API: from ist bereits der Pfad */
    path = from;
  } else {
    if (!Number.isFinite(from) || !Number.isFinite(to)) return;
    const size = Math.max(1, total || state.board.tiles.length || 24);
    let steps = to - from;
    if (steps < 0) steps += size;
    if (steps === 0) return;
    path = [];
    for (let s = 0; s <= steps; s++) path.push((from + s) % size);
  }
  if (path.length < 2) return;
  pawnAnim[pidKey] = {
    active: true,
    path: path,
    currentIdx: 0,
    progress: 0,
    hopDuration: 0.28,
  };
}

/* Berechnet Pawn-Position auf einem Feld (mit Offset wenn mehrere drauf). */
function pawnPosOnTile(tileIdx, playerIdx, totalAtTile) {
  const pos = tilePosition(tileIdx, state.board.tiles.length || 24);
  const offset = (playerIdx - (totalAtTile - 1) / 2) * 0.46;
  return {
    x: pos.x + offset * Math.cos(pos.angle + Math.PI / 2),
    y: terrainHeight(pos.x + offset * Math.cos(pos.angle + Math.PI / 2), pos.z + offset * Math.sin(pos.angle + Math.PI / 2)) + 0.18,
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
    if (!anim || !anim.active || !anim.path) return;
    const mesh = pawnMeshes[pid];
    if (!mesh) { anim.active = false; return; }

    anim.progress += delta / anim.hopDuration;
    /* Fertig mit aktuellem Hop? → nächsten Schritt beginnen */
    while (anim.progress >= 1 && anim.currentIdx < anim.path.length - 1) {
      anim.progress -= 1;
      anim.currentIdx += 1;
      if (anim.currentIdx >= anim.path.length - 1) {
        anim.active = false;
        anim.progress = 0;
        break;
      }
    }

    const lastIdx = anim.path[anim.path.length - 1];
    if (!anim.active) {
      /* Animation beendet — Pawn auf Zielfeld platzieren */
      const target = pawnPosOnTile(lastIdx, 0, 1);
      mesh.position.set(target.x, target.y, target.z);
      mesh.rotation.y = -target.angle;
      return;
    }

    /* Zwischen currentIdx und currentIdx+1 interpolieren + Hop-Bogen */
    const t = Math.min(1, anim.progress);
    const fromIdx = anim.path[anim.currentIdx];
    const toIdx = anim.path[anim.currentIdx + 1] ?? lastIdx;
    const fromPos = pawnPosOnTile(fromIdx, 0, 1);
    const toPos = pawnPosOnTile(toIdx, 0, 1);
    const x = fromPos.x + (toPos.x - fromPos.x) * t;
    const z = fromPos.z + (toPos.z - fromPos.z) * t;
    const hop = hopArc(t, 0.55);
    mesh.position.set(x, fromPos.y + hop, z);
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
  mesh.castShadow = false;
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
  core.castShadow = false;
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
    hill.castShadow = true;   /* Etappe 2.5 Perf: Berge werfen Schatten (große Form, sichtbar) */
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
    trunk.castShadow = false;
    tree.add(trunk);
    const leafColor = [0x2d8a3e, 0x3aa050, 0x226e30][i % 3];
    const leaves = new THREE.Mesh(
      new THREE.ConeGeometry(0.85, 1.6, 8),
      new THREE.MeshStandardMaterial({ color: leafColor, roughness: 0.82, flatShading: true })
    );
    leaves.position.y = -0.1;
    leaves.castShadow = false;
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
  cube.castShadow = false;
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
      pip.castShadow = false;
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
  crystal.castShadow = false;
  showcaseGroup.add(crystal);
  addGlow(crystal, '#00f0ff', 2.6, 1.5);

  for (let i = 0; i < 8; i += 1) {
    const angle = (i / 8) * Math.PI * 2;
    const pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.28, 1.8 + (i % 3) * 0.4, 16),
      material(palette[i], { emissiveIntensity: 0.45 })
    );
    pillar.position.set(Math.cos(angle) * 4.3, 0.9, Math.sin(angle) * 3.1);
    pillar.castShadow = false;
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

/* Etappe 2.5: Kamera-Fokus auf aktive Spielerfigur.
   Gibt die Welt-Position des aktiven Pawns zurück (oder Board-Mitte als Fallback). */
function activePawnWorldPos() {
  const ap = state.activePawnId != null ? String(state.activePawnId) : null;
  if (ap && pawnMeshes[ap]) {
    const p = pawnMeshes[ap];
    /* Etappe 2.5: getWorldPosition weil Pawns in boardGroup (offset y=-0.85) liegen. */
    const v = new THREE.Vector3();
    p.getWorldPosition(v);
    v.y += 0.5;
    return v;
  }
  /* Fallback: aktueller Spieler anhand Position im Board-State. */
  const players = state.board && state.board.players;
  if (players && players.length) {
    const idx = Number(state.activePlayerIdx || 0);
    const pl = players[idx] || players[0];
    if (pl) {
      const pos = tilePosition(Number(pl.position) || 0, state.board.tiles.length || 24);
      return new THREE.Vector3(pos.x, terrainHeight(pos.x, pos.z) + 0.5 - 0.85, pos.z);
    }
  }
  return new THREE.Vector3(0, 0.2, 0);
}

function lookTarget() {
  if (state.mode === 'board') return activePawnWorldPos();
  if (state.mode === 'game') return new THREE.Vector3(0, 0.25, 0);
  return new THREE.Vector3(0, 0.75, 0);
}

function updateCamera() {
  if (!camera) return;
  const board = state.mode === 'board';
  const game = state.mode === 'game';
  /* Etappe 2.5: Im Board-Modus folgt die Kamera dem aktiven Spieler.
     Kamera positioniert sich hinter/über dem Pawn (Richtung Mitte + Höhe).
     Beim ersten Board-Bild (kein aktiver Spieler) fällt sie auf Übersicht zurück. */
  let base;
  if (board) {
    const focus = activePawnWorldPos();
    /* Kamera steht leicht versetzt vom Pawn Richtung Board-Außenrand + deutlich höher. */
    const outLen = Math.hypot(focus.x, focus.z) || 1;
    const camDist = 7.5;   /* Abstand hinter dem Pawn */
    const camHeight = 8.5; /* Höhe über dem Pawn */
    base = {
      x: focus.x + (focus.x / outLen) * camDist,
      y: focus.y + camHeight,
      z: focus.z + (focus.z / outLen) * camDist,
    };
    /* Wenn der Pawn nah an der Mitte ist (Start), Übersicht behalten. */
    if (outLen < 3) base = { x: 0, y: 14, z: 14 };
  } else if (game) {
    base = { x: 0, y: 8.2, z: 11.4 };
  } else {
    base = { x: 0, y: 6.8, z: 12.6 };
  }
  const targetX = base.x + pointer.x * (board ? 1.5 : 1.2);
  const targetY = base.y + pointer.y * (board ? 0.6 : 0.45);
  camera.position.x += (targetX - camera.position.x) * 0.045;
  camera.position.y += (targetY - camera.position.y) * 0.045;
  camera.position.z += (base.z - camera.position.z) * 0.045;
  camera.lookAt(lookTarget());
}

function animate() {
  if (!renderer || !scene) return;
  const elapsed = clock.getElapsedTime();
  const delta = Math.min(0.04, clock.getDelta());
  updateCamera();
  updatePawnHops(delta);
  /* Etappe 2.5 Perf: Bloom nur im Showcase/Mini-Game — im Board-Modus abgestellt. */
  if (bloomPass) bloomPass.enabled = state.mode !== 'board';

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
  /* Etappe 2.5: aktiver Spieler für Kamera-Fokus. Wird vom Host/Player-Modul
     gesetzt wenn das Board aktualisiert wird (turnPlayerId vom Server). */
  if (payload.turnPlayerId != null) state.activePawnId = payload.turnPlayerId;
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
    // Etappe 2.5 Perf: PixelRatio 2.5→1.5 (groesster FPS-Hebel auf HiDPI/Retina)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
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
    camera.position.set(0, 22, 22);
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
    // Schattenwerfendes Hauptlicht — Etappe 2.5 Perf: 4096→2048 mapSize (halbiert VRAM+FPS)
    key.castShadow = false;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.near = 0.5;
    key.shadow.camera.far = 45;
    key.shadow.camera.left = -20;
    key.shadow.camera.right = 20;
    key.shadow.camera.top = 20;
    key.shadow.camera.bottom = -20;
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
       Etappe 2.5 Perf: Bloom nur im Showcase/Mini-Game (kosmetisch), im Board-Modus abgestellt
       weil es dort der größte FPS-Killer ist und das Board ohnehin nicht glühen muss. */
    try {
      composer = new EffectComposer(renderer);
      const renderPass = new RenderPass(scene, camera);
      composer.addPass(renderPass);
      bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        0.32,  /* strength: vorher 0.45 → dezentes Glow, Etappe 2.5 reduziert */
        0.35,  /* radius: enger */
        0.85   /* threshold: vorher 0.7 → nur ganz helle Highlights glühen */
      );
      composer.addPass(bloomPass);
      composer.setSize(window.innerWidth, window.innerHeight);
      composer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
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
        composer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
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
