import { redirect } from 'next/navigation';
import OnboardingForm from '@/components/auth/OnboardingForm';
import TestBrand from '@/components/brand/TestBrand';
import { assertAccountReady } from '@/lib/auth/account-readiness';
import { syncApplicationUser } from '@/lib/auth/request-user';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export default async function AccountOnboardingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const client = await createSupabaseServerClient();
  const { data } = await client.auth.getUser();
  if (!data.user) redirect(`/${locale}/auth/sign-in`);
  const user = await syncApplicationUser(data.user, { syncWhatsapp: false });
  if (user.onboardingCompletedAt) {
    let ready = false;
    try {
      await assertAccountReady(user.id);
      ready = true;
    } catch {
      // A completed profile must re-accept newly published policy versions here.
    }
    if (ready) redirect(`/${locale}/account`);
  }
  const metadata = data.user.user_metadata ?? {};

  return (
    <main className="grid min-h-screen place-items-center bg-[#f5f5f3] px-4 py-10 sm:px-6">
      <section className="w-full max-w-[34rem] rounded-[2rem] border border-black/[0.07] bg-white p-6 shadow-[0_24px_80px_-32px_rgba(0,0,0,0.25)] sm:p-10">
        <TestBrand href={`/${locale}`} responsive={false} />
        <p className="mt-9 text-xs font-bold uppercase tracking-[0.18em] text-crimson">Account setup</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em]">Complete your profile</h1>
        <p className="mt-3 text-sm leading-6 text-black/55">Confirm the details used for tests, results and essential appointment communication.</p>
        <OnboardingForm locale={locale} initial={{
          name: user.name ?? (typeof metadata.full_name === 'string' ? metadata.full_name : ''),
          whatsapp: typeof metadata.whatsapp === 'string' ? metadata.whatsapp : '',
          wilaya: typeof metadata.wilaya === 'string' ? metadata.wilaya : '',
          preferredLocale: typeof metadata.preferred_locale === 'string' ? metadata.preferred_locale : locale,
        }} />
      </section>
    </main>
  );
}
