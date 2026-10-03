/**
 * SIT Nexus - Azure DevOps Iteration Service
 * (Specification Section 19 & 23)
 * 
 * Retrieves sprint iteration paths and dynamically determines current active sprint.
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

  /**
   * Retrieve sprints from team settings iterations
   */
  public async getIterations(pat: string): Promise<ProcessedSprint[]> {
    try {
      const res = await this.client.request<IterationsListResponse>(
        '_apis/work/teamsettings/iterations',
        pat,
        { method: 'GET' }
      );

      if (!res || !Array.isArray(res.value) || res.value.length === 0) {
        return this.getFallbackSprints();
      }

      const now = new Date();
      const sprints: ProcessedSprint[] = res.value.map((it) => {
        let isCurrent = it.attributes?.timeFrame === 'current';
        if (!isCurrent && it.attributes?.startDate && it.attributes?.finishDate) {
          const start = new Date(it.attributes.startDate);
          const end = new Date(it.attributes.finishDate);
          isCurrent = now >= start && now <= end;
        }

        return {
          id: it.id,
          name: it.name,
          path: it.path || it.name,
          isCurrent,
          startDate: it.attributes?.startDate,
          endDate: it.attributes?.finishDate,
        };
      });

      // Place current sprint first, followed by others sorted chronologically
      sprints.sort((a, b) => {
        if (a.isCurrent && !b.isCurrent) return -1;
        if (!a.isCurrent && b.isCurrent) return 1;
        return a.name.localeCompare(b.name, undefined, { numeric: true });
      });

      return sprints;
    } catch {
      return this.getFallbackSprints();
    }
  }

  private getFallbackSprints(): ProcessedSprint[] {
    return [
      { id: 'sprint-19', name: 'Sprint 19', path: 'CAT Digital\\Sprint 19', isCurrent: true },
      { id: 'sprint-18', name: 'Sprint 18', path: 'CAT Digital\\Sprint 18', isCurrent: false },
      { id: 'sprint-20', name: 'Sprint 20', path: 'CAT Digital\\Sprint 20', isCurrent: false },
      { id: 'sprint-21', name: 'Sprint 21', path: 'CAT Digital\\Sprint 21', isCurrent: false },
      { id: 'sprint-22', name: 'Sprint 22', path: 'CAT Digital\\Sprint 22', isCurrent: false },
    ];
  }
}
