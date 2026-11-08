const PAT_STORAGE_KEY = 'sit_nexus_ado_pat';
const CONNECTION_STORAGE_KEY = 'sit_nexus_ado_conn';
const CLIENT_ID_STORAGE_KEY = 'sit_nexus_client_id';

export interface StoredConnectionState {
  connected: boolean;
  organization: string;
  project: string;
  areaPath?: string;
  canRead?: boolean;
  canWrite?: boolean;
  lastValidatedAt?: string;
}

export class CredentialService {
  public static getPat(): string | null {
    try {
      const pat = localStorage.getItem(PAT_STORAGE_KEY);
      if (pat) return pat;
      const legacy = sessionStorage.getItem(PAT_STORAGE_KEY);
      if (legacy) {
        localStorage.setItem(PAT_STORAGE_KEY, legacy);
        sessionStorage.removeItem(PAT_STORAGE_KEY);
        return legacy;
      }
    } catch { return null; }
    return null;
  }
  public static setPat(pat: string): void {
    if (!pat?.trim()) return;
    try {
      localStorage.setItem(PAT_STORAGE_KEY, pat.trim());
      sessionStorage.removeItem(PAT_STORAGE_KEY);
    } catch { throw new Error('Browser storage is unavailable. The Azure DevOps PAT was not saved.'); }
  }
  public static hasPat(): boolean { return Boolean(this.getPat()?.trim()); }
  public static clearPat(): void {
    try { localStorage.removeItem(PAT_STORAGE_KEY); sessionStorage.removeItem(PAT_STORAGE_KEY); } catch { /* ignore */ }
  }
  public static getConnection(): StoredConnectionState | null {
    try {
      const raw = localStorage.getItem(CONNECTION_STORAGE_KEY) || sessionStorage.getItem(CONNECTION_STORAGE_KEY);
      return raw ? JSON.parse(raw) as StoredConnectionState : null;
    } catch { return null; }
  }
  public static setConnection(connection: StoredConnectionState): void {
    try { localStorage.setItem(CONNECTION_STORAGE_KEY, JSON.stringify(connection)); }
    catch { throw new Error('Browser storage is unavailable. Connection settings were not saved.'); }
  }
  public static clearConnection(): void {
    try { localStorage.removeItem(CONNECTION_STORAGE_KEY); sessionStorage.removeItem(CONNECTION_STORAGE_KEY); } catch { /* ignore */ }
  }
  /** Opaque per-browser audit namespace; not a verified CAT identity or authentication mechanism. */
  public static getClientId(): string {
    const valid = (value: string | null) => Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));
    const existing = localStorage.getItem(CLIENT_ID_STORAGE_KEY);
    if (valid(existing)) return existing as string;
    const created = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = Math.random() * 16 | 0;
          return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
    localStorage.setItem(CLIENT_ID_STORAGE_KEY, created);
    return created;
  }
  public static getMaskedPat(): string | null {
    const pat = this.getPat()?.trim();
    if (!pat) return null;
    return pat.length <= 4 ? '••••' + pat : '••••••••' + pat.slice(-4);
  }
  public static disconnect(): void { this.clearPat(); this.clearConnection(); }
}
