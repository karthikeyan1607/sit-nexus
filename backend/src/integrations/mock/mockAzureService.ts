/**
 * SIT Nexus - Mock Azure DevOps Service
 * (Specification Section 27 & 28)
 * 
 * Implements the exact same interface as Azure DevOps services.
 * Allows frontend and backend to work seamlessly without live Azure DevOps credentials when:
 * DATA_SOURCE=mock
 */

import { ValidateConnectionResult } from '../azureDevOps/projectService';
import { ProcessedSprint } from '../azureDevOps/iterationService';
import { AzureWorkItem, REQUIRED_WORK_ITEM_FIELDS } from '../azureDevOps/workItemService';
import { INITIAL_STORIES } from '../../../../src/data/mockAdoData';

export class MockAzureService {
  /**
   * Validate connection mock: always succeeds for development unless explicitly malformed
   */
  public async validateConnection(
    organization: string,
    project: string,
    pat: string
  ): Promise<ValidateConnectionResult> {
    const isBlank = !pat || !pat.trim();
    if (isBlank) {
      return {
        isValid: false,
        message: 'Personal Access Token cannot be empty.',
        permissions: { orgAccess: false, projectAccess: false, workItemRead: false, workItemUpdate: false },
      };
    }

    return {
      isValid: true,
      message: `[MOCK MODE] Connection verified for ${organization || 'caterpillar'}/${project || 'CAT Digital'}.`,
      permissions: {
        orgAccess: true,
        projectAccess: true,
        workItemRead: true,
        workItemUpdate: true,
      },
    };
  }

  /**
   * Query candidate stories matching WIQL conditions in memory
   */
  public async queryUserStories(
    wiql: string,
    storiesList: typeof INITIAL_STORIES = INITIAL_STORIES
  ): Promise<number[]> {
    // Extract filters from WIQL or return matching IDs
    return storiesList.map((s) => s.id);
  }

  /**
   * Retrieve work items in Azure DevOps schema format
   */
  public async getWorkItemsBatch(
    ids: number[],
    storiesList: typeof INITIAL_STORIES = INITIAL_STORIES
  ): Promise<AzureWorkItem[]> {
    const idSet = new Set(ids);
    const matched = storiesList.filter((s) => idSet.has(s.id));

    return matched.map((s) => ({
      id: s.id,
      rev: 1,
      url: `https://dev.azure.com/caterpillar/CAT%20Digital/_workitems/edit/${s.id}`,
      fields: {
        'System.Id': s.id,
        'System.Title': s.title,
        'System.AssignedTo': {
          displayName: s.assignedTo,
          uniqueName: s.resourceEmail,
          mail: s.resourceEmail,
        },
        'System.State': s.status,
        'System.Tags': s.tag,
        'Microsoft.VSTS.Scheduling.StoryPoints': s.storyPoints,
        'System.IterationPath': `CAT Digital\\${s.sprint}`,
        'System.AreaPath': 'CAT Digital',
        'System.ChangedDate': s.lastUpdatedDate,
      },
    }));
  }

  /**
   * Update work item state in memory
   */
  public async updateWorkItemState(
    id: number,
    newState: string,
    storiesList: typeof INITIAL_STORIES
  ): Promise<AzureWorkItem | null> {
    const target = storiesList.find((s) => s.id === id);
    if (!target) return null;

    target.status = newState as typeof target.status;
    target.lastUpdatedDate = 'Today';

    return {
      id: target.id,
      rev: 2,
      url: `https://dev.azure.com/caterpillar/CAT%20Digital/_workitems/edit/${target.id}`,
      fields: {
        'System.Id': target.id,
        'System.Title': target.title,
        'System.AssignedTo': {
          displayName: target.assignedTo,
          uniqueName: target.resourceEmail,
          mail: target.resourceEmail,
        },
        'System.State': target.status,
        'System.Tags': target.tag,
        'Microsoft.VSTS.Scheduling.StoryPoints': target.storyPoints,
        'System.IterationPath': `CAT Digital\\${target.sprint}`,
        'System.AreaPath': 'CAT Digital',
        'System.ChangedDate': new Date().toISOString(),
      },
    };
  }

  /**
   * Return available sprints with current sprint placed first
   */
  public async getIterations(): Promise<ProcessedSprint[]> {
    return [
      { id: 'sprint-19', name: 'Sprint 19', path: 'CAT Digital\\Sprint 19', isCurrent: true, startDate: '2026-09-16', endDate: '2026-10-06' },
      { id: 'sprint-18', name: 'Sprint 18', path: 'CAT Digital\\Sprint 18', isCurrent: false, startDate: '2026-08-26', endDate: '2026-09-15' },
      { id: 'sprint-20', name: 'Sprint 20', path: 'CAT Digital\\Sprint 20', isCurrent: false, startDate: '2026-10-07', endDate: '2026-10-27' },
      { id: 'sprint-21', name: 'Sprint 21', path: 'CAT Digital\\Sprint 21', isCurrent: false, startDate: '2026-10-28', endDate: '2026-11-17' },
      { id: 'sprint-22', name: 'Sprint 22', path: 'CAT Digital\\Sprint 22', isCurrent: false, startDate: '2026-11-18', endDate: '2026-12-08' },
    ];
  }

  /**
   * Return configurable area paths
   */
  public async getAreaPaths(): Promise<string[]> {
    return [
      'CAT Digital',
      'SIT',
      'SIT\\India',
      'SIT\\Europe',
      'SIT\\USA',
    ];
  }

  /**
   * Return accessible projects
   */
  public async getProjects(): Promise<string[]> {
    return ['CAT Digital', 'CAT Logistics', 'Telematics'];
  }

  /**
   * Extract unique tags
   */
  public extractUniqueTags(stories: Array<{ tag?: string; tags?: string | string[] }>): string[] {
    const set = new Set<string>(['Admin Tool', 'DLMA', 'One Site', 'Warranty']);
    stories.forEach((s) => {
      if (Array.isArray(s.tags)) {
        s.tags.forEach((t) => {
          const trimmed = String(t).trim();
          if (trimmed) set.add(trimmed);
        });
      } else {
        const val = s.tag || s.tags;
        if (val) {
          String(val).split(/[;,]/).forEach((p) => {
            const trimmed = p.trim();
            if (trimmed) set.add(trimmed);
          });
        }
      }
    });
    return Array.from(set).sort();
  }
}
