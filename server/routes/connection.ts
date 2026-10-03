import { Router, Request, Response } from 'express';
import { db } from '../db';
import { adoService } from '../adoService';

const router = Router();

/**
 * POST /api/connection/validate (Section 18)
 * 
 * Validates manager-entered Azure DevOps connection over HTTPS.
 * Verifies organization, project, and PAT permissions directly against Azure DevOps REST API.
 * 
 * CRITICAL SECURITY RULE:
 * - NEVER return the PAT in the response.
 * - NEVER store the PAT in PostgreSQL/database or .env.
 * - The browser temporarily holds the PAT in sessionStorage for the active session.
 */
router.post('/validate', async (req: Request, res: Response) => {
  const { organization, project, pat } = req.body;

  if (!organization || !String(organization).trim()) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'MISSING_ORGANIZATION',
        message: 'Organization name is required.'
      }
    });
  }

  if (!project || !String(project).trim()) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'MISSING_PROJECT',
        message: 'Project name is required.'
      }
    });
  }

  const token = pat ? String(pat).trim() : '';
  if (!token) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'MISSING_PAT',
        message: 'Personal Access Token (PAT) is required.'
      }
    });
  }

  const org = String(organization).trim();
  const proj = String(project).trim();

  // Validate with Azure DevOps REST API
  const validation = await adoService.validateConnection(org, proj, token);

  if (!validation.isValid) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'AZURE_AUTH_FAILED',
        message: validation.message || 'Azure DevOps authentication failed.'
      },
      data: {
        connected: false,
        organization: org,
        project: proj,
        canRead: false,
        canWrite: false
      }
    });
  }

  // Update default manager organization & project in database (NO PAT SAVED)
  const activeManager = db.getActiveManager();
  activeManager.organization = org;
  activeManager.project = proj;
  if (req.body.areaPath && String(req.body.areaPath).trim()) {
    activeManager.areaPath = String(req.body.areaPath).trim();
  }
  db.upsertManager(activeManager);

  // Return connection result - NEVER return the PAT!
  res.json({
    success: true,
    data: {
      connected: true,
      organization: org,
      project: proj,
      canRead: validation.permissions.workItemRead,
      canWrite: validation.permissions.workItemUpdate
    }
  });
});

/**
 * GET /api/connection/status (Section 19)
 * Returns current metadata and data source mode
 */
router.get('/status', (req: Request, res: Response) => {
  const activeManager = db.getActiveManager();
  const dataSource = db.getDataSource();

  res.json({
    success: true,
    data: {
      organization: activeManager.organization || 'caterpillar',
      project: activeManager.project || 'CAT Digital',
      areaPath: activeManager.areaPath || 'CAT Digital',
      dataSource,
      manager: {
        id: activeManager.id,
        name: activeManager.name,
        email: activeManager.email,
        role: activeManager.role,
        region: activeManager.region || 'All'
      }
    }
  });
});

/**
 * POST /api/connection/mode (Section 20 & 21: MOCK MODE vs REAL AZURE DEVOPS MODE)
 */
router.post('/mode', (req: Request, res: Response) => {
  const { mode } = req.body;
  if (mode !== 'mock' && mode !== 'azure') {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_MODE', message: 'Mode must be either "mock" or "azure".' }
    });
  }

  db.setDataSource(mode);
  res.json({
    success: true,
    data: {
      dataSource: mode,
      message: `SIT Nexus operating in ${mode === 'azure' ? 'REAL AZURE DEVOPS' : 'MOCK'} MODE.`
    }
  });
});

export default router;
