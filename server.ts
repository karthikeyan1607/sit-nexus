import { fileURLToPath } from 'url';
import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import dotenv from 'dotenv';
import authRoutes from './server/routes/auth';
import connectionRoutes from './server/routes/connection';
import resourceRoutes from './server/routes/resources';
import projectRoutes from './server/routes/projects';
import queryRoutes from './server/routes/query';
import { db } from './server/db';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging (sanitized: never log tokens, passwords, or PAT values)
app.use((req: Request, res: Response, next: NextFunction) => {
  const timestamp = new Date().toISOString().slice(11, 19);
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// API Routes
app.use('/api/connection', connectionRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/query', queryRoutes);

// Direct Specification Endpoints (Section 17: /api/sprints, /api/area-paths, /api/audit, /api/sprint-close)
app.use('/api/sprints', (req: Request, res: Response) => {
  res.json({ success: true, sprints: db.getAvailableSprints() });
});

app.use('/api/area-paths', (req: Request, res: Response) => {
  res.json({ success: true, areaPaths: db.getAvailableAreaPaths() });
});

app.use('/api/audit', (req: Request, res: Response) => {
  res.json({ success: true, history: db.getClosureAuditLog(), data: db.getClosureAuditLog() });
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
    const distPath = path.resolve(__dirname, 'dist');
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
