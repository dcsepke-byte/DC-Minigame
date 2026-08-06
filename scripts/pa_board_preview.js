const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: '/opt/hermes/.playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell', args: ['--no-sandbox','--disable-gpu','--use-gl=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage','--max_old_space_size=512'] });
  const page = await browser.newPage({ viewport: { width: 591, height: 1280 } });
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(1200);

  // Board-State injizieren
  const tiles = [];
  for (let i = 0; i < 240; i++) {
    const type = i === 0 ? 'start' : (i % 13 === 0 ? 'event' : (i % 17 === 0 ? 'starshop' : 'property'));
    tiles.push({ idx: i, type, name: 'Feld ' + i, icon: type === 'start' ? '🏁' : (type === 'event' ? '🎲' : '🎮'), next: [] });
  }
  const players = [
    { id: 'p1', name: 'Brix', color: '#ff6a00', position: 0 },
    { id: 'p2', name: 'Nixie', color: '#00f0ff', position: 10 },
  ];
  await page.evaluate(([tiles, players]) => {
    window.Board2D.setBoardState({ tiles, players, owners: {}, turnPlayerId: 'p1' });
  }, [tiles, players]);
  await page.waitForTimeout(800);

  const info = await page.evaluate(() => {
    const c = document.getElementById('board-2d-canvas');
    return {
      canvasExists: !!c,
      board2dActive: window.Board2D.active,
      hasPathData: !!window.BOARD_PATH && window.BOARD_PATH.main.length === 160,
    };
  });
  await page.screenshot({ path: '/opt/data/pa_board_city.png' });
  console.log('Info:', JSON.stringify(info));
  console.log('ERR:', JSON.stringify(errs));
  await browser.close();
})();
