/**
 * Dashboard Data API
 * 
 * Fetches all data needed for the timeline dashboard
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Check database connection first
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch (dbError) {
      console.error('Database not ready:', dbError);
      return NextResponse.json(
        { error: 'Database is initializing, please try again in a moment' },
        { status: 503 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    
    // Build filter
    const projectFilter = projectId ? { projectId } : {};
    
    // Fetch all data in parallel
    const [projects, tasks, events, members] = await Promise.all([
      // Projects with task counts
      prisma.project.findMany({
        orderBy: { name: 'asc' },
        include: {
          _count: {
            select: { tasks: true },
          },
        },
      }),
      
      // Tasks with relations
      prisma.task.findMany({
        where: projectFilter,
        include: {
          project: {
            select: {
              id: true,
              notionId: true,
              name: true,
              status: true,
            },
          },
          assignedTo: {
            select: {
              id: true,
              notionId: true,
              name: true,
            },
          },
          blocks: {
            select: {
              id: true,
              notionId: true,
            },
          },
          blockedBy: {
            select: {
              id: true,
              notionId: true,
            },
          },
        },
        orderBy: [
          { projectId: 'asc' },
          { track: 'asc' },
          { startDate: 'asc' },
        ],
      }),
      
      // Events
      prisma.event.findMany({
        where: projectId ? {
          projects: {
            some: { id: projectId },
          },
        } : {},
        include: {
          persons: {
            select: {
              id: true,
              name: true,
            },
          },
          projects: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { startDate: 'asc' },
      }),
      
      // Members
      prisma.member.findMany({
        orderBy: { name: 'asc' },
      }),
    ]);
    
    return NextResponse.json({
      projects,
      tasks,
      events,
      members,
    });
  } catch (error) {
    console.error('Dashboard API error:', error);
    
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
