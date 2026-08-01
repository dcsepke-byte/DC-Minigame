/* Party Arena — Browser-Smoke-Test (clean-2)
   Oeffnet player.html, prueft FX, Shop-Overlay, Settings-Overlay, Konsole. */
const { chromium } = require('playwright');

const EXEC = '/opt/data/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome';

async function testPage(browser) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push('[console.error] ' + m.text()); });
  page.on('pageerror', e => errors.push('[pageerror] ' + e.message));

  await page.goto('http://localhost:3000/player.html', { waitUntil: 'networkidle', timeout: 20000 });
  await page.waitForTimeout(800);

  const hasFX = await page.evaluate(() => typeof window.FX !== 'undefined' && typeof FX.Sound.tap === 'function');
  console.log('window.FX vorhanden + Sound.tap():', hasFX);

  const tapOk = await page.evaluate(() => { try { FX.Sound.tap(); return true; } catch (e) { return 'THROW: ' + e.message; } });
  console.log('FX.Sound.tap():', tapOk);

  // Shop-Button im Hauptmenue klicken
  await page.click('#btn-menu-shop').catch(e => console.log('WARN shop-click:', e.message.split('\n')[0]));
  await page.waitForTimeout(500);
  const shop = await page.evaluate(() => {
    const ov = document.querySelector('#shop-overlay');
    return { visible: !!ov && !ov.hidden, cards: document.querySelectorAll('#shop-grid .shop-card').length };
  });
  console.log('Shop-Overlay sichtbar:', shop.visible, '| Shop-Karten:', shop.cards);

  // Shop schliessen
  await page.evaluate(() => { const b = document.querySelector('#shop-close'); if (b) b.click(); });
  await page.waitForTimeout(300);

  // Settings-Button
  await page.evaluate(() => { const b = document.querySelector('#btn-menu-settings'); if (b) b.click(); });
  await page.waitForTimeout(500);
  const settings = await page.evaluate(() => {
    const ov = document.querySelector('#settings-overlay');
    return !!ov && !ov.hidden;
  });
  console.log('Settings-Overlay sichtbar:', settings);

  await page.close().catch(() => {});
  return { hasFX, tapOk, shop, settings, errors };
}

(async () => {
  const browser = await chromium.launch({ executablePath: EXEC, headless: true });
  const r1 = await testPage(browser);

  // Join-Screen: zweiter Shop-Button (frischer Page-Load)
  const page2 = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors2 = [];
  page2.on('console', m => { if (m.type() === 'error') errors2.push('[console.error] ' + m.text()); });
  page2.on('pageerror', e => errors2.push('[pageerror] ' + e.message));
  await page2.goto('http://localhost:3000/player.html', { waitUntil: 'networkidle', timeout: 20000 });
  await page2.waitForTimeout(600);
  await page2.click('#btn-menu-join').catch(e => console.log('WARN join-click:', e.message.split('\n')[0]));
  await page2.waitForTimeout(400);
  const joinScreen = await page2.evaluate(() => {
    const s = document.querySelector('#screen-join');
    return !!s && !s.classList.contains('hidden');
  });
  console.log('Join-Screen aktiv:', joinScreen);
  const shop2 = await page2.evaluate(() => {
    const b = document.querySelector('#btn-shop');
    if (b) { b.click(); return true; }
    return false;
  });
  await page2.waitForTimeout(500);
  const shopVisible2 = await page2.evaluate(() => {
    const ov = document.querySelector('#shop-overlay');
    return !!ov && !ov.hidden;
  });
  console.log('Shop-Button gefunden:', shop2, '| Shop-Overlay sichtbar (Join-Screen):', shopVisible2);
  if (errors2.length) { console.log('--- Join-Screen Fehler ---'); errors2.slice(0, 10).forEach(e => console.log(e)); }
  await page2.close().catch(() => {});

  console.log('--- KONSOLEN-FEHLER Seite 1 (' + r1.errors.length + ') ---');
  r1.errors.slice(0, 20).forEach(e => console.log(e));
  console.log('--- KONSOLEN-FEHLER Seite 2 (' + errors2.length + ') ---');
  errors2.slice(0, 20).forEach(e => console.log(e));

  const pass = r1.hasFX === true && r1.tapOk === true && r1.shop.visible === true && r1.shop.cards >= 8 && r1.settings === true && shopVisible2 === true && r1.errors.length === 0 && errors2.length === 0;
  console.log('SMOKE RESULT:', pass ? 'PASS' : 'FAIL');
  await browser.close();
  process.exit(pass ? 0 : 1);
})().catch(e => { console.error('SMOKE CRASH:', e.message); process.exit(2); });
