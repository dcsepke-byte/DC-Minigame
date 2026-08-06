const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/opt/hermes/.playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell',
    args: ['--no-sandbox', '--disable-gpu', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage', '--max_old_space_size=512']
  });
  const page = await browser.newPage({ viewport: { width: 591, height: 1280 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0,100)));
  page.on('console', m => { if (m.type()==='error') errs.push(m.text().slice(0,100)); });
  await page.goto('http://localhost:3000/host.html', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(2500);
  // Board injizieren + Zug simulieren, dann Pawn-Position messen
  const result = await page.evaluate(async () => {
    const tiles = [];
    for (let i = 0; i < 160; i++) {
      let type = 'normal';
      if (i === 0) type = 'start';
      else if (i % 27 === 5) type = 'lucky';
      else if (i % 31 === 7) type = 'starshop';
      else if (i % 17 === 9) type = 'event';
      tiles.push({ idx: i, type, next: [(i + 1) % 160] });
    }
    const players = [
      { id: 'p1', name: 'Host', position: 0, color: '#ff6a00', characterId: 'brix', figure: '🧱' },
    ];
    Party3D.setBoardState({ tiles, players, owners: {}, turnPlayerId: 'p1' });
    await new Promise(r => setTimeout(r, 1500));
    // Pruefe activePawnId + Kamera
    const before = Party3D.getCameraState ? Party3D.getCameraState() : null;
    // Zug simulieren: bewege p1 von 0 auf 4
    Party3D.animatePawnMove('p1', [0,1,2,3,4]);
    // Position waehrend Animation messen
    const positions = [];
    for (let i = 0; i < 6; i++) {
      await new Promise(r => setTimeout(r, 400));
      // Kameraposition + ob anim aktiv
      positions.push(window.__partyDebug ? 'x' : 't' + i);
    }
    return { before, activePawn: state && state.activePawnId, mode: state && state.mode, positions };
  }).catch(e => ({ err: String(e).slice(0,200) }));
  console.log('RESULT:', JSON.stringify(result));
  console.log('ERR:', JSON.stringify(errs));
  await browser.close();
})().catch(e=>console.log('FATAL:'+String(e).slice(0,200)));
