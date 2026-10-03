import * as XLSX from 'xlsx';
import { 
  ResourceRecord, 
  ResourceValidationError, 
  ResourceUploadPreview, 
  WorkItemStory, 
  ProjectTagConfig 
} from '../types';
import { INITIAL_RESOURCES } from '../data/mockAdoData';
import { normalize } from './normalize';

const RESOURCE_MASTER_KEY = 'sit_nexus_resource_master_v2';
const PROJECT_TAGS_CONFIG_KEY = 'sit_nexus_project_tags_v1';

export function loadResourceMaster(): ResourceRecord[] {
  try {
    const raw = localStorage.getItem(RESOURCE_MASTER_KEY);
    if (!raw) {
      localStorage.setItem(RESOURCE_MASTER_KEY, JSON.stringify(INITIAL_RESOURCES));
      return INITIAL_RESOURCES;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch (err) {
    console.error('Error loading resource master:', err);
  }
  return INITIAL_RESOURCES;
}

export function saveResourceMaster(resources: ResourceRecord[]): void {
  try {
    localStorage.setItem(RESOURCE_MASTER_KEY, JSON.stringify(resources));
  } catch (err) {
    console.error('Error saving resource master:', err);
  }
}

export function resetResourceMasterToDefault(): ResourceRecord[] {
  localStorage.setItem(RESOURCE_MASTER_KEY, JSON.stringify(INITIAL_RESOURCES));
  return INITIAL_RESOURCES;
}

/**
 * Dynamically extract regions from the active Resource Master with counts.
 * Example return:
 * [
 *   { region: 'India', count: 25 },
 *   { region: 'Europe', count: 13 },
 *   { region: 'USA', count: 15 },
 *   { region: 'All', count: 53 }
 * ]
 */
export function getDynamicRegions(resources: ResourceRecord[]): { region: string; count: number }[] {
  const counts: Record<string, number> = {};
  resources.forEach((r) => {
    const reg = (r.region || 'Unassigned').trim();
    if (reg) {
      counts[reg] = (counts[reg] || 0) + 1;
    }
  });

  const list = Object.entries(counts).map(([region, count]) => ({ region, count }));
  
  // Sort known regions or alphabetical
  list.sort((a, b) => {
    const order = ['India', 'Europe', 'USA'];
    const idxA = order.indexOf(a.region);
    const idxB = order.indexOf(b.region);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.region.localeCompare(b.region);
  });

  return list;
}

/**
 * Validate and parse uploaded CSV or XLSX file
 */
export async function parseAndValidateResourceFile(
  file: File,
  currentResources: ResourceRecord[]
): Promise<ResourceUploadPreview> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  // Convert to array of row objects
  const rawRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

  const errors: ResourceValidationError[] = [];
  const validRecords: ResourceRecord[] = [];
  const seenNames = new Set<string>();
  const duplicateNames: string[] = [];

  if (rawRows.length === 0) {
    errors.push({
      row: 0,
      field: 'general',
      message: 'The uploaded file is empty. Please provide a file with Name, Region, and Mail columns.'
    });
    return {
      validRecords: [],
      errors,
      duplicateNames: [],
      currentCount: currentResources.length,
      newCount: 0
    };
  }

  // Check header existence by scanning first row keys
  const firstRowKeys = Object.keys(rawRows[0] || {}).map(k => normalize(k));
  const hasName = firstRowKeys.some(k => k === 'name' || k.includes('resource'));
  const hasRegion = firstRowKeys.some(k => k === 'region' || k.includes('location'));
  const hasMail = firstRowKeys.some(k => k === 'mail' || k === 'email');

  if (!hasName || !hasRegion || !hasMail) {
    const missing: string[] = [];
    if (!hasName) missing.push('Name');
    if (!hasRegion) missing.push('Region');
    if (!hasMail) missing.push('Mail');
    errors.push({
      row: 1,
      field: 'general',
      message: `Missing required column headers: ${missing.join(', ')}. Initial supported columns: Name, Region, Mail.`
    });
    return {
      validRecords: [],
      errors,
      duplicateNames: [],
      currentCount: currentResources.length,
      newCount: 0
    };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  rawRows.forEach((row, idx) => {
    const rowNum = idx + 2; // header is row 1
    // Find matching keys
    const nameKey = Object.keys(row).find(k => normalize(k) === 'name' || normalize(k).includes('resource')) || '';
    const regionKey = Object.keys(row).find(k => normalize(k) === 'region' || normalize(k).includes('location')) || '';
    const mailKey = Object.keys(row).find(k => normalize(k) === 'mail' || normalize(k) === 'email') || '';

    const nameVal = String(row[nameKey] || '').trim();
    const regionVal = String(row[regionKey] || '').trim();
    const mailVal = String(row[mailKey] || '').trim();

    // Skip totally empty rows
    if (!nameVal && !regionVal && !mailVal) {
      return;
    }

    let hasRowError = false;

    if (!nameVal) {
      errors.push({
        row: rowNum,
        field: 'name',
        message: 'Name is empty on row ' + rowNum
      });
      hasRowError = true;
    }

    if (!regionVal) {
      errors.push({
        row: rowNum,
        field: 'region',
        message: `Missing region for resource "${nameVal || 'Unknown'}" on row ${rowNum}`
      });
      hasRowError = true;
    }

    if (!mailVal) {
      errors.push({
        row: rowNum,
        field: 'email',
        message: `Missing email address for "${nameVal}" on row ${rowNum}`
      });
      hasRowError = true;
    } else if (!emailRegex.test(mailVal)) {
      errors.push({
        row: rowNum,
        field: 'email',
        message: `Invalid email format "${mailVal}" on row ${rowNum}`,
        value: mailVal
      });
      hasRowError = true;
    }

    // Check duplicates
    if (nameVal) {
      const lower = normalize(nameVal);
      if (seenNames.has(lower)) {
        duplicateNames.push(nameVal);
        errors.push({
          row: rowNum,
          field: 'name',
          message: `Duplicate resource name "${nameVal}" found on row ${rowNum}`,
          value: nameVal
        });
        hasRowError = true;
      } else {
        seenNames.add(lower);
      }
    }

    if (!hasRowError) {
      validRecords.push({
        id: `res-up-${Date.now()}-${validRecords.length + 1}`,
        name: nameVal,
        region: regionVal,
        email: mailVal,
        status: 'Active',
        addedAt: new Date().toISOString()
      });
    }
  });

  return {
    validRecords,
    errors,
    duplicateNames: Array.from(new Set(duplicateNames)),
    currentCount: currentResources.length,
    newCount: validRecords.length
  };
}

/**
 * Automatic Project Discovery from Azure DevOps Stories:
 * Scans all stories for distinct Tag / Project names.
 */
export function discoverProjectsFromStories(stories: WorkItemStory[]): string[] {
  const set = new Set<string>();
  stories.forEach((s) => {
    if (s.tag && s.tag.trim()) {
      set.add(s.tag.trim());
    }
    if (s.project && s.project.trim()) {
      set.add(s.project.trim());
    }
  });
  return Array.from(set).sort();
}

/**
 * Manage Project Tag Configurations (visibility, hide, restore)
 */
export function loadProjectTagConfigs(discoveredTags: string[]): ProjectTagConfig[] {
  try {
    const raw = localStorage.getItem(PROJECT_TAGS_CONFIG_KEY);
    const existing: ProjectTagConfig[] = raw ? JSON.parse(raw) : [];

    const map = new Map<string, ProjectTagConfig>();
    existing.forEach((p) => map.set(p.name, p));

    // Ensure all discovered tags exist in config
    discoveredTags.forEach((tag) => {
      if (!map.has(tag)) {
        map.set(tag, {
          name: tag,
          discoveredFromAdo: true,
          isHidden: false,
        });
      }
    });

    return Array.from(map.values());
  } catch (err) {
    console.error('Error loading project configs:', err);
    return discoveredTags.map((tag) => ({
      name: tag,
      discoveredFromAdo: true,
      isHidden: false,
    }));
  }
}

export function saveProjectTagConfigs(configs: ProjectTagConfig[]): void {
  try {
    localStorage.setItem(PROJECT_TAGS_CONFIG_KEY, JSON.stringify(configs));
  } catch (err) {
    console.error('Error saving project configs:', err);
  }
}

/**
 * Download sample CSV template for Resource Master
 */
export function downloadResourceMasterTemplate(): void {
  const sample = `Name,Region,Mail
Resource Name 1,India,resource1@cat.com
Resource Name 2,Europe,resource2@cat.com
Resource Name 3,USA,resource3@cat.com`;

  const blob = new Blob([sample], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'SIT_Nexus_Resource_Master_Template.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
