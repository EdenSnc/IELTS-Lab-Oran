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
  resultsAccessExpired: boolean;
  overallBand: number | null;
  blueprint: { name: string; variant: string };
};
type Product = {
  code: string;
  name: string;
  priceMinor: number;
  currency: string;
  accessDays: number | null;
  maximumAttempts: number | null;
};
type Order = { id: string; status: string; createdAt: string; product: { name: string } };

function statusLabel(value: string) {
  return value.toLowerCase().replaceAll('_', ' ').replace(/^./u, (first) => first.toUpperCase());
}

function formatDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(value));
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
        <p role="status" className="mt-6 rounded-2xl border border-black/[0.07] bg-white px-5 py-4 text-sm leading-6 shadow-sm">
          {message ?? (paymentNotice === 'success'
            ? 'Payment received. Access appears after the verified payment notification is processed.'
            : 'Payment was not completed. No access was granted.')}
        </p>
      )}

      <section className="mt-6 rounded-[2rem] border border-black/[0.07] bg-white p-6 shadow-[0_18px_60px_-42px_rgba(0,0,0,0.35)] sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-crimson">Progress</p><h2 className="mt-2 text-2xl font-semibold tracking-tight">Your tests</h2><p className="mt-2 text-sm text-black/50">Resume active work or open a stored result.</p></div>
          <Link href="/speaking" className="rounded-full border border-black/10 px-4 py-2 text-sm font-semibold transition hover:border-black/20 hover:bg-black/[0.025]">Speaking appointments</Link>
        </div>
        {!attempts.length && <p className="mt-5 rounded-2xl bg-black/[0.025] p-5 text-sm text-black/50">No test attempts yet. Your active tests will appear here.</p>}
        <div className="mt-5 grid gap-3">
          {attempts.map((attempt) => (
            <article key={attempt.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-black/[0.07] p-5">
              <div><p className="font-semibold">{attempt.blueprint.name}</p><p className="mt-1 text-sm text-black/50">{statusLabel(attempt.state)} · {formatDate(attempt.createdAt, locale)}{attempt.overallBand !== null ? ` · Overall ${attempt.overallBand.toFixed(1)}` : ''}</p></div>
              {(() => {
                if (attempt.resultsAccessExpired) return <span className="rounded-full bg-black/[0.04] px-4 py-2 text-sm font-semibold text-black/40">Results access ended</span>;
                return (attempt.state === 'DRAFT' || attempt.state === 'ACTIVE' || attempt.submittedAt) && <Link className="rounded-full bg-charcoal px-4 py-2 text-sm font-semibold text-white transition hover:bg-crimson" href={`/sim/attempt/${attempt.id}`}>{attempt.submittedAt ? 'View result' : 'Continue'}</Link>;
              })()}
            </article>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-[2rem] border border-black/[0.07] bg-white p-6 shadow-[0_18px_60px_-42px_rgba(0,0,0,0.35)] sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-crimson">Access</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">Available tests</h2>
        <p className="mt-2 text-sm text-black/50">Start a test included with your current access.</p>
        {!entitlements.length && <p className="mt-5 rounded-2xl bg-black/[0.025] p-5 text-sm text-black/50">You do not have active test access yet.</p>}
        <div className="mt-5 grid gap-4">
          {entitlements.map((entitlement) => {
            const remaining = entitlement.maximumAttempts === null ? 'Unlimited attempts' : `${Math.max(0, entitlement.maximumAttempts - entitlement.attemptsUsed)} attempt(s) remaining`;
            return <article key={entitlement.id} className="rounded-2xl border border-black/[0.07] p-5"><p className="font-semibold">{entitlement.product.name}</p><p className="mt-1 text-sm text-black/50">{remaining}{entitlement.endsAt ? ` · ends ${formatDate(entitlement.endsAt, locale)}` : ''}</p><div className="mt-4 flex flex-wrap gap-2">{entitlement.product.blueprints.map((blueprint) => {
              const key = `attempt:${entitlement.id}:${blueprint.id}`;
              return <button key={blueprint.id} type="button" disabled={busy !== null || (entitlement.maximumAttempts !== null && entitlement.attemptsUsed >= entitlement.maximumAttempts)} onClick={() => void startAttempt(entitlement.id, blueprint.id)} className="rounded-full bg-charcoal px-4 py-2 text-sm font-semibold text-white transition hover:bg-crimson disabled:opacity-40">{busy === key ? 'Starting…' : `Start ${blueprint.name}`}</button>;
            })}</div></article>;
          })}
        </div>
      </section>

      <section className="mt-6 rounded-[2rem] bg-charcoal p-6 text-white shadow-[0_24px_70px_-38px_rgba(0,0,0,0.7)] sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#ff6679]">Test shop</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">Choose your next test</h2>
        <p className="mt-2 text-sm text-white/55">Secure checkout. Access is added only after payment is verified.</p>
        {!products.length && <p className="mt-5 rounded-2xl bg-white/[0.07] p-5 text-sm text-white/55">No tests are currently available for purchase.</p>}
        {!!products.length && <div className="mt-5 grid gap-3 md:grid-cols-2">{products.map((product) => <article key={product.code} className="rounded-2xl border border-white/10 bg-white/[0.055] p-5"><p className="font-semibold">{product.name}</p><p className="mt-3 text-3xl font-semibold tracking-tight">{new Intl.NumberFormat(locale, { style: 'currency', currency: product.currency, maximumFractionDigits: 0 }).format(product.priceMinor / 100)}</p><p className="mt-1 text-sm text-white/50">{product.maximumAttempts === null ? 'Unlimited attempts' : `${product.maximumAttempts} attempt`}{product.accessDays ? ` · results available for ${product.accessDays} days` : ''}</p><button type="button" disabled={busy !== null} onClick={() => void checkout(product.code)} className="mt-5 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-charcoal transition hover:bg-[#ffebee] disabled:opacity-40">{busy === `checkout:${product.code}` ? 'Opening payment…' : 'Buy securely'}</button></article>)}</div>}
      </section>

      {!!orders.length && <section className="mt-6 rounded-[2rem] border border-black/[0.07] bg-white p-6 shadow-[0_18px_60px_-42px_rgba(0,0,0,0.35)] sm:p-8"><h2 className="text-2xl font-semibold tracking-tight">Recent orders</h2><div className="mt-4 grid gap-2">{orders.map((order) => <div key={order.id} className="flex items-center justify-between gap-3 rounded-2xl bg-black/[0.025] px-4 py-3 text-sm"><span>{order.product.name}</span><strong>{statusLabel(order.status)}</strong></div>)}</div></section>}
    </>
  );
}
