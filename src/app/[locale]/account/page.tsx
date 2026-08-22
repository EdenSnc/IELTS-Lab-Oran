import { redirect } from 'next/navigation';
import SignOutButton from '@/components/auth/SignOutButton';
import DeviceManager from '@/components/auth/DeviceManager';
import AssessmentDashboard from '@/components/account/AssessmentDashboard';
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
        blueprint: { select: { name: true, variant: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
    }),
    prisma.product.findMany({
      where: { active: true, blueprints: { some: { blueprint: { status: 'PUBLISHED' } } } },
      select: { code: true, name: true, priceMinor: true, currency: true, maximumAttempts: true },
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
    <main className="mx-auto min-h-[70vh] max-w-5xl px-5 py-16">
      <div className="flex items-start justify-between gap-6 rounded-3xl border border-black/10 p-7">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#d0021b]">IELTS Lab Oran</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Your account</h1>
          <p className="mt-2 text-black/60">{user.email}</p>
        </div>
        <SignOutButton locale={locale} />
      </div>
      <AssessmentDashboard
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
        }))}
        products={products}
        orders={orders.map((order) => ({ ...order, createdAt: order.createdAt.toISOString() }))}
      />
      <DeviceManager />
    </main>
  );
}
