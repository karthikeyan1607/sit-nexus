import { Router, Request, Response } from 'express';
import { db } from '../db';

const router = Router();

/**
 * Transitional connection metadata only.
 * This legacy route is not corporate authentication; CAT SSO integration will
 * replace it before production is enabled.
 */
router.get('/status', (_req: Request, res: Response) => {
  const activeManager = db.getActiveManager();
  const connected = Boolean(activeManager?.isConnected);

  return res.json({
    connected,
    organization: activeManager?.organization || '',
    project: activeManager?.project || '',
    areaPath: activeManager?.areaPath || '',
    activeManager: {
      id: activeManager?.id || '',
      name: activeManager?.name || '',
      email: activeManager?.email || '',
      role: activeManager?.role || '',
      region: activeManager?.region || '',
      organization: activeManager?.organization || '',
      project: activeManager?.project || '',
      areaPath: activeManager?.areaPath || '',
      isConnected: connected,
    },
  });
});

export default router;
