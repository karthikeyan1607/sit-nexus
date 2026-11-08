import { Router } from 'express';
const router = Router();
router.use((_req, res) => res.status(410).json({
  success: false,
  error: { code: 'BROWSER_LOCAL_RESOURCE_MASTER', message: 'Resource Master data is managed in the requesting browser and is not stored on the shared server.' },
}));
export default router;
