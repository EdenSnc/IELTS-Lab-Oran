import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import SignOutButton from '@/components/auth/SignOutButton';
import TestBrand from '@/components/brand/TestBrand';
import prisma from '@/lib/prisma';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { syncApplicationUser } from '@/lib/auth/request-user';
import { CANONICAL_ORIGIN } from '@/lib/seo';

export const metadata: Metadata = {
  metadataBase: new URL(CANONICAL_ORIGIN),
  robots: { index: false, follow: false },
};

const RECEIPT_COPY = {
  en: {
    eyebrow: 'Order receipt',
    amount: 'Amount',
    status: 'Status',
    date: 'Date',
    reference: 'Order reference',
    copyAria: 'Copyable order reference',
  },
  fr: {
    eyebrow: 'Reçu de commande',
    amount: 'Montant',
    status: 'Statut',
    date: 'Date',
    reference: 'Référence de commande',
    copyAria: 'Référence de commande copiable',
  },
  ar: {
    eyebrow: 'إيصال الطلب',
    amount: 'المبلغ',
    status: 'الحالة',
    date: 'التاريخ',
    reference: 'مرجع الطلب',
    copyAria: 'مرجع الطلب قابل للنسخ',
  },
} as const;

export default async function OrderReceiptPage({ params }: { params: Promise<{ locale: string; orderId: string }> }) {
  const { locale, orderId } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(orderId)) {
    notFound();
  }
  const client = await createSupabaseServerClient();
  const { data } = await client.auth.getUser();
  if (!data.user) redirect(`/${locale}/auth/sign-in`);
  const user = await syncApplicationUser(data.user, { syncWhatsapp: false });
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId: user.id },
    select: { id: true, status: true, amountMinor: true, currency: true, createdAt: true, paidAt: true, product: { select: { name: true } } },
  });
  if (!order) notFound();

  const safeLocale = locale === 'fr' || locale === 'ar' ? locale : 'en';
  const copy = RECEIPT_COPY[safeLocale];
  const isRtl = safeLocale === 'ar';

  return (
    <main id="main-content" className={`min-h-screen bg-[#f5f5f3] px-4 py-8 sm:px-6 ${isRtl ? 'font-cairo' : ''}`} dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="mx-auto max-w-3xl">
        <header className="flex items-center justify-between">
          <TestBrand href={`/${locale}`} responsive={false} />
          <SignOutButton locale={locale} />
        </header>
        <section className="mt-8 rounded-[2rem] bg-white p-7 shadow-sm sm:p-10">
          <p className="text-xs font-bold uppercase tracking-[.16em] text-[#b81428]">{copy.eyebrow}</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">{order.product.name}</h1>
          <dl className="mt-8 grid gap-5 sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-wide text-gray-600">{copy.amount}</dt>
              <dd className="mt-1 font-semibold">
                {new Intl.NumberFormat(safeLocale === 'ar' ? 'ar-DZ' : safeLocale, { style: 'currency', currency: order.currency }).format(order.amountMinor / 100)}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-gray-600">{copy.status}</dt>
              <dd className="mt-1 font-semibold">{order.status}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-gray-600">{copy.date}</dt>
              <dd className="mt-1 font-semibold">{order.createdAt.toLocaleDateString(safeLocale === 'ar' ? 'ar-DZ' : safeLocale)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-gray-600">{copy.reference}</dt>
              <dd className="mt-1">
                <input aria-label={copy.copyAria} dir="ltr" readOnly value={order.id} className="w-full rounded-xl bg-black/[.035] px-3 py-2 font-mono text-xs" />
              </dd>
            </div>
          </dl>
        </section>
      </div>
    </main>
  );
}
