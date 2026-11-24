'use client';

import { useEffect, useId, useRef } from 'react';

export type Confirmation = {
  title: string;
  detail: string;
  confirmLabel: string;
  perform: () => void;
};

export default function ConfirmAction({ action, onDismiss }: { action?: Confirmation; onDismiss: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const title = useId();
  const detail = useId();

  useEffect(() => {
    const current = dialog.current;
    if (action && current && !current.open) current.showModal();
    else if (!action && current?.open) current.close();
  }, [action]);

  return (
    <dialog ref={dialog} aria-labelledby={title} aria-describedby={detail} onClose={onDismiss}
      className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-3xl border border-stone-200 bg-white p-6 text-charcoal shadow-xl backdrop:bg-black/40">
      <h2 id={title} className="text-xl font-bold">{action?.title}</h2>
      <p id={detail} className="mt-2 break-words text-sm text-stone-700">{action?.detail}</p>
      <form method="dialog" className="mt-5 flex flex-wrap justify-end gap-2">
        <button autoFocus className="min-h-11 rounded-full border border-stone-200 px-4 text-sm font-semibold hover:bg-stone-100">Cancel</button>
        <button type="button" onClick={() => {
          dialog.current?.close();
          action?.perform();
        }} className="min-h-11 rounded-full bg-[#9c1e2c] px-4 text-sm font-semibold text-white hover:bg-[#801721]">{action?.confirmLabel}</button>
      </form>
    </dialog>
  );
}
