'use client';

/**
 * Project Section Component
 * 
 * Groups tracks by project with collapsible functionality
 */

import { useMemo } from 'react';
import { ChevronDown, ChevronRight, Star, Package, Flag } from 'lucide-react';
import { TrackRow } from './TrackRow';
import { type TimelineColumn } from '@/lib/utils/timeline';
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

interface Project {
  id: string;
  name: string;
  status: string;
}

interface ProjectSectionProps {
  project: Project;
  tasks: Task[];
  events: Array<{
    event: {
      id: string;
      name: string;
      eventType: string;
      startDate: Date;
      endDate?: Date | null;
      projects?: { id: string; name: string }[];
    };
    position: { columnIndex: number; isVisible: boolean };
  }>;
  columns: TimelineColumn[];
  columnWidth: string;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  onTaskUpdate?: (taskId: string, updates: Partial<{ startDate: Date; endDate: Date | null; track: string }>) => void;
  onEventClick?: (eventId: string) => void;
}

const tracks: Array<'BACKLOG' | 'BUG' | 'DESIGN' | 'DOC' | 'DEV'> = ['BACKLOG', 'BUG', 'DESIGN', 'DOC', 'DEV'];

const statusColors = {
  BACKLOG: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
  PAUSED: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300',
  IN_PROGRESS: 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300',
  DONE: 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300',
};

export function ProjectSection({ project, tasks, events, columns, columnWidth, isExpanded, onToggleExpanded, onTaskUpdate, onEventClick }: ProjectSectionProps) {
  const { mode } = useViewStore();
  const isEditMode = mode === 'edit';
  
  const statusColor = statusColors[project.status as keyof typeof statusColors] || statusColors.BACKLOG;
  
  // In edit mode, show all tracks. In view mode, only show tracks with tasks
  const tracksToShow = useMemo(() => {
    if (isEditMode) {
      return tracks; // Show all tracks in edit mode for drag & drop
    }
    
    // In view mode, only show tracks that have tasks
    return tracks.filter(track => {
      if (track === 'BACKLOG') {
        return tasks.some(t => !t.startDate || !t.track || t.track === 'BACKLOG');
      }
      return tasks.some(t => t.track === track && t.startDate);
    });
  }, [isEditMode, tasks]);
  
  return (
    <div className="border-b-2 border-gray-300 dark:border-gray-600">
      {/* Project Header */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        {/* Project Name (Sticky) */}
        <button
          onClick={onToggleExpanded}
          className={cn(
            'project-header sticky left-0 z-20 w-32 px-4 py-3 text-left',
            'border-r border-gray-200 dark:border-gray-700',
            'bg-gray-50 dark:bg-gray-800',
            'hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors',
            'flex items-center gap-2'
          )}
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-500" />
          )}
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm text-gray-900 dark:text-white truncate">
              {project.name}
            </div>
            <div className={cn(
              'text-[10px] px-1.5 py-0.5 rounded inline-block mt-1',
              statusColor
            )}>
              {project.status}
            </div>
          </div>
        </button>
        
        {/* Timeline Header Space with Events */}
        <div 
          className="flex-1 relative"
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${columns.length}, ${columnWidth})`,
          }}
        >
          {/* Render project-specific DELIVERABLE and MILESTONE events */}
          {(() => {
            // Group events by column index for stacking
            const eventsByColumn = new Map<number, typeof events>();
            
            events.forEach(item => {
              const col = item.position.columnIndex;
              if (!eventsByColumn.has(col)) {
                eventsByColumn.set(col, []);
              }
              eventsByColumn.get(col)!.push(item);
            });
            
            // Render stacked events using Flexbox for perfect centering
            const renderedEvents: React.ReactNode[] = [];
            eventsByColumn.forEach((eventsInColumn, colIndex) => {
              renderedEvents.push(
                <div
                  key={`proj-col-${colIndex}`}
                  className="absolute top-1/2 -translate-y-1/2 flex items-center justify-center -space-x-2 pointer-events-auto w-full"
                  style={{
                    gridColumnStart: colIndex + 1,
                    gridColumnEnd: colIndex + 2,
                    zIndex: 10,
                  }}
                >
                  {eventsInColumn.map((item, stackIndex) => {
                    const { event } = item;
                    
                    // Determine icon and color based on event type
                    let Icon = Flag;
                    let colorClass = 'bg-blue-500 text-white'; // Default for KEY_DATE
                    
                    if (event.eventType === 'MILESTONE') {
                      Icon = Star;
                      colorClass = 'bg-yellow-500 text-white';
                    } else if (event.eventType === 'DELIVERABLE') {
                      Icon = Package;
                      colorClass = 'bg-green-500 text-white';
                    }
                    
                    return (
                      <div
                        key={event.id}
                        className={cn(
                          'w-6 h-6 rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform cursor-pointer border-2 border-white dark:border-gray-900',
                          colorClass
                        )}
                        style={{ zIndex: 10 + stackIndex }}
                        title={`${event.name} (${event.eventType})`}
                        onClick={(e) => {
                          e.stopPropagation(); 
                          if (onEventClick) onEventClick(event.id);
                        }}
                      >
                        <Icon className="w-3 h-3" />
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
      
      {/* Track Rows */}
      {isExpanded && (
        <div>
          {tracksToShow.map(track => (
            <TrackRow
              key={track}
              track={track}
              tasks={tasks}
              columns={columns}
              columnWidth={columnWidth}
              onTaskUpdate={onTaskUpdate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
