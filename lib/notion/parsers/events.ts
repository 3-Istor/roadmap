/**
 * Events Parser
 * 
 * Parses Notion Events & Milestones database pages into Prisma-ready format.
 */

import type { NotionPage, ParsedEvent } from '../types';
import {
  extractTitle,
  extractSelect,
  extractDateRange,
  extractRelationIds,
  mapEventType,
} from './utils';

/**
 * Parse a Notion Event page into ParsedEvent format
 */
export function parseEvent(page: NotionPage): ParsedEvent | null {
  try {
    const { id, properties } = page;

    // Extract required fields
    const name = extractTitle(properties, 'Name');
    
    if (!name || name === 'Untitled') {
      console.warn(`Skipping event ${id}: missing name`);
      return null;
    }

    // Extract event type
    const typeRaw = extractSelect(properties, 'Event Type');
    const eventType = mapEventType(typeRaw);

    // Extract date range (startDate is required for events)
    const { start: startDate, end: endDate } = extractDateRange(properties, 'Date');
    
    if (!startDate) {
      console.warn(`Skipping event ${id}: missing start date`);
      return null;
    }

    // Extract relations
    const personIds = extractRelationIds(properties, 'Persons');
    const projectIds = extractRelationIds(properties, 'Projects');

    return {
      notionId: id,
      name,
      startDate,
      endDate,
      eventType,
      personIds,
      projectIds,
    };
  } catch (error) {
    console.error(`Error parsing event ${page.id}:`, error);
    return null;
  }
}

/**
 * Parse multiple event pages
 */
export function parseEvents(pages: NotionPage[]): ParsedEvent[] {
  return pages
    .map(parseEvent)
    .filter((event): event is ParsedEvent => event !== null);
}
