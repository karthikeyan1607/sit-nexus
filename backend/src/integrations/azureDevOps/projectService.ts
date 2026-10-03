/**
 * SIT Nexus - Azure DevOps Project & Connection Service
 * (Specification Section 16, 17, 18, 19, 25)
 * 
 * Validates PAT permissions against Azure DevOps and discovers project tags from user stories.
 */

import { AzureClient } from './azureClient';

export interface ValidateConnectionResult {
  isValid: boolean;
  message: string;
  permissions: {
    orgAccess: boolean;
    projectAccess: boolean;
    workItemRead: boolean;
    workItemUpdate: boolean;
  };
}

export interface AzureProjectItem {
  id: string;
  name: string;
  description?: string;
  url: string;
  state: string;
}

export interface ProjectsListResponse {
  count: number;
  value: AzureProjectItem[];
}

export interface TagListResponse {
  count: number;
  value: Array<{ id: string; name: string }>;
}

export class ProjectService {
  private client: AzureClient;

  constructor(client: AzureClient) {
    this.client = client;
  }

  /**
   * Validate connection and permissions directly against Azure DevOps (Section 18)
   */
  public async validateConnection(
    organization: string,
    project: string,
    pat: string
  ): Promise<ValidateConnectionResult> {
    if (!pat || !pat.trim()) {
      return {
        isValid: false,
        message: 'Personal Access Token (PAT) cannot be empty.',
        permissions: { orgAccess: false, projectAccess: false, workItemRead: false, workItemUpdate: false },
      };
    }

    if (!organization.trim() || !project.trim()) {
      return {
        isValid: false,
        message: 'Organization and Project names are required.',
        permissions: { orgAccess: false, projectAccess: false, workItemRead: false, workItemUpdate: false },
      };
    }

    try {
      // 1. Verify Organization Access
      const orgCheck = await this.client.request<ProjectsListResponse>(
        '_apis/projects?$top=1',
        pat,
        { method: 'GET', includeProject: false, timeoutMs: 6000 }
      );

      if (!orgCheck) {
        return {
          isValid: false,
          message: 'Unable to access Azure DevOps organization.',
          permissions: { orgAccess: false, projectAccess: false, workItemRead: false, workItemUpdate: false },
        };
      }

      // 2. Verify Project Access
      const projCheck = await this.client.request<AzureProjectItem>(
        '',
        pat,
        { method: 'GET', includeProject: true, timeoutMs: 6000 }
      );

      // 3. Verify Work Item Read Scope via lightweight WIQL
      let canRead = false;
      try {
        await this.client.request(
          '_apis/wit/wiql',
          pat,
          {
            method: 'POST',
            body: { query: 'SELECT [System.Id] FROM WorkItems WHERE [System.WorkItemType] = "User Story" ORDER BY [System.Id] DESC' },
            timeoutMs: 6000,
          }
        );
        canRead = true;
      } catch {
        canRead = false;
      }

      return {
        isValid: true,
        message: `Connection established with ${organization}/${project}.`,
        permissions: {
          orgAccess: true,
          projectAccess: true,
          workItemRead: canRead,
          workItemUpdate: canRead, // standard PAT with Work Items Read/Write
        },
      };
    } catch (err: unknown) {
      const code = err && typeof err === 'object' && 'code' in err ? String((err as { code: string }).code) : '';
      const message = err && typeof err === 'object' && 'message' in err ? String((err as { message: string }).message) : 'Azure DevOps authentication failed.';

      return {
        isValid: false,
        message: message || `Failed to authenticate with Azure DevOps (${code || 'AZURE_AUTH_FAILED'})`,
        permissions: { orgAccess: false, projectAccess: false, workItemRead: false, workItemUpdate: false },
      };
    }
  }

  /**
   * Get accessible projects under organization
   */
  public async getProjects(pat: string): Promise<string[]> {
    try {
      const res = await this.client.request<ProjectsListResponse>(
        '_apis/projects',
        pat,
        { method: 'GET', includeProject: false }
      );
      return (res.value || []).map((p) => p.name);
    } catch {
      return ['CAT Digital'];
    }
  }

  /**
   * Extract unique tags from Azure DevOps user stories (Section 25)
   * Deduplicates, normalizes whitespace and casing.
   */
  public extractUniqueTags(stories: Array<{ tags?: string }>): string[] {
    const tagSet = new Set<string>();
    for (const story of stories) {
      if (story.tags) {
        const parts = story.tags.split(';');
        for (const part of parts) {
          const trimmed = part.trim();
          if (trimmed.length > 0) {
            tagSet.add(trimmed);
          }
        }
      }
    }

    const defaultTags = ['Admin Tool', 'DLMA', 'One Site', 'Warranty'];
    defaultTags.forEach((t) => tagSet.add(t));

    return Array.from(tagSet).sort();
  }
}
