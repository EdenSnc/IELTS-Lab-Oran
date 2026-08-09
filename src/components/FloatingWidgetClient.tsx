'use client';

import dynamic from 'next/dynamic';

const FloatingWidget = dynamic(() => import('./FloatingWidget'), { ssr: false });

export default function FloatingWidgetClient() {
  return <FloatingWidget />;
}
