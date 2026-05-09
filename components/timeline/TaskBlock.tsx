'use client';

'use client';

/**
 * Task Block Component
 * 
 * Individual task rendered on the timeline grid
 */

import { ExternalLink } from 'lucide-react';
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

export function TaskBlock({ task, gridColumnStart, gridColumnEnd }: TaskBlockProps) {
  const { setSelectedTask } = useViewStore();
  const statusColor = statusColors[task.status as keyof typeof statusColors] || statusColors.NOT_STARTED;
  const priorityBorder = priorityBorders[task.priority as keyof typeof priorityBorders] || priorityBorders.MEDIUM;
  
  const notionUrl = `https://notion.so/${task.notionId.replace(/-/g, '')}`;
  
  const handleClick = () => {
    setSelectedTask(task.id);
  };
  
  return (
    <div
      id={`task-${task.id}`}
      className={cn(
        'task-block relative px-2 py-1.5 rounded border text-xs font-medium min-h-12',
        'hover:shadow-md transition-shadow cursor-pointer group',
        statusColor,
        priorityBorder
      )}
      style={{
        gridColumnStart,
        gridColumnEnd,
      }}
      onClick={handleClick}
      title={`${task.title}\nStatus: ${task.status}\nPriority: ${task.priority}${task.assignedTo ? `\nAssigned: ${task.assignedTo.name}` : ''}`}
    >
      {/* Task Title - Multi-line */}
      <div className="flex items-start justify-between gap-1">
        <span className="line-clamp-2 leading-tight whitespace-normal break-words flex-1">
          {task.title}
        </span>
        
        {/* Notion Link */}
        <a
          href={notionUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
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
