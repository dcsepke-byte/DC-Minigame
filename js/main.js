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
     SOLO-BRETTSPIEL-ENGINE (Mario-Party-Style)
     ============================================================ */
      const SOLO_BOARD_SIZE = 40;          // 40-Feld-Rundkurs (8 Segmente à 5 Felder)
      const SOLO_DUEL_TIME_MS = 15000;     // 15s Zeitbegrenzung pro Duell
      const SOLO_STARS_TO_WIN = 4;         // Spielende: erster mit 4 Sternen

      /* Solo-Board generieren (Kleeblatt-Layout, 40 Felder) */
      function buildSoloBoard() {
        const tiles = [];
        for (let i = 0; i < SOLO_BOARD_SIZE; i++) {
          const seg = Math.floor(i / 5);          // 0..7 → Biom
          const type = (i === 0) ? 'start'
            : (i % 5 === 0) ? 'junction'
            : (i % 7 === 0) ? 'event'
            : 'normal';
          tiles.push({ idx: i, type, biome: seg, next: [(i + 1) % SOLO_BOARD_SIZE] });
        }
        return tiles;
      }

      function playersFor3D() {
        return state.players.map((p, i) => ({
          id: 'p' + i, name: p.name, color: p.color,
          position: p.position, stars: p.stars, coins: p.coins, idx: i,
        }));
      }

      function sync3DBoard() {
        if (!window.Party3D) return;
        Party3D.setBoardState({
          tiles: state.board,
          players: playersFor3D(),
          owners: {},
          turnPlayerId: 'p' + state.currentTurn,
        });
      }

      /* Spieler initialisieren (Brett-Modus) */
      function initBoardGame() {
        state.board = buildSoloBoard();
        state.players.forEach((p, i) => {
          p.position = 0; p.stars = 0; p.coins = 10; p.totalPoints = 0;
        });
        state.currentTurn = 0;
        state.turnRolls = 0;
        state.duelQueue = [];
        state.duelResults = [];
        sync3DBoard();
      }

      /* ============================================================
         BRETTLICHES SPIEL: WÜRFELN + ZIEHEN + DUELL
         ============================================================ */
      function showBoardTurn() {
        const p = state.players[state.currentTurn];
        const isHuman = (state.currentTurn === 0);  // Index 0 = menschlicher Spieler
        $('#board-turn-name').textContent = p.name + (isHuman ? ' (Du)' : ' (Bot)');
        $('#board-turn-avatar').textContent = p.initials;
        $('#board-turn-avatar').style.background = p.color;
        $('#board-turn-stars').textContent = '⭐'.repeat(p.stars) + ' 🪙'.repeat(0) + ' ' + p.coins + ' Münzen';
        $('#board-roll-btn').disabled = !isHuman;
        showScreen('board');
        if (window.Party3D) Party3D.setBoardState({
          tiles: state.board, players: playersFor3D(), owners: {},
          turnPlayerId: 'p' + state.currentTurn,
        });
        if (!isHuman) {
          // Bot würfelt automatisch nach kurzer Pause
          setTimeout(() => doRoll(), 1200);
        }
      }

      function doRoll() {
        const p = state.players[state.currentTurn];
        const roll = 1 + Math.floor(Math.random() * 6);
        if (window.Party3D && Party3D.rollDice) Party3D.rollDice(roll, 1500);
        // Nach Würfel-Animation ziehen
        setTimeout(() => {
          const from = p.position;
          let to = (from + roll) % SOLO_BOARD_SIZE;
          const path = [];
          for (let s = 0; s <= roll; s++) path.push((from + s) % SOLO_BOARD_SIZE);
          p.position = to;
          if (window.Party3D && Party3D.animatePawnMove) {
            Party3D.animatePawnMove('p' + state.currentTurn, path);
          }
          // Nach Hop-Animation Duell auslösen (Spieler gegen Bot)
          setTimeout(() => {
            triggerDuel(to);
          }, path.length * 280 + 600);
        }, 1600);
      }

      /* Duell auslösen: Spieler vs nächster Mitspieler (oder Bot) */
      function triggerDuel(landedTile) {
        const challenger = state.players[state.currentTurn];
        // Duell-Gegner: ein anderer Spieler (zufällig), bei 2 Spielern der andere
        const opponents = state.players.filter((_, i) => i !== state.currentTurn);
        const opponent = opponents[Math.floor(Math.random() * opponents.length)] || opponents[0];
        state.duel = { challenger, opponent, tile: landedTile };
        showDuelIntro();
      }

      function showDuelIntro() {
        const d = state.duel;
        $('#duel-p1-avatar').textContent = d.challenger.initials;
        $('#duel-p1-avatar').style.background = d.challenger.color;
        $('#duel-p1-name').textContent = d.challenger.name;
        $('#duel-p2-avatar').textContent = d.opponent.initials;
        $('#duel-p2-avatar').style.background = d.opponent.color;
        $('#duel-p2-name').textContent = d.opponent.name;
        showScreen('duel-intro');
        FX.Sound.whoosh();
        // Automatisch starten nach 2s
        setTimeout(() => startDuelGame(), 2000);
      }

      /* ============================================================
         SPIEL-API HELPER (für Mini-Spiele im Duell)
         ============================================================ */
      const hudScore = $('#hud-score');

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
          setScore(n) { if (hudScore) hudScore.textContent = n; },
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

      function startDuelGame() {
        const game = pickDuelGame();
        const d = state.duel;
        state.duelGame = game;
        $('#duel-game-name').textContent = game.icon + ' ' + game.name;
        $('#duel-timer').textContent = (SOLO_DUEL_TIME_MS / 1000).toFixed(0) + 's';
        showScreen('duel-play');
        // Duell-Stage: zwei getrennte Bereiche für Spieler 1 und Spieler 2
        const stage = $('#duel-stage');
        stage.innerHTML = '';
        // Vereinfacht: nur menschlicher Spieler spielt, Bot bekommt zufällige Punktzahl
        const api = createDuelApi(stage, SOLO_DUEL_TIME_MS, (finalScore) => {
          const botScore = Math.floor(Math.random() * 200) + 50; // 50-250
          finishDuel(finalScore, botScore);
        });
        try { game.play(stage, api); } catch (err) { console.error('Duell-Fehler:', err); finishDuel(0, 100); }
      }

      function createDuelApi(stage, timeLimitMs, onFinish) {
        const api = createGameApi(stage, onFinish);
        const start = performance.now();
        const timerEl = $('#duel-timer');
        // Countdown-Timer
        api.interval(() => {
          const rem = timeLimitMs - (performance.now() - start);
          if (rem <= 0) { /* Spiel soll selbst finishen, aber Fallback */ }
          timerEl.textContent = Math.max(0, rem / 1000).toFixed(1) + 's';
        }, 100);
        // Hard-Stop: bei Ablauf der Zeit automatisch.finish(aktueller Stand)
        api.timeout(() => {
          const cur = parseInt($('#hud-score').textContent, 10) || 0;
          api.finish(cur);
        }, timeLimitMs + 200);
        return api;
      }

      function pickDuelGame() {
        // Action-orientierte Spiele bevorzugen (Tap, Targets, Arrows, Reaction)
        const duelPool = Games.list.filter(g =>
          ['tap', 'targets', 'arrows', 'reaction', 'math', 'stroop'].includes(g.id)
        );
        return duelPool[Math.floor(Math.random() * duelPool.length)];
      }

      function finishDuel(playerScore, botScore) {
        const d = state.duel;
        const won = playerScore >= botScore;
        if (won) {
          d.challenger.coins += 5;
          // Stern bei 10 Münzen
          if (d.challenger.coins >= 10) { d.challenger.stars += 1; d.challenger.coins -= 10; }
        } else {
          d.opponent.coins += 5;
          if (d.opponent.coins >= 10) { d.opponent.stars += 1; d.opponent.coins -= 10; }
        }
        $('#duel-result-p1').textContent = playerScore;
        $('#duel-result-p2').textContent = botScore;
        $('#duel-result-banner').textContent = won
          ? '🎉 ' + d.challenger.name + ' gewinnt das Duell!'
          : '😤 ' + d.opponent.name + ' gewinnt das Duell!';
        showScreen('duel-result');
        FX.Sound.fanfare();
        if (won) FX.celebrate();
      }

      $('#btn-duel-result-next').addEventListener('click', () => {
        FX.Sound.click();
        // Nächster Spieler oder Sieg-Check
        const winner = state.players.find(p => p.stars >= SOLO_STARS_TO_WIN);
        if (winner) { showFinal(); return; }
        state.currentTurn = (state.currentTurn + 1) % state.players.length;
        showBoardTurn();
      });

      /* Würfel-Button (menschlicher Spieler) */
      $('#board-roll-btn').addEventListener('click', () => {
        FX.Sound.click();
        $('#board-roll-btn').disabled = true;
        doRoll();
      });

      /* ============================================================
         SPIEL STARTEN — SOLO-BRETT-MODUS
         ============================================================ */
      startBtn.addEventListener('click', startGame);

  /* Solo-Quickstart: 1 Mensch + 1 Bot, Brett-Modus direkt starten */
  const soloBtn = $('#btn-solo-quick');
  if (soloBtn) soloBtn.addEventListener('click', () => {
    state.players = [];
    addPlayer('Du');
    addPlayer('Bot 🤖');
    startGame();
  });

      function startGame() {
        initBoardGame();
        FX.Sound.whoosh();
        FX.burst(window.innerWidth / 2, window.innerHeight / 2, 40, 12);
        showBoardTurn();
      }

  function sortedOverall() {
    return state.players
      .map((p, i) => ({ p, i }))
      .sort((a, b) => b.p.stars - a.p.stars || b.p.totalPoints - a.p.totalPoints);
  }

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

  /* ============================================================
     DAILY CHALLENGE — Taegliches Minispiel mit Streak-Bonus
     ============================================================ */
  const DC = window.DailyChallengeLogic;
  const MP = window.MetaProgressionLogic;

  // Action-Spiele fuer Daily Challenge (nur die spannenden neuen)
  const DAILY_GAME_IDS = [
    'towerstack', 'bubblepop', 'ninjaslash', 'colorcatch',
    'dodgeball', 'bouncesurvival', 'quickdraw', 'rhythmtap',
    'coindash', 'tileflip',
  ];

  let dailyState = null;
  let dailyGame = null;
  let dailyApiScoreEl = null;

  function initDailyChallenge() {
    if (!DC || !MP) return;
    dailyState = DC.loadDailyState();
    updateDailyChallengeUI();
  }

  function updateDailyChallengeUI() {
    if (!dailyState) return;
    const now = new Date();
    const gameId = DC.getDailyGameId(now, DAILY_GAME_IDS);
    const game = Games.list.find(g => g.id === gameId);
    if (!game) return;

    $('#dc-icon').textContent = game.icon;
    $('#dc-name').textContent = 'Heute: ' + game.name;
    $('#dc-desc').textContent = game.desc;

    const info = DC.getStreakInfo(dailyState);
    $('#dc-streak-badge').textContent = '🔥 ' + info.streak;
    $('#dc-best').textContent = 'Best: ' + info.bestStreak;
    $('#dc-total').textContent = 'Gesamt: ' + info.totalCompleted;

    const canPlay = DC.canPlayDaily(dailyState, now);
    const btn = $('#btn-daily-challenge');
    btn.disabled = !canPlay;
    btn.textContent = canPlay ? '🎯 Daily Challenge spielen' : 'Heute schon gespielt ✓';

    // Bonus-Vorschau
    const nextStreak = info.streak; // Streak vor heutigem Play
    const bonusStars = DC.getDailyBonusStars(nextStreak);
    const xpMult = DC.getDailyXpMultiplier(nextStreak);
    $('#dc-bonus-info').textContent = canPlay
      ? 'Bonus: +' + bonusStars + ' ⭐  |  ' + xpMult.toFixed(1) + 'x XP'
      : 'Komm morgen wieder fuer den naechsten Streak!';
  }

  function startDailyChallenge() {
    if (!dailyState) return;
    const now = new Date();
    if (!DC.canPlayDaily(dailyState, now)) return;

    const gameId = DC.getDailyGameId(now, DAILY_GAME_IDS);
    dailyGame = Games.list.find(g => g.id === gameId);
    if (!dailyGame) return;

    $('#daily-game-name').textContent = dailyGame.icon + ' ' + dailyGame.name;
    showScreen('daily-play');

    const stage = $('#daily-stage');
    stage.innerHTML = '';
    dailyApiScoreEl = $('#daily-score');
    dailyApiScoreEl.textContent = '0';

    // Timer (30 Sekunden Standard, manche Spiele regeln das selbst)
    const timeLimit = 30000;
    const timerEl = $('#daily-timer');

    const api = createDailyApi(stage, timeLimit, (finalScore) => {
      finishDailyChallenge(finalScore);
    });

    try {
      dailyGame.play(stage, api);
    } catch (err) {
      console.error('Daily Challenge Fehler:', err);
      finishDailyChallenge(0);
    }
  }

  function createDailyApi(stage, timeLimitMs, onFinish) {
    const timeouts = [], intervals = [], loops = [];
    let finished = false;
    function cleanup() {
      timeouts.forEach(clearTimeout);
      intervals.forEach(clearInterval);
      loops.forEach(l => l.alive = false);
    }
    const api = {
      stage,
      setScore(n) { if (dailyApiScoreEl) dailyApiScoreEl.textContent = n; },
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
      },
    };

    // Countdown-Timer
    const start = performance.now();
    api.interval(() => {
      const rem = timeLimitMs - (performance.now() - start);
      if (timerEl) timerEl.textContent = Math.max(0, rem / 1000).toFixed(1) + 's';
    }, 100);

    // Hard-Stop Fallback
    api.timeout(() => {
      const cur = parseInt(dailyApiScoreEl.textContent, 10) || 0;
      api.finish(cur);
    }, timeLimitMs + 200);

    return api;
  }

  function finishDailyChallenge(score) {
    const now = new Date();
    const result = DC.recordDailyPlay(dailyState, now, score);
    DC.saveDailyState(dailyState);

    // Result-Screen fuellen
    $('#daily-result-title').textContent = '📅 ' + (dailyGame ? dailyGame.name : 'Daily Challenge');
    $('#daily-result-score').textContent = score;

    if (result.alreadyPlayed) {
      $('#daily-reward-stars').textContent = 'Bereits gespielt heute!';
      $('#daily-reward-xp').textContent = '';
      $('#daily-reward-streak').textContent = '🔥 Streak: ' + result.streak;
    } else {
      $('#daily-reward-stars').textContent = '⭐ +' + result.bonusStars + ' Bonus-Sterne';
      $('#daily-reward-xp').textContent = '✨ ' + result.xpMultiplier.toFixed(1) + 'x XP';
      $('#daily-reward-streak').textContent = '🔥 Streak: ' + result.streak
        + (result.newBestStreak ? ' — NEUER REKORD! 🎉' : '');

      // Meta-Progression aktualisieren: Sterne + XP
      const prog = MP.createProgression ? null : null; // wird unten geladen
      applyDailyRewards(result, score);
    }

    FX.Sound.fanfare();
    if (result.newBestStreak) FX.celebrate();

    showScreen('daily-result');
    updateDailyChallengeUI();
  }

  function applyDailyRewards(result, score) {
    if (!MP) return;
    // Progression laden
    let prog = null;
    try {
      const raw = localStorage.getItem('pa_progression');
      prog = raw ? JSON.parse(raw) : MP.createProgression();
    } catch (_) { prog = MP.createProgression(); }

    // Sterne addieren
    prog.stars += result.bonusStars;

    // XP mit Multiplikator
    const baseXp = MP.xpFromGameScore(score);
    const xpEarned = Math.floor(baseXp * result.xpMultiplier);
    const xpResult = MP.addXp(prog, xpEarned);

    // Achievements checken
    let achState = null;
    try {
      const raw = localStorage.getItem('pa_achievements');
      achState = raw ? JSON.parse(raw) : MP.createAchievementState();
    } catch (_) { achState = MP.createAchievementState(); }

    MP.checkAchievements(prog, achState);

    // Speichern
    try {
      localStorage.setItem('pa_progression', JSON.stringify(prog));
      localStorage.setItem('pa_achievements', JSON.stringify(achState));
    } catch (_) {}
  }

  // Button-Listener fuer Daily Challenge
  const dailyBtn = $('#btn-daily-challenge');
  if (dailyBtn) {
    dailyBtn.addEventListener('click', () => {
      FX.Sound.click();
      startDailyChallenge();
    });
  }

  const dailyBackBtn = $('#btn-daily-result-back');
  if (dailyBackBtn) {
    dailyBackBtn.addEventListener('click', () => {
      FX.Sound.click();
      showScreen('start');
    });
  }

  // Daily Challenge beim Laden initialisieren
  initDailyChallenge();

  /* ---------------- Demo-Spieler beim ersten Laden (optional) ---------------- */
  renderPlayers();
  // Aktiviere AudioContext beim ersten Klick irgendwo
  document.addEventListener('pointerdown', () => FX.setSoundEnabled(FX.isSoundEnabled()), { once: true });

  /* ============================================================
     ONBOARDING / TUTORIAL
     ============================================================ */
  const OB = window.OnboardingLogic;
  const ONB_KEY = 'pa_onboarding';
  const onbOverlay = $('#onboarding-overlay');
  const onbCard = $('#onboarding-card');
  const onbIcon = $('#onboarding-icon');
  const onbTitle = $('#onboarding-title');
  const onbText = $('#onboarding-text');
  const onbNext = $('#onboarding-next');
  const onbSkip = $('#onboarding-skip');
  const onbFill = $('#onboarding-progress-fill');
  const onbDots = $('#onboarding-dots');

  function loadOnboardingState() {
    if (!OB) return null;
    try {
      const raw = localStorage.getItem(ONB_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        // Merge mit Default um neue Felder abzusichern
        const def = OB.createOnboardingState();
        return Object.assign(def, saved);
      }
    } catch (_) {}
    return OB ? OB.createOnboardingState() : null;
  }

  function saveOnboardingState(obState) {
    try { localStorage.setItem(ONB_KEY, JSON.stringify(obState)); } catch (_) {}
  }

  // Icons fuer die einzelnen Schritte
  const STEP_ICONS = ['🎮', '👤', '🎮', '🚀', '📅'];

  function renderDots(obState) {
    if (!onbDots) return;
    const steps = OB.getTutorialSteps();
    onbDots.innerHTML = '';
    steps.forEach((_, i) => {
      const dot = el('span', 'onboarding-dot');
      if (i < obState.currentStep) dot.classList.add('done');
      if (i === obState.currentStep) dot.classList.add('active');
      onbDots.appendChild(dot);
    });
  }

  function highlightTarget(target) {
    // Alte Highlights entfernen
    document.querySelectorAll('.onboarding-highlight, .onboarding-arrow').forEach(e => e.remove());
    if (!target || target === '#screen-start') return;

    const targetEl = document.querySelector(target);
    if (!targetEl) return;

    const rect = targetEl.getBoundingClientRect();
    const highlight = el('div', 'onboarding-highlight');
    highlight.style.top = (rect.top - 4) + 'px';
    highlight.style.left = (rect.left - 4) + 'px';
    highlight.style.width = (rect.width + 8) + 'px';
    highlight.style.height = (rect.height + 8) + 'px';
    document.body.appendChild(highlight);

    // Pfeil ueber dem Target
    const arrow = el('div', 'onboarding-arrow');
    arrow.textContent = '👇';
    arrow.style.top = (rect.top - 40) + 'px';
    arrow.style.left = (rect.left + rect.width / 2 - 12) + 'px';
    document.body.appendChild(arrow);
  }

  function showOnboardingStep(obState) {
    if (!OB || !onbOverlay) return;
    const step = OB.getCurrentStep(obState);
    if (!step) {
      closeOnboarding(obState);
      return;
    }

    onbIcon.textContent = STEP_ICONS[obState.currentStep] || '🎮';
    onbTitle.textContent = step.title;
    onbText.textContent = step.text;
    onbFill.style.width = OB.getProgressPercent(obState) + '%';
    renderDots(obState);

    // Beim letzten Schritt Button-Text aendern
    if (obState.currentStep >= obState.stepsTotal - 1) {
      onbNext.textContent = 'Los gehts! 🎉';
    } else {
      onbNext.textContent = 'Weiter';
    }

    onbOverlay.classList.add('active');
    // Target hervorheben (mit kleinem Delay damit Layout steht)
    setTimeout(() => highlightTarget(step.target), 100);
  }

  function closeOnboarding(obState) {
    if (onbOverlay) onbOverlay.classList.remove('active');
    document.querySelectorAll('.onboarding-highlight, .onboarding-arrow').forEach(e => e.remove());
    OB.completeOnboarding(obState);
    saveOnboardingState(obState);
  }

  function initOnboarding() {
    if (!OB || !onbOverlay) return;
    const obState = loadOnboardingState();
    if (!obState) return;

    // Nur anzeigen wenn Erstbenutzer
    if (!OB.shouldShowTutorial(obState)) return;

    // Listener
    onbNext.addEventListener('click', () => {
      FX.Sound.click();
      const result = OB.advanceStep(obState);
      if (result.completed) {
        closeOnboarding(obState);
      } else {
        saveOnboardingState(obState);
        showOnboardingStep(obState);
      }
    });

    onbSkip.addEventListener('click', () => {
      FX.Sound.tap();
      OB.skipTutorial(obState);
      saveOnboardingState(obState);
      onbOverlay.classList.remove('active');
      document.querySelectorAll('.onboarding-highlight, .onboarding-arrow').forEach(e => e.remove());
    });

    // Beim ersten Schritt sofort zeigen (kurze Verzoegerung fuer Page-Load)
    setTimeout(() => showOnboardingStep(obState), 600);
  }

  initOnboarding();

})();
