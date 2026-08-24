/**
 * Sync Orchestration
 * 
 * Coordinates syncing data from Notion to PostgreSQL with transaction safety.
 * Handles pagination, rate limiting, and error recovery.
 */

import { notion, NOTION_DB_IDS, rateLimiter, isNotionConfigured } from './client';
import { prisma } from '../prisma';
import { parseMembers } from './parsers/members';
import { parseProjects } from './parsers/projects';
import { parseEvents } from './parsers/events';
import { parseTasks } from './parsers/tasks';
import type { NotionPage, SyncResult } from './types';

/**
 * Fetch all pages from a Notion database with pagination
 * Filters out archived/deleted pages
 */
async function fetchAllPages(databaseId: string): Promise<NotionPage[]> {
  const pages: NotionPage[] = [];
  let hasMore = true;
  let startCursor: string | undefined = undefined;

  await rateLimiter.throttle();
  // Notion API 2025-09-03+: databases now expose one or more data sources,
  // and querying happens against a data source, not the database itself.
  const database = await notion.databases.retrieve({ database_id: databaseId });
  const dataSourceId = 'data_sources' in database ? database.data_sources[0]?.id : undefined;
  if (!dataSourceId) {
    throw new Error(`Database ${databaseId} has no data sources`);
  }

  while (hasMore) {
    await rateLimiter.throttle();

    const response = await notion.dataSources.query({
      data_source_id: dataSourceId,
      start_cursor: startCursor,
      page_size: 100, // Max page size
    });

    // Filter for page objects only and exclude archived/deleted pages
    const pageResults = response.results.filter(
      (result: unknown): result is NotionPage => {
        if (!result || typeof result !== 'object' || !('properties' in result)) {
          return false;
        }
        // Exclude archived pages and pages in trash
        const page = result as any;
        if (page.archived || page.in_trash) {
          console.log(`⏭️  Skipping archived/deleted page: ${page.id}`);
          return false;
        }
        return true;
      }
    );

    pages.push(...pageResults);
    hasMore = response.has_more;
    startCursor = response.next_cursor || undefined;
  }

  console.log(`✅ Fetched ${pages.length} active pages from database ${databaseId}`);
  return pages;
}

/**
 * Sync Members from Notion to PostgreSQL
 */
