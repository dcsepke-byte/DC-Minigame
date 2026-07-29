/* ============================================================
   PARTY ARENA — 2D Canvas Board Fallback
   Fuer Low-End-Geraete ohne WebGL/Three.js
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
  };

  /* Gleiche Mathe wie scene3d.js mainPathPosition, aber fuer 2D-Canvas */
  function tilePosition2D(index, total, cx, cy, scale) {
    const mainLen = 160;
    if (index < 160) {
      const t = index / mainLen;
      const segLen = mainLen / 8;
      const segment = Math.floor(index / segLen);
      const segT = (index % segLen) / segLen;
      const segAngle = (segment + 0.5) / 8 * Math.PI * 2 - Math.PI / 2;
      const bulge = Math.sin(segT * Math.PI);
      const r = 8.0 + 7.5 * bulge;
      const angleSpread = (Math.PI * 2 / 8) * 0.95;
      const angle = segAngle + (segT - 0.5) * angleSpread;
      const wobble = Math.sin(t * Math.PI * 16) * 0.12;
      return {
        x: cx + Math.cos(angle) * (r + wobble) * scale,
        y: cy + Math.sin(angle) * (r + wobble) * 0.92 * scale,
      };
    }
    /* Side-Path: vereinfachte quadratische Bezier */
    const bi = Math.floor((index - 160) / 10);
    const j = (index - 160) % 10;
    const bstart = [10, 30, 50, 70, 90, 110, 130, 150][bi] || 10;
    const rejoin = [30, 50, 70, 90, 110, 130, 150, 10][bi] || 30;
    const p0 = tilePosition2D(bstart, total, cx, cy, scale);
    const p1 = tilePosition2D(rejoin, total, cx, cy, scale);
    const t = j / 9;
    const midX = (p0.x + p1.x) / 2;
    const midY = (p0.y + p1.y) / 2;
    const outLen = Math.hypot(midX - cx, midY - cy) || 1;
    const outDirX = (midX - cx) / outLen;
    const outDirY = (midY - cy) / outLen;
    const bulge = 6.0 * scale;
    const mx = midX + outDirX * bulge;
    const my = midY + outDirY * bulge;
    const omt = 1 - t;
    return {
      x: omt * omt * p0.x + 2 * omt * t * mx + t * t * p1.x,
      y: omt * omt * p0.y + 2 * omt * t * my + t * t * p1.y,
    };
  }

  const BIOME_COLORS = {
    village: '#7cb342', desert: '#ffd54f', forest: '#2e7d32',
    mountain: '#90a4ae', swamp: '#6a8e23', ice: '#b3e5fc',
    volcano: '#ff6f00', clouds: '#e1bee7',
  };
  const BIOME_NAMES = ['village', 'desert', 'forest', 'mountain', 'swamp', 'ice', 'volcano', 'clouds'];

  function tileColor2D(tile, owner) {
    if (owner && owner.color) return owner.color;
    if (!tile) return '#90caf9';
    if (tile.type === 'start') return '#ffd54f';
    if (tile.type === 'event') return '#ff8a65';
    if (tile.type === 'starshop') return '#fff176';
    if (tile.type === 'itemshop') return '#81c784';
    if (tile.type === 'lucky') return '#ba68c8';
    if (tile.type === 'bonus') return '#4dd0e1';
    if (tile.type === 'property') return '#90caf9';
    if (tile.type === 'junction') return '#ce93d8';
    return '#90caf9';
  }

  function tileLabel2D(tile) {
    if (!tile) return '?';
    if (tile.type === 'start') return 'S';
    if (tile.type === 'event') return '!';
    if (tile.type === 'starshop') return '\u2605';
    if (tile.type === 'itemshop') return '\u2666';
    if (tile.type === 'lucky') return '?';
    if (tile.type === 'bonus') return '+';
    if (tile.type === 'property') return '\u25A0';
    if (tile.type === 'junction') return '\u21C4';
    return '\u25CF';
  }

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
    c.width = window.innerWidth * dpr;
    c.height = window.innerHeight * dpr;
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

  function drawRoundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  function render() {
    const ctx = state.ctx;
    const c = state.canvas;
    if (!ctx || !c || !state.active) return;
    const dpr = window.devicePixelRatio || 1;
    const w = c.width / dpr;
    const h = c.height / dpr;

    ctx.clearRect(0, 0, w, h);

    /* Dunkler Hintergrund */
    ctx.fillStyle = '#080c1f';
    ctx.fillRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2;
    const scale = Math.min(w, h) / 28;
    const tiles = state.tiles;
    const total = tiles.length || 24;

    /* Biom-Hintergruende */
    for (let seg = 0; seg < 8; seg++) {
      const segAngle = (seg + 0.5) / 8 * Math.PI * 2 - Math.PI / 2;
      const biome = BIOME_NAMES[seg];
      const color = BIOME_COLORS[biome] || '#7cb342';
      const bx = cx + Math.cos(segAngle) * 10 * scale;
      const by = cy + Math.sin(segAngle) * 10 * scale * 0.92;
      const grad = ctx.createRadialGradient(bx, by, 0, bx, by, 4.5 * scale);
      grad.addColorStop(0, color + '33');
      grad.addColorStop(1, color + '05');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(bx, by, 4.5 * scale, 0, Math.PI * 2);
      ctx.fill();
    }

    /* Pfad-Verbindungen */
    ctx.strokeStyle = 'rgba(212,165,116,0.18)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < total; i++) {
      const p1 = tilePosition2D(i, total, cx, cy, scale);
      const nextI = (i + 1) % total;
      const p2 = tilePosition2D(nextI, total, cx, cy, scale);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }

    /* Tiles */
    tiles.forEach((tile, i) => {
      const pos = tilePosition2D(i, total, cx, cy, scale);
      const idx = tile.idx == null ? i : tile.idx;
      const ownerId = state.owners[String(idx)];
      const owner = state.players.find(p => p.id === ownerId);
      const color = tileColor2D(tile, owner);

      /* Tile-Koerper */
      ctx.fillStyle = color;
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.lineWidth = 1;
      drawRoundRect(ctx, pos.x - 13, pos.y - 9, 26, 18, 5);
      ctx.fill();
      ctx.stroke();

      /* Tile-Label */
      ctx.fillStyle = '#ffffffcc';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(tileLabel2D(tile), pos.x, pos.y);

      /* Tile-Nummer */
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = '7px sans-serif';
      ctx.fillText(String(idx), pos.x, pos.y + 12);
    });

    /* Spieler-Chips */
    const posCount = {};
    state.players.forEach(p => {
      const pos = p.position || 0;
      posCount[pos] = (posCount[pos] || 0) + 1;
    });

    const offsets = {}; /* position -> next offset index */
    state.players.forEach(p => {
      const pos = p.position || 0;
      const tilePos = tilePosition2D(pos, total, cx, cy, scale);
      const count = posCount[pos] || 1;
      const idx = offsets[pos] || 0;
      offsets[pos] = idx + 1;

      /* Verteile Spieler um das Tile */
      const angleOffset = count > 1 ? (idx / count) * Math.PI * 2 - Math.PI / 2 : 0;
      const dist = count > 1 ? 16 : 0;
      const px = tilePos.x + Math.cos(angleOffset) * dist;
      const py = tilePos.y - 22 + Math.sin(angleOffset) * dist;

      const isTurn = state.turnPlayerId === p.id;

      /* Glow bei aktivem Spieler */
      if (isTurn) {
        ctx.fillStyle = 'rgba(255,213,79,0.3)';
        ctx.beginPath();
        ctx.arc(px, py, 12, 0, Math.PI * 2);
        ctx.fill();
      }

      /* Chip */
      ctx.fillStyle = p.color || '#7b2ff7';
      ctx.strokeStyle = isTurn ? '#ffd54f' : 'rgba(255,255,255,0.4)';
      ctx.lineWidth = isTurn ? 2.5 : 1.5;
      ctx.beginPath();
      ctx.arc(px, py, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      /* Initialen */
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

  function show() {
    state.active = true;
    if (state.canvas) state.canvas.style.display = 'block';
    render();
  }

  function hide() {
    state.active = false;
    if (state.canvas) state.canvas.style.display = 'none';
  }

  /* Auto-Init */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

  window.Board2D = { setBoardState, show, hide, get active() { return state.active; } };
})();
