import { Router } from 'express';
import { createCorporateIdentityProvider } from './identityProvider';
import type { CorporateIdentityProvider } from './identity';
import { getPrincipal, requireCorporateIdentity } from './identity';

/** Versioned API foundation. Legacy APIs are not migrated by this module. */
export function createCorporateRoutes(identityProvider: CorporateIdentityProvider = createCorporateIdentityProvider()) {
  const router = Router();
  router.use(requireCorporateIdentity(identityProvider));
  router.get('/me', (_req, res) => {
    const principal = getPrincipal(res);
    res.json({
      user: {
        id: principal.userId,
        displayName: principal.displayName,
        email: principal.email
      },
      permissions: principal.grants,
      adoConnection: { connected: false }
    });
  });
  return router;
}
