import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('Database Migrations: static inspection of active migration sequence and DDL structure', () => {
  const migrationsDir = path.resolve('supabase/migrations');
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();

  // Verify sequential timestamp ordering
  assert.ok(files.length >= 10, 'Expected at least 10 migration files');
  
  // Verify reconstruction baseline exists
  const baselineFile = files.find((f) => f.includes('reconstruction_baseline'));
  assert.ok(baselineFile, 'Reconstruction baseline must exist in active migrations');

  // Verify reconstruction baseline sits between pre-speaking placeholder invariants and speaking component
  const baselineIdx = files.indexOf(baselineFile!);
  const preSpeakingIdx = files.findIndex((f) => f.includes('app_private_invariants'));
  const speakingComponentIdx = files.findIndex((f) => f.includes('speaking_component'));

  assert.ok(
    preSpeakingIdx >= 0 && baselineIdx > preSpeakingIdx,
    'Reconstruction baseline must be ordered after historical pre-speaking invariants',
  );
  assert.ok(
    speakingComponentIdx >= 0 && baselineIdx < speakingComponentIdx,
    'Reconstruction baseline must be ordered before speaking_component migration',
  );

  // Verify baseline SQL content
  const baselineSql = fs.readFileSync(path.join(migrationsDir, baselineFile!), 'utf8');
  assert.ok(baselineSql.includes('CREATE SCHEMA IF NOT EXISTS app_private;'), 'Must create app_private schema');
  assert.ok(baselineSql.includes('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";'), 'Must create uuid-ossp extension');
  assert.ok(baselineSql.includes('CREATE EXTENSION IF NOT EXISTS pgcrypto;'), 'Must create pgcrypto extension');
  assert.ok(baselineSql.includes('CREATE EXTENSION IF NOT EXISTS btree_gist'), 'Must create btree_gist extension');

  // Verify core pre-speaking tables exist in reconstruction baseline
  const expectedTables = [
    'User',
    'AccessSession',
    'Test',
    'TestVersion',
    'TestSection',
    'TestPart',
    'Stimulus',
    'QuestionGroup',
    'Question',
    'AnswerKey',
    'AssessmentAttempt',
    'AttemptQuestion',
    'Response',
    'GradingRun',
    'AttemptSkillScore',
    'BandScale',
    'Product',
    'Order',
    'Entitlement',
  ];

  for (const table of expectedTables) {
    assert.ok(
      baselineSql.includes(`CREATE TABLE app_private."${table}"`),
      `Baseline must include table ${table}`,
    );
  }

  // Verify forward migration for obsolete AccessSession constraints exists
  const removeConstraintsFile = files.find((f) => f.includes('remove_obsolete_access_session_constraints'));
  assert.ok(removeConstraintsFile, 'Forward migration to remove obsolete AccessSession constraints must exist');

  // Verify BandScale seed migration exists
  const seedBandScaleFile = files.find((f) => f.includes('seed_band_scale_v1'));
  assert.ok(seedBandScaleFile, 'Seed migration for BandScale v1 must exist');
});
