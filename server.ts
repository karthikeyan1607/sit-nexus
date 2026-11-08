import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import connectionRoutes from './server/routes/connection';
import queryRoutes, { handleGetSprints, handleGetAreaPaths } from './server/routes/query';
import { db } from './server/db';
import { createBrowserAuditIdentity } from './server/corporate/browserAuditIdentity';


const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';
// Production audit history must use a CAT-managed persistent volume. This does not
// authenticate CAT employees; CAT network/VDI access restrictions are enforced by infrastructure.
if (isProduction && (!process.env.SIT_NEXUS_AUDIT_FILE || !path.isAbsolute(process.env.SIT_NEXUS_AUDIT_FILE))) {
  throw new Error('SIT Nexus production startup requires SIT_NEXUS_AUDIT_FILE to point to a CAT-managed persistent volume.');
}
const auditSessionSecret = process.env.SIT_NEXUS_AUDIT_SESSION_SECRET || (isProduction ? '' : 'sit-nexus-local-development-audit-secret-change-before-deploy');
if (isProduction && Buffer.byteLength(auditSessionSecret, 'utf8') < 32) {
  throw new Error('SIT_NEXUS_AUDIT_SESSION_SECRET must be configured with at least 32 bytes in production.');
}

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging (sanitized: never log tokens, passwords, or PAT values)
app.use((req: Request, res: Response, next: NextFunction) => {
  const timestamp = new Date().toISOString().slice(11, 19);
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// Connection validation is stateless. Resource Master and project settings remain browser-local.
app.use('/api/connection', connectionRoutes);
app.use('/api/query', queryRoutes);

// Direct specification endpoints. Iterations are fetched from Azure DevOps only;
// failures remain explicit and never fall back to the JSON store.
app.get('/api/sprints', handleGetSprints);

app.get('/api/area-paths', handleGetAreaPaths);

app.use('/api/audit', (req: Request, res: Response) => {
  const ownerId = String(res.locals.auditOwnerId || '');
  const history = db.getClosureAuditLog(ownerId);
  return res.json({ success: true, history, data: history });
});

app.use('/api/sprint-close', queryRoutes);

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'SIT Nexus API Engine',
    version: '2.4.0',
  });
});

// Safe Error Handling Middleware (Never exposes internal keys or tokens)
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('[API Error]:', err.message);
  res.status(500).json({
    error: err.message || 'An internal enterprise server error occurred.',
    timestamp: new Date().toISOString(),
  });
});

// Dev vs Production static handling
async function startServer() {
  if (!isProduction) {
    // Mount Vite middlewares in development
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SIT Nexus] Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start SIT Nexus server:', err);
  process.exit(1);
});
