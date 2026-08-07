const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: '/opt/hermes/.playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell', args: ['--no-sandbox','--disable-gpu','--use-gl=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage','--max_old_space_size=512'] });
  const page = await browser.newPage({ viewport: { width: 591, height: 1280 } });
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    document.querySelectorAll('.screen').forEach(s => s.style.display = 'none');
    document.body.style.background = '#000';
  });
  const tiles = [];
  for (let i = 0; i < 240; i++) {
    const type = i === 0 ? 'start' : (i % 13 === 0 ? 'event' : (i % 17 === 0 ? 'starshop' : 'property'));
    tiles.push({ idx: i, type, name: 'Feld ' + i, icon: type === 'start' ? '🏁' : '🎲', next: [] });
  }
  const players = [{ id: 'p1', name: 'Brix', color: '#ff6a00', position: 0 }];
  await page.waitForTimeout(1000);
  await page.evaluate(([tiles, players]) => {
    window.Board2D.setBoardState({ tiles, players, owners: {}, turnPlayerId: 'p1' });
    window.Board2D.show();
  }, [tiles, players]);
  await page.waitForTimeout(500);
  const result = await page.evaluate(() => {
    try {
      window.Board2D.animatePawnMove('p1', 0, 5);
      return { ok: true };
    } catch (e) { return { ok: false, err: e.message, stack: e.stack }; }
  });
  console.log('animatePawnMove:', JSON.stringify(result));
  console.log('ERR:', JSON.stringify(errs));
  await browser.close();
})();
