import { Router, Request, Response } from 'express';
import { db, ManagerProfile } from '../db';
import { adoService } from '../adoService';
import { normalize } from '../services/normalize';

const router = Router();

// GET /api/auth/status - Get current active manager & connection status
router.get('/status', (req: Request, res: Response) => {
  const activeManager = db.getActiveManager();
  const dataSource = db.getDataSource();

  res.json({
    connected: true,
    dataSource,
    organization: activeManager.organization || 'caterpillar',
    project: activeManager.project || 'CAT Digital',
    areaPath: activeManager.areaPath || 'CAT Digital',
    activeManager: {
      id: activeManager.id,
      name: activeManager.name,
      email: activeManager.email,
      role: activeManager.role,
      region: activeManager.region || 'India',
      organization: activeManager.organization || 'caterpillar',
      project: activeManager.project || 'CAT Digital',
      areaPath: activeManager.areaPath || 'CAT Digital',
      isConnected: true,
      dataSource,
    }
  });
});

// POST /api/auth/mode - Switch between MOCK MODE and REAL AZURE DEVOPS MODE
router.post('/mode', (req: Request, res: Response) => {
  const { mode } = req.body;
  if (mode !== 'mock' && mode !== 'azure') {
    return res.status(400).json({ error: 'Mode must be either "mock" or "azure".' });
  }

  db.setDataSource(mode);
  res.json({
    success: true,
    message: `SIT Nexus switched to ${mode.toUpperCase()} MODE.`,
    dataSource: mode,
  });
});

// GET /api/auth/managers - List all manager profiles (Section 9)
router.get('/managers', (req: Request, res: Response) => {
  const activeManager = db.getActiveManager();
  const managers = db.getManagers().map((m) => ({
    id: m.id,
    name: m.name,
    email: m.email,
    role: m.role,
    region: m.region,
    organization: m.organization,
    project: m.project,
    isActive: m.id === activeManager.id,
  }));

  res.json({ managers, activeManagerId: activeManager.id });
});

// POST /api/auth/managers - Create a new manager profile
router.post('/managers', (req: Request, res: Response) => {
  const { name, email, region, organization, project } = req.body;
  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: 'Name is required for manager profile.' });
  }

  const now = new Date().toISOString();
  const newManager: ManagerProfile = {
    id: `mgr-${Date.now()}`,
    name: name.trim(),
    email: email ? email.trim() : `${normalize(name).replace(/\s+/g, '.')}@cat.com`,
    role: 'MANAGER',
    region: region ? region.trim() : 'India',
    organization: (organization || 'caterpillar').trim(),
    project: (project || 'CAT Digital').trim(),
    areaPath: (project || 'CAT Digital').trim(),
    is_active: true,
    created_at: now,
    updated_at: now,
  };

  db.upsertManager(newManager);
  db.setActiveManager(newManager.id);

  res.json({
    message: `Manager profile "${newManager.name}" created successfully.`,
    manager: newManager,
  });
});

// POST /api/auth/managers/switch - Switch active manager
router.post('/managers/switch', (req: Request, res: Response) => {
  const { managerId } = req.body;
  const switched = db.setActiveManager(managerId);
  if (!switched) {
    return res.status(404).json({ error: 'Manager profile not found.' });
  }

  res.json({
    message: `Switched active manager to ${switched.name}`,
    activeManager: switched,
  });
});

// POST /api/auth/connect - SprintSync validation endpoint (forwards to validation)
router.post('/connect', async (req: Request, res: Response) => {
  const { organization, project, pat } = req.body;
  const org = (organization || 'caterpillar').trim();
  const proj = (project || 'CAT Digital').trim();
  const token = pat ? String(pat).trim() : '';

  if (!token) {
    return res.status(400).json({ error: 'Personal Access Token (PAT) is required.' });
  }

  const validation = await adoService.validateConnection(org, proj, token);
  if (!validation.isValid) {
    return res.status(400).json({
      error: validation.message,
      permissions: validation.permissions,
    });
  }

  // Update manager metadata (NO PAT STORED)
  const activeManager = db.getActiveManager();
  activeManager.organization = org;
  activeManager.project = proj;
  activeManager.areaPath = proj;
  db.upsertManager(activeManager);

  res.json({
    success: true,
    message: validation.message,
    manager: {
      id: activeManager.id,
      name: activeManager.name,
      region: activeManager.region,
      organization: activeManager.organization,
      project: activeManager.project,
      areaPath: activeManager.areaPath,
      isConnected: true,
    },
    permissions: validation.permissions,
  });
});

export default router;
