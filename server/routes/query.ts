import { Router, Request, Response } from 'express';
import { db, StoredResource, StoredStory, StoredClosureAudit, StoredClosureAuditDetail } from '../db';
import { adoService, QueryExecutionInput } from '../adoService';
import { StateTransitionService } from '../services/stateTransition';
import { IdentityMatcher, NormalizedResourceIdentity } from '../services/identityMatcher';
import { normalize, parseTags, matchesProjectTag } from '../services/normalize';

import { AzureClient, IterationService, WorkItemService } from '../../backend/src/integrations/azureDevOps';

const router = Router();

const getBrowserOwnerId = (res: Response): string => String(res.locals.auditOwnerId || '').trim();
const isValidBrowserOwnerId = (value: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const getResourceMaster = (value: unknown): StoredResource[] =>
  Array.isArray(value) ? value.filter((item) => item && typeof item.name === 'string').map((item) => ({
    id: String(item.id || ''),
    name: String(item.name || '').trim(),
    region: String(item.region || '').trim(),
    email: String(item.email || '').trim(),
    normalized_name: String(item.name || '').trim().toLowerCase(),
    normalized_email: String(item.email || '').trim().toLowerCase(),
    status: item.status === 'Inactive' ? 'Inactive' : 'Active',
    is_active: item.status !== 'Inactive',
  })) : [];

// GET /api/query/sprints (or /api/sprints) - Retrieve live Azure DevOps iteration paths only
export async function handleGetSprints(req: Request, res: Response) {
  const pat = (req.headers['x-ado-pat'] as string) || (req.headers['authorization'] ? req.headers['authorization'].replace(/^Bearer\s+/i, '') : '');
  if (!pat?.trim()) {
    return res.status(401).json({
      success: false,
      error: { code: 'AZURE_DEVOPS_NOT_CONNECTED', message: 'Connect an individual Azure DevOps account before loading iterations.' }
    });
  }

  const org = String(req.query.organization || '').trim();
  const proj = String(req.query.project || '').trim();
  if (!org || !proj) {
    return res.status(409).json({
      success: false,
      error: { code: 'AZURE_DEVOPS_CONFIGURATION_MISSING', message: 'Azure DevOps organization and project are not configured.' }
    });
  }

  try {
    const client = new AzureClient(org, proj);
    const iterationService = new IterationService(client);
    const liveIterations = await iterationService.getIterations(pat.trim());
    const filteredIterations = (liveIterations || []).filter((it) => {
      const p = `${it.path || ''} ${it.name || ''}`.toLowerCase();
      return !p.includes('sprint 19') && !p.includes('sprint 18') && !p.includes('2024');
    });
    return res.json({
      success: true,
      source: 'ado-live',
      sprints: filteredIterations.map((it) => ({
        id: it.id,
        name: it.name,
        path: it.path,
        startDate: it.startDate,
        endDate: it.endDate,
        isCurrent: it.isCurrent,
      })),
    });
  } catch (err: unknown) {
    const failure = err as { statusCode?: number; code?: string };
    const statusCode = failure?.statusCode === 504 ? 504 : 502;
    return res.status(statusCode).json({
      success: false,
      error: {
        code: failure?.code || 'AZURE_ITERATION_LOOKUP_FAILED',
        message: statusCode === 504
          ? 'Azure DevOps iteration lookup timed out. Retry after checking connectivity.'
          : 'Unable to retrieve iterations from Azure DevOps. No fallback data was returned.'
      }
    });
  }
}

router.get('/sprints', handleGetSprints);


interface AzureClassificationNode {
  id: number;
  name: string;
  path: string;
  hasChildren?: boolean;
  children?: AzureClassificationNode[];
}

/** Retrieve the configured Area Path tree from the live Azure DevOps project. */
export async function handleGetAreaPaths(req: Request, res: Response) {
  const organization = String(req.query.organization || '').trim();
  const project = String(req.query.project || '').trim();
  const pat = (req.headers['x-ado-pat'] as string) ||
    (req.headers['authorization'] ? req.headers['authorization'].replace(/^Bearer\s+/i, '') : '');

  if (!pat.trim()) {
    return res.status(401).json({
      success: false,
      error: { code: 'AZURE_DEVOPS_NOT_CONNECTED', message: 'Connect Azure DevOps before loading Area Paths.' },
    });
  }
  if (!organization || !project) {
    return res.status(409).json({
      success: false,
      error: { code: 'AZURE_DEVOPS_CONFIGURATION_MISSING', message: 'Azure DevOps organization and project must be configured.' },
    });
  }

  try {
    const client = new AzureClient(organization, project);
    const root = await client.request<AzureClassificationNode>(
      '_apis/wit/classificationnodes/Areas?$depth=10',
      pat.trim(),
      { method: 'GET' },
    );

    const areaPaths: string[] = [];
    const visit = (node: AzureClassificationNode) => {
      if (node.path && !areaPaths.includes(node.path)) areaPaths.push(node.path);
      for (const child of node.children || []) visit(child);
    };
    visit(root);

    return res.json({ success: true, source: 'ado-live', areaPaths });
  } catch (err: unknown) {
    const failure = err as { statusCode?: number; code?: string };
    const statusCode = failure?.statusCode === 504 ? 504 : 502;
    return res.status(statusCode).json({
      success: false,
      error: {
        code: failure?.code || 'AZURE_AREA_PATH_LOOKUP_FAILED',
        message: statusCode === 504
          ? 'Azure DevOps Area Path lookup timed out.'
          : 'Unable to retrieve Area Paths from Azure DevOps. No fallback list was returned.',
      },
    });
  }
}

router.get('/area-paths', handleGetAreaPaths);

// POST /api/query - Execute Azure DevOps sprint query
router.post('/', async (req: Request, res: Response) => {
  const { region, projectTag, sprint, iterationPath, areaPath } = req.body;
  const targetProjectTag = String(projectTag || 'All Projects').trim();
  const targetRegion = String(region || 'All').trim();
  const targetIteration = String(iterationPath || sprint || '').trim();
  const resourceMaster = getResourceMaster(req.body?.resourceMaster);
  const org = String(req.body?.organization || '').trim();
  const proj = String(req.body?.project || '').trim();
  const targetArea = String(areaPath || '').trim();

  // The requesting browser supplies its own PAT. The backend never persists it.
  const pat = (req.headers['x-ado-pat'] as string) ||
    (req.headers['authorization'] ? req.headers['authorization'].replace(/^Bearer\s+/i, '') : '');

  if (!pat.trim()) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'AZURE_DEVOPS_NOT_CONNECTED',
        message: 'Connect Azure DevOps before requesting live sprint data.',
        statusCode: 401,
      },
      stories: [],
      resources: [],
      summary: {
        totalResources: 0,
        totalStories: 0,
        totalStoryPoints: 0,
        activePoints: 0,
        completedPoints: 0,
        blockedCount: 0,
      },
      durationMs: 0,
    });
  }
  if (!org || !proj) {
    return res.status(409).json({
      success: false,
      error: {
        code: 'AZURE_DEVOPS_CONFIGURATION_MISSING',
        message: 'Azure DevOps organization and project must be configured.',
        statusCode: 409,
      },
    });
  }
  if (!targetArea || !targetIteration) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'AZURE_QUERY_SCOPE_REQUIRED',
        message: 'Select both an Area Path and an Iteration Path before querying sprint work items.',
        statusCode: 400,
      },
    });
  }

  const queryInput: QueryExecutionInput = {
    region: targetRegion,
    projectTag: targetProjectTag,
    sprint: targetIteration,
    iterationPath: targetIteration,
    areaPath: targetArea,
  };

  try {
    const result = await adoService.executeLiveAzureQuery(
      queryInput,
      resourceMaster,
      org,
      proj,
      pat.trim()
    );

    const normalizedMaster: NormalizedResourceIdentity[] = resourceMaster
      .filter((resource) => resource && (resource.name || resource.email))
      .map((resource) => ({
        id: String(resource.id || ''),
        name: String(resource.name || ''),
        normalizedName: normalize(resource.normalized_name || resource.name),
        email: String(resource.email || ''),
        normalizedEmail: normalize(resource.normalized_email || resource.email),
        region: String(resource.region || 'Other'),
      }));

    const unmatchedWarnings: string[] = [];
    const checkedAssignees = new Set<string>();
    for (const story of result.stories) {
      const assigneeKey = normalize(story.assignedTo);
      if (assigneeKey && !checkedAssignees.has(assigneeKey)) {
        checkedAssignees.add(assigneeKey);
        const match = IdentityMatcher.matchAssignee(
          story.resourceEmail ? `${story.assignedTo} <${story.resourceEmail}>` : story.assignedTo,
          normalizedMaster
        );
        if (!match.isMatched && match.warning) unmatchedWarnings.push(match.warning);
      }
    }

    return res.json({
      success: true,
      dataSource: 'azure',
      manager: {
        name: String(req.body?.managerName || 'Local Manager'),
        organization: org,
        project: proj,
        isConnected: true,
      },
      ...result,
      warnings: unmatchedWarnings,
    });
  } catch (err: unknown) {
    const failure = err as { statusCode?: number; code?: string; message?: string };
    const statusCode = failure?.statusCode || 502;
    const errorCode = failure?.code || 'AZURE_QUERY_ERROR';
    const message = failure?.message || 'Failed to execute the live Azure DevOps query.';
    return res.status(statusCode).json({
      success: false,
      error: { code: errorCode, message, statusCode },
      diagnostics: {
        organization: org,
        project: proj,
        workItemType: 'User Story',
        areaPath: targetArea,
        iterationPath: targetIteration,
        region: targetRegion,
        projectTag: targetProjectTag,
        resourceMasterCount: resourceMaster.length,
        regionResourceCount: 0,
        generatedWiql: '',
        returnedWorkItemIdsCount: 0,
        workItemIds: [],
        retrievedWorkItemsCount: 0,
        matchedResourceCount: 0,
        finalStoryCount: 0,
        notes: 'Live Azure DevOps query failed; no mock or cached stories were returned.',
      },
    });
  }
});

