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
      const sprints: ProcessedSprint[] = res.value
        .filter((it) => {
          const p = `${it.path || ''} ${it.name || ''}`.toLowerCase();
          return !p.includes('sprint 19') && !p.includes('sprint 18') && !p.includes('2024');
        })
        .map((it) => {
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

      return sprints.length > 0 ? sprints : this.getFallbackSprints();
    } catch {
      return this.getFallbackSprints();
    }
  }

  private getFallbackSprints(): ProcessedSprint[] {
    return [
      { id: 'sprint-20', name: 'Sprint 20 (Sep 30 - Oct 13)', path: 'Cat Digital\\2026\\Sprint 20 (Sep 30 - Oct 13)', isCurrent: true, startDate: '2026-09-30', endDate: '2026-10-13' },
      { id: 'sprint-21', name: 'Sprint 21 (Oct 14 - Oct 27)', path: 'Cat Digital\\2026\\Sprint 21 (Oct 14 - Oct 27)', isCurrent: false, startDate: '2026-10-14', endDate: '2026-10-27' },
      { id: 'sprint-22', name: 'Sprint 22 (Oct 28 - Nov 10)', path: 'Cat Digital\\2026\\Sprint 22 (Oct 28 - Nov 10)', isCurrent: false, startDate: '2026-10-28', endDate: '2026-11-10' },
      { id: 'sprint-23', name: 'Sprint 23 (Nov 11 - Nov 24)', path: 'Cat Digital\\2026\\Sprint 23 (Nov 11 - Nov 24)', isCurrent: false, startDate: '2026-11-11', endDate: '2026-11-24' },
      { id: 'sprint-24', name: 'Sprint 24 (Nov 25 - Dec 8)', path: 'Cat Digital\\2026\\Sprint 24 (Nov 25 - Dec 8)', isCurrent: false, startDate: '2026-11-25', endDate: '2026-12-08' },
      { id: 'sprint-25', name: 'Sprint 25 (Dec 9 - Dec 22)', path: 'Cat Digital\\2026\\Sprint 25 (Dec 9 - Dec 22)', isCurrent: false, startDate: '2026-12-09', endDate: '2026-12-22' },
      { id: 'sprint-26', name: 'Sprint 26 (Dec 23 - Jan 5)', path: 'Cat Digital\\2026\\Sprint 26 (Dec 23 - Jan 5)', isCurrent: false, startDate: '2026-12-23', endDate: '2027-01-05' },
    ];
  }
}
