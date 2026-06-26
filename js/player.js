/* ============================================================
   PARTY ARENA — Spieler-Logik (Handy)
   Nutzt die bestehenden Mini-Spiele aus games.js
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

  const me = { id: null, name: '', color: '#ff3cac' };
  const hudScore = $('#hud-score');
  let lastScoreSent = 0, scoreThrottle = 0;

  /* ---------- Code aus URL vorbefüllen ---------- */
  const params = new URLSearchParams(location.search);
  const codeFromUrl = (params.get('code') || '').toUpperCase();
  if (codeFromUrl) $('#code-input').value = codeFromUrl;
  // gespeicherten Namen vorbefüllen
  try {
    const savedName = localStorage.getItem('pa_name');
    if (savedName) $('#name-input').value = savedName;
  } catch (_) {}

  /* ---------- Verbindung ---------- */
  if (location.protocol === 'file:') {
    showJoinError('⚠️ Bitte die Adresse vom Host-Bildschirm im Browser öffnen (z.B. http://192.168.…:3000/), nicht die Datei direkt.');
  } else {
    Net.connect();
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
    let pid = null;
    try { pid = localStorage.getItem('pa_pid_' + code); } catch (_) {}
    Net.send({ type: 'player:join', name, code, playerId: pid });
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
    try { localStorage.setItem('pa_pid_' + m.code, m.playerId); } catch (_) {}
    $('#lobby-avatar').textContent = initials(me.name);
    $('#lobby-avatar').style.background = me.color;
    $('#lobby-name').textContent = me.name;
    $('#lobby-code').textContent = m.code;
    $('#hud-avatar').textContent = initials(me.name);
    $('#hud-avatar').style.background = me.color;
    $('#hud-name').textContent = me.name;
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
    showScreen('join');
    showJoinError('Der Host hat das Spiel beendet.');
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
  document.addEventListener('pointerdown', () => FX.setSoundEnabled(FX.isSoundEnabled()), { once: true });

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
})();
