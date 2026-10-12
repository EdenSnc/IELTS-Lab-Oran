// Real production global/Tailwind CSS. No production accounts or provider calls.
// node tests/browser/brand-cursor.mjs <absolute Playwright module path>
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { compile } from '@tailwindcss/node';
import sharp from 'sharp';

const { chromium } = await import(pathToFileURL(path.resolve(process.argv[2])).href);
const compiler = await compile(await readFile('src/app/globals.css', 'utf8'), { base: process.cwd(), onDependency() {} });
const css = compiler.build(['cursor-pointer', 'cursor-default', 'cursor-text', 'cursor-grab', 'cursor-grabbing', 'cursor-col-resize', 'cursor-wait', 'disabled:cursor-not-allowed', 'disabled:cursor-wait']);
const componentCss = ''; // Release uses only its real production global/Tailwind CSS.
const server = createServer(async (request, response) => {
  try {
    if (request.url.startsWith('/cursors/')) {
      if (request.url !== '/cursors/brand-arrow.svg') { response.writeHead(404); response.end(); return; }
      response.setHeader('Content-Type', 'image/svg+xml'); response.end(await readFile(`public${request.url}`)); return;
    }
    response.setHeader('Content-Type', 'text/html; charset=utf-8');
    if (request.url === '/preview') {
      response.end('<!doctype html><html lang="en"><head><style>body{margin:0;padding:24px;background:#f3f4f6;font-family:Arial}section{display:flex;gap:16px}figure{margin:0;flex:1;height:132px;border-radius:20px;background:white;display:grid;place-content:center;justify-items:center;gap:12px}figure:last-child{background:#0a0a0a;color:white}img{width:56px;height:56px}figcaption{font-size:12px;opacity:.6}</style></head><body><section><figure><img src="/cursors/brand-arrow.svg" alt="Pointer on white"><figcaption>Light surface</figcaption></figure><figure><img src="/cursors/brand-arrow.svg" alt="Pointer on black"><figcaption>Dark surface</figcaption></figure></section></body></html>'); return;
    }
    response.end(`<!doctype html><html lang="en"><head><style>${css}\n${componentCss}\nbody{padding:32px;font-family:Arial}main{display:grid;gap:16px;max-width:600px}button,input,textarea,select,a,summary{min-height:44px}#dark{background:#0a0a0a;color:white;padding:24px}</style></head><body>
      <main><h1>IELTS Lab cursor check</h1><p id="copy">Selectable reading text</p><a id="link" href="#destination">Account</a><button id="button">Continue</button>
      <label for="name">Name</label><input id="name"><textarea id="essay" aria-label="Essay"></textarea><div id="editable" contenteditable="true">Editable notes</div>
      <select id="choice" aria-label="Pathway"><option>Academic</option><option>General Training</option></select><label class="cursor-pointer"><input id="check" type="checkbox">Processing notice</label>
      <button id="disabled" disabled>Unavailable</button><button id="waiting" class="disabled:cursor-wait" disabled>Saving</button><div id="grab" class="cursor-grab">Draggable widget</div><div id="resize" class="cursor-col-resize">Resize pane</div>
      <div id="move" class="mock-ielts-token">Drag answer</div><button id="gap" class="mock-ielts-gap">Answer target</button><button id="guide" class="trigger">Guide</button><button id="primary" class="primary">Start test</button><label id="rating" class="rating cursor-pointer"><input type="radio">Ready</label>
      <div id="utility" class="cursor-pointer">Selectable card</div><div id="default" class="cursor-default">Default arrow</div><div id="text" class="cursor-text">IELTS passage</div><div id="dark">Dark surface</div><div id="destination">Destination</div>
      <img id="arrow" src="/cursors/brand-arrow.svg" alt="Compact black browser-use pointer"></main>
      <script>document.querySelector('#button').addEventListener('click',()=>document.querySelector('#button').textContent='Continued');</script></body></html>`);
  } catch { response.writeHead(404); response.end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, channel: 'msedge' });
const cursor = (page, id) => page.locator(id).evaluate(element => getComputedStyle(element).cursor);
try {
  const sourceSvg = await readFile('public/cursors/brand-arrow.svg', 'utf8');
  const pixels = await sharp(Buffer.from(sourceSvg)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const pixel = (x, y) => [...pixels.data.subarray((y * pixels.info.width + x) * 4, (y * pixels.info.width + x) * 4 + 4)];
  assert.equal(pixel(4, 17)[3], 0, 'the tilted silhouette has no stock vertical shaft');
  assert.equal(pixel(14, 24)[3], 0, 'the browser-use pointer has no stock arrow stem');
  assert.ok(pixel(15, 10)[0] < 32 && pixel(15, 10)[3] > 180, 'the broad upper wedge is black');
  // Isolate the actual black fill: a white round stroke must not hide sharp joins.
  const fill = await sharp(Buffer.from(sourceSvg.replace(/stroke="#fff"/u, 'stroke="none"'))).resize(280,280).ensureAlpha().raw().toBuffer();
  const fillAlpha = (x,y) => fill[(Math.floor(y*10)*280+Math.floor(x*10))*4+3];
  assert.ok(fillAlpha(13.2,14) > 220, 'the inner notch must have a curved black silhouette');
  assert.ok(fillAlpha(3.9,4.2) < 64, 'the black tip must be softly rounded, not acute');
  const page = await browser.newPage(); const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(base);
  assert.match(await cursor(page, 'body'), /brand-arrow\.svg.*default$/u, 'background uses the black arrow');
  for (const id of ['#link', '#button', '#choice', '#check', '#gap', '#guide', '#primary', '#rating', '#utility']) {
    assert.match(await cursor(page, id), /brand-arrow\.svg.*pointer$/u, `${id} uses the same compact browser-use silhouette`);
  }
  assert.match(await cursor(page, '#default'), /brand-arrow\.svg.*default$/u);
  for (const id of ['#name', '#essay', '#editable', '#text']) assert.equal(await cursor(page, id), 'text', `${id} preserves text editing/selection`);
  for (const [id, expected] of [['#disabled','not-allowed'], ['#waiting','wait'], ['#grab','grab'], ['#resize','col-resize'], ['#move','move']]) assert.equal(await cursor(page, id), expected, 'functional cursor is not replaced');
  await page.getByRole('button', { name: 'Continue', exact: true }).click(); assert.equal(await page.locator('#button').innerText(), 'Continued');
  await page.locator('#name').fill('Local QA'); await page.locator('#name').press('Tab'); assert.equal(await page.evaluate(() => document.activeElement.id), 'essay');
  await page.waitForFunction(() => [...document.images].every(image => image.complete && image.naturalWidth > 0));
  assert.deepEqual(await page.locator('img').evaluateAll(images => images.map(image => [image.naturalWidth, image.naturalHeight])), [[28,28]], 'small intrinsic SVG decodes');
  for (const locale of ['en', 'fr', 'ar']) {
    await page.evaluate(locale => { document.documentElement.lang = locale; document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr'; }, locale);
    for (const width of [320,360,768,1280]) { await page.setViewportSize({ width, height: 850 }); assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'cursor styling introduces no overflow'); }
    assert.match(await cursor(page, '#button'), /brand-arrow\.svg/u);
  }
  await page.emulateMedia({ forcedColors: 'active' });
  assert.equal(await cursor(page, 'body'), 'default'); assert.equal(await cursor(page, '#button'), 'pointer'); assert.equal(await cursor(page, '#utility'), 'pointer'); assert.equal(await cursor(page, '#name'), 'text');
  await page.emulateMedia({ forcedColors: 'none' });
  await page.setViewportSize({ width: 960, height: 850 });
  await mkdir('node_modules/.cache/cursor-browser', { recursive: true });
  await page.screenshot({ path: 'node_modules/.cache/cursor-browser/desktop.png', fullPage: true });
  await page.setViewportSize({ width: 480, height: 180 }); await page.goto(`${base}/preview`);
  await page.waitForFunction(() => [...document.images].every(image => image.complete && image.naturalWidth > 0));
  await page.screenshot({ path: 'node_modules/.cache/cursor-browser/pointer-preview.png' });
  const touch = await browser.newContext({ hasTouch: true, isMobile: true, viewport: { width: 360, height: 780 } });
  const mobile = await touch.newPage(); await mobile.goto(base); assert.equal(await cursor(mobile, 'body'), 'default'); assert.equal(await cursor(mobile, '#button'), 'pointer');
  assert.equal(await mobile.locator('#name').isEditable(), true); await mobile.locator('#name').fill('Mobile QA'); await touch.close();
  const noJs = await browser.newContext({ javaScriptEnabled: false }); const staticPage = await noJs.newPage(); await staticPage.goto(base);
  assert.match(await cursor(staticPage, '#link'), /brand-arrow\.svg/u, 'cursor styling does not require JavaScript'); await noJs.close();
  assert.deepEqual(errors, []);
  console.log('PASS brand cursor: real global/Tailwind cascade; text, drag, resize, disabled and busy states; en/fr/ar 320/360/768/1280; touch, high contrast, keyboard and no-JS.');
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
