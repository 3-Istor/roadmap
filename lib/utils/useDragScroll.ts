/**
 * Custom hook for drag-to-scroll functionality
 * 
 * Allows users to grab and drag to scroll horizontally through the timeline
 */

import { useRef, useCallback, useEffect } from 'react';

interface UseDragScrollOptions {
  direction?: 'horizontal' | 'vertical' | 'both';
  sensitivity?: number;
  disabled?: boolean;
}

export function useDragScroll({
  direction = 'horizontal',
  sensitivity = 1,
  disabled = false,
}: UseDragScrollOptions = {}) {
  const elementRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });
  const scrollStart = useRef({ x: 0, y: 0 });

  const handleMouseDown = useCallback((e: MouseEvent) => {
    if (disabled) return;
    
    const element = elementRef.current;
    if (!element) return;

    // Only start dragging if clicking on the container itself or non-interactive elements
    const target = e.target as HTMLElement;
    const isInteractive = target.closest('button, a, [role="button"], .task-block, .project-header');
    
    if (isInteractive) return;

    isDragging.current = true;
    startPos.current = { x: e.clientX, y: e.clientY };
    scrollStart.current = { x: element.scrollLeft, y: element.scrollTop };

    // Change cursor to grabbing
    element.style.cursor = 'grabbing';
    element.style.userSelect = 'none';

    // Prevent text selection
    e.preventDefault();
  }, [disabled]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const element = elementRef.current;
    if (!isDragging.current || !element) return;

    const deltaX = (e.clientX - startPos.current.x) * sensitivity;
    const deltaY = (e.clientY - startPos.current.y) * sensitivity;

    if (direction === 'horizontal' || direction === 'both') {
      element.scrollLeft = scrollStart.current.x - deltaX;
    }

    if (direction === 'vertical' || direction === 'both') {
      element.scrollTop = scrollStart.current.y - deltaY;
    }
  }, [direction, sensitivity]);

  const handleMouseUp = useCallback(() => {
    const element = elementRef.current;
    if (!element) return;

    isDragging.current = false;
    element.style.cursor = 'grab';
    element.style.userSelect = '';
  }, []);

  const handleMouseLeave = useCallback(() => {
    const element = elementRef.current;
    if (!element) return;

    isDragging.current = false;
    element.style.cursor = 'grab';
    element.style.userSelect = '';
  }, []);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    // Set initial cursor only if not disabled
    if (!disabled) {
      element.style.cursor = 'grab';
    }

    // Add event listeners only if not disabled
    if (!disabled) {
      element.addEventListener('mousedown', handleMouseDown);
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      element.addEventListener('mouseleave', handleMouseLeave);
    }

    // Cleanup
    return () => {
      if (element) {
        element.removeEventListener('mousedown', handleMouseDown);
        element.removeEventListener('mouseleave', handleMouseLeave);
        // Reset cursor
        element.style.cursor = '';
        element.style.userSelect = '';
      }
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      isDragging.current = false;
    };
  }, [handleMouseDown, handleMouseMove, handleMouseUp, handleMouseLeave, disabled]);

  return elementRef;
}
