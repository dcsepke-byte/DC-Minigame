/* Party Arena — Automatisierte Store-Screenshots (Playwright)
 *
 * Startet eine Board-Party-Session (Host = Browser, Spieler = Python-Bot)
 * und erzeugt die 6 Store-Screenshots:
 *   01-main-menu   (index.html, Portrait)
 *   02-board-party (Host-Board waehrend Runde 1)
 *   03-ninja-slash (Minispiel-Action)
 *   04-tower-stack (Minispiel-Action)
 *   05-results     (Siegerehrung/Final)
 *   06-shop        (player.html Shop-Overlay, Portrait)
 *
 * Ausgabe: store-assets/screenshots/ios-6.7/*.png + android/*.png
 */
'use strict';
const { chromium } = require('playwright');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

const BASE = 'http://localhost:3000';
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'store-assets', 'screenshots');
const CHROME = '/opt/data/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome';

const IOS_PORTRAIT = { width: 1290, height: 2796 };
const IOS_LANDSCAPE = { width: 2796, height: 1290 };
const AND_PORTRAIT = { width: 1080, height: 1920 };
const AND_LANDSCAPE = { width: 1920, height: 1080 };

const LAUNCH_ARGS = [
  '--use-gl=angle',
  '--use-angle=swiftshader',
  '--enable-unsafe-swiftshader',
  '--ignore-gpu-blocklist',
  '--no-sandbox',
  '--disable-dev-shm-usage',
];

