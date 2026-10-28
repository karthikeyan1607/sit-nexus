/**
 * Centralized Azure DevOps Area Paths and Iteration Paths for SIT Nexus.
 *
 * Sprint Date Sequence (Two-Week Cadence through December 2026):
 * - Sprint 20: Sep 30, 2026 - Oct 13, 2026
 * - Sprint 21: Oct 14, 2026 - Oct 27, 2026
 * - Sprint 22: Oct 28, 2026 - Nov 10, 2026
 * - Sprint 23: Nov 11, 2026 - Nov 24, 2026
 * - Sprint 24: Nov 25, 2026 - Dec 8, 2026
 * - Sprint 25: Dec 9, 2026 - Dec 22, 2026
 * - Sprint 26: Dec 23, 2026 - Jan 5, 2027
 */

export const REQUIRED_AREA_PATHS = [
  'Cat Digital\\Platform\\System-Integration Testing\\P - SIT Energizers',
  'Cat Digital\\Platform\\System-Integration Testing\\P - SIT Vikings',
  'Cat Digital\\Platform\\System-Integration Testing\\P - SIT Elites',
  'Cat Digital\\Platform\\System-Integration Testing\\P - SIT Argus',
] as const;

export type AreaPathOption = typeof REQUIRED_AREA_PATHS[number];

export interface IterationOption {
  value: string;
  label: string;
  isVerified: boolean;
  status?: string;
}

export const DEFAULT_ITERATION_PATH = 'Cat Digital\\2026\\Sprint 20 (Sep 30 - Oct 13)';

export const CENTRALIZED_ITERATION_PATHS: IterationOption[] = [
  {
    value: 'Cat Digital\\2026\\Sprint 20 (Sep 30 - Oct 13)',
    label: 'Cat Digital\\2026\\Sprint 20 (Sep 30 - Oct 13)',
    isVerified: true,
  },
  {
    value: 'Cat Digital\\2026\\Sprint 21 (Oct 14 - Oct 27)',
    label: 'Cat Digital\\2026\\Sprint 21 (Oct 14 - Oct 27)',
    isVerified: true,
  },
  {
    value: 'Cat Digital\\2026\\Sprint 22 (Oct 28 - Nov 10)',
    label: 'Cat Digital\\2026\\Sprint 22 (Oct 28 - Nov 10)',
    isVerified: true,
  },
  {
    value: 'Cat Digital\\2026\\Sprint 23 (Nov 11 - Nov 24)',
    label: 'Cat Digital\\2026\\Sprint 23 (Nov 11 - Nov 24)',
    isVerified: true,
  },
  {
    value: 'Cat Digital\\2026\\Sprint 24 (Nov 25 - Dec 8)',
    label: 'Cat Digital\\2026\\Sprint 24 (Nov 25 - Dec 8)',
    isVerified: true,
  },
  {
    value: 'Cat Digital\\2026\\Sprint 25 (Dec 9 - Dec 22)',
    label: 'Cat Digital\\2026\\Sprint 25 (Dec 9 - Dec 22)',
    isVerified: true,
  },
  {
    value: 'Cat Digital\\2026\\Sprint 26 (Dec 23 - Jan 5)',
    label: 'Cat Digital\\2026\\Sprint 26 (Dec 23 - Jan 5)',
    isVerified: true,
  },
];

/**
 * Checks if an iteration path is unwanted/obsolete and should not be displayed in dropdowns:
 * - Sprint 19
 * - Sprint 18
 * - 2024
 * - Any placeholder containing "Requires ADO confirmation"
 */
export function isUnwantedIterationPath(path: string): boolean {
  if (!path) return false;
  const p = path.toLowerCase();
  return (
    p.includes('sprint 19') ||
    p.includes('sprint 18') ||
    p.includes('2024') ||
    p.includes('requires ado confirmation')
  );
}

/**
 * Normalizes any legacy or placeholder iteration path into the verified 2026 sequence.
 * If the path is one of the removed options (Sprint 18, 19, 2024), defaults to Sprint 20.
 */
export function normalizeIterationPath(path: string): string {
  if (!path) return path;
  if (isUnwantedIterationPath(path)) {
    return DEFAULT_ITERATION_PATH;
  }
  if (path.includes('Sprint 21') && (path.includes('Sep 14') || path.includes('Sep 14 - Oct 27'))) {
    return 'Cat Digital\\2026\\Sprint 21 (Oct 14 - Oct 27)';
  }
  if (path.includes('Sprint 23') && path.includes('Requires ADO confirmation')) {
    return 'Cat Digital\\2026\\Sprint 23 (Nov 11 - Nov 24)';
  }
  if (path.includes('Sprint 24') && path.includes('Requires ADO confirmation')) {
    return 'Cat Digital\\2026\\Sprint 24 (Nov 25 - Dec 8)';
  }
  if (path.includes('Sprint 25') && path.includes('Requires ADO confirmation')) {
    return 'Cat Digital\\2026\\Sprint 25 (Dec 9 - Dec 22)';
  }
  if (path.includes('Sprint 26') && path.includes('Requires ADO confirmation')) {
    return 'Cat Digital\\2026\\Sprint 26 (Dec 23 - Jan 5)';
  }
  return path;
}


