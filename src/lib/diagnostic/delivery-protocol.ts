import type { DeliverySection } from '@/lib/content/delivery-types';
export type DiagnosticAudioTrack = { id: string; url: string; durationSeconds: number };
export type DiagnosticDeliverySection = DeliverySection & { audioTracks: DiagnosticAudioTrack[] };
