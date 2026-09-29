// Mide fps durante la animación de pasos con CPU estrangulada (CDP).
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const [, , rate = '4', extra = ''] = process.argv;
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, ignoreHTTPSErrors: true });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('[error]', e.message));
await page.goto('http://localhost:5173/' + extra, { waitUntil: 'commit' });
await page.waitForFunction(() => window.__labDone === true, null, { timeout: 180000, polling: 300 });
await page.waitForTimeout(1500);
const cdp = await ctx.newCDPSession(page);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: +rate });
const measure = async (label, ms) => {
  const r = await page.evaluate((ms) => new Promise((res) => {
    const ts = [];
    const t0 = performance.now();
    const f = (t) => { ts.push(t); if (t - t0 < ms) requestAnimationFrame(f); else res(ts); };
    requestAnimationFrame(f);
  }), ms);
  const d = r.slice(1).map((t, i) => t - r[i]);
  d.sort((a, b) => a - b);
  const avg = d.reduce((a, b) => a + b, 0) / d.length;
  const p95 = d[Math.floor(d.length * 0.95)];
  const long = d.filter((x) => x > 34).length;
  const st = await page.evaluate(() => { const s = window.__stage.stats || { n: 1, ms: 0, max: 0 }; window.__stage.stats = null; return `draw medio ${(s.ms / s.n).toFixed(1)} ms, máx ${s.max.toFixed(1)} ms, dibujados ${s.n}`; });
  console.log(`${label}: ${st} | ${(1000 / avg).toFixed(1)} fps medios, p95 ${p95.toFixed(1)} ms, frames >34ms: ${long}/${d.length}`);
};
for (let i = 0; i < 4; i++) {
  // esperar a que termine el horneado anticipado, después tocar
  await page.waitForFunction(() => window.__stage.items.every((it) => it.done), null, { timeout: 120000 });
  await page.waitForTimeout(2500);
  await page.mouse.click(195, 520);
  await measure(`paso ${i + 1} (animación)`, 2400);
}
await page.waitForTimeout(3000);
await measure('reposo (solo balanceo)', 2000);
await browser.close();