// Legacy story snapshot endpoint intentionally returns Gone. Work-item details
// must be obtained through a live, scoped Azure DevOps query; stale JSON records
// are never presented as current work items.
router.get('/stories', (_req: Request, res: Response) => {
  return res.status(410).json({
    success: false,
    error: {
      code: 'LIVE_QUERY_REQUIRED',
      message: 'Stored story snapshots are disabled. Run a live Azure DevOps sprint query instead.',
    },
  });
});

// PATCH /api/query/stories/:id - Update supported work-item fields in Azure DevOps.
router.patch('/stories/:id', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id <= 0) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_WORK_ITEM_ID', message: 'A valid Azure DevOps work-item ID is required.' },
    });
  }

  const {
    status, storyPoints, organization: requestOrganization, project: requestProject,
    standupNotes, blockedReason, isReviewedToday,
  } = req.body ?? {};
  const unsupportedAnnotations = [
    ...(standupNotes !== undefined ? ['standupNotes'] : []),
    ...(blockedReason !== undefined ? ['blockedReason'] : []),
    ...(isReviewedToday !== undefined ? ['isReviewedToday'] : []),
  ];
  if (unsupportedAnnotations.length > 0) {
    return res.status(501).json({
      success: false,
      error: {
        code: 'STORY_ANNOTATIONS_NOT_MIGRATED',
        message: `These SIT Nexus-only fields belong in the manager's browser-local workspace: ${unsupportedAnnotations.join(', ')}. No changes were sent to Azure DevOps.`,
      },
    });
  }

  const fields: { 'System.State'?: string; 'Microsoft.VSTS.Scheduling.StoryPoints'?: number } = {};
  const allowedStates = new Set(['New', 'Active', 'Internal Review', 'Resolved', 'Closed', 'Blocked']);
  if (status !== undefined) {
    if (typeof status !== 'string' || !allowedStates.has(status)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_WORK_ITEM_STATE', message: 'The requested work-item state is not supported.' },
      });
    }
    fields['System.State'] = status;
  }
  if (storyPoints !== undefined) {
    const points = Number(storyPoints);
    if (!Number.isFinite(points) || points < 0 || points > 100) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_STORY_POINTS', message: 'Story points must be a number between 0 and 100.' },
      });
    }
    fields['Microsoft.VSTS.Scheduling.StoryPoints'] = points;
  }
  if (Object.keys(fields).length === 0) {
    return res.status(400).json({
      success: false,
      error: { code: 'NO_SUPPORTED_FIELDS', message: 'Provide a supported Azure DevOps field to update.' },
    });
  }

  const organization = String(requestOrganization || '').trim();
  const project = String(requestProject || '').trim();
  const pat = (req.headers['x-ado-pat'] as string) ||
    (req.headers['authorization'] ? req.headers['authorization'].replace(/^Bearer\s+/i, '') : '');

  if (!pat.trim()) {
    return res.status(401).json({
      success: false,
      error: { code: 'AZURE_DEVOPS_NOT_CONNECTED', message: 'Connect Azure DevOps before updating a work item.' },
    });
  }
  if (!organization || !project) {
    return res.status(409).json({
      success: false,
      error: { code: 'AZURE_DEVOPS_CONFIGURATION_MISSING', message: 'Azure DevOps organization and project must be configured.' },
    });
  }

  try {
    const client = new AzureClient(organization, project);
    const workItems = new WorkItemService(client);
    const updated = await workItems.updateWorkItemFields(id, fields, pat.trim());
    return res.json({
      success: true,
      message: `Azure DevOps work item #${id} updated successfully.`,
      story: {
        id: updated.id,
        title: updated.fields['System.Title'],
        status: updated.fields['System.State'],
        storyPoints: updated.fields['Microsoft.VSTS.Scheduling.StoryPoints'] ?? 0,
        lastUpdatedDate: updated.fields['System.ChangedDate'],
      },
    });
  } catch (err: unknown) {
    const failure = err as { statusCode?: number; code?: string; message?: string };
    const statusCode = failure?.statusCode || 502;
    return res.status(statusCode).json({
      success: false,
      error: {
        code: failure?.code || 'AZURE_WORK_ITEM_UPDATE_FAILED',
        message: failure?.message || 'Azure DevOps work-item update failed. No local mock update was applied.',
      },
    });
  }
});

