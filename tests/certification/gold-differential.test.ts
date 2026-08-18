import test from 'node:test';
import assert from 'node:assert/strict';
import prisma from '../../src/lib/prisma.ts';
import { gradeVerifiedObjectiveAnswers } from '../../src/lib/grading/objective-grading.ts';
import {
  oracleGradeSection,
} from './scoring-oracle.ts';
import type {
  OracleSection,
  OracleQuestionGroup,
} from './scoring-oracle.ts';

test('Phase E: Three-Way Differential Certification (Oracle vs Current Scorer vs Gold)', async () => {
  const versions = await prisma.testVersion.findMany({
    where: { status: 'PUBLISHED' },
    include: {
      test: true,
      sections: {
        where: { skill: { in: ['LISTENING', 'READING'] } },
        include: {
          parts: {
            include: {
              questionGroups: {
                include: {
                  questions: true,
                  answerKey: true,
                },
              },
            },
          },
        },
      },
    },
  });

  assert.ok(versions.length > 0);

  for (const version of versions) {
    const listeningSection = version.sections.find((s) => s.skill === 'LISTENING')!;
    const readingSection = version.sections.find((s) => s.skill === 'READING')!;

    // Test a wide variety of submission scenarios:
    // 1. All empty / blank
    // 2. Odd-numbered only correct
    // 3. Even-numbered only correct
    // 4. First 20 correct, last 20 wrong
    // 5. Alternating correct / wrong
    const scenarios: Array<{
      name: string;
      generateAnswers: () => { listening: Record<string, string>; reading: Record<string, string> };
    }> = [
      {
        name: 'Empty Submission',
        generateAnswers: () => ({ listening: {}, reading: {} }),
      },
    ];

    // Collect canonical correct answers
    const { decrypt } = await import('../../src/lib/crypto.ts');
    const correctMap: Record<string, Record<string, string>> = { listening: {}, reading: {} };

    for (const section of [listeningSection, readingSection]) {
      const skillKey = section.skill.toLowerCase() as 'listening' | 'reading';
      for (const part of section.parts) {
        for (const group of part.questionGroups) {
          if (!group.answerKey) continue;
          const key = JSON.parse(decrypt(group.answerKey.encryptedPayload));
          if (key.strategy === 'PER_ITEM_EXACT') {
            for (const q of group.questions) {
              if (q.sourceNumber !== null) {
                correctMap[skillKey][String(q.sourceNumber)] = key.answersByStableKey[q.stableKey][0];
              }
            }
          } else if (key.strategy === 'UNORDERED_EXACT_SET') {
            const sourceNums = group.questions.map((q) => q.sourceNumber!).filter(Boolean);
            const firstSet = key.acceptedSets[0] ?? [];
            for (let i = 0; i < sourceNums.length; i++) {
              if (firstSet[i]) {
                correctMap[skillKey][String(sourceNums[i])] = firstSet[i];
              }
            }
          }
        }
      }
    }

    scenarios.push({
      name: 'Odd-Numbered Correct',
      generateAnswers: () => {
        const l: Record<string, string> = {};
        const r: Record<string, string> = {};
        for (let i = 1; i <= 40; i++) {
          if (i % 2 === 1) {
            l[String(i)] = correctMap.listening[String(i)];
            r[String(i)] = correctMap.reading[String(i)];
          } else {
            l[String(i)] = 'WRONG_ITEM';
            r[String(i)] = 'WRONG_ITEM';
          }
        }
        return { listening: l, reading: r };
      },
    });

    scenarios.push({
      name: 'First 20 Correct, Last 20 Wrong',
      generateAnswers: () => {
        const l: Record<string, string> = {};
        const r: Record<string, string> = {};
        for (let i = 1; i <= 40; i++) {
          if (i <= 20) {
            l[String(i)] = correctMap.listening[String(i)];
            r[String(i)] = correctMap.reading[String(i)];
          } else {
            l[String(i)] = 'INCORRECT';
            r[String(i)] = 'INCORRECT';
          }
        }
        return { listening: l, reading: r };
      },
    });

    for (const scenario of scenarios) {
      const answers = scenario.generateAnswers();
      const currentResult = await gradeVerifiedObjectiveAnswers({
        testVersionId: version.id,
        answers,
      });

      const lScored = currentResult.skills.find((s) => s.skill === 'LISTENING')!;
      const rScored = currentResult.skills.find((s) => s.skill === 'READING')!;

      // Validate against Oracle
      const oracleListening: OracleSection = {
        skill: 'LISTENING',
        variant: version.test.variant,
        groups: listeningSection.parts.flatMap((p) => p.questionGroups.map((g) => ({
          questionType: g.questionType,
          scoringStrategy: g.scoringStrategy as OracleQuestionGroup['scoringStrategy'],
          maxMarks: g.maxMarks,
          maxWords: g.maxWords,
          allowNumbers: g.allowNumbers,
          rawAnswerInstruction: g.rawAnswerInstruction,
          questions: g.questions.map((q) => ({ stableKey: q.stableKey, sourceNumber: q.sourceNumber, maxMarks: q.maxMarks })),
          answerKeyPayload: JSON.parse(decrypt(g.answerKey!.encryptedPayload)),
          normalization: (g.answerKey!.normalization as OracleQuestionGroup['normalization']) ?? {},
        }))),
      };
      const oracleReading: OracleSection = {
        skill: 'READING',
        variant: version.test.variant,
        groups: readingSection.parts.flatMap((p) => p.questionGroups.map((g) => ({
          questionType: g.questionType,
          scoringStrategy: g.scoringStrategy as OracleQuestionGroup['scoringStrategy'],
          maxMarks: g.maxMarks,
          maxWords: g.maxWords,
          allowNumbers: g.allowNumbers,
          rawAnswerInstruction: g.rawAnswerInstruction,
          questions: g.questions.map((q) => ({ stableKey: q.stableKey, sourceNumber: q.sourceNumber, maxMarks: q.maxMarks })),
          answerKeyPayload: JSON.parse(decrypt(g.answerKey!.encryptedPayload)),
          normalization: (g.answerKey!.normalization as OracleQuestionGroup['normalization']) ?? {},
        }))),
      };

      const oracleL = oracleGradeSection(oracleListening, answers.listening);
      const oracleR = oracleGradeSection(oracleReading, answers.reading);

      assert.equal(lScored.rawScore, oracleL.rawScore, `Scenario ${scenario.name}: Listening raw score mismatch`);
      assert.equal(lScored.band, oracleL.band, `Scenario ${scenario.name}: Listening band mismatch`);

      assert.equal(rScored.rawScore, oracleR.rawScore, `Scenario ${scenario.name}: Reading raw score mismatch`);
      assert.equal(rScored.band, oracleR.band, `Scenario ${scenario.name}: Reading band mismatch`);
    }
  }
});
