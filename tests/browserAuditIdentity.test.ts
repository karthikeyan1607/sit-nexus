import assert from 'node:assert/strict';
import { createServer, type Server } from 'node:http';
import express from 'express';
import { test } from 'node:test';
import { createBrowserAuditIdentity } from '../server/corporate/browserAuditIdentity';

async function startServer(): Promise<{ server: Server; baseUrl: string }> {
  const app = express();
  app.use('/api', createBrowserAuditIdentity('test-audit-session-secret-with-at-least-32-bytes', false));
  app.get('/api/audit/session', (_req, res) => res.json({ ownerId: res.locals.auditOwnerId }));
  const server = createServer(app);
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Test server failed to bind');
  return { server, baseUrl: `http://127.0.0.1:${address.port}` };
}

test('signed browser audit identity remains stable for the same browser cookie', async () => {
  const { server, baseUrl } = await startServer();
  try {
    const first = await fetch(`${baseUrl}/api/audit/session`);
    const firstBody = await first.json() as { ownerId: string };
    const cookie = first.headers.get('set-cookie');
    assert.ok(cookie);
    assert.match(firstBody.ownerId, /^[0-9a-f-]{36}$/i);

    const second = await fetch(`${baseUrl}/api/audit/session`, { headers: { Cookie: cookie!.split(';')[0] } });
    const secondBody = await second.json() as { ownerId: string };
    assert.equal(secondBody.ownerId, firstBody.ownerId);
    assert.equal(second.headers.get('set-cookie'), null);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});

test('tampered browser audit cookie is replaced with a new owner', async () => {
  const { server, baseUrl } = await startServer();
  try {
    const first = await fetch(`${baseUrl}/api/audit/session`);
    const firstBody = await first.json() as { ownerId: string };
    const cookie = first.headers.get('set-cookie')!.split(';')[0];
    const tampered = cookie.replace(/.$/, cookie.endsWith('0') ? '1' : '0');

    const second = await fetch(`${baseUrl}/api/audit/session`, { headers: { Cookie: tampered } });
    const secondBody = await second.json() as { ownerId: string };
    assert.notEqual(secondBody.ownerId, firstBody.ownerId);
    assert.ok(second.headers.get('set-cookie'));
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});

test('short production audit secrets are rejected', () => {
  assert.throws(() => createBrowserAuditIdentity('too-short', true), /at least 32 bytes/);
});
