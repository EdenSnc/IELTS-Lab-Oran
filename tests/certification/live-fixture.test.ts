import assert from 'node:assert/strict';
import test from 'node:test';
import {
  objectiveAnswerKeySchema,
  scoreObjectiveGroups,
  type ObjectiveGroup,
} from '../../src/lib/grading/objective-scoring-core';

const enabled = Boolean(
  process.env.RUN_CONFIGURED_FIXTURE_CERTIFICATION === '1'
  && process.env.DATABASE_URL
  && process.env.ENCRYPTION_KEY
  && process.env.CERTIFIED_FIXTURE_TEST_VERSION_ID,
);
let disconnect: (() => Promise<void>) | undefined;

test('configured real fixture preserves 40/40, 0/40, and every single-item mark', {
  skip: enabled ? false : 'set RUN_CONFIGURED_FIXTURE_CERTIFICATION=1 with database/key configuration',
}, async () => {
  const [{ default: prisma }, { decrypt }, { gradeVerifiedObjectiveAnswers }] = await Promise.all([
    import('../../src/lib/prisma'),
    import('../../src/lib/crypto'),
    import('../../src/lib/grading/objective-grading'),
  ]);
  disconnect = () => prisma.$disconnect();
  const version = await prisma.testVersion.findFirst({
    where: {
      id: process.env.CERTIFIED_FIXTURE_TEST_VERSION_ID,
    },
    select: {
      id: true,
      sections: {
        where: { skill: { in: ['LISTENING', 'READING'] } },
        select: {
          skill: true,
          parts: {
            select: {
              questionGroups: {
                select: {
                  maxMarks: true,
                  scoringStrategy: true,
                  questions: {
                    orderBy: { displayOrder: 'asc' },
                    select: { stableKey: true, sourceNumber: true, maxMarks: true },
                  },
                  answerKey: {
                    select: { encryptedPayload: true, normalization: true, formatVersion: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
  assert.ok(version, 'the explicitly configured Listening/Reading fixture is required');

  const allAnswers = { listening: {} as Record<string, string>, reading: {} as Record<string, string> };
  const groupsBySkill = new Map<'LISTENING' | 'READING', ObjectiveGroup[]>();
  for (const section of version.sections) {
    assert.ok(section.skill === 'LISTENING' || section.skill === 'READING');
    const groups: ObjectiveGroup[] = [];
    for (const part of section.parts) {
      for (const group of part.questionGroups) {
        assert.ok(group.answerKey);
        assert.equal(group.answerKey.formatVersion, 1);
        assert.ok(group.questions.every((question) => question.sourceNumber !== null));
        const answerKey = objectiveAnswerKeySchema.parse(
          JSON.parse(decrypt(group.answerKey.encryptedPayload)),
        );
        const objectiveGroup: ObjectiveGroup = {
          scoringStrategy: group.scoringStrategy,
          maxMarks: group.maxMarks,
          questions: group.questions.map((question) => ({
            ...question,
            sourceNumber: question.sourceNumber as number,
          })),
          normalization: (group.answerKey.normalization ?? {}) as ObjectiveGroup['normalization'],
          answerKey,
        };
        groups.push(objectiveGroup);
        if (answerKey.strategy === 'PER_ITEM_EXACT') {
          for (const question of objectiveGroup.questions) {
            allAnswers[section.skill.toLowerCase() as 'listening' | 'reading'][String(question.sourceNumber)] =
              answerKey.answersByStableKey[question.stableKey][0];
          }
        } else {
          objectiveGroup.questions.forEach((question, index) => {
            allAnswers[section.skill.toLowerCase() as 'listening' | 'reading'][String(question.sourceNumber)] =
              answerKey.acceptedSets[0][index];
          });
        }
      }
    }
    groupsBySkill.set(section.skill, groups);
  }

  const perfect = await gradeVerifiedObjectiveAnswers({ testVersionId: version.id, answers: allAnswers });
  assert.deepEqual(perfect.skills.map((skill) => skill.rawScore), [40, 40]);
  const zero = await gradeVerifiedObjectiveAnswers({
    testVersionId: version.id,
    answers: {
      listening: Object.fromEntries(Object.keys(allAnswers.listening).map((number) => [number, '__wrong__'])),
      reading: Object.fromEntries(Object.keys(allAnswers.reading).map((number) => [number, '__wrong__'])),
    },
  });
  assert.deepEqual(zero.skills.map((skill) => skill.rawScore), [0, 0]);

  for (const skill of ['LISTENING', 'READING'] as const) {
    const groups = groupsBySkill.get(skill) ?? [];
    const answers = allAnswers[skill.toLowerCase() as 'listening' | 'reading'];
    for (const number of Object.keys(answers)) {
      assert.equal(scoreObjectiveGroups({ groups, answers: { [number]: answers[number] } }).rawScore, 1);
      assert.equal(scoreObjectiveGroups({ groups, answers: { ...answers, [number]: '__wrong__' } }).rawScore, 39);
    }
    for (const group of groups) {
      if (group.answerKey.strategy === 'PER_ITEM_EXACT') {
        for (const question of group.questions) {
          for (const accepted of group.answerKey.answersByStableKey[question.stableKey]) {
            assert.equal(scoreObjectiveGroups({ groups, answers: { [question.sourceNumber]: accepted } }).rawScore, 1);
          }
        }
      } else {
        for (const acceptedSet of group.answerKey.acceptedSets) {
          const permutations = [acceptedSet, [...acceptedSet].reverse()];
          for (const permutation of permutations) {
            const candidate = Object.fromEntries(group.questions.map((question, index) => [question.sourceNumber, permutation[index]]));
            assert.equal(scoreObjectiveGroups({ groups: [group], answers: candidate }).rawScore, group.maxMarks);
          }
          const duplicate = Object.fromEntries(group.questions.map((question) => [question.sourceNumber, acceptedSet[0]]));
          assert.ok(scoreObjectiveGroups({ groups: [group], answers: duplicate }).rawScore <= 1);
        }
      }
    }
  }
});

test.after(async () => {
  await disconnect?.();
});
