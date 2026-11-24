export const MAX_POSTER_BYTES = 25 * 1024 * 1024;
export const MAX_POSTER_PIXELS = 24_000_000;
export const QUIET_MODULES = 4;
const MAX_SIDE = 8_192;
const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];

type Dimensions = { width: number; height: number };
export const PRINT_PAPERS = { A6: [105, 148], A5: [148, 210], A4: [210, 297], A3: [297, 420] } as const;
export type PrintPaper = keyof typeof PRINT_PAPERS | 'original';
export function posterPrintLayout(art: Dimensions, paper: PrintPaper, dpi: number) {
  if (paper === 'original') return { ...art, dpi, scale: 1, left: 0, top: 0 };
  const [short, long] = PRINT_PAPERS[paper];
  const pixels = (mm: number) => Math.round(mm * 300 / 25.4);
  const landscape = art.width > art.height;
  const width = pixels(landscape ? long : short);
  const height = pixels(landscape ? short : long);
  const scale = Math.min(width / art.width, height / art.height);
  return { width, height, dpi: 300, scale, left: (width - art.width * scale) / 2, top: (height - art.height * scale) / 2 };
}
type Artwork = Dimensions & { mime: 'image/png' | 'image/jpeg'; dpi?: number };
export type PosterPlacement = { x: number; y: number; size: number };

export function validDpi(value: number) {
  return Number.isInteger(value) && value >= 72 && value <= 1200;
}

export function checkPosterDimensions({ width, height }: Dimensions) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 ||
    width > MAX_SIDE || height > MAX_SIDE || width * height > MAX_POSTER_PIXELS) {
    throw new Error('Use artwork under 8,192 pixels per side and 24 megapixels.');
  }
}

function pngSignature(bytes: Uint8Array) {
  return PNG_SIGNATURE.every((value, index) => bytes[index] === value);
}

function* pngChunks(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let start = 8;
  while (start + 12 <= bytes.length) {
    const length = view.getUint32(start);
    const end = start + length + 12;
    if (end > bytes.length) throw new Error('The PNG file is incomplete.');
    const type = String.fromCharCode(...bytes.subarray(start + 4, start + 8));
    yield { type, start, end, length };
    if (type === 'IEND') return;
    start = end;
  }
  throw new Error('The PNG file is incomplete.');
}

function exifPrintDpi(bytes: Uint8Array): number | undefined {
  if (bytes.length < 14 || String.fromCharCode(...bytes.subarray(0, 6)) !== 'Exif\0\0') return;
  const tiff = new DataView(bytes.buffer, bytes.byteOffset + 6, bytes.length - 6);
  const littleEndian = tiff.getUint16(0) === 0x4949;
  if ((!littleEndian && tiff.getUint16(0) !== 0x4d4d) || tiff.getUint16(2, littleEndian) !== 42) return;
  const directory = tiff.getUint32(4, littleEndian);
  if (directory + 2 > tiff.byteLength) return;
  const entries = tiff.getUint16(directory, littleEndian);
  if (directory + 2 + entries * 12 > tiff.byteLength) return;
  let x = 0;
  let y = 0;
  let unit = 2;
  for (let index = 0; index < entries; index++) {
    const entry = directory + 2 + index * 12;
    const tag = tiff.getUint16(entry, littleEndian);
    const type = tiff.getUint16(entry + 2, littleEndian);
    const count = tiff.getUint32(entry + 4, littleEndian);
    if (count !== 1) continue;
    if (tag === 296 && type === 3) unit = tiff.getUint16(entry + 8, littleEndian);
    if ((tag === 282 || tag === 283) && type === 5) {
      const offset = tiff.getUint32(entry + 8, littleEndian);
      if (offset + 8 > tiff.byteLength) continue;
      const resolution = tiff.getUint32(offset, littleEndian) / tiff.getUint32(offset + 4, littleEndian);
      if (tag === 282) x = resolution;
      else y = resolution;
    }
  }
  const dpi = Math.round(x * (unit === 3 ? 2.54 : 1));
  return (unit === 2 || unit === 3) && x === y && validDpi(dpi) ? dpi : undefined;
}

export function inspectPoster(bytes: Uint8Array): Artwork {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (pngSignature(bytes)) {
    if (bytes.length < 33 || view.getUint32(8) !== 13 ||
      String.fromCharCode(...bytes.subarray(12, 16)) !== 'IHDR') throw new Error('The PNG header is invalid.');
    const size = { width: view.getUint32(16), height: view.getUint32(20) };
    checkPosterDimensions(size);
    let dpi: number | undefined;
    for (const { type, start, length } of pngChunks(bytes)) {
      if (type === 'acTL') throw new Error('Use a still PNG or JPEG.');
      if (type === 'IDAT' || type === 'IEND') break;
      if (type === 'pHYs' && length === 9 && bytes[start + 16] === 1) {
        const x = view.getUint32(start + 8);
        const y = view.getUint32(start + 12);
        const density = Math.round(x * 0.0254);
        if (x === y && validDpi(density)) dpi = density;
      }
    }
    return { ...size, dpi, mime: 'image/png' };
  }

  if (bytes[0] === 255 && bytes[1] === 216) {
    let dpi: number | undefined;
    let position = 2;
    while (position + 4 <= bytes.length && bytes[position] === 255) {
      while (bytes[position] === 255) position++;
      const marker = bytes[position++];
      if (marker === 0xda || marker === 0xd9 || position + 2 > bytes.length) break;
      const length = view.getUint16(position);
      const data = position + 2;
      if (length < 2 || position + length > bytes.length) break;
      if (marker === 0xe0 && length >= 14 && bytes[data] === 74 && bytes[data + 1] === 70 &&
        bytes[data + 2] === 73 && bytes[data + 3] === 70 && bytes[data + 4] === 0) {
        const unit = bytes[data + 7];
        const x = view.getUint16(data + 8);
        const y = view.getUint16(data + 10);
        const density = Math.round(x * (unit === 2 ? 2.54 : 1));
        if ((unit === 1 || unit === 2) && x === y && validDpi(density)) dpi = density;
      }
      if (marker === 0xe1) dpi = exifPrintDpi(bytes.subarray(data, position + length)) ?? dpi;
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker) && length >= 8) {
        const size = { height: view.getUint16(data + 1), width: view.getUint16(data + 3) };
        if (bytes[data + 5] === 4) throw new Error('Use an RGB JPEG or PNG for browser export.');
        checkPosterDimensions(size);
        return { ...size, dpi, mime: 'image/jpeg' };
      }
      position += length;
    }
    throw new Error('The JPEG header is invalid.');
  }
  throw new Error('Choose a PNG or JPEG file.');
}

