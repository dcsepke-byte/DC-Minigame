/* ============================================================
   PARTY ARENA — Host-Bildschirm Logik
   ============================================================ */
(() => {
  'use strict';

  const $ = s => document.querySelector(s);
  const screens = {};
  document.querySelectorAll('.screen').forEach(s => screens[s.dataset.screen] = s);
  function showScreen(name) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    if (screens[name]) screens[name].classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const state = {
    rounds: 5,
    order: 'random',
    mode: 'classic',
    disabledGames: new Set(),
    players: [],
    boardTiles: [],
    boardOwners: {},
    boardLog: '',
    lapsDone: 0,
    lapsTotal: 0,
    boardPanel: 'map',
  };
  const boardAnim = { active: false, playerId: null, pos: 0, to: 0, timer: null };
  const enabledGames = () => Games.list.filter(g => !state.disabledGames.has(g.id));

  function setBoardLogText(text) {
    const value = text || '...';
    const top = $('#board-log');
    if (top) top.textContent = value;
    const panel = $('#board-log-panel');
    if (panel) panel.textContent = value;
  }

  /* ---------- Verbindung ---------- */
  const connStatus = $('#conn-status');
  function setConn(text, cls) {
    if (!connStatus) return;
    connStatus.textContent = text;
    connStatus.className = 'conn-status' + (cls ? ' ' + cls : '');
  }

  if (location.protocol === 'file:') {
    setConn('⚠️ Bitte NICHT die Datei direkt öffnen! Starte den Server (python server.py) und öffne http://localhost:3000/host', 'err');
  } else {
    Net.connect(() => {
      let savedCode = '';
      let savedToken = '';
      try {
        savedCode = (localStorage.getItem('pa_host_code') || '').toUpperCase();
        savedToken = localStorage.getItem('pa_host_token') || '';
      } catch (_) {}
      if (savedCode && savedToken) {
        Net.send({ type: 'host:resume', code: savedCode, hostToken: savedToken });
      } else {
        Net.send({ type: 'host:create' });
      }
    });
  }

  Net.on('created', m => {
    $('#room-code').textContent = m.code;
    $('#join-url').textContent = m.lanUrl;
    const helpUrl = $('#help-url');
    if (helpUrl) helpUrl.textContent = m.lanUrl;
    try {
      localStorage.setItem('pa_host_code', m.code || '');
      if (m.hostToken) localStorage.setItem('pa_host_token', m.hostToken);
    } catch (_) {}
    setConn('✅ Verbunden — Raum bereit!', 'ok');
    setTimeout(() => { if (connStatus) connStatus.style.display = 'none'; }, 2500);
  });

  Net.on('joinError', m => {
    const txt = String(m && m.message || 'Host-Session fehlgeschlagen.').toLowerCase();
    if (txt.includes('wiederhergestellt')) {
      try {
        localStorage.removeItem('pa_host_code');
        localStorage.removeItem('pa_host_token');
      } catch (_) {}
      Net.send({ type: 'host:create' });
      return;
    }
    setConn(`⚠️ ${m.message}`, 'err');
  });

  Net.on('hostDisconnected', m => {
    const sec = m && m.graceSeconds ? m.graceSeconds : 120;
    setConn(`⏳ Host getrennt. Reconnect-Fenster: ${sec}s`, 'err');
    if (connStatus) connStatus.style.display = '';
  });

  const btnHelp = $('#btn-help');
  if (btnHelp) btnHelp.addEventListener('click', () => {
    const panel = $('#help-panel');
    const open = panel.hasAttribute('hidden');
    if (open) { panel.removeAttribute('hidden'); btnHelp.textContent = '🔼 Anleitung schließen'; panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
    else { panel.setAttribute('hidden', ''); btnHelp.textContent = '❓ Wie tritt ein Spieler bei?'; }
    FX.Sound.tap();
  });

  Net.on('lobby', m => {
    state.players = m.players;
    renderPlayers(m);
  });

  Net.on('board:init', m => {
    state.mode = 'board';
    state.players = m.players || [];
    state.boardTiles = m.tiles || [];
    renderBoardGrid();
    renderBoardRanking();
    renderBoardPlayerInfo();
    showScreen('board');
  });

  Net.on('board:update', m => {
    state.mode = 'board';
    state.players = m.players || [];
    state.boardTiles = m.tiles || state.boardTiles;
    state.boardOwners = m.owners || {};
    state.boardLog = m.log || '';
    state.lapsDone = m.lapsDone || 0;
    state.lapsTotal = m.lapsTotal || 0;
    renderBoardGrid();
    renderBoardRanking();
    renderBoardPlayerInfo();
    const lap = $('#board-lap');
    if (lap) lap.textContent = `Runde ${state.lapsDone} / ${state.lapsTotal}`;
    setBoardLogText(state.boardLog);
    showScreen('board');
  });

  Net.on('board:chaos', () => {
    FX.Sound.whoosh();
    FX.burst(window.innerWidth / 2, window.innerHeight * 0.35, 28, 10);
  });

  Net.on('board:rolled', m => {
    if (!m) return;
    animateBoardMove(m.playerId, m.from, m.to);
  });

  Net.on('board:announce', m => {
    state.boardLog = (m && m.text) || state.boardLog;
    setBoardLogText(state.boardLog);
    showScreen('board');
    switchHostBoardPanel('events');
  });

  Net.on('board:duel', m => {
    if (m && m.challengerName && m.ownerName) {
      state.boardLog = `⚔️ Duell: ${m.challengerName} vs ${m.ownerName} (Start in ${m.startsIn || 4}s)`;
      setBoardLogText(state.boardLog);
    }
    FX.Sound.go();
  });

  Net.on('board:duelResult', () => {
    FX.Sound.fanfare();
    FX.celebrate();
  });

  Net.on('board:globalResult', m => {
    if (m && Array.isArray(m.ranking)) {
      const top = m.ranking.slice(0, 3).map((r, i) => `${i + 1}. ${r.name} (${r.score})`).join('  |  ');
      state.boardLog = `📊 Runden-Scoreboard: ${top || 'keine Punkte'}`;
      setBoardLogText(state.boardLog);
    }
    FX.Sound.whoosh();
    switchHostBoardPanel('ranking');
  });

  Net.on('roundIntro', m => {
    if (state.mode === 'board') return;
    $('#round-badge').textContent = `RUNDE ${m.round} / ${m.total}`;
    $('#intro-game-icon').textContent = m.game.icon;
    $('#intro-game-name').textContent = m.game.name;
    $('#intro-game-desc').textContent = m.game.desc;
    $('#intro-rules').innerHTML = m.game.rules;
    FX.Sound.whoosh();
    showScreen('round-intro');
  });

  Net.on('start', m => {
    if (state.mode === 'board') return;
    $('#live-icon').textContent = m.game.icon;
    $('#live-name').textContent = m.game.name;
    renderLive({ players: state.players, scores: {}, finished: [] });
    FX.Sound.go();
    showScreen('playing');
  });

  Net.on('live', m => {
    if (state.mode === 'board') return;
    state.players = m.players;
    renderLive(m);
  });

  Net.on('roundResult', m => {
    if (state.mode === 'board') return;
    $('#round-result-sub').textContent = `Runde ${m.round} / ${m.total} — ${m.game.icon} ${m.game.name}`;
    const rankEl = $('#round-ranking');
    rankEl.innerHTML = '';
    m.ranking.forEach((r, pos) => {
      const row = el('div', 'rank-row' + (r.star ? ' first' : ''));
      row.style.animationDelay = (pos * 0.08) + 's';
      row.innerHTML = `
        <span class="rank-pos">${pos + 1}</span>
        <span class="rank-avatar" style="background:${r.color}">${initials(r.name)}</span>
        <span class="rank-name">${escapeHtml(r.name)}</span>
        <span class="rank-score">${r.score}</span>
        ${r.star ? '<span class="rank-stars">⭐</span>' : ''}`;
      rankEl.appendChild(row);
    });
    const sw = $('#star-winner');
    if (m.winners.length === 1) sw.textContent = `⭐ ${m.winners[0]} holt sich den Stern!`;
    else if (m.winners.length > 1) sw.textContent = `⭐ Gleichstand! ${m.winners.join(' & ')} bekommen einen Stern!`;
    else sw.textContent = 'Diese Runde gab es keine Punkte 😅';
    showScreen('round-result');
    FX.Sound.fanfare();
    FX.celebrate();
  });

  Net.on('standings', m => {
    if (state.mode === 'board') return;
    $('#standings-sub').textContent = `Nach Runde ${m.round} von ${m.total}`;
    const rankEl = $('#standings-ranking');
    rankEl.innerHTML = '';
    m.ranking.forEach((r, pos) => {
      const row = el('div', 'rank-row' + (pos === 0 && r.stars > 0 ? ' first' : ''));
      row.style.animationDelay = (pos * 0.08) + 's';
      row.innerHTML = `
        <span class="rank-pos">${pos + 1}</span>
        <span class="rank-avatar" style="background:${r.color}">${initials(r.name)}</span>
        <span class="rank-name">${escapeHtml(r.name)}</span>
        <span class="rank-stars">${'⭐'.repeat(r.stars) || '–'}</span>
        <span class="rank-score">${r.stars}</span>`;
      rankEl.appendChild(row);
    });
    $('#btn-standings-next').textContent = m.isLast ? '🏆 Zur Siegerehrung' : '➡️ Nächste Runde';
    showScreen('standings');
    FX.Sound.whoosh();
  });

  Net.on('final', m => renderFinal(m.ranking));

  Net.on('hostLeft', () => {});
  Net.on('_close', () => {
    setConn('⚠️ Verbindung getrennt. Läuft der Server noch? Seite neu laden.', 'err');
    if (connStatus) connStatus.style.display = '';
    const lobbyHint = $('#lobby-hint');
    if (lobbyHint) { lobbyHint.textContent = '⚠️ Verbindung verloren. Bitte Server prüfen und Seite neu laden.'; lobbyHint.style.color = '#ff4d6d'; }
  });
  Net.on('_error', () => {
    setConn('❌ Keine Verbindung zum Server möglich. Öffne die Host-Seite über deine veröffentlichte URL (/host) oder lokal über http://localhost:3000/host.', 'err');
    if (connStatus) connStatus.style.display = '';
  });

  /* ---------- Lobby Rendering ---------- */
  function renderPlayers(m) {
    const listEl = $('#player-list');
    listEl.innerHTML = '';
    m.players.forEach(p => {
      const li = el('li', 'player-chip');
      li.innerHTML = `
        <span class="chip-avatar" style="background:${p.color}">${initials(p.name)}</span>
        <span class="chip-name">${escapeHtml(p.name)}</span>
        ${p.connected ? '' : '<span class="chip-offline">offline</span>'}`;
      listEl.appendChild(li);
    });
    $('#player-count').textContent = `(${m.players.length})`;
    const hint = $('#lobby-hint');
    hint.style.color = '';
    if (m.players.length === 0) hint.textContent = 'Warte auf Spieler… (mind. 2 zum Starten)';
    else if (m.players.length < 2) hint.textContent = 'Noch 1 Spieler nötig…';
    else hint.textContent = `${m.players.length} Spieler bereit! 🎉`;
    updateStartButton();
  }

  function updateStartButton() {
    const ok = state.players.length >= 2 && enabledGames().length >= 1;
    $('#btn-start-game').disabled = !ok;
  }

  /* ---------- Live Rangliste ---------- */
  function renderLive(m) {
    const arr = (m.players || []).map(p => ({
      ...p, score: (m.scores && m.scores[p.id]) || 0,
      done: (m.finished || []).includes(p.id),
    })).sort((a, b) => b.score - a.score);
    const rankEl = $('#live-ranking');
    rankEl.innerHTML = '';
    arr.forEach((r, pos) => {
      const row = el('div', 'rank-row' + (pos === 0 && r.score > 0 ? ' first' : ''));
      row.innerHTML = `
        <span class="rank-pos">${pos + 1}</span>
        <span class="rank-avatar" style="background:${r.color}">${initials(r.name)}</span>
        <span class="rank-name">${escapeHtml(r.name)} ${r.done ? '✅' : ''}</span>
        <span class="rank-score">${r.score}</span>`;
      rankEl.appendChild(row);
    });
  }

  /* ---------- Finale ---------- */
  function renderFinal(ranking) {
    const podium = $('#podium');
    podium.innerHTML = '';
    document.querySelectorAll('.final-others').forEach(e => e.remove());
    const order = [1, 0, 2];
    const medals = { 0: 'gold', 1: 'silver', 2: 'bronze' };
    order.forEach(pos => {
      if (pos >= ranking.length) return;
      const r = ranking[pos];
      const col = el('div', 'podium-col');
      col.innerHTML = `
        ${pos === 0 ? '<div class="podium-crown">👑</div>' : ''}
        <div class="podium-avatar" style="background:${r.color}">${initials(r.name)}</div>
        <div class="podium-name">${escapeHtml(r.name)}</div>
        <div class="podium-stars">${'⭐'.repeat(r.stars) || '–'}</div>
        <div class="podium-block ${medals[pos]}" style="animation-delay:${pos * 0.2}s">${pos === 0 ? '🏆' : (pos + 1)}</div>`;
      podium.appendChild(col);
    });
    const winner = ranking[0];
    $('#final-winner-banner').textContent = `🎉 ${winner.name} gewinnt PARTY ARENA! 🎉`;
    if (ranking.length > 3) {
      const rest = el('div', 'ranking final-others');
      ranking.slice(3).forEach((r, idx) => {
        const row = el('div', 'rank-row');
        row.innerHTML = `
          <span class="rank-pos">${idx + 4}</span>
          <span class="rank-avatar" style="background:${r.color}">${initials(r.name)}</span>
          <span class="rank-name">${escapeHtml(r.name)}</span>
          <span class="rank-stars">${'⭐'.repeat(r.stars) || '–'}</span>`;
        rest.appendChild(row);
      });
      podium.after(rest);
    }
    showScreen('final');
    FX.Sound.fanfare();
    FX.celebrate();
    setTimeout(() => FX.celebrate(), 900);
    setTimeout(() => FX.celebrate(), 1800);
  }

  /* ---------- Steuerung ---------- */
  document.querySelectorAll('.step-btn').forEach(b => b.addEventListener('click', () => {
    state.rounds = Math.max(1, Math.min(20, state.rounds + parseInt(b.dataset.dir, 10)));
    $('#rounds-value').textContent = state.rounds; FX.Sound.tap();
  }));
  document.querySelectorAll('.toggle-pills .pill[data-order]').forEach(p => p.addEventListener('click', () => {
    document.querySelectorAll('.toggle-pills .pill[data-order]').forEach(x => x.classList.remove('active'));
    p.classList.add('active'); state.order = p.dataset.order; FX.Sound.tap();
  }));
  document.querySelectorAll('#mode-pills .pill').forEach(p => p.addEventListener('click', () => {
    document.querySelectorAll('#mode-pills .pill').forEach(x => x.classList.remove('active'));
    p.classList.add('active');
    state.mode = p.dataset.mode || 'classic';
    FX.Sound.tap();
  }));
  document.querySelectorAll('#host-board-nav .board-nav-btn').forEach(b => {
    b.addEventListener('click', () => switchHostBoardPanel(b.dataset.panel || 'map'));
  });

  // Spiele-Auswahl
  (function renderGamesPreview() {
    const grid = $('#games-grid');
    Games.list.forEach(g => {
      const t = el('div', 'game-tile');
      t.dataset.id = g.id;
      t.innerHTML = `<span class="gt-badge">✓</span>
        <span class="gt-icon">${g.icon}</span>
        <div class="gt-name">${g.name}</div>
        <div class="gt-desc">${g.desc}</div>`;
      t.addEventListener('click', () => toggleGame(g.id, t));
      grid.appendChild(t);
    });
    updateGamesHint();
  })();

  function toggleGame(id, tile) {
    if (state.disabledGames.has(id)) state.disabledGames.delete(id);
    else state.disabledGames.add(id);
    const off = state.disabledGames.has(id);
    tile.classList.toggle('disabled', off);
    tile.querySelector('.gt-badge').textContent = off ? '✕' : '✓';
    FX.Sound.tap(); updateGamesHint(); updateStartButton();
  }
  function updateGamesHint() {
    const n = enabledGames().length;
    const h = $('#games-hint');
    if (n === 0) { h.textContent = '⚠️ Mindestens 1 Spiel auswählen!'; h.style.color = '#ff4d6d'; }
    else { h.textContent = `${n} von ${Games.list.length} Spielen aktiv`; h.style.color = ''; }
  }

  $('#btn-start-game').addEventListener('click', () => {
    const games = enabledGames().map(g => ({ id: g.id, name: g.name, icon: g.icon, desc: g.desc, rules: g.rules }));
    Net.send({ type: 'host:start', rounds: state.rounds, order: state.order, mode: state.mode, games });
    FX.Sound.whoosh();
    FX.burst(window.innerWidth / 2, window.innerHeight / 2, 40, 12);
  });
  $('#btn-round-begin').addEventListener('click', () => { Net.send({ type: 'host:beginRound' }); FX.Sound.go(); });
  $('#btn-round-next').addEventListener('click', () => { Net.send({ type: 'host:next' }); FX.Sound.click(); });
  $('#btn-standings-next').addEventListener('click', () => { Net.send({ type: 'host:next' }); FX.Sound.click(); });
  $('#btn-play-again').addEventListener('click', () => {
    Net.send({ type: 'host:playAgain' });
    state.mode = 'classic';
    FX.Sound.whoosh();
    showScreen('lobby');
  });

  $('#sound-toggle').addEventListener('click', () => {
    const on = !FX.isSoundEnabled();
    FX.setSoundEnabled(on);
    $('#sound-toggle').textContent = on ? '🔊' : '🔇';
  });
  document.addEventListener('pointerdown', () => FX.setSoundEnabled(FX.isSoundEnabled()), { once: true });

  /* ---------- Helfer ---------- */
  function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function initials(name) {
    const parts = String(name).trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return String(name).trim().slice(0, 2).toUpperCase();
  }

  function renderBoardGrid() {
    const grid = $('#host-board-grid');
    if (!grid) return;
    grid.innerHTML = '';
    const center = el('div', 'board-center', '<span>BOARD</span><span>CHAOS</span>');
    grid.appendChild(center);
    const posMap = {};
    state.players.forEach(p => {
      const isMoving = boardAnim.active && boardAnim.playerId === p.id;
      const pos = isMoving ? boardAnim.pos : (Number.isFinite(p.position) ? p.position : 0);
      (posMap[pos] = posMap[pos] || []).push({ p, isMoving });
    });
    state.boardTiles.forEach(t => {
      let cls = 'board-tile' + (t.type === 'chaos' ? ' chaos' : t.type === 'start' ? ' start' : '');
      if (boardAnim.active && t.idx === boardAnim.pos) cls += ' moving-path';
      if (boardAnim.active && t.idx === boardAnim.to) cls += ' moving-dest';
      const tile = el('div', cls);
      const pos = boardCellPosition(t.idx);
      tile.style.gridRow = String(pos.row);
      tile.style.gridColumn = String(pos.col);
      const ownerId = state.boardOwners[String(t.idx)];
      const owner = ownerId ? state.players.find(p => p.id === ownerId) : null;
      tile.innerHTML = `
        <div class="bt-top">
          <span>${t.icon} ${escapeHtml(t.name)}</span>
          <span>#${t.idx}</span>
        </div>
        <div class="bt-owner">${owner ? `Besitzer: ${escapeHtml(owner.name)}` : 'Frei'}</div>
        <div class="bt-pawns">${(posMap[t.idx] || []).map(x => `<span class="bt-pawn${x.isMoving ? ' moving' : ''}" style="background:${x.p.color}">${x.p.figure || initials(x.p.name)}</span>`).join('')}</div>`;
      grid.appendChild(tile);
    });
  }

  function animateBoardMove(playerId, from, to) {
    if (!playerId || !Number.isFinite(from) || !Number.isFinite(to)) return;
    if (boardAnim.timer) clearTimeout(boardAnim.timer);
    boardAnim.active = true;
    boardAnim.playerId = playerId;
    boardAnim.pos = from;
    boardAnim.to = to;
    const size = Math.max(1, state.boardTiles.length || 16);

    function step() {
      renderBoardGrid();
      if (boardAnim.pos === boardAnim.to) {
        boardAnim.timer = setTimeout(() => {
          boardAnim.active = false;
          renderBoardGrid();
        }, 260);
        return;
      }
      boardAnim.pos = (boardAnim.pos + 1) % size;
      boardAnim.timer = setTimeout(step, 200);
    }

    boardAnim.timer = setTimeout(step, 120);
  }

  function boardCellPosition(idx) {
    const map = [
      [5, 1], [5, 2], [5, 3], [5, 4], [5, 5],
      [4, 5], [3, 5], [2, 5], [1, 5], [1, 4],
      [1, 3], [1, 2], [1, 1], [2, 1], [3, 1], [4, 1],
    ];
    const p = map[Math.max(0, Math.min(map.length - 1, idx))];
    return { row: p[0], col: p[1] };
  }

  function renderBoardRanking() {
    const rank = $('#board-ranking');
    if (!rank) return;
    rank.innerHTML = '';
    const arr = [...state.players].sort((a, b) => (b.stars || 0) - (a.stars || 0));
    arr.forEach((p, i) => {
      const row = el('div', 'rank-row' + (i === 0 ? ' first' : ''));
      row.innerHTML = `
        <span class="rank-pos">${i + 1}</span>
        <span class="rank-avatar" style="background:${p.color}">${p.figure || initials(p.name)}</span>
        <span class="rank-name">${escapeHtml(p.name)} · Feld ${p.position ?? 0}</span>
        <span class="rank-stars">${'⭐'.repeat(p.stars || 0) || '0'}</span>`;
      rank.appendChild(row);
    });
  }

  function renderBoardPlayerInfo() {
    const list = $('#host-board-player-info');
    if (!list) return;
    list.innerHTML = '';
    const arr = [...state.players].sort((a, b) => (b.stars || 0) - (a.stars || 0));
    arr.forEach((p, i) => {
      const row = el('div', 'rank-row' + (i === 0 ? ' first' : ''));
      row.innerHTML = `
        <span class="rank-pos">${i + 1}</span>
        <span class="rank-avatar" style="background:${p.color}">${p.figure || initials(p.name)}</span>
        <span class="rank-name">${escapeHtml(p.name)} · Feld ${p.position ?? 0}</span>
        <span class="rank-stars">⭐ ${p.stars || 0} · 🧮 ${p.totalPoints || 0}</span>`;
      list.appendChild(row);
    });
  }

  function switchHostBoardPanel(panel) {
    state.boardPanel = panel;
    document.querySelectorAll('#host-board-nav .board-nav-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.panel === panel);
    });
    document.querySelectorAll('.screen[data-screen="board"] .board-panel').forEach(p => {
      p.classList.toggle('active', p.dataset.panel === panel);
    });
  }
})();
