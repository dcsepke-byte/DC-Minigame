/* ============================================================
   PARTY ARENA — Spiel-Engine & Rundenlogik
   ============================================================ */

(() => {
  'use strict';

  /* ---------------- DOM Shortcuts ---------------- */
  const $ = sel => document.querySelector(sel);
  const screens = {};
  document.querySelectorAll('.screen').forEach(s => screens[s.dataset.screen] = s);

  function showScreen(name) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[name].classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ---------------- Spielzustand ---------------- */
  const PALETTE = ['#ff3cac', '#00f0ff', '#2bffb9', '#ffd34e', '#7b2ff7', '#ff6a00', '#3a86ff', '#ff4d6d'];
  const state = {
    players: [],          // { name, color, initials, stars, totalPoints }
    rounds: 5,
    order: 'random',
    disabledGames: new Set(), // ids der abgewählten Spiele
    queue: [],            // Reihenfolge der Mini-Spiele
    currentRound: 0,
    turnOrder: [],        // Indizes der Spieler in Spielreihenfolge
    currentTurn: 0,
    roundScores: {}       // playerIndex -> score
  };

  function enabledGames() { return Games.list.filter(g => !state.disabledGames.has(g.id)); }

  function initials(name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.trim().slice(0, 2).toUpperCase();
  }

  /* ============================================================
     SETUP-SCREEN
     ============================================================ */
  const nameInput = $('#player-name-input');
  const playerListEl = $('#player-list');
  const startBtn = $('#btn-start-game');
  const roundsValue = $('#rounds-value');
  const playerHint = $('#player-hint');

  function addPlayer(name) {
    name = (name || '').trim();
    if (!name) return;
    if (state.players.length >= 8) { flashHint('Maximal 8 Spieler!'); return; }
    if (state.players.some(p => p.name.toLowerCase() === name.toLowerCase())) { flashHint('Name schon vergeben!'); return; }
    const color = PALETTE[state.players.length % PALETTE.length];
    state.players.push({ name, color, initials: initials(name), stars: 0, totalPoints: 0 });
    FX.Sound.click();
    renderPlayers();
  }

  function removePlayer(i) {
    state.players.splice(i, 1);
    // Farben neu zuordnen
    state.players.forEach((p, idx) => { p.color = PALETTE[idx % PALETTE.length]; });
    FX.Sound.tap();
    renderPlayers();
  }

  function renderPlayers() {
    playerListEl.innerHTML = '';
    state.players.forEach((p, i) => {
      const li = el('li', 'player-chip');
      li.innerHTML = `
        <span class="chip-avatar" style="background:${p.color}">${p.initials}</span>
        <span class="chip-name">${escapeHtml(p.name)}</span>
        <button class="chip-remove" title="Entfernen">✕</button>`;
      li.querySelector('.chip-remove').addEventListener('click', () => removePlayer(i));
      playerListEl.appendChild(li);
    });
    const ok = state.players.length >= 2;
    updateStartButton();
    if (state.players.length === 0) playerHint.textContent = 'Mindestens 2 Spieler nötig (max. 8).';
    else if (!ok) playerHint.textContent = `Noch ${2 - state.players.length} Spieler hinzufügen…`;
    else playerHint.textContent = `${state.players.length} Spieler bereit! 🎉`;
  }

  function updateStartButton() {
    const playersOk = state.players.length >= 2;
    const gamesOk = enabledGames().length >= 1;
    startBtn.disabled = !(playersOk && gamesOk);
  }

  let hintTimer = null;
  function flashHint(msg) {
    playerHint.textContent = msg;
    playerHint.style.color = '#ff4d6d';
    clearTimeout(hintTimer);
    hintTimer = setTimeout(() => { playerHint.style.color = ''; renderPlayers(); }, 1500);
  }

  $('#btn-add-player').addEventListener('click', () => { addPlayer(nameInput.value); nameInput.value = ''; nameInput.focus(); });
  nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') { addPlayer(nameInput.value); nameInput.value = ''; } });

  // Stepper (Runden)
  document.querySelectorAll('.step-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const dir = parseInt(btn.dataset.dir, 10);
      state.rounds = Math.max(1, Math.min(20, state.rounds + dir));
      roundsValue.textContent = state.rounds;
      FX.Sound.tap();
    });
  });

  // Reihenfolge-Pills
  document.querySelectorAll('.toggle-pills .pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.toggle-pills .pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      state.order = pill.dataset.order;
      FX.Sound.tap();
    });
  });

  // Games-Vorschau rendern (anklickbar zum Aktivieren/Deaktivieren)
  const gamesHint = $('#games-hint');
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
    FX.Sound.tap();
    updateGamesHint();
    updateStartButton();
  }

  function updateGamesHint() {
    const n = enabledGames().length;
    if (n === 0) {
      gamesHint.textContent = '⚠️ Mindestens 1 Spiel auswählen!';
      gamesHint.style.color = '#ff4d6d';
    } else {
      gamesHint.textContent = `${n} von ${Games.list.length} Spielen aktiv`;
      gamesHint.style.color = '';
    }
  }

  /* ============================================================
     SPIEL STARTEN
     ============================================================ */
  startBtn.addEventListener('click', startGame);

  function buildQueue() {
    const q = [];
    const pool0 = enabledGames();
    if (pool0.length === 0) return q;
    if (state.order === 'random') {
      let pool = [];
      while (pool.length < state.rounds) pool = pool.concat(shuffle(pool0.slice()));
      for (let i = 0; i < state.rounds; i++) q.push(pool[i]);
    } else {
      for (let i = 0; i < state.rounds; i++) q.push(pool0[i % pool0.length]);
    }
    return q;
  }

  function startGame() {
    state.queue = buildQueue();
    state.currentRound = 0;
    state.players.forEach(p => { p.stars = 0; p.totalPoints = 0; });
    FX.Sound.whoosh();
    FX.burst(window.innerWidth / 2, window.innerHeight / 2, 40, 12);
    startRound();
  }

  /* ============================================================
     RUNDEN-INTRO
     ============================================================ */
  function startRound() {
    const game = state.queue[state.currentRound];
    state.roundScores = {};
    // Spielreihenfolge: pro Runde rotieren, damit nicht immer dieselbe Person beginnt
    state.turnOrder = state.players.map((_, i) => i);
    const rot = state.currentRound % state.players.length;
    state.turnOrder = state.turnOrder.slice(rot).concat(state.turnOrder.slice(0, rot));
    state.currentTurn = 0;

    $('#round-badge').textContent = `RUNDE ${state.currentRound + 1} / ${state.rounds}`;
    $('#intro-game-icon').textContent = game.icon;
    $('#intro-game-name').textContent = game.name;
    $('#intro-game-desc').textContent = game.desc;
    $('#intro-rules').innerHTML = game.rules;
    FX.Sound.whoosh();
    showScreen('round-intro');
  }

  $('#btn-round-begin').addEventListener('click', () => { FX.Sound.click(); showPlayerTurn(); });

  /* ============================================================
     SPIELER-INTRO ("Du bist dran")
     ============================================================ */
  function showPlayerTurn() {
    const pIdx = state.turnOrder[state.currentTurn];
    const p = state.players[pIdx];
    const avatar = $('#turn-avatar');
    avatar.textContent = p.initials;
    avatar.style.background = p.color;
    $('#turn-name').textContent = p.name;
    $('#turn-progress').textContent = `Spieler ${state.currentTurn + 1} von ${state.players.length} · Runde ${state.currentRound + 1}`;
    FX.Sound.whoosh();
    showScreen('player-turn');
  }

  $('#btn-player-ready').addEventListener('click', () => { FX.Sound.go(); startPlay(); });

  /* ============================================================
     MINI-SPIEL ABSPIELEN (mit Countdown)
     ============================================================ */
  const hudScore = $('#hud-score');

  function startPlay() {
    const pIdx = state.turnOrder[state.currentTurn];
    const p = state.players[pIdx];
    const game = state.queue[state.currentRound];

    $('#hud-avatar').textContent = p.initials;
    $('#hud-avatar').style.background = p.color;
    $('#hud-name').textContent = p.name;
    $('#hud-game').textContent = `${game.icon} ${game.name}`;
    hudScore.textContent = '0';

    const stage = $('#game-stage');
    stage.innerHTML = '';
    showScreen('play');

    // Countdown 3-2-1-GO
    let n = 3;
    const cd = el('div', 'stage-center');
    cd.innerHTML = `<div class="countdown-num">${n}</div>`;
    stage.appendChild(cd);
    FX.Sound.countdown();

    const cdTimer = setInterval(() => {
      n--;
      if (n > 0) {
        cd.innerHTML = `<div class="countdown-num">${n}</div>`;
        FX.Sound.countdown();
      } else {
        clearInterval(cdTimer);
        cd.innerHTML = `<div class="countdown-num" style="color:var(--good)">GO!</div>`;
        FX.Sound.go();
        setTimeout(() => { stage.innerHTML = ''; launchGame(game, stage); }, 600);
      }
    }, 800);
  }

  function launchGame(game, stage) {
    const api = createGameApi(stage, finalScore => onPlayerFinished(finalScore));
    try {
      game.play(stage, api);
    } catch (err) {
      console.error('Fehler im Mini-Spiel:', err);
      onPlayerFinished(0);
    }
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
      setScore(n) { hudScore.textContent = n; },
      finish(score) {
        if (finished) return;
        finished = true;
        cleanup();
        onFinish(Math.max(0, Math.round(score)));
      },
      timeout(fn, ms) { const id = setTimeout(fn, ms); timeouts.push(id); return id; },
      interval(fn, ms) { const id = setInterval(fn, ms); intervals.push(id); return id; },
      frameLoop(fn) {
        const lstate = { alive: true };
        loops.push(lstate);
        function step() {
          if (!lstate.alive) return;
          if (fn() === false) { lstate.alive = false; return; }
          requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
      }
    };
  }

  /* ============================================================
     SPIELER-ERGEBNIS
     ============================================================ */
  function onPlayerFinished(score) {
    const pIdx = state.turnOrder[state.currentTurn];
    const p = state.players[pIdx];
    state.roundScores[pIdx] = score;
    p.totalPoints += score;

    const avatar = $('#result-avatar');
    avatar.textContent = p.initials;
    avatar.style.background = p.color;
    $('#result-name').textContent = p.name;
    const scoreEl = $('#result-score');
    FX.Sound.star();
    showScreen('player-result');
    animateNumber(scoreEl, 0, score, 1000);
    if (score > 0) FX.burst(window.innerWidth / 2, window.innerHeight * 0.45, 30, 10);
  }

  $('#btn-result-next').addEventListener('click', () => {
    FX.Sound.click();
    state.currentTurn++;
    if (state.currentTurn < state.players.length) {
      showPlayerTurn();
    } else {
      showRoundResult();
    }
  });

  /* ============================================================
     RUNDEN-RANGLISTE + Stern vergeben
     ============================================================ */
  function showRoundResult() {
    const game = state.queue[state.currentRound];
    $('#round-result-sub').textContent = `Runde ${state.currentRound + 1} — ${game.icon} ${game.name}`;

    // Rangliste nach Rundenpunkten
    const ranked = state.players
      .map((p, i) => ({ p, i, score: state.roundScores[i] || 0 }))
      .sort((a, b) => b.score - a.score);

    const maxScore = ranked.length ? ranked[0].score : 0;
    const winners = ranked.filter(r => r.score === maxScore && maxScore > 0);
    // Stern(e) vergeben
    winners.forEach(w => { state.players[w.i].stars += 1; });

    const rankEl = $('#round-ranking');
    rankEl.innerHTML = '';
    ranked.forEach((r, pos) => {
      const isWinner = winners.some(w => w.i === r.i);
      const row = el('div', 'rank-row' + (isWinner ? ' first' : ''));
      row.style.animationDelay = (pos * 0.08) + 's';
      row.innerHTML = `
        <span class="rank-pos">${pos + 1}</span>
        <span class="rank-avatar" style="background:${r.p.color}">${r.p.initials}</span>
        <span class="rank-name">${escapeHtml(r.p.name)}</span>
        <span class="rank-score">${r.score}</span>
        ${isWinner ? '<span class="rank-stars">⭐</span>' : ''}`;
      rankEl.appendChild(row);
    });

    const starWinner = $('#star-winner');
    if (winners.length === 1) starWinner.textContent = `⭐ ${winners[0].p.name} holt sich den Stern!`;
    else if (winners.length > 1) starWinner.textContent = `⭐ Gleichstand! ${winners.map(w => w.p.name).join(' & ')} bekommen einen Stern!`;
    else starWinner.textContent = 'Diese Runde gab es keine Punkte 😅';

    showScreen('round-result');
    FX.Sound.fanfare();
    FX.celebrate();
  }

  $('#btn-round-next').addEventListener('click', () => { FX.Sound.click(); showStandings(); });

  /* ============================================================
     GESAMTSTAND
     ============================================================ */
  function showStandings() {
    const ranked = sortedOverall();
    $('#standings-sub').textContent = `Nach Runde ${state.currentRound + 1} von ${state.rounds}`;
    const rankEl = $('#standings-ranking');
    rankEl.innerHTML = '';
    ranked.forEach((r, pos) => {
      const row = el('div', 'rank-row' + (pos === 0 && r.p.stars > 0 ? ' first' : ''));
      row.style.animationDelay = (pos * 0.08) + 's';
      row.innerHTML = `
        <span class="rank-pos">${pos + 1}</span>
        <span class="rank-avatar" style="background:${r.p.color}">${r.p.initials}</span>
        <span class="rank-name">${escapeHtml(r.p.name)}</span>
        <span class="rank-stars">${'⭐'.repeat(r.p.stars) || '–'}</span>
        <span class="rank-score">${r.p.stars}</span>`;
      rankEl.appendChild(row);
    });

    const isLast = state.currentRound + 1 >= state.rounds;
    $('#btn-standings-next').textContent = isLast ? '🏆 Zur Siegerehrung' : '➡️ Nächste Runde';
    showScreen('standings');
    FX.Sound.whoosh();
  }

  function sortedOverall() {
    return state.players
      .map((p, i) => ({ p, i }))
      .sort((a, b) => b.p.stars - a.p.stars || b.p.totalPoints - a.p.totalPoints);
  }

  $('#btn-standings-next').addEventListener('click', () => {
    FX.Sound.click();
    if (state.currentRound + 1 >= state.rounds) {
      showFinal();
    } else {
      state.currentRound++;
      startRound();
    }
  });

  /* ============================================================
     FINALE / SIEGEREHRUNG
     ============================================================ */
  function showFinal() {
    const ranked = sortedOverall();
    const podium = $('#podium');
    podium.innerHTML = '';

    // Podium-Reihenfolge: 2. - 1. - 3.
    const order = [1, 0, 2];
    const medals = { 0: 'gold', 1: 'silver', 2: 'bronze' };
    const crowns = { 0: '👑', 1: '🥈', 2: '🥉' };

    order.forEach(rankPos => {
      if (rankPos >= ranked.length) return;
      const r = ranked[rankPos];
      const col = el('div', 'podium-col');
      col.innerHTML = `
        ${rankPos === 0 ? '<div class="podium-crown">👑</div>' : ''}
        <div class="podium-avatar" style="background:${r.p.color}">${r.p.initials}</div>
        <div class="podium-name">${escapeHtml(r.p.name)}</div>
        <div class="podium-stars">${'⭐'.repeat(r.p.stars) || '–'}</div>
        <div class="podium-block ${medals[rankPos]}" style="animation-delay:${rankPos * 0.2}s">${rankPos === 0 ? '🏆' : (rankPos + 1)}</div>`;
      podium.appendChild(col);
    });

    const winner = ranked[0];
    const tie = ranked.length > 1 && ranked[1].p.stars === winner.p.stars && ranked[1].p.totalPoints === winner.p.totalPoints;
    $('#final-winner-banner').textContent = tie
      ? `Unentschieden an der Spitze!`
      : `🎉 ${winner.p.name} gewinnt PARTY ARENA! 🎉`;

    // Restliche Plätze auflisten
    if (ranked.length > 3) {
      const rest = el('div', 'ranking final-others');
      ranked.slice(3).forEach((r, idx) => {
        const row = el('div', 'rank-row');
        row.innerHTML = `
          <span class="rank-pos">${idx + 4}</span>
          <span class="rank-avatar" style="background:${r.p.color}">${r.p.initials}</span>
          <span class="rank-name">${escapeHtml(r.p.name)}</span>
          <span class="rank-stars">${'⭐'.repeat(r.p.stars) || '–'}</span>`;
        rest.appendChild(row);
      });
      podium.after(rest);
      // entferne evtl. alte
      document.querySelectorAll('.final-others').forEach((e, i, arr) => { if (i < arr.length - 1) e.remove(); });
    } else {
      document.querySelectorAll('.final-others').forEach(e => e.remove());
    }

    showScreen('final');
    FX.Sound.fanfare();
    FX.celebrate();
    setTimeout(() => FX.celebrate(), 800);
    setTimeout(() => FX.celebrate(), 1700);
  }

  $('#btn-play-again').addEventListener('click', () => {
    FX.Sound.whoosh();
    document.querySelectorAll('.final-others').forEach(e => e.remove());
    showScreen('start');
    renderPlayers();
  });

  /* ============================================================
     SOUND-TOGGLE
     ============================================================ */
  const soundBtn = $('#sound-toggle');
  soundBtn.addEventListener('click', () => {
    const on = !FX.isSoundEnabled();
    FX.setSoundEnabled(on);
    soundBtn.textContent = on ? '🔊' : '🔇';
    if (on) FX.Sound.click();
  });

  /* ============================================================
     HILFSFUNKTIONEN
     ============================================================ */
  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; }
  function escapeHtml(s) { return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

  function animateNumber(elm, from, to, dur) {
    const start = performance.now();
    function step(now) {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      elm.textContent = Math.round(from + (to - from) * eased);
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  /* ---------------- Demo-Spieler beim ersten Laden (optional) ---------------- */
  renderPlayers();
  // Aktiviere AudioContext beim ersten Klick irgendwo
  document.addEventListener('pointerdown', () => FX.setSoundEnabled(FX.isSoundEnabled()), { once: true });

})();
