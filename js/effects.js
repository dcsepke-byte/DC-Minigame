/* ============================================================
   PARTY ARENA — Effects Engine
   Partikel-Hintergrund, Konfetti, Sound (WebAudio), Helpers
   ============================================================ */

const FX = (() => {
  'use strict';

  /* ---------------- Sound (WebAudio, kein Asset nötig) ---------------- */
  let audioCtx = null;
  let soundEnabled = true;
  let musicVolume = 0.5;
  let sfxVolume = 0.7;
  let musicOn = true;

  function ensureCtx() {
    if (!audioCtx) {
      try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
      catch (e) { audioCtx = null; }
    }
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }

  function tone(freq, dur, type = 'sine', vol = 0.18, when = 0) {
    if (!soundEnabled) return;
    const ctx = ensureCtx();
    if (!ctx) return;
    const t0 = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(vol * sfxVolume, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function sweep(f1, f2, dur, type = 'sawtooth', vol = 0.16) {
    if (!soundEnabled) return;
    const ctx = ensureCtx();
    if (!ctx) return;
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f1, t0);
    osc.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
    gain.gain.setValueAtTime(vol * sfxVolume, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  /* Wie tone(), aber nutzt musicVolume statt sfxVolume */
  function toneMusic(freq, dur, type = 'sine', vol = 0.18, when = 0) {
    if (!soundEnabled || !musicOn) return;
    const ctx = ensureCtx();
    if (!ctx) return;
    const t0 = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(vol * musicVolume, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  const Sound = {
    click()   { tone(520, 0.08, 'triangle', 0.15); },
    tap()     { tone(680 + Math.random() * 120, 0.05, 'square', 0.1); },
    good()    { tone(660, 0.1, 'sine', 0.2); tone(880, 0.14, 'sine', 0.18, 0.08); },
    bad()     { sweep(300, 90, 0.35, 'sawtooth', 0.18); },
    correct() { tone(784, 0.08, 'sine', 0.18); tone(1046, 0.12, 'sine', 0.16, 0.06); },
    countdown(){ tone(440, 0.12, 'triangle', 0.16); },
    go()      { tone(880, 0.2, 'sawtooth', 0.2); },
    star()    { tone(523, 0.1, 'sine', 0.18); tone(659, 0.1, 'sine', 0.18, 0.1); tone(784, 0.12, 'sine', 0.18, 0.2); tone(1046, 0.2, 'sine', 0.2, 0.3); },
    fanfare() {
      const notes = [523, 659, 784, 1046, 1318];
      notes.forEach((f, i) => tone(f, 0.3, 'triangle', 0.18, i * 0.13));
      tone(1568, 0.5, 'sine', 0.2, notes.length * 0.13);
    },
    whoosh()  { sweep(200, 900, 0.25, 'sine', 0.1); },
    explode() { sweep(180, 40, 0.5, 'sawtooth', 0.22); },
    dice()    {
      /* rattling dice tumble — short bursts of filtered noise */
      const ctx = ensureCtx(); if (!ctx || !soundEnabled) return;
      const t0 = ctx.currentTime;
      [0, 0.06, 0.13, 0.2].forEach(off => {
        const dur = 0.06;
        const buffer = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
        const src = ctx.createBufferSource(); src.buffer = buffer;
        const filter = ctx.createBiquadFilter(); filter.type = 'bandpass'; filter.frequency.value = 1200; filter.Q.value = 2.5;
        const gain = ctx.createGain(); gain.gain.setValueAtTime(0.22, t0 + off); gain.gain.exponentialRampToValueAtTime(0.001, t0 + off + dur);
        src.connect(filter).connect(gain).connect(ctx.destination);
        src.start(t0 + off); src.stop(t0 + off + dur);
      });
      tone(620, 0.14, 'triangle', 0.18, 0.26);
    },
    coin()    { tone(988, 0.06, 'sine', 0.2); tone(1319, 0.1, 'sine', 0.18, 0.05); tone(1568, 0.12, 'sine', 0.18, 0.1); },
    powerup() { sweep(400, 1400, 0.28, 'square', 0.14); },
    levelup() { [523, 659, 784, 1046, 1318, 1568].forEach((f, i) => tone(f, 0.18, 'triangle', 0.16, i * 0.08)); },
    event()   { sweep(600, 200, 0.4, 'sawtooth', 0.18); tone(220, 0.3, 'sine', 0.15, 0.1); }
  };

  /* ---------------- Background music — procedural loop ---------------- */
  let musicTimer = null;
  let musicEnabled = false;
  const MUSIC_CHORDS = [
    [220, 277, 330],   // A minor
    [196, 247, 294],   // G major
    [174, 220, 261],   // F major
    [165, 220, 247]    // E minor
  ];
  function startMusic() {
    if (musicTimer || !soundEnabled || !musicOn) return;
    musicEnabled = true;
    let bar = 0;
    function playBar() {
      if (!musicEnabled || !musicOn) return;
      const chord = MUSIC_CHORDS[bar % MUSIC_CHORDS.length];
      const t = 0;
      chord.forEach(f => toneMusic(f, 1.6, 'sine', 0.05, t));
      /* simple arpeggio */
      chord.forEach((f, i) => toneMusic(f * 2, 0.25, 'triangle', 0.06, i * 0.22));
      /* bass note */
      toneMusic(chord[0] / 2, 1.5, 'triangle', 0.08, 0);
      bar++;
      musicTimer = setTimeout(playBar, 1700);
    }
    playBar();
  }
  function stopMusic() {
    musicEnabled = false;
    if (musicTimer) { clearTimeout(musicTimer); musicTimer = null; }
  }

  function setSoundEnabled(on) { soundEnabled = on; if (on) ensureCtx(); }
  function isSoundEnabled() { return soundEnabled; }
  function setMusicVolumeInternal(v) { musicVolume = Math.max(0, Math.min(1, v)); }
  function setSfxVolumeInternal(v) { sfxVolume = Math.max(0, Math.min(1, v)); }
  function setMusicOnInternal(on) { musicOn = !!on; if (!on) stopMusic(); }
  function isMusicOnInternal() { return musicOn; }
  function getMusicVolumeInternal() { return musicVolume; }
  function getSfxVolumeInternal() { return sfxVolume; }

  /* ---------------- Animated Particle Background (disabled - 3D replaces it) ---------------- */
  /* Stoppt automatisch wenn ein Three.js Canvas vorhanden ist (3D Board aktiv) */
  const bgCanvas = document.getElementById('bg-canvas');
  const bgCtx = bgCanvas ? bgCanvas.getContext('2d') : null;
  let bgParticles = [];
  let W = 0, H = 0;
  let bgRunning = false;
  let bgHas3D = false;

  function resizeBg() {
    if (!bgCanvas) return;
    W = bgCanvas.width = window.innerWidth;
    H = bgCanvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resizeBg);
  resizeBg();

  const BG_COLORS = ['#ff3cac', '#7b2ff7', '#00f0ff', '#2bffb9', '#ffd34e'];
  function initBgParticles() {
    if (!bgCanvas) return;
    const count = Math.min(70, Math.floor((W * H) / 26000));
    bgParticles = [];
    for (let i = 0; i < count; i++) {
      bgParticles.push({
        x: Math.random() * W, y: Math.random() * H,
        r: 1 + Math.random() * 3.5,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        c: BG_COLORS[(Math.random() * BG_COLORS.length) | 0],
        a: 0.2 + Math.random() * 0.4
      });
    }
  }
  initBgParticles();
  window.addEventListener('resize', initBgParticles);

  function drawBg() {
    if (!bgCtx) return;
    /* Stoppe 2D-Partikel wenn 3D-Board aktiv ist (Performance auf Handy) */
    if (bgHas3D || document.hidden) {
      bgRunning = false;
      /* Retry nach 2s falls 3D deaktiviert oder Tab wieder sichtbar */
      setTimeout(() => { if (!bgHas3D && !document.hidden && bgCanvas) { bgRunning = true; requestAnimationFrame(drawBg); } }, 2000);
      return;
    }
    bgRunning = true;
    bgCtx.clearRect(0, 0, W, H);
    for (let i = 0; i < bgParticles.length; i++) {
      const p = bgParticles[i];
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
      bgCtx.globalAlpha = p.a;
      bgCtx.fillStyle = p.c;
      bgCtx.beginPath();
      bgCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      bgCtx.fill();
      for (let j = i + 1; j < bgParticles.length; j++) {
        const q = bgParticles[j];
        const dx = p.x - q.x, dy = p.y - q.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 14000) {
          bgCtx.globalAlpha = (1 - d2 / 14000) * 0.12;
          bgCtx.strokeStyle = p.c;
          bgCtx.lineWidth = 1;
          bgCtx.beginPath();
          bgCtx.moveTo(p.x, p.y);
          bgCtx.lineTo(q.x, q.y);
          bgCtx.stroke();
        }
      }
    }
    bgCtx.globalAlpha = 1;
    requestAnimationFrame(drawBg);
  }
  if (bgCanvas) drawBg();

  /* Oeffentliche Funktion: 3D-Modus aktivieren/deaktivieren */
  function setBg3DActive(on) { bgHas3D = !!on; }

  /* ---------------- Confetti / FX Layer ---------------- */
  const fxCanvas = document.getElementById('fx-canvas');
  const fxCtx = fxCanvas ? fxCanvas.getContext('2d') : null;
  let confetti = [];

  function resizeFx() { if (fxCanvas) { fxCanvas.width = window.innerWidth; fxCanvas.height = window.innerHeight; } }
  window.addEventListener('resize', resizeFx);
  resizeFx();

  const CONF_COLORS = ['#ff3cac', '#7b2ff7', '#00f0ff', '#2bffb9', '#ffd34e', '#ffffff', '#ff6a00'];

  function burst(x, y, amount = 60, power = 12) {
    for (let i = 0; i < amount; i++) {
      const ang = Math.random() * Math.PI * 2;
      const sp = Math.random() * power + 2;
      confetti.push({
        x, y,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp - 4,
        g: 0.25 + Math.random() * 0.15,
        size: 5 + Math.random() * 8,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.4,
        c: CONF_COLORS[(Math.random() * CONF_COLORS.length) | 0],
        life: 1,
        decay: 0.006 + Math.random() * 0.01,
        shape: Math.random() < 0.5 ? 'rect' : 'circ'
      });
    }
    ensureFxLoop();
  }

  function rain(amount = 140) {
    const w = fxCanvas.width;
    for (let i = 0; i < amount; i++) {
      confetti.push({
        x: Math.random() * w,
        y: -20 - Math.random() * 200,
        vx: (Math.random() - 0.5) * 3,
        vy: 3 + Math.random() * 5,
        g: 0.06,
        size: 6 + Math.random() * 9,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.3,
        c: CONF_COLORS[(Math.random() * CONF_COLORS.length) | 0],
        life: 1,
        decay: 0.004 + Math.random() * 0.004,
        shape: Math.random() < 0.5 ? 'rect' : 'circ'
      });
    }
    ensureFxLoop();
  }

  let fxRunning = false;
  function ensureFxLoop() { if (!fxRunning && fxCtx) { fxRunning = true; requestAnimationFrame(drawFx); } }

  function drawFx() {
    if (!fxCtx || !fxCanvas) { fxRunning = false; return; }
    fxCtx.clearRect(0, 0, fxCanvas.width, fxCanvas.height);
    for (let i = confetti.length - 1; i >= 0; i--) {
      const c = confetti[i];
      c.vy += c.g; c.x += c.vx; c.y += c.vy; c.rot += c.vr; c.life -= c.decay;
      if (c.life <= 0 || c.y > fxCanvas.height + 40) { confetti.splice(i, 1); continue; }
      fxCtx.save();
      fxCtx.globalAlpha = Math.max(0, c.life);
      fxCtx.translate(c.x, c.y);
      fxCtx.rotate(c.rot);
      fxCtx.fillStyle = c.c;
      if (c.shape === 'rect') fxCtx.fillRect(-c.size / 2, -c.size / 2, c.size, c.size * 0.6);
      else { fxCtx.beginPath(); fxCtx.arc(0, 0, c.size / 2, 0, Math.PI * 2); fxCtx.fill(); }
      fxCtx.restore();
    }
    if (confetti.length > 0) requestAnimationFrame(drawFx);
    else { fxCtx.clearRect(0, 0, fxCanvas.width, fxCanvas.height); fxRunning = false; }
  }

  function celebrate() {
    rain(160);
    const cx = window.innerWidth / 2;
    burst(cx, window.innerHeight * 0.4, 90, 16);
    setTimeout(() => burst(cx * 0.5, window.innerHeight * 0.5, 60, 14), 250);
    setTimeout(() => burst(cx * 1.5, window.innerHeight * 0.5, 60, 14), 450);
  }

  /* Münz-Regen — goldene Konfetti-Münzen fallen von oben */
  function coinRain(amount = 80) {
    const w = fxCanvas ? fxCanvas.width : window.innerWidth;
    const COIN_COLORS = ['#ffd34e', '#ffce3a', '#f5b800', '#ffe680'];
    for (let i = 0; i < amount; i++) {
      confetti.push({
        x: Math.random() * w,
        y: -20 - Math.random() * 300,
        vx: (Math.random() - 0.5) * 2,
        vy: 2 + Math.random() * 4,
        g: 0.12,
        size: 10 + Math.random() * 8,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.25,
        c: COIN_COLORS[(Math.random() * COIN_COLORS.length) | 0],
        life: 1,
        decay: 0.003 + Math.random() * 0.003,
        shape: 'circ',
        coin: true
      });
    }
    ensureFxLoop();
  }

  /* Floating score popup — Zahl schwebt nach oben und verblasst */
  function scorePopup(parent, text, color = '#ffd34e') {
    if (!parent) return;
    const pop = document.createElement('div');
    pop.className = 'score-popup';
    pop.textContent = text;
    pop.style.color = color;
    parent.appendChild(pop);
    setTimeout(() => { if (pop.parentNode) pop.remove(); }, 1400);
  }

  /* Smooth screen transition — fade-out → swap → fade-in */
  function transitionScreen(el, done) {
    if (!el) { if (typeof done === 'function') done(); return; }
    el.classList.remove('screen-in');
    el.classList.add('screen-out');
    setTimeout(() => {
      if (typeof done === 'function') done();
      el.classList.remove('screen-out');
      el.classList.add('screen-in');
    }, 240);
  }

  /* ---------------- Screen shake & floating toast ---------------- */
  function shake(el) {
    if (!el) return;
    el.classList.remove('shake');
    void el.offsetWidth;
    el.classList.add('shake');
  }

  function toast(parent, text, color = '#fff') {
    if (!parent) return;
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = text;
    t.style.color = color;
    parent.appendChild(t);
    setTimeout(() => t.remove(), 3500);
  }

  return {
    Sound, setSoundEnabled, isSoundEnabled,
    ensureCtx, setBg3DActive,
    startMusic, stopMusic,
    setMusicVolumeInternal, setSfxVolumeInternal,
    setMusicOnInternal, isMusicOnInternal,
    getMusicVolumeInternal, getSfxVolumeInternal,
    burst, rain, celebrate, shake, toast,
    coinRain, scorePopup, transitionScreen,
    confettiAt: burst
  };
})();
