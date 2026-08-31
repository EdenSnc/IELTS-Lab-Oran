import assert from 'node:assert/strict';
import test from 'node:test';
import { isCommerciallyEligiblePart } from '../../src/lib/content/commercial-eligibility';

function eligiblePart() {
  return {
    reviewStatus: 'VERIFIED',
    stimuli: [{ isVisibleToLearner: true, reviewStatus: 'VERIFIED', asset: { reviewStatus: 'VERIFIED' } }],
    questionGroups: [{
      reviewStatus: 'VERIFIED',
      scoringStrategy: 'PER_ITEM_EXACT',
      maxMarks: 2,
      answerKey: { reviewStatus: 'VERIFIED', formatVersion: 1 },
      assetLinks: [],
      questions: [{ stableKey: 'q1', maxMarks: 1 }, { stableKey: 'q2', maxMarks: 1 }],
    }],
  };
}

test('commercial provisioning rejects incomplete nested content evidence', () => {
  assert.equal(isCommerciallyEligiblePart(eligiblePart()), true);

  const pendingAsset = eligiblePart();
  pendingAsset.stimuli[0].asset!.reviewStatus = 'PENDING_REVIEW';
  assert.equal(isCommerciallyEligiblePart(pendingAsset), false);

  const keylessGroup = { ...eligiblePart().questionGroups[0], answerKey: null };
  assert.equal(isCommerciallyEligiblePart({
    ...eligiblePart(),
    questionGroups: [keylessGroup],
  }), false);

  const wrongMarks = eligiblePart();
  wrongMarks.questionGroups[0].maxMarks = 3;
  assert.equal(isCommerciallyEligiblePart(wrongMarks), false);
});
