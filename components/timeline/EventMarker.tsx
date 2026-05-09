'use client';

/**
 * Event Marker Component
 * 
 * Visual markers for milestones, vacations, deliverables, etc.
 */

import { Flag, Plane, Calendar, Package, Star, Cake } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface EventMarkerProps {
  event: {
    id: string;
    name: string;
    eventType: string;
    startDate: Date;
  };
  columnIndex: number;
  columnWidth: string;
}

const eventIcons = {
  MANAGER_PERIOD: Calendar,
  VACATION: Plane,
  KEY_DATE: Flag,
  DELIVERABLE: Package,
  MILESTONE: Star,
  ANNIVERSARY: Cake,
};

const eventColors = {
  MANAGER_PERIOD: 'bg-purple-500 text-white',
  VACATION: 'bg-orange-500 text-white',
  KEY_DATE: 'bg-blue-500 text-white',
  DELIVERABLE: 'bg-green-500 text-white',
  MILESTONE: 'bg-yellow-500 text-white',
  ANNIVERSARY: 'bg-pink-500 text-white',
};

export function EventMarker({ event, columnIndex, columnWidth }: EventMarkerProps) {
  const Icon = eventIcons[event.eventType as keyof typeof eventIcons] || Flag;
  const colorClass = eventColors[event.eventType as keyof typeof eventColors] || eventColors.KEY_DATE;
  
  return (
    <div
      className="absolute top-0 z-10 flex flex-col items-center"
      style={{
        left: `calc(${columnIndex} * ${columnWidth})`,
      }}
      title={`${event.name}\n${event.eventType}`}
    >
      {/* Icon */}
      <div className={cn(
        'w-8 h-8 rounded-full flex items-center justify-center shadow-lg',
        'hover:scale-110 transition-transform cursor-pointer',
        colorClass
      )}>
        <Icon className="w-4 h-4" />
      </div>
      
      {/* Label */}
      <div className="mt-1 text-[10px] font-medium text-gray-700 dark:text-gray-300 text-center max-w-[80px] truncate">
        {event.name}
      </div>
    </div>
  );
}
