/**
 * Projects Parser
 * 
 * Parses Notion Projects database pages into Prisma-ready format.
 */

import type { NotionPage, ParsedProject } from '../types';
import {
  extractTitle,
  extractSelect,
  extractDateRange,
  mapProjectStatus,
  mapPriority,
} from './utils';

/**
 * Parse a Notion Project page into ParsedProject format
 */
export function parseProject(page: NotionPage): ParsedProject | null {
  try {
    const { id, properties } = page;

    // Extract required fields
    const name = extractTitle(properties, 'Name');
    
    if (!name || name === 'Untitled') {
      console.warn(`⚠️  Skipping project ${id}: missing name`);
      return null;
    }

    // Extract status and priority with defaults
    const statusRaw = extractSelect(properties, 'Status');
    const status = mapProjectStatus(statusRaw);

    const priorityRaw = extractSelect(properties, 'Priority');
    const priority = mapPriority(priorityRaw);

    // Extract date range
    const { start: startDate, end: endDate } = extractDateRange(properties, 'Dates');

    console.log(`✓ Parsed project: "${name}" (status: ${statusRaw || 'none'} -> ${status})`);

    return {
      notionId: id,
      name,
      status,
      startDate,
      endDate,
      priority,
    };
  } catch (error) {
    console.error(`❌ Error parsing project ${page.id}:`, error);
    return null;
  }
}

/**
 * Parse multiple project pages
 */
export function parseProjects(pages: NotionPage[]): ParsedProject[] {
  return pages
    .map(parseProject)
    .filter((project): project is ParsedProject => project !== null);
}
