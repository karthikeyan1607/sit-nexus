/**
 * SprintSync-Style Credential Service (SIT Nexus Specification Section 3, 4, 5, 6)
 * 
 * Manages the manager's Azure DevOps Personal Access Token (PAT) for the active browser session.
 * 
 * SECURITY RULES:
 * - Stored exclusively in browser sessionStorage ('sit_nexus_ado_pat')
 * - NEVER stored in localStorage
 * - NEVER stored in PostgreSQL or database
 * - NEVER logged to console, analytics, or error messages
 * - Automatically discarded when browser tab/session terminates
 * - Cleared immediately when manager clicks [ Disconnect ]
 */

const PAT_SESSION_KEY = 'sit_nexus_ado_pat';
const CONNECTION_SESSION_KEY = 'sit_nexus_ado_conn';

export interface StoredConnectionState {
  connected: boolean;
  organization: string;
  project: string;
  canRead?: boolean;
  canWrite?: boolean;
  lastValidatedAt?: string;
}

export class CredentialService {
  /**
   * Retrieve active PAT from sessionStorage
   */
  public static getPat(): string | null {
    try {
      return sessionStorage.getItem(PAT_SESSION_KEY);
    } catch {
      return null;
    }
  }

  /**
   * Save validated PAT to sessionStorage for the active browser session
   */
  public static setPat(pat: string): void {
    if (!pat) return;
    try {
      sessionStorage.setItem(PAT_SESSION_KEY, pat.trim());
    } catch {
      console.warn('Session storage unavailable for temporary PAT cache.');
    }
  }

  /**
   * Check if an active PAT is present in sessionStorage
   */
  public static hasPat(): boolean {
    const pat = this.getPat();
    return Boolean(pat && pat.length > 0);
  }

  /**
   * Remove PAT from sessionStorage (Disconnect)
   */
  public static clearPat(): void {
    try {
      sessionStorage.removeItem(PAT_SESSION_KEY);
    } catch {
      // ignore
    }
  }

  /**
   * Get cached connection metadata
   */
  public static getConnection(): StoredConnectionState | null {
    try {
      const raw = sessionStorage.getItem(CONNECTION_SESSION_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch {
      // ignore
    }
    return null;
  }

  /**
   * Set cached connection metadata
   */
  public static setConnection(conn: StoredConnectionState): void {
    try {
      sessionStorage.setItem(CONNECTION_SESSION_KEY, JSON.stringify(conn));
    } catch {
      // ignore
    }
  }

  /**
   * Clear connection metadata
   */
  public static clearConnection(): void {
    try {
      sessionStorage.removeItem(CONNECTION_SESSION_KEY);
    } catch {
      // ignore
    }
  }

  /**
   * Get masked representation of the active PAT for safe UI display (e.g. ••••••••9918)
   * Never exposes plain text in UI, API responses, or logs (Section 6)
   */
  public static getMaskedPat(): string | null {
    const pat = this.getPat();
    if (!pat) return null;
    const trimmed = pat.trim();
    if (trimmed.length <= 4) return '••••' + trimmed;
    return '••••••••' + trimmed.slice(-4);
  }

  /**
   * Disconnect completely: wipes PAT, metadata, and resets UI state (Section 5)
   */
  public static disconnect(): void {
    this.clearPat();
    this.clearConnection();
  }
}
