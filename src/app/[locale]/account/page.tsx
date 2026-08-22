import { redirect } from 'next/navigation';
import SignOutButton from '@/components/auth/SignOutButton';
import DeviceManager from '@/components/auth/DeviceManager';
import { syncApplicationUser } from '@/lib/auth/request-user';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export default async function AccountPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const client = await createSupabaseServerClient();
  const { data } = await client.auth.getUser();
  if (!data.user) redirect(`/${locale}/auth/sign-in`);
  const user = await syncApplicationUser(data.user);
  if (user.status !== 'ACTIVE') redirect(`/${locale}/auth/sign-in`);

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
      <DeviceManager />
    </main>
  );
}
