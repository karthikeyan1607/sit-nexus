import { WorkItemStory, AdoConnectionConfig } from '../types';

const STORIES_STORAGE_KEY = 'sit_nexus_stories_v1';
const ADO_CONFIG_STORAGE_KEY = 'sit_nexus_ado_config_v1';

export function loadStories(): WorkItemStory[] {
  try {
    // Work items are always fetched from live Azure DevOps. Purge old local snapshots.
    localStorage.removeItem(STORIES_STORAGE_KEY);
  } catch {
    // Storage may be unavailable; the live API remains the source of truth.
  }
  return [];
}

export function saveStories(_stories: WorkItemStory[]): void {
  try {
    localStorage.removeItem(STORIES_STORAGE_KEY);
  } catch {
    // Work-item snapshots are not persisted in browser storage.
  }
}

export function resetStoriesToDefault(): WorkItemStory[] {
  try {
    localStorage.removeItem(STORIES_STORAGE_KEY);
  } catch {
    // ignore
  }
  return [];
}

export function loadAdoConfig(): AdoConnectionConfig {
  try {
    const raw = localStorage.getItem(ADO_CONFIG_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AdoConnectionConfig>;
      // Older versions stored the PAT in this config blob. Never load it.
      return {
        orgUrl: parsed.orgUrl || '',
        projectName: parsed.projectName || '',
        pat: '',
        isConnected: false,
        lastSyncTimestamp: parsed.lastSyncTimestamp || '',
      };
    }
  } catch {
    // ignore invalid/stale browser configuration
  }
  return {
    orgUrl: '',
    projectName: '',
    pat: '',
    isConnected: false,
    lastSyncTimestamp: '',
  };
}

export function saveAdoConfig(config: AdoConnectionConfig): void {
  try {
    // Keep connection metadata only; never duplicate the PAT in this storage key.
    localStorage.setItem(ADO_CONFIG_STORAGE_KEY, JSON.stringify({
      orgUrl: config.orgUrl,
      projectName: config.projectName,
      pat: '',
      isConnected: false,
      lastSyncTimestamp: config.lastSyncTimestamp || '',
    }));
  } catch (err) {
    console.error('Failed to save ADO config:', err);
  }
}

export function exportStoriesToCsv(stories: WorkItemStory[], filename = 'SIT-Nexus-Sprint-Export.csv'): void {
  const headers = [
    'Work Item ID',
    'Story Title',
    'Assigned To',
    'Region',
    'Project',
    'Sprint',
    'Status',
    'Story Points',
    'Tag',
    'Priority',
    'Standup Notes',
    'Last Updated Date'
  ];

  const rows = stories.map(s => [
    s.id,
    `"${(s.title || '').replace(/"/g, '""')}"`,
    `"${(s.assignedTo || '').replace(/"/g, '""')}"`,
    s.region,
    `"${(s.project || '').replace(/"/g, '""')}"`,
    s.sprint,
    s.status,
    s.storyPoints,
    `"${(s.tag || '').replace(/"/g, '""')}"`,
    s.priority,
    `"${(s.standupNotes || '').replace(/"/g, '""')}"`,
    s.lastUpdatedDate
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}


export interface StoryLocalAnnotations {
  standupNotes?: string;
  blockedReason?: string;
}
const STORY_ANNOTATIONS_KEY = 'sit_nexus_story_annotations_v1';
const STANDUP_REVIEW_KEY = 'sit_nexus_standup_review_v1';

export function loadStoryAnnotations(): Record<string, StoryLocalAnnotations> {
  try {
    const raw = localStorage.getItem(STORY_ANNOTATIONS_KEY);
    return raw ? JSON.parse(raw) as Record<string, StoryLocalAnnotations> : {};
  } catch { return {}; }
}

export function saveStoryAnnotations(storyId: number, annotations: StoryLocalAnnotations): void {
  try {
    const current = loadStoryAnnotations();
    current[String(storyId)] = { ...current[String(storyId)], ...annotations };
    localStorage.setItem(STORY_ANNOTATIONS_KEY, JSON.stringify(current));
  } catch {
    throw new Error('Unable to save SIT Nexus story notes in this browser.');
  }
}

function todayKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
}
export function loadStandupReviewState(): string[] {
  try {
    const raw = localStorage.getItem(STANDUP_REVIEW_KEY);
    const parsed = raw ? JSON.parse(raw) as Record<string, string[]> : {};
    return parsed[todayKey()] || [];
  } catch { return []; }
}
export function setStandupResourceReviewed(resourceName: string, reviewed: boolean): void {
  try {
    const raw = localStorage.getItem(STANDUP_REVIEW_KEY);
    const parsed = raw ? JSON.parse(raw) as Record<string, string[]> : {};
    const current = new Set(parsed[todayKey()] || []);
    if (reviewed) current.add(resourceName); else current.delete(resourceName);
    parsed[todayKey()] = Array.from(current);
    localStorage.setItem(STANDUP_REVIEW_KEY, JSON.stringify(parsed));
  } catch {
    throw new Error('Unable to save standup review progress in this browser.');
  }
}
export function resetStandupReviewState(): void {
  setStandupReviewState([]);
}
function setStandupReviewState(names: string[]): void {
  try {
    const raw = localStorage.getItem(STANDUP_REVIEW_KEY);
    const parsed = raw ? JSON.parse(raw) as Record<string, string[]> : {};
    parsed[todayKey()] = names;
    localStorage.setItem(STANDUP_REVIEW_KEY, JSON.stringify(parsed));
  } catch { /* best-effort local UI state reset */ }
}
