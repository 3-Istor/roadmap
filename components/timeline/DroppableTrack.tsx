'use client';

/**
 * Droppable Track Row with @dnd-kit
 * 
 * Acts as a drop zone for tasks
 */

import { useDroppable } from '@dnd-kit/core';
import { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

interface DroppableTrackProps {
  trackId: string;
  children: ReactNode;
  className?: string;
}

export function DroppableTrack({ trackId, children, className }: DroppableTrackProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: trackId,
  });
  
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'relative flex-1 min-h-[60px] py-2 transition-colors',
        isOver && 'bg-blue-50 dark:bg-blue-950/30 ring-2 ring-blue-400 ring-inset',
        className
      )}
    >
      {children}
    </div>
  );
}
