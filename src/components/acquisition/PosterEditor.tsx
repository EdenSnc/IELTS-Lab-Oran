'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import ConfirmAction, { type Confirmation } from '@/components/admin/ConfirmAction';
import PosterDestination from './PosterDestination';
import { checkPrintableLocation, createPosterPdf, downloadPosterFile, posterFileStem, renderPrintPoster, samplePosterArtwork, zipPosterFiles, type PosterExportFormat } from '@/lib/acquisition/poster-export';
import {
  checkPosterDimensions, initialPosterQr, inspectPoster, isEvenLightQrArea, isLightQrColor, movePosterQr, posterQrBacking,
  posterPrintLayout, PRINT_PAPERS, PRINT_QR_WIDTHS, printQrMeasurements, printQrSourceWidth, qrSizeLimits, QUIET_MODULES, resizePosterQr, validDpi, type PosterPlacement, type PrintPaper,
} from '@/lib/acquisition/poster-artwork';
import { MAX_SAVED_ARTWORK_BYTES } from '@/lib/acquisition/poster-design';

type Artwork = { image: HTMLImageElement; url: string; file?: File; width: number; height: number };
type Drag = { pointer: number; x: number; y: number; resize: boolean; start: PosterPlacement };
type Placement = { id?: string; destination?: string; code: string; label: string; active: boolean; preview: string; matrix: string[] };
type Design = PosterPlacement & { id: string; title: string; dpi: number; version: number; qrBackground: string; roundQr: boolean };
const inputClass = 'min-h-11 w-full min-w-0 rounded-lg border border-gray-300 bg-white px-3 text-base';
const saveErrors: Record<string, string> = {
  INVALID_POSTER_ARTWORK: 'The artwork could not be read. Re-upload a valid PNG or JPEG.',
  INVALID_POSTER_UPLOAD: 'The upload could not be read. Re-upload the artwork and try again.',
  INVALID_QR_PLACEMENT: 'Move or resize the QR so it fits inside the artwork, then save again.',
  INVALID_REQUEST: 'Check the poster name, QR settings and print resolution, then try again.',
  PLACEMENT_NOT_FOUND: 'This tracking location is missing. Open the library and choose a location.',
  POSTER_NOT_FOUND: 'This poster is missing or in Trash. Check the library before saving.',
};

function posterSettings(title: string, dpi: number, qr: PosterPlacement, qrBackground: string, roundQr: boolean) {
  return { title: title.trim(), dpi, x: qr.x, y: qr.y, size: qr.size, qrBackground, roundQr };
}

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

