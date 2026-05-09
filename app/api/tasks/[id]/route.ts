/**
 * Task Update API Route
 * 
 * Handles task updates and syncs changes back to Notion
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { updateTask } from '@/lib/notion/writers';

export const dynamic = 'force-dynamic';

interface UpdateTaskBody {
  startDate?: string;
  endDate?: string;
  status?: 'NOT_STARTED' | 'IN_PROGRESS' | 'REVIEW' | 'DONE';
  track?: 'BACKLOG' | 'BUG' | 'DESIGN' | 'DOC' | 'DEV';
  assignedToId?: string;
  projectId?: string;
}

/**
 * PATCH /api/tasks/[id]
 * 
 * Updates a task in both PostgreSQL and Notion
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params;
    const body: UpdateTaskBody = await request.json();

    // Find the task with its relations
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        project: { select: { notionId: true } },
        assignedTo: { select: { notionId: true } },
      },
    });

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    // Prepare updates for PostgreSQL
    const prismaUpdates: Record<string, unknown> = {};
    const notionUpdates: Record<string, unknown> = {};

    // Handle date updates
    if (body.startDate !== undefined) {
      const startDate = body.startDate ? new Date(body.startDate) : null;
      prismaUpdates.startDate = startDate;
      notionUpdates.startDate = startDate;
    }

    if (body.endDate !== undefined) {
      const endDate = body.endDate ? new Date(body.endDate) : null;
      prismaUpdates.endDate = endDate;
      notionUpdates.endDate = endDate;
    }

    // Notion requires both start and end dates when updating
    // If only one is provided, use the existing value for the other
    if (notionUpdates.startDate !== undefined || notionUpdates.endDate !== undefined) {
      notionUpdates.startDate = notionUpdates.startDate !== undefined 
        ? notionUpdates.startDate 
        : task.startDate;
      notionUpdates.endDate = notionUpdates.endDate !== undefined 
        ? notionUpdates.endDate 
        : task.endDate;
    }

    // Handle status updates
    if (body.status) {
      prismaUpdates.status = body.status;
      notionUpdates.status = body.status;
    }

    // Handle track updates
    if (body.track) {
      prismaUpdates.track = body.track;
      notionUpdates.track = body.track;
    }

    // Handle assignment updates
    if (body.assignedToId !== undefined) {
      if (body.assignedToId) {
        prismaUpdates.assignedTo = { connect: { id: body.assignedToId } };
        // Note: TeamMember lookup would go here if the model exists
      } else {
        prismaUpdates.assignedTo = { disconnect: true };
        notionUpdates.assignedToNotionId = null;
      }
    }

    // Handle project updates
    if (body.projectId !== undefined) {
      if (body.projectId) {
        prismaUpdates.project = { connect: { id: body.projectId } };
        const project = await prisma.project.findUnique({
          where: { id: body.projectId },
          select: { notionId: true },
        });
        if (project) {
          notionUpdates.projectNotionId = project.notionId;
        }
      } else {
        prismaUpdates.project = { disconnect: true };
        notionUpdates.projectNotionId = null;
      }
    }

    // Update PostgreSQL first
    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: prismaUpdates,
      include: {
        project: true,
        assignedTo: true,
      },
    });

    // Sync to Notion (non-blocking, fire and forget with error logging)
    if (Object.keys(notionUpdates).length > 0) {
      updateTask(task.notionId, notionUpdates).catch((error) => {
        console.error(`Failed to sync task ${taskId} to Notion:`, error);
        // In production, you might want to queue this for retry
      });
    }

    return NextResponse.json({
      success: true,
      task: updatedTask,
    });
  } catch (error) {
    console.error('Error updating task:', error);
    return NextResponse.json(
      { error: 'Failed to update task', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
