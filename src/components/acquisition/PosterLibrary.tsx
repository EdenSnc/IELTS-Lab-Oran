'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';

type Design = { id: string; title: string; version: number; width: number; height: number; x: number; y: number; size: number;
  dpi: number; code: string; placement: string; thumbnail?: string; qrPreview: string };
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
  const [busy, setBusy] = useState(false);
  const [undo, setUndo] = useState<{ id: string; version: number }>();
  const [toDelete, setToDelete] = useState<Design>();
  const lock = useRef(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const query = search.trim().toLowerCase();
  const visible = designs.filter((design) => `${design.title} ${design.placement}`.toLowerCase().includes(query));

  async function change(design: { id: string; version: number }, action: Action) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setMessage('');
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
      dialog.current?.close();
      router.refresh();
    } catch (problem) {
      dialog.current?.close();
      setMessage(problem instanceof Error ? problem.message : 'Could not update poster.');
      router.refresh();
    } finally {
      setBusy(false);
      lock.current = false;
    }
  }

  return (
    <section className="space-y-5" aria-label={trash ? 'Trashed poster designs' : 'Poster designs'}>
      {!trash && (
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
          <input type="search" aria-label="Find a poster" value={search} onChange={(event) => setSearch(event.target.value)}
            placeholder="Find a poster or location" className="min-h-11 min-w-0 rounded-xl border border-stone-200 bg-white px-4 text-base sm:max-w-sm" />
          <button className={solid} type="button" aria-expanded={creating} aria-controls="new-poster" onClick={() => setCreating(!creating)}>
            <span aria-hidden="true" className="me-2 text-lg leading-none">+</span> New poster
          </button>
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
      {!visible.length && <p className="rounded-2xl border border-dashed border-stone-300 p-8 text-center text-sm text-stone-600">
        {query ? 'No posters match your search.' : trash ? 'Trash is empty.' : 'Your saved posters will appear here.'}
      </p>}
      <div className="grid gap-4 min-[540px]:grid-cols-2 xl:grid-cols-3">
        {visible.map((design) => {
          const href = `${base}/poster/${encodeURIComponent(design.code)}?design=${design.id}`;
          const poster = (
            <div className="grid h-48 place-items-center overflow-hidden rounded-[1.15rem] bg-[#f3f0ed] p-4">
              <div className="relative max-w-full overflow-hidden rounded-sm shadow-md" style={{
                width: `${10 * design.width / design.height}rem`, aspectRatio: `${design.width}/${design.height}`,
              }}>
                {/* Private previews are either included in the owner page or loaded with their session. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img loading={design.thumbnail ? 'eager' : 'lazy'} alt="" src={design.thumbnail ?? `/api/staff/posters?id=${design.id}&thumbnail=1&v=${design.version}`}
                  className="block size-full object-fill" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img alt="" src={design.qrPreview} className="absolute aspect-square" style={{
                  left: `${design.x / design.width * 100}%`, top: `${design.y / design.height * 100}%`, width: `${design.size / design.width * 100}%`,
                }} />
              </div>
            </div>
          );
          return <article key={design.id} className="min-w-0 rounded-[1.4rem] border border-stone-200 bg-white p-2 shadow-[0_2px_12px_#1f151008]">
            {trash ? poster : <Link href={href} aria-label={`Open ${design.title}`} className="block rounded-[1.15rem] focus-visible:outline-2 focus-visible:outline-crimson">{poster}</Link>}
            <div className="space-y-3 px-3 pb-3 pt-4">
              <div><h2 className="break-words text-base font-bold">{design.title}</h2><p className="mt-0.5 break-words text-sm text-stone-600">{design.placement} · {design.dpi} dpi</p></div>
              <div className="flex flex-wrap items-center gap-2">
                {trash
                  ? <button className={line} type="button" disabled={busy} onClick={() => void change(design, 'restore')}>Restore</button>
                  : <Link className={line} href={href}>Edit poster</Link>}
                <button className={button + ' text-[#9c1e2c] hover:bg-red-50'} type="button" disabled={busy} onClick={() => {
                  if (!trash) { void change(design, 'trash'); return; }
                  setToDelete(design);
                  dialog.current?.showModal();
                }}>{trash ? 'Delete permanently' : 'Delete'}</button>
              </div>
            </div>
          </article>;
        })}
      </div>
      <dialog ref={dialog} aria-labelledby="delete-title" aria-describedby="delete-detail"
        className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-3xl border border-stone-200 bg-white p-6 text-charcoal shadow-xl backdrop:bg-black/40">
        <h2 id="delete-title" className="text-xl font-bold">Delete poster permanently?</h2>
        <p id="delete-detail" className="mt-2 break-words text-sm text-stone-700">{toDelete?.title} will be removed from the library. Printed QR links stay as they are.</p>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button type="button" autoFocus className={line} onClick={() => dialog.current?.close()} disabled={busy}>Cancel</button>
          <button type="button" className={button + ' bg-[#9c1e2c] text-white'} disabled={busy || !toDelete} onClick={() => {
            if (toDelete) void change(toDelete, 'purge');
          }}>Delete permanently</button>
        </div>
      </dialog>
    </section>
  );
}
