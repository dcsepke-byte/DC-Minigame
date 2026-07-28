/* ============================================================
   PARTY ARENA — Shared Board-HUD helpers
   Genutzt von host.js und player.js
   ============================================================ */
(() => {
  'use strict';

  function $(s) { return document.querySelector(s); }

  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function initials(name) {
    const parts = String(name).trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return String(name).trim().slice(0, 2).toUpperCase();
  }

  /* ---------- Toast ---------- */
  function pushBoardToast(text, kind = '', containerId = 'board-toasts') {
    const host = $('#' + containerId);
    if (!host) return;
    const t = el('div', 'hud-toast' + (kind ? ' ' + kind : ''), text);
    host.appendChild(t);
    while (host.children.length > 3) host.removeChild(host.firstElementChild);
    const lifespan = kind === 'win' ? 4200 : 3200;
    setTimeout(() => {
      t.classList.add('fading');
      setTimeout(() => { if (t.parentNode) t.parentNode.removeChild(t); }, 420);
    }, lifespan);
  }

  /* ---------- Spieler-Pillbar ---------- */
  function renderBoardPills(ctx) {
    const wrap = $('#' + (ctx.containerId || 'board-pills'));
    if (!wrap) return;
    wrap.innerHTML = '';
    const arr = ctx.players || [];
    const phase = ctx.phase || 'turn';
    const turnPlayerId = ctx.turnPlayerId || null;
    const pendingPlayerId = ctx.pendingPlayerId || null;
    const myId = ctx.myId;
    arr.forEach(p => {
      const isTurn = (phase === 'turn' && turnPlayerId === p.id)
        || (phase === 'decision' && pendingPlayerId === p.id);
      const isYou = myId != null ? p.id === myId : !!p.isYou;
      const pill = el('div', 'hud-pill' + (isTurn ? ' active' : '') + (isYou ? ' you' : ''));
      pill.setAttribute('role', 'listitem');
      pill.innerHTML = `
        <span class="hud-pill-avatar" style="background:${p.color || 'linear-gradient(135deg,#7b2ff7,#00f0ff)'}">${p.figure || initials(p.name)}</span>
        <span class="hud-pill-name">${escapeHtml(p.name)}</span>
        <span class="hud-pill-stats">⭐${p.stars || 0} · 🪙${p.coins || 0}</span>`;
      wrap.appendChild(pill);
    });
  }

  /* ---------- Slide-In Panels ---------- */
  function setupBoardSlides(containerId) {
    const menu = $('#' + (containerId || 'board-menu'));
    const scorePanelId = containerId === 'host-board-menu' ? 'host-slide-score' : 'player-slide-score';
    const profilePanelId = containerId === 'host-board-menu' ? 'host-slide-profile' : 'player-slide-profile';
    let toggleState = 0;
    function open(id) {
      const p = $('#' + id);
      if (!p) return;
      p.hidden = false;
      p.classList.remove('closing');
    }
    function close(id) {
      const p = $('#' + id);
      if (!p) return;
      p.classList.add('closing');
      setTimeout(() => { p.hidden = true; p.classList.remove('closing'); }, 220);
    }
    if (menu) {
      menu.addEventListener('click', () => {
        if (toggleState === 0) { open(scorePanelId); close(profilePanelId); toggleState = 1; }
        else if (toggleState === 1) { close(scorePanelId); open(profilePanelId); toggleState = 2; }
        else { close(profilePanelId); toggleState = 0; }
      });
    }
    document.querySelectorAll('[data-close]').forEach(btn => {
      btn.addEventListener('click', () => {
        close(btn.getAttribute('data-close'));
        toggleState = 0;
      });
    });
  }

  /* ---------- Turn Notice ---------- */
  let turnNoticeEl = null;
  function ensureTurnNotice() {
    if (turnNoticeEl && document.body.contains(turnNoticeEl)) return turnNoticeEl;
    turnNoticeEl = el('div', 'turn-notice');
    turnNoticeEl.hidden = true;
    document.body.appendChild(turnNoticeEl);
    return turnNoticeEl;
  }

  function hideTurnNotice() {
    const wrap = ensureTurnNotice();
    wrap.hidden = true;
    wrap.innerHTML = '';
  }

  function showTurnNotice(text, actions = []) {
    const wrap = ensureTurnNotice();
    wrap.innerHTML = '';
    const card = el('div', 'turn-notice-card');
    const msg = el('div', 'turn-notice-text', escapeHtml(text || 'Du bist dran.'));
    const btns = el('div', 'turn-notice-buttons');
    actions.forEach(cfg => {
      const klass = cfg.kind === 'ghost' ? 'btn btn-ghost' : 'btn btn-primary';
      const b = el('button', klass, cfg.label || 'OK');
      b.type = 'button';
      b.addEventListener('click', () => {
        if (typeof cfg.action === 'function') cfg.action();
        hideTurnNotice();
      });
      btns.appendChild(b);
    });
    card.appendChild(msg);
    card.appendChild(btns);
    wrap.appendChild(card);
    wrap.hidden = false;
  }

  /* ---------- Ranking ---------- */
  function renderBoardRanking(ctx) {
    const rank = $('#' + (ctx.containerId || 'board-ranking'));
    if (!rank) return;
    rank.innerHTML = '';
    const players = ctx.players || [];
    const withPosition = ctx.withPosition !== false;
    const withTotalPoints = ctx.withTotalPoints === true;
    const figureFallback = ctx.figureFallback || '🙂';
    const arr = [...players].sort((a, b) => (b.stars || 0) - (a.stars || 0));
    arr.forEach((p, i) => {
      const row = el('div', 'rank-row' + (i === 0 ? ' first' : ''));
      const posText = withPosition ? ` · Feld ${p.position ?? 0}` : '';
      const totalText = withTotalPoints ? ` · 🧮 ${p.totalPoints || 0}` : '';
      row.innerHTML = `
        <span class="rank-pos">${i + 1}</span>
        <span class="rank-avatar" style="background:${p.color}">${p.figure || figureFallback}</span>
        <span class="rank-name">${escapeHtml(p.name)}${posText}</span>
        <span class="rank-stars">⭐ ${p.stars || 0} · 🪙${p.coins || 0}${totalText}</span>`;
      rank.appendChild(row);
    });
  }

  /* ---------- Profil-Karte ---------- */
  function renderProfileCard(ctx) {
    const list = $('#' + (ctx.containerId || 'board-profile'));
    if (!list) return;
    list.innerHTML = '';
    const me = ctx.player;
    if (!me) {
      list.innerHTML = '<div class="rank-row"><span class="rank-name">' + (ctx.emptyText || 'Noch keine Daten vorhanden') + '</span></div>';
      return;
    }
    const row = el('div', 'rank-row first');
    row.innerHTML = `
      <span class="rank-avatar" style="background:${me.color}">${me.figure || '🙂'}</span>
      <span class="rank-name">${escapeHtml(me.name)} · Feld ${me.position ?? 0}</span>
      <span class="rank-stars">⭐ ${me.stars || 0} · 🪙 ${me.coins || 0} · 🧮 ${me.totalPoints || 0}</span>`;
    list.appendChild(row);
  }

  /* ---------- Stats ---------- */
  function updateBoardStats(ctx) {
    const me = ctx.player;
    const avatar = $('#' + (ctx.avatarId || 'board-avatar'));
    const name = $('#' + (ctx.nameId || 'board-name'));
    const stats = $('#' + (ctx.statsId || 'board-me-stats'));
    const defaultFigure = ctx.defaultFigure || '🙂';
    const defaultName = ctx.defaultName || 'Spieler';
    if (me) {
      if (avatar) { avatar.textContent = me.figure || defaultFigure; avatar.style.background = me.color || '#ffd34e'; }
      if (name) name.textContent = me.name || defaultName;
      if (stats) stats.textContent = `⭐ ${me.stars || 0} · 🪙 ${me.coins || 0} · 🧮 ${me.totalPoints || 0} Punkte`;
    } else {
      if (avatar) { avatar.textContent = defaultFigure; avatar.style.background = '#ffd34e'; }
      if (name) name.textContent = defaultName;
      if (stats) stats.textContent = '⭐ 0 · 🪙 0 · 🧮 0 Punkte';
    }
  }

  /* ---------- Timeline ---------- */
  function renderBoardTimeline(ctx) {
    const list = $('#' + (ctx.containerId || 'board-timeline'));
    if (!list) return;
    const items = (ctx.history || []).slice(ctx.limit || -16).reverse();
    if (!items.length) {
      list.innerHTML = '<div class="board-timeline-item">Noch keine Ereignisse.</div>';
      return;
    }
    list.innerHTML = '';
    items.forEach(msg => {
      const row = el('div', 'board-timeline-item', escapeHtml(msg));
      list.appendChild(row);
    });
  }

  window.PartyArenaShared = {
    $,
    el,
    escapeHtml,
    initials,
    pushBoardToast,
    renderBoardPills,
    setupBoardSlides,
    ensureTurnNotice,
    hideTurnNotice,
    showTurnNotice,
    renderBoardRanking,
    renderProfileCard,
    updateBoardStats,
    renderBoardTimeline,
  };
})();
