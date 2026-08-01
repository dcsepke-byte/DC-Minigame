/* ============================================================
   PARTY ARENA — Asset-Loader (arch-3)
   Lädt Assets als SVG/PNG/JPG (2D) oder GLTF/GLB (3D) mit
   Fallback auf generische Primitive. Zentrale Registry für
   Charaktere und Welt-Elemente — macht die visuellen Assets
   austauschbar ohne Code-Änderungen.

   API:
     window.AssetLoader.load(path, opts) -> Promise<{type, url, texture?, model?}>
     window.AssetLoader.loadCharacter(id) -> Promise<Character>
     window.AssetLoader.loadIsland(id)    -> Promise<Island>
     window.AssetLoader.register(name, def)  // Registry-Eintrag
     window.AssetLoader.getRegistry()        // alle Einträge
   ============================================================ */

const AssetLoader = (() => {
  'use strict';

  /* ---------- Registry ---------- */
  const registry = {};

  function register(name, def) {
    registry[name] = Object.assign({}, def);
  }

  function getRegistry() {
    return JSON.parse(JSON.stringify(registry));
  }

  /* ---------- Bild laden (SVG/PNG/JPG) ---------- */
  function loadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Bild nicht ladbar: ' + url));
      img.src = url;
    });
  }

  /* ---------- 3D laden (GLTF/GLB) — mit Fallback ---------- */
  let _gltfLoaderPromise = null;
  function getGLTFLoader() {
    if (!_gltfLoaderPromise) {
      _gltfLoaderPromise = (async () => {
        try {
          // Three.js lädt per Import-Map (scene3d.js ist Modul)
          const mod = await import('three/addons/loaders/GLTFLoader.js');
          return mod.GLTFLoader || null;
        } catch (e) {
          // Fallback: global verfügbarer Loader (window.THREE.GLTFLoader)
          const THREE = window.THREE;
          if (THREE && THREE.GLTFLoader) return THREE.GLTFLoader;
          return null;
        }
      })();
    }
    return _gltfLoaderPromise;
  }

  async function loadGLTF(url) {
    const GLTFLoader = await getGLTFLoader();
    if (!GLTFLoader) throw new Error('GLTFLoader nicht verfügbar');
    const THREE = window.THREE || (await import('three'));
    return new Promise((resolve, reject) => {
      const loader = new GLTFLoader();
      loader.load(url, resolve, undefined, reject);
    });
  }

  /* ---------- Haupt-Loader ---------- */
  async function load(path, opts = {}) {
    const lower = path.toLowerCase();
    try {
      if (lower.endsWith('.glb') || lower.endsWith('.gltf')) {
        const model = await loadGLTF(path);
        return { type: 'model', url: path, model };
      }
      const texture = await loadImage(path);
      return { type: 'texture', url: path, texture };
    } catch (err) {
      if (opts.fallback) return opts.fallback;
      console.warn('[AssetLoader] Fallback für fehlendes Asset:', path);
      return { type: 'fallback', url: path };
    }
  }

  /* ---------- Charakter laden ---------- */
  async function loadCharacter(id) {
    const def = registry[id] || registry['default'];
    if (!def) return { type: 'fallback', id };
    const candidates = [
      `assets/characters/${id}.glb`,
      `assets/characters/${id}.svg`,
      `assets/characters/${id}.png`,
    ];
    for (const c of candidates) {
      const result = await load(c, { fallback: null });
      if (result.type !== 'fallback') return Object.assign({ id }, result, { def });
    }
    return Object.assign({ id, type: 'primitive' }, { def });
  }

  /* ---------- Insel laden ---------- */
  async function loadIsland(id) {
    const def = registry[id] || null;
    const candidates = [
      `blender-assets/islands/${id}.glb`,
      `assets/islands/${id}.glb`,
      `assets/islands/${id}.svg`,
      `assets/islands/${id}.png`,
    ];
    for (const c of candidates) {
      const result = await load(c, { fallback: null });
      if (result.type !== 'fallback') return Object.assign({ id }, result, def ? { def } : {});
    }
    return Object.assign({ id, type: 'primitive' }, def ? { def } : {});
  }

  /* ---------- Exports ---------- */
  return { load, loadCharacter, loadIsland, register, getRegistry };
})();

if (typeof window !== 'undefined') window.AssetLoader = AssetLoader;

/* ---------- Beispiele in der Registry registrieren ---------- */
(function seedRegistry() {
  if (typeof window === 'undefined' || !window.AssetLoader) return;
  const R = window.AssetLoader;
  // Charaktere (aus Konzept-Review)
  R.register('brix', { name: 'Brix', kind: 'golem', color: '#ff6a00', home: 'mechanik-stadt' });
  R.register('nixie', { name: 'Nixie', kind: 'axolotl', color: '#00f0ff', home: 'sonnenstrand' });
  R.register('pip', { name: 'Pip', kind: 'squirrel', color: '#ffd34e', home: 'wolkenwerk' });
  R.register('koko', { name: 'Koko', kind: 'panda', color: '#ff4d6d', home: 'zuckerwald' });
  R.register('tiko', { name: 'Tiko', kind: 'bird', color: '#2bffb9', home: 'dschungeltempel' });
  R.register('bolt', { name: 'Bolt', kind: 'robot', color: '#3a86ff', home: 'mechanik-stadt' });
  R.register('bloom', { name: 'Bloom', kind: 'cactus', color: '#7b2ff7', home: 'dschungeltempel' });
  R.register('momo', { name: 'Momo', kind: 'raccoon', color: '#ff3cac', home: 'frostgipfel' });
  R.register('default', { name: 'Standard', kind: 'pawn', color: '#ffffff' });

  // Inseln (Biome) — Dateinamen passen zu blender-assets/islands/
  R.register('01_sonnenstrand', { name: 'Sonnenstrand', biome: 'beach', color: '#ffe082' });
  R.register('02_zuckerwald', { name: 'Zuckerwald', biome: 'candy', color: '#ffb3d9' });
  R.register('03_wolkenwerk', { name: 'Wolkenwerk', biome: 'sky', color: '#b3e5fc' });
  R.register('04_frostgipfel', { name: 'Frostgipfel', biome: 'ice', color: '#e1f5fe' });
  R.register('05_dschungeltempel', { name: 'Dschungeltempel', biome: 'jungle', color: '#81c784' });
  R.register('06_mechanikstadt', { name: 'Mechanik-Stadt', biome: 'tech', color: '#cfd8dc' });
  R.register('07_sternenzitadelle', { name: 'Sternenzitadelle', biome: 'finale', color: '#ffe082' });
})();
