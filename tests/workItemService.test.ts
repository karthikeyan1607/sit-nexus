import assert from 'node:assert/strict';
import { test } from 'node:test';
import { WorkItemService } from '../backend/src/integrations/azureDevOps/workItemService';
import type { AzureClient } from '../backend/src/integrations/azureDevOps/azureClient';

type RequestCall = {
  endpoint: string;
  pat: string;
  options: {
    method?: string;
    body?: unknown;
    contentType?: string;
    includeProject?: boolean;
  };
};

function createService() {
  const calls: RequestCall[] = [];
  const client = {
    request: async (endpoint: string, pat: string, options: RequestCall['options']) => {
      calls.push({ endpoint, pat, options });
      return { id: 42, rev: 2, fields: { 'System.Id': 42, 'System.Title': 'Example', 'System.State': 'Closed' }, url: 'https://dev.azure.com/example' };
    }
  } as unknown as AzureClient;
  return { service: new WorkItemService(client), calls };
}

test('work-item updates send only requested fields to Azure DevOps', async () => {
  const { service, calls } = createService();
  await service.updateWorkItemFields(42, {
    'System.State': 'Closed',
    'Microsoft.VSTS.Scheduling.StoryPoints': 5,
  }, 'test-pat');

  assert.equal(calls.length, 1);
  assert.equal(calls[0].endpoint, '_apis/wit/workitems/42');
  assert.equal(calls[0].pat, 'test-pat');
  assert.equal(calls[0].options.method, 'PATCH');
  assert.equal(calls[0].options.contentType, 'application/json-patch+json');
  assert.equal(calls[0].options.includeProject, false);
  assert.deepEqual(calls[0].options.body, [
    { op: 'add', path: '/fields/System.State', value: 'Closed' },
    { op: 'add', path: '/fields/Microsoft.VSTS.Scheduling.StoryPoints', value: 5 },
  ]);
});

test('work-item update rejects an empty field set', async () => {
  const { service, calls } = createService();
  await assert.rejects(service.updateWorkItemFields(42, {}, 'test-pat'), /At least one supported Azure DevOps field/);
  assert.equal(calls.length, 0);
});

test('work-item update can change story points without changing state', async () => {
  const { service, calls } = createService();
  await service.updateWorkItemFields(42, { 'Microsoft.VSTS.Scheduling.StoryPoints': 3 }, 'test-pat');
  assert.deepEqual(calls[0].options.body, [
    { op: 'add', path: '/fields/Microsoft.VSTS.Scheduling.StoryPoints', value: 3 },
  ]);
});
