'use client';

import { useEffect, useState } from 'react';
import Xarrow, { useXarrow } from 'react-xarrows';
import { useViewStore } from '@/lib/store/viewStore';

interface Task {
  id: string;
  project?: { id: string } | null;
  startDate?: Date | null;
  endDate?: Date | null;
  track?: string;
  blocks: { id: string }[];
  blockedBy: { id: string }[];
}

interface DependencyArrowsProps {
  tasks: Task[];
  expandedProjects: Record<string, boolean>;
}

export function DependencyArrows({ tasks, expandedProjects }: DependencyArrowsProps) {
  const updateXarrow = useXarrow();
  const { mode } = useViewStore();
  const [domReady, setDomReady] = useState(true);

  useEffect(() => {
    setDomReady(false);
    const timer = setTimeout(() => setDomReady(true), 50);
    return () => clearTimeout(timer);
  }, [mode]);

  useEffect(() => {
    if (!domReady) return;

    let rafId: number;
    const triggerUpdate = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        updateXarrow();
      });
    };

    const container = document.querySelector('[data-timeline-container]');
    if (container) container.addEventListener('scroll', triggerUpdate, { passive: true });
    window.addEventListener('resize', triggerUpdate);

    const handlePointerMove = (e: PointerEvent) => {
      if (mode === 'edit' && e.buttons > 0) triggerUpdate();
    };
    window.addEventListener('pointermove', handlePointerMove, { passive: true });

    return () => {
      if (container) container.removeEventListener('scroll', triggerUpdate);
      window.removeEventListener('resize', triggerUpdate);
      window.removeEventListener('pointermove', handlePointerMove);
      cancelAnimationFrame(rafId);
    };
  }, [domReady, mode, updateXarrow]);

  if (!domReady) return null;

  const isTaskVisible = (task: Task): boolean => {
    const projectId = task.project?.id || 'unassigned';
    return expandedProjects[projectId] ?? true;
  };

  const arrows: Array<{ 
    start: string; 
    end: string; 
    key: string; 
  }> = [];
  
  tasks.forEach(sourceTask => {
    if (!isTaskVisible(sourceTask)) return;
    
    sourceTask.blocks.forEach(blockedTask => {
      const targetTask = tasks.find(t => t.id === blockedTask.id);
      
      if (targetTask && isTaskVisible(targetTask)) {
        const sStart = sourceTask.startDate?.getTime() || 0;
        const sEnd = sourceTask.endDate?.getTime() || sourceTask.startDate?.getTime() || 0;
        const tStart = targetTask.startDate?.getTime() || 0;
        
        const dynamicKey = `arrow-${sourceTask.id}-${targetTask.id}-${sStart}-${sEnd}-${tStart}-${sourceTask.track}-${targetTask.track}`;

        arrows.push({
          start: `task-${sourceTask.id}`,
          end: `task-${targetTask.id}`,
          key: dynamicKey,
        });
      }
    });
  });

  return (
    <>
      {arrows.map(arrow => {
        const startEl = typeof document !== 'undefined' ? document.getElementById(arrow.start) : null;
        const endEl = typeof document !== 'undefined' ? document.getElementById(arrow.end) : null;
        if (!startEl || !endEl) return null;

        return (
          <Xarrow
            key={arrow.key} 
            start={arrow.start}
            end={arrow.end}
            startAnchor="right"
            endAnchor="left"
            color="#6366f1"
            strokeWidth={2}
            headSize={5}
            path="smooth"
            curveness={0.9}
            dashness={false}
            zIndex={5}
          />
        );
      })}
    </>
  );
}