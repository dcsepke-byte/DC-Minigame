const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: '/opt/hermes/.playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell', args: ['--no-sandbox','--disable-gpu','--use-gl=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage','--max_old_space_size=512'] });
  const page = await browser.newPage({ viewport: { width: 591, height: 1280 } });
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(1500);
  // Alle Screens ausblenden, damit das Board-Canvas sichtbar ist
  await page.evaluate(() => {
    document.querySelectorAll('.screen').forEach(s => s.style.display = 'none');
    document.body.style.background = '#000';
  });
  const tiles = [];
  for (let i = 0; i < 240; i++) {
    const type = i === 0 ? 'start' : (i % 13 === 0 ? 'event' : (i % 17 === 0 ? 'starshop' : 'property'));
    tiles.push({ idx: i, type, name: 'Feld ' + i, icon: type === 'start' ? '🏁' : '🎲', next: [] });
  }
  const players = [
    { id: 'p1', name: 'Brix', color: '#ff6a00', position: 0 },
    { id: 'p2', name: 'Nixie', color: '#00f0ff', position: 10 },
  ];
  await page.waitForTimeout(1000); // Karte laden
  await page.evaluate(([tiles, players]) => {
    if (window.Board2D && window.Board2D.setBoardState) {
      window.Board2D.setBoardState({ tiles, players, owners: {}, turnPlayerId: 'p1' });
      window.Board2D.show();
    }
  }, [tiles, players]);
  await page.waitForTimeout(1000);
  await page.screenshot({ path: '/opt/data/pa_board_city_iso.png' });
  console.log('ERR:', JSON.stringify(errs));
  await browser.close();
})();
