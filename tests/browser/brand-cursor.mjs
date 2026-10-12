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
const floatingCursor = (await readFile('src/components/FloatingWidget.tsx', 'utf8')).match(/cursor: '([^']+)'/u)[1];
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
      <div id="passage" data-text-annotations="true" class="mock-reading-text prose max-w-none cursor-text leading-relaxed text-charcoal"><p id="paragraph">Reading <span id="nested-prose">selectable passage words</span> with <mark id="highlight" data-ielts-highlight="true">existing highlight</mark>.</p><a id="nested-link" href="#destination"><span id="link-span">More</span><svg id="link-svg" width="16" height="16"><path d="M0 0L8 8"/></svg></a><input id="passage-input" class="cursor-text"><div id="passage-edit" contenteditable=""><span id="edit-child" class="cursor-text">Edit here</span><span id="edit-false" contenteditable="false">Read only chip</span></div><div id="plain-edit" contenteditable="plaintext-only">Plain notes</div><div id="fake-textbox" role="textbox" aria-readonly="true">Readonly accessible text</div></div>
      <div id="headings" data-text-annotations="true" class="mock-question-html mock-reading-text prose max-w-none cursor-text leading-relaxed text-charcoal"><p>Matching <em id="heading-text">headings text</em></p><span id="semantic-grab" class="cursor-grab">Drag</span><span id="semantic-wait" class="cursor-wait">Loading</span></div>
      <input id="readonly" readonly value="Reference"><input id="disabled-input" class="cursor-text" disabled><button id="aria-disabled" class="cursor-pointer" aria-disabled="true"><span id="disabled-child" class="cursor-pointer">Unavailable</span><span id="disabled-prose" class="cursor-text">Reason</span></button><details><summary id="summary"><span id="summary-child">Details</span></summary>Disclosure</details><label id="field-label" for="passage-input"><span id="label-child">Answer</span></label>
      <button id="floating-minimize" style="cursor:${floatingCursor}"><svg id="floating-icon" width="16" height="16"><path d="M2 8H14"/></svg>Minimize</button><button id="busy-pointer" disabled class="cursor-pointer disabled:cursor-wait">Saving card</button><div id="grabbing" class="cursor-grabbing">Dragged</div>
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
  for (const id of ['#text', '#passage', '#paragraph', '#nested-prose', '#highlight', '#headings', '#heading-text', '#edit-false']) assert.match(await cursor(page, id), /brand-arrow\.svg.*default$/u, `${id} keeps the rounded arrow over selectable prose`);
  for (const id of ['#name', '#essay', '#editable', '#passage-input', '#passage-edit', '#edit-child', '#plain-edit', '#readonly', '#fake-textbox']) assert.equal(await cursor(page, id), 'text', `${id} preserves the editor cue`);
  for (const id of ['#nested-link', '#link-span', '#link-svg', '#summary', '#summary-child', '#field-label', '#label-child']) assert.match(await cursor(page, id), /brand-arrow\.svg.*pointer$/u);
  for (const id of ['#floating-minimize', '#floating-icon']) assert.match(await cursor(page, id), /brand-arrow\.svg.*pointer$/u, 'floating widget uses the same pointer without overriding its grab parent');
  for (const id of ['#disabled-input', '#aria-disabled', '#disabled-child', '#disabled-prose']) assert.equal(await cursor(page, id), 'not-allowed');
  for (const id of ['#passage-edit', '#plain-edit']) { await page.locator(id).evaluate(element => element.classList.add('cursor-text')); assert.equal(await cursor(page, id), 'text', 'explicit utility does not replace empty/plaintext editor cues'); }
  assert.equal(await cursor(page, '#semantic-grab'), 'grab'); assert.equal(await cursor(page, '#semantic-wait'), 'wait');
  assert.equal(await cursor(page, '#busy-pointer'), 'wait'); assert.equal(await cursor(page, '#grabbing'), 'grabbing');
  // Drag a real range across rich text, then wrap that selected range as the
  // annotation code does. Cursor changes must not disable selection/hit testing.
  await page.locator('#nested-prose').scrollIntoViewIfNeeded();
  const box = await page.locator('#nested-prose').boundingBox();
  await page.mouse.move(box.x + 1, box.y + box.height / 2); await page.mouse.down();
  await page.mouse.move(box.x + box.width - 1, box.y + box.height / 2, { steps: 12 }); await page.mouse.up();
  assert.match(await page.evaluate(() => getSelection().toString()), /selectable passage words/u);
  await page.evaluate(() => { const range = getSelection().getRangeAt(0); const mark = document.createElement('mark'); mark.id = 'new-highlight'; mark.dataset.ieltsHighlight = 'true'; range.surroundContents(mark); getSelection().removeAllRanges(); });
  assert.match(await cursor(page, '#new-highlight'), /brand-arrow\.svg.*default$/u);
  assert.equal(await page.locator('#new-highlight').innerText(), 'selectable passage words');
  await page.locator('#plain-edit').fill('New plain notes'); assert.equal(await page.locator('#plain-edit').innerText(), 'New plain notes');
  await page.locator('#passage-input').fill('Written answer'); assert.equal(await page.locator('#passage-input').inputValue(), 'Written answer');
  await page.locator('#edit-child').click(); await page.keyboard.press('End'); await page.keyboard.type(' appended'); assert.match(await page.locator('#passage-edit').innerText(), /appended/u);
  await page.locator('#summary-child').click(); assert.equal(await page.locator('details').evaluate(element => element.open), true);
  await page.locator('#label-child').click(); assert.equal(await page.evaluate(() => document.activeElement.id), 'passage-input');
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
  assert.equal(await cursor(page, '#passage'), 'text'); assert.equal(await cursor(page, '#plain-edit'), 'text');
  await page.emulateMedia({ forcedColors: 'none' });
  await page.setViewportSize({ width: 960, height: 850 });
  await mkdir('node_modules/.cache/cursor-browser', { recursive: true });
  await page.screenshot({ path: 'node_modules/.cache/cursor-browser/desktop.png', fullPage: true });
  await page.setViewportSize({ width: 480, height: 180 }); await page.goto(`${base}/preview`);
  await page.waitForFunction(() => [...document.images].every(image => image.complete && image.naturalWidth > 0));
  await page.screenshot({ path: 'node_modules/.cache/cursor-browser/pointer-preview.png' });
  const touch = await browser.newContext({ hasTouch: true, isMobile: true, viewport: { width: 360, height: 780 } });
  const mobile = await touch.newPage(); await mobile.goto(base); assert.equal(await cursor(mobile, 'body'), 'default'); assert.equal(await cursor(mobile, '#button'), 'pointer');
  assert.equal(await cursor(mobile, '#passage'), 'text'); assert.equal(await cursor(mobile, '#plain-edit'), 'text');
  assert.equal(await mobile.locator('#name').isEditable(), true); await mobile.locator('#name').fill('Mobile QA'); await touch.close();
  const noJs = await browser.newContext({ javaScriptEnabled: false }); const staticPage = await noJs.newPage(); await staticPage.goto(base);
  assert.match(await cursor(staticPage, '#link'), /brand-arrow\.svg/u, 'cursor styling does not require JavaScript'); await noJs.close();
  // An unavailable asset still has a valid native fallback and leaves interaction
  // intact. Browser/OS-owned controls are deliberately outside this styling.
  const missingAsset = await browser.newContext(); await missingAsset.route('**/cursors/brand-arrow.svg', route => route.abort());
  const fallbackPage = await missingAsset.newPage(); await fallbackPage.goto(base);
  assert.match(await cursor(fallbackPage, '#passage'), /brand-arrow\.svg.*default$/u);
  await fallbackPage.getByRole('button', { name: 'Continue', exact: true }).click(); assert.equal(await fallbackPage.locator('#button').innerText(), 'Continued');
  await missingAsset.close();
  assert.deepEqual(errors, []);
  console.log('PASS brand cursor: real global/Tailwind cascade; text, drag, resize, disabled and busy states; en/fr/ar 320/360/768/1280; touch, high contrast, keyboard and no-JS.');
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
