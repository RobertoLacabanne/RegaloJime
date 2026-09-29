// Uso: node tools/shot.mjs <url-path> <out.png> [w h dpr]
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const [, , path, out, w = '390', h = '844', dpr = '3'] = process.argv;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: +dpr, ignoreHTTPSErrors: true });
page.on('console', (m) => console.log('[console]', m.text()));
page.on('pageerror', (e) => console.log('[error]', e.message));
await page.goto('http://localhost:' + (process.env.PORT || 5173) + path, { waitUntil: 'commit', timeout: 120000 });
await page.waitForFunction(() => window.__labDone === true, null, { timeout: 240000, polling: 500 });
await page.waitForTimeout(+(process.env.WAIT || 400));
console.log(await page.title());
const bk = await page.evaluate(() => (window.__baker || '') + ' MB=' + (window.__mb ? window.__mb().toFixed(1) : '?'));
console.log(bk);
const clip = process.env.CLIP ? (([x, y, w, h]) => ({ x, y, width: w, height: h }))(process.env.CLIP.split(',').map(Number)) : undefined;
await page.screenshot({ path: out, clip });
await browser.close();
