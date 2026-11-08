/**
 * SIT Nexus - Azure DevOps Iteration Service
 *
 * Retrieves sprint iteration paths from the live Azure DevOps team settings API.
 * An empty result is a valid empty result. Connectivity and API failures are
 * allowed to propagate to the API layer; this service never invents iterations.
 */

import { AzureClient } from './azureClient';

export interface AzureIterationAttributes {
  startDate?: string;
  finishDate?: string;
  timeFrame?: 'past' | 'current' | 'future';
}

export interface AzureIteration {
  id: string;
  name: string;
  path: string;
  attributes?: AzureIterationAttributes;
  url?: string;
}

export interface IterationsListResponse {
  count: number;
  value: AzureIteration[];
}

export interface ProcessedSprint {
  id: string;
  name: string;
  path: string;
  isCurrent: boolean;
  startDate?: string;
  endDate?: string;
}

export class IterationService {
  private client: AzureClient;

  constructor(client: AzureClient) {
    this.client = client;
  }

  /** Retrieve sprints from live Azure DevOps team settings. */
  public async getIterations(pat: string): Promise<ProcessedSprint[]> {
    const response = await this.client.request<IterationsListResponse>(
      '_apis/work/teamsettings/iterations',
      pat,
      { method: 'GET' }
    );

    if (!response || !Array.isArray(response.value)) {
      throw {
        code: 'AZURE_INVALID_ITERATIONS_RESPONSE',
        message: 'Azure DevOps returned an invalid iterations response.',
        statusCode: 502,
      };
    }

    const now = new Date();
    const sprints: ProcessedSprint[] = response.value
      .filter((iteration) => {
        const pathAndName = `${iteration.path || ''} ${iteration.name || ''}`.toLowerCase();
        return !pathAndName.includes('sprint 19') &&
          !pathAndName.includes('sprint 18') &&
          !pathAndName.includes('2024');
      })
      .map((iteration) => {
        let isCurrent = iteration.attributes?.timeFrame === 'current';
        if (!isCurrent && iteration.attributes?.startDate && iteration.attributes?.finishDate) {
          const start = new Date(iteration.attributes.startDate);
          const end = new Date(iteration.attributes.finishDate);
          isCurrent = now >= start && now <= end;
        }

        return {
          id: iteration.id,
          name: iteration.name,
          path: iteration.path || iteration.name,
          isCurrent,
          startDate: iteration.attributes?.startDate,
          endDate: iteration.attributes?.finishDate,
        };
      });

    sprints.sort((a, b) => {
      if (a.isCurrent && !b.isCurrent) return -1;
      if (!a.isCurrent && b.isCurrent) return 1;
      return a.name.localeCompare(b.name, undefined, { numeric: true });
    });

    return sprints;
  }
}
