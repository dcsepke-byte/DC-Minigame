#!/usr/bin/env node
/* Repro: Host-Browser im Board-Modus — wann erscheint der Ready-Screen?
   Misst roundIntro->start->Ready-Screen Timeline + doppelte Ready-Screens. */
const { chromium } = require('playwright');
const { spawn } = require('child_process');

const BASE = 'http://localhost:3000';
const CHROME = process.env.CHROME_PATH || '/opt/data/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome';
const OUT = '/tmp/repro_ready';
const fs = require('fs');
fs.mkdirSync(OUT, { recursive: true });

function log(...a) { console.log(`${new Date().toISOString().slice(11, 19)}`, ...a); }
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function clickForce(page, sel) {
  try { await page.click(sel, { timeout: 3000, force: true }); } catch (_) {}
}

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader'] });
  const ctx = await browser.newContext({ viewport: { width: 1290, height: 2796 } });
  const host = await ctx.newPage();
  const errors = [];
  host.on('pageerror', e => errors.push(String(e)));

  await host.goto(BASE + '/host.html', { waitUntil: 'domcontentloaded' });
  await host.waitForFunction(() => {
    const el = document.querySelector('#room-code');
    return el && /^[A-Za-z0-9]{5}$/.test(el.textContent.trim());
  }, { timeout: 30000 });
  const code = (await host.textContent('#room-code')).trim();
  log(`Raum ${code}`);

  await host.fill('#host-name-input', 'Danny');
  await clickForce(host, '#mode-pills .pill[data-mode="board"]');
  for (let i = 0; i < 3; i++) { await host.click('.step-btn[data-dir="-1"]', { force: true }); await sleep(100); }
  await clickForce(host, '#tempo-pills .pill[data-tempo="fast"]');
  // Alle Spiele aus, nur towerstack an
  const toggles = await host.$$('.games-mix-toggle');
  for (const t of toggles) { await t.click({ force: true }); await sleep(120); }
  await host.click('.game-tile[data-id="towerstack"]', { force: true });
  await sleep(400);
  log('Setup fertig');

  // Bot starten
  const bot = spawn('python3', ['repro_join_bot.py', code], { cwd: '/opt/data/DC-Minigame', env: { ...process.env, PYTHONPATH: '/opt/data/lazy-packages' } });
  bot.stdout.on('data', d => process.stdout.write(`[bot] ${d}`));
  bot.stderr.on('data', d => process.stderr.write(`[bot!] ${d}`));

  await host.waitForFunction(() => {
    const b = document.querySelector('#btn-start-game');
    const pc = document.querySelector('#player-count');
    return b && !b.disabled && pc && pc.textContent.includes('(2)');
  }, { timeout: 40000 });
  log('Start moeglich');
  await sleep(500);
  await clickForce(host, '#btn-start-game');
  await sleep(800);
  const afterStart = await host.evaluate(() => ({
    screen: (document.querySelector('.screen.active') || {}).dataset?.screen || '',
    inGame: document.body.classList.contains('in-game'),
    btnText: (document.querySelector('#btn-start-game') || {}).textContent || '',
  }));
  log(`Nach Start: ${JSON.stringify(afterStart)}`);
  log('Spiel gestartet');

  // Timeline beobachten
  const events = [];
  const deadline = Date.now() + 90 * 1000;
  let lastScreen = '';
  let readySeen = 0;
  while (Date.now() < deadline) {
    const st = await host.evaluate(() => {
      const active = document.querySelector('.screen.active');
      const screen = active ? active.dataset.screen : '';
      const q = s => document.querySelector(s);
      const readyBtns = q('#host-game-stage') ? q('#host-game-stage').querySelectorAll('button') : [];
      let readyCount = 0;
      for (const b of readyBtns) { if (/Bereit/.test(b.textContent) && (b.offsetParent !== null || b.getClientRects().length > 0)) readyCount++; }
      return {
        screen,
        intro: q('#intro-game-name') ? q('#intro-game-name').textContent.trim() : '',
        hudGame: q('#host-hud-game') ? q('#host-hud-game').textContent.trim() : '',
        stageText: q('#host-game-stage .stage-big-text') ? q('#host-game-stage .stage-big-text').textContent.trim() : '',
        readyCount,
        cardHidden: !!(q('#host-play-card') && q('#host-play-card').hidden),
        turnBtn: (() => { const tn = q('.turn-notice:not([hidden])'); if (tn) { const b = tn.querySelector('button'); if (b) return b.textContent.trim(); } return ''; })(),
        prompt: q('#board-prompt') ? q('#board-prompt').textContent.trim() : '',
      };
    });
    const sig = `${st.screen}|${st.intro}|${st.hudGame}|${st.stageText}|ready=${st.readyCount}|cardHidden=${st.cardHidden}|${st.turnBtn}|${st.prompt.slice(0, 30)}`;
    if (sig !== lastScreen) { log(`STATE ${sig}`); lastScreen = sig; }
    if (st.readyCount > 0 && readySeen < 3) { readySeen++; log(`>>> READY-SCREEN sichtbar (${st.stageText})`); }
    // Host-Aktionen
    if (st.turnBtn && /w[üu]rfel|würfel|wuerfel/i.test(st.turnBtn)) {
      await clickForce(host, '.turn-notice:not([hidden]) button');
      log('Host wuerfelt');
      await sleep(400);
    } else if (st.readyCount > 0) {
      await clickForce(host, '#host-game-stage button:has-text("Bereit")');
      log('Bereit geklickt');
      await sleep(500);
    } else if (st.turnBtn) {
      await clickForce(host, '.turn-notice:not([hidden]) button');
      log(`Host-Aktion: ${st.turnBtn}`);
      await sleep(400);
    }
    await sleep(250);
  }
  log(`--- Ende. pageerrors: ${errors.slice(0, 5).join(' | ') || 'keine'}`);
  try { bot.kill(); } catch (_) {}
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
