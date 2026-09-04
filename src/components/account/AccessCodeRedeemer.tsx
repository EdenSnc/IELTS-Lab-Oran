'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AccessCodeRedeemer() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string>();

  async function redeem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setPending(true);
    setMessage(undefined);
    const form = new FormData(formElement);
    const response = await fetch('/api/account/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: form.get('code') }),
    });
    const body = await response.json() as { error?: string };
    setPending(false);
    setMessage(response.ok ? 'Access added to your account.' : (body.error ?? 'Access code could not be redeemed.'));
    if (response.ok) {
      formElement.reset();
      router.refresh();
    }
  }

  return (
    <section className="mt-6 rounded-[2rem] border border-black/[0.07] bg-white p-6 shadow-[0_18px_60px_-42px_rgba(0,0,0,0.35)] sm:p-8">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-crimson">Access code</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight">Redeem prepaid access</h2>
      <form onSubmit={(event) => void redeem(event)} className="mt-5 flex flex-col gap-3 sm:flex-row">
        <input name="code" required autoComplete="off" maxLength={64} placeholder="IELTS-XXXX-XXXX-XXXX-XXXX-XXXX" className="min-h-12 flex-1 rounded-full border border-black/10 px-5 font-mono uppercase tracking-wide outline-none focus:border-crimson" />
        <button disabled={pending} className="min-h-12 rounded-full bg-charcoal px-6 font-semibold text-white transition hover:bg-crimson disabled:opacity-40">{pending ? 'Checking…' : 'Redeem'}</button>
      </form>
      {message && <p role="status" className="mt-3 text-sm text-black/55">{message}</p>}
    </section>
  );
}
