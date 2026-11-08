import { Router, Request, Response } from 'express';
import { db, StoredStory, StoredClosureAudit, StoredClosureAuditDetail } from '../db';
import { adoService, QueryExecutionInput } from '../adoService';
import { StateTransitionService } from '../services/stateTransition';
import { IdentityMatcher, NormalizedResourceIdentity } from '../services/identityMatcher';
import { normalize, parseTags, matchesProjectTag } from '../services/normalize';

import { AzureClient, IterationService } from '../../backend/src/integrations/azureDevOps';

const router = Router();

// GET /api/query/sprints (or /api/sprints) - Retrieve available iteration paths (live ADO or verified standardized)
export async function handleGetSprints(req: Request, res: Response) {
  const pat = (req.headers['x-ado-pat'] as string) || (req.headers['authorization'] ? req.headers['authorization'].replace(/^Bearer\s+/i, '') : '');
  if (!pat?.trim()) {
    return res.status(401).json({
      success: false,
      error: { code: 'AZURE_DEVOPS_NOT_CONNECTED', message: 'Connect an individual Azure DevOps account before loading iterations.' }
    });
  }

  const activeManager = db.getActiveManager();
  const org = String(activeManager.organization || '').trim();
  const proj = String(activeManager.project || '').trim();
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


// GET /api/query/area-paths (or /api/area-paths) - Retrieve configurable Area Paths
router.get('/area-paths', (req: Request, res: Response) => {
  const areaPaths = db.getAvailableAreaPaths();
  res.json({ success: true, areaPaths });
});

// POST /api/query - Execute Azure DevOps sprint query
router.post('/', async (req: Request, res: Response) => {
  const { region, project, projectTag, sprint, iterationPath, areaPath } = req.body;
  const targetProjectTag = String(projectTag || project || 'All Projects').trim();
  const targetRegion = String(region || 'All').trim();
  const targetIteration = String(iterationPath || sprint || '').trim();

  const activeManager = db.getActiveManager();
  const resourceMaster = db.getResources() || [];
  const org = String(activeManager.organization || '').trim();
  const proj = String(activeManager.project || '').trim();
  const targetArea = String(areaPath || activeManager.areaPath || '').trim();

  // PAT is currently supplied by the legacy browser flow. Day 3 replaces this
  // with the authenticated user's server-side credential reference.
  const pat = (req.headers['x-ado-pat'] as string) ||
    (req.headers['authorization'] ? req.headers['authorization'].replace(/^Bearer\\s+/i, '') : '');

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
        name: activeManager.name,
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

// GET /api/query/stories - Retrieve all stories with optional filtering (Section 15)
router.get('/stories', (req: Request, res: Response) => {
  const { region, sprint, project, resource, state, search } = req.query;
  let filtered = db.getStories() || [];

  if (region && normalize(region) !== 'all') {
    filtered = filtered.filter((s) => normalize(s?.region) === normalize(region));
  }
  if (sprint && normalize(sprint) !== 'all') {
    filtered = filtered.filter((s) => normalize(s?.sprint) === normalize(sprint));
  }
  if (project && normalize(project) !== 'all' && normalize(project) !== 'all projects') {
    filtered = filtered.filter((s) => matchesProjectTag(s?.tags || s?.tag, s?.project, project));
  }
  if (resource) {
    const rQuery = normalize(resource);
    filtered = filtered.filter((s) => normalize(s?.assignedTo).includes(rQuery));
  }
  if (state && normalize(state) !== 'all') {
    filtered = filtered.filter((s) => normalize(s?.status) === normalize(state));
  }
  if (search) {
    const q = normalize(search);
    filtered = filtered.filter((s) => 
      normalize(s?.id).includes(q) ||
      normalize(s?.title).includes(q) ||
      normalize(s?.assignedTo).includes(q) ||
      normalize(s?.tag).includes(q) ||
      normalize(s?.project).includes(q)
    );
  }

  res.json({
    success: true,
    totalCount: filtered.length,
    stories: filtered,
  });
});

// PATCH /api/query/stories/:id - Update story status, points, notes
router.patch('/stories/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { status, storyPoints, standupNotes, blockedReason, isReviewedToday } = req.body;

  const updated = db.updateStory(id, {
    ...(status ? { status } : {}),
    ...(storyPoints !== undefined ? { storyPoints: Number(storyPoints) } : {}),
    ...(standupNotes !== undefined ? { standupNotes } : {}),
    ...(blockedReason !== undefined ? { blockedReason } : {}),
    ...(isReviewedToday !== undefined ? { isReviewedToday } : {}),
  });

  if (!updated) {
    return res.status(404).json({ error: `Story #${id} not found.` });
  }

  res.json({
    success: true,
    message: `Story #${id} updated in Azure DevOps backlog.`,
    story: updated,
  });
});

// -------------------------------------------------------------
// SPRINT CLOSURE MODULE ENDPOINTS (Sections 21 - 26)
// -------------------------------------------------------------

// POST /api/query/sprint-close/preview or /api/sprint-close/preview - Generate Preview Before Closure (Sections 1 - 14)
router.post(['/sprint-close/preview', '/preview'], async (req: Request, res: Response) => {
  const { sprint, iterationPath, areaPath, region, actionType = 'close_internal_review' } = req.body;
  const activeManager = db.getActiveManager();
  const resourceMaster = db.getResources() || [];

  const org = String(activeManager.organization || '').trim();
  const proj = String(activeManager.project || '').trim();
  const targetArea = String(areaPath || activeManager.areaPath || '').trim();
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
      managerCanUpdate: Boolean(activeManager.permissions?.workItemUpdate),
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
  const activeManager = db.getActiveManager();
  const resourceMaster = db.getResources() || [];

  // Permission Check
  if (!activeManager.permissions?.workItemUpdate) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'AZURE_PERMISSION_DENIED',
        message: 'Permission Denied: You do not have permission to close or update sprint stories in Azure DevOps.'
      }
    });
  }

  const org = String(activeManager.organization || '').trim();
  const proj = String(activeManager.project || '').trim();
  const targetArea = String(areaPath || activeManager.areaPath || '').trim();
  const targetIteration = String(iterationPath || sprint || '').trim();
  const targetRegion = String(region || 'All').trim();

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
        managerName: activeManager.name,
        managerId: activeManager.id,
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
  const history = db.getClosureAuditLog();
  res.json({
    success: true,
    history,
    totalCount: history.length,
  });
});

export default router;
