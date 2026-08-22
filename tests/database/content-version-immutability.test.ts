import assert from 'node:assert/strict';
import test from 'node:test';
import { Client } from 'pg';

const databaseUrl = process.env.TEST_DATABASE_URL;

test('database rejects mutation/deletion of published content versions', {
  skip: databaseUrl ? false : 'TEST_DATABASE_URL is required for database tests',
}, async () => {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  await client.query('BEGIN');
  try {
    const source = await client.query<{ id: string }>(`
      INSERT INTO app_private."ContentSource"
        (provider, name, "createdAt", "updatedAt")
      VALUES ('OTHER', 'immutability test', NOW(), NOW())
      RETURNING id
    `);
    const created = await client.query<{ id: string }>(`
      WITH test AS (
        INSERT INTO app_private."Test"
          ("sourceId", title, variant, "createdAt", "updatedAt")
        VALUES ($1, 'immutability test', 'ACADEMIC', NOW(), NOW())
        RETURNING id
      )
      INSERT INTO app_private."TestVersion"
        ("testId", version, status, "contentHash", "publishedAt", "createdAt", "updatedAt")
      SELECT id, 1, 'PUBLISHED', 'immutability-test-hash', NOW(), NOW(), NOW()
      FROM test
      RETURNING id
    `, [source.rows[0].id]);
    const id = created.rows[0].id;

    await client.query('SAVEPOINT before_mutation');
    await assert.rejects(
      client.query('UPDATE app_private."TestVersion" SET notes = $2, "updatedAt" = NOW() WHERE id = $1', [id, 'changed']),
      (error: NodeJS.ErrnoException) => error.code === '55000',
    );
    await client.query('ROLLBACK TO SAVEPOINT before_mutation');
    await client.query(`
      UPDATE app_private."TestVersion"
      SET status = 'RETIRED', "retiredAt" = NOW(), "updatedAt" = NOW()
      WHERE id = $1
    `, [id]);
    await client.query('SAVEPOINT before_delete');
    await assert.rejects(
      client.query('DELETE FROM app_private."TestVersion" WHERE id = $1', [id]),
      (error: NodeJS.ErrnoException) => error.code === '55000',
    );
    await client.query('ROLLBACK TO SAVEPOINT before_delete');
  } finally {
    await client.query('ROLLBACK');
    await client.end();
  }
});
