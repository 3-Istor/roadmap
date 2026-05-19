'use client';

/**
 * Task Block Component
 * 
 * Individual task rendered on the timeline grid
 */

import { ExternalLink, Circle, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useViewStore } from '@/lib/store/viewStore';

interface TaskBlockProps {
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

export function TaskBlock({ task, gridColumnStart, gridColumnEnd }: TaskBlockProps) {
  const { setSelectedTask } = useViewStore();
  const config = statusConfig[task.status as keyof typeof statusConfig] || statusConfig.NOT_STARTED;
  const StatusIcon = config.icon;
  const priorityBorder = priorityBorders[task.priority as keyof typeof priorityBorders] || priorityBorders.MEDIUM;
  
  const notionUrl = `https://notion.so/${task.notionId.replace(/-/g, '')}`;
  
  const handleClick = () => {
    setSelectedTask(task.id);
  };
  
  return (
    <div
      id={`task-${task.id}`}
      className={cn(
        'task-block relative px-2 py-1.5 rounded border-2 text-xs font-medium min-h-12',
        'hover:shadow-md transition-shadow cursor-pointer group',
        config.color,
        priorityBorder
      )}
      style={{
        gridColumnStart,
        gridColumnEnd,
      }}
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
        >
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
      
      {/* Assigned Member */}
      {task.assignedTo && (
        <div className="text-[10px] opacity-75 truncate mt-0.5 ml-5">
          {task.assignedTo.name}
        </div>
      )}
    </div>
  );
}
