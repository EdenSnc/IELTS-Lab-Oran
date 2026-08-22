'use client';

import Image from 'next/image';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

export default function StaffMfaForm() {
  const router = useRouter();
  const [factorId, setFactorId] = useState<string>();
  const [qr, setQr] = useState<string>();
  const [secret, setSecret] = useState<string>();
  const [message, setMessage] = useState('Checking your staff security…');
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      const client = createSupabaseBrowserClient();
      const [{ data: aal }, { data: factors, error }] = await Promise.all([
        client.auth.mfa.getAuthenticatorAssuranceLevel(),
        client.auth.mfa.listFactors(),
      ]);
      if (!active) return;
      if (error) return setMessage(error.message);
      if (aal.currentLevel === 'aal2') {
        router.replace('/speaking/examiner');
        router.refresh();
        return;
      }
      const verified = factors.totp.find((factor: { id: string; status: string }) => factor.status === 'verified');
      if (verified) {
        setFactorId(verified.id);
        setMessage('Enter the six-digit code from your authenticator app.');
      } else setMessage('Set up an authenticator app to secure staff actions.');
    })();
    return () => { active = false; };
  }, [router]);

  async function enroll() {
    setPending(true);
    const client = createSupabaseBrowserClient();
    const { data, error } = await client.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'IELTS Lab Oran staff' });
    setPending(false);
    if (error) return setMessage(error.message);
    setFactorId(data.id);
    setQr(data.totp.qr_code);
    setSecret(data.totp.secret);
    setMessage('Scan the QR code, then enter the generated six-digit code.');
  }

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!factorId) return;
    const code = String(new FormData(event.currentTarget).get('code') ?? '').trim();
    setPending(true);
    const client = createSupabaseBrowserClient();
    const { error } = await client.auth.mfa.challengeAndVerify({ factorId, code });
    setPending(false);
    if (error) return setMessage(error.message);
    router.replace('/speaking/examiner');
    router.refresh();
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#f7f6f3] px-5 py-12">
      <section className="w-full max-w-md rounded-3xl border border-black/10 bg-white p-7 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[.16em] text-[#c11221]">Staff security</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Two-step verification</h1>
        <p className="mt-3 text-sm leading-6 text-black/65">{message}</p>
        {qr && <Image className="mx-auto mt-6" src={qr} alt="Authenticator enrollment QR code" width={224} height={224} unoptimized />}
        {secret && <p className="mt-3 break-all rounded-xl bg-black/5 p-3 text-xs">Manual key: {secret}</p>}
        {!factorId && <button type="button" disabled={pending} onClick={() => void enroll()} className="mt-6 w-full rounded-full bg-black px-5 py-3 font-semibold text-white disabled:opacity-50">Set up authenticator</button>}
        {factorId && (
          <form onSubmit={verify} className="mt-6 grid gap-4">
            <label className="grid gap-2 text-sm font-semibold">Six-digit code
              <input name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" required className="rounded-xl border border-black/20 px-4 py-3 text-lg tracking-[.3em]" />
            </label>
            <button disabled={pending} className="rounded-full bg-black px-5 py-3 font-semibold text-white disabled:opacity-50">Verify and continue</button>
          </form>
        )}
      </section>
    </main>
  );
}
