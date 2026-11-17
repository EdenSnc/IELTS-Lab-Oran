'use client';

import { useEffect } from 'react';
import { captureLandingUtms } from '@/lib/acquisition/utm-client';

export default function AcquisitionUtmCapture() {
  useEffect(() => {
    captureLandingUtms();
  }, []);
  return null;
}
