import prisma from '@/lib/prisma';

// Physical constraint: total PC stations in the lab.
// Edit this constant when the lab capacity changes.
export const TOTAL_FOUNDING_SEATS = 8;

export interface CohortStatus {
  total: number;
  claimed: number;
  remaining: number;
  isFull: boolean;
}

/**
 * Returns real-time founding cohort seat availability.
 * Counts LeadMagnetDownload rows where source = 'cohort_waitlist'.
 *
 * Fails gracefully: if the DB is unreachable or the migration has not
 * yet been applied (source column missing), returns all seats unclaimed
 * rather than crashing the page.
 *
 * NOTE: Apply the DB migration before deploying, otherwise this always
 * returns { claimed: 0, remaining: 8, isFull: false } as a safe fallback.
 */
export async function getFoundingCohortStatus(): Promise<CohortStatus> {
  try {
    const claimed = await prisma.leadMagnetDownload.count({
      where: { source: 'cohort_waitlist' },
    });

    const clamped = Math.min(claimed, TOTAL_FOUNDING_SEATS);
    const remaining = Math.max(TOTAL_FOUNDING_SEATS - clamped, 0);

    return {
      total: TOTAL_FOUNDING_SEATS,
      claimed: clamped,
      remaining,
      isFull: remaining === 0,
    };
  } catch {
    // Graceful fallback — do not crash the page if the DB is unavailable
    // or if the migration adding the `source` column hasn't been applied yet.
    return {
      total: TOTAL_FOUNDING_SEATS,
      claimed: 0,
      remaining: TOTAL_FOUNDING_SEATS,
      isFull: false,
    };
  }
}
