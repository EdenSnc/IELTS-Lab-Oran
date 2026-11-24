import {
  checkPosterDimensions, isEvenLightQrArea, posterPrintLayout, posterQrBacking, posterQrEdges, PRINT_PAPERS, QUIET_MODULES,
  withPngPrintDpi, type PosterPlacement, type PrintPaper,
} from './poster-artwork';

export type PosterExportFormat = 'png' | 'pdf' | 'both';
type PrintArtwork = { image: HTMLImageElement; width: number; height: number };
type PrintDesign = PosterPlacement & { qrBackground: string; roundQr: boolean; dpi: number };
type PrintPage = { png: Blob; dpi: number; widthPoints: number; heightPoints: number; usedSafeBacking: boolean };

async function fetchPoster(url: string, milliseconds: number, signal?: AbortSignal) {
  signal?.throwIfAborted();
  const controller = new AbortController();
  const cancel = () => controller.abort(signal?.reason);
  signal?.addEventListener('abort', cancel, { once: true });
  const timeout = window.setTimeout(() => controller.abort(new DOMException('The download timed out.', 'TimeoutError')), milliseconds);
  try {
    const response = await fetch(url, { signal: controller.signal });
    return { ok: response.ok, status: response.status, data: await response.blob() };
  } finally {
    window.clearTimeout(timeout);
    signal?.removeEventListener('abort', cancel);
  }
}

export function samplePosterArtwork(art: PrintArtwork, x: number, y: number, size: number) {
  const side = Math.min(size, 256);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = side;
  const context = canvas.getContext('2d', { alpha: false, willReadFrequently: true });
  if (!context) throw new Error('Artwork sampling is unavailable in this browser.');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, side, side);
  context.drawImage(art.image, x, y, size, size, 0, 0, side, side);
  return context.getImageData(0, 0, side, side).data;
}

export async function checkPrintableLocation(code: string, signal?: AbortSignal) {
  const response = await fetchPoster(`/api/staff/acquisition?code=${encodeURIComponent(code)}`, 10_000, signal);
  if (response.status === 401 || response.status === 403) throw new Error('Sign in again to export posters.');
  if (response.status === 404) throw new Error('This tracking location no longer exists.');
  if (!response.ok) throw new Error('Could not check the tracking link. Try again.');
  const { active } = JSON.parse(await response.data.text()) as { active?: boolean };
  return active === true;
}

export async function renderPrintPoster(art: PrintArtwork, design: PrintDesign, paper: PrintPaper, matrix: string[]): Promise<PrintPage> {
  const usesArtwork = design.qrBackground === 'artwork';
  const usedSafeBacking = usesArtwork
    && !isEvenLightQrArea(samplePosterArtwork(art, design.x, design.y, design.size));
  const transparent = usesArtwork && !usedSafeBacking;
  const print = posterPrintLayout(art, paper, design.dpi);
  const cells = matrix.length + 2 * QUIET_MODULES;
  const size = Math.floor(design.size * print.scale);
  if (size < 4 * cells) throw new Error('Increase the QR width for this paper size.');
  const x = Math.round(print.left + design.x * print.scale);
  const y = Math.round(print.top + design.y * print.scale);
  const backing = posterQrBacking(size, cells, usedSafeBacking || (design.roundQr && !transparent));
  const canvas = document.createElement('canvas');
  canvas.width = print.width;
  canvas.height = print.height;
  try {
    const context = canvas.getContext('2d', { alpha: false, colorSpace: 'srgb' });
    if (!context) throw new Error('This browser could not create a print image.');
    context.fillStyle = '#fff';
    context.fillRect(0, 0, print.width, print.height);
    context.drawImage(art.image, print.left, print.top, art.width * print.scale, art.height * print.scale);
    if (!transparent) {
      context.fillStyle = usedSafeBacking ? '#ffffff' : design.qrBackground;
      context.beginPath();
      context.roundRect(x, y, size, size, backing.radius);
      context.fill();
    }
    context.fillStyle = '#000';
    const edges = posterQrEdges(backing.codeSize, cells);
    for (const [row, line] of matrix.entries()) {
      for (let col = 0; col < line.length; col++) {
        if (line[col] === '1') context.fillRect(x + backing.inset + edges[col], y + backing.inset + edges[row], edges[col + 1] - edges[col], edges[row + 1] - edges[row]);
      }
    }
    const png = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('The browser could not export this poster.')), 'image/png');
    });
    const [short, long] = paper === 'original' ? [0, 0] : PRINT_PAPERS[paper];
    const landscape = art.width > art.height;
    return {
      png: withPngPrintDpi(await png.arrayBuffer(), print.dpi),
      dpi: print.dpi, usedSafeBacking,
      widthPoints: paper === 'original' ? print.width * 72 / print.dpi : (landscape ? long : short) * 72 / 25.4,
      heightPoints: paper === 'original' ? print.height * 72 / print.dpi : (landscape ? short : long) * 72 / 25.4,
    };
  } finally {
    canvas.width = canvas.height = 0;
  }
}

