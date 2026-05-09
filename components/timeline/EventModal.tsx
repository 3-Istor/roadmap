'use client';

/**
 * Event Details Modal
 * 
 * Shows full event information in a centered popup
 */

import { useEffect } from 'react';
import { X, ExternalLink, Calendar, Flag, Star, Cake, Package, Users } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils/cn';

interface Event {
  id: string;
  notionId?: string;
  name: string;
  eventType: string;
  startDate: Date;
  endDate?: Date | null;
  description?: string | null;
  persons?: { id: string; name: string }[];
  projects?: { id: string; name: string }[];
}

interface EventModalProps {
  event: Event;
  onClose: () => void;
}

const eventTypeColors = {
  MANAGER_PERIOD: 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300',
  VACATION: 'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300',
  KEY_DATE: 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300',
  DELIVERABLE: 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300',
  MILESTONE: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300',
  ANNIVERSARY: 'bg-pink-100 dark:bg-pink-900 text-pink-700 dark:text-pink-300',
};

const eventTypeIcons = {
  MANAGER_PERIOD: Calendar,
  VACATION: Calendar,
  KEY_DATE: Flag,
  DELIVERABLE: Package,
  MILESTONE: Star,
  ANNIVERSARY: Cake,
};

export function EventModal({ event, onClose }: EventModalProps) {
  const notionUrl = event.notionId ? `https://notion.so/${event.notionId.replace(/-/g, '')}` : null;
  
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
  
  const typeColor = eventTypeColors[event.eventType as keyof typeof eventTypeColors] || eventTypeColors.KEY_DATE;
  const TypeIcon = eventTypeIcons[event.eventType as keyof typeof eventTypeIcons] || Flag;
  
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
            <div className="flex items-center gap-3 mb-2">
              <div className={cn('p-2 rounded-lg', typeColor)}>
                <TypeIcon className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white leading-tight">
                {event.name}
              </h2>
            </div>
            <div className={cn('inline-block px-3 py-1 rounded-lg text-sm font-medium', typeColor)}>
              {event.eventType.replace(/_/g, ' ')}
            </div>
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
          {/* Date(s) */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Calendar className="w-4 h-4" />
              <span className="font-medium">Date</span>
            </div>
            <div className="pl-6 space-y-1 text-sm">
              <div>
                <span className="text-gray-600 dark:text-gray-400">
                  {event.endDate && event.endDate.getTime() !== event.startDate.getTime() ? 'Start: ' : 'Date: '}
                </span>
                <span className="text-gray-900 dark:text-white font-medium">
                  {format(event.startDate, 'EEEE, MMMM d, yyyy')}
                </span>
              </div>
              {event.endDate && event.endDate.getTime() !== event.startDate.getTime() && (
                <div>
                  <span className="text-gray-600 dark:text-gray-400">End: </span>
                  <span className="text-gray-900 dark:text-white font-medium">
                    {format(event.endDate, 'EEEE, MMMM d, yyyy')}
                  </span>
                </div>
              )}
            </div>
          </div>
          
          {/* Description */}
          {event.description && (
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Description
              </div>
              <div className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
                {event.description}
              </div>
            </div>
          )}
          
          {/* Associated People */}
          {event.persons && event.persons.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Users className="w-4 h-4" />
                <span className="font-medium">People</span>
              </div>
              <div className="pl-6 flex flex-wrap gap-2">
                {event.persons.map(person => (
                  <div
                    key={person.id}
                    className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg"
                  >
                    {person.name}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Associated Projects */}
          {event.projects && event.projects.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Package className="w-4 h-4" />
                <span className="font-medium">Projects</span>
              </div>
              <div className="pl-6 flex flex-wrap gap-2">
                {event.projects.map(project => (
                  <div
                    key={project.id}
                    className="px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100 rounded-lg font-medium"
                  >
                    {project.name}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="sticky bottom-0 flex items-center justify-between gap-4 p-6 border-t bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          {notionUrl ? (
            <a
              href={notionUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Open in Notion
            </a>
          ) : (
            <div />
          )}
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
