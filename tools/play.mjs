// Juega la experiencia con toques reales y saca capturas en momentos clave.
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const [, , outDir, dpr = '2', extra = ''] = process.argv;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: +dpr, ignoreHTTPSErrors: true, hasTouch: true });
page.on('pageerror', (e) => console.log('[error]', e.message));
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('[console]', m.text()); });
await page.goto('http://localhost:5173/' + extra, { waitUntil: 'commit' });
await page.waitForFunction(() => window.__labDone === true, null, { timeout: 120000, polling: 300 });
await page.waitForTimeout(2200);
await page.screenshot({ path: `${outDir}/t00-inicio.png` });
const tap = () => page.mouse.click(195, 520);
await tap();
await page.waitForTimeout(700);
await page.screenshot({ path: `${outDir}/t01a-brote.png` });
await page.waitForTimeout(700);
await page.screenshot({ path: `${outDir}/t01b.png` });
await page.waitForTimeout(2600);
await page.screenshot({ path: `${outDir}/t01c.png` });
for (let i = 2; i <= 4; i++) {
  await tap();
  await page.waitForTimeout(i === 4 ? 900 : 4200);
}
await page.screenshot({ path: `${outDir}/t04a-rosa-abriendo.png` });
await page.waitForTimeout(500);
await page.screenshot({ path: `${outDir}/t04b-rosa-abriendo.png` });
await page.waitForTimeout(3500);
await page.screenshot({ path: `${outDir}/t04c.png` });
// toques rápidos: tres seguidos
await tap(); await page.waitForTimeout(120); await tap(); await page.waitForTimeout(120); await tap();
await page.waitForTimeout(6000);
await page.screenshot({ path: `${outDir}/t07-rapidos.png` });
console.log(await page.evaluate(() => `items=${window.__stage.items.length} MB=${window.__mb().toFixed(1)}`));
await browser.close();
