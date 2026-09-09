import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import router from '../src/routes/index.js';
import { prisma } from '../src/utils/db.js';

let server;
let baseUrl;
const TEST_EMAIL = 'test.reset.user@example.com';
const INITIAL_PASSWORD = 'InitialPassword123!';
const NEW_PASSWORD = 'NewSecurePassword456@';

before(async () => {
  // Setup express test server instance
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api', router);

  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}/api`;
      resolve();
    });
  });

  // Ensure test user exists with initial password
  const hashedPassword = await bcrypt.hash(INITIAL_PASSWORD, 12);
  await prisma.user.upsert({
    where: { email: TEST_EMAIL },
    update: {
      password: hashedPassword,
      name: 'Reset Test User',
      role: 'receptionist',
    },
    create: {
      email: TEST_EMAIL,
      name: 'Reset Test User',
      password: hashedPassword,
      role: 'receptionist',
    },
  });

  // Clean up any old tokens
  const testUser = await prisma.user.findUnique({ where: { email: TEST_EMAIL } });
  if (testUser) {
    await prisma.passwordResetToken.deleteMany({ where: { userId: testUser.id } });
  }
});

after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  const testUser = await prisma.user.findUnique({ where: { email: TEST_EMAIL } });
  if (testUser) {
    await prisma.passwordResetToken.deleteMany({ where: { userId: testUser.id } });
    await prisma.user.delete({ where: { id: testUser.id } });
  }
  await prisma.$disconnect();
});

test('CASE 1: Request reset for registered email returns generic success & creates DB token', async () => {
  const res = await fetch(`${baseUrl}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-bypass-rate-limit': 'true' },
    body: JSON.stringify({ email: TEST_EMAIL }),
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.equal(data.message, 'If an account exists for this email, a password reset link has been sent.');

  // Verify token record in database
  const user = await prisma.user.findUnique({ where: { email: TEST_EMAIL } });
  const tokenRecord = await prisma.passwordResetToken.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
  });
  assert.ok(tokenRecord, 'A PasswordResetToken record must be created in PostgreSQL');
  assert.equal(tokenRecord.used, false);
  assert.ok(new Date(tokenRecord.expiresAt) > new Date());
});

test('CASE 2: Request reset for unregistered email returns generic response without revealing account absence', async () => {
  const res = await fetch(`${baseUrl}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-bypass-rate-limit': 'true' },
    body: JSON.stringify({ email: 'nonexistent-account-998877@example.com' }),
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.equal(data.message, 'If an account exists for this email, a password reset link has been sent.');
  assert.equal(data.error, undefined);
});

test('CASE 7: Password and confirm password mismatch returns validation error', async () => {
  const res = await fetch(`${baseUrl}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: 'dummy-token-abc',
      password: 'Password123!',
      confirmPassword: 'MismatchPassword456@',
    }),
  });

  assert.equal(res.status, 400);
  const data = await res.json();
  assert.equal(data.success, false);
  assert.match(data.error || data.message, /do not match/i);
});

test('CASE 8: Weak password returns validation error according to password rules', async () => {
  const res = await fetch(`${baseUrl}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: 'dummy-token-abc',
      password: 'weak',
      confirmPassword: 'weak',
    }),
  });

  assert.equal(res.status, 400);
  const data = await res.json();
  assert.equal(data.success, false);
  assert.match(data.error || data.message, /at least 8 characters/i);
});

test('CASE 6: Invalid / random reset token is rejected', async () => {
  const res = await fetch(`${baseUrl}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: 'completely-invalid-nonexistent-token-12345',
      password: NEW_PASSWORD,
      confirmPassword: NEW_PASSWORD,
    }),
  });

  assert.equal(res.status, 400);
  const data = await res.json();
  assert.equal(data.success, false);
  assert.match(data.message || data.error, /invalid or has expired/i);
});

