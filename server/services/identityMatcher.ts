/**
 * Identity Matching Service (SIT Nexus Specification Section 13)
 * 
 * Safely maps Azure DevOps AssignedTo identities to Resource Master records.
 * Uses priority:
 * 1. Normalized Email / uniqueName
 * 2. Extracted email from display string: "Name <email@example.com>"
 * 3. Normalized display name
 * 
 * If no match can be established, marks as UNMATCHED_RESOURCE to warn the manager.
 * 100% NULL-SAFE.
 */

import { normalize, extractAssigneeInfo } from './normalize';

export interface NormalizedResourceIdentity {
  id: string;
  name: string;
  normalizedName: string;
  email: string;
  normalizedEmail: string;
  region: string;
}

export interface MatchResult {
  isMatched: boolean;
  matchedResource?: NormalizedResourceIdentity;
  matchType?: 'email' | 'display_name' | 'unmatched';
  warning?: string;
}

export class IdentityMatcher {
  /**
   * Normalize an email address for comparison (trimmed, lowercase)
   */
  public static normalizeEmail(email: unknown): string {
    return normalize(email);
  }

  /**
   * Normalize a display name (trimmed, lowercase, single whitespace)
   */
  public static normalizeName(name: unknown): string {
    return normalize(name).replace(/\s+/g, ' ');
  }

  /**
   * Extract email and display name from Azure DevOps identity string or object
   * e.g. "Karthikeyan R <karthikeyan@cat.com>" or { displayName: '...', uniqueName: '...' }
   */
  public static parseAdoIdentity(assignedTo: unknown): { displayName: string; email?: string } {
    const { displayName, email } = extractAssigneeInfo(assignedTo);
    return {
      displayName: displayName || 'Unassigned',
      email: email || undefined,
    };
  }

  /**
   * Match an Azure DevOps assignee to a Resource Master record safely
   */
  public static matchAssignee(
    assignedTo: unknown,
    resourceMaster: NormalizedResourceIdentity[]
  ): MatchResult {
    if (!resourceMaster || !Array.isArray(resourceMaster)) {
      return {
        isMatched: false,
        matchType: 'unmatched',
      };
    }

    const { displayName, email } = this.parseAdoIdentity(assignedTo);

    // 1. Try matching by email
    const normEmail = this.normalizeEmail(email);
    if (normEmail) {
      const emailMatch = resourceMaster.find(
        (r) => r && this.normalizeEmail(r.normalizedEmail || r.email) === normEmail
      );
      if (emailMatch) {
        return {
          isMatched: true,
          matchedResource: emailMatch,
          matchType: 'email',
        };
      }
    }

    // 2. Try matching by normalized display name
    const normDisplayName = this.normalizeName(displayName);
    if (normDisplayName && normDisplayName !== 'unassigned') {
      const nameMatch = resourceMaster.find((r) => {
        if (!r) return false;
        const rNorm = this.normalizeName(r.normalizedName || r.name);
        if (!rNorm) return false;
        return (
          rNorm === normDisplayName ||
          rNorm.includes(normDisplayName) ||
          normDisplayName.includes(rNorm)
        );
      });

      if (nameMatch) {
        return {
          isMatched: true,
          matchedResource: nameMatch,
          matchType: 'display_name',
        };
      }
    }

    // 3. Unmatched
    const label = displayName || email || 'Unassigned';
    return {
      isMatched: false,
      matchType: 'unmatched',
      warning: `Identity "${label}" could not be matched to any Resource Master record.`,
    };
  }
}