// -------------------------------------------------------------
// SPRINT CLOSURE MODULE ENDPOINTS (Sections 21 - 26)
// -------------------------------------------------------------

// POST /api/query/sprint-close/preview or /api/sprint-close/preview - Generate Preview Before Closure (Sections 1 - 14)
router.post(['/sprint-close/preview', '/preview'], async (req: Request, res: Response) => {
  const { sprint, iterationPath, areaPath, region, actionType = 'close_internal_review' } = req.body;
  const resourceMaster = getResourceMaster(req.body?.resourceMaster);
  const org = String(req.body?.organization || '').trim();
  const proj = String(req.body?.project || '').trim();
  const targetArea = String(areaPath || '').trim();
  const targetIteration = String(iterationPath || sprint || '').trim();
  const targetRegion = String(region || 'All').trim();

  // Extract live PAT from header
  const pat = (req.headers['x-ado-pat'] as string) || (req.headers['authorization'] ? req.headers['authorization'].replace(/^Bearer\s+/i, '') : '');

  try {
    const previewResult = await adoService.executeSprintClosurePreview(
      {
        organization: org,
        project: proj,
        areaPath: targetArea,
        iterationPath: targetIteration,
        region: targetRegion,
      },
      resourceMaster,
      pat ? pat.trim() : ''
    );

    return res.json({
      success: true,
      sprint: targetIteration,
      iterationPath: targetIteration,
      areaPath: targetArea,
      region: targetRegion,
      actionType,
      targetNewState: 'Closed',
      affectedResourcesCount: previewResult.affectedResourcesCount,
      affectedStoriesCount: previewResult.affectedStoriesCount,
      totalStoryPoints: previewResult.totalStoryPoints,
      stories: previewResult.eligibleStories,
      allRetrievedStories: previewResult.stories,
      ineligibleStories: previewResult.ineligibleStories,
      diagnostics: previewResult.diagnostics,
      wiql: previewResult.wiql,
      managerCanUpdate: Boolean((await adoService.validateConnection(org, proj, pat ? pat.trim() : '')).permissions.workItemUpdate),
      dataSource: previewResult.dataSource,
    });
  } catch (err: unknown) {
    const errorObj = err as any;
    const statusCode = errorObj?.statusCode || 500;
    const errorCode = errorObj?.code || 'AZURE_CLOSURE_ERROR';
    const message = errorObj?.message || 'Failed to generate sprint closure preview from Azure DevOps.';
    return res.status(statusCode).json({
      success: false,
      error: {
        code: errorCode,
        message,
        statusCode,
      },
    });
  }
});

