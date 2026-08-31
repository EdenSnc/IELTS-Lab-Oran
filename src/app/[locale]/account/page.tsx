import { redirect } from 'next/navigation';
import SignOutButton from '@/components/auth/SignOutButton';
import AccountPlatform from '@/components/account/AccountPlatform';
import TestBrand from '@/components/brand/TestBrand';
import { syncApplicationUser } from '@/lib/auth/request-user';
import prisma from '@/lib/prisma';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export default async function AccountPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ payment?: string }>;
}) {
  const { locale } = await params;
  const client = await createSupabaseServerClient();
  const { data } = await client.auth.getUser();
  if (!data.user) redirect(`/${locale}/auth/sign-in`);
  const user = await syncApplicationUser(data.user);
  if (user.status !== 'ACTIVE') redirect(`/${locale}/auth/sign-in`);
  const now = new Date();
  const [entitlements, attempts, products, orders] = await Promise.all([
    prisma.entitlement.findMany({
      where: {
        userId: user.id,
        status: 'ACTIVE',
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        AND: [{ OR: [{ endsAt: null }, { endsAt: { gt: now } }] }],
      },
      select: {
        id: true,
        status: true,
        startsAt: true,
        endsAt: true,
        maximumAttempts: true,
        attemptsUsed: true,
        product: {
          select: {
            name: true,
            blueprints: {
              where: { blueprint: { status: 'PUBLISHED' } },
              select: { blueprint: { select: { id: true, name: true, variant: true } } },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.assessmentAttempt.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        state: true,
        mode: true,
        createdAt: true,
        submittedAt: true,
        overallBand: true,
        entitlement: { select: { endsAt: true } },
        blueprint: { select: { name: true, variant: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
    }),
    prisma.product.findMany({
      where: { active: true, blueprints: { some: { blueprint: { status: 'PUBLISHED' } } } },
      select: { code: true, name: true, priceMinor: true, currency: true, accessDays: true, maximumAttempts: true },
      orderBy: [{ priceMinor: 'asc' }, { name: 'asc' }],
    }),
    prisma.order.findMany({
      where: { userId: user.id },
      select: { id: true, status: true, createdAt: true, product: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ]);
  const { payment } = await searchParams;

  return (
    <main className="min-h-screen bg-[#f5f5f3] px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-5xl">
        <header className="flex items-center justify-between gap-5 px-1">
          <TestBrand href={`/${locale}`} responsive={false} />
          <SignOutButton locale={locale} />
        </header>

        <section className="mt-8 overflow-hidden rounded-[2rem] border border-black/[0.07] bg-white p-7 shadow-[0_20px_70px_-40px_rgba(0,0,0,0.3)] sm:p-10">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-crimson">Your IELTS Lab</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Welcome{user.name ? `, ${user.name.split(' ')[0]}` : ''}</h1>
          <p className="mt-3 text-sm text-black/50">{user.email}</p>
        </section>

        <AccountPlatform
          autoEnrollEligible={entitlements.length > 0}
          paymentTestMode={process.env.CHARGILY_MODE === 'test'}
          locale={locale}
          paymentNotice={payment === 'success' || payment === 'failed' ? payment : undefined}
          entitlements={entitlements.map((entitlement) => ({
            ...entitlement,
            startsAt: entitlement.startsAt?.toISOString() ?? null,
            endsAt: entitlement.endsAt?.toISOString() ?? null,
            product: {
              name: entitlement.product.name,
              blueprints: entitlement.product.blueprints.map(({ blueprint }) => blueprint),
            },
          }))}
          attempts={attempts.map((attempt) => ({
            ...attempt,
            createdAt: attempt.createdAt.toISOString(),
            submittedAt: attempt.submittedAt?.toISOString() ?? null,
            overallBand: attempt.overallBand?.toNumber() ?? null,
            resultsAccessExpired: Boolean(
              attempt.submittedAt
              && attempt.entitlement?.endsAt
              && attempt.entitlement.endsAt <= now,
            ),
          }))}
          products={products}
          orders={orders.map((order) => ({ ...order, createdAt: order.createdAt.toISOString() }))}
        />
      </div>
    </main>
  );
}
