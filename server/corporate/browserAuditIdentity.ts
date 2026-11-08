import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import type { RequestHandler } from 'express';

const COOKIE_NAME = 'sit_nexus_audit_owner';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

function signature(ownerId: string, secret: string): string {
  return createHmac('sha256', secret).update(ownerId).digest('hex');
}
function readCookie(requestCookie: string | undefined): string | null {
  if (!requestCookie) return null;
  const item = requestCookie.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE_NAME}=`));
  return item ? decodeURIComponent(item.slice(COOKIE_NAME.length + 1)) : null;
}
function verify(value: string | null, secret: string): string | null {
  if (!value) return null;
  const [ownerId, suppliedSignature, extra] = value.split('.');
  if (extra !== undefined || !ownerId || !suppliedSignature ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(ownerId) ||
      !/^[0-9a-f]{64}$/i.test(suppliedSignature)) return null;
  const expected = Buffer.from(signature(ownerId, secret), 'hex');
  const supplied = Buffer.from(suppliedSignature, 'hex');
  return expected.length === supplied.length && timingSafeEqual(expected, supplied) ? ownerId : null;
}

/**
 * Issues an HttpOnly signed browser-profile identifier for private audit history.
 * It is not a CAT employee identity or SSO replacement. A browser profile owns
 * its audit namespace; clearing cookies creates a new namespace.
 */
export function createBrowserAuditIdentity(secret: string, secureCookies: boolean): RequestHandler {
  if (!secret || Buffer.byteLength(secret, 'utf8') < 32) {
    throw new Error('SIT_NEXUS_AUDIT_SESSION_SECRET must contain at least 32 bytes.');
  }
  return (req, res, next) => {
    const existing = verify(readCookie(req.headers.cookie), secret);
    const ownerId = existing || randomUUID();
    res.locals.auditOwnerId = ownerId;
    if (!existing) {
      const value = `${ownerId}.${signature(ownerId, secret)}`;
      const attributes = [
        `${COOKIE_NAME}=${encodeURIComponent(value)}`,
        'Path=/',
        'HttpOnly',
        'SameSite=Strict',
        `Max-Age=${MAX_AGE_SECONDS}`,
      ];
      if (secureCookies) attributes.push('Secure');
      res.append('Set-Cookie', attributes.join('; '));
    }
    next();
  };
}
