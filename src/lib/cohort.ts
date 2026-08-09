function integerFromEnv(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : fallback;
}

// These server-side values are intentionally explicit until the live database
// connection is available. They must reflect real confirmed seats.
export const TOTAL_FOUNDING_SEATS = integerFromEnv(
  process.env.FOUNDING_COHORT_CAPACITY,
  8,
);

export interface CohortStatus {
  total: number;
  claimed: number;
  remaining: number;
  isFull: boolean;
}

export function getFoundingCohortStatus(): CohortStatus {
  const claimed = Math.min(
    integerFromEnv(process.env.FOUNDING_COHORT_CLAIMED, 0),
    TOTAL_FOUNDING_SEATS,
  );
  const remaining = TOTAL_FOUNDING_SEATS - claimed;

  return {
    total: TOTAL_FOUNDING_SEATS,
    claimed,
    remaining,
    isFull: remaining === 0,
  };
}
