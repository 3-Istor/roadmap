'use client';

/**
 * Task Details Modal
 * 
 * Shows full task information in a centered popup
 */

import { useEffect } from 'react';
import { X, ExternalLink, Calendar, Clock, Target, Flag, User, Link as LinkIcon } from 'lucide-react';
import { format } from 'date-fns';
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
  estimatedTime?: number | null;
  storyPoints?: number | null;
  assignedTo?: { name: string } | null;
  project?: { name: string } | null;
  blocks: { id: string }[];
  blockedBy: { id: string }[];
}

interface TaskModalProps {
  task: Task;
  onClose: () => void;
}

const statusColors = {
  NOT_STARTED: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
  IN_PROGRESS: 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300',
  REVIEW: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300',
  DONE: 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300',
};

const priorityColors = {
  LOW: 'text-gray-600 dark:text-gray-400',
  MEDIUM: 'text-yellow-600 dark:text-yellow-400',
  HIGH: 'text-red-600 dark:text-red-400',
};

const trackColors = {
  BACKLOG: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
  BUG: 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300',
  DESIGN: 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300',
  DOC: 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300',
  DEV: 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300',
};

export function TaskModal({ task, onClose }: TaskModalProps) {
  const notionUrl = `https://notion.so/${task.notionId.replace(/-/g, '')}`;
  
  // Handle Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);
  
  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);
  
  const statusColor = statusColors[task.status as keyof typeof statusColors] || statusColors.NOT_STARTED;
  const priorityColor = priorityColors[task.priority as keyof typeof priorityColors] || priorityColors.MEDIUM;
  const trackColor = trackColors[task.track as keyof typeof trackColors] || trackColors.DEV;
  
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900 rounded-lg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 p-6 border-b bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white leading-tight">
              {task.title}
            </h2>
            {task.project && (
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {task.project.name}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Status, Track, Priority */}
          <div className="flex flex-wrap gap-3">
            <div className={cn('px-3 py-1.5 rounded-lg text-sm font-medium', statusColor)}>
              {task.status.replace(/_/g, ' ')}
            </div>
            <div className={cn('px-3 py-1.5 rounded-lg text-sm font-medium', trackColor)}>
              {task.track}
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800">
              <Flag className={cn('w-4 h-4', priorityColor)} />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {task.priority} Priority
              </span>
            </div>
          </div>
          
          {/* Dates */}
          {(task.startDate || task.endDate) && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Calendar className="w-4 h-4" />
                <span className="font-medium">Timeline</span>
              </div>
              <div className="pl-6 space-y-1 text-sm">
                {task.startDate && (
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Start: </span>
                    <span className="text-gray-900 dark:text-white font-medium">
                      {format(task.startDate, 'MMM d, yyyy')}
                    </span>
                  </div>
                )}
                {task.endDate && (
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">End: </span>
                    <span className="text-gray-900 dark:text-white font-medium">
                      {format(task.endDate, 'MMM d, yyyy')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Estimated Time & Story Points */}
          {(task.estimatedTime || task.storyPoints) && (
            <div className="grid grid-cols-2 gap-4">
              {task.estimatedTime && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Clock className="w-4 h-4" />
                    <span className="font-medium">Estimated Time</span>
                  </div>
                  <div className="pl-6 text-lg font-semibold text-gray-900 dark:text-white">
                    {task.estimatedTime}h
                  </div>
                </div>
              )}
              {task.storyPoints && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Target className="w-4 h-4" />
                    <span className="font-medium">Story Points</span>
                  </div>
                  <div className="pl-6 text-lg font-semibold text-gray-900 dark:text-white">
                    {task.storyPoints}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Assigned To */}
          {task.assignedTo && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <User className="w-4 h-4" />
                <span className="font-medium">Assigned To</span>
              </div>
              <div className="pl-6 text-sm text-gray-900 dark:text-white font-medium">
                {task.assignedTo.name}
              </div>
            </div>
          )}
          
          {/* Dependencies */}
          {(task.blocks.length > 0 || task.blockedBy.length > 0) && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <LinkIcon className="w-4 h-4" />
                <span className="font-medium">Dependencies</span>
              </div>
              <div className="pl-6 space-y-1 text-sm">
                {task.blocks.length > 0 && (
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Blocks: </span>
                    <span className="text-gray-900 dark:text-white">
                      {task.blocks.length} task(s)
                    </span>
                  </div>
                )}
                {task.blockedBy.length > 0 && (
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Blocked by: </span>
                    <span className="text-gray-900 dark:text-white">
                      {task.blockedBy.length} task(s)
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="sticky bottom-0 flex items-center justify-between gap-4 p-6 border-t bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <a
            href={notionUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Open in Notion
          </a>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
