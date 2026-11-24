import assert from 'node:assert/strict';
import test from 'node:test';
import sharp from 'sharp';
import {
  checkPosterDimensions, initialPosterQr, inspectPoster, movePosterQr,
  isEvenLightQrArea, isLightQrColor, posterQrBacking, posterQrEdges, qrSizeLimits, resizePosterQr, withPngPrintDpi,
  PRINT_QR_WIDTHS, posterPrintLayout, printQrMeasurements, printQrSourceWidth,
} from '../../src/lib/acquisition/poster-artwork';

test('paper-specific QR presets produce their physical width and four-module borders at 300 dpi', () => {
  for (const paper of ['A6', 'A5', 'A4', 'A3'] as const) {
    const print = posterPrintLayout({ width: 1748, height: 2480 }, paper, 300);
    for (const mm of PRINT_QR_WIDTHS[paper]) {
      const source = printQrSourceWidth(mm, print.scale, print.dpi);
      const measure = printQrMeasurements(Math.floor(source * print.scale), 37, false, print.dpi);
      assert.ok(measure);
      assert.ok(Math.abs(measure.totalMm - mm) < 0.22);
      assert.ok(measure.quietMm >= measure.symbolMm / 29 * 4);
    }
  }
});

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

test('QR width increments by one pixel and renders crisp modules with the full quiet zone', () => {
  const cells = 37;
  const art = { width: 1748, height: 2480 };
  const qr = initialPosterQr(art, cells);
  assert.equal(resizePosterQr(art, qr, cells, qr.size + 1).size, qr.size + 1);
  for (let width = 148; width <= 468; width++) {
    const edges = posterQrEdges(width, cells);
    assert.equal(edges.length, 30);
    assert.ok(edges[0] >= 4 * width / cells);
    assert.equal(width - edges.at(-1)!, edges[0]);
    const modules = edges.slice(1).map((edge, i) => edge - edges[i]);
    assert.ok(Math.min(...modules) >= 3);
    assert.ok(Math.max(...modules) - Math.min(...modules) <= 1);
  }
});

test('rounded backing keeps the entire QR quiet-zone square inside its curved corners', () => {
  for (let size = 148; size <= 500; size++) {
    const { radius, inset, codeSize } = posterQrBacking(size, 37, true);
    assert.ok(codeSize >= 148);
    assert.ok(Math.SQRT2 * (radius - inset) <= radius + 1e-9);
    assert.equal(codeSize + 2 * inset, size);
  }
  assert.deepEqual(posterQrBacking(445, 37, false), { radius: 0, inset: 0, codeSize: 445 });
});

test('background color and transparency require a light, even area under black modules', () => {
  assert.equal(isLightQrColor('#ffe8ee'), true);
  assert.equal(isLightQrColor('#ba173b'), false);
  assert.equal(isLightQrColor('pink'), false);
  assert.equal(isEvenLightQrArea(new Uint8ClampedArray([255, 232, 238, 255, 255, 232, 238, 255])), true);
  assert.equal(isEvenLightQrArea(new Uint8ClampedArray([255, 232, 238, 255, 156, 23, 59, 255])), false);
  assert.equal(isEvenLightQrArea(new Uint8ClampedArray([255, 255, 255, 255, 220, 200, 218, 255])), false);
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
