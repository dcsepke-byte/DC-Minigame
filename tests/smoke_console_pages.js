/* Party Arena — Konsolen-Smoke-Test fuer index.html + host.html (clean-4)
   Oeffnet beide Seiten, sammelt console errors + pageerrors. */
const { chromium } = require('playwright');
const EXEC = '/opt/data/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome';

(async () => {
  const browser = await chromium.launch({ executablePath: EXEC, headless: true });
  let fail = 0;
  for (const pageName of ['index.html', 'host.html', 'player.html']) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = [];
    page.on('console', m => { if (m.type() === 'error') errors.push('[console.error] ' + m.text()); });
    page.on('pageerror', e => errors.push('[pageerror] ' + e.message));
    try {
      await page.goto('http://localhost:3000/' + pageName, { waitUntil: 'networkidle', timeout: 20000 });
    } catch (e) {
      errors.push('[goto] ' + e.message.split('\n')[0]);
    }
    await page.waitForTimeout(1200);
    const fx = await page.evaluate(() => typeof window.FX !== 'undefined').catch(() => false);
    console.log(pageName + ': window.FX=' + fx + ', Fehler=' + errors.length);
    errors.slice(0, 10).forEach(e => console.log('  ' + e));
    if (errors.length > 0 || !fx) fail = 1;
    await page.close().catch(() => {});
  }
  console.log('KONSOLEN-SMOKE:', fail ? 'FAIL' : 'PASS');
  await browser.close();
  process.exit(fail);
})().catch(e => { console.error('SMOKE CRASH:', e.message); process.exit(2); });
