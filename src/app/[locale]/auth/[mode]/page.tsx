import { notFound } from 'next/navigation';
import AuthForm, { type AuthMode } from '@/components/auth/AuthForm';

const MODES = new Set<AuthMode>(['sign-in', 'sign-up', 'forgot-password', 'update-password']);

export default async function AuthPage({ params }: { params: Promise<{ locale: string; mode: string }> }) {
  const { locale, mode } = await params;
  if (!MODES.has(mode as AuthMode)) notFound();

  return (
    <main className="min-h-[70vh] bg-[#fafafa] px-5 py-16">
      <AuthForm locale={locale} mode={mode as AuthMode} />
    </main>
  );
}
