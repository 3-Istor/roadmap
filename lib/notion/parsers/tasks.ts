/**
 * Tasks Parser
 * 
 * Parses Notion Tasks database pages into Prisma-ready format.
 */

import type { NotionPage, ParsedTask } from '../types';
import {
  extractTitle,
  extractSelect,
  extractDateRange,
  extractNumber,
  extractRelationIds,
  mapTaskStatus,
  mapTrack,
  mapPriority,
} from './utils';

/**
 * Parse a Notion Task page into ParsedTask format
 */
export function parseTask(page: NotionPage): ParsedTask | null {
  try {
    const { id, properties } = page;

    // Check if page is archived (additional safety check)
    const pageData = page as any;
    if (pageData.archived || pageData.in_trash) {
      console.log(`⏭️  Skipping archived task: ${id}`);
      return null;
    }

    // Extract required fields
    const title = extractTitle(properties, 'Title');
    
    if (!title || title === 'Untitled' || title.trim() === '') {
      console.warn(`⏭️  Skipping task ${id}: missing or empty title`);
      return null;
    }

    // Extract status and track with defaults
    const statusRaw = extractSelect(properties, 'Status');
    const status = mapTaskStatus(statusRaw);

    const trackRaw = extractSelect(properties, 'Track');
    const track = mapTrack(trackRaw);

    const priorityRaw = extractSelect(properties, 'Priority');
    const priority = mapPriority(priorityRaw);

    // Extract date range
    const { start: startDate, end: endDate } = extractDateRange(properties, 'Date');

    // Extract numeric fields
    const estimatedTime = extractNumber(properties, 'Estimated Time');
    const storyPoints = extractNumber(properties, 'Story Points');

    // Extract relations
    const projectRelations = extractRelationIds(properties, '🚀 Project');
    const projectId = projectRelations[0]; // Take first project if multiple

    const assignedToRelations = extractRelationIds(properties, '👥 Assigned to');
    const assignedToId = assignedToRelations[0]; // Take first assignee if multiple

    const blockIds = extractRelationIds(properties, 'Blocks');
    const blockedByIds = extractRelationIds(properties, 'Blocked By');

    return {
      notionId: id,
      title,
      status,
      track,
      priority,
      startDate,
      endDate,
      estimatedTime,
      storyPoints: storyPoints ? Math.round(storyPoints) : undefined,
      projectId,
      assignedToId,
      blockIds,
      blockedByIds,
    };
  } catch (error) {
    console.error(`Error parsing task ${page.id}:`, error);
    return null;
  }
}

/**
 * Parse multiple task pages
 */
export function parseTasks(pages: NotionPage[]): ParsedTask[] {
  return pages
    .map(parseTask)
    .filter((task): task is ParsedTask => task !== null);
}
