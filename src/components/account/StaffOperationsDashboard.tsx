'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

type Operations = {
  stuckOrders: Array<{ id: string; status: string; userId: string; product: { name: string } }>;
  paidWithoutEntitlement: Array<{ id: string; userId: string; product: { name: string } }>;
  duplicateUnresolved: Array<{ userId: string; productId: string; orderIds: string[] }>;
  webhookFailures: Array<{ errorCode: string; _count: { _all: number } }>;
  deviceLockouts: Array<{ id: string; userId: string; slotNumber: number; label: string | null; replacementCount: number }>;
};

export default function StaffOperationsDashboard({ operations }: { operations: Operations }) {
  const router = useRouter();
  const [message, setMessage] = useState<string>();
  const [pending, setPending] = useState(false);

  async function action(event: FormEvent<HTMLFormElement>, kind: 'release_attempt' | 'extend_access') {
    event.preventDefault();
    setPending(true);
    setMessage(undefined);
    const form = new FormData(event.currentTarget);
    const payload = kind === 'release_attempt'
      ? { action: kind, attemptId: form.get('attemptId'), reason: form.get('reason'), force: form.get('force') === 'on' }
      : { action: kind, entitlementId: form.get('entitlementId'), days: Number(form.get('days')), reason: form.get('reason') };
    const response = await fetch('/api/staff/operations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const body = await response.json() as { error?: string };
    setPending(false);
    setMessage(response.ok ? 'Audited staff action completed.' : (body.error ?? 'Staff action failed.'));
    if (response.ok) router.refresh();
  }

  const cards = [
    ['Stuck orders', operations.stuckOrders.length],
    ['Paid without access', operations.paidWithoutEntitlement.length],
    ['Duplicate unresolved', operations.duplicateUnresolved.length],
    ['Device cooldowns', operations.deviceLockouts.length],
  ] as const;
  return (
    <main className="min-h-screen bg-[#f5f5f3] px-5 py-10">
      <div className="mx-auto max-w-6xl">
        <p className="text-xs font-bold uppercase tracking-[.16em] text-crimson">Staff · AAL2 protected</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">Payment and access operations</h1>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{cards.map(([label, count]) => <div key={label} className="rounded-3xl bg-white p-6 shadow-sm"><p className="text-sm text-black/50">{label}</p><strong className="mt-2 block text-3xl">{count}</strong></div>)}</div>
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
        {message && <p role="status" className="mt-5 rounded-2xl bg-white p-4 text-sm">{message}</p>}
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
    </main>
  );
}
