/* ============================================================
   PARTY ARENA — Spieler-Logik (Handy)
   Nutzt die bestehenden Mini-Spiele aus games.js
   ============================================================ */
(() => {
  'use strict';

  const $ = s => document.querySelector(s);
  const FIGURES = ['🚀', '🐱', '🦊', '🐸', '🐼', '🦄', '🤖', '🐙'];
  const screens = {};
  document.querySelectorAll('.screen').forEach(s => screens[s.dataset.screen] = s);
  function showScreen(name) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    if (screens[name]) screens[name].classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const me = { id: null, name: '', color: '#ff3cac', figure: '🚀' };
  const board = {
    tiles: [], owners: {}, players: [], lapsDone: 0, lapsTotal: 0, log: '',
    phase: 'turn', turnPlayerId: null, pendingPlayerId: null,
    panel: 'map',
    badges: { action: 0, ranking: 0, profile: 0, map: 0 },
  };
  const boardAnim = { active: false, playerId: null, pos: 0, to: 0, timer: null };
  let boardModeActive = false;
  const hudScore = $('#hud-score');
  let lastScoreSent = 0, scoreThrottle = 0;
  let autoJoinTried = false;

  /* ---------- Code aus URL vorbefüllen ---------- */
  const params = new URLSearchParams(location.search);
  const codeFromUrl = (params.get('code') || '').toUpperCase();
  if (codeFromUrl) $('#code-input').value = codeFromUrl;
  // gespeicherten Namen vorbefüllen
  try {
    const savedName = localStorage.getItem('pa_name');
    if (savedName) $('#name-input').value = savedName;
  } catch (_) {}
  try {
    const savedFigure = localStorage.getItem('pa_figure');
    if (savedFigure) me.figure = savedFigure;
  } catch (_) {}
  renderFigurePicker();

  /* ---------- Verbindung ---------- */
  if (location.protocol === 'file:') {
    showJoinError('⚠️ Bitte die Adresse vom Host-Bildschirm im Browser öffnen (z.B. http://192.168.…:3000/), nicht die Datei direkt.');
  } else {
    Net.connect(() => tryAutoJoin());
  }

  $('#btn-join').addEventListener('click', doJoin);
  $('#code-input').addEventListener('keydown', e => { if (e.key === 'Enter') doJoin(); });
  $('#name-input').addEventListener('keydown', e => { if (e.key === 'Enter') $('#code-input').focus(); });

  function doJoin() {
    const name = $('#name-input').value.trim();
    const code = $('#code-input').value.trim().toUpperCase();
    if (!name) return showJoinError('Bitte einen Namen eingeben.');
    if (code.length !== 4) return showJoinError('Bitte den 4-stelligen Raum-Code eingeben.');
    try { localStorage.setItem('pa_name', name); } catch (_) {}
    try { localStorage.setItem('pa_figure', me.figure); } catch (_) {}
    try { localStorage.setItem('pa_last_code', code); } catch (_) {}
    let pid = null;
    try { pid = localStorage.getItem('pa_pid_' + code); } catch (_) {}
    Net.send({ type: 'player:join', name, code, playerId: pid, figure: me.figure });
    FX.Sound.click();
  }
  function showJoinError(msg) {
    const e = $('#join-error');
    e.textContent = '⚠️ ' + msg; e.style.color = '#ff4d6d';
    FX.Sound.bad();
  }

  Net.on('joinError', m => showJoinError(m.message));

  Net.on('joined', m => {
    me.id = m.playerId; me.name = m.name; me.color = m.color;
    me.figure = m.figure || me.figure;
    try { localStorage.setItem('pa_pid_' + m.code, m.playerId); } catch (_) {}
    try { localStorage.setItem('pa_last_code', m.code); } catch (_) {}
    $('#lobby-avatar').textContent = initials(me.name);
    $('#lobby-avatar').style.background = me.color;
    $('#lobby-name').textContent = me.name;
    $('#lobby-code').textContent = m.code;
    $('#hud-avatar').textContent = initials(me.name);
    $('#hud-avatar').style.background = me.color;
    $('#hud-name').textContent = me.name;
    const bAvatar = $('#board-avatar');
    if (bAvatar) { bAvatar.textContent = me.figure; bAvatar.style.background = me.color; }
    const bName = $('#board-name');
    if (bName) bName.textContent = me.name;
    if (m.state === 'lobby') showScreen('lobby');
    FX.Sound.star();
    FX.burst(window.innerWidth / 2, window.innerHeight * 0.4, 26, 10);
  });

  Net.on('lobby', m => {
    const n = m.players.length;
    $('#lobby-players').textContent = n >= 2
      ? `${n} Spieler im Raum — warte auf den Start…`
      : 'Warte auf weitere Spieler…';
    if (isActive('play') || isActive('round-intro') || isActive('waiting')) return;
    showScreen('lobby');
  });

  Net.on('roundIntro', m => {
    $('#p-round-badge').textContent = `RUNDE ${m.round} / ${m.total}`;
    $('#p-intro-icon').textContent = m.game.icon;
    $('#p-intro-name').textContent = m.game.name;
    $('#p-intro-rules').innerHTML = m.game.rules;
    FX.Sound.whoosh();
    showScreen('round-intro');
  });

  Net.on('start', m => startPlay(m.game));

  Net.on('board:init', m => {
    boardModeActive = true;
    board.tiles = m.tiles || [];
    board.players = m.players || [];
    updateMyBoardStats();
    renderBoardGrid();
    renderBoardRanking();
    renderProfileCard();
    showScreen('board');
  });

  Net.on('board:update', m => {
    boardModeActive = true;
    board.tiles = m.tiles || board.tiles;
    board.owners = m.owners || {};
    board.players = m.players || [];
    board.phase = m.phase || board.phase;
    board.turnPlayerId = m.turnPlayerId || null;
    board.pendingPlayerId = m.pendingPlayerId || null;
    board.lapsDone = m.lapsDone || 0;
    board.lapsTotal = m.lapsTotal || 0;
    board.log = m.log || '';
    updateMyBoardStats();
    renderBoardRanking();
    renderProfileCard();
    const lap = $('#board-lap');
    if (lap) lap.textContent = `Runde ${board.lapsDone} / ${board.lapsTotal}`;
    const status = $('#board-status');
    if (status) status.textContent = board.log || 'Warte auf deinen Zug…';
    const myActionable =
      (board.phase === 'turn' && board.turnPlayerId === me.id) ||
      (board.phase === 'decision' && board.pendingPlayerId === me.id);
    if (!myActionable) {
      showBoardPrompt('Warte auf deinen Zug…');
    }
    renderBoardGrid();
    const keepGameScreen =
      boardModeActive &&
      (board.phase === 'global' || board.phase === 'duel' || board.phase === 'globalIntro' || board.phase === 'duelIntro') &&
      (isActive('play') || isActive('round-intro') || isActive('waiting'));
    if (!keepGameScreen) showScreen('board');
  });

  Net.on('board:yourTurn', m => {
    showScreen('board');
    setPlayerBoardBadge('action', 0);
    switchPlayerBoardPanel('action');
    if (m.action === 'roll') {
      showBoardPrompt(m.message || 'Du bist dran! Würfeln?', [
        { label: '🎲 Würfeln', action: () => Net.send({ type: 'board:roll' }) },
      ]);
      FX.Sound.go();
    }
  });

  Net.on('board:decision', m => {
    showScreen('board');
    setPlayerBoardBadge('action', 0);
    switchPlayerBoardPanel('action');
    if (m.kind === 'buy') {
      showBoardPrompt(m.message || 'Feld kaufen?', [
        { label: '⭐ Kaufen (1)', action: () => Net.send({ type: 'board:decision', action: 'buy' }) },
        { label: 'Weiterziehen', action: () => Net.send({ type: 'board:decision', action: 'skip' }) },
      ]);
    } else if (m.kind === 'rentOrDuel') {
      showBoardPrompt(m.message || 'Zahlen oder Duell?', [
        { label: '⭐ Zahlen (1)', action: () => Net.send({ type: 'board:decision', action: 'rent' }) },
        { label: '⚔️ Duell', action: () => Net.send({ type: 'board:decision', action: 'duel' }) },
      ]);
    }
  });

  Net.on('board:chaos', m => {
    const status = $('#board-status');
    if (status) status.textContent = m.text || 'Chaos ausgelöst!';
    FX.Sound.whoosh();
  });

  Net.on('board:rolled', m => {
    if (!m) return;
    animateBoardMove(m.playerId, m.from, m.to);
  });

  Net.on('board:announce', m => {
    const status = $('#board-status');
    if (status) status.textContent = m.text || 'Neue Phase startet…';
    showBoardPrompt(m.text || 'Neue Phase startet…');
  });

  Net.on('board:duel', m => {
    const meInDuel = me.id && (me.id === m.challenger || me.id === m.owner);
    if (meInDuel) {
      showBoardPrompt(`⚔️ Duell gegen ${me.id === m.challenger ? m.ownerName : m.challengerName}. Start in ${m.startsIn || 4}s…`);
    } else {
      showBoardPrompt(`👀 Zuschauer: ${m.challengerName} vs ${m.ownerName}. Start in ${m.startsIn || 4}s…`);
    }
    showScreen('board');
  });

  Net.on('board:duelLive', m => {
    const cs = (m.scores && m.scores[m.challenger]) || 0;
    const os = (m.scores && m.scores[m.owner]) || 0;
    const status = $('#board-status');
    if (status) status.textContent = `⚔️ Duell live: ${cs} : ${os}`;
  });

  Net.on('board:globalResult', m => {
    if (!m || !Array.isArray(m.ranking)) return;
    const top = m.ranking.slice(0, 3).map((r, i) => `${i + 1}. ${r.name} (${r.score})`).join('  |  ');
    showBoardPrompt(`📊 Runden-Scoreboard: ${top || 'keine Punkte'}`);
    const status = $('#board-status');
    if (status) status.textContent = `📊 Runden-Scoreboard: ${top || 'keine Punkte'}`;
    bumpPlayerBoardBadge('ranking');
    showScreen('board');
    switchPlayerBoardPanel('ranking');
  });

  Net.on('board:duelResult', () => {
    const actions = $('#board-actions');
    if (actions) actions.innerHTML = '';
    showBoardPrompt('Duell beendet. Weiter geht es mit dem nächsten Zug.');
    FX.Sound.whoosh();
  });

  Net.on('waiting', m => {
    $('#wait-avatar').textContent = initials(me.name);
    $('#wait-avatar').style.background = me.color;
    showScreen('waiting');
    animateNumber($('#wait-score'), 0, m.yourScore, 800);
  });

  Net.on('roundResult', m => {
    const idx = m.ranking.findIndex(r => r.id === me.id);
    const r = idx >= 0 ? m.ranking[idx] : null;
    $('#result-avatar').textContent = initials(me.name);
    $('#result-avatar').style.background = me.color;
    $('#result-name').textContent = me.name;
    if (r) {
      $('#result-headline').textContent = `Platz ${idx + 1} von ${m.ranking.length}`;
      $('#result-detail').textContent = `erzielt ${r.score} Punkte`;
      if (r.star) {
        $('#result-star').textContent = '⭐ Rundensieg! Du bekommst einen Stern!';
        FX.Sound.fanfare(); FX.celebrate();
      } else {
        $('#result-star').textContent = '';
        FX.Sound.whoosh();
      }
    }
    showScreen('result');
  });

  Net.on('standings', m => {
    const idx = m.ranking.findIndex(r => r.id === me.id);
    const r = idx >= 0 ? m.ranking[idx] : null;
    $('#p-standings-sub').textContent = `Nach Runde ${m.round} von ${m.total}`;
    $('#p-standings-place').textContent = `#${idx + 1}`;
    $('#p-standings-stars').textContent = r ? `${'⭐'.repeat(r.stars) || '0'} Sterne` : '';
    showScreen('standings');
    FX.Sound.whoosh();
  });

  Net.on('final', m => {
    boardModeActive = false;
    const idx = m.ranking.findIndex(r => r.id === me.id);
    const r = idx >= 0 ? m.ranking[idx] : null;
    $('#p-final-avatar').textContent = initials(me.name);
    $('#p-final-avatar').style.background = me.color;
    $('#p-final-place').textContent = `#${idx + 1}`;
    if (idx === 0) {
      $('#p-final-title').textContent = '🏆 GEWONNEN! 🏆';
      $('#p-final-banner').textContent = `Du bist der Champion!`;
      FX.Sound.fanfare(); FX.celebrate();
      setTimeout(() => FX.celebrate(), 900);
    } else {
      $('#p-final-title').textContent = '🎉 Vorbei!';
      $('#p-final-banner').textContent = r ? `${'⭐'.repeat(r.stars) || '0'} Sterne` : '';
      FX.Sound.whoosh();
    }
    showScreen('final');
  });

  Net.on('hostLeft', () => {
    boardModeActive = false;
    showScreen('join');
    showJoinError('Der Host hat das Spiel beendet.');
  });
  Net.on('hostDisconnected', m => {
    const sec = m && m.graceSeconds ? m.graceSeconds : 120;
    showJoinError(`Host kurz getrennt. Bitte warten (${sec}s Reconnect-Fenster).`);
  });
  Net.on('_close', () => {
    if (!isActive('join')) showJoinError('Verbindung verloren — bitte neu beitreten.');
    showScreen('join');
  });
  Net.on('_error', () => {
    showJoinError('❌ Keine Verbindung. Bist du im selben WLAN? Öffne die Adresse vom Host-Bildschirm.');
  });

  /* ============================================================
     MINI-SPIEL ABSPIELEN (lokal, mit Countdown)
     ============================================================ */
  function startPlay(gameMeta) {
    const game = Games.list.find(g => g.id === gameMeta.id);
    $('#hud-game').textContent = `${gameMeta.icon} ${gameMeta.name}`;
    hudScore.textContent = '0';
    lastScoreSent = 0;
    const stage = $('#game-stage');
    stage.innerHTML = '';
    showScreen('play');

    if (!game) { finishGame(0); return; }

    // Countdown 3-2-1-GO
    let n = 3;
    const cd = el('div', 'stage-center');
    cd.innerHTML = `<div class="countdown-num">${n}</div>`;
    stage.appendChild(cd);
    FX.Sound.countdown();
    const cdTimer = setInterval(() => {
      n--;
      if (n > 0) { cd.innerHTML = `<div class="countdown-num">${n}</div>`; FX.Sound.countdown(); }
      else {
        clearInterval(cdTimer);
        cd.innerHTML = `<div class="countdown-num" style="color:var(--good)">GO!</div>`;
        FX.Sound.go();
        setTimeout(() => { stage.innerHTML = ''; launchGame(game, stage); }, 600);
      }
    }, 800);
  }

  function launchGame(game, stage) {
    const api = createGameApi(stage, score => finishGame(score));
    try { game.play(stage, api); }
    catch (err) { console.error('Spiel-Fehler:', err); finishGame(0); }
  }

  function createGameApi(stage, onFinish) {
    const timeouts = [], intervals = [], loops = [];
    let finished = false;
    function cleanup() {
      timeouts.forEach(clearTimeout);
      intervals.forEach(clearInterval);
      loops.forEach(l => l.alive = false);
    }
    return {
      stage,
      setScore(v) {
        hudScore.textContent = v;
        const now = performance.now();
        if (now - scoreThrottle > 250 || v - lastScoreSent >= 20) {
          scoreThrottle = now; lastScoreSent = v;
          Net.send({ type: 'player:score', score: Math.max(0, Math.round(v)) });
        }
      },
      finish(score) {
        if (finished) return;
        finished = true; cleanup();
        onFinish(Math.max(0, Math.round(score)));
      },
      timeout(fn, ms) { const id = setTimeout(fn, ms); timeouts.push(id); return id; },
      interval(fn, ms) { const id = setInterval(fn, ms); intervals.push(id); return id; },
      frameLoop(fn) {
        const st = { alive: true }; loops.push(st);
        function step() { if (!st.alive) return; if (fn() === false) { st.alive = false; return; } requestAnimationFrame(step); }
        requestAnimationFrame(step);
      },
    };
  }

  function finishGame(score) {
    Net.send({ type: 'player:finished', score: Math.max(0, Math.round(score)) });
  }

  /* ---------- Sound ---------- */
  $('#sound-toggle').addEventListener('click', () => {
    const on = !FX.isSoundEnabled();
    FX.setSoundEnabled(on);
    $('#sound-toggle').textContent = on ? '🔊' : '🔇';
  });
  const fsBtn = $('#fullscreen-toggle');
  if (fsBtn) {
    const root = document.documentElement;
    const canFs = !!(document.fullscreenEnabled || root.requestFullscreen || root.webkitRequestFullscreen);
    if (!canFs) {
      fsBtn.style.display = 'none';
    } else {
      const updateFsBtn = () => {
        const active = !!document.fullscreenElement;
        fsBtn.textContent = active ? '🗗' : '⛶';
        fsBtn.title = active ? 'Vollbild beenden' : 'Vollbild';
      };
      fsBtn.addEventListener('click', async () => {
        try {
          if (document.fullscreenElement) {
            if (document.exitFullscreen) await document.exitFullscreen();
          } else if (root.requestFullscreen) {
            await root.requestFullscreen();
          }
        } catch (_) {}
        updateFsBtn();
      });
      document.addEventListener('fullscreenchange', updateFsBtn);
      updateFsBtn();
    }
  }
  document.addEventListener('keydown', async (e) => {
    if (e.key.toLowerCase() !== 'f' || e.repeat) return;
    const tag = (document.activeElement && document.activeElement.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea') return;
    const root = document.documentElement;
    try {
      if (document.fullscreenElement) {
        if (document.exitFullscreen) await document.exitFullscreen();
      } else if (root.requestFullscreen) {
        await root.requestFullscreen();
      }
    } catch (_) {}
  });
  document.addEventListener('pointerdown', () => FX.setSoundEnabled(FX.isSoundEnabled()), { once: true });
  document.querySelectorAll('#player-board-nav .board-nav-btn').forEach(b => {
    b.addEventListener('click', () => switchPlayerBoardPanel(b.dataset.panel || 'map'));
  });

  /* ---------- Helfer ---------- */
  function isActive(name) { return screens[name] && screens[name].classList.contains('active'); }
  function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function initials(name) {
    const parts = String(name).trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return String(name).trim().slice(0, 2).toUpperCase();
  }
  function animateNumber(elm, from, to, dur) {
    const start = performance.now();
    function step(now) {
      const t = Math.min(1, (now - start) / dur);
      elm.textContent = Math.round(from + (to - from) * (1 - Math.pow(1 - t, 3)));
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function renderFigurePicker() {
    const picker = $('#figure-picker');
    if (!picker) return;
    picker.innerHTML = '';
    FIGURES.forEach(f => {
      const b = el('button', 'figure-pill' + (me.figure === f ? ' active' : ''), f);
      b.type = 'button';
      b.addEventListener('click', () => {
        me.figure = f;
        renderFigurePicker();
        FX.Sound.tap();
      });
      picker.appendChild(b);
    });
  }

  function tryAutoJoin() {
    if (autoJoinTried) return;
    autoJoinTried = true;
    let code = '';
    let name = '';
    let pid = '';
    try {
      code = (($('#code-input') && $('#code-input').value) || localStorage.getItem('pa_last_code') || '').trim().toUpperCase();
      name = (($('#name-input') && $('#name-input').value) || localStorage.getItem('pa_name') || '').trim();
      pid = localStorage.getItem('pa_pid_' + code) || '';
    } catch (_) {}
    if (code.length !== 4 || !name || !pid) return;
    Net.send({ type: 'player:join', name, code, playerId: pid, figure: me.figure });
  }

  function showBoardPrompt(text, actions = []) {
    const prompt = $('#board-prompt');
    const panel = $('#board-actions');
    if (prompt) prompt.textContent = text || 'Warte auf deinen Zug…';
    if (!panel) return;
    panel.innerHTML = '';
    if (actions.length > 0 && board.panel !== 'action') bumpPlayerBoardBadge('action');
    actions.forEach(a => {
      const b = el('button', 'btn btn-primary', a.label);
      b.type = 'button';
      b.addEventListener('click', a.action);
      panel.appendChild(b);
    });
  }

  function renderBoardGrid() {
    const grid = $('#player-board-grid');
    if (!grid) return;
    grid.innerHTML = '';
    const center = el('div', 'board-center', '<span>PARTY</span><span>ARENA</span>');
    grid.appendChild(center);
    const posMap = {};
    (board.players || []).forEach(p => {
      const isMoving = boardAnim.active && boardAnim.playerId === p.id;
      const pos = isMoving ? boardAnim.pos : (Number.isFinite(p.position) ? p.position : 0);
      (posMap[pos] = posMap[pos] || []).push({ p, isMoving });
    });
    (board.tiles || []).forEach(t => {
      let cls = 'board-tile' + (t.type === 'chaos' ? ' chaos' : t.type === 'start' ? ' start' : '');
      if (boardAnim.active && t.idx === boardAnim.pos) cls += ' moving-path';
      if (boardAnim.active && t.idx === boardAnim.to) cls += ' moving-dest';
      const tile = el('div', cls);
      const pos = boardCellPosition(t.idx);
      tile.style.gridRow = String(pos.row);
      tile.style.gridColumn = String(pos.col);
      const ownerId = (board.owners || {})[String(t.idx)];
      const owner = (board.players || []).find(p => p.id === ownerId);
      tile.innerHTML = `
        <div class="bt-top"><span>${t.icon}</span><span>#${t.idx}</span></div>
        <div class="bt-owner">${owner ? `👑 ${escapeHtml(owner.name)}` : 'Frei'}</div>
        <div class="bt-pawns">${(posMap[t.idx] || []).map(x => `<span class="bt-pawn${x.isMoving ? ' moving' : ''}" style="background:${x.p.color}">${x.p.figure || '🙂'}</span>`).join('')}</div>`;
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
    const size = Math.max(1, (board.tiles || []).length || 16);

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

  function updateMyBoardStats() {
    const mine = (board.players || []).find(p => p.id === me.id);
    const elStats = $('#board-me-stats');
    if (!elStats) return;
    if (!mine) {
      elStats.textContent = '⭐ 0 · 🧮 0 Punkte';
      return;
    }
    elStats.textContent = `⭐ ${mine.stars || 0} · 🧮 ${mine.totalPoints || 0} Punkte`;
  }

  function renderBoardRanking() {
    const rank = $('#player-board-ranking');
    if (!rank) return;
    rank.innerHTML = '';
    const arr = [...(board.players || [])].sort((a, b) => (b.stars || 0) - (a.stars || 0));
    arr.forEach((p, i) => {
      const row = el('div', 'rank-row' + (i === 0 ? ' first' : ''));
      row.innerHTML = `
        <span class="rank-pos">${i + 1}</span>
        <span class="rank-avatar" style="background:${p.color}">${p.figure || '🙂'}</span>
        <span class="rank-name">${escapeHtml(p.name)} · Feld ${p.position ?? 0}</span>
        <span class="rank-stars">⭐ ${p.stars || 0}</span>`;
      rank.appendChild(row);
    });
  }

  function renderProfileCard() {
    const card = $('#player-info-card');
    if (!card) return;
    card.innerHTML = '';
    const meRow = (board.players || []).find(p => p.id === me.id);
    if (!meRow) {
      card.innerHTML = '<div class="rank-row"><span class="rank-name">Noch keine Daten vorhanden</span></div>';
      return;
    }
    const row = el('div', 'rank-row first');
    row.innerHTML = `
      <span class="rank-avatar" style="background:${meRow.color}">${meRow.figure || '🙂'}</span>
      <span class="rank-name">${escapeHtml(meRow.name)} · Feld ${meRow.position ?? 0}</span>
      <span class="rank-stars">⭐ ${meRow.stars || 0} · 🧮 ${meRow.totalPoints || 0}</span>`;
    card.appendChild(row);
  }

  function switchPlayerBoardPanel(panel) {
    board.panel = panel;
    setPlayerBoardBadge(panel, 0);
    document.querySelectorAll('#player-board-nav .board-nav-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.panel === panel);
    });
    document.querySelectorAll('.screen[data-screen="board"] .board-panel').forEach(p => {
      p.classList.toggle('active', p.dataset.panel === panel);
    });
  }

  function bumpPlayerBoardBadge(panel) {
    board.badges[panel] = (board.badges[panel] || 0) + 1;
    renderPlayerBoardBadges();
  }

  function setPlayerBoardBadge(panel, value) {
    board.badges[panel] = Math.max(0, Number(value) || 0);
    renderPlayerBoardBadges();
  }

  function renderPlayerBoardBadges() {
    document.querySelectorAll('#player-board-nav .board-nav-btn').forEach(b => {
      const panel = b.dataset.panel;
      const n = board.badges[panel] || 0;
      b.dataset.badge = n > 0 ? String(n) : '';
      b.classList.toggle('has-badge', n > 0);
    });
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

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
})();
