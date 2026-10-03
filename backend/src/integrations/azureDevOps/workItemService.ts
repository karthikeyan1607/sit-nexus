/**
 * SIT Nexus - Azure DevOps Work Item Service
 * (Specification Section 14, 15, 17, 20)
 * 
 * Handles WIQL queries, batch work item field retrieval, and work item state transitions.
 */

import { AzureClient } from './azureClient';

export interface AzureWorkItemFields {
  'System.Id': number;
  'System.Title': string;
  'System.AssignedTo'?: {
    displayName?: string;
    uniqueName?: string;
    mail?: string;
    descriptor?: string;
  } | string;
  'System.State': string;
  'System.Tags'?: string;
  'Microsoft.VSTS.Scheduling.StoryPoints'?: number;
  'System.IterationPath': string;
  'System.AreaPath': string;
  'System.ChangedDate': string;
}

export interface AzureWorkItem {
  id: number;
  rev: number;
  fields: AzureWorkItemFields;
  url: string;
}

export interface WiqlQueryResult {
  queryType: string;
  queryResultType: string;
  asOf: string;
  workItems: Array<{ id: number; url: string }>;
}

export interface WorkItemsBatchResult {
  count: number;
  value: AzureWorkItem[];
}

export const REQUIRED_WORK_ITEM_FIELDS = [
  'System.Id',
  'System.Title',
  'System.AssignedTo',
  'System.State',
  'System.Tags',
  'Microsoft.VSTS.Scheduling.StoryPoints',
  'System.IterationPath',
  'System.AreaPath',
  'System.ChangedDate',
];

export class WorkItemService {
  private client: AzureClient;

  constructor(client: AzureClient) {
    this.client = client;
  }

  /**
   * Execute WIQL query to locate candidate work items
   */
  public async queryUserStories(wiql: string, pat: string): Promise<number[]> {
    const result = await this.client.request<WiqlQueryResult>(
      '_apis/wit/wiql',
      pat,
      {
        method: 'POST',
        body: { query: wiql },
      }
    );
    return (result.workItems || []).map((w) => w.id);
  }

  /**
   * Batch retrieve work item fields (Section 14 & 20)
   * Avoids 1 API call per item. Batches in chunks of up to 100 items.
   */
  public async getWorkItemsBatch(
    ids: number[],
    pat: string,
    fields: string[] = REQUIRED_WORK_ITEM_FIELDS
  ): Promise<AzureWorkItem[]> {
    if (!ids || ids.length === 0) {
      return [];
    }

    const CHUNK_SIZE = 100;
    const allItems: AzureWorkItem[] = [];

    for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
      const chunk = ids.slice(i, i + CHUNK_SIZE);
      try {
        const res = await this.client.request<WorkItemsBatchResult>(
          '_apis/wit/workitemsbatch',
          pat,
          {
            method: 'POST',
            body: {
              ids: chunk,
              fields,
            },
          }
        );
        if (res && Array.isArray(res.value)) {
          allItems.push(...res.value);
        }
      } catch (err) {
        // Fallback to minimal core system fields if custom/scheduling fields failed
        const coreFields = [
          'System.Id',
          'System.Title',
          'System.AssignedTo',
          'System.State',
          'System.Tags',
          'System.IterationPath',
          'System.AreaPath',
          'System.ChangedDate',
        ];
        const fallbackRes = await this.client.request<WorkItemsBatchResult>(
          '_apis/wit/workitemsbatch',
          pat,
          {
            method: 'POST',
            body: {
              ids: chunk,
              fields: coreFields,
            },
          }
        );
        if (fallbackRes && Array.isArray(fallbackRes.value)) {
          allItems.push(...fallbackRes.value);
        }
      }
    }

    return allItems;
  }

  /**
   * Update work item state (Section 19 & 33)
   * Uses JSON Patch operation to update System.State.
   */
  public async updateWorkItemState(
    id: number,
    newState: string,
    pat: string
  ): Promise<AzureWorkItem> {
    const patchBody = [
      {
        op: 'add',
        path: '/fields/System.State',
        value: newState,
      },
    ];

    return await this.client.request<AzureWorkItem>(
      `_apis/wit/workitems/${id}`,
      pat,
      {
        method: 'PATCH',
        body: patchBody,
        contentType: 'application/json-patch+json',
        includeProject: false,
      }
    );
  }
}
