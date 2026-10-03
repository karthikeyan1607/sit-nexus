/**
 * SIT Nexus - Frontend Null-Safe Normalization Helper
 * (Sections 3, 4, 5, 6, 7, 8, 9)
 *
 * Prevents "Cannot read properties of undefined (reading 'toLowerCase')" crashes
 * in search, filtering, and table rendering.
 */

export function normalize(value: unknown): string {
  return String(value ?? '').trim().toLowerCase();
}

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
