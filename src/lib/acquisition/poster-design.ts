import { z } from 'zod';
import { qrSizeLimits, type PosterPlacement } from './poster-artwork';

export const MAX_SAVED_ARTWORK_BYTES = 4 * 1024 * 1024;
export const posterIdSchema = z.uuid();

const version = z.number().int().min(1).max(2_147_483_646);
export const posterSaveSchema = z.object({
  id: posterIdSchema,
  version: version.optional(),
  title: z.string().trim().min(1).max(100),
  dpi: z.number().int().min(72).max(1200),
  x: z.number().int().min(0).max(8192),
  y: z.number().int().min(0).max(8192),
  size: z.number().int().min(1).max(8192),
}).strict();

export const posterMutationSchema = z.object({
  id: posterIdSchema, version, action: z.enum(['trash', 'restore', 'purge']),
}).strict();

export function fitsPosterDesign(art: { width: number; height: number }, qr: PosterPlacement, cells: number) {
  const { min, max } = qrSizeLimits(art, cells, qr.x, qr.y);
  return qr.size >= min && qr.size <= max;
}
