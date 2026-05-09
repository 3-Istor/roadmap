/**
 * Parser Utility Functions
 * 
 * Defensive helper functions for extracting values from Notion's nested JSON.
 * All functions use optional chaining and provide fallbacks.
 */

import type { NotionProperties } from '../types';

/**
 * Extract title text from Notion title property
 */
export function extractTitle(properties: NotionProperties, key: string): string {
  try {
    const prop = properties[key];
    if (prop?.type === 'title' && prop.title?.[0]?.plain_text) {
      return prop.title[0].plain_text;
    }
    return 'Untitled';
  } catch {
    return 'Untitled';
  }
}

/**
 * Extract rich text from Notion rich_text property
 */
export function extractRichText(properties: NotionProperties, key: string): string | undefined {
  try {
    const prop = properties[key];
    if (prop?.type === 'rich_text' && prop.rich_text?.[0]?.plain_text) {
      return prop.rich_text[0].plain_text;
    }
    return undefined;
  } catch {
    return undefined;
  }
}

/**
 * Extract phone number from Notion phone_number property
 */
export function extractPhoneNumber(properties: NotionProperties, key: string): string | undefined {
  try {
    const prop = properties[key];
    if (prop?.type === 'phone_number' && prop.phone_number) {
      return prop.phone_number;
    }
    return undefined;
  } catch {
    return undefined;
  }
}

/**
 * Extract file URL from Notion files property (first file only)
 */
export function extractFileUrl(properties: NotionProperties, key: string): string | undefined {
  try {
    const prop = properties[key];
    if (prop?.type === 'files' && prop.files?.[0]) {
      const file = prop.files[0];
      if (file.type === 'external') {
        return file.external.url;
      } else if (file.type === 'file') {
        return file.file.url;
      }
    }
    return undefined;
  } catch {
    return undefined;
  }
}

/**
 * Extract date from Notion date property
 */
export function extractDate(properties: NotionProperties, key: string): Date | undefined {
  try {
    const prop = properties[key];
    if (prop?.type === 'date' && prop.date?.start) {
      return new Date(prop.date.start);
    }
    return undefined;
  } catch {
    return undefined;
  }
}

/**
 * Extract date range from Notion date property
 */
export function extractDateRange(properties: NotionProperties, key: string): { start?: Date; end?: Date } {
  try {
    const prop = properties[key];
    if (prop?.type === 'date' && prop.date) {
      return {
        start: prop.date.start ? new Date(prop.date.start) : undefined,
        end: prop.date.end ? new Date(prop.date.end) : undefined,
      };
    }
    return {};
  } catch {
    return {};
  }
}

/**
 * Extract select value from Notion select property
 */
export function extractSelect(properties: NotionProperties, key: string): string | undefined {
  try {
    const prop = properties[key];
    if (prop?.type === 'select' && prop.select?.name) {
      return prop.select.name;
    }
    return undefined;
  } catch {
    return undefined;
  }
}

/**
 * Extract number from Notion number property
 */
export function extractNumber(properties: NotionProperties, key: string): number | undefined {
  try {
    const prop = properties[key];
    if (prop?.type === 'number' && typeof prop.number === 'number') {
      return prop.number;
    }
    return undefined;
  } catch {
    return undefined;
  }
}

/**
 * Extract relation IDs from Notion relation property
 */
export function extractRelationIds(properties: NotionProperties, key: string): string[] {
  try {
    const prop = properties[key];
    if (prop?.type === 'relation' && Array.isArray(prop.relation)) {
      return prop.relation.map(r => r.id).filter(Boolean);
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Map Notion status to Prisma enum
 */
export function mapProjectStatus(notionStatus?: string): 'BACKLOG' | 'PAUSED' | 'IN_PROGRESS' | 'DONE' {
  const statusMap: Record<string, 'BACKLOG' | 'PAUSED' | 'IN_PROGRESS' | 'DONE'> = {
    'Backlog': 'BACKLOG',
    'Paused': 'PAUSED',
    'In progress': 'IN_PROGRESS',
    'Done': 'DONE',
  };
  return statusMap[notionStatus || ''] || 'BACKLOG';
}

/**
 * Map Notion task status to Prisma enum
 */
export function mapTaskStatus(notionStatus?: string): 'NOT_STARTED' | 'IN_PROGRESS' | 'REVIEW' | 'DONE' {
  const statusMap: Record<string, 'NOT_STARTED' | 'IN_PROGRESS' | 'REVIEW' | 'DONE'> = {
    'Not Started': 'NOT_STARTED',
    'In progress': 'IN_PROGRESS',
    'Review': 'REVIEW',
    'Done': 'DONE',
  };
  return statusMap[notionStatus || ''] || 'NOT_STARTED';
}

/**
 * Map Notion track to Prisma enum
 */
export function mapTrack(notionTrack?: string): 'BUG' | 'DESIGN' | 'DOC' | 'DEV' {
  const trackMap: Record<string, 'BUG' | 'DESIGN' | 'DOC' | 'DEV'> = {
    'Bug': 'BUG',
    'Design': 'DESIGN',
    'Doc': 'DOC',
    'Dev': 'DEV',
  };
  return trackMap[notionTrack || ''] || 'DEV';
}

/**
 * Map Notion priority to Prisma enum
 */
export function mapPriority(notionPriority?: string): 'LOW' | 'MEDIUM' | 'HIGH' {
  const priorityMap: Record<string, 'LOW' | 'MEDIUM' | 'HIGH'> = {
    'Low': 'LOW',
    'Medium': 'MEDIUM',
    'High': 'HIGH',
  };
  return priorityMap[notionPriority || ''] || 'MEDIUM';
}

/**
 * Map Notion event type to Prisma enum
 */
export function mapEventType(notionType?: string): 'MANAGER_PERIOD' | 'VACATION' | 'KEY_DATE' | 'DELIVERABLE' | 'MILESTONE' | 'ANNIVERSARY' {
  const typeMap: Record<string, 'MANAGER_PERIOD' | 'VACATION' | 'KEY_DATE' | 'DELIVERABLE' | 'MILESTONE' | 'ANNIVERSARY'> = {
    'Manager Period': 'MANAGER_PERIOD',
    'Vacation': 'VACATION',
    'Key Date': 'KEY_DATE',
    'Deliverable': 'DELIVERABLE',
    'Milestone': 'MILESTONE',
    'Anniversary': 'ANNIVERSARY',
  };
  return typeMap[notionType || ''] || 'KEY_DATE';
}
