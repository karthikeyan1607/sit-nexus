import { Router, Request, Response } from 'express';
import { db, StoredProjectTag } from '../db';
import { normalize } from '../services/normalize';

const router = Router();

// GET /api/projects - Get all project tags with visibility status
router.get('/', (req: Request, res: Response) => {
  const projectTags = db.getProjectTags();
  const visibleProjects = projectTags.filter((p) => !p.isHidden).map((p) => p.name);

  res.json({
    projects: projectTags,
    visibleProjects,
    totalCount: projectTags.length,
  });
});

// POST /api/projects - Add new project tag
router.post('/', (req: Request, res: Response) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Project name is required.' });
  }

  const trimmed = name.trim();
  const tags = db.getProjectTags();

  if (tags.some((t) => normalize(t?.name) === normalize(trimmed))) {
    return res.status(400).json({ error: `Project tag "${trimmed}" already exists.` });
  }

  const now = new Date().toISOString();
  const activeManager = db.getActiveManager();
  const newTag: StoredProjectTag = {
    id: `proj-${Date.now()}`,
    manager_id: activeManager.id,
    tag_value: trimmed,
    display_name: trimmed,
    name: trimmed,
    is_visible: true,
    isHidden: false,
    source: 'CUSTOM',
    discoveredFromAdo: false,
    created_at: now,
    updated_at: now,
  };

  db.setProjectTags([...tags, newTag]);
  res.json({ success: true, message: `Project tag "${trimmed}" added.`, project: newTag });
});

// POST /api/projects/toggle-hide - Toggle hide/unhide project tag
router.post('/toggle-hide', (req: Request, res: Response) => {
  const { name } = req.body;
  const tags = db.getProjectTags();
  const target = tags.find((t) => normalize(t?.name) === normalize(name));

  if (!target) {
    return res.status(404).json({ error: 'Project tag not found.' });
  }

  target.isHidden = !target.isHidden;
  db.setProjectTags([...tags]);

  res.json({
    success: true,
    message: `Project tag "${target.name}" is now ${target.isHidden ? 'hidden' : 'visible'}.`,
    project: target,
  });
});

// DELETE /api/projects/:name - Remove project tag
router.delete('/:name', (req: Request, res: Response) => {
  const { name } = req.params;
  const tags = db.getProjectTags().filter((t) => normalize(t?.name) !== normalize(name));
  db.setProjectTags(tags);
  res.json({ success: true, message: `Project tag "${name}" removed from SIT Nexus visibility.` });
});

// POST /api/projects/restore-all - Restore all projects to visible
router.post('/restore-all', (req: Request, res: Response) => {
  const tags = db.getProjectTags().map((t) => ({ ...t, isHidden: false }));
  db.setProjectTags(tags);
  res.json({ success: true, message: 'All project tags restored to visible.' });
});

export default router;
