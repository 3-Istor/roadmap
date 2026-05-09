/**
 * View Store - Zustand State Management
 * 
 * Manages global UI state including View/Edit mode toggle, optimistic updates, and undo/redo.
 */

import { create } from 'zustand';

export type ViewMode = 'view' | 'edit';

export type TimeRange = 'week' | '2weeks' | 'month' | '3months' | 'year';

interface TaskHistoryEntry {
  taskId: string;
  previousState: {
    startDate?: Date | null;
    endDate?: Date | null;
    track?: string;
  };
  newState: {
    startDate?: Date | null;
    endDate?: Date | null;
    track?: string;
  };
  timestamp: number;
}

interface ViewState {
  // View/Edit mode
  mode: ViewMode;
  toggleMode: () => void;
  setMode: (mode: ViewMode) => void;
  
  // Time range filter
  timeRange: TimeRange;
  setTimeRange: (range: TimeRange) => void;
  
  // Time navigation offset (how many periods forward/backward from today)
  timeOffset: number;
  nextPeriod: () => void;
  prevPeriod: () => void;
  resetTimeOffset: () => void;
  
  // Project filter
  selectedProjectId: string | null;
  setSelectedProject: (projectId: string | null) => void;
  
  // Selected task for modal
  selectedTaskId: string | null;
  setSelectedTask: (taskId: string | null) => void;
  
  // Selected event for modal
  selectedEventId: string | null;
  setSelectedEvent: (eventId: string | null) => void;
  
  // Optimistic updates (for Phase 4 Edit Mode)
  optimisticUpdates: Map<string, any>;
  addOptimisticUpdate: (taskId: string, updates: any) => void;
  removeOptimisticUpdate: (taskId: string) => void;
  clearOptimisticUpdates: () => void;
  
  // Undo/Redo system
  history: TaskHistoryEntry[];
  historyIndex: number;
  addToHistory: (entry: TaskHistoryEntry) => void;
  undo: () => TaskHistoryEntry | null;
  redo: () => TaskHistoryEntry | null;
  canUndo: () => boolean;
  canRedo: () => boolean;
  clearHistory: () => void;
}

export const useViewStore = create<ViewState>((set, get) => ({
  // Initial state
  mode: 'view',
  timeRange: 'month',
  timeOffset: 0,
  selectedProjectId: null,
  selectedTaskId: null,
  selectedEventId: null,
  optimisticUpdates: new Map(),
  history: [],
  historyIndex: -1,
  
  // Actions
  toggleMode: () => set((state) => ({ 
    mode: state.mode === 'view' ? 'edit' : 'view' 
  })),
  
  setMode: (mode) => set({ mode }),
  
  setTimeRange: (timeRange) => set({ timeRange, timeOffset: 0 }), // Reset offset when changing range
  
  nextPeriod: () => set((state) => ({ timeOffset: state.timeOffset + 1 })),
  
  prevPeriod: () => set((state) => ({ timeOffset: state.timeOffset - 1 })),
  
  resetTimeOffset: () => set({ timeOffset: 0 }),
  
  setSelectedProject: (selectedProjectId) => set({ selectedProjectId }),
  
  setSelectedTask: (selectedTaskId) => set({ selectedTaskId }),
  
  setSelectedEvent: (selectedEventId) => set({ selectedEventId }),
  
  addOptimisticUpdate: (taskId, updates) => set((state) => {
    const newMap = new Map(state.optimisticUpdates);
    newMap.set(taskId, updates);
    return { optimisticUpdates: newMap };
  }),
  
  removeOptimisticUpdate: (taskId) => set((state) => {
    const newMap = new Map(state.optimisticUpdates);
    newMap.delete(taskId);
    return { optimisticUpdates: newMap };
  }),
  
  clearOptimisticUpdates: () => set({ optimisticUpdates: new Map() }),
  
  // Undo/Redo
  addToHistory: (entry) => set((state) => {
    // Remove any future history if we're not at the end
    const newHistory = state.history.slice(0, state.historyIndex + 1);
    newHistory.push(entry);
    
    // Limit history to last 50 actions
    if (newHistory.length > 50) {
      newHistory.shift();
      return { history: newHistory, historyIndex: newHistory.length - 1 };
    }
    
    return { history: newHistory, historyIndex: newHistory.length - 1 };
  }),
  
  undo: () => {
    const state = get();
    if (state.historyIndex < 0) return null;
    
    const entry = state.history[state.historyIndex];
    set({ historyIndex: state.historyIndex - 1 });
    return entry;
  },
  
  redo: () => {
    const state = get();
    if (state.historyIndex >= state.history.length - 1) return null;
    
    const entry = state.history[state.historyIndex + 1];
    set({ historyIndex: state.historyIndex + 1 });
    return entry;
  },
  
  canUndo: () => {
    const state = get();
    return state.historyIndex >= 0;
  },
  
  canRedo: () => {
    const state = get();
    return state.historyIndex < state.history.length - 1;
  },
  
  clearHistory: () => set({ history: [], historyIndex: -1 }),
}));
