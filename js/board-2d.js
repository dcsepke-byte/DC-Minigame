/* ============================================================
   PARTY ARENA — 2D Canvas Board (Aethonia-Weltkarte)
   Kompletter Neuaufbau: schöne Inselwelt mit 8 Biomen,
   160 Feldern, Verzweigungen, Deko. Haupt-Renderer.
   ============================================================ */
(() => {
  'use strict';

  const state = {
    tiles: [],
    players: [],
    owners: {},
    canvas: null,
    ctx: null,
    active: false,
    turnPlayerId: null,
    _w: 0, _h: 0, _dpr: 1,
  };

  /* ============================================================
     AETHONIA-BIOME (Konzept-Farben)
     ============================================================ */
  const BIOMES = [
    { id: 'sonnenstrand', name: 'Sonnenstrand', color: '#ffd54f', land: '#f9a825', water: '#0288d1', deco: '🌴' },
    { id: 'zuckerwald',    name: 'Zuckerwald',    color: '#f48fb1', land: '#e91e63', water: '#f8bbd0', deco: '🍭' },
    { id: 'wolkenwerk',    name: 'Wolkenwerk',    color: '#b3e5fc', land: '#29b6f6', water: '#e1f5fe', deco: '☁️' },
    { id: 'frostgipfel',   name: 'Frostgipfel',   color: '#b3e5fc', land: '#5c6bc0', water: '#e3f2fd', deco: '❄️' },
    { id: 'dschungel',     name: 'Dschungel',     color: '#81c784', land: '#2e7d32', water: '#a5d6a7', deco: '🌿' },
    { id: 'mechanik',      name: 'Mechanik-Stadt', color: '#b0bec5', land: '#546e7a', water: '#cfd8dc', deco: '⚙️' },
    { id: 'sonnenstrand2', name: 'Sonnenstrand',  color: '#ffd54f', land: '#f9a825', water: '#0288d1', deco: '🏖️' },
    { id: 'zitadelle',     name: 'Sternenzitadelle', color: '#ffd700', land: '#ff8f00', water: '#fff59d', deco: '⭐' },
  ];

  /* ============================================================
     FELD-TYPEN (Symbole + Farben)
     ============================================================ */
  const TILE_STYLE = {
    start:    { icon: '🏁', color: '#ffd54f' },
    property: { icon: '🎮', color: '#90caf9' },
    event:    { icon: '🎲', color: '#ff8a65' },
    starshop: { icon: '⭐', color: '#fff176' },
    itemshop: { icon: '🎁', color: '#81c784' },
    lucky:    { icon: '🍀', color: '#ba68c8' },
    bonus:    { icon: '🪙', color: '#4dd0e1' },
    junction: { icon: '🧭', color: '#ce93d8' },
  };

  /* ============================================================
     POSITION: 160 Felder als Kleeblatt durch 8 Biome
     (gleiche Topologie wie Server, aber schöner gerendert)
     ============================================================ */
  function tilePosition(index, total, cx, cy, scale) {
    const mainLen = 160;
    if (index < mainLen) {
      const segLen = mainLen / 8;
      const segment = Math.floor(index / segLen);
      const segT = (index % segLen) / segLen;
      const segAngle = (segment + 0.5) / 8 * Math.PI * 2 - Math.PI / 2;
      const bulge = Math.sin(segT * Math.PI);
      const r = 8.0 + 7.5 * bulge;
      const angleSpread = (Math.PI * 2 / 8) * 0.95;
      const angle = segAngle + (segT - 0.5) * angleSpread;
      const wobble = Math.sin(index * 0.4) * 0.12;
      return {
        x: cx + Math.cos(angle) * (r + wobble) * scale,
        y: cy + Math.sin(angle) * (r + wobble) * 0.92 * scale,
      };
    }
    // Side-Path (Verzweigung)
    const bi = Math.floor((index - mainLen) / 10);
    const j = (index - mainLen) % 10;
    const bstart = [10, 30, 50, 70, 90, 110, 130, 150][bi] || 10;
    const rejoin = [30, 50, 70, 90, 110, 130, 150, 10][bi] || 30;
    const p0 = tilePosition(bstart, total, cx, cy, scale);
    const p1 = tilePosition(rejoin, total, cx, cy, scale);
    const t = j / 9;
    const midX = (p0.x + p1.x) / 2, midY = (p0.y + p1.y) / 2;
    const outLen = Math.hypot(midX - cx, midY - cy) || 1;
    const outDirX = (midX - cx) / outLen, outDirY = (midY - cy) / outLen;
    const bulge = 6.0 * scale;
    const mx = midX + outDirX * bulge, my = midY + outDirY * bulge;
    const omt = 1 - t;
    return {
      x: omt * omt * p0.x + 2 * omt * t * mx + t * t * p1.x,
      y: omt * omt * p0.y + 2 * omt * t * my + t * t * p1.y,
    };
  }

  function biomeForIndex(index) {
    if (index >= 160) {
      const bi = Math.floor((index - 160) / 10);
      return BIOMES[bi] || BIOMES[0];
    }
    const seg = Math.floor(index / 20);
    return BIOMES[seg] || BIOMES[0];
  }

  /* ============================================================
     INIT
     ============================================================ */
  function init() {
    const canvas = document.createElement('canvas');
    canvas.id = 'board-2d-canvas';
    canvas.style.cssText = 'position:fixed;inset:0;z-index:0;pointer-events:none;';
    document.body.prepend(canvas);
    state.canvas = canvas;
    state.ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
    state.active = true;
  }

  function resize() {
    const c = state.canvas;
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    state._dpr = dpr;
    state._w = window.innerWidth;
    state._h = window.innerHeight;
    c.width = state._w * dpr;
    c.height = state._h * dpr;
    state.ctx.setTransform(1, 0, 0, 1, 0, 0);
    state.ctx.scale(dpr, dpr);
    render();
  }

  function setBoardState(payload) {
    if (!payload) return;
    state.tiles = Array.isArray(payload.tiles) ? payload.tiles : state.tiles;
    state.players = Array.isArray(payload.players) ? payload.players : state.players;
    state.owners = payload.owners || state.owners || {};
    if (payload.turnPlayerId != null) state.turnPlayerId = payload.turnPlayerId;
    render();
  }

  /* ============================================================
     RENDER — die Aethonia-Weltkarte
     ============================================================ */
  function render() {
    const ctx = state.ctx;
    const c = state.canvas;
    if (!ctx || !c || !state.active) return;
    const w = state._w, h = state._h;
    ctx.clearRect(0, 0, w, h);

    const cx = w / 2, cy = h / 2;
    // Hintergrund: Ozean (tiefes Wasser) statt dunklem Himmel
    const ocean = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.7);
    ocean.addColorStop(0, '#0d3b66');
    ocean.addColorStop(1, '#062a4a');
    ctx.fillStyle = ocean;
    ctx.fillRect(0, 0, w, h);

    const scale = Math.min(w, h) / 40;
    const tiles = state.tiles;
    const total = tiles.length || 24;

    // --- 1. Biome als grosse Sektoren (Kuchenstuecke) — klare Themengebiete ---
    // Jeder Sektor deckt einen 45°-Bereich des Feld-Rings ab (Mario-Party-Stil).
    const ringR = 17 * scale;   // aeusserer Rand des Feld-Rings
    for (let seg = 0; seg < 8; seg++) {
      const biome = BIOMES[seg];
      const startAngle = (seg / 8) * Math.PI * 2 - Math.PI / 2;
      const endAngle = ((seg + 1) / 8) * Math.PI * 2 - Math.PI / 2;

      // Sektor-Flaeche (Landmasse) — opak, kräftige Farbe
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, ringR * 1.2, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = biome.land;
      ctx.fill();

      // Sektor-Rand (Wasser/Trennung)
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, ringR * 1.2, startAngle, endAngle);
      ctx.closePath();
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Biom-Label am Sektor-Rand
      const midAngle = (startAngle + endAngle) / 2;
      const lx = cx + Math.cos(midAngle) * ringR * 1.35;
      const ly = cy + Math.sin(midAngle) * ringR * 1.35;
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(biome.name, lx, ly);

      // Deko-Emoji
      ctx.font = '20px sans-serif';
      ctx.fillText(biome.deco, lx, ly + 18);
    }

    // --- 2. Pfad-Verbindungen (Wege zwischen Feldern) ---
    ctx.strokeStyle = 'rgba(212,165,116,0.35)';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    for (let i = 0; i < total; i++) {
      const p1 = tilePosition(i, total, cx, cy, scale);
      const nextI = (i + 1) % total;
      const p2 = tilePosition(nextI, total, cx, cy, scale);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }

    // --- 3. Tiles (Felder) ---
    tiles.forEach((tile, i) => {
      const pos = tilePosition(i, total, cx, cy, scale);
      const idx = tile.idx == null ? i : tile.idx;
      const ownerId = state.owners[String(idx)];
      const owner = state.players.find(p => p.id === ownerId);
      const style = TILE_STYLE[tile.type] || TILE_STYLE.property;
      const biome = biomeForIndex(idx);

      // Feld-Körper (rund, mit Biom-Farbe als Ring)
      ctx.fillStyle = style.color;
      ctx.strokeStyle = owner ? owner.color : 'rgba(255,255,255,0.4)';
      ctx.lineWidth = owner ? 2.5 : 1.5;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Feld-Icon
      ctx.fillStyle = '#fff';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(style.icon, pos.x, pos.y);

      // Feld-Nummer (klein)
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = '7px sans-serif';
      ctx.fillText(String(idx), pos.x, pos.y + 16);
    });

    // --- 4. Spieler-Chips ---
    const posCount = {};
    state.players.forEach(p => { posCount[p.position || 0] = (posCount[p.position || 0] || 0) + 1; });
    const offsets = {};
    state.players.forEach(p => {
      const pos = p.position || 0;
      const tilePos = tilePosition(pos, total, cx, cy, scale);
      const count = posCount[pos] || 1;
      const idx = offsets[pos] || 0;
      offsets[pos] = idx + 1;
      const angleOffset = count > 1 ? (idx / count) * Math.PI * 2 - Math.PI / 2 : 0;
      const dist = count > 1 ? 18 : 0;
      const px = tilePos.x + Math.cos(angleOffset) * dist;
      const py = tilePos.y - 24 + Math.sin(angleOffset) * dist;
      const isTurn = state.turnPlayerId === p.id;

      if (isTurn) {
        ctx.fillStyle = 'rgba(255,213,79,0.35)';
        ctx.beginPath();
        ctx.arc(px, py, 13, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = p.color || '#7b2ff7';
      ctx.strokeStyle = isTurn ? '#ffd54f' : 'rgba(255,255,255,0.5)';
      ctx.lineWidth = isTurn ? 2.5 : 1.5;
      ctx.beginPath();
      ctx.arc(px, py, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      const parts = String(p.name || '?').trim().split(/\s+/);
      const initials = parts.length >= 2
        ? (parts[0][0] + parts[1][0]).toUpperCase()
        : String(p.name || '?').trim().slice(0, 2).toUpperCase();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 8px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(initials, px, py + 1);
    });
  }

  function show() { state.active = true; if (state.canvas) state.canvas.style.display = 'block'; render(); }
  function hide() { state.active = false; if (state.canvas) state.canvas.style.display = 'none'; }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

  window.Board2D = { setBoardState, show, hide, get active() { return state.active; } };
})();