test('CASE 4: Expired token is rejected', async () => {
  const user = await prisma.user.findUnique({ where: { email: TEST_EMAIL } });
  const rawToken = 'expired-token-' + crypto.randomBytes(16).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  // Insert token expired 10 minutes ago
  await prisma.passwordResetToken.create({
    data: {
      tokenHash,
      userId: user.id,
      expiresAt: new Date(Date.now() - 10 * 60 * 1000),
      used: false,
    },
  });

  const res = await fetch(`${baseUrl}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: rawToken,
      password: NEW_PASSWORD,
      confirmPassword: NEW_PASSWORD,
    }),
  });

  assert.equal(res.status, 400);
  const data = await res.json();
  assert.equal(data.success, false);
  assert.match(data.message || data.error, /invalid or has expired/i);
});

test('CASE 3: Valid reset token successfully resets the password in PostgreSQL', async () => {
  const user = await prisma.user.findUnique({ where: { email: TEST_EMAIL } });
  const rawToken = 'valid-token-' + crypto.randomBytes(16).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  // Create valid 30-minute token
  await prisma.passwordResetToken.create({
    data: {
      tokenHash,
      userId: user.id,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      used: false,
    },
  });

  const res = await fetch(`${baseUrl}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: rawToken,
      password: NEW_PASSWORD,
      confirmPassword: NEW_PASSWORD,
    }),
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.equal(data.message, 'Password reset successfully.');

  // Verify token is now marked as used
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
  assert.equal(record.used, true);

  // Verify new password in database verifies with bcrypt
  const updatedUser = await prisma.user.findUnique({ where: { id: user.id } });
  const isValid = await bcrypt.compare(NEW_PASSWORD, updatedUser.password);
  assert.equal(isValid, true, 'User password in DB must match the new hashed password');
});

test('CASE 5: Already-used token is rejected for reuse', async () => {
  const user = await prisma.user.findUnique({ where: { email: TEST_EMAIL } });
  const rawToken = 'used-token-' + crypto.randomBytes(16).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  await prisma.passwordResetToken.create({
    data: {
      tokenHash,
      userId: user.id,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      used: true, // Marked as used
    },
  });

  const res = await fetch(`${baseUrl}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: rawToken,
      password: 'AnotherPassword789#',
      confirmPassword: 'AnotherPassword789#',
    }),
  });

  assert.equal(res.status, 400);
  const data = await res.json();
  assert.equal(data.success, false);
  assert.match(data.message || data.error, /invalid or has expired/i);
});

test('CASE 9: Existing login succeeds with the NEW password', async () => {
  const res = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: TEST_EMAIL,
      password: NEW_PASSWORD,
    }),
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(data.token, 'Login response must provide a valid auth token');
  assert.equal(data.user.email, TEST_EMAIL);
});

test('CASE 10: Old password should no longer authenticate', async () => {
  const res = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: TEST_EMAIL,
      password: INITIAL_PASSWORD,
    }),
  });

  assert.equal(res.status, 401);
  const data = await res.json();
  assert.match(data.error, /invalid email or password/i);
});

test('CASE 11: Requesting multiple reset links safely invalidates previous tokens', async () => {
  // Request link 1
  await fetch(`${baseUrl}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-bypass-rate-limit': 'true' },
    body: JSON.stringify({ email: TEST_EMAIL }),
  });

  const user = await prisma.user.findUnique({ where: { email: TEST_EMAIL } });
  const firstTokenRecord = await prisma.passwordResetToken.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
  });

  // Request link 2
  await fetch(`${baseUrl}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-bypass-rate-limit': 'true' },
    body: JSON.stringify({ email: TEST_EMAIL }),
  });

  // The first token should be deleted/invalidated
  const checkFirst = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: firstTokenRecord.tokenHash },
  });
  assert.equal(checkFirst, null, 'Old token must be invalidated when a new reset request is made');

  const secondTokenRecord = await prisma.passwordResetToken.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
  });
  assert.ok(secondTokenRecord, 'New token record must exist in PostgreSQL');
});
