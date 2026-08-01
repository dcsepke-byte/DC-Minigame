/* Party Arena — 3D/WebGL-Smoke-Test (visual-1)
   Oeffnet index.html + host.html, prueft WebGL, scene3d Init, GLB-Asset-Loading, Konsole. */
const { chromium } = require('playwright');
const EXEC = '/opt/data/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome';

(async () => {
  const browser = await chromium.launch({
    executablePath: EXEC,
    headless: true,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
  });
  let fail = 0;
  for (const pageName of ['index.html', 'host.html']) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = [];
    page.on('console', m => { if (m.type() === 'error') errors.push('[console.error] ' + m.text()); });
    page.on('pageerror', e => errors.push('[pageerror] ' + e.message));
    try {
      await page.goto('http://localhost:3000/' + pageName, { waitUntil: 'networkidle', timeout: 25000 });
    } catch (e) {
      errors.push('[goto] ' + e.message.split('\n')[0]);
    }
    await page.waitForTimeout(2000);
    const info = await page.evaluate(() => {
      const registry = (window.AssetLoader && window.AssetLoader.getRegistry) ? window.AssetLoader.getRegistry() : null;
      let initResult = 'nicht aufgerufen';
      let webglAfterInit = false;
      const cv = document.getElementById('party-3d-canvas');
      const existingCanvas = !!cv;
      if (window.Party3D && typeof window.Party3D.init === 'function' && !existingCanvas) {
        try {
          window.Party3D.init();
          initResult = 'ok (manuell)';
        } catch (e) {
          initResult = 'THROW: ' + e.message;
        }
      } else if (existingCanvas) {
        initResult = 'bereits initialisiert';
      }
      /* WebGL-Status OHNE neuen getContext-Aufruf pruefen:
         party-3d-canvas existiert nur, wenn THREE.WebGLRenderer erfolgreich war
         (sonst greift der 2D-Fallback via Board2D). */
      const cv2 = document.getElementById('party-3d-canvas');
      webglAfterInit = !!cv2;
      return {
        hasAssetLoader: typeof window.AssetLoader !== 'undefined',
        registryKeys: registry ? Object.keys(registry).length : 0,
        hasParty3D: typeof window.Party3D !== 'undefined',
        existingCanvas,
        initResult,
        webglAfterInit,
      };
    }).catch((e) => ({ error: e.message }));
    console.log(pageName + ': ' + JSON.stringify(info) + ', Fehler=' + errors.length);
    errors.slice(0, 8).forEach(e => console.log('  ' + e));
    if (errors.length > 0 || !info.webglAfterInit) fail = 1;
    await page.close().catch(() => {});
  }
  console.log('3D-SMOKE:', fail ? 'FAIL' : 'PASS');
  await browser.close();
  process.exit(fail);
})().catch(e => { console.error('3D CRASH:', e.message); process.exit(2); });
