import type { Request, RequestHandler } from 'express';

/** The verified corporate identity; never constructed from request body/query. */
export type Region = 'INDIA' | 'USA' | 'EUROPE';
export type Permission = 'resources:read' | 'resources:write' | 'projects:read' | 'sprints:manage' | 'workitems:read' | 'workitems:update' | 'audit:read' | 'admin:manage';
export interface Grant {
  action: Permission;
  region?: Region;
  projectId?: string;
}
export interface CorporatePrincipal {
  subject: string;
  userId: string;
  email: string;
  displayName: string;
  grants: readonly Grant[];
}

/** An identity adapter must validate a CAT-approved SSO session or trusted gateway assertion. */
export interface CorporateIdentityProvider {
  authenticate(request: Request): Promise<CorporatePrincipal | null>;
}

export function requireCorporateIdentity(provider: CorporateIdentityProvider): RequestHandler {
  return (req, res, next) => {
    Promise.resolve()
      .then(() => provider.authenticate(req))
      .then((principal) => {
        if (!principal?.subject || !principal.userId) {
          res.status(401).json({ error: { code: 'AUTH_REQUIRED', message: 'Corporate sign-in required.' } });
          return;
        }
        res.locals.corporatePrincipal = principal;
        next();
      })
      .catch(() => res.status(503).json({ error: { code: 'IDENTITY_UNAVAILABLE', message: 'Corporate identity verification unavailable.' } }));
  };
}

export function getPrincipal(res: { locals: Record<string, unknown> }): CorporatePrincipal {
  const principal = res.locals.corporatePrincipal as CorporatePrincipal | undefined;
  if (!principal?.userId || !principal.subject) throw new Error('Verified corporate principal missing');
  return principal;
}

/** No role or region is implicitly trusted. Missing grants deny access. */
export function isAuthorized(principal: CorporatePrincipal, action: Permission, region?: Region, projectId?: string): boolean {
  return principal.grants.some((grant) =>
    grant.action === action &&
    (grant.region === undefined || (region !== undefined && grant.region === region)) &&
    (grant.projectId === undefined || (projectId !== undefined && grant.projectId === projectId))
  );
}

export function requirePermission(action: Permission, scope?: (req: Request) => { region?: Region; projectId?: string }): RequestHandler {
  return (req, res, next) => {
    const principal = res.locals.corporatePrincipal as CorporatePrincipal | undefined;
    if (!principal) {
      res.status(401).json({ error: { code: 'AUTH_REQUIRED', message: 'Corporate sign-in required.' } });
      return;
    }
    const { region, projectId } = scope?.(req) ?? {};
    if (!isAuthorized(principal, action, region, projectId)) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Access denied.' } });
      return;
    }
    next();
  };
}