async function syncMembers(): Promise<{ count: number; errors: string[] }> {
  const errors: string[] = [];
  
  try {
    console.log('Fetching members from Notion...');
    const pages = await fetchAllPages(NOTION_DB_IDS.members);
    const parsedMembers = parseMembers(pages);

    console.log(`Syncing ${parsedMembers.length} members...`);

    // Upsert each member
    const operations = parsedMembers.map(member =>
      prisma.member.upsert({
        where: { notionId: member.notionId },
        update: {
          name: member.name,
          phoneNumber: member.phoneNumber,
          profilePicture: member.profilePicture,
          anniversary: member.anniversary,
        },
        create: member,
      })
    );

    await Promise.all(operations);

    return { count: parsedMembers.length, errors };
  } catch (error) {
    const errorMsg = `Members sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    console.error(errorMsg);
    errors.push(errorMsg);
    return { count: 0, errors };
  }
}

/**
 * Sync Projects from Notion to PostgreSQL
 */
async function syncProjects(): Promise<{ count: number; errors: string[] }> {
  const errors: string[] = [];
  
  try {
    console.log('Fetching projects from Notion...');
    const pages = await fetchAllPages(NOTION_DB_IDS.projects);
    console.log(`Fetched ${pages.length} project pages from Notion`);
    
    const parsedProjects = parseProjects(pages);
    console.log(`Successfully parsed ${parsedProjects.length} projects`);
    
    // Log any projects that were skipped
    if (pages.length !== parsedProjects.length) {
      console.warn(`⚠️  ${pages.length - parsedProjects.length} projects were skipped during parsing`);
    }

    console.log(`Syncing ${parsedProjects.length} projects...`);

    const operations = parsedProjects.map(project =>
      prisma.project.upsert({
        where: { notionId: project.notionId },
        update: {
          name: project.name,
          status: project.status,
          startDate: project.startDate ?? null,
          endDate: project.endDate ?? null,
          priority: project.priority,
        },
        create: project,
      })
    );

    await Promise.all(operations);

    // Cleanup: Delete projects that are no longer in Notion
    try {
      const notionProjectIds = parsedProjects.map(p => p.notionId);
      const deletedProjects = await prisma.project.deleteMany({
        where: {
          notionId: {
            notIn: notionProjectIds,
          },
        },
      });
      
      if (deletedProjects.count > 0) {
        console.log(`🗑️  Cleaned up ${deletedProjects.count} archived/deleted projects`);
      }
    } catch (error) {
      const errorMsg = `Project cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(errorMsg);
      errors.push(errorMsg);
    }

    return { count: parsedProjects.length, errors };
  } catch (error) {
    const errorMsg = `Projects sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    console.error(errorMsg);
    errors.push(errorMsg);
    return { count: 0, errors };
  }
}

/**
 * Sync Events from Notion to PostgreSQL
 */
async function syncEvents(): Promise<{ count: number; errors: string[] }> {
  const errors: string[] = [];
  
  try {
    console.log('Fetching events from Notion...');
    const pages = await fetchAllPages(NOTION_DB_IDS.events);
    const parsedEvents = parseEvents(pages);

    console.log(`Syncing ${parsedEvents.length} events...`);

    // Events have many-to-many relations, need to handle carefully
    for (const event of parsedEvents) {
      try {
        // Find related members and projects by notionId
        const relatedMembers = await prisma.member.findMany({
          where: { notionId: { in: event.personIds } },
          select: { id: true },
        });

        const relatedProjects = await prisma.project.findMany({
          where: { notionId: { in: event.projectIds } },
          select: { id: true },
        });

        await prisma.event.upsert({
          where: { notionId: event.notionId },
          update: {
            name: event.name,
            startDate: event.startDate,
            endDate: event.endDate,
            eventType: event.eventType,
            persons: {
              set: relatedMembers.map(m => ({ id: m.id })),
            },
            projects: {
              set: relatedProjects.map(p => ({ id: p.id })),
            },
          },
          create: {
            notionId: event.notionId,
            name: event.name,
            startDate: event.startDate,
            endDate: event.endDate,
            eventType: event.eventType,
            persons: {
              connect: relatedMembers.map(m => ({ id: m.id })),
            },
            projects: {
              connect: relatedProjects.map(p => ({ id: p.id })),
            },
          },
        });
      } catch (error) {
        const errorMsg = `Event ${event.notionId} sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    }

    return { count: parsedEvents.length, errors };
  } catch (error) {
    const errorMsg = `Events sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    console.error(errorMsg);
    errors.push(errorMsg);
    return { count: 0, errors };
  }
}

/**
 * Sync Tasks from Notion to PostgreSQL
 * This is done in two passes to handle dependencies correctly
 */
async function syncTasks(): Promise<{ count: number; errors: string[] }> {
  const errors: string[] = [];
  
  try {
    console.log('Fetching tasks from Notion...');
    const pages = await fetchAllPages(NOTION_DB_IDS.tasks);
    const parsedTasks = parseTasks(pages);

    console.log(`Syncing ${parsedTasks.length} tasks...`);

    // Pass 1: Upsert all tasks without dependencies
    for (const task of parsedTasks) {
      try {
        // Find related project and member by notionId
        const relatedProject = task.projectId
          ? await prisma.project.findUnique({
              where: { notionId: task.projectId },
              select: { id: true },
            })
          : null;

        const relatedMember = task.assignedToId
          ? await prisma.member.findUnique({
              where: { notionId: task.assignedToId },
              select: { id: true },
            })
          : null;

        await prisma.task.upsert({
          where: { notionId: task.notionId },
          update: {
            title: task.title,
            status: task.status,
            track: task.track,
            priority: task.priority,
            startDate: task.startDate ?? null,
            endDate: task.endDate ?? null,
            estimatedTime: task.estimatedTime ?? null,
            storyPoints: task.storyPoints ?? null,
            projectId: relatedProject?.id ?? null,
            assignedToId: relatedMember?.id ?? null,
          },
          create: {
            notionId: task.notionId,
            title: task.title,
            status: task.status,
            track: task.track,
            priority: task.priority,
            startDate: task.startDate ?? null,
            endDate: task.endDate ?? null,
            estimatedTime: task.estimatedTime ?? null,
            storyPoints: task.storyPoints ?? null,
            projectId: relatedProject?.id ?? null,
            assignedToId: relatedMember?.id ?? null,
          },
        });
      } catch (error) {
        const errorMsg = `Task ${task.notionId} sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    }

    // Pass 2: Update task dependencies
    for (const task of parsedTasks) {
      try {
        if (task.blockIds.length > 0 || task.blockedByIds.length > 0) {
          // Find related tasks by notionId
          const blockedTasks = await prisma.task.findMany({
            where: { notionId: { in: task.blockIds } },
            select: { id: true },
          });

          const blockerTasks = await prisma.task.findMany({
            where: { notionId: { in: task.blockedByIds } },
            select: { id: true },
          });

          await prisma.task.update({
            where: { notionId: task.notionId },
            data: {
              blocks: {
                set: blockedTasks.map(t => ({ id: t.id })),
              },
              blockedBy: {
                set: blockerTasks.map(t => ({ id: t.id })),
              },
            },
          });
        }
      } catch (error) {
        const errorMsg = `Task ${task.notionId} dependencies sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    }

    // Pass 3: Cleanup - Delete tasks that are no longer in Notion (archived/deleted)
    try {
      const notionTaskIds = parsedTasks.map(t => t.notionId);
      const deletedTasks = await prisma.task.deleteMany({
        where: {
          notionId: {
            notIn: notionTaskIds,
          },
        },
      });
      
      if (deletedTasks.count > 0) {
        console.log(`🗑️  Cleaned up ${deletedTasks.count} archived/deleted tasks`);
      }
    } catch (error) {
      const errorMsg = `Task cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(errorMsg);
      errors.push(errorMsg);
    }

    return { count: parsedTasks.length, errors };
  } catch (error) {
    const errorMsg = `Tasks sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    console.error(errorMsg);
    errors.push(errorMsg);
    return { count: 0, errors };
  }
}

/**
 * Full sync of all databases with transaction safety
 */
export async function syncAllDatabases(source: 'webhook' | 'cron'): Promise<SyncResult> {
  const startTime = Date.now();
  const allErrors: string[] = [];
  let totalRecords = 0;

  try {
    // Check if Notion is configured
    if (!isNotionConfigured()) {
      const errorMsg = 'Notion API is not configured. Please set NOTION_API_KEY and database IDs in .env';
      console.error(errorMsg);
      
      await prisma.syncLog.create({
        data: {
          source,
          status: 'error',
          message: errorMsg,
          recordCount: 0,
          duration: Date.now() - startTime,
        },
      });

      return {
        source,
        status: 'error',
        message: errorMsg,
        recordCount: 0,
        duration: Date.now() - startTime,
        errors: [errorMsg],
      };
    }

    console.log(`Starting ${source} sync...`);

    // Sync in order: Members -> Projects -> Events -> Tasks
    // This ensures foreign key relationships are satisfied
    
    const membersResult = await syncMembers();
    totalRecords += membersResult.count;
    allErrors.push(...membersResult.errors);

    const projectsResult = await syncProjects();
    totalRecords += projectsResult.count;
    allErrors.push(...projectsResult.errors);

    const eventsResult = await syncEvents();
    totalRecords += eventsResult.count;
    allErrors.push(...eventsResult.errors);

    const tasksResult = await syncTasks();
    totalRecords += tasksResult.count;
    allErrors.push(...tasksResult.errors);

    const duration = Date.now() - startTime;
    const status = allErrors.length > 0 ? 'error' : 'success';

    // Log sync result
    await prisma.syncLog.create({
      data: {
        source,
        status,
        message: allErrors.length > 0 
          ? `Completed with ${allErrors.length} errors` 
          : 'Completed successfully',
        recordCount: totalRecords,
        duration,
      },
    });

    console.log(`${source} sync completed in ${duration}ms. Records: ${totalRecords}, Errors: ${allErrors.length}`);

    return {
      source,
      status,
      message: allErrors.length > 0 
        ? `Synced ${totalRecords} records with ${allErrors.length} errors` 
        : `Successfully synced ${totalRecords} records`,
      recordCount: totalRecords,
      duration,
      errors: allErrors.length > 0 ? allErrors : undefined,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    
    // Log failed sync
    await prisma.syncLog.create({
      data: {
        source,
        status: 'error',
        message: errorMsg,
        recordCount: totalRecords,
        duration,
      },
    });

    console.error(`${source} sync failed:`, error);

    return {
      source,
      status: 'error',
      message: errorMsg,
      recordCount: totalRecords,
      duration,
      errors: [errorMsg, ...allErrors],
    };
  }
}

/**
 * Sync a specific database (for webhook updates)
 */
export async function syncDatabase(databaseId: string): Promise<SyncResult> {
  const startTime = Date.now();
  
  try {
    let count = 0;
    const errors: string[] = [];

    // Determine which database to sync
    if (databaseId === NOTION_DB_IDS.members) {
      const result = await syncMembers();
      count = result.count;
      errors.push(...result.errors);
    } else if (databaseId === NOTION_DB_IDS.projects) {
      const result = await syncProjects();
      count = result.count;
      errors.push(...result.errors);
    } else if (databaseId === NOTION_DB_IDS.events) {
      const result = await syncEvents();
      count = result.count;
      errors.push(...result.errors);
    } else if (databaseId === NOTION_DB_IDS.tasks) {
      const result = await syncTasks();
      count = result.count;
      errors.push(...result.errors);
    } else {
      throw new Error(`Unknown database ID: ${databaseId}`);
    }

    const duration = Date.now() - startTime;
    const status = errors.length > 0 ? 'error' : 'success';

    return {
      source: 'webhook',
      status,
      message: `Synced ${count} records`,
      recordCount: count,
      duration,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';

    return {
      source: 'webhook',
      status: 'error',
      message: errorMsg,
      duration,
      errors: [errorMsg],
    };
  }
}
