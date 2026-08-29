'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';

const FloatingWidget = dynamic(() => import('./FloatingWidget'), { ssr: false });

export default function FloatingWidgetClient() {
  const pathname = usePathname();
  if (/\/(?:auth|account)(?:\/|$)/u.test(pathname)) return null;
  return <FloatingWidget />;
}
