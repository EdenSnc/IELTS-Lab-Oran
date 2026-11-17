// Focused CSS/layout probe; the full readiness-flow harness checks the actual screens.
// node tests/browser/readiness-layout.mjs <absolute Playwright module path>
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const { chromium } = await import(pathToFileURL(path.resolve(process.argv[2])).href);
const css = await readFile(new URL('../../src/components/diagnostic/readiness.module.css', import.meta.url), 'utf8').catch(() => '');
const browser = await chromium.launch({ headless: true, channel: 'msedge' });
try {
 const page = await browser.newPage();
 await page.setContent(`<style>*{box-sizing:border-box}body{margin:0;font-family:Arial,sans-serif}${css}</style>
  <div class="shell" dir="rtl"><header class="header"><div class="brand" dir="ltr">IELTS Lab</div><div class="statusBar"><p class="clock">الدقائق المتبقية: 14</p><p class="saveStatus" role="status">لم يتم الحفظ لدى IELTSLab بعد — أبقِ التبويب مفتوحاً</p></div></header>
  <main class="container"><h1 class="heroTitle">القراءة</h1><section class="panel" lang="en" dir="ltr"><h2>Reading</h2><div class="split"><div class="passage plainSource">A readable passage with a verylongunbrokentextsequencewhichmustnotmakethepassageoverflowthemobileviewport.</div><div class="questions"><fieldset class="question"><legend class="label">1. Choose the answer</legend><label class="option"><input type="radio"><span>One answer</span></label><input class="input" aria-label="Answer"></fieldset></div></div></section><div class="actionBar"><button class="primary">Finish this stage</button><a href="#help">Secondary reference link</a></div></main></div>`);
 for (const width of [320, 360, 768, 1280]) {
  await page.setViewportSize({ width, height: 800 });
  assert.equal(await page.locator('.shell').evaluate(el => el.scrollWidth <= el.clientWidth), true, `${width}px shell overflow`);
  assert.equal(await page.locator('main').evaluate(el => el.scrollWidth <= el.clientWidth), true, `${width}px main overflow`);
  for (const selector of ['button', 'a', '.option', '.input']) assert.ok(await page.locator(selector).first().evaluate(el => el.getBoundingClientRect().height >= 44), `${selector} target below 44px`);
  assert.equal(await page.locator('.panel').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(255, 255, 255)', 'content must be solid white');
  assert.equal(await page.locator('.panel').evaluate(el => getComputedStyle(el).backdropFilter), 'none', 'content must not blur');
 }
 await page.locator('a').focus();
 assert.ok(await page.locator('a').evaluate(el => parseFloat(getComputedStyle(el).outlineWidth) >= 3), 'link keyboard focus must be visible');
 const cdp = await page.context().newCDPSession(page);
 await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'reduce' }] });
 assert.equal(await page.locator('.header').evaluate(el => getComputedStyle(el).backdropFilter), 'none', 'reduced transparency must remove glass');
 assert.equal(await page.locator('.header').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(255, 255, 255)');
 await cdp.detach();
 await page.emulateMedia({ reducedMotion: 'reduce', forcedColors: 'active' });
 assert.equal(await page.locator('.header').evaluate(el => getComputedStyle(el).backdropFilter), 'none', 'forced colors must remove glass');
 assert.equal(await page.locator('button').evaluate(el => getComputedStyle(el).animationName), 'none');
 console.log('PASS readiness CSS: 320/360px RTL, 768px tablet and desktop reflow, solid content, 44px targets, keyboard focus, reduced-transparency, forced-colors and reduced-motion fallbacks');
} finally { await browser.close(); }
