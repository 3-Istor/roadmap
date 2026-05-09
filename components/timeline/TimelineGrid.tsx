'use client';

/**
 * Timeline Grid Component
 * 
 * Main custom CSS Grid timeline with columns, playhead, and event overlays
 */

import { useMemo, useState } from 'react';
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { addDays } from 'date-fns';
import toast from 'react-hot-toast';
import { Xwrapper } from 'react-xarrows';
import { ProjectSection } from './ProjectSection';
import { EventMarker } from './EventMarker';
import { DependencyArrows } from './DependencyArrows';
import { 
  generateTimelineColumns, 
  getColumnWidth,
  calculateEventPosition,
} from '@/lib/utils/timeline';
import { useViewStore } from '@/lib/store/viewStore';
import { useDragScroll } from '@/lib/utils/useDragScroll';
import { cn } from '@/lib/utils/cn';
import { isWeekend } from 'date-fns';

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
  project?: { id: string; name: string; status: string } | null;
  blocks: { id: string }[];
  blockedBy: { id: string }[];
}

interface Event {
  id: string;
  name: string;
  eventType: string;
  startDate: Date;
}

interface Project {
  id: string;
  name: string;
  status: string;
}

interface TimelineGridProps {
  projects: Project[];
  tasks: Task[];
  events: Event[];
  onTaskUpdate?: (taskId: string, updates: Partial<{ startDate: Date; endDate: Date | null; track: string }>) => void;
}

