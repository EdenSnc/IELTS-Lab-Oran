'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import {
  checkPosterDimensions, initialPosterQr, inspectPoster, movePosterQr, posterQrEdges,
  qrSizeLimits, QUIET_MODULES, resizePosterQr, validDpi, withPngPrintDpi, type PosterPlacement,
} from '@/lib/acquisition/poster-artwork';
import { MAX_SAVED_ARTWORK_BYTES } from '@/lib/acquisition/poster-design';

type Artwork = { image: HTMLImageElement; url: string; file?: File; width: number; height: number };
type Drag = { pointer: number; x: number; y: number; resize: boolean; start: PosterPlacement };
type Placement = { code: string; label: string; active: boolean; preview: string; matrix: string[] };
type Design = PosterPlacement & { id: string; title: string; dpi: number; version: number };
const inputClass = 'min-h-11 w-full min-w-0 rounded-lg border border-gray-300 bg-white px-3 text-base';

function PixelField({ label, value, min, max, onCommit }: {
  label: string; value: number; min: number; max: number; onCommit: (value: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <label className="grid min-w-0 gap-1 text-sm font-semibold">
      {label}
      <input className={inputClass} type="number" inputMode="numeric" min={min} max={max} value={draft ?? value}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => {
          if (draft?.trim() && Number.isFinite(Number(draft))) onCommit(Number(draft));
          setDraft(null);
        }}
        onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }} />
    </label>
  );
}

function canvasPng(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('The browser could not export this poster.')), 'image/png');
  });
}