export default function PosterEditor({ placement, locale, design }: { placement: Placement; locale: string; design: Design | null }) {
  const router = useRouter();
  const [art, setArt] = useState<Artwork>();
  const [qr, setQr] = useState<PosterPlacement>();
  const [dpi, setDpi] = useState(design?.dpi ?? 300);
  const [paper, setPaper] = useState<PrintPaper>('A5');
  const [format, setFormat] = useState<PosterExportFormat>('png');
  const [title, setTitle] = useState(design?.title ?? placement.label);
  const [version, setVersion] = useState(design?.version);
  const [qrBackground, setQrBackground] = useState(design?.qrBackground ?? '#ffffff');
  const [backingColor, setBackingColor] = useState(design?.qrBackground === 'artwork' ? '#ffffff' : design?.qrBackground ?? '#ffffff');
  const [roundQr, setRoundQr] = useState(design?.roundQr ?? true);
  const [picking, setPicking] = useState(false);
  const [areaSafe, setAreaSafe] = useState<boolean>();
  const [confirmation, setConfirmation] = useState<Confirmation>();
  const [saved, setSaved] = useState(() => design
    ? JSON.stringify(posterSettings(design.title, design.dpi, design, design.qrBackground, design.roundQr)) : '');
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
  const settings = qr && posterSettings(title, dpi, qr, qrBackground, roundQr);
  const dirty = Boolean(art && settings && (art.file || JSON.stringify(settings) !== saved));
  const transparent = qrBackground === 'artwork';
  const backing = qr ? posterQrBacking(qr.size, cells, roundQr && !transparent) : undefined;
  const print = art && posterPrintLayout(art, paper, dpi);
  const measures = qr && print && printQrMeasurements(Math.floor(qr.size * print.scale), cells, roundQr && !transparent, print.dpi);

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

  useEffect(() => {
    if (!art || !qr || !transparent) return;
    const frame = requestAnimationFrame(() => {
      try { setAreaSafe(isEvenLightQrArea(samplePosterArtwork(art, qr.x, qr.y, qr.size))); }
      catch { setAreaSafe(false); }
    });
    return () => cancelAnimationFrame(frame);
  }, [art, qr, transparent]);

  useEffect(() => {
    if (!picking) return;
    function escape(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape') { setPicking(false); setStatus('Color picking cancelled.'); }
    }
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, [picking]);

  function exit() {
    const perform = () => router.push(listUrl);
    if (!dirty) { perform(); return; }
    setConfirmation({
      title: 'Discard unsaved changes?', detail: 'Your last saved poster will stay in the library.',
      confirmLabel: 'Discard changes', perform,
    });
  }

  function selectColor(color: string) {
    if (!isLightQrColor(color)) {
      setError('Choose a lighter color for the black QR code.');
      return;
    }
    setQrBackground(color);
    setBackingColor(color);
    setError('');
    setStatus('QR color updated.');
  }

  async function savePoster() {
    if (!art || !settings || !title.trim() || loading || exportLock.current || saveLock.current) return;
    saveLock.current = true;
    setSaving(true);
    setError('');
    setStatus('');
    try {
      const id = draftId.current ??= crypto.randomUUID();
      const form = new FormData();
      form.set('code', placement.code);
      form.set('details', JSON.stringify({ id, version, ...settings }));
      if (art.file) form.set('artwork', art.file);
      const response = await fetch('/api/staff/posters', { method: 'POST', body: form });
      if (!response.ok) {
        const problem = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(response.status === 409 ? 'This poster changed elsewhere. Open the latest version before saving.'
          : response.status === 401 || response.status === 403 ? 'Sign in again to save the poster.'
          : response.status === 413 ? 'Choose a PNG or JPEG up to 4 MiB.'
          : saveErrors[problem?.error ?? ''] ?? 'Saving failed. Your edits are still here. Try again.');
      }
      const result = await response.json() as { id: string; version: number };
      setVersion(result.version);
      setTitle(title.trim());
      setSaved(JSON.stringify(settings));
      const savedArtwork = { ...art, file: undefined };
      artRef.current = savedArtwork;
      setArt(savedArtwork);
      const url = new URL(location.href);
      url.searchParams.set('design', result.id);
      history.replaceState(null, '', url);
      setStatus('Poster saved.');
    } catch (reason) {
      setError(reason instanceof TypeError ? 'Could not reach the site. Your edits are still here. Try saving again.'
        : reason instanceof Error ? reason.message : 'Could not save this poster.');
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
    if (!art || !qr || !print || loading || exportLock.current || saveLock.current) return;
    exportLock.current = true;
    setExporting(true);
    setStatus('');
    setError('');
    const token = loadId.current;
    try {
      const currentActive = await checkPrintableLocation(placement.code);
      if (token !== loadId.current) return;
      setActive(currentActive);
      if (!currentActive) throw new Error('Resume this link in Tracking before exporting.');
      const page = await renderPrintPoster(art, { ...qr, qrBackground, roundQr, dpi }, paper, placement.matrix);
      const name = `${posterFileStem(title)}-${placement.code}-${paper}-${print.dpi}dpi`;
      let result = page.png;
      if (format !== 'png') {
        const pdf = await createPosterPdf();
        await pdf.add(page);
        result = await pdf.finish();
        if (format === 'both') result = await zipPosterFiles({
          [`${name}.pdf`]: new Uint8Array(await result.arrayBuffer()),
          [`${name}.png`]: new Uint8Array(await page.png.arrayBuffer()),
        });
      }
      if (token !== loadId.current) return;
      downloadPosterFile(result, `${name}.${format === 'both' ? 'zip' : format}`);
      setStatus(page.usedSafeBacking ? 'Poster downloaded with a rounded white QR backing for scanning.' : 'Poster downloaded.');
    } catch (reason) {
      setError(reason instanceof Error && reason.name === 'TimeoutError' ? 'The export request timed out. Try again.'
        : reason instanceof Error ? reason.message : 'Unable to export the poster.');
    } finally {
      exportLock.current = false;
      setExporting(false);
    }
  }

  const dragHandlers = { onPointerMove: moveDrag, onPointerUp: endDrag, onPointerCancel: endDrag, onLostPointerCapture: endDrag };
  const busy = loading || exporting || saving;

  return (
    <div className="space-y-4">
      <Link href={listUrl} onClick={(event) => {
        if (dirty && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) { event.preventDefault(); exit(); }
      }} className="inline-flex min-h-11 items-center text-sm font-semibold text-[#8e1826]">← Poster library</Link>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="text-3xl font-extrabold tracking-tight">{version ? 'Edit poster' : 'New poster'}</h1><p className="mt-1 break-words text-sm text-gray-600">{placement.label}</p></div>
        <div className="flex flex-wrap items-center gap-2">
        <button type="button" disabled={busy} onClick={exit} className="min-h-11 rounded-full px-4 text-sm font-semibold text-stone-600 hover:bg-stone-100">Cancel</button>
        <select aria-label="Download format" value={format} disabled={busy}
          onChange={(event) => setFormat(event.target.value as PosterExportFormat)}
          className="min-h-11 rounded-full border border-stone-200 bg-white px-3 text-sm font-semibold">
          <option value="png">PNG · sRGB</option>
          <option value="pdf">Print PDF · sRGB</option>
          <option value="both">Both · ZIP</option>
        </select>
        <button type="button" className="min-h-11 rounded-full border border-stone-200 bg-white px-4 text-sm font-bold disabled:opacity-50"
          disabled={!art || !qr || busy} onClick={() => void downloadPoster()}>
          {exporting ? 'Preparing…' : format === 'pdf' ? 'Download print PDF' : format === 'both' ? 'Download both' : 'Download PNG'}
        </button>
        <button type="button" className="min-h-11 rounded-full bg-charcoal px-5 text-sm font-bold text-white disabled:opacity-50"
          disabled={!art || !qr || !title.trim() || busy} onClick={() => void savePoster()}>{saving ? 'Saving…' : 'Save poster'}</button>
        </div>
      </header>
      {placement.id && placement.destination && <PosterDestination placementId={placement.id} destination={placement.destination} />}
      {!active && <p className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">This QR link is paused. Resume it in Tracking before printing.</p>}
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-900">{error}</p>}
      <p role="status" className={`empty:hidden rounded-xl border px-3 py-2.5 text-sm font-medium ${
        status === 'Poster saved.' && !dirty ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-stone-200 bg-white text-stone-700'
      }`}>{loading ? 'Opening poster…' : saving ? 'Saving your poster…' : exporting ? 'Preparing your download…'
        : status === 'Poster saved.' && dirty ? 'Unsaved changes.' : status}</p>

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
          {art && qr && backing ? (
            <div ref={preview} className="relative mx-auto mt-3 w-full overflow-hidden bg-white shadow-lg"
              style={{ maxWidth: `min(100%, ${65 * art.width / art.height}vh)` }} onClick={(event) => {
              if (event.target !== event.currentTarget && (event.target as HTMLElement).dataset.poster !== 'true') return;
              if (busy) return;
              const rect = event.currentTarget.getBoundingClientRect();
              if (picking) {
                const x = Math.min(art.width - 1, Math.max(0, Math.floor((event.clientX - rect.left) * art.width / rect.width)));
                const y = Math.min(art.height - 1, Math.max(0, Math.floor((event.clientY - rect.top) * art.height / rect.height)));
                setPicking(false);
                try {
                  const rgb = samplePosterArtwork(art, x, y, 1);
                  const color = '#' + Array.from(rgb.slice(0, 3), (channel) => channel.toString(16).padStart(2, '0')).join('');
                  selectColor(color);
                  if (isLightQrColor(color)) navigator.vibrate?.(10);
                } catch { setError('Could not read this color. Choose a light color manually.'); }
                return;
              }
              setQr(movePosterQr(art, qr, (event.clientX - rect.left) * art.width / rect.width - qr.size / 2,
                (event.clientY - rect.top) * art.height / rect.height - qr.size / 2));
            }}>
              {/* Local object URLs retain the original browser-decoded dimensions. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={art.url} alt="Uploaded poster" data-poster="true" draggable={false} width={art.width} height={art.height}
                className="block h-auto w-full cursor-crosshair select-none" />
              <div className={`absolute aspect-square ring-1 ring-crimson ${picking ? 'pointer-events-none' : ''}`} style={{
                left: `${qr.x / art.width * 100}%`, top: `${qr.y / art.height * 100}%`, width: `${qr.size / art.width * 100}%`,
                backgroundColor: transparent ? undefined : qrBackground, borderRadius: `${backing.radius / qr.size * 100}%`,
              }}>
                <button type="button" aria-label="Move QR code" onKeyDown={nudge} onPointerDown={(event) => startDrag(event, false)} {...dragHandlers}
                  className="block h-full w-full touch-none cursor-move select-none focus-visible:outline-2 focus-visible:outline-crimson">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={placement.preview} alt="" draggable={false} className="pointer-events-none absolute aspect-square" style={{
                    left: `${backing.inset / qr.size * 100}%`, top: `${backing.inset / qr.size * 100}%`, width: `${backing.codeSize / qr.size * 100}%`,
                  }} />
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

        {art && qr && print && (
          <aside className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4">
            <label className="grid gap-1 text-sm font-semibold">Poster name<input value={title} onChange={(event) => setTitle(event.target.value)}
              maxLength={100} disabled={busy} className={inputClass} /></label>
            <label className="grid gap-1 text-sm font-semibold">Print size
              <select className={inputClass} value={paper} disabled={busy} onChange={(event) => setPaper(event.target.value as PrintPaper)}>
                {Object.entries(PRINT_PAPERS).map(([name, [width, height]]) => <option key={name} value={name}>{name} · {width} × {height} mm</option>)}
                <option value="original">Original artwork dimensions</option>
              </select>
            </label>
            <h2 className="font-bold">QR position</h2>
            {paper !== 'original' && <fieldset className="min-w-0">
              <legend className="mb-1.5 text-sm font-semibold">Printed QR width · includes border</legend>
              <div className="grid grid-cols-3 gap-1.5">
                {PRINT_QR_WIDTHS[paper].map((mm, index) => {
                  const size = printQrSourceWidth(mm, print.scale, print.dpi);
                  const label = ['Compact', 'Standard', 'Larger'][index];
                  return <button key={mm} type="button" aria-label={`${label}, ${mm} mm`}
                    aria-pressed={qr.size === size}
                    disabled={busy || size < 4 * cells || size > Math.min(art.width, art.height)}
                    className="grid min-h-11 place-content-center rounded-xl border border-stone-200 px-1 py-1 text-xs aria-pressed:border-crimson aria-pressed:bg-red-50 disabled:opacity-50"
                    onClick={() => {
                      setQr(movePosterQr(art, { ...qr, size }, qr.x + (qr.size - size) / 2, qr.y + (qr.size - size) / 2));
                      setStatus(`QR set to ${mm} mm including the scan border.`);
                    }}><span>{label}</span><strong>{mm} mm</strong></button>;
                })}
              </div>
            </fieldset>}
            <div className="grid grid-cols-2 gap-2">
              <PixelField label="Left (px)" value={qr.x} min={0} max={art.width - qr.size} onCommit={(x) => setQr(movePosterQr(art, qr, x, qr.y))} />
              <PixelField label="Top (px)" value={qr.y} min={0} max={art.height - qr.size} onCommit={(y) => setQr(movePosterQr(art, qr, qr.x, y))} />
            </div>
            <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-end gap-2">
              <PixelField label="QR width (px)" value={qr.size} {...qrSizeLimits(art, cells, qr.x, qr.y)} onCommit={(size) => setQr(resizePosterQr(art, qr, cells, size))} />
              <button type="button" aria-label="Decrease QR width by 1 pixel" disabled={busy} className="size-11 rounded-full border border-stone-200 text-xl" onClick={() => setQr(resizePosterQr(art, qr, cells, qr.size - 1))}>−</button>
              <button type="button" aria-label="Increase QR width by 1 pixel" disabled={busy} className="size-11 rounded-full border border-stone-200 text-xl" onClick={() => setQr(resizePosterQr(art, qr, cells, qr.size + 1))}>+</button>
            </div>
            <fieldset className="min-w-0 space-y-2 rounded-2xl border border-stone-200 p-3">
              <legend className="px-1 text-sm font-semibold">QR background</legend>
              <select aria-label="QR background" value={transparent ? 'artwork' : 'color'} disabled={busy} className={inputClass} onChange={(event) => {
                setQrBackground(event.target.value === 'artwork' ? 'artwork' : backingColor);
                setPicking(false);
                setError('');
                setStatus('QR background updated.');
              }}>
                <option value="color">Solid color</option>
                <option value="artwork">Use poster artwork</option>
              </select>
              {transparent ? <p role="status" className={`text-xs ${areaSafe === false ? 'text-[#9c1e2c]' : 'text-stone-700'}`}>
                {areaSafe === false ? 'Export will add a rounded white backing here. Move onto a light, even area to export directly over the artwork.' : areaSafe ? 'Light, even backing found.' : 'Checking the artwork…'}
              </p> : <>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="inline-flex items-center gap-2 text-sm">Color
                    <input type="color" value={qrBackground} disabled={busy} onChange={(event) => selectColor(event.target.value)}
                      className="size-11 rounded-lg border border-stone-200 bg-white p-1" />
                  </label>
                  <button type="button" disabled={busy} aria-pressed={picking} className="min-h-11 rounded-full border border-stone-200 px-3 text-sm font-semibold"
                    onClick={() => { setPicking(!picking); setError(''); setStatus(picking ? 'Color picking cancelled.' : 'Tap the poster to sample a color.'); }}>
                    {picking ? 'Cancel picking' : 'Pick from poster'}
                  </button>
                </div>
                <label className="flex min-h-11 items-center gap-2 text-sm font-medium">
                  <input type="checkbox" disabled={busy} checked={roundQr} onChange={(event) => setRoundQr(event.target.checked)}
                    className="size-5 accent-crimson" />
                  Round backing corners
                </label>
              </>}
            </fieldset>
            {paper === 'original' && <PixelField label="Print DPI" value={dpi} min={72} max={1200} onCommit={(value) => {
              if (validDpi(value)) { setDpi(value); setError(''); }
              else setError('Enter a print resolution between 72 and 1200 DPI.');
            }} />}
            <div className="border-t border-gray-200 pt-3 text-sm text-gray-600">
              <p>{print.width} × {print.height} pixels · {print.dpi} dpi</p>
              {measures ? <>
                <p className="mt-1">QR with border · {measures.totalMm.toFixed(1)} mm</p>
                <p>Scan border · {measures.quietMm.toFixed(1)} mm per side</p>
                <p className="mt-2 text-xs">Test a printed proof from about {Math.round(measures.symbolMm)} cm (10:1 guideline).</p>
              </> : <p className="mt-1 text-xs text-[#9c1e2c]">Increase the QR width for this paper size.</p>}
            </div>
          </aside>
        )}
      </div>
      <ConfirmAction action={confirmation} onDismiss={() => setConfirmation(undefined)} />
    </div>
  );
}
