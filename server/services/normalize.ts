/**
 * SIT Nexus - Universal Null-Safe Normalization Layer
 * (Sections 3, 4, 5, 6, 7, 8, 9, 10)
 *
 * Guarantees zero "Cannot read properties of undefined (reading 'toLowerCase')" crashes
 * across query execution, WIQL construction, identity matching, and filtering.
 */

/**
 * Null-safe string normalization
 */
export function normalize(value: unknown): string {
  return String(value ?? '').trim().toLowerCase();
}

/**
 * Null-safe tag parser: supports semicolon-separated, array, or comma-separated tags
 */
export function parseTags(tags: unknown): string[] {
  if (!tags) return [];
  if (Array.isArray(tags)) {
    return tags.map((t) => normalize(t)).filter(Boolean);
  }
  return String(tags)
    .split(/[;,]/)
    .map((t) => normalize(t))
    .filter(Boolean);
}

/**
 * Null-safe Project Tag comparison
 * Matches exact, case-insensitive, or whitespace-normalized tags.
 */
export function matchesProjectTag(
  storyTags: unknown,
  storyProject: unknown,
  selectedProjectTag: unknown
): boolean {
  const normSelected = normalize(selectedProjectTag);
  if (!normSelected || normSelected === 'all' || normSelected === 'all projects') {
    return true;
  }

  const tagsList = parseTags(storyTags);
  if (tagsList.includes(normSelected)) {
    return true;
  }

  if (tagsList.some((t) => t === normSelected || t.includes(normSelected) || normSelected.includes(t))) {
    return true;
  }

  const normProject = normalize(storyProject);
  if (normProject && (normProject === normSelected || normProject.includes(normSelected) || normSelected.includes(normProject))) {
    return true;
  }

  return false;
}

/**
 * Safe Azure DevOps identity extractor
 */
export function extractAssigneeInfo(assignedTo: unknown): { displayName: string; email: string } {
  if (!assignedTo) {
    return { displayName: 'Unassigned', email: '' };
  }

  if (typeof assignedTo === 'object' && assignedTo !== null) {
    const obj = assignedTo as Record<string, any>;
    const displayName = String(obj.displayName || obj.name || 'Unassigned').trim();
    const email = String(obj.uniqueName || obj.mail || obj.email || '').trim();
    return { displayName: displayName || 'Unassigned', email };
  }

  const str = String(assignedTo).trim();
  if (!str) {
    return { displayName: 'Unassigned', email: '' };
  }

  const match = str.match(/<([^>]+)>/);
  if (match) {
    const email = match[1].trim();
    const displayName = str.replace(/<[^>]+>/, '').trim();
    return { displayName: displayName || email || 'Unassigned', email };
  }

  if (str.includes('@')) {
    return { displayName: str, email: str };
  }

  return { displayName: str, email: '' };
}

/**
 * Story Normalization Layer (Section 10)
 * Normalizes Azure DevOps raw work items into pristine StoredStory models
 * with safe fallbacks for every single optional field.
 */
export function normalizeAdoStory(raw: any, fallbackArea = '', fallbackIteration = ''): any {
  const f = (raw?.fields || raw || {}) as Record<string, any>;
  const storyId = Number(f['System.Id'] ?? raw?.id ?? 0);
  const title = String(f['System.Title'] ?? raw?.title ?? `Story #${storyId}`);
  const state = String(f['System.State'] ?? raw?.status ?? 'New');

  // Safe Story Points fallback
  const rawPoints =
    f['Microsoft.VSTS.Scheduling.StoryPoints'] ??
    f['Custom.StoryPoints'] ??
    f['Custom.Story_Points'] ??
    f['StoryPoints'] ??
    raw?.storyPoints ??
    0;
  const numPoints = typeof rawPoints === 'number' ? rawPoints : parseFloat(String(rawPoints));
  const storyPoints = isNaN(numPoints) || numPoints < 0 ? 0 : numPoints;

  // Safe Tags fallback
  const rawTags = f['System.Tags'] ?? raw?.tags ?? raw?.tag ?? '';
  const tagsStr = String(rawTags || '');
  const tagsList = parseTags(tagsStr);
  const primaryTag = tagsList[0] || String(raw?.project ?? 'General');

  // Safe AssignedTo fallback
  const rawAssignee = f['System.AssignedTo'] ?? raw?.assignedTo;
  const { displayName, email } = extractAssigneeInfo(rawAssignee);

  const storyArea = String(f['System.AreaPath'] ?? raw?.areaPath ?? fallbackArea ?? '');
  const storyIteration = String(f['System.IterationPath'] ?? raw?.iterationPath ?? raw?.sprint ?? fallbackIteration ?? '');
  const changedDate = String(f['System.ChangedDate'] ?? raw?.lastUpdatedDate ?? new Date().toISOString());

  return {
    id: storyId,
    title,
    assignedTo: displayName,
    assignedToName: displayName,
    assignedToEmail: email,
    resourceEmail: email,
    region: 'All',
    project: primaryTag,
    sprint: storyIteration,
    status: state,
    storyPoints,
    tags: tagsList,
    tag: primaryTag,
    lastUpdatedDate: changedDate,
    priority: String(f['Microsoft.VSTS.Common.Priority'] ?? raw?.priority ?? 'P2'),
    iterationPath: storyIteration,
    areaPath: storyArea,
    changedDate,
    description: String(f['System.Description'] ?? raw?.description ?? ''),
    acceptanceCriteria: String(f['Microsoft.VSTS.Common.AcceptanceCriteria'] ?? raw?.acceptanceCriteria ?? ''),
    standupNotes: String(raw?.standupNotes ?? ''),
    isReviewedToday: Boolean(raw?.isReviewedToday),
    blockedReason: raw?.blockedReason ? String(raw.blockedReason) : undefined,
  };
}