// POST /api/query/sprint-close/execute or /api/sprint-close/execute - Bulk Update Azure DevOps Stories (Sections 15 - 19)
router.post(['/sprint-close/execute', '/execute'], async (req: Request, res: Response) => {
  const { sprint, iterationPath, areaPath, region, storyIds = [] } = req.body;
  const resourceMaster = getResourceMaster(req.body?.resourceMaster);
  const clientId = getBrowserOwnerId(res);
  if (!isValidBrowserOwnerId(clientId)) {
    return res.status(400).json({
      success: false,
      error: { code: 'BROWSER_ID_REQUIRED', message: 'A valid browser installation identifier is required for private audit history.' },
    });
  }
  const org = String(req.body?.organization || '').trim();
  const proj = String(req.body?.project || '').trim();
  const targetArea = String(areaPath || '').trim();
  const targetIteration = String(iterationPath || sprint || '').trim();
  const targetRegion = String(region || 'All').trim();

  try {
    db.assertWritable();
  } catch {
    return res.status(503).json({
      success: false,
      error: { code: 'AUDIT_STORAGE_UNAVAILABLE', message: 'Sprint Closure is unavailable because persistent audit storage cannot be written. No Azure DevOps updates were attempted.' },
    });
  }

  const pat = (req.headers['x-ado-pat'] as string) || (req.headers['authorization'] ? req.headers['authorization'].replace(/^Bearer\s+/i, '') : '');

  try {
    const result = await adoService.executeSprintClosureUpdate(
      {
        organization: org,
        project: proj,
        areaPath: targetArea,
        iterationPath: targetIteration,
        region: targetRegion,
        storyIds: Array.isArray(storyIds) ? storyIds.map(Number) : [],
        managerName: String(req.body?.managerName || 'Local Manager'),
        managerId: clientId,
      },
      resourceMaster,
      pat.trim()
    );

    return res.json(result);
  } catch (err: unknown) {
    const errorObj = err as any;
    const statusCode = errorObj?.statusCode || 500;
    const message = errorObj?.message || 'Failed to execute closure against Azure DevOps.';
    return res.status(statusCode).json({
      success: false,
      error: {
        code: 'CLOSURE_EXECUTION_FAILED',
        message,
        statusCode,
      },
    });
  }
});

// GET /api/query/sprint-close/history or /api/sprint-close/history - Retrieve closure history & audit logs
router.get(['/sprint-close/history', '/history'], (req: Request, res: Response) => {
  const clientId = getBrowserOwnerId(res);
  if (!isValidBrowserOwnerId(clientId)) {
    return res.status(400).json({
      success: false,
      error: { code: 'BROWSER_ID_REQUIRED', message: "A valid browser installation identifier is required to read this browser's audit history." },
    });
  }
  const history = db.getClosureAuditLog(clientId);
  res.json({
    success: true,
    history,
    totalCount: history.length,
  });
});

export default router;
