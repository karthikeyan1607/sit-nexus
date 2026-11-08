import { Router, Request, Response } from 'express';
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

  // Connection configuration is kept in the requesting browser; this endpoint only validates the supplied PAT.

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
 * Returns current Azure DevOps connection metadata
 */
router.get('/status', (_req: Request, res: Response) => {
  return res.status(410).json({
    success: false,
    error: { code: 'BROWSER_LOCAL_CONNECTION_STATE', message: 'Connection state is maintained independently in each browser.' },
  });
});

export default router;
