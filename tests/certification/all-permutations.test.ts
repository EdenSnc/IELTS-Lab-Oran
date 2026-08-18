import test from 'node:test';
import assert from 'node:assert/strict';
import prisma from '../../src/lib/prisma.ts';
import { decrypt } from '../../src/lib/crypto.ts';
import { gradeVerifiedObjectiveAnswers } from '../../src/lib/grading/objective-grading.ts';
import {
  oracleGradeSection,
} from './scoring-oracle.ts';
import type {
  OracleSection,
  OracleQuestionGroup,
} from './scoring-oracle.ts';

test('Phase F & G & H: All-Correct, All-Wrong, Single-Question Mutations, Accepted Variants, and Unordered Sets', async () => {
  const versions = await prisma.testVersion.findMany({
    where: { status: 'PUBLISHED' },
    include: {
      test: true,
      sections: {
        where: { skill: { in: ['LISTENING', 'READING'] } },
        orderBy: { displayOrder: 'asc' },
        include: {
          parts: {
            include: {
              questionGroups: {
                orderBy: { displayOrder: 'asc' },
                include: {
                  questions: { orderBy: { displayOrder: 'asc' } },
                  answerKey: true,
                },
              },
            },
          },
        },
      },
    },
  });

  assert.ok(versions.length > 0, 'At least one TestVersion must exist in database');

  for (const version of versions) {
    const listeningSection = version.sections.find((s) => s.skill === 'LISTENING');
    const readingSection = version.sections.find((s) => s.skill === 'READING');

    assert.ok(listeningSection, 'Listening section must exist');
    assert.ok(readingSection, 'Reading section must exist');

    // Build oracle sections and collect all official canonical and alternative answers
    const oracleListening: OracleSection = {
      skill: 'LISTENING',
      variant: version.test.variant,
      groups: [],
    };
    const oracleReading: OracleSection = {
      skill: 'READING',
      variant: version.test.variant,
      groups: [],
    };

    const canonicalAnswers: { listening: Record<string, string>; reading: Record<string, string> } = {
      listening: {},
      reading: {},
    };
    const allVariantsByQuestion: {
      listening: Record<number, string[]>;
      reading: Record<number, string[]>;
    } = {
      listening: {},
      reading: {},
    };
    const unorderedGroups: Array<{
      skill: 'listening' | 'reading';
      sourceNumbers: number[];
      acceptedSets: string[][];
    }> = [];

    for (const section of [listeningSection, readingSection]) {
      const isListening = section.skill === 'LISTENING';
      const targetOracle = isListening ? oracleListening : oracleReading;
      const targetAnswers = isListening ? canonicalAnswers.listening : canonicalAnswers.reading;
      const targetVariants = isListening ? allVariantsByQuestion.listening : allVariantsByQuestion.reading;
      const skillKey = isListening ? 'listening' : 'reading';

      for (const part of section.parts) {
        for (const group of part.questionGroups) {
          const keyRecord = group.answerKey;
          assert.ok(keyRecord, `AnswerKey must exist for group ${group.id}`);
          const parsedKey = JSON.parse(decrypt(keyRecord.encryptedPayload));

          const oracleGroup: OracleQuestionGroup = {
            questionType: group.questionType,
            scoringStrategy: group.scoringStrategy as OracleQuestionGroup['scoringStrategy'],
            maxMarks: group.maxMarks,
            maxWords: group.maxWords,
            allowNumbers: group.allowNumbers,
            rawAnswerInstruction: group.rawAnswerInstruction,
            questions: group.questions.map((q) => ({
              stableKey: q.stableKey,
              sourceNumber: q.sourceNumber,
              maxMarks: q.maxMarks,
            })),
            answerKeyPayload: parsedKey,
            normalization: (keyRecord.normalization as OracleQuestionGroup['normalization']) ?? {},
          };
          targetOracle.groups.push(oracleGroup);

          if (parsedKey.strategy === 'PER_ITEM_EXACT') {
            for (const q of group.questions) {
              if (q.sourceNumber !== null) {
                const variants = parsedKey.answersByStableKey[q.stableKey] ?? [];
                assert.ok(variants.length > 0, `Question ${q.sourceNumber} must have at least 1 accepted answer`);
                targetAnswers[String(q.sourceNumber)] = variants[0];
                targetVariants[q.sourceNumber] = variants;
              }
            }
          } else if (parsedKey.strategy === 'UNORDERED_EXACT_SET') {
            const sourceNums = group.questions.map((q) => q.sourceNumber!).filter(Boolean);
            unorderedGroups.push({
              skill: skillKey,
              sourceNumbers: sourceNums,
              acceptedSets: parsedKey.acceptedSets,
            });

            // For canonical all-correct, pick first accepted set
            const firstSet = parsedKey.acceptedSets[0] ?? [];
            for (let i = 0; i < sourceNums.length; i++) {
              if (firstSet[i]) {
                targetAnswers[String(sourceNums[i])] = firstSet[i];
              }
            }
          }
        }
      }
    }

    // -------------------------------------------------------------------------
    // TEST 1: ALL-CORRECT (40/40)
    // -------------------------------------------------------------------------
    const allCorrectResult = await gradeVerifiedObjectiveAnswers({
      testVersionId: version.id,
      answers: canonicalAnswers,
    });
    const oracleAllCorrectL = oracleGradeSection(oracleListening, canonicalAnswers.listening);
    const oracleAllCorrectR = oracleGradeSection(oracleReading, canonicalAnswers.reading);

    const lRes = allCorrectResult.skills.find((s) => s.skill === 'LISTENING')!;
    const rRes = allCorrectResult.skills.find((s) => s.skill === 'READING')!;

    assert.equal(lRes.rawScore, 40, 'Listening all-correct raw score must equal 40');
    assert.equal(lRes.maximumRawScore, 40, 'Listening maximumRawScore must equal 40');
    assert.equal(lRes.band, 9.0, 'Listening 40/40 must award band 9.0');
    assert.equal(oracleAllCorrectL.rawScore, 40);

    assert.equal(rRes.rawScore, 40, 'Reading all-correct raw score must equal 40');
    assert.equal(rRes.maximumRawScore, 40, 'Reading maximumRawScore must equal 40');
    assert.equal(rRes.band, 9.0, 'Reading 40/40 must award band 9.0');
    assert.equal(oracleAllCorrectR.rawScore, 40);

    // -------------------------------------------------------------------------
    // TEST 2: ALL-WRONG (0/40)
    // -------------------------------------------------------------------------
    const allWrongAnswers = {
      listening: Object.fromEntries(Array.from({ length: 40 }, (_, i) => [String(i + 1), 'WRONG_ANSWER_XYZ'])),
      reading: Object.fromEntries(Array.from({ length: 40 }, (_, i) => [String(i + 1), 'WRONG_ANSWER_XYZ'])),
    };
    const allWrongResult = await gradeVerifiedObjectiveAnswers({
      testVersionId: version.id,
      answers: allWrongAnswers,
    });
    const oracleAllWrongL = oracleGradeSection(oracleListening, allWrongAnswers.listening);
    const oracleAllWrongR = oracleGradeSection(oracleReading, allWrongAnswers.reading);

    const lWrongRes = allWrongResult.skills.find((s) => s.skill === 'LISTENING')!;
    const rWrongRes = allWrongResult.skills.find((s) => s.skill === 'READING')!;

    assert.equal(lWrongRes.rawScore, 0, 'Listening all-wrong raw score must equal 0');
    assert.equal(lWrongRes.band, 0.0, 'Listening 0/40 must award band 0.0');
    assert.equal(oracleAllWrongL.rawScore, 0);

    assert.equal(rWrongRes.rawScore, 0, 'Reading all-wrong raw score must equal 0');
    assert.equal(rWrongRes.band, 0.0, 'Reading 0/40 must award band 0.0');
    assert.equal(oracleAllWrongR.rawScore, 0);

    // -------------------------------------------------------------------------
    // TEST 3: SINGLE QUESTION WRONG (Q1 through Q40 each wrong -> 39/40)
    // -------------------------------------------------------------------------
    for (let q = 1; q <= 40; q++) {
      const singleWrongL = {
        listening: { ...canonicalAnswers.listening, [String(q)]: 'WRONG_TOKEN' },
        reading: canonicalAnswers.reading,
      };
      const resL = await gradeVerifiedObjectiveAnswers({
        testVersionId: version.id,
        answers: singleWrongL,
      });
      const scoredL = resL.skills.find((s) => s.skill === 'LISTENING')!;
      assert.equal(
        scoredL.rawScore,
        39,
        `Listening when only Q${q} is wrong must equal raw score 39`,
      );

      const singleWrongR = {
        listening: canonicalAnswers.listening,
        reading: { ...canonicalAnswers.reading, [String(q)]: 'WRONG_TOKEN' },
      };
      const resR = await gradeVerifiedObjectiveAnswers({
        testVersionId: version.id,
        answers: singleWrongR,
      });
      const scoredR = resR.skills.find((s) => s.skill === 'READING')!;
      assert.equal(
        scoredR.rawScore,
        39,
        `Reading when only Q${q} is wrong must equal raw score 39`,
      );
    }

    // -------------------------------------------------------------------------
    // TEST 4: SINGLE QUESTION CORRECT (Q1 through Q40 each only correct -> 1/40)
    // -------------------------------------------------------------------------
    for (let q = 1; q <= 40; q++) {
      const singleCorrectL = {
        listening: { [String(q)]: canonicalAnswers.listening[String(q)] },
        reading: {},
      };
      const resL = await gradeVerifiedObjectiveAnswers({
        testVersionId: version.id,
        answers: singleCorrectL,
      });
      const scoredL = resL.skills.find((s) => s.skill === 'LISTENING')!;
      assert.equal(
        scoredL.rawScore,
        1,
        `Listening when only Q${q} is correct must equal raw score 1`,
      );

      const singleCorrectR = {
        listening: {},
        reading: { [String(q)]: canonicalAnswers.reading[String(q)] },
      };
      const resR = await gradeVerifiedObjectiveAnswers({
        testVersionId: version.id,
        answers: singleCorrectR,
      });
      const scoredR = resR.skills.find((s) => s.skill === 'READING')!;
      assert.equal(
        scoredR.rawScore,
        1,
        `Reading when only Q${q} is correct must equal raw score 1`,
      );
    }

    // -------------------------------------------------------------------------
    // TEST 5: EVERY ACCEPTED ANSWER VARIANT
    // -------------------------------------------------------------------------
    for (const [qNumStr, variants] of Object.entries(allVariantsByQuestion.listening)) {
      const qNum = Number(qNumStr);
      for (const variant of variants) {
        const sub = { listening: { [String(qNum)]: variant }, reading: {} };
        const res = await gradeVerifiedObjectiveAnswers({
          testVersionId: version.id,
          answers: sub,
        });
        const scored = res.skills.find((s) => s.skill === 'LISTENING')!;
        assert.equal(
          scored.rawScore,
          1,
          `Listening Q${qNum} variant '${variant}' must be accepted as correct`,
        );
      }
    }

    for (const [qNumStr, variants] of Object.entries(allVariantsByQuestion.reading)) {
      const qNum = Number(qNumStr);
      for (const variant of variants) {
        const sub = { listening: {}, reading: { [String(qNum)]: variant } };
        const res = await gradeVerifiedObjectiveAnswers({
          testVersionId: version.id,
          answers: sub,
        });
        const scored = res.skills.find((s) => s.skill === 'READING')!;
        assert.equal(
          scored.rawScore,
          1,
          `Reading Q${qNum} variant '${variant}' must be accepted as correct`,
        );
      }
    }

    // -------------------------------------------------------------------------
    // TEST 6: OFFICIAL UNORDERED "IN EITHER ORDER" SETS & PERMUTATIONS
    // -------------------------------------------------------------------------
    for (const group of unorderedGroups) {
      assert.equal(group.sourceNumbers.length, 2, 'Paired unordered task expected 2 questions');
      const [qA, qB] = group.sourceNumbers;
      const acceptedSet = group.acceptedSets[0];
      const [optA, optB] = acceptedSet;

      // 1. Order A, B -> 2 marks
      const subAB = {
        listening: group.skill === 'listening' ? { [String(qA)]: optA, [String(qB)]: optB } : {},
        reading: group.skill === 'reading' ? { [String(qA)]: optA, [String(qB)]: optB } : {},
      };
      const resAB = await gradeVerifiedObjectiveAnswers({ testVersionId: version.id, answers: subAB });
      const scoredAB = resAB.skills.find((s) => s.skill.toLowerCase() === group.skill)!;
      assert.equal(scoredAB.rawScore, 2, 'Unordered set in canonical order A,B must earn 2 marks');

      // 2. Reversed Order B, A -> 2 marks (order independent)
      const subBA = {
        listening: group.skill === 'listening' ? { [String(qA)]: optB, [String(qB)]: optA } : {},
        reading: group.skill === 'reading' ? { [String(qA)]: optB, [String(qB)]: optA } : {},
      };
      const resBA = await gradeVerifiedObjectiveAnswers({ testVersionId: version.id, answers: subBA });
      const scoredBA = resBA.skills.find((s) => s.skill.toLowerCase() === group.skill)!;
      assert.equal(scoredBA.rawScore, 2, 'Unordered set in reversed order B,A must earn 2 marks');

      // 3. Partial correct A + wrong -> 1 mark
      const subAWrong = {
        listening: group.skill === 'listening' ? { [String(qA)]: optA, [String(qB)]: 'WRONG' } : {},
        reading: group.skill === 'reading' ? { [String(qA)]: optA, [String(qB)]: 'WRONG' } : {},
      };
      const resAWrong = await gradeVerifiedObjectiveAnswers({ testVersionId: version.id, answers: subAWrong });
      const scoredAWrong = resAWrong.skills.find((s) => s.skill.toLowerCase() === group.skill)!;
      assert.equal(scoredAWrong.rawScore, 1, 'Partial correct A + wrong must earn 1 mark');

      // 4. Partial correct wrong + B -> 1 mark
      const subWrongB = {
        listening: group.skill === 'listening' ? { [String(qA)]: 'WRONG', [String(qB)]: optB } : {},
        reading: group.skill === 'reading' ? { [String(qA)]: 'WRONG', [String(qB)]: optB } : {},
      };
      const resWrongB = await gradeVerifiedObjectiveAnswers({ testVersionId: version.id, answers: subWrongB });
      const scoredWrongB = resWrongB.skills.find((s) => s.skill.toLowerCase() === group.skill)!;
      assert.equal(scoredWrongB.rawScore, 1, 'Partial correct wrong + B must earn 1 mark');

      // 5. Duplicate A + A -> MUST NOT earn 2 marks (only 1 mark!)
      const subAA = {
        listening: group.skill === 'listening' ? { [String(qA)]: optA, [String(qB)]: optA } : {},
        reading: group.skill === 'reading' ? { [String(qA)]: optA, [String(qB)]: optA } : {},
      };
      const resAA = await gradeVerifiedObjectiveAnswers({ testVersionId: version.id, answers: subAA });
      const scoredAA = resAA.skills.find((s) => s.skill.toLowerCase() === group.skill)!;
      assert.equal(scoredAA.rawScore, 1, 'Duplicate answer A + A in both slots must only earn 1 mark, never 2');
    }
  }
});
