import assert from 'node:assert/strict';
import { test } from 'node:test';
import express from 'express';
import { createServer, type Server } from 'node:http';
import { isAuthorized, type CorporateIdentityProvider, type CorporatePrincipal } from '../server/corporate/identity';
import { createCorporateRoutes } from '../server/corporate/routes';

const india: CorporatePrincipal = {
  subject: 'verified-subject-a',
  userId: 'a',
  email: 'a@example.invalid',
  displayName: 'A',
  grants: [{ action: 'resources:read', region: 'INDIA', projectId: 'project-1' }]
};
const usa: CorporatePrincipal = {
  subject: 'verified-subject-b',
  userId: 'b',
  email: 'b@example.invalid',
  displayName: 'B',
  grants: [{ action: 'resources:read', region: 'USA', projectId: 'project-1' }]
};

async function withServer(provider?: CorporateIdentityProvider, run?: (baseUrl: string) => Promise<void>) {
  const app = express();
  app.use('/api/v1', provider ? createCorporateRoutes(provider) : createCorporateRoutes());
  const server: Server = createServer(app);
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Test server did not bind to a TCP port');
  try {
    await run?.(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

test('India manager cannot read USA resources', () => {
  assert.equal(isAuthorized(india, 'resources:read', 'USA', 'project-1'), false);
});
test('USA manager cannot read India resources', () => {
  assert.equal(isAuthorized(usa, 'resources:read', 'INDIA', 'project-1'), false);
});
test('manager can read explicitly granted region and project', () => {
  assert.equal(isAuthorized(india, 'resources:read', 'INDIA', 'project-1'), true);
});
test('manager cannot access another project', () => {
  assert.equal(isAuthorized(india, 'resources:read', 'INDIA', 'project-2'), false);
});
test('unscoped request does not bypass scoped grants', () => {
  assert.equal(isAuthorized(india, 'resources:read'), false);
});
test('read grant does not imply write grant', () => {
  assert.equal(isAuthorized(india, 'resources:write', 'INDIA', 'project-1'), false);
});

test('unconfigured corporate identity denies access with HTTP 401', async () => {
  await withServer(undefined, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/v1/me`);
    assert.equal(response.status, 401);
    const body = await response.json() as { error?: { code?: string } };
    assert.equal(body.error?.code, 'AUTH_REQUIRED');
  });
});

test('verified corporate identity is returned by /api/v1/me', async () => {
  const provider: CorporateIdentityProvider = { authenticate: async () => india };
  await withServer(provider, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/v1/me`);
    assert.equal(response.status, 200);
    const body = await response.json() as { user?: { id?: string }; permissions?: unknown[] };
    assert.equal(body.user?.id, 'a');
    assert.equal(body.permissions?.length, 1);
  });
});

test('identity provider outage returns HTTP 503 without bypassing authentication', async () => {
  const provider: CorporateIdentityProvider = { authenticate: async () => { throw new Error('private identity failure'); } };
  await withServer(provider, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/v1/me`);
    assert.equal(response.status, 503);
    const body = await response.json() as { error?: { code?: string } };
    assert.equal(body.error?.code, 'IDENTITY_UNAVAILABLE');
  });
});
