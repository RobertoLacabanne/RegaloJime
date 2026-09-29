// Arma una hoja de contactos: node tools/contact.mjs out.png cols img1 img2 ...
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { writeFileSync } from 'fs';
import { dirname, basename } from 'path';
const [, , out, cols, ...imgs] = process.argv;
const html = `<html><body style="margin:0;background:#222;display:grid;grid-template-columns:repeat(${cols},1fr);gap:4px">${imgs
  .map((i) => `<figure style="margin:0;position:relative"><img src="file://${i}" style="width:100%;display:block"><figcaption style="position:absolute;top:4px;left:6px;color:#c00;font:bold 22px sans-serif">${basename(i)}</figcaption></figure>`)
  .join('')}</body></html>`;
const f = dirname(out) + '/_contact.html';
writeFileSync(f, html);
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
await p.goto('file://' + f);
await p.waitForTimeout(300);
await p.screenshot({ path: out, fullPage: true });
await b.close();
