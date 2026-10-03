import { WorkItemStory, AdoConnectionConfig } from '../types';
import { INITIAL_STORIES } from '../data/mockAdoData';

const STORIES_STORAGE_KEY = 'sit_nexus_stories_v1';
const ADO_CONFIG_STORAGE_KEY = 'sit_nexus_ado_config_v1';

export function loadStories(): WorkItemStory[] {
  try {
    const raw = localStorage.getItem(STORIES_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORIES_STORAGE_KEY, JSON.stringify(INITIAL_STORIES));
      return INITIAL_STORIES;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch (err) {
    console.error('Failed to load stories from local storage:', err);
  }
  return INITIAL_STORIES;
}

export function saveStories(stories: WorkItemStory[]): void {
  try {
    localStorage.setItem(STORIES_STORAGE_KEY, JSON.stringify(stories));
  } catch (err) {
    console.error('Failed to save stories to local storage:', err);
  }
}

export function resetStoriesToDefault(): WorkItemStory[] {
  localStorage.setItem(STORIES_STORAGE_KEY, JSON.stringify(INITIAL_STORIES));
  return INITIAL_STORIES;
}

export function loadAdoConfig(): AdoConnectionConfig {
  try {
    const raw = localStorage.getItem(ADO_CONFIG_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Failed to load ADO config:', err);
  }
  return {
    orgUrl: 'https://dev.azure.com/cat-enterprise-sit',
    projectName: 'Digital-Execution-Core',
    pat: '••••••••••••••••••••••••',
    isConnected: true,
    lastSyncTimestamp: '2026-10-01 09:00 EST'
  };
}

export function saveAdoConfig(config: AdoConnectionConfig): void {
  try {
    localStorage.setItem(ADO_CONFIG_STORAGE_KEY, JSON.stringify(config));
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