export default function PosterEditor({ placement, locale, design }: { placement: Placement; locale: string; design: Design | null }) {
  const [art, setArt] = useState<Artwork>();
  const [qr, setQr] = useState<PosterPlacement>();
  const [dpi, setDpi] = useState(design?.dpi ?? 300);
  const [title, setTitle] = useState(design?.title ?? placement.label);
  const [version, setVersion] = useState(design?.version);
  const [loading, setLoading] = useState(Boolean(design));
  const [dragOver, setDragOver] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [active, setActive] = useState(placement.active);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const preview = useRef<HTMLDivElement>(null);
  const artRef = useRef<Artwork>(undefined);
  const drag = useRef<Drag>(undefined);
  const loadId = useRef(0);
  const exportLock = useRef(false);
  const saveLock = useRef(false);
  const draftId = useRef(design?.id);
  const cells = placement.matrix.length + 2 * QUIET_MODULES;
  const listUrl = `/${locale}/admin/acquisition`;

  useEffect(() => () => {
    loadId.current++;
    if (artRef.current) URL.revokeObjectURL(artRef.current.url);
  }, []);

  const loadPoster = useCallback(async (file?: File, saved?: Design) => {
    if (!file || exportLock.current || saveLock.current) return;
    const token = ++loadId.current;
    let temporaryUrl: string | undefined;
    setLoading(true);
    setError('');
    setStatus('');
    try {
      if (file.size > MAX_SAVED_ARTWORK_BYTES) throw new Error('Choose a PNG or JPEG up to 4 MiB.');
      const bytes = await file.arrayBuffer();
      const declared = inspectPoster(new Uint8Array(bytes));
      if (loadId.current !== token) return;
      temporaryUrl = URL.createObjectURL(new Blob([bytes], { type: declared.mime }));
      const image = new Image();
      image.src = temporaryUrl;
      await image.decode();
      if (loadId.current !== token) return;
      const size = { width: image.naturalWidth, height: image.naturalHeight };
      checkPosterDimensions(size);
      const positioned = saved ? { x: saved.x, y: saved.y, size: saved.size } : initialPosterQr(size, cells);
      const next = { image, url: temporaryUrl, file: saved ? undefined : file, ...size };
      if (artRef.current) URL.revokeObjectURL(artRef.current.url);
      artRef.current = next;
      temporaryUrl = undefined;
      drag.current = undefined;
      setArt(next);
      setQr(positioned);
      setDpi(saved?.dpi ?? declared.dpi ?? 300);
    } catch (reason) {
      if (loadId.current === token) setError(reason instanceof Error && reason.message
        ? reason.message : 'This image could not be opened. Try a saved PNG or JPEG.');
    } finally {
      if (temporaryUrl) URL.revokeObjectURL(temporaryUrl);
      if (loadId.current === token) setLoading(false);
    }
  }, [cells]);

  useEffect(() => {
    if (!design) return;
    const controller = new AbortController();
    const token = loadId.current;
    void (async () => {
      try {
        const response = await fetch(`/api/staff/posters?id=${encodeURIComponent(design.id)}`, { signal: controller.signal });
        if (!response.ok) throw new Error('Could not load the saved artwork. Reopen the poster from the library.');
        const blob = await response.blob();
        if (!controller.signal.aborted && token === loadId.current) await loadPoster(new File([blob], design.title), design);
      } catch (problem) {
        if (!controller.signal.aborted && token === loadId.current) {
          setLoading(false);
          setError(problem instanceof Error ? problem.message : 'Could not load the saved artwork.');
        }
      }
    })();
    return () => controller.abort();
  }, [design, loadPoster]);

  async function savePoster() {
    if (!art || !qr || !title.trim() || loading || exportLock.current || saveLock.current) return;
    saveLock.current = true;
    setSaving(true);
    setError('');
    setStatus('');
    try {
      const id = draftId.current ??= crypto.randomUUID();
      const form = new FormData();
      form.set('code', placement.code);
      form.set('details', JSON.stringify({ id, version, title, dpi, ...qr }));
      if (art.file) form.set('artwork', art.file);
      const response = await fetch('/api/staff/posters', { method: 'POST', body: form });
      if (!response.ok) throw new Error(response.status === 409
        ? 'This poster changed in another tab. Reopen it before saving.'
        : response.status === 401 || response.status === 403 ? 'Sign in again to save the poster.'
        : response.status === 413 ? 'Choose a PNG or JPEG up to 4 MiB.'
        : 'Could not save this poster. Check the artwork and QR position.');
      const result = await response.json() as { id: string; version: number };
      setVersion(result.version);
      setTitle(title.trim());
      const savedArtwork = { ...art, file: undefined };
      artRef.current = savedArtwork;
      setArt(savedArtwork);
      const url = new URL(location.href);
      url.searchParams.set('design', result.id);
      history.replaceState(null, '', url);
      setStatus('Poster saved.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not save this poster.');
    } finally {
      saveLock.current = false;
      setSaving(false);
    }
  }

  function startDrag(event: PointerEvent<HTMLElement>, resize: boolean) {
    if (!qr || !event.isPrimary || event.button !== 0 || busy) return;
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { pointer: event.pointerId, x: event.clientX, y: event.clientY, resize, start: qr };
  }

  function moveDrag(event: PointerEvent<HTMLElement>) {
    const current = drag.current;
    const rect = preview.current?.getBoundingClientRect();
    if (!current || current.pointer !== event.pointerId || !art || !rect?.width || !rect.height) return;
    const dx = (event.clientX - current.x) * art.width / rect.width;
    const dy = (event.clientY - current.y) * art.height / rect.height;
    setQr(current.resize
      ? resizePosterQr(art, current.start, cells, current.start.size + (Math.abs(dx) >= Math.abs(dy) ? dx : dy))
      : movePosterQr(art, current.start, current.start.x + dx, current.start.y + dy));
  }

  function endDrag(event: PointerEvent<HTMLElement>) {
    if (drag.current?.pointer === event.pointerId) drag.current = undefined;
  }

  function nudge(event: KeyboardEvent<HTMLElement>) {
    if (!art || !qr || busy) return;
    const amount = event.shiftKey ? 10 : 1;
    const offsets: Record<string, [number, number]> = { ArrowLeft: [-amount, 0], ArrowRight: [amount, 0], ArrowUp: [0, -amount], ArrowDown: [0, amount] };
    if (!Object.hasOwn(offsets, event.key)) return;
    event.preventDefault();
    const [x, y] = offsets[event.key];
    setQr(movePosterQr(art, qr, qr.x + x, qr.y + y));
  }

  async function downloadPoster() {
    if (!art || !qr || loading || exportLock.current || saveLock.current) return;
    exportLock.current = true;
    setExporting(true);
    setStatus('');
    setError('');
    const token = loadId.current;
    const canvas = document.createElement('canvas');
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 10_000);
    try {
      const response = await fetch(`/api/staff/acquisition?code=${encodeURIComponent(placement.code)}`, {
        cache: 'no-store', signal: controller.signal,
      });
      window.clearTimeout(timeout);
      if (response.status === 401 || response.status === 403) throw new Error('Sign in to the dashboard again, then retry the export.');
      if (response.status === 404) throw new Error('This placement no longer exists.');
      if (!response.ok) throw new Error('Could not check the QR link. Try downloading again.');
      const { active: currentActive } = await response.json() as { active?: boolean };
      if (token !== loadId.current) return;
      setActive(currentActive === true);
      if (currentActive !== true) throw new Error('Resume this link in Tracking before exporting.');

      canvas.width = art.width;
      canvas.height = art.height;
      const context = canvas.getContext('2d', { alpha: false, colorSpace: 'srgb' });
      if (!context) throw new Error('This browser could not create a print image.');
      context.fillStyle = '#fff';
      context.fillRect(0, 0, art.width, art.height);
      context.drawImage(art.image, 0, 0);
      context.fillRect(qr.x, qr.y, qr.size, qr.size);
      context.fillStyle = '#000';
      const edges = posterQrEdges(qr.size, cells);
      for (const [row, line] of placement.matrix.entries()) {
        for (let col = 0; col < line.length; col++) {
          if (line[col] === '1') context.fillRect(qr.x + edges[col], qr.y + edges[row], edges[col + 1] - edges[col], edges[row + 1] - edges[row]);
        }
      }
      const png = withPngPrintDpi(await (await canvasPng(canvas)).arrayBuffer(), dpi);
      if (token !== loadId.current) return;
      const url = URL.createObjectURL(png);
      const link = document.createElement('a');
      const stem = title.replace(/[^\p{L}\p{N}_ -]/gu, '').trim().slice(0, 80);
      link.href = url;
      link.download = `${stem || 'IELTSLab-poster'}-${placement.code}-${dpi}dpi.png`;
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
      setStatus('Poster downloaded.');
    } catch (reason) {
      setError(controller.signal.aborted ? 'The QR link check timed out. Try downloading again.'
        : reason instanceof Error ? reason.message : 'Unable to export the poster.');
    } finally {
      window.clearTimeout(timeout);
      canvas.width = canvas.height = 0;
      exportLock.current = false;
      setExporting(false);
    }
  }

  const dragHandlers = { onPointerMove: moveDrag, onPointerUp: endDrag, onPointerCancel: endDrag, onLostPointerCapture: endDrag };
  const busy = loading || exporting || saving;

  return (
    <div className="space-y-4">
      <Link href={listUrl} className="inline-flex min-h-11 items-center text-sm font-semibold text-[#8e1826]">← Poster library</Link>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="text-3xl font-extrabold tracking-tight">{version ? 'Edit poster' : 'New poster'}</h1><p className="mt-1 break-words text-sm text-gray-600">{placement.label}</p></div>
        <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="min-h-11 rounded-full border border-stone-200 bg-white px-4 text-sm font-bold disabled:opacity-50"
          disabled={!art || !qr || busy} onClick={() => void downloadPoster()}>
          {exporting ? 'Preparing…' : 'Download PNG'}
        </button>
        <button type="button" className="min-h-11 rounded-full bg-charcoal px-5 text-sm font-bold text-white disabled:opacity-50"
          disabled={!art || !qr || !title.trim() || busy} onClick={() => void savePoster()}>{saving ? 'Saving…' : 'Save poster'}</button>
        </div>
      </header>
      {!active && <p className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">This QR link is paused. Resume it in Tracking before printing.</p>}
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-900">{error}</p>}
      <p role="status" className="text-sm text-gray-700">{loading ? 'Opening poster…' : status}</p>

      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
        <section aria-label="Poster preview" className={`min-w-0 rounded-2xl border p-3 sm:p-4 ${dragOver ? 'border-crimson bg-red-50' : 'border-gray-200 bg-[#f4f2ef]'}`}
          onDragOver={(event) => { event.preventDefault(); if (!exporting) setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragOver(false);
            if (event.dataTransfer.files.length !== 1) { setError('Choose one poster at a time.'); return; }
            void loadPoster(event.dataTransfer.files[0]);
          }}>
          <label className="relative inline-flex min-h-11 cursor-pointer items-center rounded-full border border-gray-300 bg-white px-4 text-sm font-bold focus-within:outline-2 focus-within:outline-crimson">
            {art ? 'Replace poster' : 'Choose a poster'}
            <input aria-label="Poster artwork" type="file" accept="image/png,image/jpeg,.png,.jpg,.jpeg" disabled={exporting || saving} className="sr-only"
              onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; void loadPoster(file); }} />
          </label>
          {art && qr ? (
            <div ref={preview} className="relative mx-auto mt-3 w-full overflow-hidden bg-white shadow-lg"
              style={{ maxWidth: `min(100%, ${65 * art.width / art.height}vh)` }} onClick={(event) => {
              if (event.target !== event.currentTarget && (event.target as HTMLElement).dataset.poster !== 'true') return;
              if (busy) return;
              const rect = event.currentTarget.getBoundingClientRect();
              setQr(movePosterQr(art, qr, (event.clientX - rect.left) * art.width / rect.width - qr.size / 2,
                (event.clientY - rect.top) * art.height / rect.height - qr.size / 2));
            }}>
              {/* Local object URLs retain the original browser-decoded dimensions. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={art.url} alt="Uploaded poster" data-poster="true" draggable={false} width={art.width} height={art.height}
                className="block h-auto w-full cursor-crosshair select-none" />
              <div className="absolute aspect-square bg-white ring-1 ring-crimson" style={{
                left: `${qr.x / art.width * 100}%`, top: `${qr.y / art.height * 100}%`, width: `${qr.size / art.width * 100}%`,
              }}>
                <button type="button" aria-label="Move QR code" onKeyDown={nudge} onPointerDown={(event) => startDrag(event, false)} {...dragHandlers}
                  className="block h-full w-full touch-none cursor-move select-none focus-visible:outline-2 focus-visible:outline-crimson">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={placement.preview} alt="" draggable={false} className="pointer-events-none h-full w-full object-contain" />
                </button>
                <button type="button" aria-label="Resize QR code" onPointerDown={(event) => startDrag(event, true)} {...dragHandlers}
                  onKeyDown={(event) => {
                    if (busy || !['ArrowLeft', 'ArrowDown', 'ArrowRight', 'ArrowUp'].includes(event.key)) return;
                    event.preventDefault();
                    const step = event.shiftKey ? 10 : 1;
                    setQr(resizePosterQr(art, qr, cells, qr.size + (event.key === 'ArrowLeft' || event.key === 'ArrowDown' ? -step : step)));
                  }}
                  className="absolute -bottom-3 -right-3 grid size-11 touch-none cursor-nwse-resize place-items-end p-1 focus-visible:outline-2 focus-visible:outline-crimson">
                  <span aria-hidden="true" className="grid size-6 place-items-center rounded-md border-2 border-white bg-crimson text-sm font-bold text-white">↘</span>
                </button>
              </div>
            </div>
          ) : <p className="mt-4 grid min-h-52 place-items-center rounded-xl border border-dashed border-gray-300 px-3 text-center text-sm text-gray-600">Drop a PNG or JPEG here, up to 4 MiB.</p>}
        </section>

        {art && qr && (
          <aside className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4">
            <label className="grid gap-1 text-sm font-semibold">Poster name<input value={title} onChange={(event) => setTitle(event.target.value)}
              maxLength={100} disabled={busy} className={inputClass} /></label>
            <h2 className="font-bold">QR position</h2>
            <div className="grid grid-cols-2 gap-2">
              <PixelField label="Left (px)" value={qr.x} min={0} max={art.width - qr.size} onCommit={(x) => setQr(movePosterQr(art, qr, x, qr.y))} />
              <PixelField label="Top (px)" value={qr.y} min={0} max={art.height - qr.size} onCommit={(y) => setQr(movePosterQr(art, qr, qr.x, y))} />
            </div>
            <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-end gap-2">
              <PixelField label="QR width (px)" value={qr.size} {...qrSizeLimits(art, cells, qr.x, qr.y)} onCommit={(size) => setQr(resizePosterQr(art, qr, cells, size))} />
              <button type="button" aria-label="Decrease QR width by 1 pixel" disabled={busy} className="size-11 rounded-full border border-stone-200 text-xl" onClick={() => setQr(resizePosterQr(art, qr, cells, qr.size - 1))}>−</button>
              <button type="button" aria-label="Increase QR width by 1 pixel" disabled={busy} className="size-11 rounded-full border border-stone-200 text-xl" onClick={() => setQr(resizePosterQr(art, qr, cells, qr.size + 1))}>+</button>
            </div>
            <PixelField label="Print DPI" value={dpi} min={72} max={1200} onCommit={(value) => {
              if (validDpi(value)) { setDpi(value); setError(''); }
              else setError('Enter a print resolution between 72 and 1200 DPI.');
            }} />
            <div className="border-t border-gray-200 pt-3 text-sm text-gray-600">
              <p>{art.width} × {art.height} pixels</p>
              <p>{(art.width * 25.4 / dpi).toFixed(1)} × {(art.height * 25.4 / dpi).toFixed(1)} mm</p>
              <p className="mt-1">QR with margin · {(qr.size * 25.4 / dpi).toFixed(1)} mm</p>
              <p className="mt-2 text-xs">One pixel per step. Four-module scan border.</p>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
