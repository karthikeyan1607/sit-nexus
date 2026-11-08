import type { CorporateIdentityProvider } from './identity';

/**
 * Fail-closed placeholder until CAT IT supplies its OIDC/gateway integration.
 * Do not replace this with trust in x-user, x-email, or client-supplied role headers.
 */
export class UnconfiguredCorporateIdentityProvider implements CorporateIdentityProvider {
  async authenticate() {
    return null;
  }
}

export function createCorporateIdentityProvider(): CorporateIdentityProvider {
  // A production implementation must validate issuer, audience, signature,
  // token expiry, session binding, and user authorization grants.
  return new UnconfiguredCorporateIdentityProvider();
}
