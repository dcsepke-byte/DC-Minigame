/* ============================================================
   PARTY ARENA — 2D Canvas Board (Aethonia-Stadt)
   Felder liegen auf den Strassen der Pico-8-Stadt (Serpentinen-Pfad).
   Hauptpfad: 160 Felder auf den Strassen. Side-Paths: kurze Abstecher.
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
    bgImg: null,   // Stadtkarte
    mainPath: [],  // 160 Pixel-Koordinaten (in Tile-Einheiten)
    sidePaths: [], // 8 x [10 Punkte]
  };

  const TILE = 8;

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
     POSITION: 160 Hauptfelder auf dem Strassen-Serpentinen-Pfad.
     Felder 0..159 -> mainPath[0..159].
     Side-Paths 160..239 -> sidePaths[bi][j], bi = (idx-160)//10.
     Skalierung: Karte wird auf state._bgScale skaliert, Pfad-Punkte
     (in Tile*8-Pixel) muessen mit derselben Skala + Zentrum verschoben werden.
     ============================================================ */
  function toScreen(p) {
    const s = state._bgScale || 1;
    const w = state._w, h = state._h;
    return { x: p.x * s + (w - (state.bgImg ? state.bgImg.width : 0) * s) / 2,
             y: p.y * s + (h - (state.bgImg ? state.bgImg.height : 0) * s) / 2 };
  }

  function tilePosition(index, total, cx, cy, scale) {
    const mp = state.mainPath;
    if (mp && mp.length >= 160) {
      if (index < 160) {
        return toScreen(mp[index]);
      }
      const bi = Math.floor((index - 160) / 10);
      const j = (index - 160) % 10;
      const sp = state.sidePaths[bi];
      if (sp && sp[j]) {
        return toScreen(sp[j]);
      }
    }
    // Fallback: Kreis (falls Pfad noch nicht geladen)
    const mainLen = 160;
    if (index < mainLen) {
      const segLen = mainLen / 8;
      const segment = Math.floor(index / segLen);
      const segT = (index % segLen) / segLen;
      const segAngle = (segment + 0.5) / 8 * Math.PI * 2 - Math.PI / 2;
      const r = 8.0;
      const angle = segAngle + (segT - 0.5) * (Math.PI * 2 / 8) * 0.95;
      return { x: cx + Math.cos(angle) * r * scale, y: cy + Math.sin(angle) * r * scale };
    }
    return { x: cx, y: cy };
  }

  /* ============================================================
     PFAD-LADEN: BOARD_PATH aus board-path-data.js in Pixel umrechnen
     ============================================================ */
  function loadPath() {
    const bp = window.BOARD_PATH;
    if (!bp || !bp.main) return;
    // Main-Pfad (Tile -> Pixel, zentriert auf Karte)
    state.mainPath = bp.main.map(([tx, ty]) => ({ x: tx * TILE, y: ty * TILE }));
    state.sidePaths = (bp.side || []).map(sp => sp.map(([tx, ty]) => ({ x: tx * TILE, y: ty * TILE })));
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

    // Stadtkarte laden
    const img = new Image();
    img.onload = () => { state.bgImg = img; render(); };
    img.src = 'assets/kenney-pico8-city/aethonia_city_4x.png';

    loadPath();
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
     RENDER
     ============================================================ */
  function render() {
    const ctx = state.ctx;
    const c = state.canvas;
    if (!ctx || !c || !state.active) return;
    const w = state._w, h = state._h;
    ctx.clearRect(0, 0, w, h);

    const cx = w / 2, cy = h / 2;
    const scale = Math.min(w, h) / 140;   // Karte ~880px breit skalieren

    // --- 1. Stadtkarte als Hintergrund ---
    if (state.bgImg) {
      const bw = state.bgImg.width, bh = state.bgImg.height;
      const s = Math.min((w * 0.98) / bw, (h * 0.9) / bh);
      const iw = bw * s, ih = bh * s;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(state.bgImg, cx - iw / 2, cy - ih / 2, iw, ih);
      // Pfad-Punkte: Skalierung fuer tilePosition
      state._bgScale = s;
    }

    const tiles = state.tiles;
    const total = tiles.length || 24;

    // --- 2. Pfad-Verbindungen (Strassen als Linien zwischen Feldern) ---
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 2;
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

      ctx.fillStyle = style.color;
      ctx.strokeStyle = owner ? owner.color : 'rgba(255,255,255,0.4)';
      ctx.lineWidth = owner ? 2 : 1;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#fff';
      ctx.font = '7px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(style.icon, pos.x, pos.y);

      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = '5px sans-serif';
      ctx.fillText(String(idx), pos.x, pos.y + 10);
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
        ctx.arc(px, py, 9, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = p.color || '#7b2ff7';
      ctx.strokeStyle = isTurn ? '#ffd54f' : 'rgba(255,255,255,0.5)';
      ctx.lineWidth = isTurn ? 2 : 1;
      ctx.beginPath();
      ctx.arc(px, py, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      const parts = String(p.name || '?').trim().split(/\s+/);
      const initials = parts.length >= 2
        ? (parts[0][0] + parts[1][0]).toUpperCase()
        : String(p.name || '?').trim().slice(0, 2).toUpperCase();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 5px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(initials, px, py);
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