const log = (msg) => console.log(`[shot] ${new Date().toISOString().slice(11, 19)} ${msg}`);
const clickForce = (page, sel) => page.click(sel, { force: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let botProc = null;

function startBot(code, name, figure) {
  botProc = spawn('python3', [path.join(ROOT, 'tests', 'screenshot_bot.py'), code, name, figure], {
    cwd: ROOT,
    env: { ...process.env, PYTHONPATH: '/opt/data/lazy-packages' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let out = '';
  botProc.stdout.on('data', (d) => (out += d));
  botProc.stderr.on('data', (d) => (out += d));
  botProc.on('exit', () => log(`bot exit: ${out.trim() || '(no output)'}`));
}

async function shot(page, name, sub) {
  const dir = sub ? path.join(OUT, sub) : OUT;
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, name);
  // CDP-Screenshot statt page.screenshot: Three.js/Canvas-Renderloops
  // (requestAnimationFrame) lassen die Seite nie "stable" werden,
  // Playwrights Screenshot-Wait wuerde nach 30s timeouten.
  const cdp = await page.context().newCDPSession(page);
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(file, Buffer.from(data, 'base64'));
  await cdp.detach();
  const kb = (fs.statSync(file).size / 1024).toFixed(0);
  log(`saved ${name} (${kb} KB)`);
  return file;
}

/* ---------- Statische Screenshots (Menue + Shop) ---------- */
async function captureStatic(browser) {
  // 01 Main Menu
  for (const [vp, sub] of [[IOS_PORTRAIT, 'ios-6.7'], [AND_PORTRAIT, 'android']]) {
    const ctx = await browser.newContext({ viewport: vp });
    const page = await ctx.newPage();
    await page.goto(BASE + '/', { waitUntil: 'networkidle' });
    await page.waitForSelector('.screen.active', { timeout: 20000 });
    await sleep(1500);
    await shot(page, `01-main-menu.png`, sub);
    await ctx.close();
  }
  log('main-menu done');

  // 06 Shop (player.html)
  for (const [vp, sub] of [[IOS_PORTRAIT, 'ios-6.7'], [AND_PORTRAIT, 'android']]) {
    const ctx = await browser.newContext({ viewport: vp });
    const page = await ctx.newPage();
    await page.goto(BASE + '/player.html', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      try {
        localStorage.setItem('pa_progression', JSON.stringify({ xp: 640, totalXp: 900, level: 7, stars: 250, gamesPlayed: 42 }));
      } catch (_) {}
    });
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('#btn-menu-shop', { timeout: 20000 });
    await sleep(800);
    await clickForce(page, '#btn-menu-shop');
    await page.waitForSelector('#shop-overlay:not([hidden])', { timeout: 10000 });
    await sleep(1200);
    await shot(page, '06-shop.png', sub);
    await ctx.close();
  }
  log('shop done');
}

/* ---------- Live-Session (Board + Minispiele + Final) ---------- */
const SUBDIR = { ios: 'ios-6.7', android: 'android' };

async function captureBoardSession(browser, viewport, tag, gameId = null) {
  const ctx = await browser.newContext({ viewport });
  const host = await ctx.newPage();
  const errors = [];
  host.on('pageerror', (e) => errors.push(String(e)));

  await host.goto(BASE + '/host.html', { waitUntil: 'domcontentloaded' });
  // Raum wird automatisch erstellt -> Code abwarten
  await host.waitForFunction(() => {
    const el = document.querySelector('#room-code');
    return el && /^[A-Za-z0-9]{5}$/.test(el.textContent.trim());
  }, { timeout: 30000 });
  const code = (await host.textContent('#room-code')).trim();
  log(`${tag}: Raum ${code}`);

  // Setup: Name, Board-Modus, 2 Runden, Tempo fast
  await host.fill('#host-name-input', 'Danny');
  await clickForce(host, '#mode-pills .pill[data-mode="board"]');
  for (let i = 0; i < 3; i++) {
    await host.click('.step-btn[data-dir="-1"]');
    await sleep(150);
  }
  await clickForce(host, '#tempo-pills .pill[data-tempo="fast"]');
  // Alle Spiele aus, dann nur Ziel-Spiel(e) an
  const toggles = await host.$$('.games-mix-toggle');
  for (const t of toggles) {
    await t.click();
    await sleep(200);
  }
  if (gameId) {
    await host.click(`.game-tile[data-id="${gameId}"]`);
    log(`${tag}: nur Spiel "${gameId}" aktiviert`);
  } else {
    await host.click('.game-tile[data-id="ninjaslash"]');
    await host.click('.game-tile[data-id="towerstack"]');
  }
  await sleep(400);

  // Bot als zweiten Spieler joinen
  startBot(code, tag === 'ios' ? 'Mia' : 'Leo', tag === 'ios' ? '🦊' : '🐱');

  // Warten bis Start moeglich (2 Spieler)
  await host.waitForFunction(() => {
    const b = document.querySelector('#btn-start-game');
    const pc = document.querySelector('#player-count');
    return b && !b.disabled && pc && pc.textContent.includes('(2)');
  }, { timeout: 40000 });
  log(`${tag}: Start moeglich, klicke Start`);
  await sleep(600);
  await clickForce(host, '#btn-start-game');
  log(`${tag}: Spiel gestartet`);

  // ---------- Driver-Loop ----------
  const deadline = Date.now() + 10 * 60 * 1000;
  let boardShotTaken = false, boardShotPendingAt = 0;
  let ninjaTaken = false, towerTaken = false, finalTaken = false;
  let currentIntroGame = '';
  let gameJustStarted = 0;
  let towerClicks = 0;
  let lastActionAt = Date.now();
  let stallLogged = false;
  let lastStallLogAt = 0;
  let lastScreen = '';

  while (Date.now() < deadline) {
    const st = await host.evaluate(() => {
      const active = document.querySelector('.screen.active');
      const screen = active ? active.dataset.screen : '';
      const q = (sel) => document.querySelector(sel);
      const visible = (el) => !!el && (el.offsetParent !== null || el.getClientRects().length > 0);
      const introName = q('#intro-game-name') ? q('#intro-game-name').textContent.trim() : '';
      const stageText = q('#host-game-stage .stage-big-text') ? q('#host-game-stage .stage-big-text').textContent.trim() : '';
      const stageHtml = q('#host-game-stage') ? q('#host-game-stage').innerHTML.slice(0, 260) : '';
      const turnBtn = (() => {
        const tn = q('.turn-notice:not([hidden])');
        if (tn) { const b = tn.querySelector('button'); if (b && visible(b)) return b.textContent.trim(); }
        return '';
      })();
      let ready = false;
      const stageBtns = q('#host-game-stage') ? q('#host-game-stage').querySelectorAll('button') : [];
      for (const b of stageBtns) { if (/Bereit/.test(b.textContent)) { ready = visible(b); break; } }
      const playCard = q('#host-play-card');
      const branchOv = q('#branch-choice-overlay');
      const prompt = q('#board-prompt') ? q('#board-prompt').textContent.trim() : '';
      const actions = q('#board-actions') ? Array.from(q('#board-actions').querySelectorAll('button')).map(b => b.textContent.trim()) : [];
      const hudGame = q('#host-hud-game') ? q('#host-hud-game').textContent.trim() : '';
      return {
        screen,
        introName,
        stageText,
        stageHtml,
        hudGame,
        canBegin: visible(q('#btn-round-begin')),
        canNext: visible(q('#btn-round-next')),
        canStand: visible(q('#btn-standings-next')),
        hasTurnBtn: turnBtn !== '',
        turnBtnText: turnBtn,
        ready,
        playCardHidden: !!(playCard && playCard.hidden),
        branch: !!(branchOv && (branchOv.offsetParent !== null || branchOv.getClientRects().length > 0)),
        branchCount: branchOv ? branchOv.querySelectorAll('button').length : 0,
        playing: !!(playCard && !playCard.hidden),
        gameName: (q('#live-name') || {}).textContent ? q('#live-name').textContent.trim() : '',
        prompt,
        actions,
      };
    });

    // Board-Modus: Minispiel-Name aus #host-hud-game (startHostPlay setzt ihn immer),
    // Fallback: .stage-big-text (roundIntro rendert #intro-game-name im Board-Modus nicht)
    if (!currentIntroGame) {
      const nameSrc = st.hudGame && !st.hudGame.startsWith('⚡') ? st.hudGame : (st.stageText || st.introName);
      if (nameSrc && !/Reaktion|Alle spielen/.test(nameSrc)) currentIntroGame = nameSrc;
    }

    // Screen-Wechsel loggen (Diagnose)
    if (st.screen !== lastScreen) {
      log(`${tag}: screen -> ${st.screen} (${st.stageText || st.gameName || st.prompt || '-'})`);
      lastScreen = st.screen;
    }

    // Bereit-Button robust erkennen (Locator zaehlt unabhaengig von visible()-Heuristik)
    let readyCount = 0;
    try { readyCount = await host.locator('#host-game-stage button:has-text("Bereit")').count(); } catch (_) {}
    const readyNow = readyCount > 0 || st.ready;

    // Stall-Diagnose: 45s ohne Aktion -> DOM-Snapshot loggen (max 1x pro 30s)
    if (Date.now() - lastActionAt > 45000 && !st.canBegin && !readyNow && !st.hasTurnBtn && !st.canNext && !st.canStand && !st.branch && Date.now() - lastStallLogAt > 30000) {
      stallLogged = true;
      lastStallLogAt = Date.now();
      log(`${tag}: STALL screen=${st.screen} intro="${st.introName}" stage="${st.stageText}" hud="${st.hudGame}" stageHtml="${st.stageHtml.replace(/\s+/g, ' ')}" turn="${st.turnBtnText}" playing=${st.playing} cardHidden=${st.playCardHidden} prompt="${st.prompt}" actions=[${st.actions.join(' | ')}]`);
    }

    // Intro -> Runde starten
    if (st.canBegin) {
      if (st.introName) currentIntroGame = st.introName;
      log(`${tag}: roundIntro (${currentIntroGame}) -> begin`);
      await clickForce(host, '#btn-round-begin');
      lastActionAt = Date.now();
      await sleep(500);
    }
    // Minispiel: Bereit klicken + Countdown abwarten
    else if (readyNow) {
      await clickForce(host, '#host-game-stage button:has-text("Bereit")');
      log(`${tag}: Bereit -> Minispiel startet (${currentIntroGame})`);
      gameJustStarted = Date.now();
      lastActionAt = Date.now();
      await sleep(500);
    }
    // Host-Zug: Aktion klicken (Wuerfeln/Kaufen/Duell/...)
    else if (st.hasTurnBtn) {
      const txt = st.turnBtnText;
      await clickForce(host, '.turn-notice:not([hidden]) button');
      log(`${tag}: Host-Aktion (${txt})`);
      if (/w[üu]rfel|würfel|wuerfel/i.test(txt)) boardShotPendingAt = Date.now() + 4000;
      lastActionAt = Date.now();
      await sleep(400);
    }
    // Weiter-Buttons (klassische Screens, falls sie auftauchen)
    else if (st.canNext) {
      await clickForce(host, '#btn-round-next');
      lastActionAt = Date.now();
      await sleep(300);
    } else if (st.canStand) {
      await clickForce(host, '#btn-standings-next');
      lastActionAt = Date.now();
      await sleep(300);
    }
    // Verzweigung (Wegwahl) fuer den Host — Locator-Fallback (Overlay ist position:fixed)
    else if (st.branch || st.branchCount > 0) {
      try {
        const bc = await host.locator('#branch-choice-overlay button').count();
        if (bc > 0) {
          await clickForce(host, '#branch-choice-overlay button');
          log(`${tag}: Wegwahl getroffen (${bc} Optionen)`);
        }
      } catch (_) {}
      lastActionAt = Date.now();
      await sleep(300);
    }

    const now = Date.now();

    // Board-Screenshot (nach Host-Wurf + Bewegung)
    if (!boardShotTaken && boardShotPendingAt && now >= boardShotPendingAt && st.screen === 'board') {
      await shot(host, '02-board-party.png', SUBDIR[tag]);
      boardShotTaken = true;
      log(`${tag}: Board-Screenshot`);
    }

    // Minispiel-Screenshots (2.8s nach GO)
    if (st.playing && gameJustStarted && now - gameJustStarted > 2800 && now - gameJustStarted < 6000) {
      const g = (currentIntroGame || '').toLowerCase();
      if (g.includes('ninja') && !ninjaTaken) {
        const box = await host.locator('#host-game-stage').boundingBox();
        if (box) {
          for (let i = 0; i < 3; i++) {
            await host.mouse.move(box.x + box.width * 0.15, box.y + box.height * (0.4 + i * 0.1));
            await host.mouse.down();
            await host.mouse.move(box.x + box.width * 0.85, box.y + box.height * (0.6 - i * 0.1), { steps: 8 });
            await host.mouse.up();
            await sleep(160);
          }
        }
        await shot(host, '03-ninja-slash.png', SUBDIR[tag]);
        ninjaTaken = true;
        log(`${tag}: Ninja-Slash-Screenshot`);
      } else if (g.includes('tower') && !towerTaken) {
        await shot(host, '04-tower-stack.png', SUBDIR[tag]);
        towerTaken = true;
        log(`${tag}: Tower-Stack-Screenshot`);
      }
    }

    // Tower-Stack: zufaellig klicken bis Game Over (Host muss fertig werden)
    if (st.playing && (currentIntroGame || '').toLowerCase().includes('tower') && gameJustStarted && now - gameJustStarted > 6000 && towerClicks < 50) {
      const box = await host.locator('#host-game-stage').boundingBox();
      if (box) {
        await host.mouse.click(box.x + box.width * (0.1 + Math.random() * 0.8), box.y + box.height * (0.2 + Math.random() * 0.6));
        towerClicks++;
      }
      await sleep(700);
    }
    // Ninja-Slash: waehrend der 30s immer wieder swipen
    if (st.playing && (currentIntroGame || '').toLowerCase().includes('ninja') && gameJustStarted && now - gameJustStarted > 8000 && now - gameJustStarted < 28000) {
      const box = await host.locator('#host-game-stage').boundingBox();
      if (box) {
        await host.mouse.move(box.x + box.width * Math.random(), box.y + box.height * Math.random());
        await host.mouse.down();
        await host.mouse.move(box.x + box.width * Math.random(), box.y + box.height * Math.random(), { steps: 6 });
        await host.mouse.up();
      }
      await sleep(1100);
    }

    // Final-Screenshot (Siegerehrung)
    if (!finalTaken && st.screen === 'final') {
      await sleep(2200);
      await shot(host, '05-results.png', SUBDIR[tag]);
      finalTaken = true;
      log(`${tag}: Final-Screenshot`);
    }

    // Abbruch wenn alles erledigt
    if (boardShotTaken && finalTaken && ninjaTaken && towerTaken) break;

    await sleep(250);
  }

  if (!boardShotTaken) log(`${tag}: WARNUNG board fehlt`);
  if (!ninjaTaken) log(`${tag}: WARNUNG ninja fehlt`);
  if (!towerTaken) log(`${tag}: WARNUNG tower fehlt`);
  if (!finalTaken) log(`${tag}: WARNUNG final fehlt`);
  if (errors.length) log(`${tag}: pageerrors: ${errors.slice(0, 5).join(' | ')}`);
  if (botProc) { try { botProc.kill(); } catch (_) {} }
  await ctx.close();
}

async function main() {
  const args = process.argv.slice(2);
  const noStatic = args.includes('--no-static');
  const singleIdx = args.indexOf('--single');
  const single = singleIdx >= 0 ? args[singleIdx + 1] : null; // 'ios' | 'android'
  const gameIdx = args.indexOf('--game');
  const gameId = gameIdx >= 0 ? args[gameIdx + 1] : null; // 'ninjaslash' | 'towerstack' | null
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: CHROME, args: LAUNCH_ARGS });
  log('Browser gestartet (chromium-1228, SwiftShader)');

  if (!noStatic) await captureStatic(browser);
  if (!single || single === 'ios') await captureBoardSession(browser, IOS_LANDSCAPE, 'ios', gameId);
  if (!single || single === 'android') await captureBoardSession(browser, AND_LANDSCAPE, 'android', gameId);

  await browser.close();
  log('FERTIG');
}

main().catch((e) => {
  console.error('FATAL:', e);
  if (botProc) { try { botProc.kill(); } catch (_) {} }
  process.exit(1);
});
