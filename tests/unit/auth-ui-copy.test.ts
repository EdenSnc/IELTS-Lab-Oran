import assert from 'node:assert/strict';
import test from 'node:test';
import { authCopyForLocale, authErrorMessage } from '../../src/components/auth/auth-copy';

test('account authentication copy follows the active locale', () => {
  assert.equal(authCopyForLocale('en').modes['sign-in'].submit, 'Sign in');
  assert.equal(authCopyForLocale('fr').modes['sign-in'].submit, 'Se connecter');
  assert.equal(authCopyForLocale('ar').modes['sign-in'].submit, 'تسجيل الدخول');
});

test('authentication API codes are never shown raw to learners', () => {
  assert.equal(authErrorMessage('en', 'INVALID_CREDENTIALS'), 'Email or password is incorrect.');
  assert.doesNotMatch(authErrorMessage('fr', 'ACCESS_DENIED'), /ACCESS_DENIED/u);
  assert.doesNotMatch(authErrorMessage('ar', 'INVALID_REQUEST'), /INVALID_REQUEST/u);
});
