'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';

type Blueprint = { id: string; name: string; variant: string };
type Entitlement = {
  id: string;
  status: string;
  startsAt: string | null;
  endsAt: string | null;
  maximumAttempts: number | null;
  attemptsUsed: number;
  product: { name: string; blueprints: Blueprint[] };
};
type Attempt = {
  id: string;
  state: string;
  mode: string;
  createdAt: string;
  submittedAt: string | null;
  overallBand: number | null;
  blueprint: { name: string; variant: string };
};
type Product = {
  code: string;
  name: string;
  priceMinor: number;
  currency: string;
  maximumAttempts: number | null;
};
type Order = { id: string; status: string; createdAt: string; product: { name: string } };

function statusLabel(value: string) {
  return value.toLowerCase().replaceAll('_', ' ').replace(/^./u, (first) => first.toUpperCase());
}

export default function AssessmentDashboard({
  locale,
  entitlements,
  attempts,
  products,
  orders,
  paymentNotice,
}: {
  locale: string;
  entitlements: Entitlement[];
  attempts: Attempt[];
  products: Product[];
  orders: Order[];
  paymentNotice?: 'success' | 'failed';
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const checkoutKeys = useRef(new Map<string, string>());
  const router = useRouter();

  async function startAttempt(entitlementId: string, blueprintId: string) {
    const key = `attempt:${entitlementId}:${blueprintId}`;
    setBusy(key);
    setMessage(null);
    try {
      const response = await fetch('/api/attempts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entitlementId, blueprintId, mode: 'STRICT' }),
      });
      const payload = await response.json() as { id?: string; error?: string };
      if (!response.ok || !payload.id) throw new Error(payload.error ?? 'ATTEMPT_CREATION_FAILED');
      router.push(`/sim/attempt/${payload.id}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to start this test.');
      setBusy(null);
    }
  }

  async function checkout(productCode: string) {
    setBusy(`checkout:${productCode}`);
    setMessage(null);
    try {
      let idempotencyKey = checkoutKeys.current.get(productCode);
      if (!idempotencyKey) {
        idempotencyKey = crypto.randomUUID();
        checkoutKeys.current.set(productCode, idempotencyKey);
      }
      const response = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({ productCode, locale }),
      });
      const payload = await response.json() as { checkoutUrl?: string; error?: string };
      if (!response.ok || !payload.checkoutUrl) throw new Error(payload.error ?? 'CHECKOUT_CREATION_FAILED');
      window.location.assign(payload.checkoutUrl);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to open payment.');
      setBusy(null);
    }
  }

  return (
    <>
      {(paymentNotice || message) && (
        <p role="status" className="mt-6 rounded-2xl border border-black/10 bg-black/[0.03] px-5 py-4">
          {message ?? (paymentNotice === 'success'
            ? 'Payment received. Access appears after the verified payment notification is processed.'
            : 'Payment was not completed. No access was granted.')}
        </p>
      )}

      <section className="mt-6 rounded-3xl border border-black/10 p-7">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><h2 className="text-xl font-semibold">Your tests</h2><p className="mt-2 text-sm text-black/60">Resume active work or open a stored result.</p></div>
          <Link href="/speaking" className="rounded-full border border-black/20 px-4 py-2 text-sm font-semibold">Speaking appointments</Link>
        </div>
        {!attempts.length && <p className="mt-5 rounded-2xl bg-black/[0.03] p-4 text-sm text-black/60">No test attempts yet.</p>}
        <div className="mt-5 grid gap-3">
          {attempts.map((attempt) => (
            <article key={attempt.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-black/10 p-4">
              <div><p className="font-semibold">{attempt.blueprint.name}</p><p className="mt-1 text-sm text-black/60">{statusLabel(attempt.state)} · {new Date(attempt.createdAt).toLocaleDateString(locale)}{attempt.overallBand !== null ? ` · Overall ${attempt.overallBand.toFixed(1)}` : ''}</p></div>
              {(attempt.state === 'DRAFT' || attempt.state === 'ACTIVE' || attempt.submittedAt) && <Link className="rounded-full bg-black px-4 py-2 text-sm font-semibold text-white" href={`/sim/attempt/${attempt.id}`}>{attempt.submittedAt ? 'View result' : 'Continue'}</Link>}
            </article>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-black/10 p-7">
        <h2 className="text-xl font-semibold">Available access</h2>
        <p className="mt-2 text-sm text-black/60">Each start is reserved atomically from the access shown below.</p>
        {!entitlements.length && <p className="mt-5 rounded-2xl bg-black/[0.03] p-4 text-sm text-black/60">No active access yet.</p>}
        <div className="mt-5 grid gap-4">
          {entitlements.map((entitlement) => {
            const remaining = entitlement.maximumAttempts === null ? 'Unlimited attempts' : `${Math.max(0, entitlement.maximumAttempts - entitlement.attemptsUsed)} attempt(s) remaining`;
            return <article key={entitlement.id} className="rounded-2xl border border-black/10 p-5"><p className="font-semibold">{entitlement.product.name}</p><p className="mt-1 text-sm text-black/60">{remaining}{entitlement.endsAt ? ` · ends ${new Date(entitlement.endsAt).toLocaleDateString(locale)}` : ''}</p><div className="mt-4 flex flex-wrap gap-2">{entitlement.product.blueprints.map((blueprint) => {
              const key = `attempt:${entitlement.id}:${blueprint.id}`;
              return <button key={blueprint.id} type="button" disabled={busy !== null || (entitlement.maximumAttempts !== null && entitlement.attemptsUsed >= entitlement.maximumAttempts)} onClick={() => void startAttempt(entitlement.id, blueprint.id)} className="rounded-full bg-black px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">{busy === key ? 'Starting…' : `Start ${blueprint.name}`}</button>;
            })}</div></article>;
          })}
        </div>
      </section>

      {!!products.length && <section className="mt-6 rounded-3xl border border-black/10 p-7"><h2 className="text-xl font-semibold">Buy another test</h2><div className="mt-5 grid gap-3 md:grid-cols-2">{products.map((product) => <article key={product.code} className="rounded-2xl border border-black/10 p-5"><p className="font-semibold">{product.name}</p><p className="mt-2 text-2xl font-semibold">{new Intl.NumberFormat(locale, { style: 'currency', currency: product.currency, maximumFractionDigits: 0 }).format(product.priceMinor / 100)}</p><p className="mt-1 text-sm text-black/60">{product.maximumAttempts === null ? 'Unlimited attempts' : `${product.maximumAttempts} attempt(s)`}</p><button type="button" disabled={busy !== null} onClick={() => void checkout(product.code)} className="mt-4 rounded-full bg-black px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">{busy === `checkout:${product.code}` ? 'Opening payment…' : 'Buy securely'}</button></article>)}</div></section>}

      {!!orders.length && <section className="mt-6 rounded-3xl border border-black/10 p-7"><h2 className="text-xl font-semibold">Recent orders</h2><div className="mt-4 grid gap-2">{orders.map((order) => <div key={order.id} className="flex items-center justify-between gap-3 rounded-xl bg-black/[0.03] px-4 py-3 text-sm"><span>{order.product.name}</span><strong>{statusLabel(order.status)}</strong></div>)}</div></section>}
    </>
  );
}
