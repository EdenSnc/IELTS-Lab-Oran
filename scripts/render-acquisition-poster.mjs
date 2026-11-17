import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import QRCode from 'qrcode';
import sharp from 'sharp';

const [input, link, output] = process.argv.slice(2);
if (!input || !link || !output || path.extname(output).toLowerCase() !== '.png') {
  throw new Error('Usage: node scripts/render-acquisition-poster.mjs <A5 sRGB PNG> <placement URL> <new output PNG>');
}

const url = new URL(link);
if (
  url.protocol !== 'https:' || url.hostname !== 'www.ieltslab.org' ||
  url.port || url.username || url.password || url.search || url.hash ||
  !/^\/r\/[A-Za-z0-9_-]{10,24}$/.test(url.pathname)
) {
  throw new Error('Use the canonical IELTSLab placement link from the dashboard.');
}

const template = sharp(input);
const metadata = await template.metadata();
if (metadata.width !== 1748 || metadata.height !== 2480 || metadata.format !== 'png') {
  throw new Error('Use the original 1748 × 2480 A5 sRGB PNG supplied for this campaign.');
}

// Place the code inside the existing print box, including its four-module quiet zone.
const qr = await QRCode.toBuffer(url.href, { width: 360, margin: 4, errorCorrectionLevel: 'M' });
const image = await template
  .composite([{ input: qr, left: 220, top: 2006 }])
  .withMetadata({ density: 300 })
  .png()
  .toBuffer();
await writeFile(output, image, { flag: 'wx' });
console.log(`Wrote ${output}`);
