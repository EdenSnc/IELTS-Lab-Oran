'use client';

import { useRouter } from 'next/navigation';

export default function SignOutButton({ locale }: { locale: string }) {
  const router = useRouter();
  return (
    <button
      className="rounded-full border border-black/20 px-4 py-2 text-sm font-semibold"
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
