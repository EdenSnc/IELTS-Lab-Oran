'use client';

import { FormEvent, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

type Operations = {
  stuckOrders: Array<{ id: string; status: string; userId: string; product: { name: string } }>;
  paidWithoutEntitlement: Array<{ id: string; userId: string; product: { name: string } }>;
  duplicateUnresolved: Array<{ userId: string; productId: string; orderIds: string[] }>;
  webhookFailures: Array<{ errorCode: string; _count: { _all: number } }>;
  deviceLockouts: Array<{ id: string; userId: string; slotNumber: number; label: string | null; replacementCount: number }>;
};

type AccessCodeSummary = {
  id: string;
  codeHint: string;
  createdAt: string;
  expiresAt: string | null;
  redeemedAt: string | null;
  product: { name: string };
  redeemedBy: { email: string | null; name: string | null } | null;
};

export default function StaffOperationsDashboard({ operations, accessCodes, products }: { operations: Operations; accessCodes: AccessCodeSummary[]; products: Array<{ id: string; name: string }> }) {
  const router = useRouter();
  const [message, setMessage] = useState<string>();
  const [pending, setPending] = useState(false);
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([]);
  const saving = useRef(false);

  async function save(endpoint: string, payload: unknown, success: (body: { accessCodes?: Array<{ code: string }> }) => void) {
    if (saving.current) return;
    saving.current = true;
    setPending(true);
    setMessage(undefined);
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await response.json() as { error?: string; accessCodes?: Array<{ code: string }> };
      if (!response.ok) {
        setMessage(body.error ?? 'The action could not be saved.');
        return;
      }
      success(body);
      router.refresh();
    } catch {
      setMessage('The result could not be confirmed. Refresh and review the record before trying again.');
    } finally {
      saving.current = false;
      setPending(false);
    }
  }

  async function action(event: FormEvent<HTMLFormElement>, kind: 'release_attempt' | 'extend_access') {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = kind === 'release_attempt'
      ? { action: kind, attemptId: form.get('attemptId'), reason: form.get('reason'), force: form.get('force') === 'on' }
      : { action: kind, entitlementId: form.get('entitlementId'), days: Number(form.get('days')), reason: form.get('reason') };
    await save('/api/staff/operations', payload, () => setMessage('Staff action saved.'));
  }

  async function generateCodes(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const expires = form.get('expiresAt');
    const expiresAt = expires ? new Date(String(expires)) : null;
    if (expiresAt && !Number.isFinite(expiresAt.getTime())) {
      setMessage('Enter a valid expiry date.');
      return;
    }
    await save('/api/staff/access-codes', {
      productId: form.get('productId'),
      quantity: Number(form.get('quantity')),
      reason: form.get('reason'),
      expiresAt: expiresAt?.toISOString() ?? null,
    }, (body) => {
      setGeneratedCodes(body.accessCodes?.map(({ code }) => code) ?? []);
      setMessage('Codes generated. Copy them now.');
    });
  }

  const cards = [
    ['Stuck orders', operations.stuckOrders.length],
    ['Paid without access', operations.paidWithoutEntitlement.length],
    ['Duplicate unresolved', operations.duplicateUnresolved.length],
    ['Device cooldowns', operations.deviceLockouts.length],
  ] as const;
  return (
    <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Payments &amp; access</h1>
        <div className="mt-5 grid grid-cols-2 gap-2 lg:grid-cols-4">{cards.map(([label, count]) => <div key={label} className="min-w-0 rounded-xl border border-gray-200 bg-white p-3 sm:p-4"><p className="text-sm text-gray-600">{label}</p><strong className="mt-1 block text-2xl tabular-nums text-crimson">{count}</strong></div>)}</div>
        <p role="status" className="mt-3 text-sm font-semibold text-crimson">{pending ? 'Saving…' : message}</p>
        <section className="mt-6 grid gap-5 lg:grid-cols-2">
          <form onSubmit={(event) => void action(event, 'release_attempt')} className="grid gap-3 rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">Release attempt</h2>
            <input name="attemptId" placeholder="Attempt UUID" required className="rounded-xl border border-black/15 px-4 py-3" />
            <textarea name="reason" placeholder="Audited reason" minLength={5} maxLength={500} required className="rounded-xl border border-black/15 px-4 py-3" />
            <label className="text-sm"><input name="force" type="checkbox" className="mr-2" />Force after the attempt reached ACTIVE</label>
            <button disabled={pending} className="rounded-full bg-charcoal px-5 py-3 font-semibold text-white">Release safely</button>
          </form>
          <form onSubmit={(event) => void action(event, 'extend_access')} className="grid gap-3 rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">Extend access</h2>
            <input name="entitlementId" placeholder="Entitlement UUID" required className="rounded-xl border border-black/15 px-4 py-3" />
            <input name="days" type="number" min={1} max={365} defaultValue={7} required className="rounded-xl border border-black/15 px-4 py-3" />
            <textarea name="reason" placeholder="Audited reason" minLength={5} maxLength={500} required className="rounded-xl border border-black/15 px-4 py-3" />
            <button disabled={pending} className="rounded-full bg-charcoal px-5 py-3 font-semibold text-white">Extend access</button>
          </form>
        </section>
        <section className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
          <form onSubmit={(event) => void generateCodes(event)} className="grid content-start gap-3 rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">Generate prepaid access codes</h2>
            <select name="productId" required className="rounded-xl border border-black/15 bg-white px-4 py-3">{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select>
            <input name="quantity" type="number" min={1} max={50} defaultValue={1} required className="rounded-xl border border-black/15 px-4 py-3" />
            <input name="expiresAt" type="datetime-local" className="rounded-xl border border-black/15 px-4 py-3" />
            <textarea name="reason" placeholder="Audited allocation reason" minLength={5} maxLength={500} required className="rounded-xl border border-black/15 px-4 py-3" />
            <button disabled={pending || !products.length} className="rounded-full bg-charcoal px-5 py-3 font-semibold text-white disabled:opacity-40">Generate codes</button>
            {!!generatedCodes.length && <pre className="overflow-x-auto rounded-2xl bg-black p-4 text-xs text-white">{generatedCodes.join('\n')}</pre>}
          </form>
          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">Recent access codes</h2>
            <div className="mt-4 grid gap-2">{accessCodes.map((code) => <div key={code.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-black/[.025] px-4 py-3 text-xs"><span><strong>{code.product.name}</strong> · {code.codeHint}</span><span>{code.redeemedAt ? `Redeemed by ${code.redeemedBy?.email ?? code.redeemedBy?.name ?? 'learner'}` : code.expiresAt ? `Expires ${new Date(code.expiresAt).toLocaleDateString()}` : 'Available'}</span></div>)}</div>
          </div>
        </section>
        <section className="mt-6 rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Webhook failures</h2>
          <div className="mt-4 grid gap-2">{operations.webhookFailures.map((failure) => <div key={failure.errorCode} className="flex justify-between rounded-xl bg-black/[.025] px-4 py-3 text-sm"><span>{failure.errorCode}</span><strong>{failure._count._all}</strong></div>)}</div>
        </section>
        <section className="mt-6 grid gap-5 lg:grid-cols-2">
          <div className="rounded-3xl bg-white p-6 shadow-sm"><h2 className="text-xl font-semibold">Stuck orders</h2><div className="mt-4 grid gap-2">{operations.stuckOrders.map((order) => <div key={order.id} className="rounded-xl bg-black/[.025] p-3 text-xs"><strong>{order.product.name}</strong><p className="mt-1 break-all">{order.id} · {order.status}</p></div>)}</div></div>
          <div className="rounded-3xl bg-white p-6 shadow-sm"><h2 className="text-xl font-semibold">Paid without active access</h2><div className="mt-4 grid gap-2">{operations.paidWithoutEntitlement.map((order) => <div key={order.id} className="rounded-xl bg-black/[.025] p-3 text-xs"><strong>{order.product.name}</strong><p className="mt-1 break-all">{order.id} · user {order.userId}</p></div>)}</div></div>
          <div className="rounded-3xl bg-white p-6 shadow-sm"><h2 className="text-xl font-semibold">Duplicate unresolved orders</h2><div className="mt-4 grid gap-2">{operations.duplicateUnresolved.map((group) => <div key={`${group.userId}:${group.productId}`} className="rounded-xl bg-black/[.025] p-3 text-xs"><strong>{group.orderIds.length} orders</strong><p className="mt-1 break-all">user {group.userId}</p></div>)}</div></div>
          <div className="rounded-3xl bg-white p-6 shadow-sm"><h2 className="text-xl font-semibold">Device replacement cooldowns</h2><div className="mt-4 grid gap-2">{operations.deviceLockouts.map((slot) => <div key={slot.id} className="rounded-xl bg-black/[.025] p-3 text-xs"><strong>Device {slot.slotNumber} · {slot.label ?? 'Unnamed'}</strong><p className="mt-1 break-all">user {slot.userId} · replacements {slot.replacementCount}</p></div>)}</div></div>
        </section>
    </div>
  );
}
