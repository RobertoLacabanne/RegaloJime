// Captura la escena para cada prefijo de N pasos: node tools/prefixes.mjs out-dir 1,2,3
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const [, , outDir, list = '1,2,3,4,5,6,7,8,9,10,11,12,13', dpr = '1', extra = ''] = process.argv;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: +dpr, ignoreHTTPSErrors: true });
page.on('pageerror', (e) => console.log('[error]', e.message));
for (const n of list.split(',')) {
  await page.goto(`http://localhost:5173/?n=${n}${extra}`, { waitUntil: 'commit', timeout: 120000 });
  await page.waitForFunction(() => window.__labDone === true, null, { timeout: 240000, polling: 300 });
  await page.waitForTimeout(1600);
  await page.screenshot({ path: `${outDir}/n${String(n).padStart(2, '0')}.png` });
  console.log('n', n, 'ok');
}
await browser.close();
