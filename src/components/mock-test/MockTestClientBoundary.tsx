'use client';

import dynamic from 'next/dynamic';
import type { DeliveryTest } from '@/lib/content/delivery-types';

const MockTestClient = dynamic(() => import('./MockTestClient'), {
  ssr: false,
  loading: () => (
    <main className="flex min-h-screen items-center justify-center bg-white text-black">
      <p>Loading test…</p>
    </main>
  ),
});

export default function MockTestClientBoundary({ test }: { test: DeliveryTest }) {
  return <MockTestClient test={test} />;
}
