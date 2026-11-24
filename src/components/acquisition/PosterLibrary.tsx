'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import ConfirmAction, { type Confirmation } from '@/components/admin/ConfirmAction';
import { posterQrBacking, PRINT_PAPERS, type PrintPaper } from '@/lib/acquisition/poster-artwork';
import { checkPrintableLocation, createPosterPdf, downloadPosterFile, posterFileStem, renderSavedPoster, zipPosterFiles, type PosterExportFormat } from '@/lib/acquisition/poster-export';

type Design = { id: string; title: string; version: number; width: number; height: number; x: number; y: number; size: number;
  dpi: number; code: string; placement: string; thumbnail?: string; qrPreview: string;
  qrBackground: string; roundQr: boolean; cells: number; trackingUrl: string };
type Location = { code: string; label: string; campaign: string };
type Action = 'trash' | 'restore' | 'purge';
const button = 'inline-flex min-h-11 items-center justify-center rounded-full px-4 text-sm font-semibold transition-colors disabled:opacity-50 motion-reduce:transition-none';
const solid = button + ' bg-charcoal text-white hover:bg-[#8e1826]';
const line = button + ' border border-stone-200 bg-white hover:border-crimson';

export default function PosterLibrary({ base, trash, designs, locations }: {
  base: string; trash: boolean; designs: Design[]; locations: Location[];
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [code, setCode] = useState('');
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');
  const [problems, setProblems] = useState<string[]>([]);
  const [safeBackings, setSafeBackings] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [undo, setUndo] = useState<{ id: string; version: number }>();
  const [confirmation, setConfirmation] = useState<Confirmation>();
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [paper, setPaper] = useState<PrintPaper>('A5');
  const [format, setFormat] = useState<PosterExportFormat>('pdf');
  const [exporting, setExporting] = useState(false);
  const lock = useRef(false);
  const exportTask = useRef<AbortController>(null);
  const query = search.trim().toLowerCase();
  const visible = designs.filter((design) => `${design.title} ${design.placement}`.toLowerCase().includes(query));
  const selectedDesigns = designs.filter(({ id }) => selected.includes(id));

  useEffect(() => () => exportTask.current?.abort(), []);

  async function downloadSelected() {
    if (lock.current || !selectedDesigns.length) return;
    lock.current = true;
    const controller = new AbortController();
    exportTask.current = controller;
    const { signal } = controller;
    setExporting(true);
    setMessage('Preparing posters…');
    setProblems([]);
    setSafeBackings([]);
    try {
      const pdf = format !== 'png' ? await createPosterPdf() : undefined;
      const checks = new Map<string, boolean>();
      const files: Record<string, Uint8Array> = {};
      const skipped: string[] = [];
      const backed: string[] = [];
      let count = 0;
      for (const [index, design] of selectedDesigns.entries()) {
        signal.throwIfAborted();
        setMessage(`Preparing poster ${index + 1} of ${selectedDesigns.length}…`);
        try {
          const active = checks.get(design.code) ?? await checkPrintableLocation(design.code, signal);
          checks.set(design.code, active);
          if (!active) throw new Error('Resume its QR link in Tracking before printing.');
          const rendered = await renderSavedPoster(design, paper, signal);
          const png = format !== 'pdf' ? new Uint8Array(await rendered.png.arrayBuffer()) : undefined;
          if (pdf) await pdf.add(rendered);
          if (png) {
            const name = `${String(count + 1).padStart(2, '0')}-${posterFileStem(design.title)}-${design.code}-${paper}.png`;
            files[name] = png;
          }
          if (rendered.usedSafeBacking) backed.push(design.title);
          count++;
        } catch (reason) {
          signal.throwIfAborted();
          skipped.push(`${design.title}: ${reason instanceof Error ? reason.message : 'Could not export.'}`);
        }
      }
      if (!count) {
        setMessage('No posters could be downloaded.');
        setProblems(skipped);
        return;
      }
      const name = `IELTSLab-posters-${paper}`;
      const document = await pdf?.finish();
      if (document && format === 'both') files[`${name}.pdf`] = new Uint8Array(await document.arrayBuffer());
      const result = format === 'pdf' && document ? document : await zipPosterFiles(files);
      signal.throwIfAborted();
      downloadPosterFile(result, `${name}.${format === 'pdf' ? 'pdf' : 'zip'}`);
      setMessage(`Downloaded ${count} of ${selectedDesigns.length} ${selectedDesigns.length === 1 ? 'poster' : 'posters'}.`);
      setProblems(skipped);
      setSafeBackings(backed);
    } catch (reason) {
      if (signal.aborted) setMessage('Poster download cancelled.');
      else {
        setMessage('Download failed.');
        setProblems([reason instanceof Error ? reason.message : 'Could not export the selected posters.']);
      }
    } finally {
      exportTask.current = null;
      setExporting(false);
      lock.current = false;
    }
  }

  async function change(design: { id: string; version: number }, action: Action) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setMessage('');
    setProblems([]);
    setSafeBackings([]);
    try {
      const response = await fetch('/api/staff/posters', {
        method: action === 'purge' ? 'DELETE' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: design.id, version: design.version, action }),
      });
      if (!response.ok) throw new Error(response.status === 409
        ? 'This poster changed elsewhere. The list has been refreshed.'
        : response.status === 401 || response.status === 403 ? 'Sign in again to manage posters.' : 'The poster could not be changed. Try again.');
      const result = await response.json() as { version: number };
      setUndo(action === 'trash' ? { id: design.id, version: result.version } : undefined);
      setMessage(action === 'trash' ? 'Poster moved to Trash.' : action === 'restore' ? 'Poster restored.' : 'Poster permanently deleted.');
      router.refresh();
    } catch (problem) {
      setProblems([problem instanceof Error ? problem.message : 'Could not update poster.']);
      router.refresh();
    } finally {
      setBusy(false);
      lock.current = false;
    }
  }

  return (
    <section className="space-y-5" aria-label={trash ? 'Trashed poster designs' : 'Poster designs'}>
      {!trash && (
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
          <input type="search" aria-label="Find a poster" value={search} onChange={(event) => setSearch(event.target.value)}
            placeholder="Find a poster or location" className="min-h-11 min-w-0 rounded-xl border border-stone-200 bg-white px-4 text-base sm:max-w-sm" />
          <button className={line} type="button" aria-expanded={selecting} disabled={exporting} onClick={() => {
            setSelecting(!selecting);
            setSelected([]);
          }}>{selecting ? 'Done selecting' : 'Select posters'}</button>
          <button className={solid} type="button" aria-expanded={creating} aria-controls="new-poster" onClick={() => setCreating(!creating)}>
            <span aria-hidden="true" className="me-2 text-lg leading-none">+</span> New poster
          </button>
        </div>
      )}
      {!trash && selecting && (
        <div className="flex flex-wrap items-end gap-2 rounded-2xl border border-stone-200 bg-white p-3" aria-label="Batch download">
          <div className="flex w-full flex-wrap items-center gap-2">
            <strong className="px-1 text-sm">{selectedDesigns.length} selected</strong>
            <button type="button" className={line} disabled={exporting || !visible.length}
              onClick={() => setSelected((current) => [...new Set([...current, ...visible.map(({ id }) => id)])])}>Select all shown</button>
            <button type="button" className={line} disabled={exporting || !selectedDesigns.length} onClick={() => setSelected([])}>Clear</button>
          </div>
          <label className="grid gap-1 text-sm font-semibold">Print size
            <select value={paper} onChange={(event) => setPaper(event.target.value as PrintPaper)} disabled={exporting}
              className="h-11 max-w-full rounded-xl border border-stone-200 bg-white px-2 text-sm">
              {Object.keys(PRINT_PAPERS).map((name) => <option key={name}>{name}</option>)}
              <option value="original">Original sizes</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm font-semibold">Format
            <select value={format} onChange={(event) => setFormat(event.target.value as PosterExportFormat)} disabled={exporting}
              className="h-11 max-w-full rounded-xl border border-stone-200 bg-white px-2 text-sm">
              <option value="pdf">Print PDF · sRGB</option>
              <option value="png">PNG files · ZIP</option>
              <option value="both">PDF + PNG files · ZIP</option>
            </select>
          </label>
          <button className={solid} type="button" onClick={() => void downloadSelected()} disabled={busy || exporting || !selectedDesigns.length}>Download selected</button>
          {exporting && <button className={line} type="button" onClick={() => exportTask.current?.abort()}>Cancel download</button>}
        </div>
      )}
      {!trash && creating && (
        <form id="new-poster" className="flex flex-wrap items-end gap-3 rounded-2xl border border-stone-200 bg-white p-4" onSubmit={(event) => {
          event.preventDefault();
          if (code) router.push(`${base}/poster/${encodeURIComponent(code)}`);
        }}>
          {locations.length ? <>
            <label className="grid min-w-0 flex-1 gap-1.5 text-sm font-semibold sm:max-w-sm">Tracking location
              <select required value={code} onChange={(event) => setCode(event.target.value)} className="min-h-11 min-w-0 w-full rounded-xl border border-stone-200 bg-white px-3 text-base">
                <option value="">Select a location</option>
                {locations.map((location) => <option key={location.code} value={location.code}>{location.label} · {location.campaign}</option>)}
              </select>
            </label>
            <button className={solid} disabled={!code}>Open editor</button>
          </> : <Link className={line} href={`${base}?view=tracking`}>Add a tracking location</Link>}
        </form>
      )}
      <div className="flex flex-wrap items-center gap-3 empty:hidden" role="status">
        {message && <p className="text-sm font-semibold text-charcoal">{message}</p>}
        {undo && <button type="button" disabled={busy} className={line} onClick={() => void change(undo, 'restore')}>Undo</button>}
      </div>
      {safeBackings.length > 0 && <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
        Rounded white QR backing added to the export for {safeBackings.join(', ')}.
      </p>}
      {problems.length > 0 && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-900">
        <ul className="space-y-1">{problems.map((problem, index) => <li key={index}>{problem}</li>)}</ul>
      </div>}
      {!visible.length && <p className="rounded-2xl border border-dashed border-stone-300 p-8 text-center text-sm text-stone-600">
        {query ? 'No posters match your search.' : trash ? 'Trash is empty.' : 'Your saved posters will appear here.'}
      </p>}
      <div className="grid gap-4 min-[540px]:grid-cols-2 xl:grid-cols-3">
        {visible.map((design) => {
          const href = `${base}/poster/${encodeURIComponent(design.code)}?design=${design.id}`;
          const solidQr = design.qrBackground !== 'artwork';
          const qr = posterQrBacking(design.size, design.cells, solidQr && design.roundQr);
          const poster = (
            <div className="grid h-48 place-items-center overflow-hidden rounded-[1.15rem] bg-[#f3f0ed] p-4">
              <div className="relative max-w-full overflow-hidden rounded-sm shadow-md" style={{
                width: `${10 * design.width / design.height}rem`, aspectRatio: `${design.width}/${design.height}`,
              }}>
                {/* Private previews are either included in the owner page or loaded with their session. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img loading={design.thumbnail ? 'eager' : 'lazy'} alt="" src={design.thumbnail ?? `/api/staff/posters?id=${design.id}&thumbnail=1&v=${design.version}`}
                  className="block size-full object-fill" />
                <div className="absolute aspect-square" style={{
                  left: `${design.x / design.width * 100}%`, top: `${design.y / design.height * 100}%`, width: `${design.size / design.width * 100}%`,
                  backgroundColor: solidQr ? design.qrBackground : undefined, borderRadius: `${qr.radius / design.size * 100}%`,
                }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img alt="" src={design.qrPreview} className="absolute aspect-square" style={{
                    left: `${qr.inset / design.size * 100}%`, top: `${qr.inset / design.size * 100}%`, width: `${qr.codeSize / design.size * 100}%`,
                  }} />
                </div>
              </div>
            </div>
          );
          return <article key={design.id} className="min-w-0 rounded-[1.4rem] border border-stone-200 bg-white p-2 shadow-[0_2px_12px_#1f151008]">
            {selecting && !trash ? (
              <label className="relative block cursor-pointer rounded-[1.15rem]">
                <input type="checkbox" aria-label={`Select ${design.title}`} checked={selected.includes(design.id)} disabled={exporting}
                  onChange={(event) => {
                    const checked = event.target.checked;
                    setSelected((current) => checked ? [...current, design.id] : current.filter((id) => id !== design.id));
                  }} className="absolute left-3 top-3 z-10 size-6 accent-crimson" />
                {poster}
              </label>
            ) : trash ? poster : <Link href={href} aria-label={`Open ${design.title}`} className="block rounded-[1.15rem] focus-visible:outline-2 focus-visible:outline-crimson">{poster}</Link>}
            <div className="space-y-3 px-3 pb-3 pt-4">
              <div><h2 className="break-words text-base font-bold">{design.title}</h2><p className="mt-0.5 break-words text-sm text-stone-600">{design.placement} · {design.dpi} dpi</p></div>
              <div className="flex flex-wrap items-center gap-2">
                {trash
                  ? <button className={line} type="button" disabled={busy} onClick={() => void change(design, 'restore')}>Restore</button>
                  : <Link className={line} href={href}>Edit poster</Link>}
                <button className={button + ' text-[#9c1e2c] hover:bg-red-50'} type="button" disabled={busy || exporting} onClick={() => setConfirmation({
                  title: trash ? 'Permanently delete poster?' : 'Delete poster?',
                  detail: trash ? `“${design.title}” will be erased. Its printed QR link will keep working.`
                    : `“${design.title}” will move to Trash. Its printed QR link will keep working.`,
                  confirmLabel: trash ? 'Delete permanently' : 'Move to Trash',
                  perform: () => void change(design, trash ? 'purge' : 'trash'),
                })}>{trash ? 'Delete permanently' : 'Delete'}</button>
              </div>
            </div>
          </article>;
        })}
      </div>
      <ConfirmAction action={confirmation} onDismiss={() => setConfirmation(undefined)} />
    </section>
  );
}
