import { notFound, redirect } from 'next/navigation';
import SignOutButton from '@/components/auth/SignOutButton';
import TestBrand from '@/components/brand/TestBrand';
import prisma from '@/lib/prisma';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { syncApplicationUser } from '@/lib/auth/request-user';

export default async function OrderReceiptPage({ params }: { params: Promise<{ locale: string; orderId: string }> }) {
  const { locale, orderId } = await params;
  const client = await createSupabaseServerClient();
  const { data } = await client.auth.getUser();
  if (!data.user) redirect(`/${locale}/auth/sign-in`);
  const user = await syncApplicationUser(data.user, { syncWhatsapp: false });
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId: user.id },
    select: { id: true, status: true, amountMinor: true, currency: true, createdAt: true, paidAt: true, product: { select: { name: true } } },
  });
  if (!order) notFound();
  return (
    <main className="min-h-screen bg-[#f5f5f3] px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <header className="flex items-center justify-between"><TestBrand href={`/${locale}`} responsive={false} /><SignOutButton locale={locale} /></header>
        <section className="mt-8 rounded-[2rem] bg-white p-7 shadow-sm sm:p-10">
          <p className="text-xs font-bold uppercase tracking-[.16em] text-crimson">Order receipt</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">{order.product.name}</h1>
          <dl className="mt-8 grid gap-5 sm:grid-cols-2">
            <div><dt className="text-xs uppercase tracking-wide text-black/45">Amount</dt><dd className="mt-1 font-semibold">{new Intl.NumberFormat(locale, { style: 'currency', currency: order.currency }).format(order.amountMinor / 100)}</dd></div>
            <div><dt className="text-xs uppercase tracking-wide text-black/45">Status</dt><dd className="mt-1 font-semibold">{order.status}</dd></div>
            <div><dt className="text-xs uppercase tracking-wide text-black/45">Date</dt><dd className="mt-1 font-semibold">{order.createdAt.toLocaleDateString(locale)}</dd></div>
            <div><dt className="text-xs uppercase tracking-wide text-black/45">Order reference</dt><dd className="mt-1"><input aria-label="Copyable order reference" readOnly value={order.id} className="w-full rounded-xl bg-black/[.035] px-3 py-2 font-mono text-xs" /></dd></div>
          </dl>
        </section>
      </div>
    </main>
  );
}
