'use client';

/**
 * Header Component
 * 
 * Top navigation bar with title, view/edit toggle, and theme toggle
 */

import { useEffect, useCallback } from 'react';
import { Eye, Edit3, Undo2, Redo2 } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { useViewStore } from '@/lib/store/viewStore';
import { cn } from '@/lib/utils/cn';
import toast from 'react-hot-toast';

export function Header() {
  const { mode, toggleMode, undo, redo, canUndo, canRedo } = useViewStore();
  
  // Get the onTaskUpdate callback from page context (we'll need to pass it via props)
  // For now, we'll use window.location.reload as fallback
  
  // Handle undo/redo
  const handleUndo = useCallback(async () => {
    console.log('⏪ Undo clicked, canUndo:', canUndo());
    const entry = undo();
    console.log('⏪ Undo entry:', entry);
    if (entry) {
      // Optimistically update UI first
      console.log('⏪ Dispatching optimistic undo update');
      window.dispatchEvent(new CustomEvent('taskOptimisticUpdate', {
        detail: {
          taskId: entry.taskId,
          updates: entry.previousState,
        },
      }));
      
      // Then send API request in background
      try {
        const apiUpdates: Record<string, string | null> = {};
        if (entry.previousState.startDate) {
          apiUpdates.startDate = entry.previousState.startDate.toISOString();
        }
        if (entry.previousState.endDate !== undefined) {
          apiUpdates.endDate = entry.previousState.endDate ? entry.previousState.endDate.toISOString() : null;
        }
        if (entry.previousState.track) {
          apiUpdates.track = entry.previousState.track;
        }
        
        console.log('⏪ Sending undo API request:', apiUpdates);
        
        const response = await fetch(`/api/tasks/${entry.taskId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(apiUpdates),
        });
        
        if (response.ok) {
          toast.success('Undone');
          console.log('⏪ Undo successful');
        } else {
          toast.error('Failed to undo');
          console.error('⏪ Undo API failed:', response.status);
          // Revert optimistic update on failure
          window.dispatchEvent(new CustomEvent('taskUpdated'));
        }
      } catch {
        toast.error('Failed to undo');
        console.error('⏪ Undo error');
        // Revert optimistic update on failure
        window.dispatchEvent(new CustomEvent('taskUpdated'));
      }
    } else {
      console.log('⏪ No undo entry available');
    }
  }, [undo, canUndo]);
  
  const handleRedo = useCallback(async () => {
    console.log('⏩ Redo clicked, canRedo:', canRedo());
    const entry = redo();
    console.log('⏩ Redo entry:', entry);
    if (entry) {
      // Optimistically update UI first
      console.log('⏩ Dispatching optimistic redo update');
      window.dispatchEvent(new CustomEvent('taskOptimisticUpdate', {
        detail: {
          taskId: entry.taskId,
          updates: entry.newState,
        },
      }));
      
      // Then send API request in background
      try {
        const apiUpdates: Record<string, string | null> = {};
        if (entry.newState.startDate) {
          apiUpdates.startDate = entry.newState.startDate.toISOString();
        }
        if (entry.newState.endDate !== undefined) {
          apiUpdates.endDate = entry.newState.endDate ? entry.newState.endDate.toISOString() : null;
        }
        if (entry.newState.track) {
          apiUpdates.track = entry.newState.track;
        }
        
        console.log('⏩ Sending redo API request:', apiUpdates);
        
        const response = await fetch(`/api/tasks/${entry.taskId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(apiUpdates),
        });
        
        if (response.ok) {
          toast.success('Redone');
          console.log('⏩ Redo successful');
        } else {
          toast.error('Failed to redo');
          console.error('⏩ Redo API failed:', response.status);
          // Revert optimistic update on failure
          window.dispatchEvent(new CustomEvent('taskUpdated'));
        }
      } catch {
        toast.error('Failed to redo');
        console.error('⏩ Redo error');
        // Revert optimistic update on failure
        window.dispatchEvent(new CustomEvent('taskUpdated'));
      }
    } else {
      console.log('⏩ No redo entry available');
    }
  }, [redo, canRedo]);
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (mode !== 'edit') return;
      
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const ctrlOrCmd = isMac ? e.metaKey : e.ctrlKey;
      
      // Undo: Ctrl+Z or Cmd+Z
      if (ctrlOrCmd && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (canUndo()) handleUndo();
      }
      
      // Redo: Ctrl+Y or Cmd+Shift+Z
      if ((ctrlOrCmd && e.key === 'y') || (ctrlOrCmd && e.shiftKey && e.key === 'z')) {
        e.preventDefault();
        if (canRedo()) handleRedo();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, canUndo, canRedo, handleUndo, handleRedo]);
  
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
      <div className="flex h-16 items-center justify-between px-6">
        {/* Logo/Title */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">R</span>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
            Roadmap Dashboard
          </h1>
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-4">
          {/* Undo/Redo (Edit Mode Only) */}
          {mode === 'edit' && (
            <div className="flex items-center gap-1 border-r border-gray-200 dark:border-gray-700 pr-4">
              <button
                onClick={handleUndo}
                disabled={!canUndo()}
                className={cn(
                  'p-2 rounded-md transition-colors',
                  canUndo()
                    ? 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                    : 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                )}
                title="Undo (Ctrl+Z)"
              >
                <Undo2 className="w-4 h-4" />
              </button>
              <button
                onClick={handleRedo}
                disabled={!canRedo()}
                className={cn(
                  'p-2 rounded-md transition-colors',
                  canRedo()
                    ? 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                    : 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                )}
                title="Redo (Ctrl+Y)"
              >
                <Redo2 className="w-4 h-4" />
              </button>
            </div>
          )}
          
          {/* View/Edit Toggle */}
          <div className="flex items-center gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <button
              onClick={() => mode === 'edit' && toggleMode()}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                mode === 'view'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              )}
            >
              <Eye className="w-4 h-4" />
              View
            </button>
            <button
              onClick={() => mode === 'view' && toggleMode()}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                mode === 'edit'
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              )}
              title="Enable edit mode to drag and resize tasks"
            >
              <Edit3 className="w-4 h-4" />
              Edit
            </button>
          </div>
          
          {/* Theme Toggle */}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
