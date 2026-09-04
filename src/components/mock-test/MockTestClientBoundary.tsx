'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { createJSONStorage } from 'zustand/middleware';
import type { DeliveryTest } from '@/lib/content/delivery-types';
import { useTestStore } from '@/lib/store/useTestStore';

const MockTestClient = dynamic(() => import('./MockTestClient'), {
  ssr: false,
  loading: () => (
    <main className="flex min-h-screen items-center justify-center bg-white text-black">
      <p>Loading test…</p>
    </main>
  ),
});

export default function MockTestClientBoundary({ test, sampleMode = false, locale = 'en' }: { test: DeliveryTest; sampleMode?: boolean; locale?: 'ar' | 'en' | 'fr' }) {
  const [sampleReady, setSampleReady] = useState(!sampleMode);

  useEffect(() => {
    if (!sampleMode) return;
    const original = useTestStore.persist.getOptions();
    useTestStore.persist.setOptions({
      name: 'free-sample-test-storage',
      storage: createJSONStorage(() => sessionStorage),
    });
    useTestStore.getState().resetTest();
    let active = true;
    queueMicrotask(() => {
      if (active) setSampleReady(true);
    });
    return () => {
      active = false;
      useTestStore.persist.setOptions({ name: original.name, storage: original.storage });
      void useTestStore.persist.rehydrate();
    };
  }, [sampleMode]);

  if (!sampleReady) return null;
  return <MockTestClient test={test} sampleMode={sampleMode} locale={locale} />;
}
