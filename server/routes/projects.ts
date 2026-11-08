import { Router } from 'express';
const router = Router();
router.use((_req, res) => res.status(410).json({
  success: false,
  error: { code: 'BROWSER_LOCAL_PROJECT_SETTINGS', message: 'Project visibility settings are managed independently in each browser.' },
}));
export default router;
