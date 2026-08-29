'use client';

import { useRouter } from 'next/navigation';

export default function SignOutButton({ locale }: { locale: string }) {
  const router = useRouter();
  return (
    <button
      className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold shadow-sm transition hover:border-black/20 hover:bg-black/[0.025]"
      onClick={async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.replace(`/${locale}`);
        router.refresh();
      }}
    >
      Sign out
    </button>
  );
}
