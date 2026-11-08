/**
 * SIT Nexus - Azure DevOps REST API Client
 * (Specification Section 17 & 18)
 * 
 * Centralized, secure HTTP client for communicating with Azure DevOps REST API (v7.1).
 * SECURITY RULES:
 * - NEVER log PAT or Authorization headers.
 * - NEVER expose PAT in error messages or API responses.
 * - Always use HTTPS.
 */

export interface AzureApiError {
  code: string;
  message: string;
  statusCode?: number;
}

export class AzureClient {
  private organization: string;
  private project: string;
  private apiVersion: string;

  constructor(organization: string, project: string, apiVersion = '7.1') {
    this.organization = organization.trim();
    this.project = project.trim();
    this.apiVersion = apiVersion;
  }

  public getBaseUrl(includeProject = true): string {
    const encodedOrg = encodeURIComponent(this.organization);
    if (includeProject && this.project) {
      return `https://dev.azure.com/${encodedOrg}/${encodeURIComponent(this.project)}`;
    }
    return `https://dev.azure.com/${encodedOrg}`;
  }

  public getAuthHeader(pat: string): string {
    const token = pat ? pat.trim() : '';
    return `Basic ${Buffer.from(`:${token}`).toString('base64')}`;
  }

  /**
   * Safe execution wrapper: handles timeout, status checking, and error formatting
   * without logging sensitive credential details.
   */
  public async request<T>(
    endpoint: string,
    pat: string,
    options: {
      method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
      body?: unknown;
      contentType?: string;
      includeProject?: boolean;
      timeoutMs?: number;
    } = {}
  ): Promise<T> {
    const {
      method = 'GET',
      body,
      contentType = 'application/json',
      includeProject = true,
      timeoutMs = 12000,
    } = options;

    const baseUrl = this.getBaseUrl(includeProject);
    const separator = endpoint.startsWith('/') ? '' : '/';
    const hasQuery = endpoint.includes('?');
    const apiParam = hasQuery ? `&api-version=${this.apiVersion}` : `?api-version=${this.apiVersion}`;
    const url = `${baseUrl}${separator}${endpoint}${apiParam}`;

    const headers: Record<string, string> = {
      Authorization: this.getAuthHeader(pat),
      Accept: 'application/json',
      'Content-Type': contentType,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 401) {
          throw {
            code: 'AZURE_AUTH_FAILED',
            message: 'Azure DevOps authentication failed. The Personal Access Token is invalid or expired.',
            statusCode: 401,
          };
        }

        if (response.status === 403) {
          throw {
            code: 'AZURE_PERMISSION_DENIED',
            message: 'Azure DevOps permission denied. The PAT lacks the required project or work-item scope.',
            statusCode: 403,
          };
        }

        if (response.status === 404) {
          throw {
            code: 'AZURE_PROJECT_NOT_FOUND',
            message: 'The requested Azure DevOps project or resource was not found.',
            statusCode: 404,
          };
        }

        // Do not return the upstream response body: it may contain internal
        // diagnostics or identifiers that should remain in server-side logs.
        throw {
          code: 'AZURE_API_ERROR',
          message: `Azure DevOps request failed with HTTP ${response.status}.`,
          statusCode: response.status,
        };
      }

      return (await response.json()) as T;
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      if (err && typeof err === 'object' && 'code' in err) {
        throw err;
      }
      if (err instanceof Error && err.name === 'AbortError') {
        throw {
          code: 'AZURE_API_ERROR',
          message: 'Azure DevOps request timed out after 12 seconds.',
          statusCode: 504,
        };
      }
      throw {
        code: 'AZURE_NETWORK_ERROR',
        message: 'Unable to reach Azure DevOps. Check the approved corporate network and proxy path.',
        statusCode: 503,
      };
    }
  }
}
