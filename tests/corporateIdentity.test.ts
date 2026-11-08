import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isAuthorized, type CorporatePrincipal } from '../server/corporate/identity';

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
