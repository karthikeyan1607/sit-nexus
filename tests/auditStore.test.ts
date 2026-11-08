import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { AuditStore, type StoredClosureAudit } from '../server/db';

const record = (id: string, managerId: string): StoredClosureAudit => ({
  id,
  manager_id: managerId,
  manager_name: managerId,
  managerName: managerId,
  sprint: 'Cat Digital\\2026\\Sprint 22',
  region: 'India',
  area_path: 'Cat Digital\\Platform\\System-Integration Testing\\P - SIT Energizers',
  action: 'Internal Review → Closed',
  requested_count: 1,
  successful_count: 1,
  failed_count: 0,
  started_at: '2026-11-08T10:00:00.000Z',
  completed_at: '2026-11-08T10:00:05.000Z',
  status: 'SUCCESS',
  details: [],
});

test('audit records persist after store recreation and are isolated by browser owner', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'sit-nexus-audit-'));
  const file = path.join(directory, 'audit.json');
  try {
    const firstInstance = new AuditStore(file);
    firstInstance.assertWritable();
    firstInstance.addClosureAuditRecord(record('audit-a', 'browser-a'));
    firstInstance.addClosureAuditRecord(record('audit-b', 'browser-b'));

    const restartedInstance = new AuditStore(file);
    assert.deepEqual(restartedInstance.getClosureAuditLog('browser-a').map((item) => item.id), ['audit-a']);
    assert.deepEqual(restartedInstance.getClosureAuditLog('browser-b').map((item) => item.id), ['audit-b']);
    assert.deepEqual(restartedInstance.getClosureAuditLog('unknown-browser'), []);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('audit store refuses records without an owner', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'sit-nexus-audit-'));
  try {
    const store = new AuditStore(path.join(directory, 'audit.json'));
    assert.throws(() => store.addClosureAuditRecord(record('audit-no-owner', '')), /Audit owner is required/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
