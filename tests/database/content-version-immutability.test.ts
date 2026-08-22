import assert from 'node:assert/strict';
import test from 'node:test';
import { Client } from 'pg';

const databaseUrl = process.env.TEST_DATABASE_URL;

test('published TestVersion descendants are immutable while DRAFT content remains editable', {
  skip: databaseUrl ? false : 'TEST_DATABASE_URL is required for database tests',
}, async () => {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  await client.query('BEGIN');
  let savepoint = 0;
  const rejected = async (sql: string, params: unknown[]) => {
    const name = `immutability_${savepoint++}`;
    await client.query(`SAVEPOINT ${name}`);
    await assert.rejects(client.query(sql, params), (error: NodeJS.ErrnoException) => error.code === '55000');
    await client.query(`ROLLBACK TO SAVEPOINT ${name}`);
  };
  try {
    const source = (await client.query<{ id: string }>(`
      INSERT INTO app_private."ContentSource" (provider, name, "createdAt", "updatedAt")
      VALUES ('OTHER', 'immutability test', NOW(), NOW()) RETURNING id
    `)).rows[0];
    const contentTest = (await client.query<{ id: string }>(`
      INSERT INTO app_private."Test" ("sourceId", title, variant, "createdAt", "updatedAt")
      VALUES ($1, 'immutability test', 'ACADEMIC', NOW(), NOW()) RETURNING id
    `, [source.id])).rows[0];
    const version = (await client.query<{ id: string }>(`
      INSERT INTO app_private."TestVersion" ("testId", version, status, "contentHash", "createdAt", "updatedAt")
      VALUES ($1, 1, 'DRAFT', 'immutability-test-hash', NOW(), NOW()) RETURNING id
    `, [contentTest.id])).rows[0];
    const section = (await client.query<{ id: string }>(`
      INSERT INTO app_private."TestSection" ("testVersionId", skill, "displayOrder", "timeLimitSeconds", "createdAt")
      VALUES ($1, 'READING', 1, 3600, NOW()) RETURNING id
    `, [version.id])).rows[0];
    const part = (await client.query<{ id: string }>(`
      INSERT INTO app_private."TestPart" ("testSectionId", "sourceKey", slot, "reviewStatus", "createdAt")
      VALUES ($1, 'part', 'READING_SECTION_1', 'VERIFIED', NOW()) RETURNING id
    `, [section.id])).rows[0];
    const asset = (await client.query<{ id: string }>(`
      INSERT INTO app_private."ContentAsset" (type, "storageKey", checksum, "mimeType", "reviewStatus", "createdAt")
      VALUES ('DIAGRAM', 'immutability/' || gen_random_uuid() || '.png', repeat('a', 64), 'image/png', 'VERIFIED', NOW()) RETURNING id
    `)).rows[0];
    const stimulus = (await client.query<{ id: string }>(`
      INSERT INTO app_private."Stimulus" ("testPartId", "assetId", "sourceKey", type, "displayOrder", "plainText", "reviewStatus", "createdAt")
      VALUES ($1, $2, 'passage', 'READING_PASSAGE', 1, 'original', 'VERIFIED', NOW()) RETURNING id
    `, [part.id, asset.id])).rows[0];
    const group = (await client.query<{ id: string }>(`
      INSERT INTO app_private."QuestionGroup" ("testPartId", "sourceKey", "displayOrder", "questionType", "responseKind", "scoringStrategy", "maxMarks", "reviewStatus", "createdAt")
      VALUES ($1, 'group', 1, 'SHORT_ANSWER', 'SHORT_TEXT', 'PER_ITEM_EXACT', 1, 'VERIFIED', NOW()) RETURNING id
    `, [part.id])).rows[0];
    const question = (await client.query<{ id: string }>(`
      INSERT INTO app_private."Question" ("questionGroupId", "stableKey", "sourceNumber", "displayOrder", "promptHtml", "maxMarks", "createdAt")
      VALUES ($1, 'q1', 1, 1, 'original prompt', 1, NOW()) RETURNING id
    `, [group.id])).rows[0];
    const answerKey = (await client.query<{ id: string }>(`
      INSERT INTO app_private."AnswerKey" ("questionGroupId", "encryptedPayload", "formatVersion", "sourceType", "reviewStatus", "createdAt", "updatedAt")
      VALUES ($1, 'ciphertext', 1, 'HUMAN_VERIFIED', 'VERIFIED', NOW(), NOW()) RETURNING id
    `, [group.id])).rows[0];
    await client.query(`INSERT INTO app_private."QuestionAsset" ("questionGroupId", "assetId", role) VALUES ($1, $2, 'PROMPT')`, [group.id, asset.id]);
    await client.query(`UPDATE app_private."TestVersion" SET status='PUBLISHED', "publishedAt"=NOW(), "updatedAt"=NOW() WHERE id=$1`, [version.id]);

    await rejected(`UPDATE app_private."Question" SET "maxMarks"=2 WHERE id=$1`, [question.id]);
    await rejected(`UPDATE app_private."Question" SET "promptHtml"='changed' WHERE id=$1`, [question.id]);
    await rejected(`UPDATE app_private."QuestionGroup" SET "scoringStrategy"='NOT_SCORED' WHERE id=$1`, [group.id]);
    await rejected(`UPDATE app_private."AnswerKey" SET "encryptedPayload"='changed', "updatedAt"=NOW() WHERE id=$1`, [answerKey.id]);
    await rejected(`UPDATE app_private."Stimulus" SET "plainText"='changed' WHERE id=$1`, [stimulus.id]);
    await rejected(`UPDATE app_private."Test" SET variant='GENERAL_TRAINING', "updatedAt"=NOW() WHERE id=$1`, [contentTest.id]);
    await rejected(`UPDATE app_private."ContentAsset" SET checksum=repeat('b', 64) WHERE id=$1`, [asset.id]);

    const draft = (await client.query<{ id: string }>(`
      INSERT INTO app_private."TestVersion" ("testId", version, status, "contentHash", "createdAt", "updatedAt")
      VALUES ($1, 2, 'DRAFT', 'draft-editable-hash', NOW(), NOW()) RETURNING id
    `, [contentTest.id])).rows[0];
    const draftSection = (await client.query<{ id: string }>(`
      INSERT INTO app_private."TestSection" ("testVersionId", skill, "displayOrder", "createdAt") VALUES ($1, 'READING', 1, NOW()) RETURNING id
    `, [draft.id])).rows[0];
    const draftPart = (await client.query<{ id: string }>(`
      INSERT INTO app_private."TestPart" ("testSectionId", "sourceKey", slot, "createdAt") VALUES ($1, 'draft', 'READING_SECTION_1', NOW()) RETURNING id
    `, [draftSection.id])).rows[0];
    const draftGroup = (await client.query<{ id: string }>(`
      INSERT INTO app_private."QuestionGroup" ("testPartId", "sourceKey", "displayOrder", "questionType", "responseKind", "scoringStrategy", "maxMarks", "createdAt")
      VALUES ($1, 'draft', 1, 'SHORT_ANSWER', 'SHORT_TEXT', 'PER_ITEM_EXACT', 1, NOW()) RETURNING id
    `, [draftPart.id])).rows[0];
    const draftQuestion = (await client.query<{ id: string }>(`
      INSERT INTO app_private."Question" ("questionGroupId", "stableKey", "displayOrder", "maxMarks", "createdAt") VALUES ($1, 'draft', 1, 1, NOW()) RETURNING id
    `, [draftGroup.id])).rows[0];
    const edited = await client.query(`UPDATE app_private."Question" SET "promptHtml"='editable' WHERE id=$1`, [draftQuestion.id]);
    assert.equal(edited.rowCount, 1);

    await client.query(`UPDATE app_private."TestVersion" SET status='RETIRED', "retiredAt"=NOW(), "updatedAt"=NOW() WHERE id=$1`, [version.id]);
    await rejected(`DELETE FROM app_private."TestVersion" WHERE id=$1`, [version.id]);
  } finally {
    await client.query('ROLLBACK');
    await client.end();
  }
});
