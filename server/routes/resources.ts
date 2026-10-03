import { Router, Request, Response } from 'express';
import { db, StoredResource } from '../db';
import { INITIAL_RESOURCES } from '../../src/data/mockAdoData';
import { normalize } from '../services/normalize';

const router = Router();

// GET /api/resources - Get all resources with dynamic regional counts
router.get('/', (req: Request, res: Response) => {
  const resources = db.getResources() || [];

  const indiaCount = resources.filter((r) => normalize(r?.region) === 'india').length;
  const europeCount = resources.filter((r) => normalize(r?.region) === 'europe').length;
  const usaCount = resources.filter((r) => normalize(r?.region) === 'usa').length;

  res.json({
    success: true,
    totalCount: resources.length,
    resources,
    dynamicRegions: [
      { region: 'India', count: indiaCount },
      { region: 'Europe', count: europeCount },
      { region: 'USA', count: usaCount },
    ],
  });
});

// POST /api/resources/import - Import/upload Resource Master Excel/CSV data
router.post('/import', (req: Request, res: Response) => {
  const { resources } = req.body;

  if (!Array.isArray(resources) || resources.length === 0) {
    return res.status(400).json({ error: 'Valid resources array is required for import/replacement.' });
  }

  const sanitized: StoredResource[] = resources.map((r, i) => ({
    id: r?.id || `res-up-${Date.now()}-${i}`,
    name: String(r?.name || '').trim(),
    normalized_name: normalize(r?.name),
    region: String(r?.region || '').trim(),
    email: String(r?.email || r?.mail || '').trim(),
    normalized_email: normalize(r?.email || r?.mail),
    is_active: true,
    status: 'Active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));

  db.setResources(sanitized);

  res.json({
    success: true,
    message: `Resource Master imported and replaced with ${sanitized.length} resources.`,
    totalCount: sanitized.length,
    resources: sanitized,
  });
});

// POST /api/resources/replace - Replace entire Resource Master
router.post('/replace', (req: Request, res: Response) => {
  const { resources } = req.body;

  if (!Array.isArray(resources) || resources.length === 0) {
    return res.status(400).json({ error: 'Valid resources array is required for replacement.' });
  }

  const sanitized: StoredResource[] = resources.map((r, i) => {
    const name = String(r?.name || '').trim();
    const email = String(r?.email || r?.mail || '').trim();
    const now = new Date().toISOString();
    return {
      id: r?.id || `res-up-${Date.now()}-${i}`,
      name,
      normalized_name: normalize(name),
      region: String(r?.region || '').trim(),
      email,
      normalized_email: normalize(email),
      is_active: true,
      status: 'Active' as const,
      created_at: now,
      updated_at: now,
    };
  });

  db.setResources(sanitized);

  res.json({
    success: true,
    message: `Resource Master replaced with ${sanitized.length} resources.`,
    totalCount: sanitized.length,
  });
});

// POST /api/resources - Add single resource
router.post('/', (req: Request, res: Response) => {
  const { name, region, email } = req.body;
  if (!name || !region || !email) {
    return res.status(400).json({ error: 'Name, Region, and Email are required.' });
  }

  const trimmedName = String(name).trim();
  const trimmedEmail = String(email).trim();
  const now = new Date().toISOString();

  const newResource: StoredResource = {
    id: `res-${Date.now()}`,
    name: trimmedName,
    normalized_name: normalize(trimmedName),
    region: String(region).trim(),
    email: trimmedEmail,
    normalized_email: normalize(trimmedEmail),
    is_active: true,
    status: 'Active',
    created_at: now,
    updated_at: now,
  };

  const existing = db.getResources();
  db.setResources([newResource, ...existing]);

  res.json({
    success: true,
    message: `Resource ${newResource.name} added.`,
    resource: newResource,
  });
});

// PUT /api/resources/:id - Update resource
router.put('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, region, email, status } = req.body;

  const existing = db.getResources().find((r) => r.id === id);
  if (!existing) {
    return res.status(404).json({ error: 'Resource not found.' });
  }

  const now = new Date().toISOString();
  const updatedName = name !== undefined ? String(name).trim() : existing.name;
  const updatedEmail = email !== undefined ? String(email).trim() : existing.email;

  const updated: StoredResource = {
    ...existing,
    name: updatedName,
    normalized_name: normalize(updatedName),
    region: region !== undefined ? String(region).trim() : existing.region,
    email: updatedEmail,
    normalized_email: normalize(updatedEmail),
    status: status || existing.status,
    updated_at: now,
  };

  db.updateResource(updated);
  res.json({ success: true, resource: updated });
});

// DELETE /api/resources/:id - Delete resource
router.delete('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  db.deleteResource(id);
  res.json({ success: true, message: `Resource ${id} deleted.` });
});

// POST /api/resources/reset - Reset to factory baseline
router.post('/reset', (req: Request, res: Response) => {
  const now = new Date().toISOString();
  const baseline: StoredResource[] = INITIAL_RESOURCES.map((r, i) => ({
    id: r.id || `res-base-${i}`,
    name: r.name,
    normalized_name: normalize(r.name),
    region: r.region,
    email: r.email,
    normalized_email: normalize(r.email),
    is_active: true,
    status: 'Active',
    created_at: now,
    updated_at: now,
  }));
  db.setResources(baseline);
  res.json({
    success: true,
    message: `Reset Resource Master to factory baseline (${baseline.length} resources).`,
    totalCount: baseline.length,
  });
});

export default router;
