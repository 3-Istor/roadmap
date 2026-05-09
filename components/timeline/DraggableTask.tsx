'use client';

/**
 * Draggable Task with @dnd-kit
 * 
 * Supports vertical dragging between tracks
 */

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useViewStore } from '@/lib/store/viewStore';

interface DraggableTaskProps {
  task: {
    id: string;
    notionId: string;
    title: string;
    status: string;
    track: string;
    priority: string;
    assignedTo?: { name: string } | null;
  };
  gridColumnStart: number;
  gridColumnEnd: number;
}

const statusColors = {
  NOT_STARTED: 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
  IN_PROGRESS: 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700',
  REVIEW: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700',
  DONE: 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700',
};

const priorityBorders = {
  LOW: 'border-l-2',
  MEDIUM: 'border-l-4',
  HIGH: 'border-l-4 border-l-red-500',
};

export function DraggableTask({ task, gridColumnStart, gridColumnEnd }: DraggableTaskProps) {
  const { setSelectedTask, mode } = useViewStore();
  const isEditMode = mode === 'edit';
  
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    disabled: !isEditMode,
  });
  
  const style = transform ? {
    transform: CSS.Translate.toString(transform),
    gridColumnStart,
    gridColumnEnd,
  } : {
    gridColumnStart,
    gridColumnEnd,
  };
  
  const statusColor = statusColors[task.status as keyof typeof statusColors] || statusColors.NOT_STARTED;
  const priorityBorder = priorityBorders[task.priority as keyof typeof priorityBorders] || priorityBorders.MEDIUM;
  
  const notionUrl = `https://notion.so/${task.notionId.replace(/-/g, '')}`;
  
  const handleClick = () => {
    if (!isDragging) {
      setSelectedTask(task.id);
    }
  };
  
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(isEditMode ? listeners : {})}
      {...(isEditMode ? attributes : {})}
      id={`task-${task.id}`}
      className={cn(
        'task-block relative px-2 py-1.5 rounded border text-xs font-medium min-h-12',
        'hover:shadow-md transition-shadow group',
        isEditMode ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer',
        isDragging && 'opacity-50 shadow-lg ring-2 ring-blue-400 z-50',
        statusColor,
        priorityBorder
      )}
      onClick={handleClick}
      title={`${task.title}\nStatus: ${task.status}\nPriority: ${task.priority}${task.assignedTo ? `\nAssigned: ${task.assignedTo.name}` : ''}`}
    >
      {/* Task Title */}
      <div className="flex items-start justify-between gap-1">
        <span className="line-clamp-2 leading-tight whitespace-normal wrap-break-word flex-1">
          {task.title}
        </span>
        
        {/* Notion Link */}
        <a
          href={notionUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
      
      {/* Assigned Member */}
      {task.assignedTo && (
        <div className="text-[10px] opacity-75 truncate mt-0.5">
          {task.assignedTo.name}
        </div>
      )}
    </div>
  );
}