export function TimelineGrid({ projects, tasks, events, onTaskUpdate }: TimelineGridProps) {
  const { timeRange, selectedProjectId, mode, addToHistory } = useViewStore();
  
  // Track expanded/collapsed state for each project
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>(() => {
    // Initialize all projects as expanded
    const initial: Record<string, boolean> = { unassigned: true };
    projects.forEach(p => {
      initial[p.id] = true;
    });
    return initial;
  });
  
  // Configure @dnd-kit sensors for drag & drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement before drag starts
      },
    })
  );
  
  // Drag scroll functionality (disabled in edit mode)
  const scrollRef = useDragScroll({ 
    direction: 'horizontal', 
    sensitivity: 1,
    disabled: mode === 'edit'
  });
  
  // Generate timeline columns
  const columns = useMemo(() => {
    return generateTimelineColumns(timeRange);
  }, [timeRange]);
  
  const columnWidth = getColumnWidth(timeRange);
  
  // Check for data quality issues
  const tasksWithoutProject = useMemo(() => {
    return tasks.filter(t => !t.project).length;
  }, [tasks]);
  
  const tasksWithoutDates = useMemo(() => {
    return tasks.filter(t => !t.startDate).length;
  }, [tasks]);
  
  // Filter projects and tasks
  const filteredProjects = useMemo(() => {
    if (selectedProjectId) {
      return projects.filter(p => p.id === selectedProjectId);
    }
    return projects;
  }, [projects, selectedProjectId]);
  
  // Group tasks by project
  const tasksByProject = useMemo(() => {
    const grouped = new Map<string, Task[]>();
    
    tasks.forEach(task => {
      const projectId = task.project?.id || 'unassigned';
      if (!grouped.has(projectId)) {
        grouped.set(projectId, []);
      }
      grouped.get(projectId)!.push(task);
    });
    
    return grouped;
  }, [tasks]);
  
  // Create a virtual "Unassigned" project for tasks without projects
  const unassignedTasks = tasksByProject.get('unassigned') || [];
  const hasUnassignedTasks = unassignedTasks.length > 0;
  
  // Calculate event positions
  const visibleEvents = useMemo(() => {
    return events
      .map(event => {
        const position = calculateEventPosition(event.startDate, columns);
        return { event, position };
      })
      .filter(({ position }) => position.isVisible);
  }, [events, columns]);
  
  // Find today's column index for playhead
  const todayColumnIndex = useMemo(() => {
    return columns.findIndex(col => col.isToday);
  }, [columns]);
  
  // Handle drag end for both horizontal (time shift) and vertical (track change) dragging
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, delta } = event;
    
    if (!onTaskUpdate) return;
    
    const taskId = active.id as string;
    const task = tasks.find(t => t.id === taskId);
    const dragData = active.data.current as { task: Task; gridColumnStart: number; gridColumnEnd: number } | undefined;
    
    if (!task) return;
    
    console.log('🎯 Drag End:', {
      taskId,
      taskTrack: task.track,
      hasStartDate: !!task.startDate,
      deltaX: delta.x,
      deltaY: delta.y,
      gridColumnStart: dragData?.gridColumnStart,
    });
    
    // Store original state for undo
    const originalState = {
      startDate: task.startDate,
      endDate: task.endDate,
      track: task.track,
    };
    
    // Prepare updates
    const updates: Partial<{ startDate: Date; endDate: Date | null; track: string }> = {};
    
    // Handle horizontal shift (time change)
    if (task.startDate) {
      // Task already has a date - shift it
      const columnWidthPx = parseFloat(columnWidth);
      const daysShifted = Math.round(delta.x / columnWidthPx);
      
      if (daysShifted !== 0) {
        const newStartDate = addDays(task.startDate, daysShifted);
        const newEndDate = task.endDate ? addDays(task.endDate, daysShifted) : null;
        
        updates.startDate = newStartDate;
        updates.endDate = newEndDate;
      }
    } else {
      // Task has no date - assign one based on ABSOLUTE drop position
      // For BACKLOG tasks, we need to calculate from the actual grid column position
      if (columns.length > 0 && dragData) {
        const columnWidthPx = parseFloat(columnWidth);
        
        // Calculate which column the task was dropped on
        // dragData.gridColumnStart is where it started (in BACKLOG)
        // delta.x is how far it moved
        const pixelsMoved = delta.x;
        const columnsMoved = Math.round(pixelsMoved / columnWidthPx);
        
        // The new column index (1-based for CSS grid)
        const targetColumnIndex = Math.max(0, dragData.gridColumnStart + columnsMoved - 1);
        
        // Get the date for that column
        const targetColumn = columns[Math.min(targetColumnIndex, columns.length - 1)];
        const newStartDate = targetColumn ? targetColumn.date : columns[0].date;
        
        // Default to same-day task (1 day duration, like in backlog)
        const newEndDate = newStartDate;
        
        updates.startDate = newStartDate;
        updates.endDate = newEndDate;
        
        console.log('📅 Assigning date to task without date:', {
          gridColumnStart: dragData.gridColumnStart,
          pixelsMoved,
          columnsMoved,
          targetColumnIndex,
          newStartDate,
          newEndDate,
        });
      }
    }
    
    // Handle vertical shift (track change) based on deltaY
    const TRACK_HEIGHT = 76; // 60px + borders/padding
    const tracksShifted = Math.round(delta.y / TRACK_HEIGHT);
    
    console.log('🔍 Track calculation:', {
      currentTrack: task.track,
      deltaY: delta.y,
      TRACK_HEIGHT,
      tracksShifted,
    });
    
    if (tracksShifted !== 0) {
      const trackOrder: Array<'BACKLOG' | 'BUG' | 'DESIGN' | 'DOC' | 'DEV'> = ['BACKLOG', 'BUG', 'DESIGN', 'DOC', 'DEV'];
      const currentTrackIndex = trackOrder.indexOf(task.track as 'BACKLOG' | 'BUG' | 'DESIGN' | 'DOC' | 'DEV');
      
      console.log('🔍 Track index lookup:', {
        trackOrder,
        currentTrack: task.track,
        currentTrackIndex,
      });
      
      if (currentTrackIndex !== -1) {
        const newTrackIndex = Math.max(0, Math.min(trackOrder.length - 1, currentTrackIndex + tracksShifted));
        const newTrack = trackOrder[newTrackIndex];
        
        if (newTrack !== task.track) {
          updates.track = newTrack;
          console.log('✅ Track change detected (by Y position):', task.track, '->', newTrack, `(shifted ${tracksShifted} tracks)`);
        }
      } else {
        console.warn('⚠️ Current track not found in trackOrder:', task.track);
      }
    }
    
    // For BACKLOG tasks being scheduled, ensure they get a proper track
    if (!task.startDate && updates.startDate) {
      if (!updates.track) {
        // If no track change detected, calculate track based on absolute Y position
        // This handles the case where BACKLOG tasks might not have track="BACKLOG"
        const trackOrder: Array<'BACKLOG' | 'BUG' | 'DESIGN' | 'DOC' | 'DEV'> = ['BACKLOG', 'BUG', 'DESIGN', 'DOC', 'DEV'];
        
        // Estimate which track based on total Y movement from BACKLOG position
        // BACKLOG is typically at the top, so positive deltaY means moving down
        const estimatedTrackIndex = Math.max(0, Math.min(4, Math.round(delta.y / TRACK_HEIGHT)));
        const estimatedTrack = trackOrder[estimatedTrackIndex];
        
        updates.track = estimatedTrack;
        console.log('📌 Assigning track to scheduled BACKLOG task:', estimatedTrack, `(deltaY: ${delta.y}, estimated index: ${estimatedTrackIndex})`);
      }
    }
    
    // Only update if something changed
    if (Object.keys(updates).length === 0) {
      console.log('⚠️ No changes detected');
      return;
    }
    
    console.log('📤 Sending updates:', updates);
    
    // Add to history for undo/redo
    addToHistory({
      taskId,
      previousState: originalState,
      newState: {
        startDate: updates.startDate || originalState.startDate,
        endDate: updates.endDate !== undefined ? updates.endDate : originalState.endDate,
        track: updates.track || originalState.track,
      },
      timestamp: Date.now(),
    });
    
    console.log('📝 Added to history');
    
    // Optimistic update
    onTaskUpdate(taskId, updates);
    
    // Send API request in background
    const apiUpdates: Record<string, string | null> = {};
    if (updates.startDate) apiUpdates.startDate = updates.startDate.toISOString();
    if (updates.endDate !== undefined) apiUpdates.endDate = updates.endDate ? updates.endDate.toISOString() : null;
    if (updates.track) apiUpdates.track = updates.track;
    
    console.log('🌐 API Request:', apiUpdates);
    
    fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(apiUpdates),
    })
      .then(res => {
        console.log('✅ API Response:', res.status);
        return res.json();
      })
      .then(data => console.log('✅ API Data:', data))
      .catch(err => {
        console.error('❌ Failed to update task:', err);
        toast.error('Failed to update task');
      });
    
    // Show success message
    const hasDateChange = updates.startDate !== undefined;
    const hasTrackChange = updates.track !== undefined;
    const isNewlyScheduled = !task.startDate && hasDateChange;
    
    if (isNewlyScheduled && hasTrackChange) {
      toast.success(`Task scheduled and moved to ${updates.track}`);
    } else if (isNewlyScheduled) {
      toast.success('Task scheduled');
    } else if (hasTrackChange && hasDateChange) {
      toast.success('Task moved to new track and rescheduled');
    } else if (hasTrackChange) {
      toast.success(`Moved to ${updates.track}`);
    } else if (hasDateChange) {
      toast.success('Task rescheduled');
    }
  };
  
  if (columns.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
        No timeline data available
      </div>
    );
  }
  
  return (
    <DndContext 
      sensors={sensors} 
      onDragEnd={handleDragEnd}
    >
        <div className="relative flex flex-col h-full overflow-hidden">
          {/* Edit Mode Warning Banner */}
          {mode === 'edit' && (
          <div className="bg-orange-50 dark:bg-orange-900/20 border-b-2 border-orange-400 dark:border-orange-600 px-6 py-3">
            <div className="flex items-center gap-3">
              <div className="text-orange-600 dark:text-orange-400 text-lg">⚠️</div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-orange-900 dark:text-orange-200">
                  Edit Mode Active
                </p>
                <p className="text-xs text-orange-700 dark:text-orange-300 mt-0.5">
                  Drag tasks anywhere to reschedule or change tracks. Resize edges to adjust duration.
                </p>
              </div>
            </div>
          </div>
        )}
      
      {/* Data Quality Warning */}
      {(tasksWithoutProject > 0 || tasksWithoutDates > 0) && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800 px-6 py-3">
          <div className="flex items-start gap-3">
            <div className="text-yellow-600 dark:text-yellow-400 mt-0.5">⚠️</div>
            <div className="flex-1 text-sm text-yellow-800 dark:text-yellow-200">
              <strong>Data Quality Issues:</strong>
              <ul className="mt-1 space-y-1">
                {tasksWithoutProject > 0 && (
                  <li>• {tasksWithoutProject} task(s) have no project assigned in Notion</li>
                )}
                {tasksWithoutDates > 0 && (
                  <li>• {tasksWithoutDates} task(s) have no start date (shown in Backlog)</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}
      
      {/* Single Scrollable Container for Header + Body */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-x-auto overflow-y-auto timeline-drag-container"
        data-timeline-container
      >
        <Xwrapper>
          <div className="relative min-w-max">
          {/* Timeline Header - Sticky on vertical scroll */}
          <div className="sticky top-0 z-50 flex border-b-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900">
            {/* Sidebar Header Space - Sticky on horizontal scroll, overlaps at corner */}
            <div className="sticky left-0 z-[60] w-32 border-r border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900" />
            
            {/* Column Headers */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${columns.length}, ${columnWidth})`,
              }}
            >
              {columns.map((column, index) => {
                const isWeekendDay = isWeekend(column.date);
                return (
                  <div
                    key={index}
                    className={cn(
                      'px-2 py-3 text-center text-xs font-medium border-r border-gray-100 dark:border-gray-800/50',
                      column.isToday && 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300',
                      isWeekendDay && !column.isToday && 'bg-gray-50/50 dark:bg-gray-800/30'
                    )}
                  >
                    {column.label}
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Timeline Body */}
          <div className="relative">
            {/* Weekend Background Columns */}
            <div 
              className="absolute top-0 left-32 right-0 bottom-0 pointer-events-none z-0"
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${columns.length}, ${columnWidth})`,
              }}
            >
              {columns.map((column, index) => {
                const isWeekendDay = isWeekend(column.date);
                return (
                  <div
                    key={index}
                    className={cn(
                      'border-r border-gray-100 dark:border-gray-800/50',
                      isWeekendDay && 'bg-gray-50/50 dark:bg-gray-800/30'
                    )}
                  />
                );
              })}
            </div>
            
            {/* Events Overlay */}
            {visibleEvents.length > 0 && (
              <div 
                className="absolute top-0 left-32 right-0 h-16 pointer-events-none z-20"
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${columns.length}, ${columnWidth})`,
                }}
              >
                {visibleEvents.map(({ event, position }) => (
                  <EventMarker
                    key={event.id}
                    event={event}
                    columnIndex={position.columnIndex}
                    columnWidth={columnWidth}
                  />
                ))}
              </div>
            )}
            
            {/* Today Playhead */}
            {todayColumnIndex >= 0 && (
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-blue-500 z-10 pointer-events-none"
                style={{
                  left: `calc(8rem + ${todayColumnIndex} * ${columnWidth} + ${columnWidth} / 2)`,
                }}
              >
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-3 bg-blue-500 rounded-full" />
              </div>
            )}
            
            {/* Project Sections */}
            <div className="mt-16"> {/* Space for events overlay */}
              {filteredProjects.map(project => {
                const projectTasks = tasksByProject.get(project.id) || [];
                
                if (projectTasks.length === 0) return null;
                
                return (
                  <ProjectSection
                    key={project.id}
                    project={project}
                    tasks={projectTasks}
                    columns={columns}
                    columnWidth={columnWidth}
                    onTaskUpdate={onTaskUpdate}
                    isExpanded={expandedProjects[project.id] ?? true}
                    onToggleExpanded={() => {
                      setExpandedProjects(prev => ({
                        ...prev,
                        [project.id]: !prev[project.id],
                      }));
                    }}
                  />
                );
              })}
              
              {/* Unassigned Tasks Section */}
              {hasUnassignedTasks && (
                <ProjectSection
                  key="unassigned"
                  project={{
                    id: 'unassigned',
                    name: '⚠️ Unassigned Tasks',
                    status: 'BACKLOG',
                  }}
                  tasks={unassignedTasks}
                  columns={columns}
                  columnWidth={columnWidth}
                  onTaskUpdate={onTaskUpdate}
                  isExpanded={expandedProjects.unassigned ?? true}
                  onToggleExpanded={() => {
                    setExpandedProjects(prev => ({
                      ...prev,
                      unassigned: !prev.unassigned,
                    }));
                  }}
                />
              )}
            </div>
            
            {/* Empty State */}
            {filteredProjects.length === 0 && !hasUnassignedTasks && (
              <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
                No projects or tasks found
              </div>
            )}
          </div>
          
          {/* Dependency Arrows - Inside grid container for proper coordinate system */}
          <DependencyArrows 
            tasks={tasks} 
            expandedProjects={expandedProjects}
          />
          </div>
        </Xwrapper>
      </div>
    </div>
    </DndContext>
  );
}
