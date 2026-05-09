/**
 * Notion Writers
 * 
 * Functions to write updates back to Notion when users edit tasks in Edit Mode.
 * Handles converting Prisma data back to Notion's property format.
 */

import { notion, rateLimiter } from './client';

/**
 * Update task dates in Notion
 */
export async function updateTaskDates(
  notionId: string,
  startDate?: Date,
  endDate?: Date
): Promise<void> {
  await rateLimiter.throttle();

  const dateProperty: any = {};

  if (startDate || endDate) {
    dateProperty.Date = {
      date: {
        start: startDate?.toISOString().split('T')[0],
        end: endDate?.toISOString().split('T')[0] || null,
      },
    };
  }

  await (notion.pages as any).update({
    page_id: notionId,
    properties: dateProperty,
  });
}

/**
 * Update task status in Notion
 */
export async function updateTaskStatus(
  notionId: string,
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'REVIEW' | 'DONE'
): Promise<void> {
  await rateLimiter.throttle();

  const statusMap: Record<string, string> = {
    NOT_STARTED: 'Not Started',
    IN_PROGRESS: 'In progress',
    REVIEW: 'Review',
    DONE: 'Done',
  };

  await (notion.pages as any).update({
    page_id: notionId,
    properties: {
      Status: {
        select: {
          name: statusMap[status],
        },
      },
    },
  });
}

/**
 * Update task assignment in Notion
 */
export async function updateTaskAssignment(
  notionId: string,
  assignedToNotionId?: string
): Promise<void> {
  await rateLimiter.throttle();

  const assignmentProperty: any = {
    'Assigned to': {
      relation: assignedToNotionId ? [{ id: assignedToNotionId }] : [],
    },
  };

  await (notion.pages as any).update({
    page_id: notionId,
    properties: assignmentProperty,
  });
}

/**
 * Update task project in Notion
 */
export async function updateTaskProject(
  notionId: string,
  projectNotionId?: string
): Promise<void> {
  await rateLimiter.throttle();

  const projectProperty: any = {
    Project: {
      relation: projectNotionId ? [{ id: projectNotionId }] : [],
    },
  };

  await (notion.pages as any).update({
    page_id: notionId,
    properties: projectProperty,
  });
}

/**
 * Update multiple task properties at once
 */
export async function updateTask(
  notionId: string,
  updates: {
    startDate?: Date;
    endDate?: Date;
    status?: 'NOT_STARTED' | 'IN_PROGRESS' | 'REVIEW' | 'DONE';
    track?: 'BACKLOG' | 'BUG' | 'DESIGN' | 'DOC' | 'DEV';
    assignedToNotionId?: string;
    projectNotionId?: string;
  }
): Promise<void> {
  await rateLimiter.throttle();

  const properties: any = {};

  // Update dates
  if (updates.startDate !== undefined || updates.endDate !== undefined) {
    // Notion requires a valid start date if setting dates
    if (updates.startDate) {
      properties.Date = {
        date: {
          start: updates.startDate.toISOString().split('T')[0],
          end: updates.endDate ? updates.endDate.toISOString().split('T')[0] : null,
        },
      };
    }
    // If startDate is null/undefined but endDate is provided, skip the update
    // This shouldn't happen with our API route logic
  }

  // Update status
  if (updates.status) {
    const statusMap: Record<string, string> = {
      NOT_STARTED: 'Not Started',
      IN_PROGRESS: 'In progress',
      REVIEW: 'Review',
      DONE: 'Done',
    };
    properties.Status = {
      select: {
        name: statusMap[updates.status],
      },
    };
  }

  // Update track
  if (updates.track) {
    const trackMap: Record<string, string> = {
      BACKLOG: 'Backlog',
      BUG: 'Bug',
      DESIGN: 'Design',
      DOC: 'Doc',
      DEV: 'Dev',
    };
    properties.Track = {
      select: {
        name: trackMap[updates.track],
      },
    };
  }

  // Update assignment
  if (updates.assignedToNotionId !== undefined) {
    properties['Assigned to'] = {
      relation: updates.assignedToNotionId ? [{ id: updates.assignedToNotionId }] : [],
    };
  }

  // Update project
  if (updates.projectNotionId !== undefined) {
    properties.Project = {
      relation: updates.projectNotionId ? [{ id: updates.projectNotionId }] : [],
    };
  }

  await (notion.pages as any).update({
    page_id: notionId,
    properties,
  });
}
