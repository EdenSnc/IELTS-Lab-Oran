import assert from 'node:assert/strict';
import test from 'node:test';
import sharp from 'sharp';
import {
  checkPosterDimensions, initialPosterQr, inspectPoster, movePosterQr,
  qrSizeLimits, resizePosterQr, withPngPrintDpi,
} from '../../src/lib/acquisition/poster-artwork';

test('movement and resizing preserve the whole symbol and quiet zone inside the source', () => {
  const art = { width: 1748, height: 2480 };
  const cells = 37;
  const initial = initialPosterQr(art, cells);
  assert.equal(initial.size % cells, 0);
  const corner = movePosterQr(art, initial, 99999, 99999);
  assert.equal(corner.x + corner.size, art.width);
  assert.equal(corner.y + corner.size, art.height);
  assert.equal(resizePosterQr(art, corner, cells, 99999).size, corner.size);
  const origin = movePosterQr(art, corner, -100, -100);
  assert.deepEqual([origin.x, origin.y], [0, 0]);
  assert.equal(resizePosterQr(art, origin, cells, 1).size, qrSizeLimits(art, cells).min);
  assert.deepEqual(movePosterQr(art, initial, NaN, Infinity), initial);
  assert.throws(() => initialPosterQr({ width: 100, height: 1000 }, cells), /at least 148/);
});

test('poster inspection validates type, size, truncation and advertised DPI', async () => {
  const sample = sharp({ create: { width: 320, height: 520, channels: 3, background: '#fff' } });
  const png = Uint8Array.from(await sample.clone().png().toBuffer());
  const jpg = Uint8Array.from(await sample.clone().withMetadata({ density: 300 }).jpeg().toBuffer());
  assert.deepEqual(inspectPoster(png), { mime: 'image/png', width: 320, height: 520, dpi: undefined });
  assert.deepEqual(inspectPoster(jpg), { mime: 'image/jpeg', width: 320, height: 520, dpi: 300 });
  assert.throws(() => inspectPoster(new TextEncoder().encode('<svg/>')), /Choose a PNG or JPEG/);
  assert.throws(() => inspectPoster(jpg.subarray(0, 22)), /JPEG header/);
  assert.throws(() => checkPosterDimensions({ width: 8000, height: 8000 }), /24 megapixels/);
  const oversized = png.slice();
  new DataView(oversized.buffer).setUint32(16, 50_000);
  assert.throws(() => inspectPoster(oversized), /8,192/);
});

test('exported PNG replaces resolution metadata and preserves pixel dimensions and samples', async () => {
  const png = Uint8Array.from(await sharp({
    create: { width: 320, height: 520, channels: 3, background: '#d31b3a' },
  }).withMetadata({ density: 96 }).png().toBuffer());
  const exportPng = await withPngPrintDpi(png.buffer, 300).arrayBuffer();
  const second = await withPngPrintDpi(exportPng, 450).arrayBuffer();
  assert.equal(inspectPoster(new Uint8Array(exportPng)).dpi, 300);
  assert.equal(inspectPoster(new Uint8Array(second)).dpi, 450);
  assert.equal(Buffer.from(second).toString('latin1').split('pHYs').length, 2);
  const original = await sharp(png).raw().toBuffer();
  const final = await sharp(Buffer.from(second)).raw().toBuffer({ resolveWithObject: true });
  assert.deepEqual([final.info.width, final.info.height], [320, 520]);
  assert.deepEqual(final.data, original);
  assert.throws(() => withPngPrintDpi(png.buffer, 2000), /resolution/);
});