export function qrSizeLimits(art: Dimensions, cells: number, x = 0, y = 0) {
  return {
    min: cells * 4,
    max: Math.min(art.width - x, art.height - y),
  };
}

export function movePosterQr(art: Dimensions, placement: PosterPlacement, x: number, y: number): PosterPlacement {
  return {
    size: placement.size,
    x: coordinate(x, art.width - placement.size, placement.x),
    y: coordinate(y, art.height - placement.size, placement.y),
  };
}

function coordinate(value: number, max: number, previous: number) {
  return Number.isFinite(value) ? Math.min(max, Math.max(0, Math.round(value))) : previous;
}

export function resizePosterQr(art: Dimensions, placement: PosterPlacement, cells: number, size: number): PosterPlacement {
  const { min, max } = qrSizeLimits(art, cells, placement.x, placement.y);
  const rounded = Number.isFinite(size) ? Math.round(size) : placement.size;
  return { ...placement, size: Math.max(min, Math.min(max, rounded)) };
}

export function posterQrEdges(size: number, cells: number) {
  // Keep black modules on whole printer pixels at any QR width. Round the
  // quiet zone outwards so both edges retain at least four modules.
  const border = Math.ceil(size * QUIET_MODULES / cells);
  const symbol = cells - 2 * QUIET_MODULES;
  return Array.from({ length: symbol + 1 }, (_, index) =>
    border + Math.round(index * (size - 2 * border) / symbol));
}

export function posterQrBacking(size: number, cells: number, rounded: boolean) {
  // Leave the entire square quiet zone inside the rounded backing.
  const radius = rounded ? Math.min(Math.round(size * 0.12), Math.max(0, size - 4 * cells - 1)) : 0;
  const inset = Math.ceil(radius * (1 - Math.SQRT1_2));
  return { radius, inset, codeSize: size - inset * 2 };
}

const linearSrgb = Array.from({ length: 256 }, (_, channel) => {
  const value = channel / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
});

function luminance(r: number, g: number, b: number) {
  return 0.2126 * linearSrgb[r] + 0.7152 * linearSrgb[g] + 0.0722 * linearSrgb[b];
}

export function isLightQrColor(color: string) {
  if (!/^#[\da-f]{6}$/i.test(color)) return false;
  const value = Number.parseInt(color.slice(1), 16);
  // Conservative print preset, measured with black modules on sRGB.
  return luminance(value >> 16, (value >> 8) & 255, value & 255) >= 0.62;
}

export function isEvenLightQrArea(pixels: Uint8ClampedArray) {
  if (!pixels.length) return false;
  let darkest = 1;
  let lightest = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    const light = luminance(pixels[i], pixels[i + 1], pixels[i + 2]);
    darkest = Math.min(darkest, light);
    lightest = Math.max(lightest, light);
    if (darkest < 0.62 || lightest - darkest > 0.12) return false;
  }
  return true;
}

export function initialPosterQr(art: Dimensions, cells: number): PosterPlacement {
  const { min, max } = qrSizeLimits(art, cells);
  if (max < min) throw new Error(`Use artwork at least ${min} pixels wide and tall for this QR code.`);
  const size = Math.min(max, Math.max(min, Math.round(Math.min(art.width, art.height) * 0.24 / cells) * cells));
  const inset = Math.round(Math.min(art.width, art.height) * 0.08);
  return movePosterQr(art, { x: 0, y: 0, size }, inset, art.height - size - inset);
}

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export function withPngPrintDpi(buffer: ArrayBuffer, dpi: number) {
  const bytes = new Uint8Array(buffer);
  if (!validDpi(dpi) || !pngSignature(bytes)) throw new Error('Invalid PNG or print resolution.');
  const density = new Uint8Array(21);
  const view = new DataView(density.buffer);
  const ppm = Math.round(dpi / 0.0254);
  view.setUint32(0, 9);
  density.set([112, 72, 89, 115], 4); // pHYs
  view.setUint32(8, ppm);
  view.setUint32(12, ppm);
  density[16] = 1;
  view.setUint32(17, crc32(density.subarray(4, 17)));

  const pieces: Uint8Array<ArrayBuffer>[] = [bytes.subarray(0, 8)];
  let inserted = false;
  for (const chunk of pngChunks(bytes)) {
    if (chunk.type === 'pHYs') continue;
    pieces.push(bytes.subarray(chunk.start, chunk.end));
    if (chunk.type === 'IHDR' && !inserted) {
      pieces.push(density);
      inserted = true;
    }
  }
  if (!inserted) throw new Error('The PNG header is invalid.');
  return new Blob(pieces, { type: 'image/png' });
}
