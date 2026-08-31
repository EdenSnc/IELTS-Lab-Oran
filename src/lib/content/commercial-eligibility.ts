type ReviewStatus = string;

type CommercialPartCandidate = {
  reviewStatus: ReviewStatus;
  stimuli: Array<{
    isVisibleToLearner: boolean;
    reviewStatus: ReviewStatus;
    asset: { reviewStatus: ReviewStatus } | null;
  }>;
  questionGroups: Array<{
    reviewStatus: ReviewStatus;
    scoringStrategy: string;
    maxMarks: number;
    answerKey: { reviewStatus: ReviewStatus; formatVersion: number } | null;
    assetLinks: Array<{ asset: { reviewStatus: ReviewStatus } }>;
    questions: Array<{ stableKey: string; maxMarks: number }>;
  }>;
};

export function isCommerciallyEligiblePart(part: CommercialPartCandidate) {
  if (part.reviewStatus !== 'VERIFIED') return false;
  if (!part.stimuli.some((stimulus) => stimulus.isVisibleToLearner)) return false;
  if (part.stimuli.some((stimulus) => (
    stimulus.reviewStatus !== 'VERIFIED'
    || (stimulus.asset !== null && stimulus.asset.reviewStatus !== 'VERIFIED')
  ))) return false;
  if (part.questionGroups.length === 0) return false;

  return part.questionGroups.every((group) => {
    if (group.reviewStatus !== 'VERIFIED' || group.questions.length === 0) return false;
    if (group.assetLinks.some((link) => link.asset.reviewStatus !== 'VERIFIED')) return false;
    if (new Set(group.questions.map((question) => question.stableKey)).size !== group.questions.length) return false;

    const objective = group.scoringStrategy === 'PER_ITEM_EXACT'
      || group.scoringStrategy === 'UNORDERED_EXACT_SET';
    if (objective) {
      return group.answerKey?.reviewStatus === 'VERIFIED'
        && group.answerKey.formatVersion === 1
        && group.questions.every((question) => question.maxMarks > 0)
        && group.questions.reduce((sum, question) => sum + question.maxMarks, 0) === group.maxMarks;
    }
    if (group.scoringStrategy !== 'RUBRIC' && group.scoringStrategy !== 'NOT_SCORED') return false;
    return group.maxMarks === 0
      && group.questions.every((question) => question.maxMarks === 0);
  });
}
