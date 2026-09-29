// Final completo: espera el envoltorio y el poema, y scrollea hasta la firma.
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const [, , outDir, dpr = '3', extra = ''] = process.argv;
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: +dpr, ignoreHTTPSErrors: true });
p.on('pageerror', (e) => console.log('[error]', e.message));
await p.goto('http://localhost:5173/?final' + extra, { waitUntil: 'commit' });
await p.waitForFunction(() => window.__labDone === true, null, { timeout: 240000, polling: 300 });
await p.waitForTimeout(3200);
await p.screenshot({ path: `${outDir}/f1-envuelto.png` });
await p.waitForTimeout(5500);
await p.screenshot({ path: `${outDir}/f2-poema.png` });
console.log(await p.evaluate(() => `MB=${window.__mb().toFixed(1)} modo=${window.__baker}`));
await p.evaluate(() => { const f = document.querySelector('#final'); f.scrollTo({ top: f.scrollHeight, behavior: 'instant' }); });
await p.waitForTimeout(600);
await p.screenshot({ path: `${outDir}/f3-firma.png` });
await b.close();
