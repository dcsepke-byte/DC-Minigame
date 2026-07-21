/* ============================================================
   PARTY ARENA — Mini-Spiele
   Jedes Spiel: play(stage, api)
   api = { stage, setScore(n), finish(score), timeout, interval,
           frameLoop(fn -> false beendet Loop) }
   ============================================================ */

const Games = (() => {
  'use strict';

  /* ---------- kleine Helfer ---------- */
  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; }

  /* =========================================================
     1) REAKTION — Tippe sobald grün
     ========================================================= */
  function gameReaction(stage, api) {
    const TIME_MS = 20000;
    const endAt = performance.now() + TIME_MS;
    let score = 0, state = 'idle', goTime = 0, runs = 0;
    const zone = el('div', 'reaction-zone wait');
    const tracker = el('div', 'reaction-tries');
    stage.append(zone, tracker);
    updateTracker();

    function updateTracker() { tracker.textContent = `Runden: ${runs}`; }

    function nextTry() {
      if (performance.now() >= endAt) { api.finish(score); return; }
      state = 'wait';
      zone.className = 'reaction-zone wait';
      zone.innerHTML = `<div><div class="rz-text">Warte…</div><div class="rz-sub">Noch NICHT tippen!</div></div>`;
      api.timeout(() => {
        if (state !== 'wait') return;
        state = 'go'; goTime = performance.now();
        zone.className = 'reaction-zone go';
        zone.innerHTML = `<div><div class="rz-text">JETZT!</div></div>`;
        FX.Sound.go();
      }, 1200 + Math.random() * 2800);
    }

    zone.addEventListener('pointerdown', () => {
      if (state === 'wait') {
        state = 'idle';
        zone.className = 'reaction-zone early';
        zone.innerHTML = `<div><div class="rz-text">Zu früh! 😅</div><div class="rz-sub">0 Punkte für diesen Versuch</div></div>`;
        FX.Sound.bad(); FX.shake(stage);
        runs++; updateTracker();
        api.timeout(nextTry, 1100);
      } else if (state === 'go') {
        const ms = performance.now() - goTime;
        const pts = Math.max(0, Math.round((600 - ms) / 2));
        score += pts; api.setScore(score);
        FX.Sound.good(); FX.toast(stage, `+${pts}`, '#2bffb9');
        zone.innerHTML = `<div><div class="rz-text">${Math.round(ms)} ms</div><div class="rz-sub">+${pts} Punkte</div></div>`;
        state = 'idle'; runs++; updateTracker();
        api.timeout(nextTry, 1100);
      }
    });

    zone.innerHTML = `<div><div class="rz-text">Bereit?</div><div class="rz-sub">Tippe sobald es GRÜN wird — 20s!</div></div>`;
    api.timeout(nextTry, 900);
    api.frameLoop(() => {
      if (performance.now() >= endAt) { api.finish(score); return false; }
      return true;
    });
  }

  /* =========================================================
     2) SIMON — Merke dir die Sequenz
     ========================================================= */
  function gameSimon(stage, api) {
    const maxLevel = 12;
    const colors = [
      { c: '#ff4d6d', f: 330 }, { c: '#3a86ff', f: 392 },
      { c: '#2bffb9', f: 494 }, { c: '#ffd34e', f: 587 }
    ];
    let sequence = [], level = 0, score = 0, inputIdx = 0, accepting = false;

    const wrap = el('div', 'stage-center');
    wrap.innerHTML = `<div class="simon-info" id="s-info">Schau genau hin…</div>
      <div class="simon-grid" id="s-grid"></div>`;
    stage.appendChild(wrap);
    const grid = wrap.querySelector('#s-grid');
    const info = wrap.querySelector('#s-info');
    const pads = colors.map((col, i) => {
      const p = el('div', 'simon-pad');
      p.style.background = col.c; p.style.color = col.c;
      p.dataset.i = i;
      p.addEventListener('pointerdown', () => onPad(i));
      grid.appendChild(p);
      return p;
    });

    function flash(i, dur = 380) {
      return new Promise(res => {
        pads[i].classList.add('lit');
        _beep(colors[i].f);
        api.timeout(() => { pads[i].classList.remove('lit'); api.timeout(res, 120); }, dur);
      });
    }

    async function playSequence() {
      accepting = false; info.textContent = 'Schau genau hin…';
      await wait(500);
      for (const i of sequence) { await flash(i); }
      accepting = true; inputIdx = 0;
      info.textContent = `Jetzt du! (Level ${level})`;
    }

    function onPad(i) {
      if (!accepting) return;
      pads[i].classList.add('lit'); _beep(colors[i].f);
      api.timeout(() => pads[i].classList.remove('lit'), 180);
      if (i === sequence[inputIdx]) {
        inputIdx++;
        if (inputIdx === sequence.length) {
          score = level * 100; api.setScore(score);
          accepting = false;
          FX.Sound.good();
          if (level >= maxLevel) { info.textContent = 'Perfekt! 🎉'; api.timeout(() => api.finish(score), 700); return; }
          info.textContent = '✅ Richtig!';
          api.timeout(nextLevel, 700);
        }
      } else {
        accepting = false; FX.Sound.bad(); FX.shake(stage);
        info.textContent = `❌ Daneben! Level ${level} erreicht`;
        api.timeout(() => api.finish(score), 1100);
      }
    }

    function nextLevel() {
      level++;
      sequence.push(rand(0, 3));
      playSequence();
    }

    function wait(ms) { return new Promise(r => api.timeout(r, ms)); }

    api.timeout(nextLevel, 700);
  }

  /* =========================================================
     3) BLITZ-RECHNEN — richtiges Ergebnis aus mehreren Zahlen wählen
     ========================================================= */
  function gameMath(stage, api) {
    const total = 20000;
    let score = 0, streak = 0, correct = 0, endTime = performance.now() + total, locked = false;

    const wrap = el('div', 'stage-center');
    wrap.innerHTML = `
      <div class="generic-timer-bar" id="m-bar"></div>
      <div class="math-streak" id="m-streak"></div>
      <div class="math-question" id="m-q"></div>
      <div class="math-prompt">Wähle das richtige Ergebnis</div>
      <div class="choice-grid" id="m-choices"></div>`;
    stage.appendChild(wrap);
    const qEl = wrap.querySelector('#m-q');
    const bar = wrap.querySelector('#m-bar');
    const streakEl = wrap.querySelector('#m-streak');
    const choicesEl = wrap.querySelector('#m-choices');

    function newQ() {
      locked = false;
      const op = ['+', '−', '×'][rand(0, 2)];
      let a, b;
      if (op === '+') { a = rand(2, 49); b = rand(2, 49); correct = a + b; }
      else if (op === '−') { a = rand(10, 60); b = rand(1, a); correct = a - b; }
      else { a = rand(2, 12); b = rand(2, 12); correct = a * b; }
      qEl.textContent = `${a} ${op} ${b} = ?`;

      // Antwortmöglichkeiten erzeugen (1 richtige + 3 plausible falsche)
      const options = new Set([correct]);
      let guard = 0;
      while (options.size < 4 && guard++ < 50) {
        let delta = rand(1, Math.max(5, Math.round(Math.abs(correct) * 0.25) + 4));
        if (Math.random() < 0.5) delta = -delta;
        const wrong = correct + delta;
        if (wrong >= 0 && wrong !== correct) options.add(wrong);
      }
      while (options.size < 4) options.add(correct + options.size); // Notfall-Auffüllung
      const arr = shuffle([...options]);

      choicesEl.innerHTML = '';
      arr.forEach(val => {
        const btn = el('button', 'choice-btn', String(val));
        btn.addEventListener('pointerdown', () => choose(val, btn));
        choicesEl.appendChild(btn);
      });
    }

    function choose(val, btn) {
      if (locked) return;
      if (val === correct) {
        locked = true;
        streak++;
        const pts = 10 + Math.min(streak, 10) * 2;
        score += pts; api.setScore(score);
        FX.Sound.correct(); FX.toast(stage, `+${pts}`, '#2bffb9');
        streakEl.textContent = streak > 1 ? `🔥 ${streak}x Combo` : '';
        btn.classList.add('correct');
        api.timeout(newQ, 280);
      } else {
        streak = 0; streakEl.textContent = '';
        endTime -= 2000;
        FX.Sound.bad(); FX.shake(stage); FX.toast(stage, '−2s', '#ff4d6d');
        btn.classList.add('wrong');
        btn.disabled = true;
      }
    }

    newQ();
    api.frameLoop(() => {
      const rem = endTime - performance.now();
      bar.style.width = Math.max(0, rem / total * 100) + '%';
      if (rem <= 0) { FX.burst(window.innerWidth / 2, window.innerHeight / 2, 30, 10); api.finish(score); return false; }
    });
  }

  /* =========================================================
     4) TAP-WAHNSINN — so schnell tippen wie möglich (5s)
     ========================================================= */
  function gameTap(stage, api) {
    const dur = 5000;
    let taps = 0;
    const start = performance.now();

    const wrap = el('div', 'stage-center');
    wrap.innerHTML = `<div class="tap-count" id="t-count">0</div>
      <button class="tap-button" id="t-btn">TAP!</button>
      <div class="tap-timer" id="t-time">5.0s</div>`;
    stage.appendChild(wrap);
    const cEl = wrap.querySelector('#t-count');
    const btn = wrap.querySelector('#t-btn');
    const tEl = wrap.querySelector('#t-time');

    btn.addEventListener('pointerdown', () => {
      taps++; cEl.textContent = taps; api.setScore(taps * 10);
      FX.Sound.tap();
      if (taps % 10 === 0) FX.burst(window.innerWidth / 2, window.innerHeight * 0.5, 14, 8);
    });

    api.frameLoop(() => {
      const rem = dur - (performance.now() - start);
      tEl.textContent = Math.max(0, rem / 1000).toFixed(1) + 's';
      if (rem <= 0) {
        btn.disabled = true;
        FX.burst(window.innerWidth / 2, window.innerHeight / 2, 40, 12);
        api.finish(taps * 10);
        return false;
      }
    });
  }

  /* =========================================================
     5) ZIEL-JAGD — Sterne treffen, Bomben meiden (15s)
     ========================================================= */
  function gameTargets(stage, api) {
    const dur = 15000;
    let score = 0;
    const endTime = performance.now() + dur;

    const hud = el('div', 'target-hud');
    hud.innerHTML = `<span id="tg-score">0 Pkt</span><span id="tg-time">15s</span>`;
    stage.appendChild(hud);
    const scoreEl = hud.querySelector('#tg-score');
    const timeEl = hud.querySelector('#tg-time');

    function spawn() {
      const isBomb = Math.random() < 0.22;
      const size = 44 + Math.random() * 40;
      const t = el('div', 'target' + (isBomb ? ' bomb' : ''));
      t.style.width = t.style.height = size + 'px';
      const rect = stage.getBoundingClientRect();
      t.style.left = Math.random() * (rect.width - size) + 'px';
      t.style.top = (Math.random() * (rect.height - size - 50) + 50) + 'px';
      t.textContent = isBomb ? '💣' : '⭐';
      let alive = true;
      api.timeout(() => { if (alive) { alive = false; t.remove(); } }, 850 + Math.random() * 850);
      t.addEventListener('pointerdown', () => {
        if (!alive) return;
        alive = false; t.remove();
        if (isBomb) {
          score = Math.max(0, score - 50);
          FX.Sound.explode(); FX.shake(stage); FX.toast(stage, '−50', '#ff4d6d');
        } else {
          const pts = Math.round(150 - size);
          score += pts; FX.Sound.good(); FX.toast(stage, `+${pts}`, '#2bffb9');
          FX.burst(rect.left + parseFloat(t.style.left) + size / 2, rect.top + parseFloat(t.style.top) + size / 2, 12, 7);
        }
        scoreEl.textContent = score + ' Pkt'; api.setScore(score);
      });
      stage.appendChild(t);
    }

    api.interval(() => { if (performance.now() < endTime) spawn(); }, 560);
    spawn();
    api.frameLoop(() => {
      const rem = endTime - performance.now();
      timeEl.textContent = Math.max(0, Math.ceil(rem / 1000)) + 's';
      if (rem <= 0) { api.finish(score); return false; }
    });
  }

  /* =========================================================
     6) FARBEN-CHAOS (Stroop) — Wähle die FARBE des Wortes
     ========================================================= */
  function gameStroop(stage, api) {
    const total = 20000;
    const colors = [
      { name: 'ROT', hex: '#ff4d6d' }, { name: 'BLAU', hex: '#3a86ff' },
      { name: 'GRÜN', hex: '#2bffb9' }, { name: 'GELB', hex: '#ffd34e' }
    ];
    let score = 0, streak = 0, endTime = performance.now() + total, displayColor = null;

    const wrap = el('div', 'stage-center');
    wrap.innerHTML = `
      <div class="generic-timer-bar" id="st-bar"></div>
      <div class="math-streak" id="st-streak"></div>
      <div class="stroop-prompt">Welche <strong>Farbe</strong> hat das Wort?</div>
      <div class="stroop-word" id="st-word">ROT</div>
      <div class="stroop-buttons" id="st-btns"></div>`;
    stage.appendChild(wrap);
    const wordEl = wrap.querySelector('#st-word');
    const bar = wrap.querySelector('#st-bar');
    const streakEl = wrap.querySelector('#st-streak');
    const btns = wrap.querySelector('#st-btns');

    colors.forEach(col => {
      const b = el('button', 'stroop-btn', col.name);
      b.style.background = col.hex;
      b.addEventListener('pointerdown', () => choose(col));
      btns.appendChild(b);
    });

    function newWord() {
      const wordColor = colors[rand(0, 3)];
      displayColor = colors[rand(0, 3)];
      wordEl.textContent = wordColor.name;
      wordEl.style.color = displayColor.hex;
    }
    function choose(col) {
      if (col.hex === displayColor.hex) {
        streak++;
        const pts = 15 + Math.min(streak, 8) * 3;
        score += pts; api.setScore(score);
        FX.Sound.correct(); FX.toast(stage, `+${pts}`, '#2bffb9');
        streakEl.textContent = streak > 1 ? `🔥 ${streak}x Combo` : '';
        newWord();
      } else {
        streak = 0; streakEl.textContent = '';
        endTime -= 1500;
        FX.Sound.bad(); FX.shake(stage); FX.toast(stage, '−1.5s', '#ff4d6d');
      }
    }

    newWord();
    api.frameLoop(() => {
      const rem = endTime - performance.now();
      bar.style.width = Math.max(0, rem / total * 100) + '%';
      if (rem <= 0) { api.finish(score); return false; }
    });
  }

  /* =========================================================
     7) PRÄZISIONS-STOPP — Balken in der Mitte stoppen (5 Runden)
     ========================================================= */
  function gamePrecision(stage, api) {
    const TIME_MS = 25000;
    const endAt = performance.now() + TIME_MS;
    let round = 0, score = 0, pos = 0, dir = 1, speed = 1.1, running = false;

    const wrap = el('div', 'precision-wrap');
    wrap.innerHTML = `
      <div class="stage-big-text" id="p-round">Runde 1 · 25s</div>
      <div class="precision-track">
        <div class="precision-target-zone"></div>
        <div class="precision-cursor" id="p-cursor"></div>
      </div>
      <button class="btn btn-stop" id="p-stop">STOPP!</button>
      <div class="precision-rounds" id="p-info">Stoppe den Balken möglichst genau in der Mitte!</div>`;
    stage.appendChild(wrap);
    const roundEl = wrap.querySelector('#p-round');
    const cursor = wrap.querySelector('#p-cursor');
    const track = wrap.querySelector('.precision-track');
    const stopBtn = wrap.querySelector('#p-stop');
    const info = wrap.querySelector('#p-info');

    function startRound() {
      round++;
      roundEl.textContent = `Runde ${round} · ${Math.max(0,((endAt-performance.now())/1000)).toFixed(1)}s`;
      pos = 0; dir = 1; speed = 1.0 + round * 0.35;
      running = true;
      stopBtn.disabled = false;
      info.textContent = 'Jetzt!';
    }

    stopBtn.addEventListener('pointerdown', () => {
      if (!running) return;
      running = false; stopBtn.disabled = true;
      const trackW = track.clientWidth;
      const cursorW = cursor.offsetWidth;
      const center = (trackW - cursorW) / 2;
      const px = pos / 100 * (trackW - cursorW);
      const dist = Math.abs(px - center);
      const half = (trackW - cursorW) / 2;
      const accuracy = 1 - dist / half;             // 1 = perfekt
      const pts = Math.max(0, Math.round(accuracy * 250));
      score += pts; api.setScore(score);
      if (accuracy > 0.92) { FX.Sound.star(); FX.toast(stage, `PERFEKT +${pts}`, '#ffd34e'); FX.burst(window.innerWidth/2, window.innerHeight*0.5, 30, 10); }
      else if (pts > 0) { FX.Sound.good(); FX.toast(stage, `+${pts}`, '#2bffb9'); }
      else { FX.Sound.bad(); FX.shake(stage); FX.toast(stage, 'Daneben', '#ff4d6d'); }
      if (performance.now() >= endAt) { info.textContent = 'Zeit!'; api.timeout(() => api.finish(score), 600); }
      else api.timeout(startRound, 900);
    });

    api.frameLoop(() => {
      if (performance.now() >= endAt && !running) { api.finish(score); return false; }
      return true;
    });

    api.frameLoop(() => {
      if (running) {
        pos += dir * speed;
        if (pos >= 100) { pos = 100; dir = -1; }
        if (pos <= 0) { pos = 0; dir = 1; }
        const trackW = track.clientWidth;
        const cursorW = cursor.offsetWidth;
        cursor.style.left = (pos / 100 * (trackW - cursorW)) + 'px';
      }
    });

    api.timeout(startRound, 600);
  }

  /* =========================================================
     8) BOMBEN-CODE — Zahlencode merken & wiederholen
     ========================================================= */
  function gameBombCode(stage, api) {
    const maxLevel = 8;
    let level = 2, score = 0, code = '', input = '', phase = 'show';

    const wrap = el('div', 'stage-center');
    wrap.innerHTML = `
      <div class="simon-info" id="b-info">Merke dir den Code…</div>
      <div class="math-question" id="b-code">💣</div>
      <div class="math-answer-display" id="b-input">&nbsp;</div>
      <div class="keypad" id="b-pad" style="visibility:hidden"></div>`;
    stage.appendChild(wrap);
    const info = wrap.querySelector('#b-info');
    const codeEl = wrap.querySelector('#b-code');
    const inputEl = wrap.querySelector('#b-input');
    const pad = wrap.querySelector('#b-pad');

    ['1','2','3','4','5','6','7','8','9','C','0','OK'].forEach(k => {
      const b = el('button', 'key' + (k === 'C' ? ' danger' : k === 'OK' ? ' ok' : ''), k === 'C' ? '⌫' : k);
      b.addEventListener('pointerdown', () => press(k));
      pad.appendChild(b);
    });

    function showCode() {
      phase = 'show';
      level = Math.min(level, maxLevel + 1);
      code = '';
      for (let i = 0; i < level; i++) code += rand(0, 9);
      input = ''; inputEl.innerHTML = '&nbsp;';
      pad.style.visibility = 'hidden';
      info.textContent = `Code merken — ${code.length} Ziffern`;
      codeEl.textContent = code;
      codeEl.style.letterSpacing = '10px';
      FX.Sound.countdown();
      api.timeout(() => {
        codeEl.textContent = '💣'; codeEl.style.letterSpacing = '0';
        info.textContent = 'Gib den Code ein!';
        pad.style.visibility = 'visible';
        phase = 'input';
      }, 1200 + level * 350);
    }

    function press(k) {
      if (phase !== 'input') return;
      if (k === 'C') input = input.slice(0, -1);
      else if (k === 'OK') return submit();
      else if (input.length < code.length) input += k;
      inputEl.textContent = input || '\u00a0';
      FX.Sound.tap();
    }
    function submit() {
      if (input.length === 0) return;
      if (input === code) {
        const pts = level * 60;
        score += pts; api.setScore(score);
        FX.Sound.good(); FX.toast(stage, `+${pts}`, '#2bffb9');
        if (level >= maxLevel) { info.textContent = 'Entschärft! 🎉'; api.timeout(() => api.finish(score), 800); return; }
        level++;
        api.timeout(showCode, 800);
      } else {
        FX.Sound.explode(); FX.shake(stage);
        codeEl.textContent = '💥';
        info.textContent = `Falsch! Code war ${code}`;
        pad.style.visibility = 'hidden';
        api.timeout(() => api.finish(score), 1400);
      }
    }

    api.timeout(showCode, 500);
  }

  /* =========================================================
     9) ZAHLEN-JAGD — Zahlen der Reihe nach finden (Schulte)
     ========================================================= */
  function gameSequence(stage, api) {
    const total = 25000;
    let score = 0, gridSize = 4, next = 1, endTime = performance.now() + total;

    const wrap = el('div', 'stage-center');
    wrap.innerHTML = `
      <div class="generic-timer-bar" id="sq-bar"></div>
      <div class="seq-info" id="sq-info">Finde die <strong>1</strong></div>
      <div class="seq-grid" id="sq-grid"></div>`;
    stage.appendChild(wrap);
    const bar = wrap.querySelector('#sq-bar');
    const info = wrap.querySelector('#sq-info');
    const grid = wrap.querySelector('#sq-grid');

    function build() {
      next = 1;
      const n = gridSize * gridSize;
      grid.style.gridTemplateColumns = `repeat(${gridSize}, 1fr)`;
      const nums = shuffle([...Array(n)].map((_, i) => i + 1));
      grid.innerHTML = '';
      nums.forEach(num => {
        const c = el('button', 'seq-cell', String(num));
        c.addEventListener('pointerdown', () => tap(num, c));
        grid.appendChild(c);
      });
      info.innerHTML = `Finde die <strong>${next}</strong>`;
    }

    function tap(num, c) {
      if (num === next) {
        score += 10; api.setScore(score);
        FX.Sound.tap(); c.classList.add('done'); c.disabled = true;
        next++;
        if (next > gridSize * gridSize) {
          score += 50; api.setScore(score);
          FX.Sound.good(); FX.toast(stage, 'Feld voll +50', '#2bffb9');
          FX.burst(window.innerWidth / 2, window.innerHeight * 0.5, 24, 10);
          gridSize = Math.min(gridSize + 1, 6);
          build();
        } else {
          info.innerHTML = `Finde die <strong>${next}</strong>`;
        }
      } else {
        endTime -= 1500; FX.Sound.bad(); FX.shake(stage); FX.toast(stage, '−1.5s', '#ff4d6d');
      }
    }

    build();
    api.frameLoop(() => {
      const rem = endTime - performance.now();
      bar.style.width = Math.max(0, rem / total * 100) + '%';
      if (rem <= 0) { api.finish(score); return false; }
    });
  }

  /* =========================================================
     10) FINDE DAS ANDERE — Odd One Out
     ========================================================= */
  function gameOddOne(stage, api) {
    const total = 22000;
    const pairs = [
      ['🙂', '😊'], ['😎', '🤓'], ['🍏', '🍐'], ['🟢', '🟩'],
      ['🔷', '🔹'], ['🌙', '⭐'], ['🐱', '🐯'], ['🍩', '🍪']
    ];
    let score = 0, streak = 0, gridN = 4, endTime = performance.now() + total, locked = false;

    const wrap = el('div', 'stage-center');
    wrap.innerHTML = `
      <div class="generic-timer-bar" id="o-bar"></div>
      <div class="math-streak" id="o-streak"></div>
      <div class="seq-info">Finde das <strong>andere</strong> Symbol!</div>
      <div class="odd-grid" id="o-grid"></div>`;
    stage.appendChild(wrap);
    const bar = wrap.querySelector('#o-bar');
    const streakEl = wrap.querySelector('#o-streak');
    const grid = wrap.querySelector('#o-grid');

    function build() {
      locked = false;
      const n = gridN * gridN;
      const pair = pairs[rand(0, pairs.length - 1)];
      const base = pair[0];
      const odd = pair[1];
      const oddIdx = rand(0, n - 1);
      grid.style.gridTemplateColumns = `repeat(${gridN}, 1fr)`;
      grid.innerHTML = '';
      for (let i = 0; i < n; i++) {
        const c = el('button', 'odd-cell', i === oddIdx ? odd : base);
        c.addEventListener('pointerdown', () => pick(i === oddIdx, c));
        grid.appendChild(c);
      }
    }

    function pick(isOdd, c) {
      if (locked) return;
      if (isOdd) {
        locked = true; streak++;
        const pts = 15 + Math.min(streak, 8) * 3;
        score += pts; api.setScore(score);
        FX.Sound.correct(); FX.toast(stage, `+${pts}`, '#2bffb9');
        streakEl.textContent = streak > 1 ? `🔥 ${streak}x Combo` : '';
        c.classList.add('correct');
        if (streak % 2 === 0) gridN = Math.min(gridN + 1, 7);
        api.timeout(build, 220);
      } else {
        streak = 0; streakEl.textContent = '';
        endTime -= 2000; FX.Sound.bad(); FX.shake(stage); FX.toast(stage, '−2s', '#ff4d6d');
        c.classList.add('wrong'); c.disabled = true;
      }
    }

    build();
    api.frameLoop(() => {
      const rem = endTime - performance.now();
      bar.style.width = Math.max(0, rem / total * 100) + '%';
      if (rem <= 0) { api.finish(score); return false; }
    });
  }

  /* =========================================================
     13) COUNT-VISION — Zähle die Zielsymbole
     ========================================================= */
  function gameCountVision(stage, api) {
    const total = 22000;
    let score = 0, streak = 0, endTime = performance.now() + total, answer = 0, locked = false;
    const symbols = ['⭐', '🍀', '🎈', '⚡', '🎲', '🍕', '🚀'];

    const wrap = el('div', 'stage-center');
    wrap.innerHTML = `
      <div class="generic-timer-bar" id="cv-bar"></div>
      <div class="math-streak" id="cv-streak"></div>
      <div class="seq-info" id="cv-title">Zähle die Zielsymbole</div>
      <div class="seq-grid" id="cv-grid"></div>
      <div class="choice-grid" id="cv-choices"></div>`;
    stage.appendChild(wrap);
    const bar = wrap.querySelector('#cv-bar');
    const streakEl = wrap.querySelector('#cv-streak');
    const title = wrap.querySelector('#cv-title');
    const grid = wrap.querySelector('#cv-grid');
    const choices = wrap.querySelector('#cv-choices');

    function nextRound() {
      locked = false;
      const target = symbols[rand(0, symbols.length - 1)];
      const n = 16;
      const arr = [];
      answer = rand(3, 8);
      for (let i = 0; i < answer; i++) arr.push(target);
      while (arr.length < n) {
        const s = symbols[rand(0, symbols.length - 1)];
        arr.push(s === target ? symbols[(symbols.indexOf(s) + 1) % symbols.length] : s);
      }
      shuffle(arr);
      title.innerHTML = `Wie oft siehst du <strong>${target}</strong>?`;
      grid.style.gridTemplateColumns = 'repeat(4, 1fr)';
      grid.innerHTML = '';
      arr.forEach(s => grid.appendChild(el('button', 'seq-cell', s)));

      const opts = new Set([answer]);
      while (opts.size < 4) {
        const v = Math.max(0, answer + rand(-3, 3));
        opts.add(v === answer ? answer + 1 : v);
      }
      const list = shuffle([...opts]).slice(0, 4);
      choices.innerHTML = '';
      list.forEach(v => {
        const b = el('button', 'choice-btn', String(v));
        b.addEventListener('pointerdown', () => choose(v, b));
        choices.appendChild(b);
      });
    }

    function choose(v, btn) {
      if (locked) return;
      if (v === answer) {
        locked = true;
        streak++;
        const pts = 18 + Math.min(10, streak) * 2;
        score += pts; api.setScore(score);
        btn.classList.add('correct');
        FX.Sound.correct(); FX.toast(stage, `+${pts}`, '#2bffb9');
        streakEl.textContent = streak > 1 ? `🔥 ${streak}x Combo` : '';
        api.timeout(nextRound, 260);
      } else {
        streak = 0; streakEl.textContent = '';
        endTime -= 1800;
        btn.classList.add('wrong');
        btn.disabled = true;
        FX.Sound.bad(); FX.shake(stage); FX.toast(stage, '−1.8s', '#ff4d6d');
      }
    }

    nextRound();
    api.frameLoop(() => {
      const rem = endTime - performance.now();
      bar.style.width = Math.max(0, rem / total * 100) + '%';
      if (rem <= 0) { api.finish(score); return false; }
    });
  }

  /* =========================================================
     14) REFLEX-LANES — Tippe nur das Zielsymbol
     ========================================================= */
  function gameReflexLanes(stage, api) {
    const total = 20000;
    let score = 0, endTime = performance.now() + total;
    const target = ['⭐', '⚡', '🎯', '🍀'][rand(0, 3)];

    const wrap = el('div', 'stage-center');
    wrap.innerHTML = `
      <div class="generic-timer-bar" id="rl-bar"></div>
      <div class="seq-info">Tippe nur: <strong>${target}</strong></div>
      <div class="odd-grid" id="rl-grid"></div>`;
    stage.appendChild(wrap);
    const bar = wrap.querySelector('#rl-bar');
    const grid = wrap.querySelector('#rl-grid');
    grid.style.gridTemplateColumns = 'repeat(4, 1fr)';

    const pool = ['⭐', '⚡', '🎯', '🍀', '💣', '🧊'];

    function spawn() {
      const cells = 16;
      grid.innerHTML = '';
      for (let i = 0; i < cells; i++) {
        const s = pool[rand(0, pool.length - 1)];
        const c = el('button', 'odd-cell', s);
        c.addEventListener('pointerdown', () => {
          if (s === target) {
            score += 14;
            api.setScore(score);
            c.classList.add('correct');
            FX.Sound.tap();
          } else if (s === '💣') {
            score = Math.max(0, score - 30);
            api.setScore(score);
            c.classList.add('wrong');
            FX.Sound.explode(); FX.shake(stage);
          } else {
            score = Math.max(0, score - 8);
            api.setScore(score);
            c.classList.add('wrong');
            FX.Sound.bad();
          }
        }, { once: true });
        grid.appendChild(c);
      }
    }

    spawn();
    api.interval(() => {
      if (performance.now() < endTime) spawn();
    }, 1100);
    api.frameLoop(() => {
      const rem = endTime - performance.now();
      bar.style.width = Math.max(0, rem / total * 100) + '%';
      if (rem <= 0) { api.finish(score); return false; }
    });
  }

  /* =========================================================
     11) PFEIL-WIRBEL — drücke die passende Richtung
     ========================================================= */
  function gameArrows(stage, api) {
    const total = 20000;
    const dirs = [
      { k: 'up', s: '⬆️' }, { k: 'down', s: '⬇️' },
      { k: 'left', s: '⬅️' }, { k: 'right', s: '➡️' }
    ];
    let score = 0, streak = 0, target = null, endTime = performance.now() + total;

    const wrap = el('div', 'stage-center');
    wrap.innerHTML = `
      <div class="generic-timer-bar" id="ar-bar"></div>
      <div class="math-streak" id="ar-streak"></div>
      <div class="arrow-display" id="ar-disp">➡️</div>
      <div class="arrow-pad">
        <button class="arrow-btn" data-k="up" style="grid-area:up">⬆️</button>
        <button class="arrow-btn" data-k="left" style="grid-area:left">⬅️</button>
        <button class="arrow-btn" data-k="right" style="grid-area:right">➡️</button>
        <button class="arrow-btn" data-k="down" style="grid-area:down">⬇️</button>
      </div>`;
    stage.appendChild(wrap);
    const bar = wrap.querySelector('#ar-bar');
    const disp = wrap.querySelector('#ar-disp');
    const streakEl = wrap.querySelector('#ar-streak');

    wrap.querySelectorAll('.arrow-btn').forEach(b => {
      b.addEventListener('pointerdown', () => press(b.dataset.k));
    });

    function newArrow() {
      target = dirs[rand(0, 3)];
      disp.textContent = target.s;
    }
    function press(k) {
      if (k === target.k) {
        streak++;
        const pts = 10 + Math.min(streak, 10) * 2;
        score += pts; api.setScore(score);
        FX.Sound.tap(); FX.toast(stage, `+${pts}`, '#2bffb9');
        streakEl.textContent = streak > 1 ? `🔥 ${streak}x Combo` : '';
        newArrow();
      } else {
        streak = 0; streakEl.textContent = '';
        endTime -= 1500; FX.Sound.bad(); FX.shake(stage); FX.toast(stage, '−1.5s', '#ff4d6d');
      }
    }

    newArrow();
    api.frameLoop(() => {
      const rem = endTime - performance.now();
      bar.style.width = Math.max(0, rem / total * 100) + '%';
      if (rem <= 0) { api.finish(score); return false; }
    });
  }

  /* =========================================================
     12) HÖHER ODER TIEFER — errate die nächste Zahl
     ========================================================= */
  function gameHighLow(stage, api) {
    const total = 22000;
    let score = 0, streak = 0, currentNum = rand(2, 99), endTime = performance.now() + total, locked = false;

    const wrap = el('div', 'stage-center');
    wrap.innerHTML = `
      <div class="generic-timer-bar" id="hl-bar"></div>
      <div class="math-streak" id="hl-streak"></div>
      <div class="seq-info">Ist die nächste Zahl höher oder tiefer?</div>
      <div class="highlow-card" id="hl-card">${currentNum}</div>
      <div class="highlow-buttons">
        <button class="hl-btn up" id="hl-up">⬆️ Höher</button>
        <button class="hl-btn down" id="hl-down">⬇️ Tiefer</button>
      </div>`;
    stage.appendChild(wrap);
    const bar = wrap.querySelector('#hl-bar');
    const card = wrap.querySelector('#hl-card');
    const streakEl = wrap.querySelector('#hl-streak');

    wrap.querySelector('#hl-up').addEventListener('pointerdown', () => guess('up'));
    wrap.querySelector('#hl-down').addEventListener('pointerdown', () => guess('down'));

    function guess(dir) {
      if (locked) return;
      locked = true;
      let nextNum; do { nextNum = rand(1, 100); } while (nextNum === currentNum);
      const higher = nextNum > currentNum;
      const right = (dir === 'up' && higher) || (dir === 'down' && !higher);
      card.textContent = nextNum;
      card.classList.add(right ? 'flash-good' : 'flash-bad');
      if (right) {
        streak++;
        const pts = 12 + Math.min(streak, 10) * 3;
        score += pts; api.setScore(score);
        FX.Sound.correct(); FX.toast(stage, `+${pts}`, '#2bffb9');
        streakEl.textContent = streak > 1 ? `🔥 ${streak}x Combo` : '';
      } else {
        streak = 0; streakEl.textContent = '';
        endTime -= 2000; FX.Sound.bad(); FX.shake(stage); FX.toast(stage, '−2s', '#ff4d6d');
      }
      currentNum = nextNum;
      api.timeout(() => { card.classList.remove('flash-good', 'flash-bad'); locked = false; }, 450);
    }

    api.frameLoop(() => {
      const rem = endTime - performance.now();
      bar.style.width = Math.max(0, rem / total * 100) + '%';
      if (rem <= 0) { api.finish(score); return false; }
    });
  }

  /* =========================================================
     QUICK QUIZ ENGINE — Basis für viele neue Mini-Spiele
     ========================================================= */
  const QUIZ_POOL_SIZE = 1000;
  const QUIZ_QUESTIONS_PER_ROUND = 5;
  const quizBankCache = new Map();
  const quizBankCursor = new Map();

  function normalizeQuizRound(round) {
    if (!round || typeof round.prompt !== 'string' || !Array.isArray(round.choices) || round.choices.length < 2) return null;
    let items = round.choices.map(c => {
      if (typeof c === 'string') return { label: c, ok: c === round.correct };
      return { label: String(c && c.label != null ? c.label : ''), ok: !!(c && c.ok) };
    }).filter(c => c.label.length > 0);
    if (items.length < 2) return null;
    if (!items.some(c => c.ok) && round.correct != null) {
      const corr = String(round.correct);
      items = items.map(c => ({ ...c, ok: c.label === corr }));
    }
    if (!items.some(c => c.ok)) {
      items[0].ok = true;
    }
    return { prompt: round.prompt, choices: items };
  }

  function getQuizBank(cfg) {
    const key = cfg.id || cfg.title || 'quiz';
    if (quizBankCache.has(key)) return quizBankCache.get(key);

    if (Array.isArray(cfg.questionPool) && cfg.questionPool.length) {
      const normalizedPool = cfg.questionPool
        .map(normalizeQuizRound)
        .filter(Boolean);
      if (!normalizedPool.length) return [];
      const bank = [];
      for (let i = 0; i < QUIZ_POOL_SIZE; i++) {
        bank.push(normalizedPool[i % normalizedPool.length]);
      }
      quizBankCache.set(key, bank);
      return bank;
    }

    const bank = [];
    const seen = new Set();
    let guard = 0;
    while (bank.length < QUIZ_POOL_SIZE && guard < QUIZ_POOL_SIZE * 40) {
      guard++;
      const normalized = normalizeQuizRound(cfg.makeRound());
      if (!normalized) continue;
      const sig = `${normalized.prompt}||${normalized.choices.map(c => `${c.label}:${c.ok ? 1 : 0}`).join('|')}`;
      if (seen.has(sig)) continue;
      seen.add(sig);
      bank.push(normalized);
    }

    while (bank.length < QUIZ_POOL_SIZE) {
      const normalized = normalizeQuizRound(cfg.makeRound());
      if (!normalized) continue;
      bank.push(normalized);
    }

    quizBankCache.set(key, bank);
    return bank;
  }

  function hashString(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function makeSeededRng(seed) {
    let s = (seed >>> 0) || 1;
    return function next() {
      s = (Math.imul(1664525, s) + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  function pickQuizSet(cfg, amount, stableSeed) {
    const key = cfg.id || cfg.title || 'quiz';
    const bank = getQuizBank(cfg);
    if (!bank.length) return [];

    if (Number.isFinite(stableSeed)) {
      const rng = makeSeededRng((stableSeed >>> 0) ^ hashString(key));
      const count = Math.max(1, Math.min(amount, bank.length));
      const out = [];
      const used = new Set();
      let guard = 0;
      while (out.length < count && guard < count * 20) {
        guard++;
        const idx = Math.floor(rng() * bank.length);
        if (used.has(idx)) continue;
        used.add(idx);
        out.push(bank[idx]);
      }
      while (out.length < count) out.push(bank[out.length % bank.length]);
      return out;
    }

    const start = quizBankCursor.get(key) || 0;
    const picked = [];
    for (let i = 0; i < amount; i++) {
      picked.push(bank[(start + i) % bank.length]);
    }
    quizBankCursor.set(key, (start + amount) % bank.length);
    return picked;
  }

  function runQuizRush(stage, api, cfg, runMeta = {}) {
    const totalQuestions = cfg.questionsPerRound || QUIZ_QUESTIONS_PER_ROUND;
    const TIME_MS = cfg.total || 25000;
    const endAt = performance.now() + TIME_MS;
    let correctCount = 0;
    let streak = 0;
    let questionIndex = 0;
    let locked = false;
    let finished = false;
    const rounds = pickQuizSet(cfg, totalQuestions, runMeta.quizSeed);

    const wrap = el('div', 'stage-center');
    wrap.innerHTML = `
      <div class="generic-timer-bar" id="qz-bar"></div>
      <div class="math-streak" id="qz-streak"></div>
      <div class="seq-info" id="qz-title">${cfg.title || 'Quiz-Rush'} · ${totalQuestions} Fragen</div>
      <div class="seq-info" id="qz-progress">Frage 1 / ${totalQuestions}</div>
      <div class="math-question" id="qz-prompt">Bereit…</div>
      <div class="choice-grid" id="qz-choices"></div>`;
    stage.appendChild(wrap);
    const bar = wrap.querySelector('#qz-bar');
    const streakEl = wrap.querySelector('#qz-streak');
    const progressEl = wrap.querySelector('#qz-progress');
    const prompt = wrap.querySelector('#qz-prompt');
    const choices = wrap.querySelector('#qz-choices');

    function updateProgress() {
      const timeFrac = Math.max(0, (endAt - performance.now()) / TIME_MS);
      bar.style.width = `${timeFrac * 100}%`;
      if (progressEl) {
        const shown = Math.min(totalQuestions, questionIndex + 1);
        progressEl.textContent = `Frage ${shown} / ${totalQuestions}`;
      }
    }

    function nextRound() {
      if (finished) return;
      if (performance.now() >= endAt || questionIndex >= totalQuestions) {
        finished = true;
        if (progressEl) progressEl.textContent = `Fertig: ${correctCount} / ${totalQuestions} richtig`;
        api.finish(correctCount);
        return;
      }
      locked = false;
      const round = rounds[questionIndex];
      prompt.innerHTML = round.prompt;
      const items = round.choices;
      choices.innerHTML = '';
      items.forEach(item => {
        const b = el('button', 'choice-btn', item.label);
        b.addEventListener('pointerdown', () => choose(item.ok, b));
        choices.appendChild(b);
      });
    }

    function choose(ok, btn) {
      if (locked || finished) return;
      locked = true;
      if (ok) {
        streak++;
        correctCount++;
        api.setScore(correctCount);
        btn.classList.add('correct');
        streakEl.textContent = streak > 1 ? `🔥 ${streak}x Combo` : '';
        FX.Sound.correct(); FX.toast(stage, '+1 richtig', '#2bffb9');
      } else {
        streak = 0;
        streakEl.textContent = '';
        btn.classList.add('wrong');
        FX.Sound.bad(); FX.shake(stage); FX.toast(stage, 'Falsch', '#ff4d6d');
      }

      questionIndex++;
      updateProgress();
      api.timeout(nextRound, 260);
    }

    updateProgress();
    nextRound();

    api.frameLoop(() => {
      if (finished) return false;
      const timeFrac = Math.max(0, (endAt - performance.now()) / TIME_MS);
      bar.style.width = `${timeFrac * 100}%`;
      if (performance.now() >= endAt) { nextRound(); return false; }
      return true;
    });
  }

  function gameEvenOdd(stage, api) {
    runQuizRush(stage, api, {
      title: 'Gerade oder Ungerade?', total: 19000, makeRound() {
        const n = rand(10, 999);
        const even = n % 2 === 0;
        return {
          prompt: `${n} ist …?`,
          choices: [{ label: 'Gerade', ok: even }, { label: 'Ungerade', ok: !even }],
        };
      },
    });
  }

  function gamePrimeHunter(stage, api) {
    const primes = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47];
    runQuizRush(stage, api, {
      title: 'Primzahl-Jagd', total: 21000, makeRound() {
        const correct = primes[rand(0, primes.length - 1)];
        const options = new Set([correct]);
        while (options.size < 4) {
          const v = rand(4, 60);
          if (!primes.includes(v)) options.add(v);
        }
        const arr = shuffle([...options]);
        return { prompt: 'Welche Zahl ist eine <strong>Primzahl</strong>?', choices: arr.map(v => ({ label: String(v), ok: v === correct })) };
      },
    });
  }

  function gameBiggerNumber(stage, api) {
    runQuizRush(stage, api, {
      title: 'Wer ist größer?', total: 20000, makeRound() {
        const a = rand(10, 99), b = rand(10, 99);
        return {
          prompt: `Welche Zahl ist größer? <strong>${a}</strong> vs <strong>${b}</strong>`,
          choices: [{ label: String(a), ok: a > b }, { label: String(b), ok: b > a }],
        };
      },
    });
  }

  function gameSmallerNumber(stage, api) {
    runQuizRush(stage, api, {
      title: 'Wer ist kleiner?', total: 20000, makeRound() {
        const a = rand(10, 99), b = rand(10, 99);
        return {
          prompt: `Welche Zahl ist kleiner? <strong>${a}</strong> vs <strong>${b}</strong>`,
          choices: [{ label: String(a), ok: a < b }, { label: String(b), ok: b < a }],
        };
      },
    });
  }

  function gameDiceSum(stage, api) {
    runQuizRush(stage, api, {
      title: 'Würfel-Summe', total: 22000, makeRound() {
        const a = rand(1, 6), b = rand(1, 6), sum = a + b;
        const options = new Set([sum]);
        while (options.size < 4) options.add(Math.max(2, Math.min(12, sum + rand(-3, 3))));
        const arr = shuffle([...options]);
        return {
          prompt: `🎲 ${a} + 🎲 ${b} = ?`,
          choices: arr.map(v => ({ label: String(v), ok: v === sum })),
        };
      },
    });
  }

  function gameFractionSnap(stage, api) {
    const modes = [
      { t: '50%', f: n => n / 2 },
      { t: '25%', f: n => n / 4 },
      { t: '10%', f: n => n / 10 },
    ];
    runQuizRush(stage, api, {
      title: 'Prozent-Snap', total: 22000, makeRound() {
        const m = modes[rand(0, modes.length - 1)];
        const base = [20, 40, 60, 80, 100, 120, 140][rand(0, 6)];
        const correct = m.f(base);
        const options = new Set([correct]);
        while (options.size < 4) options.add(Math.max(1, correct + rand(-12, 12)));
        const arr = shuffle([...options]);
        return {
          prompt: `Wie viel sind <strong>${m.t}</strong> von ${base}?`,
          choices: arr.map(v => ({ label: String(v), ok: v === correct })),
        };
      },
    });
  }

  function gameMissingNumber(stage, api) {
    runQuizRush(stage, api, {
      title: 'Fehlende Zahl', total: 22000, makeRound() {
        const start = rand(1, 20), step = rand(2, 8), miss = rand(1, 4);
        const seq = [0, 1, 2, 3, 4].map(i => start + i * step);
        const correct = seq[miss];
        const shown = seq.map((v, i) => i === miss ? '?' : v).join(' · ');
        const options = new Set([correct]);
        while (options.size < 4) options.add(correct + rand(-10, 10));
        const arr = shuffle([...options]);
        return {
          prompt: `Finde die fehlende Zahl:<br><strong>${shown}</strong>`,
          choices: arr.map(v => ({ label: String(v), ok: v === correct })),
        };
      },
    });
  }

  function gameNextSequence(stage, api) {
    runQuizRush(stage, api, {
      title: 'Nächstes Glied', total: 22000, makeRound() {
        const type = rand(0, 1);
        if (type === 0) {
          const start = rand(2, 14), mul = rand(2, 4);
          const seq = [start, start * mul, start * mul * mul];
          const correct = start * mul * mul * mul;
          const options = shuffle([correct, correct + mul, correct - mul, correct + mul * 2]);
          return {
            prompt: `Was kommt als Nächstes? <strong>${seq.join(' · ')}</strong>`,
            choices: options.map(v => ({ label: String(v), ok: v === correct })),
          };
        }
        const a = rand(1, 8), b = rand(2, 6), c = rand(7, 12);
        const correct = a + b + c;
        const options = shuffle([correct, correct + 2, correct - 3, correct + 5]);
        return {
          prompt: `Nächstes Glied: <strong>${a} · ${a + b} · ${a + b + c}</strong>`,
          choices: options.map(v => ({ label: String(v), ok: v === correct })),
        };
      },
    });
  }

  function gameWordLength(stage, api) {
    const words = ['Katze', 'Flugzeug', 'Schmetterling', 'Baum', 'Rakete', 'Mikroskop', 'Regenschirm', 'Komet'];
    runQuizRush(stage, api, {
      title: 'Wortlängen-Duell', total: 21000, makeRound() {
        const pick = shuffle(words.slice()).slice(0, 4);
        const correct = pick.reduce((a, b) => b.length > a.length ? b : a, pick[0]);
        return {
          prompt: 'Welches Wort ist am <strong>längsten</strong>?',
          choices: shuffle(pick).map(w => ({ label: w, ok: w === correct })),
        };
      },
    });
  }

  function gameAlphabet(stage, api) {
    runQuizRush(stage, api, {
      title: 'Alphabet-Blitz', total: 21000, makeRound() {
        const c = String.fromCharCode(rand(65, 88));
        const correct = String.fromCharCode(c.charCodeAt(0) + 1);
        const options = shuffle([correct, String.fromCharCode(c.charCodeAt(0) + 2), String.fromCharCode(c.charCodeAt(0) - 1), String.fromCharCode(c.charCodeAt(0) + 3)]);
        return {
          prompt: `Welcher Buchstabe kommt nach <strong>${c}</strong>?`,
          choices: options.map(v => ({ label: v, ok: v === correct })),
        };
      },
    });
  }

  function gameCompass(stage, api) {
    const dirs = ['Norden', 'Osten', 'Sueden', 'Westen'];
    runQuizRush(stage, api, {
      title: 'Kompass-Rush', total: 20000, makeRound() {
        const idx = rand(0, 3);
        const correct = dirs[(idx + 1) % 4];
        return {
          prompt: `Was ist 90° im Uhrzeigersinn von <strong>${dirs[idx]}</strong>?`,
          choices: shuffle(dirs).map(v => ({ label: v, ok: v === correct })),
        };
      },
    });
  }

  function gameColorCount(stage, api) {
    const blocks = ['🟥', '🟦', '🟩', '🟨'];
    runQuizRush(stage, api, {
      title: 'Farb-Zaehler', total: 22000, makeRound() {
        const target = blocks[rand(0, 3)];
        const n = 12;
        const cnt = rand(3, 7);
        const arr = [];
        for (let i = 0; i < cnt; i++) arr.push(target);
        while (arr.length < n) {
          const b = blocks[rand(0, 3)];
          arr.push(b === target ? blocks[(blocks.indexOf(b) + 1) % 4] : b);
        }
        shuffle(arr);
        const options = shuffle([cnt, cnt + 1, Math.max(0, cnt - 1), cnt + 2]);
        return {
          prompt: `Wie oft kommt <strong>${target}</strong> vor?<br>${arr.join(' ')}`,
          choices: options.map(v => ({ label: String(v), ok: v === cnt })),
        };
      },
    });
  }

  function gameCompareSums(stage, api) {
    runQuizRush(stage, api, {
      title: 'Summen-Duell', total: 22000, makeRound() {
        const a = rand(1, 9), b = rand(1, 9), c = rand(1, 9), d = rand(1, 9);
        const l = a + b, r = c + d;
        const correct = l === r ? '=' : (l > r ? '>' : '<');
        return {
          prompt: `${a}+${b} ? ${c}+${d}`,
          choices: [{ label: '<', ok: correct === '<' }, { label: '=', ok: correct === '=' }, { label: '>', ok: correct === '>' }],
        };
      },
    });
  }

  function gameEstimate(stage, api) {
    runQuizRush(stage, api, {
      title: 'Naeheste Zahl', total: 21000, makeRound() {
        const target = rand(100, 999);
        const options = shuffle([target + rand(-12, 12), target + rand(-60, -20), target + rand(20, 60), target + rand(70, 120)]);
        const best = options.reduce((bestVal, v) => Math.abs(v - target) < Math.abs(bestVal - target) ? v : bestVal, options[0]);
        return {
          prompt: `Welche Zahl liegt am naechsten bei <strong>${target}</strong>?`,
          choices: options.map(v => ({ label: String(v), ok: v === best })),
        };
      },
    });
  }

  function gameRoman(stage, api) {
    const rows = [['I', 1], ['V', 5], ['X', 10], ['L', 50], ['C', 100]];
    runQuizRush(stage, api, {
      title: 'Roemische Zahlen', total: 21000, makeRound() {
        const r = rows[rand(0, rows.length - 1)];
        const options = shuffle([r[1], r[1] + 1, Math.max(1, r[1] - 1), r[1] * 2]);
        return {
          prompt: `Wofuer steht <strong>${r[0]}</strong>?`,
          choices: options.map(v => ({ label: String(v), ok: v === r[1] })),
        };
      },
    });
  }

  function gameMirrorArrow(stage, api) {
    const arrows = [
      { s: '⬅️', m: '➡️' }, { s: '➡️', m: '⬅️' },
      { s: '↖️', m: '↗️' }, { s: '↗️', m: '↖️' },
      { s: '↙️', m: '↘️' }, { s: '↘️', m: '↙️' }
    ];
    runQuizRush(stage, api, {
      title: 'Spiegel-Pfeil', total: 21000, makeRound() {
        const a = arrows[rand(0, arrows.length - 1)];
        const opts = shuffle([a.m, arrows[rand(0, arrows.length - 1)].m, arrows[rand(0, arrows.length - 1)].m, arrows[rand(0, arrows.length - 1)].m]);
        return {
          prompt: `Welcher Pfeil ist das Spiegelbild von <strong>${a.s}</strong>?`,
          choices: opts.map(v => ({ label: v, ok: v === a.m })),
        };
      },
    });
  }

  function gameEmojiClass(stage, api) {
    const sets = [
      { q: 'Welches ist ein Tier?', options: ['🐘', '🍕', '🚗', '🎸'], a: '🐘' },
      { q: 'Welches ist ein Essen?', options: ['🌮', '🛰️', '🧱', '🎯'], a: '🌮' },
      { q: 'Welches ist ein Fahrzeug?', options: ['🚲', '🌲', '🎁', '📌'], a: '🚲' },
      { q: 'Welches ist ein Instrument?', options: ['🎻', '🧊', '🧸', '🪵'], a: '🎻' },
    ];
    runQuizRush(stage, api, {
      title: 'Emoji-Kategorie', total: 20000, makeRound() {
        const s = sets[rand(0, sets.length - 1)];
        return { prompt: s.q, choices: shuffle(s.options).map(v => ({ label: v, ok: v === s.a })) };
      },
    });
  }

  function gameClock(stage, api) {
    runQuizRush(stage, api, {
      title: 'Uhrzeit-Plus', total: 22000, makeRound() {
        const h = rand(1, 11), m = [0, 15, 30, 45][rand(0, 3)], add = [15, 30, 45][rand(0, 2)];
        const totalMin = (h * 60 + m + add) % (12 * 60);
        const nh = Math.floor(totalMin / 60) || 12;
        const nm = totalMin % 60;
        const correct = `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
        const opts = shuffle([correct,
          `${String(h).padStart(2, '0')}:${String((m + add + 15) % 60).padStart(2, '0')}`,
          `${String((h % 12) + 1).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
          `${String(h).padStart(2, '0')}:${String((m + 30) % 60).padStart(2, '0')}`]);
        return {
          prompt: `Startzeit <strong>${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}</strong>, plus ${add} min = ?`,
          choices: opts.map(v => ({ label: v, ok: v === correct })),
        };
      },
    });
  }

  function gameRemainder(stage, api) {
    runQuizRush(stage, api, {
      title: 'Restrechner', total: 21000, makeRound() {
        const a = rand(12, 99), b = rand(2, 9);
        const r = a % b;
        const opts = shuffle([r, (r + 1) % b, (r + 2) % b, (r + b - 1) % b]);
        return {
          prompt: `Welchen Rest hat <strong>${a} : ${b}</strong>?`,
          choices: opts.map(v => ({ label: String(v), ok: v === r })),
        };
      },
    });
  }

  function gameMathChain(stage, api) {
    runQuizRush(stage, api, {
      title: 'Rechenkette', total: 22000, makeRound() {
        const a = rand(2, 20), b = rand(2, 20), c = rand(2, 12);
        const correct = a + b - c;
        const opts = shuffle([correct, correct + 2, correct - 3, correct + 5]);
        return {
          prompt: `<strong>${a} + ${b} − ${c}</strong> = ?`,
          choices: opts.map(v => ({ label: String(v), ok: v === correct })),
        };
      },
    });
  }

  function gameDoubleTrouble(stage, api) {
    runQuizRush(stage, api, {
      title: 'Verdoppeln!', total: 19000, makeRound() {
        const n = rand(3, 70);
        const correct = n * 2;
        const opts = shuffle([correct, n * 2 + 4, n * 2 - 6, n + 2]);
        return {
          prompt: `Was ist das Doppelte von <strong>${n}</strong>?`,
          choices: opts.map(v => ({ label: String(v), ok: v === correct })),
        };
      },
    });
  }

  function gameTripleThreat(stage, api) {
    runQuizRush(stage, api, {
      title: 'Dreifach-Alarm', total: 19000, makeRound() {
        const n = rand(2, 35);
        const correct = n * 3;
        const opts = shuffle([correct, n * 3 + 3, n * 3 - 3, n * 2]);
        return {
          prompt: `Was ist das Dreifache von <strong>${n}</strong>?`,
          choices: opts.map(v => ({ label: String(v), ok: v === correct })),
        };
      },
    });
  }

  function gameNumberMemory(stage, api) {
    const total = 20000;
    let score = 0, endTime = performance.now() + total;

    const wrap = el('div', 'stage-center');
    wrap.innerHTML = `
      <div class="generic-timer-bar" id="nm-bar"></div>
      <div class="seq-info" id="nm-info">Merke dir die Zahl!</div>
      <div class="math-question" id="nm-number">---</div>
      <div class="choice-grid" id="nm-choices"></div>`;
    stage.appendChild(wrap);
    const bar = wrap.querySelector('#nm-bar');
    const info = wrap.querySelector('#nm-info');
    const numEl = wrap.querySelector('#nm-number');
    const choices = wrap.querySelector('#nm-choices');

    function round() {
      const n = rand(100, 999);
      numEl.textContent = String(n);
      info.textContent = 'Merken…';
      choices.innerHTML = '';
      api.timeout(() => {
        numEl.textContent = '???';
        info.textContent = 'Welche Zahl war es?';
        const opts = shuffle([n, n + rand(4, 25), n - rand(4, 25), n + rand(26, 55)]);
        opts.forEach(v => {
          const b = el('button', 'choice-btn', String(v));
          b.addEventListener('pointerdown', () => {
            if (v === n) {
              score += 24;
              api.setScore(score);
              FX.Sound.correct();
              FX.toast(stage, '+24', '#2bffb9');
            } else {
              endTime -= 1800;
              FX.Sound.bad(); FX.shake(stage); FX.toast(stage, '−1.8s', '#ff4d6d');
            }
            round();
          }, { once: true });
          choices.appendChild(b);
        });
      }, 900);
    }

    round();
    api.frameLoop(() => {
      const rem = endTime - performance.now();
      bar.style.width = Math.max(0, rem / total * 100) + '%';
      if (rem <= 0) { api.finish(score); return false; }
    });
  }

  /* =========================================================
     TOWER STACK — Bausteine stapeln, Timing-basiert (Stack/Ketchapp)
     Block bewegt sich hin und her, tippen plaziert ihn.
     Ueberlappung bestimmt Score und neue Breite.
     Perfekte Platzierung → Breite bleibt, Bonus-Punkte.
     Keine Ueberlappung → Game Over.
     Kein Zeitlimit — Spiel dauert bis Game Over.
     ========================================================= */
  function gameTowerStack(stage, api) {
    /* Logik aus tower-stack-logic-browser.js (getestet) */
    const L = window.TowerStackLogic;
    if (!L) { api.finish(0); return; }

    /* Konfiguration */
    const STAGE_W = () => stage.clientWidth;
    const BASE_WIDTH_FRAC = 0.55;   /* Basisbreite = 55% der Stage */
    const MIN_WIDTH_PX = 24;        /* Mindestbreite fuer Spielbarkeit */
    const BLOCK_HEIGHT = 28;        /* visuelle Hoehe eines Blocks */
    const TOWER_BOTTOM_FRAC = 0.82; /* Basis bei 82% der Stage-Hoehe */
    const SPEED_START = 0.55;       /* Bewegungsgeschwindigkeit (px/ms * 1000) */
    const SPEED_INC = 0.06;         /* Geschwindigkeitszunahme pro Level */
    const MAX_SPEED = 1.8;
    const PERFECT_TOL = 3;          /* Toleranz fuer Perfect-Feedback (px) */

    /* Spielzustand */
    const baseW = Math.round(STAGE_W() * BASE_WIDTH_FRAC);
    const baseX = Math.round((STAGE_W() - baseW) / 2);
    const state = L.createTowerState({ baseWidth: baseW, baseX: baseX, minWidth: MIN_WIDTH_PX });

    /* Bewegungs-Block */
    let movingX = 0;
    let moveDir = 1;
    let speed = SPEED_START;
    let canPlace = false;
    let cameraY = 0;       /* virtueller Kamera-Verschiebung nach oben */
    let finished = false;

    /* DOM */
    const wrap = el('div', 'tower-wrap');
    wrap.innerHTML = `
      <div class="tower-hud">
        <span class="tower-score" id="ts-score">0</span>
        <span class="tower-level" id="ts-level">Hoehe: 0</span>
      </div>
      <div class="tower-canvas" id="ts-canvas">
        <div class="tower-blocks" id="ts-blocks"></div>
        <div class="tower-moving" id="ts-moving"></div>
      </div>
      <div class="tower-instruction" id="ts-instruct">Tippe zum Stapeln!</div>`;
    stage.appendChild(wrap);

    const canvas = wrap.querySelector('#ts-canvas');
    const blocksEl = wrap.querySelector('#ts-blocks');
    const movingEl = wrap.querySelector('#ts-moving');
    const scoreEl = wrap.querySelector('#ts-score');
    const levelEl = wrap.querySelector('#ts-level');
    const instructEl = wrap.querySelector('#ts-instruct');

    /* Farbe fuer Block-Level (Zyklus durch Palette) */
    const COLORS = [
      '#ff3cac', '#7b2ff7', '#00f0ff', '#2bffb9',
      '#ffd34e', '#ff9e5e', '#3a86ff', '#ff4d6d',
    ];
    function colorFor(level) { return COLORS[level % COLORS.length]; }

    /* Basis-Block rendern */
    function renderBlock(block, level, yOffset) {
      const div = el('div', 'tower-block');
      div.style.width = block.width + 'px';
      div.style.left = block.x + 'px';
      div.style.background = colorFor(level);
      div.style.bottom = yOffset + 'px';
      blocksEl.appendChild(div);
      return div;
    }

    /* Initialer Basis-Block */
    renderBlock(state.blocks[0], 0, 0);

    /* Neuen Bewegungs-Block starten */
    function startMovingBlock() {
      if (finished) return;
      const prev = state.blocks[state.blocks.length - 1];
      movingX = 0;
      moveDir = 1;
      speed = Math.min(MAX_SPEED, SPEED_START + state.level * SPEED_INC);
      movingEl.style.width = prev.width + 'px';
      movingEl.style.background = colorFor(state.level + 1);
      movingEl.style.display = 'block';
      canPlace = true;
    }

    /* Block platzieren */
    function place() {
      if (!canPlace || finished) return;
      canPlace = false;
      movingEl.style.display = 'none';

      const prev = state.blocks[state.blocks.length - 1];
      /* x-Position relativ zur Stage-Breite */
      const placeX = Math.round(movingX * (STAGE_W() - prev.width));

      const result = L.placeBlock(state, placeX);

      if (result.missed) {
        /* Game Over */
        FX.Sound.explode();
        FX.shake(stage);
        FX.toast(stage, 'Verfehlt!', '#ff4d6d');
        finished = true;
        api.timeout(() => { api.finish(state.score); }, 900);
        return;
      }

      /* Neuen Block rendern */
      const newBlock = state.blocks[state.blocks.length - 1];
      const yOffset = state.level * BLOCK_HEIGHT - cameraY;
      renderBlock(newBlock, state.level, yOffset);

      /* Score-Update */
      scoreEl.textContent = state.score;
      levelEl.textContent = 'Hoehe: ' + L.getTowerHeight(state);
      api.setScore(state.score);

      /* Feedback */
      if (result.perfect) {
        FX.Sound.star();
        FX.toast(stage, 'PERFEKT! +100', '#ffd34e');
        FX.burst(window.innerWidth / 2, window.innerHeight * 0.5, 24, 9);
      } else if (Math.abs(result.offset) <= PERFECT_TOL) {
        FX.Sound.good();
        FX.toast(stage, '+' + result.score, '#2bffb9');
      } else {
        FX.Sound.tap();
        FX.toast(stage, '+' + result.score, '#2bffb9');
      }

      /* Kamera nach oben bewegen wenn Turm hoch wird */
      const towerPx = (state.level + 2) * BLOCK_HEIGHT;
      const canvasH = canvas.clientHeight;
      if (towerPx > canvasH * 0.7) {
        cameraY = towerPx - canvasH * 0.7;
        blocksEl.style.transform = 'translateY(' + cameraY + 'px)';
      }

      /* Naechsten Block starten */
      api.timeout(startMovingBlock, 450);
      attachTap();
    }

    /* Eingabe: Tippen = platzieren (once: true, re-registriert nach Platzierung) */
    function attachTap() {
      stage.addEventListener('pointerdown', onPlace, { once: true });
    }
    function onPlace() {
      if (!finished) place();
    }

    /* Bewegungs-Loop */
    api.frameLoop(() => {
      if (finished || !canPlace) return true;
      const w = STAGE_W();
      const prev = state.blocks[state.blocks.length - 1];
      const range = w - prev.width;
      movingX += moveDir * speed * 0.016; /* ~60fps normalisiert */
      if (movingX >= 1) { movingX = 1; moveDir = -1; }
      if (movingX <= 0) { movingX = 0; moveDir = 1; }
      movingEl.style.left = Math.round(movingX * range) + 'px';
      movingEl.style.bottom = ((state.level + 1) * BLOCK_HEIGHT - cameraY) + 'px';
      return true;
    });

    /* Start */
    instructEl.textContent = 'Tippe sobald der Block ueber dem Turm ist!';
    api.timeout(() => {
      instructEl.style.opacity = '0';
      startMovingBlock();
      attachTap();
    }, 1200);
  }

  /* =========================================================
     BUBBLE POP — Bunte Blasen steigen auf, eigene Farbe poppen
     Spieler hat eine Zielfarbe die periodisch wechselt.
     Richtige Blase tippen → Punkte + Combo.
     Falsche Blase tippen → Missed +1, Combo-Reset.
     Spielerfarbe entkommen lassen → Missed +1.
     5x verfehlt → Game Over.
     Zeitlimit: 30 Sekunden.
     ========================================================= */
  function gameBubblePop(stage, api) {
    const L = window.BubblePopLogic;
    if (!L) { api.finish(0); return; }

    /* Konfiguration */
    const TIME_MS = 30000;
    const COLORS = ['#ff3cac', '#3a86ff', '#2bffb9', '#ffd34e', '#ff9e5e'];
    const COLOR_NAMES = ['Pink', 'Blau', 'Gruen', 'Gelb', 'Orange'];
    const SPAWN_INTERVAL_START = 700;  /* ms zwischen Spawns */
    const SPAWN_INTERVAL_MIN = 350;    /* beschleunigt mit der Zeit */
    const BUBBLE_RADIUS = 28;
    const SPEED_START = 0.04;          /* px/ms */
    const SPEED_MAX = 0.09;
    const COLOR_CHANGE_INTERVAL = 6000; /* ms — Spielerfarbe wechselt */
    const endAt = performance.now() + TIME_MS;

    /* Spielzustand */
    const state = L.createBubbleState({ colors: COLORS, maxMissed: 5 });
    L.setPlayerColor(state, rand(0, COLORS.length - 1));

    let finished = false;
    let lastSpawn = 0;
    let lastColorChange = performance.now();
    let spawnInterval = SPAWN_INTERVAL_START;
    let speedMul = 1;
    let lastFrame = performance.now();

    /* DOM */
    const wrap = el('div', 'bubble-wrap');
    wrap.innerHTML = `
      <div class="bubble-hud">
        <span class="bubble-score" id="bp-score">0</span>
        <div class="bubble-target" id="bp-target">
          <span class="bubble-target-label">Deine Farbe:</span>
          <span class="bubble-target-dot" id="bp-target-dot"></span>
          <span class="bubble-target-name" id="bp-target-name"></span>
        </div>
        <div class="bubble-misses" id="bp-misses"></div>
      </div>
      <div class="bubble-canvas" id="bp-canvas"></div>
      <div class="bubble-combo" id="bp-combo"></div>
      <div class="bubble-instruction" id="bp-instruct">Tippe nur deine Farbe!</div>`;
    stage.appendChild(wrap);

    const canvas = wrap.querySelector('#bp-canvas');
    const scoreEl = wrap.querySelector('#bp-score');
    const targetDot = wrap.querySelector('#bp-target-dot');
    const targetName = wrap.querySelector('#bp-target-name');
    const missesEl = wrap.querySelector('#bp-misses');
    const comboEl = wrap.querySelector('#bp-combo');
    const instructEl = wrap.querySelector('#bp-instruct');

    /* UI-Helfer */
    function updateTargetUI() {
      targetDot.style.background = state.playerColor;
      targetDot.style.boxShadow = '0 0 12px ' + state.playerColor;
      const idx = COLORS.indexOf(state.playerColor);
      targetName.textContent = idx >= 0 ? COLOR_NAMES[idx] : '';
    }
    function updateMissesUI() {
      const remaining = state.maxMissed - state.missed;
      let dots = '';
      for (let i = 0; i < state.maxMissed; i++) {
        dots += i < state.missed
          ? '<span class="miss-dot used"></span>'
          : '<span class="miss-dot"></span>';
      }
      missesEl.innerHTML = dots;
    }
    function showCombo(text, color) {
      comboEl.textContent = text;
      comboEl.style.color = color;
      comboEl.classList.remove('show');
      void comboEl.offsetWidth; /* reflow → animation restart */
      comboEl.classList.add('show');
    }

    updateTargetUI();
    updateMissesUI();

    /* Blase visuell erzeugen */
    function renderBubble(bubble) {
      const div = el('div', 'bubble');
      div.dataset.id = bubble.id;
      div.style.width = bubble.radius * 2 + 'px';
      div.style.height = bubble.radius * 2 + 'px';
      div.style.background = `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.5), ${bubble.color} 60%, ${bubble.color})`;
      div.style.boxShadow = `0 0 12px ${bubble.color}88, inset 0 -4px 8px rgba(0,0,0,0.15)`;
      div.style.left = (bubble.x - bubble.radius) + 'px';
      div.style.top = (bubble.y - bubble.radius) + 'px';
      div.addEventListener('pointerdown', (ev) => {
        ev.stopPropagation();
        onPop(bubble.id, div);
      });
      canvas.appendChild(div);
      return div;
    }

    /* Blase poppen */
    function onPop(bubbleId, div) {
      if (finished) return;
      const result = L.popBubble(state, bubbleId);
      div.classList.add('popped');

      if (result.correct) {
        FX.Sound.good();
        FX.toast(stage, '+' + result.score, state.playerColor);
        api.setScore(state.score);
        scoreEl.textContent = state.score;
        if (state.combo >= 3) {
          showCombo('COMBO x' + state.combo + '!', '#ffd34e');
          FX.Sound.star();
        }
      } else if (result.missed) {
        FX.Sound.bad();
        FX.shake(stage);
        showCombo('Falsche Farbe!', '#ff4d6d');
        updateMissesUI();
        if (state.gameOver) {
          finished = true;
          FX.Sound.explode();
          api.timeout(() => api.finish(state.score), 800);
        }
      }

      /* Blase nach Animation entfernnen */
      api.timeout(() => { if (div.parentNode) div.remove(); }, 300);
    }

    /* Neue Blase spawnen */
    function trySpawn(now) {
      const interval = Math.max(SPAWN_INTERVAL_MIN, spawnInterval);
      if (now - lastSpawn < interval) return;
      lastSpawn = now;

      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const x = rand(BUBBLE_RADIUS + 10, w - BUBBLE_RADIUS - 10);
      const y = h + BUBBLE_RADIUS;

      /* 40% Chance Spielerfarbe, 60% zufaellige Farbe */
      let colorIdx;
      if (Math.random() < 0.4) {
        colorIdx = COLORS.indexOf(state.playerColor);
      } else {
        colorIdx = rand(0, COLORS.length - 1);
      }
      const bubble = L.spawnBubble(state, x, y, colorIdx);
      bubble.radius = BUBBLE_RADIUS;
      bubble.speed = Math.min(SPEED_MAX, SPEED_START * speedMul);
      renderBubble(bubble);
    }

    /* Spielerfarbe periodisch wechseln */
    function tryColorChange(now) {
      if (now - lastColorChange < COLOR_CHANGE_INTERVAL) return;
      lastColorChange = now;
      let newIdx;
      do {
        newIdx = rand(0, COLORS.length - 1);
      } while (COLORS[newIdx] === state.playerColor && COLORS.length > 1);
      L.setPlayerColor(state, newIdx);
      updateTargetUI();
      targetDot.classList.remove('flash');
      void targetDot.offsetWidth;
      targetDot.classList.add('flash');
      FX.Sound.tap();
    }

    /* Frame-Loop */
    api.frameLoop(() => {
      const now = performance.now();
      const dt = Math.min(50, now - lastFrame);
      lastFrame = now;

      if (now >= endAt) {
        finished = true;
        api.finish(state.score);
        return false;
      }

      if (finished) return false;

      /* Schwierigkeit erhoehen */
      const elapsed = (endAt - now);
      const progress = 1 - (elapsed / TIME_MS);
      speedMul = 1 + progress * 1.2;
      spawnInterval = SPAWN_INTERVAL_START - progress * (SPAWN_INTERVAL_START - SPAWN_INTERVAL_MIN);

      /* Spawn + Color-Change */
      trySpawn(now);
      tryColorChange(now);

      /* Blasen bewegen (Logik) */
      const events = L.tickBubbles(state, dt, canvas.clientHeight);

      /* Events verarbeiten (entkommene Spielerfarbe) */
      if (events.length > 0) {
        for (const ev of events) {
          if (ev.type === 'escaped' && ev.bubble.color === state.playerColor) {
            updateMissesUI();
            showCombo('Verpasst!', '#ff4d6d');
            FX.Sound.bad();
          }
        }
        if (state.gameOver) {
          finished = true;
          FX.Sound.explode();
          api.timeout(() => api.finish(state.score), 800);
          return false;
        }
      }

      /* Visuelle Position aktualisieren */
      const bubbleEls = canvas.querySelectorAll('.bubble:not(.popped)');
      for (const divEl of bubbleEls) {
        const id = parseInt(divEl.dataset.id, 10);
        const b = state.bubbles.find(x => x.id === id);
        if (b) {
          const wobbleX = Math.sin(b.wobble) * 8;
          divEl.style.left = (b.x - b.radius + wobbleX) + 'px';
          divEl.style.top = (b.y - b.radius) + 'px';
        }
      }

      /* Entfernte Blasen aus DOM loeschen */
      for (const divEl of bubbleEls) {
        const id = parseInt(divEl.dataset.id, 10);
        if (!state.bubbles.find(x => x.id === id)) {
          divEl.remove();
        }
      }

      return true;
    });

    /* Start */
    instructEl.textContent = 'Tippe nur deine Farbe! Falsche = Missed!';
    api.timeout(() => {
      instructEl.style.opacity = '0';
    }, 2500);
  }

  /* =========================================================
     NINJA SLASH — Fruechte schlitzern, Bomben meiden (Fruit-Ninja-Style)
     Objekte fliegen von unten nach oben (parabolische Bahn).
     Tippen = schlitzern → Punkte + Combo.
     Bombe tippen → Game Over.
     Frucht entkommen → missed +1.
     5x verfehlt → Game Over.
     Zeitlimit: 30 Sekunden.
     ========================================================= */
  function gameNinjaSlash(stage, api) {
    const L = window.NinjaSlashLogic;
    if (!L) { api.finish(0); return; }

    /* Konfiguration */
    const TIME_MS = 30000;
    const endAt = performance.now() + TIME_MS;
    const TYPES = L.FRUIT_TYPES;
    const FRUIT_ONLY = TYPES.filter(t => !t.isBomb);
    const BOMB_CHANCE_START = 0.10;  /* 10% Bomben zu Beginn */
    const BOMB_CHANCE_END = 0.22;    /* 22% Bomben spaeter */
    const SPAWN_INTERVAL_START = 900; /* ms zwischen Spawns */
    const SPAWN_INTERVAL_MIN = 450;  /* beschleunigt mit der Zeit */
    const VY_MIN = -0.65;            /* Aufwaertsgeschwindigkeit Bereich */
    const VY_MAX = -0.45;
    const VX_MAG = 0.08;             /* Horizontale Geschwindigkeit */

    /* Spielzustand */
    const state = L.createNinjaState({ maxMissed: 5 });

    let finished = false;
    let lastSpawn = 0;
    let spawnInterval = SPAWN_INTERVAL_START;
    let lastFrame = performance.now();

    /* DOM */
    const wrap = el('div', 'ninja-wrap');
    wrap.innerHTML = `
      <div class="ninja-hud">
        <span class="ninja-score" id="ns-score">0</span>
        <div class="ninja-misses" id="ns-misses"></div>
      </div>
      <div class="ninja-canvas" id="ns-canvas"></div>
      <div class="ninja-combo" id="ns-combo"></div>
      <div class="ninja-instruction" id="ns-instruct">Schlitze die Fruechte — meide Bomben!</div>`;
    stage.appendChild(wrap);

    const canvas = wrap.querySelector('#ns-canvas');
    const scoreEl = wrap.querySelector('#ns-score');
    const missesEl = wrap.querySelector('#ns-misses');
    const comboEl = wrap.querySelector('#ns-combo');
    const instructEl = wrap.querySelector('#ns-instruct');

    /* Missed-Dots anzeigen */
    function updateMissesUI() {
      let dots = '';
      for (let i = 0; i < state.maxMissed; i++) {
        dots += i < state.missed
          ? '<span class="miss-dot used"></span>'
          : '<span class="miss-dot"></span>';
      }
      missesEl.innerHTML = dots;
    }

    /* Combo-Anzeige */
    function showCombo(text, color) {
      comboEl.textContent = text;
      comboEl.style.color = color;
      comboEl.classList.remove('show');
      void comboEl.offsetWidth;
      comboEl.classList.add('show');
    }

    updateMissesUI();

    /* Objekt visuell erzeugen */
    function renderObject(obj) {
      const div = el('div', 'ninja-fruit' + (obj.isBomb ? ' bomb' : ''));
      div.dataset.id = obj.id;
      div.style.width = obj.radius * 2 + 'px';
      div.style.height = obj.radius * 2 + 'px';
      div.style.fontSize = obj.radius * 1.3 + 'px';
      div.textContent = obj.icon;
      div.style.left = (obj.x - obj.radius) + 'px';
      div.style.top = (obj.y - obj.radius) + 'px';
      div.style.transform = 'rotate(' + obj.rotation + 'rad)';
      div.addEventListener('pointerdown', (ev) => {
        ev.stopPropagation();
        onSlash(obj.id, div);
      });
      canvas.appendChild(div);
      return div;
    }

    /* Objekt schlitzern */
    function onSlash(objId, div) {
      if (finished) return;
      const result = L.slashObject(state, objId);

      if (result.hit) {
        if (result.bomb) {
          /* Bombe → Explosion + Game Over */
          FX.Sound.explode();
          FX.shake(stage);
          div.classList.add('exploded');
          showCombo('BOOM!', '#ff4d6d');
          updateMissesUI();
          finished = true;
          api.timeout(() => { api.finish(L.getScore(state)); }, 1000);
        } else {
          /* Frucht → Splash + Punkte */
          div.classList.add('slashed');
          FX.Sound.good();
          FX.toast(stage, '+' + result.points, '#2bffb9');
          scoreEl.textContent = L.getScore(state);
          api.setScore(L.getScore(state));
          if (result.combo >= 3) {
            showCombo('COMBO x' + result.combo + '!', '#ffd34e');
            FX.Sound.star();
            FX.burst(window.innerWidth / 2, window.innerHeight * 0.5, 20, 8);
          }
        }
        api.timeout(() => { if (div.parentNode) div.remove(); }, 400);
      }
    }

    /* Neues Objekt spawnen */
    function trySpawn(now) {
      const interval = Math.max(SPAWN_INTERVAL_MIN, spawnInterval);
      if (now - lastSpawn < interval) return;
      lastSpawn = now;

      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const x = rand(60, w - 60);
      const y = h + 40; /* unten starten */

      /* Bomben-Chance steigt mit der Zeit */
      const progress = 1 - (endAt - now) / TIME_MS;
      const bombChance = BOMB_CHANCE_START + progress * (BOMB_CHANCE_END - BOMB_CHANCE_START);
      const isBomb = Math.random() < bombChance;

      let typeId;
      if (isBomb) {
        typeId = 'bomb';
      } else {
        typeId = FRUIT_ONLY[rand(0, FRUIT_ONLY.length - 1)].id;
      }

      /* Geschwindigkeit: nach oben (negatives vy), leicht seitwaerts */
      const vy = -(VY_MIN + Math.random() * (VY_MAX - VY_MIN));
      const dirSign = x < w / 2 ? 1 : -1;
      const vx = dirSign * Math.random() * VX_MAG;

      const obj = L.spawnObject(state, x, y, typeId, { vx, vy });
      renderObject(obj);
    }

    /* Frame-Loop */
    api.frameLoop(() => {
      const now = performance.now();
      const dt = Math.min(50, now - lastFrame);
      lastFrame = now;

      if (now >= endAt) {
        finished = true;
        api.finish(L.getScore(state));
        return false;
      }

      if (finished) return false;

      /* Spawn-Interval anpassen (schneller mit der Zeit) */
      const progress = 1 - (endAt - now) / TIME_MS;
      spawnInterval = SPAWN_INTERVAL_START - progress * (SPAWN_INTERVAL_START - SPAWN_INTERVAL_MIN);

      /* Spawn */
      trySpawn(now);

      /* Objekte bewegen (Logik) */
      const events = L.tickObjects(state, dt, canvas.clientHeight);

      /* Events: entkommene Frucht */
      if (events.length > 0) {
        for (const ev of events) {
          if (ev.type === 'escaped' && !ev.object.isBomb) {
            updateMissesUI();
            showCombo('Verpasst!', '#ff4d6d');
            FX.Sound.bad();
          }
        }
        if (L.isGameOver(state)) {
          finished = true;
          FX.Sound.explode();
          api.timeout(() => api.finish(L.getScore(state)), 800);
          return false;
        }
      }

      /* Visuelle Position aktualisieren */
      const fruitEls = canvas.querySelectorAll('.ninja-fruit:not(.slashed):not(.exploded)');
      for (const divEl of fruitEls) {
        const id = parseInt(divEl.dataset.id, 10);
        const o = state.objects.find(x => x.id === id);
        if (o) {
          divEl.style.left = (o.x - o.radius) + 'px';
          divEl.style.top = (o.y - o.radius) + 'px';
          divEl.style.transform = 'rotate(' + o.rotation + 'rad)';
        }
      }

      /* Entfernte Objekte aus DOM loeschen */
      for (const divEl of fruitEls) {
        const id = parseInt(divEl.dataset.id, 10);
        if (!state.objects.find(x => x.id === id)) {
          divEl.remove();
        }
      }

      return true;
    });

    /* Start */
    instructEl.textContent = 'Schlitze die Fruechte — meide Bomben!';
    api.timeout(() => {
      instructEl.style.opacity = '0';
    }, 2500);
  }

  /* =========================================================
     COLOR CATCH — Korb faengt fallende Farben, nur richtige
     Spieler bewegt Korb durch Tippen/Ziehen nach links/rechts.
     Zielfarbe wechselt periodisch. 30 Sekunden.
     ========================================================= */
  function gameColorCatch(stage, api) {
    const L = window.ColorCatchLogic;
    if (!L) { api.finish(0); return; }

    /* Konfiguration */
    const TIME_MS = 30000;
    const endAt = performance.now() + TIME_MS;
    const COLORS = ['#ff4d6d', '#3a86ff', '#2bffb9', '#ffd34e', '#7b2ff7', '#ff6a00'];
    const COLOR_NAMES = ['Rot', 'Blau', 'Gruen', 'Gelb', 'Lila', 'Orange'];
    const SPAWN_INTERVAL_START = 800;
    const SPAWN_INTERVAL_MIN = 380;
    const SPEED_START = 0.16;   /* px/ms Fallgeschwindigkeit */
    const SPEED_END = 0.32;     /* beschleunigt mit der Zeit */
    const COLOR_CHANGE_INTERVAL = 6000; /* Zielfarbe wechselt alle 6s */
    const BASKET_WIDTH = 90;

    /* Spielzustand */
    const state = L.createColorCatchState({
      maxMissed: 5,
      colors: COLORS,
      basketWidth: BASKET_WIDTH,
      stageWidth: stage.clientWidth,
      stageHeight: stage.clientHeight,
    });

    let finished = false;
    let lastSpawn = 0;
    let spawnInterval = SPAWN_INTERVAL_START;
    let lastFrame = performance.now();
    let lastColorChange = performance.now();
    let currentColorIdx = 0;

    /* DOM */
    const wrap = el('div', 'cc-wrap');
    wrap.innerHTML = `
      <div class="cc-hud">
        <span class="cc-score" id="cc-score">0</span>
        <span class="cc-target" id="cc-target">
          <span class="cc-target-swatch" id="cc-swatch"></span>
          <span id="cc-target-text">Rot</span>
        </span>
        <span class="cc-misses" id="cc-misses"></span>
      </div>
      <div class="cc-canvas" id="cc-canvas"></div>
      <div class="cc-basket" id="cc-basket">
        <div class="cc-basket-glow" id="cc-glow"></div>
      </div>
      <div class="cc-combo" id="cc-combo"></div>
      <div class="cc-instruction" id="cc-instruct">Ziehe um den Korb zu bewegen!</div>`;
    stage.appendChild(wrap);

    const canvas = wrap.querySelector('#cc-canvas');
    const scoreEl = wrap.querySelector('#cc-score');
    const swatchEl = wrap.querySelector('#cc-swatch');
    const targetTextEl = wrap.querySelector('#cc-target-text');
    const missesEl = wrap.querySelector('#cc-misses');
    const basketEl = wrap.querySelector('#cc-basket');
    const glowEl = wrap.querySelector('#cc-glow');
    const comboEl = wrap.querySelector('#cc-combo');
    const instructEl = wrap.querySelector('#cc-instruct');

    /* Buehnenbreite fuer Korb-Positionierung */
    const stageH = stage.clientHeight;
    const basketY = stageH * 0.92 - 56; /* Korb-Oberkante fuer Logik */

    /* Korb visuell positionieren */
    function updateBasketVisual() {
      basketEl.style.left = state.basket.x + 'px';
      basketEl.style.width = state.basket.width + 'px';
      glowEl.style.background = state.playerColor;
    }

    /* Zielfarbe aktualisieren */
    function updateTargetUI() {
      swatchEl.style.background = state.playerColor;
      swatchEl.style.color = state.playerColor;
      const idx = COLORS.indexOf(state.playerColor);
      targetTextEl.textContent = idx >= 0 ? COLOR_NAMES[idx] : '';
      updateBasketVisual();
    }

    /* Missed-Dots anzeigen */
    function updateMissesUI() {
      let dots = '';
      for (let i = 0; i < state.maxMissed; i++) {
        dots += i < state.missed
          ? '<span class="miss-dot used"></span>'
          : '<span class="miss-dot"></span>';
      }
      missesEl.innerHTML = dots;
    }

    /* Combo-Anzeige */
    function showCombo(text, color) {
      comboEl.textContent = text;
      comboEl.style.color = color;
      comboEl.classList.remove('show');
      void comboEl.offsetWidth;
      comboEl.classList.add('show');
    }

    /* Zielfarbe wechseln */
    function changeColor() {
      let newIdx;
      do {
        newIdx = rand(0, COLORS.length - 1);
      } while (newIdx === currentColorIdx && COLORS.length > 1);
      currentColorIdx = newIdx;
      L.setPlayerColor(state, newIdx);
      updateTargetUI();
      FX.Sound.powerup();
    }

    /* Initiale Zielfarbe */
    L.setPlayerColor(state, 0);
    updateTargetUI();
    updateMissesUI();
    updateBasketVisual();

    /* Korb-Steuerung: Tippen/Ziehen */
    let dragging = false;
    function moveToPointer(clientX) {
      const rect = stage.getBoundingClientRect();
      const x = clientX - rect.left;
      L.moveBasket(state, x - state.basket.width / 2);
      updateBasketVisual();
    }
    canvas.addEventListener('pointerdown', (ev) => {
      dragging = true;
      moveToPointer(ev.clientX);
      canvas.setPointerCapture(ev.pointerId);
    });
    canvas.addEventListener('pointermove', (ev) => {
      if (dragging) moveToPointer(ev.clientX);
    });
    canvas.addEventListener('pointerup', (ev) => {
      dragging = false;
      try { canvas.releasePointerCapture(ev.pointerId); } catch (e) {}
    });
    canvas.addEventListener('pointercancel', () => { dragging = false; });

    /* Fallendes Objekt visuell erzeugen */
    function renderFalling(obj) {
      const div = el('div', 'cc-falling');
      div.dataset.id = obj.id;
      div.style.width = obj.radius * 2 + 'px';
      div.style.height = obj.radius * 2 + 'px';
      div.style.background = obj.color;
      div.style.left = (obj.x - obj.radius) + 'px';
      div.style.top = (obj.y - obj.radius) + 'px';
      canvas.appendChild(div);
      return div;
    }

    /* Neues Objekt spawnen */
    function trySpawn(now) {
      const interval = Math.max(SPAWN_INTERVAL_MIN, spawnInterval);
      if (now - lastSpawn < interval) return;
      lastSpawn = now;

      const w = stage.clientWidth;
      const x = rand(30, w - 30);
      const colorIdx = rand(0, COLORS.length - 1);

      const obj = L.spawnObject(state, x, -30, colorIdx);
      /* Fallgeschwindigkeit steigt mit der Zeit */
      const progress = 1 - (endAt - now) / TIME_MS;
      obj.speed = SPEED_START + progress * (SPEED_END - SPEED_START);
      renderFalling(obj);
    }

    /* Frame-Loop */
    api.frameLoop(() => {
      const now = performance.now();
      const dt = Math.min(50, now - lastFrame);
      lastFrame = now;

      if (now >= endAt) {
        finished = true;
        api.finish(L.getScore(state));
        return false;
      }

      if (finished) return false;

      /* Spawn-Interval anpassen */
      const progress = 1 - (endAt - now) / TIME_MS;
      spawnInterval = SPAWN_INTERVAL_START - progress * (SPAWN_INTERVAL_START - SPAWN_INTERVAL_MIN);

      /* Zielfarbe wechseln */
      if (now - lastColorChange >= COLOR_CHANGE_INTERVAL) {
        lastColorChange = now;
        changeColor();
      }

      /* Spawn */
      trySpawn(now);

      /* Objekte bewegen (Logik) */
      const events = L.tickObjects(state, dt, stageH, basketY);

      /* Events verarbeiten */
      if (events.length > 0) {
        for (const ev of events) {
          if (ev.type === 'caught') {
            const isCorrect = ev.object.color === state.playerColor;
            const divEl = canvas.querySelector('[data-id="' + ev.object.id + '"]');
            if (divEl) {
              divEl.classList.add(isCorrect ? 'caught-good' : 'caught-bad');
              api.timeout(() => { if (divEl.parentNode) divEl.remove(); }, 300);
            }
            if (isCorrect) {
              const score = L.getScore(state);
              scoreEl.textContent = score;
              api.setScore(score);
              FX.Sound.good();
              if (L.getCombo(state) >= 3) {
                showCombo('COMBO x' + L.getCombo(state) + '!', '#ffd34e');
                FX.Sound.star();
                FX.burst(window.innerWidth / 2, window.innerHeight * 0.5, 20, 8);
              }
            } else {
              FX.Sound.bad();
              FX.shake(stage);
              showCombo('Falsch!', '#ff4d6d');
              updateMissesUI();
            }
          } else if (ev.type === 'escaped') {
            if (ev.object.color === state.playerColor) {
              updateMissesUI();
              showCombo('Verpasst!', '#ff4d6d');
              FX.Sound.bad();
            }
          }
        }
        if (L.isGameOver(state)) {
          finished = true;
          FX.Sound.explode();
          api.timeout(() => api.finish(L.getScore(state)), 800);
          return false;
        }
      }

      /* Visuelle Position aktualisieren */
      const fallingEls = canvas.querySelectorAll('.cc-falling:not(.caught-good):not(.caught-bad)');
      for (const divEl of fallingEls) {
        const id = parseInt(divEl.dataset.id, 10);
        const o = state.objects.find(x => x.id === id);
        if (o) {
          divEl.style.left = (o.x - o.radius) + 'px';
          divEl.style.top = (o.y - o.radius) + 'px';
        }
      }

      /* Entfernte Objekte aus DOM loeschen */
      for (const divEl of fallingEls) {
        const id = parseInt(divEl.dataset.id, 10);
        if (!state.objects.find(x => x.id === id)) {
          divEl.remove();
        }
      }

      return true;
    });

    /* Start */
    instructEl.textContent = 'Fange nur ' + COLOR_NAMES[0] + '! Ziehe zum Bewegen!';
    api.timeout(() => {
      instructEl.style.opacity = '0';
    }, 2500);
  }

  function gameQuizDuel(stage, api, runMeta = {}) {
    const extPool = Array.isArray(window.QuizDuelQuestionPool)
      ? window.QuizDuelQuestionPool
      : [];
    runQuizRush(stage, api, {
      id: 'quizduel',
      title: 'Quiz Duell',
      questionsPerRound: 5,
      questionPool: extPool,
      makeRound() {
        if (extPool.length) return extPool[rand(0, extPool.length - 1)];
        return {
          prompt: 'Quiz Duell Fragenpool fehlt. Bitte Seite neu laden.',
          choices: [
            { label: 'OK', ok: true },
            { label: 'A', ok: false },
            { label: 'B', ok: false },
            { label: 'C', ok: false },
          ],
        };
      },
    }, runMeta);
  }

  /* ---------- leichter Ton fuer Simon (nutzt FX AudioContext, kein eigener) ---------- */
  function _beep(freq) {
    try {
      if (!FX.isSoundEnabled()) return;
      const _ac = FX.ensureCtx ? FX.ensureCtx() : null;
      if (!_ac) return;
      if (_ac.state === 'suspended') _ac.resume();
      const o = _ac.createOscillator(), g = _ac.createGain();
      o.type = 'sine'; o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, _ac.currentTime);
      g.gain.linearRampToValueAtTime(0.2, _ac.currentTime + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, _ac.currentTime + 0.3);
      o.connect(g).connect(_ac.destination);
      o.start(); o.stop(_ac.currentTime + 0.32);
    } catch (e) { /* ignore */ }
  }
  // expose for simon closure
  window._beep = _beep;

  /* ---------- Registry ---------- */
  const list = [
    { id: 'reaction', name: 'Reaktion', icon: '⚡', desc: 'Tippe blitzschnell, sobald der Bildschirm grün wird.',
      rules: 'Warte auf <strong>GRÜN</strong> und tippe so schnell wie möglich. Tippst du zu früh, gibt es 0 Punkte. <strong>20 Sekunden</strong> — so viele Versuche wie möglich, je schneller, desto mehr Punkte!', play: gameReaction },
    { id: 'simon', name: 'Memory-Sequenz', icon: '🧠', desc: 'Merke dir die leuchtende Reihenfolge und wiederhole sie.',
      rules: 'Schau dir die Sequenz an und tippe sie nach. Jede Runde wird sie <strong>länger</strong>. Jedes geschaffte Level bringt <strong>100 Punkte</strong>.', play: gameSimon },
    { id: 'math', name: 'Blitz-Rechnen', icon: '🔢', desc: 'Wähle das richtige Ergebnis aus mehreren Zahlen.',
      rules: 'Löse die Aufgabe und tippe das <strong>richtige Ergebnis</strong> unter den vier Möglichkeiten an. Combos geben Bonus-Punkte 🔥. Falsche Antworten kosten <strong>Zeit</strong>. 20 Sekunden.', play: gameMath },
    { id: 'tap', name: 'Tap-Wahnsinn', icon: '👆', desc: 'Tippe den Button so oft wie möglich in 5 Sekunden.',
      rules: 'Hämmere auf den Button! Jeder Tap zählt. Du hast nur <strong>5 Sekunden</strong> — gib alles!', play: gameTap },
    { id: 'targets', name: 'Ziel-Jagd', icon: '🎯', desc: 'Triff die Sterne, meide die Bomben.',
      rules: 'Tippe ⭐ für Punkte (kleine Ziele = mehr Punkte). <strong>Bomben 💣 vermeiden</strong> — sie ziehen Punkte ab! 15 Sekunden.', play: gameTargets },
    { id: 'stroop', name: 'Farben-Chaos', icon: '🌈', desc: 'Wähle die Farbe des Wortes — nicht den Text!',
      rules: 'Wähle die <strong>Schriftfarbe</strong> des Wortes, ignoriere die Bedeutung. Klingt easy? Dein Hirn sagt was anderes 😉. 20 Sekunden.', play: gameStroop },
    { id: 'precision', name: 'Präzisions-Stopp', icon: '🎚️', desc: 'Stoppe den Balken genau in der Mitte.',
      rules: 'Drücke <strong>STOPP</strong>, wenn der Balken in der Mitte ist. <strong>25 Sekunden</strong> — so viele Runden wie möglich, je genauer, desto mehr Punkte. Perfekt = Jackpot 🎰.', play: gamePrecision },
    { id: 'bombcode', name: 'Bomben-Code', icon: '💣', desc: 'Merke dir den Zahlencode und gib ihn ein.',
      rules: 'Präge dir den <strong>Code</strong> ein, dann tippe ihn nach. Jedes Level wird er <strong>länger</strong>. Ein Fehler — und die Bombe geht hoch! 💥', play: gameBombCode },
    { id: 'sequence', name: 'Zahlen-Jagd', icon: '🔎', desc: 'Tippe die Zahlen der Reihe nach an.',
      rules: 'Finde und tippe die Zahlen <strong>aufsteigend</strong> (1, 2, 3 …) so schnell wie möglich. Volles Feld gibt Bonus, danach wird es <strong>größer</strong>. Falsch tippen kostet Zeit. 25 Sekunden.', play: gameSequence },
    { id: 'oddone', name: 'Finde das Andere', icon: '🕵️', desc: 'Entdecke das abweichende Symbol im Raster.',
      rules: 'In einem Raster aus gleichen Symbolen versteckt sich <strong>eins, das anders ist</strong>. Tippe es an! Mit jeder Combo wird das Raster <strong>größer</strong>. 20 Sekunden.', play: gameOddOne },
    { id: 'arrows', name: 'Pfeil-Wirbel', icon: '🧭', desc: 'Drücke blitzschnell die angezeigte Richtung.',
      rules: 'Ein <strong>Pfeil</strong> erscheint — drücke sofort die passende Richtungstaste. Combos bringen mehr Punkte 🔥, Fehler kosten Zeit. 20 Sekunden.', play: gameArrows },
    { id: 'highlow', name: 'Höher oder Tiefer', icon: '🃏', desc: 'Errate, ob die nächste Zahl höher oder tiefer ist.',
      rules: 'Tippe auf <strong>Höher ⬆️</strong> oder <strong>Tiefer ⬇️</strong>, um vorherzusagen, ob die nächste Zahl (1–100) größer oder kleiner ist. Combos geben Bonus 🔥. 22 Sekunden.', play: gameHighLow },
    { id: 'countvision', name: 'Count-Vision', icon: '🧮', desc: 'Zähle blitzschnell die Zielsymbole und wähle die richtige Zahl.',
      rules: 'Du siehst ein Symbol-Ziel (z. B. ⭐). Zähle, wie oft es im Raster vorkommt, und tippe die richtige Zahl. Falsche Antworten kosten Zeit.', play: gameCountVision },
    { id: 'reflexlanes', name: 'Reflex-Lanes', icon: '🎯', desc: 'Tippe nur das Zielsymbol im wechselnden Raster.',
      rules: 'Nur das angezeigte Zielsymbol zählt. Falsche Treffer kosten Punkte, Bomben kosten extra viel. Schnell und präzise spielen!', play: gameReflexLanes },
    { id: 'evenodd', name: 'Gerade/Ungerade', icon: '➗', desc: 'Erkenne blitzschnell, ob eine Zahl gerade ist.',
      rules: 'Tippe auf <strong>Gerade</strong> oder <strong>Ungerade</strong>. Jede richtige Antwort erhöht deine Combo.', play: gameEvenOdd },
    { id: 'primehunter', name: 'Primzahl-Jagd', icon: '🧪', desc: 'Finde die Primzahl unter mehreren Zahlen.',
      rules: 'Wähle die <strong>einzige Primzahl</strong>. Falsche Antworten kosten Zeit.', play: gamePrimeHunter },
    { id: 'biggernumber', name: 'Groesser gewinnt', icon: '📈', desc: 'Wähle die größere von zwei Zahlen.',
      rules: 'Zwei Zahlen erscheinen. Tippe die <strong>größere</strong>. Schnell bleiben für Combo-Bonus.', play: gameBiggerNumber },
    { id: 'smallernumber', name: 'Kleiner gewinnt', icon: '📉', desc: 'Wähle die kleinere von zwei Zahlen.',
      rules: 'Zwei Zahlen erscheinen. Tippe die <strong>kleinere</strong>. Jeder Fehler kostet Zeit.', play: gameSmallerNumber },
    { id: 'dicesum', name: 'Wuerfel-Summe', icon: '🎲', desc: 'Berechne die Summe aus zwei Würfeln.',
      rules: 'Du siehst zwei Würfelwerte. Wähle die <strong>richtige Summe</strong>.', play: gameDiceSum },
    { id: 'fractionsnap', name: 'Prozent-Snap', icon: '💯', desc: 'Rechne Prozentwerte in Sekunden aus.',
      rules: 'Fragen wie 25%, 50% oder 10% von einer Zahl. Tippe schnell die richtige Antwort.', play: gameFractionSnap },
    { id: 'missingnumber', name: 'Fehlende Zahl', icon: '🧩', desc: 'Finde das fehlende Element einer Reihe.',
      rules: 'Eine Zahlenreihe mit Lücke erscheint. Wähle die fehlende Zahl.', play: gameMissingNumber },
    { id: 'nextsequence', name: 'Naechstes Glied', icon: '🧠', desc: 'Erkenne Muster und setze die Reihe fort.',
      rules: 'Folgen wachsen nach einer Regel. Finde das nächste Glied.', play: gameNextSequence },
    { id: 'wordlength', name: 'Wortlaengen-Duell', icon: '📚', desc: 'Finde das längste Wort.',
      rules: 'Mehrere Wörter werden angezeigt. Tippe das <strong>längste</strong>.', play: gameWordLength },
    { id: 'alphabet', name: 'Alphabet-Blitz', icon: '🔤', desc: 'Welcher Buchstabe kommt als Nächstes?',
      rules: 'Dir wird ein Buchstabe gezeigt. Wähle den <strong>direkten Nachfolger</strong>.', play: gameAlphabet },
    { id: 'compass', name: 'Kompass-Rush', icon: '🧭', desc: 'Richtungen schnell richtig zuordnen.',
      rules: 'Finde die Richtung nach 90° Drehung im Uhrzeigersinn.', play: gameCompass },
    { id: 'colorcount', name: 'Farb-Zaehler', icon: '🎨', desc: 'Zähle farbige Blöcke im Wirrwarr.',
      rules: 'Ein Zielfarbblock wird genannt. Zähle ihn in der Reihe korrekt.', play: gameColorCount },
    { id: 'comparesums', name: 'Summen-Duell', icon: '⚖️', desc: 'Vergleiche zwei Summen mit <, = oder >.',
      rules: 'Entscheide, welche Summe größer ist oder ob beide gleich sind.', play: gameCompareSums },
    { id: 'estimate', name: 'Naeheste Zahl', icon: '📌', desc: 'Tippe die Zahl, die am nächsten am Ziel liegt.',
      rules: 'Mehrere Zahlen stehen zur Auswahl. Finde die <strong>naechste</strong> zum Ziel.', play: gameEstimate },
    { id: 'roman', name: 'Roemische Zahlen', icon: '🏛️', desc: 'Übersetze römische Ziffern blitzschnell.',
      rules: 'Dir wird ein roemisches Zeichen gezeigt. Wähle den passenden Zahlenwert.', play: gameRoman },
    { id: 'mirrorarrow', name: 'Spiegel-Pfeil', icon: '🪞', desc: 'Finde das horizontale Spiegelbild eines Pfeils.',
      rules: 'Ein Pfeil wird gezeigt. Tippe den <strong>gespiegelten</strong> Pfeil.', play: gameMirrorArrow },
    { id: 'emojiclass', name: 'Emoji-Kategorie', icon: '😀', desc: 'Ordne Emojis der richtigen Kategorie zu.',
      rules: 'Fragen wie "Welches ist ein Tier?". Wähle das passende Emoji.', play: gameEmojiClass },
    { id: 'clockplus', name: 'Uhrzeit-Plus', icon: '🕒', desc: 'Rechne Minuten auf Uhrzeiten drauf.',
      rules: 'Eine Startzeit plus Minuten wird gezeigt. Wähle die korrekte Zielzeit.', play: gameClock },
    { id: 'remainder', name: 'Restrechner', icon: '♻️', desc: 'Finde den Divisionsrest.',
      rules: 'Berechne den <strong>Rest</strong> bei einer Division.', play: gameRemainder },
    { id: 'mathchain', name: 'Rechenkette', icon: '🔗', desc: 'Kurze Rechenkette unter Zeitdruck lösen.',
      rules: 'Löse eine kurze Rechnung mit + und −. Schnell und fehlerfrei!', play: gameMathChain },
    { id: 'doubletrouble', name: 'Verdoppeln!', icon: '2️⃣', desc: 'Finde blitzschnell das Doppelte.',
      rules: 'Dir wird eine Zahl gezeigt. Wähle das richtige <strong>Doppelte</strong>.', play: gameDoubleTrouble },
    { id: 'triplethreat', name: 'Dreifach-Alarm', icon: '3️⃣', desc: 'Finde blitzschnell das Dreifache.',
      rules: 'Dir wird eine Zahl gezeigt. Wähle das richtige <strong>Dreifache</strong>.', play: gameTripleThreat },
    { id: 'quizduel', name: 'Quiz Duell', icon: '🧠', desc: 'Nur Quizfragen: 5 pro Runde, die meisten richtigen erhalten den Stern.',
      rules: 'Jede Runde hat <strong>5 Fragen</strong>. Pro richtiger Antwort gibt es 1 Punkt. Wer am Ende der Runde die meisten richtigen Antworten hat, bekommt einen <strong>Stern</strong>. Fragen stammen aus einem Pool mit <strong>1000</strong> Einträgen.', play: gameQuizDuel },
    { id: 'numbermemory', name: 'Zahlen-Memory', icon: '🔐', desc: 'Merke dir kurz eine Zahl und finde sie wieder.',
      rules: 'Eine Zahl wird kurz eingeblendet und verschwindet wieder. Wähle die richtige Zahl.', play: gameNumberMemory },
    { id: 'towerstack', name: 'Tower Stack', icon: '🧱', desc: 'Stapele Bloecke — je praeziser, desto besser.',
      rules: 'Ein Block bewegt sich ueber dem Turm. <strong>Tippe zum Platzieren!</strong> Je genauer du triffst, desto mehr Punkte. Perfekte Platzierung gibt <strong>100 Bonus-Punkte</strong> und der Block schrumpft nicht. Ein Fehlversuch beendet das Spiel!', play: gameTowerStack },
    { id: 'bubblepop', name: 'Bubble Pop', icon: '🫧', desc: 'Ploppe nur deine Farbe — wechselt periodisch!',
      rules: 'Bunte Blasen steigen auf. Du hast eine <strong>Zielfarbe</strong>, die alle paar Sekunden wechselt. Tippe <strong>nur deine Farbe</strong>! Falsche Farbe oder entkommene Spielerfarbe = <strong>Missed</strong>. 5x verfehlt = Game Over. Combos geben mehr Punkte! 30 Sekunden.', play: gameBubblePop },
    { id: 'ninjaslash', name: 'Ninja Slash', icon: '🗡️', desc: 'Schlitze Fruechte — meide Bomben!',
      rules: 'Fruechte fliegen durch die Luft. <strong>Tippe um zu schlitzern!</strong> Jede Frucht gibt Punkte, Combos geben Bonus. <strong>Bomben meiden</strong> — eine beruehrte Bombe beendet sofort das Spiel! 5 Fruechte entkommen lassen = Game Over. 30 Sekunden.', play: gameNinjaSlash },
    { id: 'colorcatch', name: 'Color Catch', icon: '🧺', desc: 'Fange nur die richtige Farbe im Korb!',
      rules: 'Farb-Bloecke fallen von oben. Bewege den <strong>Korb</strong> durch Ziehen nach links/rechts. Fange <strong>nur deine Zielfarbe</strong> — die wechselt alle paar Sekunden! Falsche Farbe im Korb oder richtige Farbe verpasst = <strong>Missed</strong>. 5x verfehlt = Game Over. Combos geben mehr Punkte! 30 Sekunden.', play: gameColorCatch }
  ];

  return { list };
})();
