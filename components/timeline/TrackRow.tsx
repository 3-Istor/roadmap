'use client';

/**
 * Track Row Component
 * 
 * A single track (Bug, Design, Doc, Dev) containing tasks
 */

import { useMemo } from 'react';
import { TaskBlock } from './TaskBlock';
import { DraggableTaskBlock } from './DraggableTaskBlock';
import { calculateTaskPosition, type TimelineColumn } from '@/lib/utils/timeline';
import { formatDateForAPI } from '@/lib/utils/dragHelpers';
import { useViewStore } from '@/lib/store/viewStore';
import { cn } from '@/lib/utils/cn';

interface Task {
  id: string;
  notionId: string;
  title: string;
  status: string;
  track: string;
  priority: string;
  startDate: Date | null;
  endDate: Date | null;
  assignedTo?: { id: string; name: string } | null;
  blocks: { id: string }[];
  blockedBy: { id: string }[];
}

interface TrackRowProps {
  track: 'BACKLOG' | 'BUG' | 'DESIGN' | 'DOC' | 'DEV';
  tasks: Task[];
  columns: TimelineColumn[];
  columnWidth: string;
  onTaskUpdate?: (taskId: string, updates: Partial<{ startDate: Date; endDate: Date | null; track: string }>) => void;
}

const trackLabels = {
  BACKLOG: 'Backlog',
  BUG: 'Bug',
  DESIGN: 'Design',
  DOC: 'Doc',
  DEV: 'Dev',
};

const trackColors = {
  BACKLOG: 'bg-gray-100 dark:bg-gray-800',
  BUG: 'bg-red-50 dark:bg-red-950',
  DESIGN: 'bg-purple-50 dark:bg-purple-950',
  DOC: 'bg-blue-50 dark:bg-blue-950',
  DEV: 'bg-green-50 dark:bg-green-950',
};

export function TrackRow({ track, tasks, columns, columnWidth, onTaskUpdate }: TrackRowProps) {
  const { mode } = useViewStore();
  const isEditMode = mode === 'edit';
  
  // Handle task update (including track changes)
  const handleTaskUpdate = async (taskId: string, updates: { startDate?: Date; endDate?: Date | null; track?: string }) => {
    // Optimistic update
    if (onTaskUpdate) {
      onTaskUpdate(taskId, updates);
    }
    
    // API request in background
    const response = await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startDate: updates.startDate ? formatDateForAPI(updates.startDate) : undefined,
        endDate: updates.endDate ? formatDateForAPI(updates.endDate) : null,
        track: updates.track,
      }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to update task');
    }
  };
  
  // Filter tasks for this track
  const trackTasks = useMemo(() => {
    if (track === 'BACKLOG') {
      // BACKLOG contains tasks without dates OR without a proper track
      return tasks.filter(t => !t.startDate || !t.track || t.track === 'BACKLOG');
    }
    return tasks.filter(t => t.track === track && t.startDate); // Only show tasks with dates in regular tracks
  }, [tasks, track]);
  
  // Calculate positions for visible tasks
  const visibleTasks = useMemo(() => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    return trackTasks
      .map((task, index) => {
        // For BACKLOG or tasks without dates, assign default position at "today"
        let taskStartDate = task.startDate;
        let taskEndDate = task.endDate;
        
        if (!taskStartDate) {
          taskStartDate = today;
          taskEndDate = tomorrow;
        }
        
        const position = calculateTaskPosition(taskStartDate, taskEndDate, columns);
        
        // For BACKLOG, stagger tasks slightly to prevent complete overlap
        if (track === 'BACKLOG' && !task.startDate) {
          // Offset by a small amount based on index
          position.gridColumnStart = position.gridColumnStart + (index % 3);
          position.gridColumnEnd = position.gridColumnStart + 1;
        }
        
        return { task, position };
      })
      .filter(({ position }) => position.isVisible);
  }, [trackTasks, columns, track]);
  
  // Count tasks without dates
  const tasksWithoutDates = trackTasks.filter(t => !t.startDate).length;
  console.log(`Track ${track} has ${tasksWithoutDates} tasks without dates`); // Keep for debugging
  
  // In edit mode, always render tracks (even if empty) to serve as drop zones
  // In view mode, don't render empty tracks
  if (trackTasks.length === 0 && !isEditMode) {
    return null;
  }
  
  return (
    <div className="flex border-b border-gray-200 dark:border-gray-700">
      {/* Track Label - Sticky */}
      <div className="sticky left-0 z-20 w-32 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <div
          className={cn(
            'px-4 py-3 text-sm font-medium min-h-[60px]',
            trackColors[track],
            isEditMode && trackTasks.length === 0 && 'opacity-50'
          )}
        >
          {trackLabels[track]}
          <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
            ({visibleTasks.length})
          </span>
        </div>
      </div>
      
      {/* Timeline Grid */}
      <div
        className={cn(
          'relative flex-1 min-h-[60px] py-2'
        )}
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${columns.length}, ${columnWidth})`,
          gap: '0',
        }}
      >
        {visibleTasks.map(({ task, position }) => (
          isEditMode ? (
            <DraggableTaskBlock
              key={task.id}
              task={task}
              gridColumnStart={position.gridColumnStart}
              gridColumnEnd={position.gridColumnEnd}
              columns={columns}
              columnWidth={columnWidth}
              onUpdate={handleTaskUpdate}
            />
          ) : (
            <TaskBlock
              key={task.id}
              task={task}
              gridColumnStart={position.gridColumnStart}
              gridColumnEnd={position.gridColumnEnd}
            />
          )
        ))}
      </div>
    </div>
  );
}
