'use client';

/**
 * Draggable Task Block Component
 * 
 * Wraps TaskBlock with drag & resize functionality for Edit Mode
 * Uses @dnd-kit ONLY for dragging (both horizontal time shift and vertical track change)
 * Uses custom mouse events ONLY for resizing edges
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { ExternalLink, Circle, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useViewStore } from '@/lib/store/viewStore';
import { type TimelineColumn } from '@/lib/utils/timeline';
import { calculateResizedEndDate, calculateResizedStartDate } from '@/lib/utils/dragHelpers';
import toast from 'react-hot-toast';

interface DraggableTaskBlockProps {
  task: {
    id: string;
    notionId: string;
    title: string;
    status: string;
    track: string;
    priority: string;
    startDate: Date | null;
    endDate: Date | null;
    assignedTo?: { name: string } | null;
  };
  gridColumnStart: number;
  gridColumnEnd: number;
  columns: TimelineColumn[];
  columnWidth: string;
  onUpdate: (taskId: string, updates: { startDate?: Date; endDate?: Date | null; track?: string }) => Promise<void>;
}

const statusConfig = {
  NOT_STARTED: {
    color: 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-600',
    icon: Circle,
    iconColor: 'text-gray-500 dark:text-gray-400',
    label: 'Not Started',
  },
  IN_PROGRESS: {
    color: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 border-blue-400 dark:border-blue-600',
    icon: Loader2,
    iconColor: 'text-blue-600 dark:text-blue-400',
    label: 'In Progress',
  },
  REVIEW: {
    color: 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 border-orange-400 dark:border-orange-600',
    icon: AlertCircle,
    iconColor: 'text-orange-600 dark:text-orange-400',
    label: 'Blocked',
  },
  DONE: {
    color: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border-green-400 dark:border-green-600',
    icon: CheckCircle2,
    iconColor: 'text-green-600 dark:text-green-400',
    label: 'Done',
  },
};

const priorityBorders = {
  LOW: 'border-l-2',
  MEDIUM: 'border-l-4',
  HIGH: 'border-l-4 border-l-red-500 dark:border-l-red-600',
};

export function DraggableTaskBlock({ 
  task, 
  gridColumnStart, 
  gridColumnEnd, 
  columns,
  columnWidth,
  onUpdate 
}: DraggableTaskBlockProps) {
  const { setSelectedTask, mode } = useViewStore();
  const [isResizing, setIsResizing] = useState(false);
  const [isResizingLeft, setIsResizingLeft] = useState(false);
  const [tempColumnStart, setTempColumnStart] = useState(gridColumnStart);
  const [tempColumnEnd, setTempColumnEnd] = useState(gridColumnEnd);
  const [justResized, setJustResized] = useState(false);
  
  const dragStartX = useRef(0);
  const resizeStartColumn = useRef(gridColumnEnd);
  const resizeLeftStartColumn = useRef(gridColumnStart);
  
  // Setup @dnd-kit draggable for ALL dragging (both horizontal and vertical)
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    disabled: mode !== 'edit', // Allow dragging even without startDate
    data: {
      task,
      gridColumnStart,
      gridColumnEnd,
    },
  });
  
  const config = statusConfig[task.status as keyof typeof statusConfig] || statusConfig.NOT_STARTED;
  const StatusIcon = config.icon;
  const priorityBorder = priorityBorders[task.priority as keyof typeof priorityBorders] || priorityBorders.MEDIUM;
  
  const notionUrl = `https://notion.so/${task.notionId.replace(/-/g, '')}`;
  
  const isEditMode = mode === 'edit';
  
  // Handle task click (open modal)
  const handleClick = () => {
    // Only open modal if we didn't drag, resize, or just finished resizing
    if (!isDragging && !isResizing && !isResizingLeft && !justResized) {
      setSelectedTask(task.id);
    }
  };
  
  // Handle resize start (right edge)
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    if (!isEditMode || !task.startDate) return;
    
    setIsResizing(true);
    dragStartX.current = e.clientX;
    resizeStartColumn.current = gridColumnEnd;
    setTempColumnEnd(gridColumnEnd);
    
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
  }, [isEditMode, task.startDate, gridColumnEnd]);
  
  // Handle resize start (left edge)
  const handleResizeLeftStart = useCallback((e: React.MouseEvent) => {
    if (!isEditMode || !task.startDate) return;
    
    setIsResizingLeft(true);
    dragStartX.current = e.clientX;
    resizeLeftStartColumn.current = gridColumnStart;
    setTempColumnStart(gridColumnStart);
    
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
  }, [isEditMode, task.startDate, gridColumnStart]);
  
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing && !isResizingLeft) return;
    
    const element = document.getElementById(`task-${task.id}`);
    const gridElement = element?.parentElement;
    const realColumnWidth = gridElement ? (gridElement.clientWidth / columns.length) : 80;
    
    const deltaX = e.clientX - dragStartX.current;
    const columnsDelta = Math.round(deltaX / realColumnWidth);
    
    if (isResizing) {
      const newEnd = Math.max(
        gridColumnStart + 1, // Minimum 1 column width
        Math.min(
          columns.length + 1,
          resizeStartColumn.current + columnsDelta
        )
      );
      setTempColumnEnd(newEnd);
    } else if (isResizingLeft) {
      const newStart = Math.max(
        1,
        Math.min(
          gridColumnEnd - 1, // Must be at least 1 column before end
          resizeLeftStartColumn.current + columnsDelta
        )
      );
      setTempColumnStart(newStart);
    }
  }, [isResizing, isResizingLeft, gridColumnStart, gridColumnEnd, columns.length, task.id]);
  
  // Handle mouse up (end resize)
  const handleMouseUp = useCallback(async () => {
    if (!isResizing && !isResizingLeft) return;
    
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    
    // Set flag to prevent modal opening
    setJustResized(true);
    setTimeout(() => setJustResized(false), 200);
    
    if (isResizing) {
      setIsResizing(false);
      
      // Calculate new end date while keeping start date
      if (task.startDate && (tempColumnEnd !== gridColumnEnd)) {
        const startDate = task.startDate;
        const endDate = calculateResizedEndDate(task.startDate, tempColumnEnd, columns);
        
        try {
          await onUpdate(task.id, { startDate, endDate });
          toast.success('Task duration updated');
        } catch {
          // Revert on error
          setTempColumnEnd(gridColumnEnd);
          toast.error('Failed to update task');
        }
      }
    } else if (isResizingLeft) {
      setIsResizingLeft(false);
      
      // Calculate new start date while keeping end date
      if (task.endDate && (tempColumnStart !== gridColumnStart)) {
        const startDate = calculateResizedStartDate(task.endDate, tempColumnStart, columns);
        const endDate = task.endDate;
        
        try {
          await onUpdate(task.id, { startDate, endDate });
          toast.success('Task start date updated');
        } catch {
          // Revert on error
          setTempColumnStart(gridColumnStart);
          toast.error('Failed to update task');
        }
      }
    }
  }, [
    isResizing,
    isResizingLeft,
    task, 
    tempColumnStart, 
    tempColumnEnd, 
    gridColumnStart, 
    gridColumnEnd, 
    columns, 
    onUpdate
  ]);
  
  // Attach global mouse listeners for resize only
  useEffect(() => {
    if (isResizing || isResizingLeft) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing, isResizingLeft, handleMouseMove, handleMouseUp]);
  
  // During resize, show temp columns. During drag, freeze grid position and use transform only
  const displayColumnStart = isResizingLeft ? tempColumnStart : gridColumnStart;
  const displayColumnEnd = isResizing ? tempColumnEnd : gridColumnEnd;
  
  // Apply @dnd-kit transform for dragging (both horizontal and vertical)
  // CRITICAL: Do NOT change grid columns while isDragging - only use transform
  const style = (isDragging && transform) ? {
    transform: CSS.Translate.toString(transform),
    gridColumnStart: gridColumnStart, // Freeze at original position
    gridColumnEnd: gridColumnEnd,     // Freeze at original position
    zIndex: 1000,
  } : {
    gridColumnStart: displayColumnStart,
    gridColumnEnd: displayColumnEnd,
  };
  
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(isEditMode && !isResizing && !isResizingLeft ? listeners : {})}
      {...(isEditMode && !isResizing && !isResizingLeft ? attributes : {})}
      id={`task-${task.id}`}
      className={cn(
        'task-block relative px-2 py-1.5 rounded border-2 text-xs font-medium min-h-12',
        'transition-shadow group',
        isEditMode && !isResizing && !isResizingLeft && 'cursor-grab active:cursor-grabbing',
        !isEditMode && 'cursor-pointer',
        !isDragging && 'hover:shadow-md',
        (isDragging || isResizing || isResizingLeft) && 'shadow-2xl ring-4 ring-blue-500 scale-105',
        isDragging && 'opacity-70 rotate-2',
        config.color,
        priorityBorder
      )}
      onClick={handleClick}
      title={`${task.title}\nStatus: ${config.label}\nPriority: ${task.priority}${task.assignedTo ? `\nAssigned: ${task.assignedTo.name}` : ''}`}
    >
      {/* Task Title with Status Icon */}
      <div className="flex items-start justify-between gap-1">
        <div className="flex items-start gap-1.5 flex-1 min-w-0">
          <StatusIcon 
            className={cn(
              'w-3.5 h-3.5 shrink-0 mt-0.5',
              config.iconColor,
              task.status === 'IN_PROGRESS' && 'animate-spin'
            )} 
          />
          <span className="line-clamp-2 leading-tight whitespace-normal wrap-break-word flex-1">
            {task.title}
          </span>
        </div>
        
        {/* Notion Link */}
        <a
          href={notionUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
      
      {/* Bottom Row: Assigned Member */}
      <div className="flex items-center justify-between gap-2 mt-0.5">
        {/* Assigned Member */}
        {task.assignedTo && (
          <div className="text-[10px] opacity-75 truncate ml-5">
            {task.assignedTo.name}
          </div>
        )}
      </div>
      
      {/* Left Resize Handle (Edit Mode Only) */}
      {isEditMode && task.startDate && task.endDate && (
        <div
          className="absolute left-0 top-0 bottom-0 w-3 cursor-ew-resize hover:bg-blue-400/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
          onPointerDown={(e) => {
            e.stopPropagation();
            handleResizeLeftStart({ clientX: e.clientX } as React.MouseEvent);
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-1 h-8 bg-gray-400 rounded-full" />
        </div>
      )}
      
      {/* Right Resize Handle (Edit Mode Only) */}
      {isEditMode && task.startDate && (
        <div
          className="absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize hover:bg-blue-400/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
          onPointerDown={(e) => {
            e.stopPropagation();
            handleResizeStart({ clientX: e.clientX } as React.MouseEvent);
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-1 h-8 bg-gray-400 rounded-full" />
        </div>
      )}
    </div>
  );
}
