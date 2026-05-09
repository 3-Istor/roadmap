'use client';

/**
 * Dependency Arrows Component
 * 
 * Draws SVG arrows between tasks using react-xarrows
 */

import { useEffect, useState } from 'react';
import Xarrow, { useXarrow, Xwrapper } from 'react-xarrows';

interface Task {
  id: string;
  blocks: { id: string }[];
  blockedBy: { id: string }[];
}

interface DependencyArrowsProps {
  tasks: Task[];
}

export function DependencyArrows({ tasks }: DependencyArrowsProps) {
  const updateXarrow = useXarrow();
  const [mounted, setMounted] = useState(false);
  
  // Update arrows on scroll/resize
  useEffect(() => {
    setMounted(true);
    
    const handleUpdate = () => {
      updateXarrow();
    };
    
    // Listen to scroll events on timeline container
    const timelineContainer = document.querySelector('[data-timeline-container]');
    if (timelineContainer) {
      timelineContainer.addEventListener('scroll', handleUpdate);
    }
    
    window.addEventListener('resize', handleUpdate);
    
    return () => {
      if (timelineContainer) {
        timelineContainer.removeEventListener('scroll', handleUpdate);
      }
      window.removeEventListener('resize', handleUpdate);
    };
  }, [updateXarrow]);
  
  if (!mounted) return null;
  
  // Build dependency arrows
  const arrows: Array<{ start: string; end: string; key: string }> = [];
  
  tasks.forEach(task => {
    // Draw arrows from this task to tasks it blocks
    task.blocks.forEach(blockedTask => {
      arrows.push({
        start: `task-${task.id}`,
        end: `task-${blockedTask.id}`,
        key: `${task.id}-blocks-${blockedTask.id}`,
      });
    });
  });
  
  return (
    <Xwrapper>
      {arrows.map(arrow => {
        // Check if both elements exist
        const startEl = document.getElementById(arrow.start);
        const endEl = document.getElementById(arrow.end);
        
        if (!startEl || !endEl) return null;
        
        return (
          <Xarrow
            key={arrow.key}
            start={arrow.start}
            end={arrow.end}
            color="#6366f1" // Indigo color
            strokeWidth={2}
            headSize={6}
            path="smooth"
            showHead={true}
            showTail={false}
            curveness={0.6}
            dashness={false}
            zIndex={5}
          />
        );
      })}
    </Xwrapper>
  );
}
