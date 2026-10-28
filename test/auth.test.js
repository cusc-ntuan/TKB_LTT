import assert from 'node:assert/strict';
import test from 'node:test';

const previousUsername = process.env.ADMIN_USERNAME;
const previousPassword = process.env.ADMIN_PASSWORD;
const previousSecret = process.env.ADMIN_SESSION_SECRET;

process.env.ADMIN_USERNAME = 'admin';
process.env.ADMIN_PASSWORD = 'secret-password';
process.env.ADMIN_SESSION_SECRET = 'unit-test-secret';

const { createAdminSessionToken, isAdminConfigured, verifyAdminSessionToken } = await import('../src/lib/auth.js');

test('admin session token validates the expected username', () => {
  assert.equal(isAdminConfigured(), true);
  const token = createAdminSessionToken('admin');
  assert.equal(verifyAdminSessionToken(token), 'admin');
  assert.equal(verifyAdminSessionToken('invalid.token'), null);
});

test.after(() => {
  if (previousUsername === undefined) delete process.env.ADMIN_USERNAME;
  else process.env.ADMIN_USERNAME = previousUsername;

  if (previousPassword === undefined) delete process.env.ADMIN_PASSWORD;
  else process.env.ADMIN_PASSWORD = previousPassword;

  if (previousSecret === undefined) delete process.env.ADMIN_SESSION_SECRET;
  else process.env.ADMIN_SESSION_SECRET = previousSecret;
});
