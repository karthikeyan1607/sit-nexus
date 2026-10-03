/**
 * SIT Nexus - Azure DevOps Classification Service
 * (Specification Section 19 & 24)
 * 
 * Retrieves configurable Area Path hierarchies dynamically from Azure DevOps.
 */

import { AzureClient } from './azureClient';

export interface ClassificationNode {
  id: number;
  identifier: string;
  name: string;
  structureType: string;
  hasChildren: boolean;
  children?: ClassificationNode[];
  path?: string;
}

export class ClassificationService {
  private client: AzureClient;

  constructor(client: AzureClient) {
    this.client = client;
  }

  /**
   * Retrieve area paths dynamically from Azure DevOps
   */
  public async getAreaPaths(pat: string): Promise<string[]> {
    try {
      const rootNode = await this.client.request<ClassificationNode>(
        '_apis/wit/classificationnodes/Areas?$depth=4',
        pat,
        { method: 'GET' }
      );

      const paths: string[] = [];
      const traverse = (node: ClassificationNode, currentPath: string) => {
        const nodePath = currentPath ? `${currentPath}\\${node.name}` : node.name;
        paths.push(nodePath);
        if (node.children && node.children.length > 0) {
          for (const child of node.children) {
            traverse(child, nodePath);
          }
        }
      };

      if (rootNode) {
        traverse(rootNode, '');
      }

      return paths.length > 0 ? paths : this.getFallbackAreaPaths();
    } catch {
      return this.getFallbackAreaPaths();
    }
  }

  private getFallbackAreaPaths(): string[] {
    return [
      'CAT Digital',
      'SIT',
      'SIT\\India',
      'SIT\\Europe',
      'SIT\\USA',
    ];
  }
}
