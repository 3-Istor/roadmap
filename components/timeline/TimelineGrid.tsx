'use client';

/**
 * Timeline Grid Component
 * 
 * Main custom CSS Grid timeline with columns, playhead, and event overlays
 */

import { useMemo, useState, useCallback } from 'react';
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { addDays, isWeekend, format, getWeek } from 'date-fns';
import toast from 'react-hot-toast';
import { Xwrapper } from 'react-xarrows';
import { Calendar, Flag, Star, Cake, Package } from 'lucide-react';
import { ProjectSection } from './ProjectSection';
import { DependencyArrows } from './DependencyArrows';
import { 
  generateTimelineColumns, 
  getColumnWidth,
  calculateEventPosition,
  calculateTaskPosition,
} from '@/lib/utils/timeline';
import { useViewStore } from '@/lib/store/viewStore';
import { useDragScroll } from '@/lib/utils/useDragScroll';
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
  project?: { id: string; name: string; status: string } | null;
  blocks: { id: string }[];
  blockedBy: { id: string }[];
}

interface Event {
  id: string;
  name: string;
  eventType: string;
  startDate: Date;
  endDate?: Date | null;
  projects?: { id: string; name: string }[];
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
  const { timeRange, selectedProjectId, mode, addToHistory, timeOffset, setSelectedEvent } = useViewStore();
  
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
    const cols = generateTimelineColumns(timeRange, timeOffset);
    console.log('Generated columns:', {
      count: cols.length,
      firstDate: cols[0]?.date,
      lastDate: cols[cols.length - 1]?.date,
      timeRange,
      timeOffset,
    });
    return cols;
  }, [timeRange, timeOffset]);
  
  const columnWidth = getColumnWidth(timeRange);
  
  // Determine if this view should use flexible width (no scrolling) or fixed width (scrolling)
  const isFlexibleWidth = timeRange === 'week' || timeRange === 'month';
  const gridContainerClass = isFlexibleWidth ? 'w-full' : 'min-w-max';
  
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
    if (columns.length === 0) return [];
    
    const timelineStart = new Date(columns[0].date).setHours(0, 0, 0, 0);
    const timelineEnd = new Date(columns[columns.length - 1].date).setHours(0, 0, 0, 0);

    const filtered = events
      .filter(event => event.eventType !== 'VACATION')
      .map(event => {
        const position = calculateEventPosition(event.startDate, columns);
        
        const eventStart = new Date(event.startDate).setHours(0, 0, 0, 0);
        const eventEnd = event.endDate ? new Date(event.endDate).setHours(0, 0, 0, 0) : eventStart;
        
        const isVisible = (eventStart >= timelineStart && eventStart <= timelineEnd) ||
                          (eventEnd >= timelineStart && eventEnd <= timelineEnd) ||
                          (eventStart <= timelineStart && eventEnd >= timelineEnd);
        
        return { event, position: { ...position, isVisible } };
      })
      .filter(({ position }) => position.isVisible);
    
    return filtered;
  }, [events, columns]);
  
  // Separate events for pinned track vs project-specific
  const pinnedEvents = useMemo(() => {
    return visibleEvents.filter(({ event }) => {
      return ['MANAGER_PERIOD', 'ANNIVERSARY', 'KEY_DATE', 'MILESTONE', 'DELIVERABLE'].includes(event.eventType);
    });
  }, [visibleEvents]);
  
  // Check if a date falls within any vacation event
  const isVacationDay = useCallback((date: Date) => {
    return events.some(event => {
      if (event.eventType !== 'VACATION') return false;
      
      const eventStart = event.startDate;
      const eventEnd = event.endDate || event.startDate;
      
      return date >= eventStart && date <= eventEnd;
    });
  }, [events]);
  
  // Find today's column index for playhead
  const todayColumnIndex = useMemo(() => {
    return columns.findIndex(col => col.isToday);
  }, [columns]);
  
  // Get visible date range info for header
  const dateRangeInfo = useMemo(() => {
    if (columns.length === 0) return { months: [], weeks: [] };
    
    const startDate = columns[0].date;
    const endDate = columns[columns.length - 1].date;
    
    // Get unique months in the range
    const months = new Set<string>();
    const weeks = new Set<number>();
    
    columns.forEach(col => {
      months.add(format(col.date, 'MMMM yyyy'));
      weeks.add(getWeek(col.date, { weekStartsOn: 1 }));
    });
    
    return {
      months: Array.from(months),
      weeks: Array.from(weeks).sort((a, b) => a - b),
      startDate,
      endDate,
    };
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
    
    const firstGrid = document.querySelector('.flex-1[style*="grid-template-columns"]');
    const realColumnWidthPx = firstGrid ? (firstGrid.clientWidth / columns.length) : 80;
    
    // Handle horizontal shift (time change)
    if (task.startDate) {
      const daysShifted = Math.round(delta.x / realColumnWidthPx);
      
      if (daysShifted !== 0) {
        const newStartDate = addDays(task.startDate, daysShifted);
        const newEndDate = task.endDate ? addDays(task.endDate, daysShifted) : null;
        
        if (!isNaN(newStartDate.getTime())) {
          updates.startDate = newStartDate;
          updates.endDate = newEndDate;
        }
      }
    } else {
      if (columns.length > 0 && firstGrid) {
        const gridRect = firstGrid.getBoundingClientRect();
        const dropLeft = active.rect.current.translated?.left || 0;
        
        const offsetX = dropLeft - gridRect.left;
        
        const droppedColumnIndex = Math.floor(offsetX / realColumnWidthPx);
        const safeIndex = Math.max(0, Math.min(columns.length - 1, droppedColumnIndex));
        const newStartDate = columns[safeIndex].date;
        
        if (!isNaN(newStartDate.getTime())) {
          updates.startDate = newStartDate;
          updates.endDate = newStartDate; 
        }
      }
    }
    
    const TRACK_HEIGHT = 76; 
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
      {/* 1. Conteneur principal SANS flex-1 ni h-full */}
      <div className="flex flex-col w-full relative">
        
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
        
        {/* 2. TIMELINE HEADER : Enlever "sticky top-0" et ajouter "shrink-0" */}
        <div className="sticky top-0 z-40 flex shrink-0 border-b-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 shadow-sm">
          {/* Sidebar Header Space with Date Range Info */}
          <div className="shrink-0 w-32 border-r border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-2 py-2 flex flex-col justify-center">
            <div className="text-[10px] font-semibold text-gray-900 dark:text-gray-100 leading-tight">
              {dateRangeInfo.months.length > 0 && (
                <div className="mb-1">
                  {dateRangeInfo.months.length === 1 ? (
                    <span>{dateRangeInfo.months[0]}</span>
                  ) : (
                    <span className="truncate" title={dateRangeInfo.months.join(', ')}>
                      {dateRangeInfo.months[0]}
                      {dateRangeInfo.months.length > 1 && ` +${dateRangeInfo.months.length - 1}`}
                    </span>
                  )}
                </div>
              )}
              {dateRangeInfo.weeks.length > 0 && (
                <div className="text-[9px] text-gray-600 dark:text-gray-400">
                  {dateRangeInfo.weeks.length === 1 ? (
                    <span>Week {dateRangeInfo.weeks[0]}</span>
                  ) : dateRangeInfo.weeks.length <= 3 ? (
                    <span>W{dateRangeInfo.weeks.join(', ')}</span>
                  ) : (
                    <span>W{dateRangeInfo.weeks[0]}-{dateRangeInfo.weeks[dateRangeInfo.weeks.length - 1]}</span>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* Column Headers - Scroll horizontally */}
          <div 
            ref={(el) => {
              if (el) {
                (el as any)._headerScroll = true;
              }
            }}
            className={cn(
              "flex-1 overflow-x-auto scrollbar-hide",
              isFlexibleWidth && "overflow-x-hidden"
            )}
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            onScroll={(e) => {
              const bodyScroll = document.querySelector('[data-timeline-body]') as HTMLElement;
              if (bodyScroll && !(e.currentTarget as any)._syncing) {
                (bodyScroll as any)._syncing = true;
                bodyScroll.scrollLeft = e.currentTarget.scrollLeft;
                requestAnimationFrame(() => {
                  (bodyScroll as any)._syncing = false;
                });
              }
            }}
          >
            <div
              className={gridContainerClass}
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${columns.length}, ${columnWidth})`,
              }}
            >
              {columns.map((column, index) => {
                const isWeekendDay = isWeekend(column.date);
                const weekNumber = getWeek(column.date, { weekStartsOn: 1 });
                
                // Show week number on Mondays or first column
                const showWeekNumber = (column.date.getDay() === 1 || index === 0) && timeRange !== 'week';
                
                return (
                  <div
                    key={index}
                    className={cn(
                      'px-2 py-2 text-center text-xs font-medium border-r border-gray-100 dark:border-gray-800/50',
                      column.isToday && 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300',
                      isWeekendDay && !column.isToday && 'bg-gray-50/50 dark:bg-gray-800/30'
                    )}
                  >
                    <div className="leading-tight">
                      {column.label}
                      {showWeekNumber && (
                        <div className="text-[9px] text-gray-500 dark:text-gray-500 mt-0.5">
                          W{weekNumber}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        
        {/* 3. TIMELINE BODY : Remplacer "overflow-x-auto" par "flex-1 overflow-auto" */}
        <div 
          ref={scrollRef}
          className={cn(
            "w-full overflow-x-auto timeline-drag-container",
            isFlexibleWidth && "overflow-x-hidden"
          )}
          data-timeline-body
          onScroll={(e) => {
            const headerScroll = document.querySelector('[data-timeline-body]')?.parentElement?.querySelector('.overflow-x-auto') as HTMLElement;
            if (headerScroll && !(e.currentTarget as any)._syncing) {
              (headerScroll as any)._syncing = true;
              headerScroll.scrollLeft = e.currentTarget.scrollLeft;
              requestAnimationFrame(() => {
                (headerScroll as any)._syncing = false;
              });
            }
          }}
        >
          <Xwrapper>
            <div className={gridContainerClass}>
              {/* Timeline Body */}
              <div className="relative">
                {/* Weekend & Vacation Background Columns */}
                <div 
                  className="absolute top-0 left-32 right-0 bottom-0 pointer-events-none z-0"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${columns.length}, ${columnWidth})`,
                  }}
                >
                  {columns.map((column, index) => {
                    const isWeekendDay = isWeekend(column.date);
                    const isVacation = isVacationDay(column.date);
                    return (
                      <div
                        key={index}
                        className={cn(
                          'border-r border-gray-100 dark:border-gray-800/50',
                          isWeekendDay && !isVacation && 'bg-gray-50/50 dark:bg-gray-800/30',
                          isVacation && 'bg-orange-50/50 dark:bg-orange-900/20'
                        )}
                      />
                    );
                  })}
                </div>
                
                {/* Pinned Events Track - Global events above all projects */}
                <div className="flex border-b-2 border-gray-300 dark:border-gray-600 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30">
                  {/* Track Label */}
                  <div className="sticky left-0 z-20 w-32 border-r-2 border-gray-300 dark:border-gray-600 bg-purple-100 dark:bg-purple-900/50">
                    <div className="px-4 py-3 text-sm font-semibold min-h-[60px] flex items-center">
                      <span className="text-purple-700 dark:text-purple-300">📌 Events</span>
                    </div>
                  </div>
                  
                  {/* Timeline Grid for Events */}
                  <div
                    className="relative flex-1 min-h-[60px] py-2"
                    style={{
                      display: 'grid',
                      gridTemplateColumns: `repeat(${columns.length}, ${columnWidth})`,
                      gap: '0',
                    }}
                  >
                    {/* Render MANAGER_PERIOD events as horizontal bars */}
                    {pinnedEvents
                      .filter(({ event }) => event.eventType === 'MANAGER_PERIOD')
                      .map(({ event }) => {
                        const startPos = calculateTaskPosition(
                          event.startDate,
                          event.endDate || event.startDate,
                          columns
                        );
                        
                        if (!startPos.isVisible) return null;
                        
                        return (
                          <div
                            key={event.id}
                            className="absolute top-2 h-10 bg-purple-500 dark:bg-purple-600 rounded-md shadow-sm border border-purple-600 dark:border-purple-500 hover:z-10 hover:shadow-md transition-shadow cursor-pointer overflow-hidden"
                            style={{
                              gridColumnStart: startPos.gridColumnStart,
                              gridColumnEnd: startPos.gridColumnEnd,
                            }}
                            title={`${event.name} (${event.eventType})`}
                            onClick={() => setSelectedEvent(event.id)}
                          >
                            <div className="sticky left-0 flex items-center h-full px-3 w-max max-w-full">
                              <Calendar className="w-4 h-4 mr-2 flex-shrink-0 text-white" />
                              <span className="truncate text-white text-sm font-medium">{event.name}</span>
                            </div>
                          </div>
                        );
                      })}
                    
                    {/* Render global KEY_DATE, MILESTONE, DELIVERABLE, and ANNIVERSARY events as icons */}
                    {(() => {
                      const eventsByColumn = new Map<number, Array<{ event: typeof pinnedEvents[0]['event'] }>>();
                      
                      pinnedEvents
                        .filter(({ event }) => 
                          event.eventType === 'KEY_DATE' || 
                          event.eventType === 'MILESTONE' || 
                          event.eventType === 'DELIVERABLE' ||
                          event.eventType === 'ANNIVERSARY'
                        )
                        .forEach(item => {
                          const col = item.position.columnIndex;
                          if (!eventsByColumn.has(col)) {
                            eventsByColumn.set(col, []);
                          }
                          eventsByColumn.get(col)!.push(item);
                        });
                      
                      const renderedEvents: React.ReactNode[] = [];
                      eventsByColumn.forEach((eventsInColumn, colIndex) => {
                        renderedEvents.push(
                          <div
                            key={`global-col-${colIndex}`}
                            className="absolute top-1/2 -translate-y-1/2 flex items-center justify-center -space-x-3 pointer-events-auto w-full"
                            style={{
                              gridColumnStart: colIndex + 1,
                              gridColumnEnd: colIndex + 2,
                              zIndex: 20,
                            }}
                          >
                            {eventsInColumn.map(({ event }, stackIndex) => {
                              let Icon = Flag;
                              let colorClass = 'bg-blue-500 text-white';
                              
                              if (event.eventType === 'MILESTONE') {
                                Icon = Star;
                                colorClass = 'bg-yellow-500 text-white';
                              } else if (event.eventType === 'DELIVERABLE') {
                                Icon = Package;
                                colorClass = 'bg-green-500 text-white';
                              } else if (event.eventType === 'ANNIVERSARY') {
                                Icon = Cake;
                                colorClass = 'bg-pink-500 text-white';
                              }
                              
                              return (
                                <div
                                  key={event.id}
                                  className={cn(
                                    'w-8 h-8 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform cursor-pointer border-2 border-white dark:border-gray-900',
                                    colorClass
                                  )}
                                  style={{ zIndex: 20 + stackIndex }}
                                  title={`${event.name} (${event.eventType})`}
                                  onClick={() => setSelectedEvent(event.id)}
                                >
                                  <Icon className="w-4 h-4" />
                                </div>
                              );
                            })}
                          </div>
                        );
                      });
                      
                      return renderedEvents;
                    })()}
                  </div>
                </div>
                
                {/* Today Playhead */}
                {todayColumnIndex >= 0 && (
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-blue-500 z-10 pointer-events-none"
                    style={{
                      left: isFlexibleWidth 
                        ? `calc(8rem + (100% - 8rem) * ${(todayColumnIndex + 0.5) / columns.length})`
                        : `calc(8rem + ${todayColumnIndex} * ${columnWidth} + ${columnWidth} / 2)`,
                    }}
                  >
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-3 bg-blue-500 rounded-full" />
                  </div>
                )}
                
                {/* Project Sections */}
                <div>
                  {filteredProjects.map(project => {
                    const projectTasks = tasksByProject.get(project.id) || [];
                    
                    if (projectTasks.length === 0) return null;
                    
                    // Filter events for this project (DELIVERABLE and MILESTONE)
                    const projectEvents = visibleEvents.filter(({ event }) => {
                      if (
                        event.eventType !== 'DELIVERABLE' && 
                        event.eventType !== 'MILESTONE' && 
                        event.eventType !== 'KEY_DATE'
                      ) {
                        return false;
                      }
                      return event.projects?.some(p => p.id === project.id);
                    });
                    
                    console.log(`Project ${project.name} events:`, projectEvents.length, projectEvents.map(e => e.event.name));
                    
                    return (
                      <ProjectSection
                        key={project.id}
                        project={project}
                        tasks={projectTasks}
                        events={projectEvents}
                        columns={columns}
                        columnWidth={columnWidth}
                        onTaskUpdate={onTaskUpdate}
                        onEventClick={setSelectedEvent}
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
                      events={[]}
                      columns={columns}
                      columnWidth={columnWidth}
                      onTaskUpdate={onTaskUpdate}
                      onEventClick={setSelectedEvent}
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
