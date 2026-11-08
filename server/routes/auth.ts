import { Router } from 'express';
const router = Router();
router.get('/status', (_req, res) => res.status(410).json({
  success: false,
  error: { code: 'BROWSER_LOCAL_PROFILE', message: 'Manager connection profiles are stored independently in each browser.' },
}));
export default router;
