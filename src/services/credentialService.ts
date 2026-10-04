/**
 * Azure DevOps Credential Service (SIT Nexus Specification Section 3, 4, 5, 6)
 * 
 * Manages the manager's Azure DevOps Personal Access Token (PAT) in browser localStorage.
 * 
 * RULES:
 * - Stored in browser localStorage under key 'sit_nexus_ado_pat' to persist across restarts
 * - Preserved across browser close/reopen
 * - Cleared immediately when manager clicks [ Disconnect ] via localStorage.removeItem('sit_nexus_ado_pat')
 * - NEVER stored in PostgreSQL or server database
 * - NEVER logged to console, analytics, or error messages
 * - Masked for display in UI (e.g. ••••••••9918)
 */

const PAT_STORAGE_KEY = 'sit_nexus_ado_pat';
const CONNECTION_STORAGE_KEY = 'sit_nexus_ado_conn';

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
   * Retrieve active PAT from localStorage (with fallback migration from legacy sessionStorage)
   */
  public static getPat(): string | null {
    try {
      const localPat = localStorage.getItem(PAT_STORAGE_KEY);
      if (localPat) return localPat;

      // Migrate from legacy sessionStorage if present
      const sessionPat = sessionStorage.getItem(PAT_STORAGE_KEY);
      if (sessionPat) {
        localStorage.setItem(PAT_STORAGE_KEY, sessionPat);
        sessionStorage.removeItem(PAT_STORAGE_KEY);
        return sessionPat;
      }
    } catch {
      return null;
    }
    return null;
  }

  /**
   * Save validated PAT to localStorage
   */
  public static setPat(pat: string): void {
    if (!pat) return;
    try {
      localStorage.setItem(PAT_STORAGE_KEY, pat.trim());
      // Clean up legacy session storage if any
      sessionStorage.removeItem(PAT_STORAGE_KEY);
    } catch {
      console.warn('Local storage unavailable for PAT cache.');
    }
  }

  /**
   * Check if an active PAT is present in localStorage
   */
  public static hasPat(): boolean {
    const pat = this.getPat();
    return Boolean(pat && pat.length > 0);
  }

  /**
   * Remove PAT from localStorage (Disconnect)
   */
  public static clearPat(): void {
    try {
      localStorage.removeItem(PAT_STORAGE_KEY);
      sessionStorage.removeItem(PAT_STORAGE_KEY);
    } catch {
      // ignore
    }
  }

  /**
   * Get cached connection metadata
   */
  public static getConnection(): StoredConnectionState | null {
    try {
      const raw = localStorage.getItem(CONNECTION_STORAGE_KEY) || sessionStorage.getItem(CONNECTION_STORAGE_KEY);
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
      localStorage.setItem(CONNECTION_STORAGE_KEY, JSON.stringify(conn));
    } catch {
      // ignore
    }
  }

  /**
   * Clear connection metadata
   */
  public static clearConnection(): void {
    try {
      localStorage.removeItem(CONNECTION_STORAGE_KEY);
      sessionStorage.removeItem(CONNECTION_STORAGE_KEY);
    } catch {
      // ignore
    }
  }

  /**
   * Get masked representation of the active PAT for safe UI display (e.g. ••••••••9918)
   * Never exposes plain text in UI, API responses, or logs
   */
  public static getMaskedPat(): string | null {
    const pat = this.getPat();
    if (!pat) return null;
    const trimmed = pat.trim();
    if (trimmed.length <= 4) return '••••' + trimmed;
    return '••••••••' + trimmed.slice(-4);
  }

  /**
   * Disconnect completely: wipes PAT from localStorage, metadata, and resets UI state
   */
  public static disconnect(): void {
    this.clearPat();
    this.clearConnection();
  }
}
