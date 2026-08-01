/* ============================================================
   PARTY ARENA — Spieler-Logik (Handy)
   Nutzt die bestehenden Mini-Spiele aus games.js
   ============================================================ */
(() => {
  'use strict';

  const $ = s => document.querySelector(s);

  /* Shared Helfer (vor allen Funktionsdefinitionen verfuegbar machen) */
  const el = PartyArenaShared.el;
  const escapeHtml = PartyArenaShared.escapeHtml;
  const initials = PartyArenaShared.initials;

  const FIGURES = ['🚀', '🐱', '🦊', '🐸', '🐼', '🦄', '🤖', '🐙'];
  const UI_MODES = ['compact', 'normal', 'large'];
  const LANGS = ['de', 'en'];
  const SETTINGS_KEY = 'pa_settings';
  const VIB_STORAGE_KEY = 'pa_vibration';
  let settings = loadSettings();
  let currentLang = settings.lang || 'de';
  let vibrationEnabled = settings.vibration !== false;

  /* ---------- Sound / Audio Settings (vor Init verfuegbar, sonst TDZ-Bug) ---------- */
  const ASL = window.AudioSettingsLogic;
  let audioSettings = ASL ? ASL.loadAudioSettings(localStorage) : null;
  if (audioSettings && ASL && settings) {
    audioSettings = ASL.setMusicVolume(ASL.setSfxVolume(
      ASL.toggleMusic(ASL.toggleSfx(audioSettings, !settings.sfx), settings.sfx),
      settings.sfxVolume), settings.musicVolume);
  }

  const screens = {};
  document.querySelectorAll('.screen').forEach(s => screens[s.dataset.screen] = s);
  function showScreen(name) {
    const next = screens[name];
    const current = document.querySelector('.screen.active');
    if (current && current !== next && window.FX && FX.transitionScreen) {
      FX.transitionScreen(current, () => {
        Object.values(screens).forEach(s => { s.classList.remove('active'); s.classList.remove('game-fixed'); });
        if (next) {
          next.classList.add('active');
          next.classList.add('screen-in');
          if (name === 'play') next.classList.add('game-fixed');
        }
        document.body.classList.toggle('in-game', !['join', 'lobby', 'menu'].includes(name));
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    } else {
      Object.values(screens).forEach(s => { s.classList.remove('active'); s.classList.remove('game-fixed'); });
      if (next) {
        next.classList.add('active');
        if (window.FX) next.classList.add('screen-in');
        if (name === 'play') next.classList.add('game-fixed');
      }
      document.body.classList.toggle('in-game', !['join', 'lobby', 'menu'].includes(name));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  const me = { id: null, name: '', color: '#ff3cac', figure: '🚀' };
  const board = {
    tiles: [], owners: {}, players: [], lapsDone: 0, lapsTotal: 0, log: '', history: [],
    phase: 'turn', turnPlayerId: null, pendingPlayerId: null,
    itemPacks: {},
    panel: 'map',
    badges: { action: 0, ranking: 0, profile: 0, map: 0 },
  };
  const centerActions = { text: '', buttons: [] };
  const boardAnim = { active: false, playerId: null, pos: 0, to: 0, timer: null };
  const storyPopup = { queue: [], showing: false };
  const eventReveal = { queue: [], showing: false };
  let turnNoticeEl = null;
  let boardModeActive = false;
  const hudScore = $('#hud-score');
  let lastScoreSent = 0, scoreThrottle = 0;
  let autoJoinTried = false;
  let uiMode = 'compact';

  /* ---------- Meta-Progression (XP, Level, Sterne, Achievements) ---------- */
  const MPL = window.MetaProgressionLogic;
  function loadProgression() {
    try {
      const raw = localStorage.getItem('pa_progression');
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return MPL ? MPL.createProgression() : { xp: 0, totalXp: 0, level: 0, stars: 0, gamesPlayed: 0 };
  }
  function saveProgression(p) {
    try { localStorage.setItem('pa_progression', JSON.stringify(p)); } catch (_) {}
  }
  function loadAchState() {
    try {
      const raw = localStorage.getItem('pa_achievements');
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return MPL ? MPL.createAchievementState() : { unlocked: {} };
  }
  function saveAchState(a) {
    try { localStorage.setItem('pa_achievements', JSON.stringify(a)); } catch (_) {}
  }
  let progression = loadProgression();
  let achState = loadAchState();
  updateMenuStats();

  /* ---------- Unlock-State (Shop) ---------- */
  function loadUnlockState() {
    try {
      const raw = localStorage.getItem('pa_unlocks');
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return MPL ? MPL.createUnlockState() : { owned: {} };
  }
  function saveUnlockState(s) {
    try { localStorage.setItem('pa_unlocks', JSON.stringify(s)); } catch (_) {}
  }
  let unlockState = loadUnlockState();
  let selectedCharId = 'char_rocket';
  let shopOpen = false;
  let shopTab = 'characters';

  /* ---------- IAP-State ---------- */
  function loadIapState() {
    try {
      const raw = localStorage.getItem('pa_iap');
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return window.IapLogic ? window.IapLogic.createIapState() : { purchased: {}, premium: false };
  }
  function saveIapState(s) {
    try { localStorage.setItem('pa_iap', JSON.stringify(s)); } catch (_) {}
  }
  let iapState = loadIapState();

  function updateLobbyMeta() {
    const el = $('#lobby-meta');
    if (!el || !MPL) return;
    const xpNext = MPL.xpToNextLevel(progression.totalXp);
    const xpCur = MPL.currentLevelXp(progression.totalXp);
    const xpNeed = MPL.xpForLevel(progression.level);
    const pct = xpNeed > 0 ? Math.min(100, Math.round((xpCur / xpNeed) * 100)) : 0;
    const ownedAch = MPL.getUnlockedAchievements(achState);
    el.innerHTML = `
      <div class="meta-level">Level ${progression.level}</div>
      <div class="meta-xp-bar"><div class="meta-xp-fill" style="width:${pct}%"></div></div>
      <div class="meta-xp-text">${xpCur} / ${xpNeed} XP — ${xpNext} bis Level ${progression.level + 1}</div>
      <div class="meta-stats">
        <span class="meta-stat">⭐ ${progression.stars} Sterne</span>
        <span class="meta-stat">🎮 ${progression.gamesPlayed} Spiele</span>
        <span class="meta-stat">🏆 ${ownedAch.length}/${MPL.ACHIEVEMENTS.length} Achievements</span>
      </div>`;
  }

  function updateMenuStats() {
    const levelEl = $('#menu-level');
    const starsEl = $('#menu-stars');
    const xpEl = $('#menu-xp');
    const xpFill = $('#menu-xp-fill');
    const xpText = $('#menu-xp-text');
    if (levelEl) levelEl.textContent = 'Level ' + (progression.level || 0);
    if (starsEl) starsEl.textContent = (progression.stars || 0) + ' Sterne';
    if (xpEl) xpEl.textContent = (progression.totalXp || 0) + ' XP';
    if (MPL && xpFill && xpText) {
      const xpNeed = MPL.xpForLevel(progression.level);
      const xpCur = MPL.currentLevelXp(progression.totalXp);
      const pct = xpNeed > 0 ? Math.min(100, Math.round((xpCur / xpNeed) * 100)) : 0;
      xpFill.style.width = pct + '%';
      xpText.textContent = xpCur + ' / ' + xpNeed + ' XP';
    }
    updateJoinStarCount();
  }

  function updateUiSizeButton() {
    const btn = $('#ui-size-toggle');
    if (!btn) return;
    const map = {
      compact: { text: 'A-', title: 'Anzeige: Kompakt' },
      normal: { text: 'A', title: 'Anzeige: Normal' },
      large: { text: 'A+', title: 'Anzeige: Groß' },
    };
    const cfg = map[uiMode] || map.compact;
    btn.textContent = cfg.text;
    btn.title = `${cfg.title} (tippen zum Wechseln)`;
  }

  function applyUiMode(mode, persist = true) {
    uiMode = UI_MODES.includes(mode) ? mode : 'compact';
    document.body.classList.remove('player-ui-compact', 'player-ui-normal', 'player-ui-large');
    document.body.classList.add(`player-ui-${uiMode}`);
    if (persist) {
      try { localStorage.setItem('pa_ui_mode', uiMode); } catch (_) {}
    }
    updateUiSizeButton();
  }

  function cycleUiMode() {
    const idx = UI_MODES.indexOf(uiMode);
    const next = UI_MODES[(idx + 1) % UI_MODES.length];
    applyUiMode(next, true);
    FX.Sound.tap();
  }

  function initUiMode() {
    const savedUi = settings.uiSize || 'compact';
    applyUiMode(savedUi, false);
    const btn = $('#ui-size-toggle');
    if (btn) btn.addEventListener('click', cycleUiMode);
  }

  function vibrate(ms) {
    if (!vibrationEnabled) return;
    try { if (navigator.vibrate) navigator.vibrate(ms); } catch (_) {}
  }

  /* ---------- Settings ---------- */
  function defaultSettings() {
    return {
      lang: 'de',
      music: true,
      musicVolume: 0.5,
      sfx: true,
      sfxVolume: 0.7,
      uiSize: 'compact',
      vibration: true,
    };
  }

  function loadSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) return { ...defaultSettings(), ...JSON.parse(raw) };
    } catch (_) {}
    const legacy = tryLoadLegacySettings();
    return { ...defaultSettings(), ...legacy };
  }

  function tryLoadLegacySettings() {
    const out = {};
    try {
      const old = localStorage.getItem('pa_audio_settings');
      if (old) {
        const a = JSON.parse(old);
        out.music = !!a.musicEnabled;
        out.sfx = !!a.sfxEnabled;
        out.musicVolume = Math.max(0, Math.min(1, a.musicVolume != null ? a.musicVolume : 0.5));
        out.sfxVolume = Math.max(0, Math.min(1, a.sfxVolume != null ? a.sfxVolume : 0.7));
      }
    } catch (_) {}
    try {
      const uim = localStorage.getItem('pa_ui_mode');
      if (uim) out.uiSize = uim;
    } catch (_) {}
    try {
      const vib = localStorage.getItem(VIB_STORAGE_KEY);
      if (vib != null) out.vibration = vib === 'true';
    } catch (_) {}
    return out;
  }

  function saveSettings() {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch (_) {}
    /* keep legacy audio key in sync for safety */
    try {
      localStorage.setItem('pa_audio_settings', JSON.stringify({
        musicEnabled: settings.music,
        sfxEnabled: settings.sfx,
        musicVolume: settings.musicVolume,
        sfxVolume: settings.sfxVolume,
      }));
    } catch (_) {}
    try { localStorage.setItem('pa_ui_mode', settings.uiSize); } catch (_) {}
    try { localStorage.setItem(VIB_STORAGE_KEY, String(settings.vibration)); } catch (_) {}
  }

  function applySettings(skipOverlayUpdate = false) {
    applyLanguage(currentLang);
    applyAudioFromSettings();
    applyUiMode(settings.uiSize || 'compact', false);
    vibrationEnabled = settings.vibration !== false;
    if (!skipOverlayUpdate && $('#settings-overlay')) updateSettingsUI();
  }

  function applyAudioFromSettings() {
    if (!ASL) return;
    let s = audioSettings || ASL.createAudioSettings();
    s = ASL.toggleMusic(s, settings.music ? !ASL.isMusicOn(s) : ASL.isMusicOn(s));
    s = ASL.toggleSfx(s, settings.sfx ? !ASL.isSfxOn(s) : ASL.isSfxOn(s));
    s = ASL.setMusicVolume(s, settings.musicVolume);
    s = ASL.setSfxVolume(s, settings.sfxVolume);
    audioSettings = s;
    ASL.saveAudioSettings(audioSettings, localStorage);
    if (window.FX) {
      FX.setSoundEnabled(ASL.isMusicOn(audioSettings) || ASL.isSfxOn(audioSettings));
      FX.setMusicOnInternal(ASL.isMusicOn(audioSettings));
      FX.setSfxVolumeInternal(ASL.getSfxVolume(audioSettings));
      FX.setMusicVolumeInternal(ASL.getMusicVolume(audioSettings));
      if (ASL.isMusicOn(audioSettings)) FX.startMusic();
      else FX.stopMusic();
    }
  }

  function openSettings() {
    const overlay = $('#settings-overlay');
    if (!overlay) return;
    overlay.hidden = false;
    overlay.classList.add('active');
    updateSettingsUI();
  }

  function closeSettings() {
    const overlay = $('#settings-overlay');
    if (!overlay) return;
    overlay.classList.remove('active');
    overlay.hidden = true;
  }

  function updateSettingsUI() {
    const langSel = $('#settings-lang');
    const musicTog = $('#settings-music');
    const sfxTog = $('#settings-sfx');
    const musicVol = $('#settings-music-vol');
    const sfxVol = $('#settings-sfx-vol');
    const uiSel = $('#settings-ui-size');
    const vibTog = $('#settings-vibration');
    if (langSel) langSel.value = currentLang;
    if (musicTog) musicTog.checked = !!settings.music;
    if (sfxTog) sfxTog.checked = !!settings.sfx;
    if (musicVol) {
      musicVol.value = Math.round((settings.musicVolume || 0) * 100);
      musicVol.disabled = !settings.music;
    }
    if (sfxVol) {
      sfxVol.value = Math.round((settings.sfxVolume || 0) * 100);
      sfxVol.disabled = !settings.sfx;
    }
    if (uiSel) uiSel.value = settings.uiSize || 'compact';
    if (vibTog) vibTog.checked = settings.vibration !== false;
  }

  function initSettings() {
    applySettings(true);
    const overlay = $('#settings-overlay');
    const closeBtn = $('#settings-close');
    if (closeBtn) closeBtn.addEventListener('click', closeSettings);
    if (overlay) overlay.addEventListener('click', e => { if (e.target === overlay) closeSettings(); });

    const langSel = $('#settings-lang');
    if (langSel) langSel.addEventListener('change', () => {
      currentLang = langSel.value;
      settings.lang = currentLang;
      saveSettings();
      applySettings();
      vibrate(20);
      FX.Sound.tap && FX.Sound.tap();
    });

    const musicTog = $('#settings-music');
    if (musicTog) musicTog.addEventListener('change', () => {
      settings.music = musicTog.checked;
      saveSettings();
      applyAudioFromSettings();
      updateSettingsUI();
    });

    const sfxTog = $('#settings-sfx');
    if (sfxTog) sfxTog.addEventListener('change', () => {
      settings.sfx = sfxTog.checked;
      saveSettings();
      applyAudioFromSettings();
      updateSettingsUI();
      if (settings.sfx) FX.Sound.tap && FX.Sound.tap();
    });

    const musicVol = $('#settings-music-vol');
    if (musicVol) musicVol.addEventListener('input', () => {
      settings.musicVolume = parseInt(musicVol.value, 10) / 100;
      saveSettings();
      applyAudioFromSettings();
    });

    const sfxVol = $('#settings-sfx-vol');
    if (sfxVol) sfxVol.addEventListener('input', () => {
      settings.sfxVolume = parseInt(sfxVol.value, 10) / 100;
      saveSettings();
      applyAudioFromSettings();
      if (settings.sfx) FX.Sound.tap && FX.Sound.tap();
    });

    const uiSel = $('#settings-ui-size');
    if (uiSel) uiSel.addEventListener('change', () => {
      settings.uiSize = uiSel.value;
      saveSettings();
      applyUiMode(settings.uiSize, true);
      vibrate(20);
      FX.Sound.tap && FX.Sound.tap();
    });

    const vibTog = $('#settings-vibration');
    if (vibTog) vibTog.addEventListener('change', () => {
      settings.vibration = vibTog.checked;
      vibrationEnabled = settings.vibration;
      saveSettings();
      if (vibTog.checked) vibrate(30);
      FX.Sound.tap && FX.Sound.tap();
    });

    const resetBtn = $('#settings-reset');
    if (resetBtn) resetBtn.addEventListener('click', () => {
      const ok = confirm(i18nText('resetConfirm') || 'Fortschritt wirklich zurücksetzen? Alle XP, Sterne und Freischaltungen gehen verloren.');
      if (!ok) return;
      try {
        if (window.MetaProg && typeof MetaProg.reset === 'function') MetaProg.reset();
      } catch (_) {}
      try {
        localStorage.removeItem('pa_progression');
        localStorage.removeItem('pa_achievements');
        localStorage.removeItem('pa_unlocks');
        localStorage.removeItem('pa_iap');
        localStorage.removeItem(SETTINGS_KEY);
        localStorage.removeItem('pa_audio_settings');
        localStorage.removeItem('pa_ui_mode');
        localStorage.removeItem(VIB_STORAGE_KEY);
      } catch (_) {}
      location.reload();
    });

    const restoreBtn = $('#settings-restore');
    if (restoreBtn) restoreBtn.addEventListener('click', () => {
      const IAP = window.IapLogic;
      if (!IAP) return;
      const hint = $('#settings-hint');
      if (hint) { hint.textContent = 'Stelle Kaeufe wieder her...'; hint.className = 'settings-hint'; }
      IAP.restorePurchases().then(function(ownedIds) {
        ownedIds.forEach(function(id) {
          IAP.markPurchased(iapState, id);
        });
        saveIapState(iapState);
        if (iapState.premium) {
          applyPremiumUnlocks('premium_unlock');
        }
        if (hint) { hint.textContent = ownedIds.length > 0 ? ownedIds.length + ' Kaeufe wiederhergestellt!' : 'Keine Kaeufe gefunden.'; hint.className = 'settings-hint success'; }
        setTimeout(function() { if (hint) { hint.textContent = ''; hint.className = 'settings-hint'; } }, 3000);
      }).catch(function() {
        if (hint) { hint.textContent = 'Fehler beim Wiederherstellen'; hint.className = 'settings-hint error'; }
      });
    });
  }

  function i18nText(key) {
    return (I18N[currentLang] && I18N[currentLang][key]) || (I18N.de && I18N.de[key]) || key;
  }

  function applyLanguage(lang) {
    if (!LANGS.includes(lang)) lang = 'de';
    currentLang = lang;
    document.documentElement.lang = lang;

    const btnJoin = $('#btn-menu-join');
    if (btnJoin) btnJoin.firstChild.textContent = i18nText('menuJoin') + ' ';
    const btnShop = $('#btn-menu-shop');
    if (btnShop) btnShop.firstChild.textContent = i18nText('menuShop') + ' ';
    const btnSettings = $('#btn-menu-settings');
    if (btnSettings) btnSettings.firstChild.textContent = i18nText('menuSettings') + ' ';
    const backBtn = $('#btn-back-to-menu');
    if (backBtn) backBtn.textContent = i18nText('back');

    const joinTitle = document.querySelector('[data-screen="join"] .card-title');
    if (joinTitle) joinTitle.textContent = i18nText('joinTitle');
    const nameLabel = $('label[for="name-input"]');
    if (nameLabel) nameLabel.textContent = i18nText('nameLabel');
    const figureLabel = document.querySelectorAll('label.field-label')[1];
    if (figureLabel) figureLabel.textContent = i18nText('figureLabel');
    const codeLabel = $('label[for="code-input"]');
    if (codeLabel) codeLabel.textContent = i18nText('codeLabel');
    const joinBtn = $('#btn-join');
    if (joinBtn) joinBtn.textContent = '🚀 ' + i18nText('joinBtn');
    const hostBtn = $('#btn-host-create');
    if (hostBtn) hostBtn.textContent = '🛠️ ' + i18nText('hostBtn');
    const shopBtn2 = $('#btn-shop');
    if (shopBtn2) shopBtn2.firstChild.textContent = '🛒 ' + i18nText('shopBtn') + ' ';

    const lobbyWait = $('#lobby-players');
    if (lobbyWait) {
      const n = (board.players || []).length;
      lobbyWait.textContent = n >= 2
        ? i18nText('lobbyWaitingPlural').replace('{n}', n)
        : i18nText('lobbyWaiting');
    }

    const shopTitle = document.querySelector('#shop-overlay .shop-title');
    if (shopTitle) shopTitle.textContent = '🛒 ' + i18nText('shopTitle');
    const shopTabs = document.querySelectorAll('.shop-tab');
    shopTabs.forEach(t => {
      if (t.dataset.tab === 'characters') t.textContent = i18nText('shopTabCharacters');
      if (t.dataset.tab === 'trails') t.textContent = i18nText('shopTabTrails');
    });

    const settingsTitle = document.querySelector('#settings-overlay .shop-title');
    if (settingsTitle) settingsTitle.textContent = '⚙️ ' + i18nText('settingsTitle');
    const settingsSections = document.querySelectorAll('.settings-section h3');
    settingsSections.forEach(h3 => {
      const txt = h3.textContent || '';
      if (txt.includes('🌐')) h3.textContent = '🌐 ' + i18nText('settingsLang');
      else if (txt.includes('🔊')) h3.textContent = '🔊 ' + i18nText('settingsAudio');
      else if (txt.includes('📱')) h3.textContent = '📱 ' + i18nText('settingsDisplay');
      else if (txt.includes('👤')) h3.textContent = '👤 ' + i18nText('settingsAccount');
    });
  }

  const I18N = {
    de: {
      menuJoin: '🎮 Spiel beitreten',
      menuShop: '🛒 Shop',
      menuSettings: '⚙️ Einstellungen',
      back: '← Zurück',
      joinTitle: '🎮 Beitreten',
      nameLabel: 'Dein Name',
      figureLabel: 'Figur wählen',
      codeLabel: 'Raum-Code',
      joinBtn: 'Mitspielen',
      hostBtn: 'Raum erstellen (Host)',
      shopBtn: 'Shop',
      lobbyWaiting: 'Warte auf weitere Spieler…',
      lobbyWaitingPlural: '{n} Spieler im Raum — warte auf den Start…',
      shopTitle: 'Shop',
      shopTabCharacters: 'Charaktere',
      shopTabTrails: 'Trails',
      settingsTitle: 'Einstellungen',
      settingsLang: 'Sprache',
      settingsAudio: 'Audio',
      settingsDisplay: 'Anzeige',
      settingsAccount: 'Account',
      resetConfirm: 'Fortschritt wirklich zurücksetzen? Alle XP, Sterne und Freischaltungen gehen verloren.',
    },
    en: {
      menuJoin: '🎮 Join Game',
      menuShop: '🛒 Shop',
      menuSettings: '⚙️ Settings',
      back: '← Back',
      joinTitle: '🎮 Join',
      nameLabel: 'Your Name',
      figureLabel: 'Choose Figure',
      codeLabel: 'Room Code',
      joinBtn: 'Play',
      hostBtn: 'Create Room (Host)',
      shopBtn: 'Shop',
      lobbyWaiting: 'Waiting for more players…',
      lobbyWaitingPlural: '{n} players in room — waiting for host to start…',
      shopTitle: 'Shop',
      shopTabCharacters: 'Characters',
      shopTabTrails: 'Trails',
      settingsTitle: 'Settings',
      settingsLang: 'Language',
      settingsAudio: 'Audio',
      settingsDisplay: 'Display',
      settingsAccount: 'Account',
      resetConfirm: 'Really reset all progress? All XP, stars and unlocks will be lost.',
    },
  };

  /* ---------- Turn-Notice (aus shared.js) ---------- */
  function ensureTurnNotice() { return PartyArenaShared.ensureTurnNotice(); }
  function hideTurnNotice() { PartyArenaShared.hideTurnNotice(); }
  function showTurnNotice(text, actions) { PartyArenaShared.showTurnNotice(text, actions); }

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
    const savedCharId = localStorage.getItem('pa_char_id');
    if (savedFigure) me.figure = savedFigure;
    if (savedCharId) selectedCharId = savedCharId;
  } catch (_) {}
  renderFigurePicker();
  initUiMode();
  initShop();
  initSettings();

  /* ---------- Verbindung ---------- */
  if (location.protocol === 'file:') {
    showJoinError('⚠️ Bitte die Adresse vom Host-Bildschirm im Browser öffnen (z.B. http://192.168.…:3000/), nicht die Datei direkt.');
  } else {
    Net.connect(() => tryAutoJoin(), () => {
      /* Reconnect: versuche auto-join mit gespeicherten Token */
      autoJoinTried = false;
      tryAutoJoin();
    });
  }

  $('#btn-join').addEventListener('click', doJoin);
  const btnHostCreate = $('#btn-host-create');
  if (btnHostCreate) btnHostCreate.addEventListener('click', () => { location.href = '/host'; });
  const btnInGameEnd = $('#btn-in-game-end');
  if (btnInGameEnd) btnInGameEnd.addEventListener('click', () => {
    Net.send({ type: 'player:endGame' });
    showScreen('menu');
    showJoinError('Spiel wurde beendet.');
  });
  $('#code-input').addEventListener('keydown', e => { if (e.key === 'Enter') doJoin(); });
  $('#name-input').addEventListener('keydown', e => { if (e.key === 'Enter') $('#code-input').focus(); });

  /* ---------- Hauptmenue-Buttons ---------- */
  const btnMenuJoin = $('#btn-menu-join');
  if (btnMenuJoin) btnMenuJoin.addEventListener('click', () => {
    showScreen('join');
    FX.Sound.tap();
  });
  const btnMenuShop = $('#btn-menu-shop');
  if (btnMenuShop) btnMenuShop.addEventListener('click', () => {
    openShop();
  });
  const btnMenuSettings = $('#btn-menu-settings');
  if (btnMenuSettings) btnMenuSettings.addEventListener('click', () => {
    openSettings();
    FX.Sound.tap();
  });
  const btnBackToMenu = $('#btn-back-to-menu');
  if (btnBackToMenu) btnBackToMenu.addEventListener('click', () => {
    showScreen('menu');
    FX.Sound.tap();
  });

  function doJoin() {
    const name = $('#name-input').value.trim();
    const code = $('#code-input').value.trim().toUpperCase();
    if (!name) return showJoinError('Bitte einen Namen eingeben.');
    if (code.length !== 5) return showJoinError('Bitte den 5-stelligen Raum-Code eingeben.');
    try { localStorage.setItem('pa_name', name); } catch (_) {}
    try { localStorage.setItem('pa_figure', me.figure); } catch (_) {}
    try { localStorage.setItem('pa_last_code', code); } catch (_) {}
    let pid = null;
    let token = '';
    try { pid = localStorage.getItem('pa_pid_' + code); } catch (_) {}
    try { token = localStorage.getItem('pa_ptok_' + code) || ''; } catch (_) {}
    Net.send({ type: 'player:join', name, code, playerId: pid, reconnectToken: token, figure: me.figure });
    FX.Sound.click();
  }
  function showJoinError(msg) {
    const e = $('#join-error');
    e.textContent = '⚠️ ' + msg; e.style.color = '#ff4d6d';
    FX.Sound.bad();
  }

  Net.on('joinError', m => showJoinError(m.message));

  Net.on('rateLimit', m => {
    if (typeof FX !== 'undefined' && FX.Sound) FX.Sound.bad();
    console.warn('[rateLimit]', m && m.message);
  });

  Net.on('joined', m => {
    me.id = m.playerId; me.name = m.name; me.color = m.color;
    me.figure = m.figure || me.figure;
    try { localStorage.setItem('pa_pid_' + m.code, m.playerId); } catch (_) {}
    try { if (m.reconnectToken) localStorage.setItem('pa_ptok_' + m.code, m.reconnectToken); } catch (_) {}
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
    updateLobbyMeta();
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
    const desc = $('#p-intro-desc');
    if (desc) desc.textContent = m.game.desc || '';
    $('#p-intro-rules').innerHTML = m.game.rules;
    if (window.Party3D) Party3D.setGame(m.game);
    FX.Sound.whoosh();
    showScreen('round-intro');
  });

  Net.on('start', m => {
    if (window.Party3D) Party3D.setGame(m.game);
    startPlay(m.game, {
      round: m.round || 1,
      quizSeed: Number.isFinite(Number(m.game && m.game.quizSeed)) ? Number(m.game.quizSeed) : null,
    });
  });

  Net.on('board:init', m => {
    boardModeActive = true;
    board.tiles = m.tiles || [];
    board.itemPacks = m.itemPacks || {};
    board.players = m.players || [];
    board.history = [];
    if (window.Party3D) Party3D.setBoardState({ tiles: board.tiles, players: board.players, owners: {} });
    else if (window.Board2D) Board2D.setBoardState({ tiles: board.tiles, players: board.players, owners: {} });
    /* Hintergrundmusik starten (procedural, kein Asset) */
    if (window.FX && FX.startMusic) FX.startMusic();
    updateMyBoardStats();
    renderBoardGrid();
    renderBoardRanking();
    renderProfileCard();
    renderBoardTimeline();
    renderBoardPills();         /* NEU Layout C: Spieler-Pillbar initial */
    setupBoardSlides();         /* NEU Layout C: Slide-Panels + Menü einmalig binden */
    showScreen('board');
  });

  Net.on('board:update', m => {
    boardModeActive = true;
    board.tiles = m.tiles || board.tiles;
    board.itemPacks = m.itemPacks || board.itemPacks;
    board.owners = m.owners || {};
    board.players = m.players || [];
    board.phase = m.phase || board.phase;
    board.turnPlayerId = m.turnPlayerId || null;
    board.pendingPlayerId = m.pendingPlayerId || null;
    board.lapsDone = m.lapsDone || 0;
    board.lapsTotal = m.lapsTotal || 0;
    board.log = m.log || '';
    board.history = Array.isArray(m.history) ? m.history.slice(-20) : board.history;
    renderBoardFromDiff();
  });

  Net.on('board:updateDiff', m => {
    const diff = m && m.diff;
    if (!diff) return;
    boardModeActive = true;
    if (Array.isArray(diff.tiles)) {
      if (!board.tiles) board.tiles = [];
      diff.tiles.forEach(({ index, tile }) => {
        if (index != null) board.tiles[index] = tile;
      });
    }
    if (diff.players) {
      if (!board.players) board.players = [];
      const byId = {};
      board.players.forEach(p => { byId[p.id] = p; });
      Object.entries(diff.players).forEach(([pid, changes]) => {
        if (byId[pid]) {
          Object.assign(byId[pid], changes);
        } else if (changes && typeof changes === 'object') {
          board.players.push(changes);
        }
      });
    }
    if (diff.owners) {
      board.owners = board.owners || {};
      Object.assign(board.owners, diff.owners);
    }
    if (Array.isArray(diff.history) && diff.history.length) {
      board.history = (board.history || []).concat(diff.history).slice(-20);
    }
    if (diff.phase != null) board.phase = diff.phase;
    if (diff.turnPlayerId !== undefined) board.turnPlayerId = diff.turnPlayerId || null;
    if (diff.pendingPlayerId !== undefined) board.pendingPlayerId = diff.pendingPlayerId || null;
    if (diff.lapsDone != null) board.lapsDone = diff.lapsDone;
    if (diff.lapsTotal != null) board.lapsTotal = diff.lapsTotal;
    if (diff.log != null) board.log = diff.log;
    if (diff.lastLuckyPlayer !== undefined) board.lastLuckyPlayer = diff.lastLuckyPlayer;
    if (diff.itemPacks) board.itemPacks = Object.assign({}, board.itemPacks, diff.itemPacks);
    renderBoardFromDiff();
  });

  function renderBoardFromDiff() {
    if (window.Party3D) Party3D.setBoardState({ tiles: board.tiles, players: board.players, owners: board.owners, turnPlayerId: board.turnPlayerId || null });
    else if (window.Board2D) Board2D.setBoardState({ tiles: board.tiles, players: board.players, owners: board.owners, turnPlayerId: board.turnPlayerId || null });
    updateMyBoardStats();
    renderBoardRanking();
    renderProfileCard();
    renderBoardTimeline();
    renderBoardPills();
    const lap = $('#board-lap');
    if (lap) lap.textContent = `Runde ${board.lapsDone} / ${board.lapsTotal}`;
    setBoardStatus(board.log || 'Warte auf deinen Zug…');
    const myActionable =
      (board.phase === 'turn' && board.turnPlayerId === me.id) ||
      (board.phase === 'decision' && board.pendingPlayerId === me.id);
    if (!myActionable) {
      showBoardPrompt('Warte auf deinen Zug…');
      hideTurnNotice();
    }
    renderBoardGrid();
    const keepGameScreen =
      boardModeActive &&
      (board.phase === 'global' || board.phase === 'duel' || board.phase === 'globalIntro' || board.phase === 'duelIntro') &&
      (isActive('play') || isActive('round-intro') || isActive('waiting'));
    if (!keepGameScreen) showScreen('board');
  }

  Net.on('board:yourTurn', m => {
    showScreen('board');
    if (m.action === 'roll') {
      showBoardPrompt(m.message || 'Du bist dran! Würfeln?', [
        { label: '🎲 Würfeln', action: () => Net.send({ type: 'board:roll' }) },
      ]);
      showTurnNotice('Du bist dran, bitte wuerfeln.', [
        { label: '🎲 Jetzt wuerfeln', kind: 'primary', action: () => Net.send({ type: 'board:roll' }) },
      ]);
      FX.Sound.go();
    }
  });

  Net.on('board:decision', m => {
    showScreen('board');
    if (m.kind === 'buy') {
      showBoardPrompt(m.message || 'Feld kaufen?', [
        { label: '🪙 Kaufen (3)', action: () => Net.send({ type: 'board:decision', action: 'buy' }) },
        { label: 'Weiterziehen', action: () => Net.send({ type: 'board:decision', action: 'skip' }) },
      ]);
      showTurnNotice('Du bist dran: Feld kaufen (3 Münzen) oder weiterziehen?', [
        { label: '🪙 Kaufen (3)', kind: 'primary', action: () => Net.send({ type: 'board:decision', action: 'buy' }) },
        { label: 'Weiterziehen', kind: 'ghost', action: () => Net.send({ type: 'board:decision', action: 'skip' }) },
      ]);
    } else if (m.kind === 'itemBuy') {
      // Item-Shop: jedes angebotene Item als Button
      const offers = (m && m.offers) || [];
      const actions = offers.map(it => ({
        label: `${it.icon} ${it.label} (${it.price}🪙)`,
        action: () => Net.send({ type: 'board:decision', action: it.id }),
      }));
      actions.push({ label: 'Nicht kaufen', action: () => Net.send({ type: 'board:decision', action: 'skip' }) });
      const noticeActions = offers.map(it => ({
        label: `${it.icon} ${it.label} (${it.price}🪙)`,
        kind: 'primary',
        action: () => Net.send({ type: 'board:decision', action: it.id }),
      }));
      noticeActions.push({ label: 'Nicht kaufen', kind: 'ghost', action: () => Net.send({ type: 'board:decision', action: 'skip' }) });
      showBoardPrompt(m.message || 'Item-Shop: Wähle ein Item.', actions);
      showTurnNotice('Item-Shop: Wähle ein Item oder gehe.', noticeActions);
    } else if (m.kind === 'rentOrDuel') {
      const actions = [
        { label: '🪙 Zahlen (2)', action: () => Net.send({ type: 'board:decision', action: 'rent' }) },
        { label: '⚔️ Duell', action: () => Net.send({ type: 'board:decision', action: 'duel' }) },
      ];
      const noticeActions = [
        { label: '🪙 Zahlen (2)', kind: 'primary', action: () => Net.send({ type: 'board:decision', action: 'rent' }) },
        { label: '⚔️ Duell', kind: 'ghost', action: () => Net.send({ type: 'board:decision', action: 'duel' }) },
      ];
      const myItems = board.itemPacks[me.id] || [];
      if (myItems.some(item => item.id === 'golden_warp')) {
        actions.push({ label: '✨ Goldener Warp (+4 Felder)', action: () => Net.send({ type: 'board:decision', action: 'item' }) });
        noticeActions.push({ label: '✨ Goldener Warp (+4)', kind: 'ghost', action: () => Net.send({ type: 'board:decision', action: 'item' }) });
      }
      showBoardPrompt(m.message || 'Zahlen, duellieren oder Item benutzen?', actions);
      showTurnNotice('Du bist dran: Zahlen, duellieren oder Item benutzen?', noticeActions);
    }
  });

  Net.on('board:chaos', m => {
    setBoardStatus(m.text || 'Chaos ausgelöst!');
    FX.Sound.whoosh();
  });

  Net.on('board:rolled', m => {
    if (!m) return;
    showDiceRoll(m.roll, m.playerId);
    /* Cinematic Camera: Wuerfel-Phase beenden wenn Zug beginnt */
    if (window.Party3D && Party3D.finishDiceRollCinematic) {
      Party3D.finishDiceRollCinematic();
    }
    /* Etappe 2: Path-basiert — Server sendet path-Array. */
    if (window.Party3D && Party3D.animatePawnMove) {
      if (Array.isArray(m.path) && m.path.length) {
        Party3D.animatePawnMove(m.playerId, m.path);
      } else if (Number.isFinite(m.from) && Number.isFinite(m.to)) {
        const total = (board.tiles && board.tiles.length) || 40;
        Party3D.animatePawnMove(m.playerId, m.from, m.to, total);
      }
    }
    if (!Array.isArray(m.path) && Number.isFinite(m.from) && Number.isFinite(m.to)) {
      animateBoardMove(m.playerId, m.from, m.to);
    }
  });

  /* Etappe 2: Junction-Wegwahl-Dialog vom Server. */
  Net.on('board:branchChoice', m => {
    if (!m || !m.options) return;
    showBranchChoiceUI(m);
  });

  Net.on('board:announce', m => {
    setBoardStatus(m.text || 'Neue Phase startet…');
    showBoardPrompt(m.text || 'Neue Phase startet…');
  });

  Net.on('board:story', m => {
    if (!m || !m.text) return;
    const text = (typeof m.text === 'object' ? String(m.text.text || '') : String(m.text)).toLowerCase();
    /* Sound + FX passend zur Meldung */
    if (/stern|star|⭐/.test(text)) { FX.Sound.star(); FX.coinRain(60); if (window.Party3D && Party3D.spawnBurst) Party3D.spawnBurst(0, 1.5, 0, 'star'); }
    else if (/münze|coin|🪙|\+/.test(text)) { FX.Sound.coin(); FX.coinRain(40); if (window.Party3D && Party3D.spawnBurst) Party3D.spawnBurst(0, 1.5, 0, 'coin'); }
    else if (/event|blitz|sturm|shuffle|swap|reverse/.test(text)) { FX.Sound.event(); FX.shake(document.querySelector('#app') || document.body); }
    else if (/duell|⚔️|challenge/.test(text)) { FX.Sound.go(); if (window.Party3D && Party3D.spawnBurst) Party3D.spawnBurst(0, 1.5, 0, 'duel'); }
    else FX.Sound.tap();
    pushBoardStory(m.text);
  });

  Net.on('board:eventReveal', m => {
    if (!m) return;
    FX.Sound.event();
    FX.shake(document.querySelector('#app') || document.body);
    queueEventReveal(m);
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
    setBoardStatus(`⚔️ Duell live: ${cs} : ${os}`);
  });

  Net.on('board:globalResult', m => {
    if (!m || !Array.isArray(m.ranking)) return;
    const top = m.ranking.slice(0, 3).map((r, i) => `${i + 1}. ${r.name} (${r.score})`).join('  |  ');
    showBoardPrompt(`📊 Runden-Scoreboard: ${top || 'keine Punkte'}`);
    setBoardStatus(`📊 Runden-Scoreboard: ${top || 'keine Punkte'}`);
    bumpPlayerBoardBadge('ranking');
    hideTurnNotice();
    showScreen('board');
    switchPlayerBoardPanel('ranking');
  });

  Net.on('board:duelResult', () => {
    const actions = $('#board-actions');
    if (actions) actions.innerHTML = '';
    showBoardPrompt('Duell beendet. Weiter geht es mit dem nächsten Zug.');
    hideTurnNotice();
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
      /* Meta-Progression: XP + Sterne + Achievements */
      if (MPL) {
        const result = MPL.applyGameResult(progression, {
          score: r.score || 0,
          placement: idx + 1,
          playerCount: m.ranking.length,
        });
        const newAch = MPL.checkAchievements(progression, achState);
        saveProgression(progression);
        saveAchState(achState);
        updateLobbyMeta();
        updateMenuStats();
        if (result.leveledUp) {
          const banner = $('#result-star');
          banner.textContent = (banner.textContent ? banner.textContent + ' ' : '') +
            `🎉 Level ${result.newLevel}! +${result.levelStars} ⭐`;
          FX.Sound.fanfare();
        }
        /* Achievement-Toast */
        for (const ach of newAch) {
          setTimeout(() => {
            FX.toast && FX.toast(document.body, `${ach.icon} ${ach.label}`, '#ffd34e');
          }, 600);
        }
      }
    }
    showScreen('result');
  });

  Net.on('standings', m => {
    const idx = m.ranking.findIndex(r => r.id === me.id);
    const r = idx >= 0 ? m.ranking[idx] : null;
    $('#p-standings-sub').textContent = `Nach Runde ${m.round} von ${m.total}`;
    $('#p-standings-place').textContent = `#${idx + 1}`;
    $('#p-standings-stars').textContent = r ? `${'⭐'.repeat(r.stars) || '0'} Sterne · 🪙 ${r.coins || 0} Münzen` : '';
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
      $('#p-final-banner').textContent = r ? `${'⭐'.repeat(r.stars) || '0'} Sterne · 🪙 ${r.coins || 0} Münzen` : '';
      FX.Sound.whoosh();
    }
    showScreen('final');
  });

  Net.on('hostLeft', () => {
    boardModeActive = false;
    showScreen('menu');
    showJoinError('Der Host hat das Spiel beendet.');
  });
  Net.on('hostDisconnected', m => {
    const sec = m && m.graceSeconds ? m.graceSeconds : 120;
    showJoinError(`Host kurz getrennt. Bitte warten (${sec}s Reconnect-Fenster).`);
  });
  Net.on('_close', () => {
    if (!isActive('menu')) showJoinError('Verbindung verloren — bitte neu beitreten.');
    showScreen('menu');
  });
  Net.on('_error', () => {
    showJoinError('❌ Keine Verbindung. Bist du im selben WLAN? Öffne die Adresse vom Host-Bildschirm.');
  });

  /* ============================================================
     MINI-SPIEL ABSPIELEN (lokal, mit Countdown)
     ============================================================ */
  function startPlay(gameMeta, runMeta = {}) {
    const game = Games.list.find(g => g.id === gameMeta.id);
    $('#hud-game').textContent = `${gameMeta.icon} ${gameMeta.name}`;
    hudScore.textContent = '0';
    lastScoreSent = 0;
    const stage = $('#game-stage');
    stage.innerHTML = '';
    showScreen('play');

    if (!game) { finishGame(0); return; }

    const ready = el('div', 'stage-center');
    ready.innerHTML = `<div class="stage-big-text">${gameMeta.icon} ${escapeHtml(gameMeta.name)}</div>
      <div class="stage-sub">Bereit? Klicke auf Bereit.</div>`;
    const helpBtn = el('button', 'btn btn-ghost ready-help-btn', '? Spiel erklären');
    helpBtn.type = 'button';
    const helpBox = el('div', 'ready-help-box', gameMeta.rules || 'Keine weiteren Regeln vorhanden.');
    helpBox.hidden = true;
    helpBtn.addEventListener('click', () => {
      helpBox.hidden = !helpBox.hidden;
      helpBtn.textContent = helpBox.hidden ? '? Spiel erklären' : '✖ Erklärung schließen';
      FX.Sound.tap();
    });
    const readyBtn = el('button', 'btn btn-primary btn-big', '✅ Bereit');
    readyBtn.type = 'button';
    ready.appendChild(helpBtn);
    ready.appendChild(helpBox);
    ready.appendChild(readyBtn);
    stage.appendChild(ready);
    readyBtn.addEventListener('click', () => {
      let n = 3;
      const cd = el('div', 'stage-center');
      cd.innerHTML = `<div class="countdown-num">${n}</div>`;
      stage.innerHTML = '';
      stage.appendChild(cd);
      FX.Sound.countdown();
      const cdTimer = setInterval(() => {
        n--;
        if (n > 0) { cd.innerHTML = `<div class="countdown-num">${n}</div>`; FX.Sound.countdown(); }
        else {
          clearInterval(cdTimer);
          cd.innerHTML = `<div class="countdown-num" style="color:var(--good)">GO!</div>`;
          FX.Sound.go();
          setTimeout(() => { stage.innerHTML = ''; launchGame(game, stage, runMeta); }, 600);
        }
      }, 800);
    });
  }

  function launchGame(game, stage, runMeta = {}) {
    const api = createGameApi(stage, score => finishGame(score));
    try { game.play(stage, api, runMeta); }
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

  /* ---------- Sound / Audio Settings ---------- */
  function applyAudioSettings() {
    if (!audioSettings || !ASL) return;
    FX.setSoundEnabled(ASL.isMusicOn(audioSettings) || ASL.isSfxOn(audioSettings));
    FX.setMusicOnInternal(ASL.isMusicOn(audioSettings));
    FX.setSfxVolumeInternal(ASL.getSfxVolume(audioSettings));
    FX.setMusicVolumeInternal(ASL.getMusicVolume(audioSettings));
    if (ASL.isMusicOn(audioSettings)) FX.startMusic();
    else FX.stopMusic();
  }

  function updateAudioSettingsUI() {
    if (!audioSettings || !ASL) return;
    const musicToggle = $('#audio-music-toggle');
    const sfxToggle = $('#audio-sfx-toggle');
    const musicVol = $('#audio-music-volume');
    const sfxVol = $('#audio-sfx-volume');
    if (musicToggle) musicToggle.checked = ASL.isMusicOn(audioSettings);
    if (sfxToggle) sfxToggle.checked = ASL.isSfxOn(audioSettings);
    if (musicVol) {
      musicVol.value = Math.round(ASL.getMusicVolume(audioSettings) * 100);
      musicVol.disabled = !ASL.isMusicOn(audioSettings);
    }
    if (sfxVol) {
      sfxVol.value = Math.round(ASL.getSfxVolume(audioSettings) * 100);
      sfxVol.disabled = !ASL.isSfxOn(audioSettings);
    }
  }

  function openAudioSettings() {
    const overlay = $('#audio-settings-overlay');
    if (!overlay) return;
    overlay.style.display = '';
    overlay.classList.add('active');
    updateAudioSettingsUI();
  }

  function closeAudioSettings() {
    const overlay = $('#audio-settings-overlay');
    if (!overlay) return;
    overlay.classList.remove('active');
    overlay.style.display = 'none';
  }

  if (ASL) {
    $('#sound-toggle').addEventListener('click', openSettings);
    const closeBtn = $('#audio-settings-close');
    if (closeBtn) closeBtn.addEventListener('click', closeAudioSettings);
    const aOverlay = $('#audio-settings-overlay');
    if (aOverlay) aOverlay.addEventListener('click', (e) => { if (e.target === aOverlay) closeAudioSettings(); });
    const mTog = $('#audio-music-toggle');
    if (mTog) mTog.addEventListener('change', () => {
      audioSettings = ASL.toggleMusic(audioSettings);
      ASL.saveAudioSettings(audioSettings, localStorage);
      applyAudioSettings(); updateAudioSettingsUI();
      /* sync new settings */
      settings.music = ASL.isMusicOn(audioSettings);
      settings.musicVolume = ASL.getMusicVolume(audioSettings);
      saveSettings();
      updateSettingsUI();
    });
    const sTog = $('#audio-sfx-toggle');
    if (sTog) sTog.addEventListener('change', () => {
      audioSettings = ASL.toggleSfx(audioSettings);
      ASL.saveAudioSettings(audioSettings, localStorage);
      applyAudioSettings(); updateAudioSettingsUI();
      settings.sfx = ASL.isSfxOn(audioSettings);
      settings.sfxVolume = ASL.getSfxVolume(audioSettings);
      saveSettings();
      updateSettingsUI();
      if (ASL.isSfxOn(audioSettings)) FX.Sound.click();
    });
    const mVol = $('#audio-music-volume');
    if (mVol) mVol.addEventListener('input', () => {
      const v = parseInt(mVol.value, 10) / 100;
      audioSettings = ASL.setMusicVolume(audioSettings, v);
      ASL.saveAudioSettings(audioSettings, localStorage);
      FX.setMusicVolumeInternal(v);
      settings.musicVolume = v;
      saveSettings();
    });
    const sVol = $('#audio-sfx-volume');
    if (sVol) sVol.addEventListener('input', () => {
      const v = parseInt(sVol.value, 10) / 100;
      audioSettings = ASL.setSfxVolume(audioSettings, v);
      ASL.saveAudioSettings(audioSettings, localStorage);
      FX.setSfxVolumeInternal(v);
      settings.sfxVolume = v;
      saveSettings();
      if (ASL.isSfxOn(audioSettings)) FX.Sound.tap();
    });
    /* legacy audio overlay still kept in sync */
    applyAudioSettings();
    updateAudioSettingsUI();
  } else {
    $('#sound-toggle').addEventListener('click', openSettings);
  }
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
  document.addEventListener('pointerdown', () => FX.setSoundEnabled(true), { once: true });
  document.querySelectorAll('#player-board-nav .board-nav-btn').forEach(b => {
    b.addEventListener('click', () => switchPlayerBoardPanel(b.dataset.panel || 'map'));
  });

  /* ---------- Helfer (aus shared.js) ---------- */
  function isActive(name) { return screens[name] && screens[name].classList.contains('active'); }
  function setBoardStatus(text) {
    const value = text || '...';
    const chip = $('#board-status');
    if (chip) chip.textContent = value;
    const banner = $('#board-banner');
    if (banner) banner.textContent = value;
    pushPlayerToast(value);
  }

  /* NEU Layout C: Toast-System ersetzt board-banner/status */
  function pushPlayerToast(text, kind = '') {
    const host = $('#player-board-toasts');
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

  /* NEU Layout C: Spieler-Pillbar (oben-links) — via shared.js */
  function renderBoardPills() {
    PartyArenaShared.renderBoardPills({
      containerId: 'player-board-pills',
      players: board.players,
      phase: board.phase,
      turnPlayerId: board.turnPlayerId,
      pendingPlayerId: board.pendingPlayerId,
      myId: me.id,
    });
  }

  /* NEU Layout C: Slide-In-Panels + Menü-Button (einmalig binden) — via shared.js */
  let slidesBound = false;
  function setupBoardSlides() {
    if (slidesBound) return;
    slidesBound = true;
    PartyArenaShared.setupBoardSlides('player-board-menu');
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
    const SVL = window.ShopViewLogic;
    const ownedIds = SVL ? SVL.getOwnedCharacterIds(unlockState) : null;
    FIGURES.forEach((f, idx) => {
      const charId = 'char_' + ['rocket','cat','fox','frog','panda','unicorn','robot','octopus'][idx];
      const isOwned = ownedIds ? ownedIds.includes(charId) : true;
      const isSelected = me.figure === f;
      const cls = 'figure-pill' + (isSelected ? ' active' : '') + (!isOwned ? ' locked' : '');
      const b = el('button', cls, f);
      b.type = 'button';
      if (!isOwned) {
        b.disabled = true;
        b.title = 'Im Shop freischalten';
      } else {
        b.addEventListener('click', () => {
          me.figure = f;
          selectedCharId = charId;
          try { localStorage.setItem('pa_figure', f); } catch (_) {}
          try { localStorage.setItem('pa_char_id', charId); } catch (_) {}
          renderFigurePicker();
          FX.Sound.tap();
        });
      }
      picker.appendChild(b);
    });
  }

  /* ---------- Shop-UI ---------- */
  function updateJoinStarCount() {
    const el = $('#join-star-count');
    if (el) el.textContent = '⭐ ' + (progression.stars || 0);
    const menuEl = $('#menu-star-count');
    if (menuEl) menuEl.textContent = '⭐ ' + (progression.stars || 0);
  }

  function openShop() {
    const overlay = $('#shop-overlay');
    if (!overlay) return;
    shopOpen = true;
    overlay.hidden = false;
    renderShop();
    FX.Sound.tap();
  }

  function closeShop() {
    const overlay = $('#shop-overlay');
    if (!overlay) return;
    shopOpen = false;
    overlay.hidden = true;
    renderFigurePicker();
    updateJoinStarCount();
  }

  function renderShop() {
    const SVL = window.ShopViewLogic;
    if (!SVL || !MPL) return;
    const starsEl = $('#shop-stars');
    if (starsEl) starsEl.textContent = '⭐ ' + (progression.stars || 0);
    const grid = $('#shop-grid');
    if (!grid) return;
    grid.innerHTML = '';

    if (shopTab === 'premium') {
      renderPremiumTab(grid);
      return;
    }

    const allItems = SVL.buildShopItems(progression, unlockState);
    const items = allItems.filter(i => shopTab === 'characters' ? i.type === 'character' : i.type === 'trail');
    items.forEach(item => {
      const card = el('div', 'shop-card');
      if (item.owned) card.classList.add('owned');
      if (item.id === selectedCharId && item.type === 'character') card.classList.add('selected');
      if (!item.owned && !item.affordable) card.classList.add('locked');
      const icon = el('div', 'shop-card-icon', item.icon);
      card.appendChild(icon);
      const name = el('div', 'shop-card-name', item.name);
      card.appendChild(name);
      if (item.owned) {
        const badge = el('div', 'shop-card-badge owned', '✓');
        card.appendChild(badge);
        if (item.type === 'character') {
          const priceEl = el('div', 'shop-card-price', item.id === selectedCharId ? 'Ausgewaehlt' : 'Frei');
          card.appendChild(priceEl);
          card.addEventListener('click', () => {
            selectedCharId = item.id;
            me.figure = item.icon;
            try { localStorage.setItem('pa_figure', item.icon); } catch (_) {}
            try { localStorage.setItem('pa_char_id', item.id); } catch (_) {}
            renderShop();
            FX.Sound.tap();
          });
        } else {
          const priceEl = el('div', 'shop-card-price', 'Frei');
          card.appendChild(priceEl);
        }
      } else {
        const priceEl = el('div', 'shop-card-price', '⭐ ' + item.price);
        card.appendChild(priceEl);
        card.addEventListener('click', () => {
          const result = MPL.purchaseUnlock(progression, unlockState, item.id);
          const hint = $('#shop-hint');
          if (hint) {
            hint.textContent = SVL.purchaseFeedback(result);
            hint.className = 'shop-hint ' + (result.success ? 'success' : 'error');
          }
          if (result.success) {
            saveUnlockState(unlockState);
            saveProgression(progression);
            renderShop();
            FX.Sound.good();
          } else {
            FX.Sound.bad();
          }
          setTimeout(() => { if (hint) { hint.textContent = ''; hint.className = 'shop-hint'; } }, 2500);
        });
      }
      grid.appendChild(card);
    });
  }

  function renderPremiumTab(grid) {
    const IAP = window.IapLogic;
    if (!IAP) return;
    const products = IAP.getShopProducts(iapState);
    products.forEach(function(item) {
      const card = el('div', 'shop-card premium-card');
      if (item.purchased) card.classList.add('owned');
      const icon = el('div', 'shop-card-icon', item.icon);
      card.appendChild(icon);
      const name = el('div', 'shop-card-name', item.name);
      card.appendChild(name);
      const desc = el('div', 'shop-card-desc', item.desc);
      card.appendChild(desc);
      if (item.purchased) {
        const badge = el('div', 'shop-card-badge owned', '✓');
        card.appendChild(badge);
        const priceEl = el('div', 'shop-card-price', 'Gekauft');
        card.appendChild(priceEl);
      } else {
        const priceEl = el('div', 'shop-card-price', item.price);
        card.appendChild(priceEl);
        card.addEventListener('click', function() {
          const hint = $('#shop-hint');
          if (hint) { hint.textContent = 'Kaufe ' + item.name + '...'; hint.className = 'shop-hint'; }
          IAP.purchase(item.id).then(function(result) {
            if (result.success) {
              const mark = IAP.markPurchased(iapState, item.id);
              saveIapState(iapState);
              if (mark.starsAwarded > 0) {
                progression.stars = (progression.stars || 0) + mark.starsAwarded;
                saveProgression(progression);
              }
              // Premium: schalte alle Unlocks frei
              if (item.id === 'premium_unlock' || item.id === 'character_pack' || item.id === 'trail_pack' || item.id === 'starter_pack') {
                applyPremiumUnlocks(item.id);
              }
              renderShop();
              updateJoinStarCount();
              FX.Sound.good();
              if (hint) { hint.textContent = 'Gekauft! 🎉'; hint.className = 'shop-hint success'; }
            } else {
              FX.Sound.bad();
              if (hint) { hint.textContent = result.error || 'Kauf fehlgeschlagen'; hint.className = 'shop-hint error'; }
            }
            setTimeout(function() { if (hint) { hint.textContent = ''; hint.className = 'shop-hint'; } }, 3000);
          });
        });
      }
      grid.appendChild(card);
    });
  }

  function applyPremiumUnlocks(packId) {
    if (!MPL) return;
    var ids = [];
    if (packId === 'premium_unlock') {
      ids = window.IapLogic ? window.IapLogic.getPremiumUnlockIds() : [];
    } else if (packId === 'character_pack') {
      // 3 zufaellige nicht-owned Charaktere
      var allChars = MPL.UNLOCKS.filter(function(u) { return u.type === 'character' && u.price > 0 && !MPL.isOwned(unlockState, u.id); });
      for (var i = allChars.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var tmp = allChars[i]; allChars[i] = allChars[j]; allChars[j] = tmp; }
      ids = allChars.slice(0, 3).map(function(u) { return u.id; });
    } else if (packId === 'trail_pack') {
      ids = ['trail_sparkle', 'trail_rainbow', 'trail_fire'];
    } else if (packId === 'starter_pack') {
      // 2 zufaellige Charaktere + 1 zufaelligen Trail
      var chars = MPL.UNLOCKS.filter(function(u) { return u.type === 'character' && u.price > 0 && !MPL.isOwned(unlockState, u.id); });
      for (var k = chars.length - 1; k > 0; k--) { var t = chars[k]; chars[k] = chars[Math.floor(Math.random() * (k + 1))]; chars[Math.floor(Math.random() * (k + 1))] = t; }
      ids = chars.slice(0, 2).map(function(u) { return u.id; });
      var trails = MPL.UNLOCKS.filter(function(u) { return u.type === 'trail' && u.price > 0 && !MPL.isOwned(unlockState, u.id); });
      if (trails.length > 0) ids.push(trails[Math.floor(Math.random() * trails.length)].id);
    }
    ids.forEach(function(id) {
      if (!MPL.isOwned(unlockState, id)) {
        unlockState.owned[id] = true;
      }
    });
    saveUnlockState(unlockState);
  }

  function initShop() {
    const btnShop = $('#btn-shop');
    if (btnShop) btnShop.addEventListener('click', openShop);
    const btnClose = $('#shop-close');
    if (btnClose) btnClose.addEventListener('click', closeShop);
    const overlay = $('#shop-overlay');
    if (overlay) overlay.addEventListener('click', (e) => { if (e.target === overlay) closeShop(); });
    document.querySelectorAll('.shop-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.shop-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        shopTab = tab.dataset.tab;
        renderShop();
        FX.Sound.tap();
      });
    });
    try {
      const savedCharId = localStorage.getItem('pa_char_id');
      if (savedCharId) selectedCharId = savedCharId;
    } catch (_) {}
    updateJoinStarCount();
  }

  function tryAutoJoin() {
    if (autoJoinTried) return;
    autoJoinTried = true;
    let code = '';
    let name = '';
    let pid = '';
    let token = '';
    try {
      code = (($('#code-input') && $('#code-input').value) || localStorage.getItem('pa_last_code') || '').trim().toUpperCase();
      name = (($('#name-input') && $('#name-input').value) || localStorage.getItem('pa_name') || '').trim();
      pid = localStorage.getItem('pa_pid_' + code) || '';
      token = localStorage.getItem('pa_ptok_' + code) || '';
    } catch (_) {}
    if (code.length !== 5 || !name || (!pid && !token)) return;
    Net.send({ type: 'player:join', name, code, playerId: pid, reconnectToken: token, figure: me.figure });
  }

  function showBoardPrompt(text, actions = []) {
    const prompt = $('#board-prompt');
    const panel = $('#board-actions');
    if (prompt) prompt.textContent = text || 'Warte auf deinen Zug…';
    centerActions.text = text || '';
    centerActions.buttons = actions.map(a => ({ label: a.label, action: a.action }));
    if (!panel) return;
    panel.innerHTML = '';
    if (actions.length > 0 && board.panel !== 'action') bumpPlayerBoardBadge('action');
    actions.forEach(a => {
      const b = el('button', 'btn btn-primary', a.label);
      b.type = 'button';
      b.addEventListener('click', a.action);
      panel.appendChild(b);
    });
    renderBoardGrid();
  }

  function renderBoardGrid() {
    /* 2D grid removed — 3D board is the only Spielfeld now */
    if (window.Party3D && board && board.tiles && board.tiles.length) {
      Party3D.setBoardState({
        tiles: board.tiles,
        players: board.players || [],
        owners: board.owners || {},
      });
    } else if (window.Board2D && board && board.tiles && board.tiles.length) {
      Board2D.setBoardState({
        tiles: board.tiles,
        players: board.players || [],
        owners: board.owners || {},
      });
    }
    /* Center action overlay: altes zentrales Overlay deaktiviert —
       Aktionen werden jetzt ausschließlich in .hud-bottom-actions angezeigt,
       damit der 3D-Bereich nicht durch einen riesigen Button blockiert wird. */
    const panel = $('#player-board-grid-3d') || document.querySelector('.board-3d-hint');
    if (panel) panel.innerHTML = '';
    /* Optional: kleiner Hinweistext im 3D-Bereich, aber keine Buttons mehr */
    if (centerActions.text && panel) {
      const hint = el('div', 'board-3d-hint', escapeHtml(centerActions.text));
      panel.appendChild(hint);
    }
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
        }, 320);
        return;
      }
      boardAnim.pos = (boardAnim.pos + 1) % size;
      boardAnim.timer = setTimeout(step, 300);
    }

    boardAnim.timer = setTimeout(step, 180);
  }

  function updateMyBoardStats() {
    const mine = (board.players || []).find(p => p.id === me.id);
    const elStats = $('#board-me-stats');
    if (!elStats) return;
    if (!mine) {
      elStats.textContent = '⭐ 0 · 🪙 0 · 🧮 0 Punkte';
      return;
    }
    elStats.textContent = `⭐ ${mine.stars || 0} · 🪙 ${mine.coins || 0} · 🧮 ${mine.totalPoints || 0} Punkte`;
  }

  function renderBoardRanking() {
    PartyArenaShared.renderBoardRanking({
      containerId: 'player-board-ranking',
      players: board.players,
      withPosition: true,
      withTotalPoints: false,
      figureFallback: '🙂',
    });
  }

  function renderProfileCard() {
    PartyArenaShared.renderProfileCard({
      containerId: 'player-info-card',
      player: (board.players || []).find(p => p.id === me.id),
      emptyText: 'Noch keine Daten vorhanden',
    });
  }

  function renderBoardTimeline() {
    PartyArenaShared.renderBoardTimeline({
      containerId: 'player-board-timeline',
      history: board.history,
      limit: -12,
    });
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
      [7, 1], [7, 2], [7, 3], [7, 4], [7, 5], [7, 6], [7, 7],
      [6, 7], [5, 7], [4, 7], [3, 7], [2, 7], [1, 7],
      [1, 6], [1, 5], [1, 4], [1, 3], [1, 2], [1, 1],
      [2, 1], [3, 1], [4, 1], [5, 1], [6, 1],
    ];
    const p = map[Math.max(0, Math.min(map.length - 1, idx))];
    return { row: p[0], col: p[1] };
  }

  function showDiceRoll(roll, playerId) {
    if (!Number.isFinite(Number(roll))) return;
    const prior = document.querySelector('.dice-drop');
    if (prior) prior.remove();
    const actor = (board.players || []).find(p => p.id === playerId);
    /* 3D dice roll + sound + shake */
    if (window.Party3D && Party3D.rollDice) Party3D.rollDice(roll, 1400);
    if (window.FX && FX.Sound) { FX.Sound.whoosh(); setTimeout(() => FX.Sound.dice && FX.Sound.dice(), 1300); }
    if (window.FX && FX.shake) FX.shake(document.querySelector('#app') || document.body);
    const wrap = el('div', 'dice-drop');
    const face = el('div', 'dice-face', String(roll));
    const label = el('div', 'dice-label', `${escapeHtml(actor ? actor.name : 'Spieler')} würfelt ${roll}`);
    wrap.appendChild(face);
    wrap.appendChild(label);
    document.body.appendChild(wrap);
    setTimeout(() => { if (wrap.parentNode) wrap.remove(); }, 2500);
  }

  function pushBoardStory(text) {
    if (text && typeof text === 'object') {
      storyPopup.queue.push({
        text: String(text.text || ''),
        title: String(text.title || '📣 Update'),
      });
    } else {
      storyPopup.queue.push({ text: String(text), title: '📣 Update' });
    }
    if (!storyPopup.showing) showNextBoardStory();
  }

  function queueEventReveal(payload) {
    eventReveal.queue.push(payload || {});
    if (!eventReveal.showing) showNextEventReveal();
  }

  function showNextEventReveal() {
    if (!eventReveal.queue.length) {
      eventReveal.showing = false;
      return;
    }
    eventReveal.showing = true;
    const m = eventReveal.queue.shift() || {};
    const rarity = String(m.rarity || 'Gewoehnlich');
    const title = String(m.title || 'Ereignis');
    const desc = String(m.desc || 'Ueberraschungseffekt');
    const target = m.triggerName ? `Fuer ${m.triggerName}` : 'Fuer alle';

    const wrap = el('div', 'event-reveal-overlay');
    wrap.innerHTML = `<div class="event-card">
      <div class="event-card-inner">
        <div class="event-card-front">
          <div class="event-card-seal">🎴</div>
          <div class="event-card-front-text">Ereignisfeld</div>
          <div class="event-card-front-sub">Karte wird aufgedeckt…</div>
        </div>
        <div class="event-card-back rarity-${rarity.toLowerCase()}">
          <div class="event-card-rarity">${escapeHtml(rarity)}</div>
          <div class="event-card-title">${escapeHtml(title)}</div>
          <div class="event-card-desc">${escapeHtml(desc)}</div>
          <div class="event-card-target">${escapeHtml(target)}</div>
        </div>
      </div>
    </div>`;
    document.body.appendChild(wrap);
    FX.Sound.whoosh();

    requestAnimationFrame(() => wrap.classList.add('show'));
    setTimeout(() => wrap.classList.add('flipped'), 520);
    setTimeout(() => {
      wrap.classList.remove('show');
      setTimeout(() => {
        if (wrap.parentNode) wrap.remove();
        showNextEventReveal();
      }, 260);
    }, 3050);
  }

  function showNextBoardStory() {
    if (!storyPopup.queue.length) {
      storyPopup.showing = false;
      return;
    }
    storyPopup.showing = true;
    const msg = storyPopup.queue.shift();
    const popup = el('div', 'board-story-popup top-edge');
    popup.innerHTML = `<div class="board-story-card"><strong>${escapeHtml(msg.title || 'Update')}</strong> ${escapeHtml(msg.text || '')}</div>`;
    document.body.appendChild(popup);
    FX.Sound.whoosh();
    setTimeout(() => {
      popup.classList.add('hide');
      setTimeout(() => {
        if (popup.parentNode) popup.remove();
        showNextBoardStory();
      }, 220);
    }, 1800);
  }

  /* ---------- IAP Init ---------- */
  (function initIap() {
    var IAP = window.IapLogic;
    if (!IAP) return;
    IAP.initStore(function() {
      // Premium-Badge im Menu anzeigen
      if (IAP.isPremium(iapState)) {
        var badge = document.createElement('span');
        badge.className = 'premium-badge';
        badge.textContent = '👑';
        badge.title = 'Premium';
        var menu = document.querySelector('.menu-buttons');
        if (menu) menu.appendChild(badge);
      }
    });
  })();
})();
