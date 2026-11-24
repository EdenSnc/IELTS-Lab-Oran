import assert from 'node:assert/strict';
import test from 'node:test';
import { activeAdminSection, adminNavigation, adminReturnPath } from '../../src/lib/admin/navigation';

test('founder tools share one route family and reviewers have no founder navigation', () => {
  assert.deepEqual(adminNavigation('en', 'ADMIN').map((link) => link.href), [
    '/en/admin', '/en/admin/applications', '/en/admin/acquisition', '/en/admin/operations', '/en/admin/speaking',
  ]);
  assert.deepEqual(adminNavigation('fr', 'CONTENT_REVIEWER'), []);
  assert.equal(activeAdminSection('/fr/admin/acquisition/poster/W17khKhvB-6o', 'fr'), 'posters');
  assert.equal(activeAdminSection('/fr/admin/', 'fr'), 'overview');
  assert.equal(activeAdminSection('/fr/admin/acquisitions', 'fr'), undefined);
});

test('sign-in and MFA resume only known workspace paths and application filters', () => {
  assert.equal(adminReturnPath('/fr/admin/acquisition/poster/W17khKhvB-6o'), '/fr/admin/acquisition/poster/W17khKhvB-6o');
  assert.equal(adminReturnPath('/en/admin/acquisition?view=trash'), '/en/admin/acquisition?view=trash');
  assert.equal(adminReturnPath('/en/admin/acquisition/poster/W17khKhvB-6o?design=98765432-1000-4000-8000-123456789abc'),
    '/en/admin/acquisition/poster/W17khKhvB-6o?design=98765432-1000-4000-8000-123456789abc');
  assert.equal(adminReturnPath('/ar/admin/applications?page=2&placement=W17khKhvB-6o&utm_source=external'),
    '/ar/admin/applications?placement=W17khKhvB-6o&page=2');
  assert.equal(adminReturnPath('/en/admin/applications?page=-1&placement=short'), '/en/admin/applications');
  assert.equal(adminReturnPath('/en/admin', 'fr'), undefined);
  for (const path of ['//example.invalid/en/admin', '/en/admin/../account', '/en/admin/%2e%2e/account', '/en/admin\\extra', '/en/admin#extra', '/en/admin/unknown']) {
    assert.equal(adminReturnPath(path), undefined, path);
  }
});
