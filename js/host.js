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
    disabledGames: new Set(),
    players: [],
  };
  const enabledGames = () => Games.list.filter(g => !state.disabledGames.has(g.id));

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
    Net.connect(() => Net.send({ type: 'host:create' }));
  }

  Net.on('created', m => {
    $('#room-code').textContent = m.code;
    $('#join-url').textContent = m.lanUrl;
    const helpUrl = $('#help-url');
    if (helpUrl) helpUrl.textContent = m.lanUrl;
    setConn('✅ Verbunden — Raum bereit!', 'ok');
    setTimeout(() => { if (connStatus) connStatus.style.display = 'none'; }, 2500);
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

  Net.on('roundIntro', m => {
    $('#round-badge').textContent = `RUNDE ${m.round} / ${m.total}`;
    $('#intro-game-icon').textContent = m.game.icon;
    $('#intro-game-name').textContent = m.game.name;
    $('#intro-game-desc').textContent = m.game.desc;
    $('#intro-rules').innerHTML = m.game.rules;
    FX.Sound.whoosh();
    showScreen('round-intro');
  });

  Net.on('start', m => {
    $('#live-icon').textContent = m.game.icon;
    $('#live-name').textContent = m.game.name;
    renderLive({ players: state.players, scores: {}, finished: [] });
    FX.Sound.go();
    showScreen('playing');
  });

  Net.on('live', m => { state.players = m.players; renderLive(m); });

  Net.on('roundResult', m => {
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
  document.querySelectorAll('.toggle-pills .pill').forEach(p => p.addEventListener('click', () => {
    document.querySelectorAll('.toggle-pills .pill').forEach(x => x.classList.remove('active'));
    p.classList.add('active'); state.order = p.dataset.order; FX.Sound.tap();
  }));

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
    Net.send({ type: 'host:start', rounds: state.rounds, order: state.order, games });
    FX.Sound.whoosh();
    FX.burst(window.innerWidth / 2, window.innerHeight / 2, 40, 12);
  });
  $('#btn-round-begin').addEventListener('click', () => { Net.send({ type: 'host:beginRound' }); FX.Sound.go(); });
  $('#btn-round-next').addEventListener('click', () => { Net.send({ type: 'host:next' }); FX.Sound.click(); });
  $('#btn-standings-next').addEventListener('click', () => { Net.send({ type: 'host:next' }); FX.Sound.click(); });
  $('#btn-play-again').addEventListener('click', () => { Net.send({ type: 'host:playAgain' }); FX.Sound.whoosh(); showScreen('lobby'); });

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
})();
