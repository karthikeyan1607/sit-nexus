import assert from 'node:assert/strict';
import { test } from 'node:test';
import { IterationService, type IterationsListResponse } from '../backend/src/integrations/azureDevOps/iterationService';
import type { AzureClient } from '../backend/src/integrations/azureDevOps/azureClient';

function serviceWith(request: () => Promise<IterationsListResponse>) {
  const client = { request } as unknown as AzureClient;
  return new IterationService(client);
}

test('an empty Azure DevOps iteration response remains empty', async () => {
  const service = serviceWith(async () => ({ count: 0, value: [] }));
  assert.deepEqual(await service.getIterations('test-pat'), []);
});

test('Azure DevOps network failure propagates instead of returning fabricated sprints', async () => {
  const failure = { code: 'AZURE_NETWORK_ERROR', message: 'network unavailable', statusCode: 503 };
  const service = serviceWith(async () => { throw failure; });
  await assert.rejects(service.getIterations('test-pat'), (error: unknown) => {
    assert.deepEqual(error, failure);
    return true;
  });
});

test('live Azure iterations are mapped and current sprint is sorted first', async () => {
  const service = serviceWith(async () => ({
    count: 2,
    value: [
      { id: '2', name: 'Sprint 12', path: 'Platform\\Sprint 12', attributes: { timeFrame: 'future' as const } },
      { id: '1', name: 'Sprint 11', path: 'Platform\\Sprint 11', attributes: { timeFrame: 'current' as const } }
    ]
  }));
  const result = await service.getIterations('test-pat');
  assert.equal(result.length, 2);
  assert.equal(result[0].id, '1');
  assert.equal(result[0].isCurrent, true);
});