export async function createPosterPdf() {
  const [{ PDFDocument, PDFName, PDFRawStream }, response] = await Promise.all([
    import('pdf-lib'),
    fetchPoster('/print/srgb.icc', 10_000),
  ]);
  if (!response.ok) throw new Error('The print color profile could not be loaded. Try again.');
  const profile = new Uint8Array(await response.data.arrayBuffer());
  if (String.fromCharCode(...profile.subarray(36, 40)) !== 'acsp'
    || String.fromCharCode(...profile.subarray(16, 20)) !== 'RGB ') throw new Error('The print color profile is invalid.');
  const pdf = await PDFDocument.create();
  const profileRef = pdf.context.register(pdf.context.flateStream(profile, { N: 3, Alternate: 'DeviceRGB' }));
  pdf.setTitle('IELTS Lab posters');
  return {
    async add({ png, widthPoints, heightPoints }: PrintPage) {
      const image = await pdf.embedPng(await png.arrayBuffer());
      await image.embed();
      const stream = pdf.context.lookup(image.ref);
      if (!(stream instanceof PDFRawStream)) throw new Error('The poster image could not be embedded.');
      stream.dict.set(PDFName.of('ColorSpace'), pdf.context.obj(['ICCBased', profileRef]));
      pdf.addPage([widthPoints, heightPoints]).drawImage(image, { x: 0, y: 0, width: widthPoints, height: heightPoints });
    },
    async finish() {
      return new Blob([new Uint8Array(await pdf.save())], { type: 'application/pdf' });
    },
  };
}

export async function renderSavedPoster(design: PrintDesign & { id: string; version: number; trackingUrl: string }, paper: PrintPaper, signal: AbortSignal) {
  const [{ create }, response] = await Promise.all([
    import('qrcode'),
    fetchPoster(`/api/staff/posters?id=${encodeURIComponent(design.id)}&version=${design.version}`, 20_000, signal),
  ]);
  if (!response.ok) throw new Error('The saved artwork changed or could not be loaded. Refresh the library and try again.');
  const url = URL.createObjectURL(response.data);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    signal.throwIfAborted();
    const dimensions = { width: image.naturalWidth, height: image.naturalHeight };
    checkPosterDimensions(dimensions);
    const modules = create(design.trackingUrl, { errorCorrectionLevel: 'M' }).modules;
    const matrix = Array.from({ length: modules.size }, (_, row) =>
      Array.from({ length: modules.size }, (_, col) => modules.get(row, col) ? '1' : '0').join(''));
    return await renderPrintPoster({ image, ...dimensions }, design, paper, matrix);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function posterFileStem(title: string) {
  return title.replace(/[^\p{L}\p{N}_ -]/gu, '').trim().slice(0, 80) || 'IELTSLab-poster';
}

export async function zipPosterFiles(files: Record<string, Uint8Array>) {
  const { zipSync } = await import('fflate');
  return new Blob([new Uint8Array(zipSync(files, { level: 0 }))], { type: 'application/zip' });
}

export function downloadPosterFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
