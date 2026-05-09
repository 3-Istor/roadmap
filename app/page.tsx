'use client';

/**
 * Main Dashboard Page
 * 
 * Fetches data and renders the complete roadmap timeline
 */

import { useEffect, useState, useCallback } from 'react';
import { Header } from '@/components/layout/Header';
import { ProjectFilter } from '@/components/filters/ProjectFilter';
import { TimeRangeFilter } from '@/components/filters/TimeRangeFilter';
import { TimelineGrid } from '@/components/timeline/TimelineGrid';
import { CapacityChart } from '@/components/charts/CapacityChart';
import { TaskModal } from '@/components/timeline/TaskModal';
import { Download, RefreshCw } from 'lucide-react';
import { useViewStore } from '@/lib/store/viewStore';

interface DashboardData {
  projects: Array<{
    id: string;
    name: string;
    status: string;
  }>;
  tasks: Array<{
    id: string;
    notionId: string;
    title: string;
    status: string;
    track: string;
    priority: string;
    startDate: Date | null;
    endDate: Date | null;
    assignedTo?: { id: string; name: string } | null;
    project?: { id: string; name: string; status: string } | null;
    blocks: Array<{ id: string }>;
    blockedBy: Array<{ id: string }>;
  }>;
  events: Array<{
    id: string;
    name: string;
    eventType: string;
    startDate: Date;
    endDate?: Date | null;
  }>;
  members: Array<{
    id: string;
    name: string;
  }>;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { selectedProjectId, selectedTaskId, setSelectedTask } = useViewStore();
  
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const url = selectedProjectId
        ? `/api/dashboard?projectId=${selectedProjectId}`
        : '/api/dashboard';
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }
      
      const json = await response.json();
      
      // Parse dates
      json.tasks = json.tasks.map((task: DashboardData['tasks'][0]) => ({
        ...task,
        startDate: task.startDate ? new Date(task.startDate) : null,
        endDate: task.endDate ? new Date(task.endDate) : null,
      }));
      
      json.events = json.events.map((event: DashboardData['events'][0]) => ({
        ...event,
        startDate: new Date(event.startDate),
        endDate: event.endDate ? new Date(event.endDate) : null,
      }));
      
      setData(json);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [selectedProjectId]);
  
  // Handle optimistic task updates
  const handleTaskUpdate = (taskId: string, updates: Partial<{ startDate: Date | null; endDate: Date | null; track: string }>) => {
    setData(prevData => {
      if (!prevData) return prevData;
      
      return {
        ...prevData,
        tasks: prevData.tasks.map(task =>
          task.id === taskId
            ? { ...task, ...updates }
            : task
        ),
      };
    });
  };
  
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  // Listen for task updates from undo/redo
  useEffect(() => {
    const handleTaskUpdated = () => {
      fetchData();
    };
    
    const handleOptimisticUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ taskId: string; updates: Partial<{ startDate: Date | null; endDate: Date | null; track: string }> }>;
      const { taskId, updates } = customEvent.detail;
      console.log('🔄 Optimistic update from undo/redo:', taskId, updates);
      handleTaskUpdate(taskId, updates);
    };
    
    window.addEventListener('taskUpdated', handleTaskUpdated);
    window.addEventListener('taskOptimisticUpdate', handleOptimisticUpdate);
    
    return () => {
      window.removeEventListener('taskUpdated', handleTaskUpdated);
      window.removeEventListener('taskOptimisticUpdate', handleOptimisticUpdate);
    };
  }, [fetchData]);
  
  // Export timeline as PNG (Phase 4)
  const handleExport = () => {
    alert('Export functionality will be implemented in Phase 4');
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <div className="flex flex-col items-center gap-4">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
            <p className="text-gray-600 dark:text-gray-400">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <div className="text-center">
            <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
            <button
              onClick={fetchData}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  if (!data) {
    return null;
  }
  
  // Find selected task for modal
  const selectedTask = selectedTaskId 
    ? data.tasks.find(t => t.id === selectedTaskId)
    : null;
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <Header />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Filters Bar */}
        <div className="border-b bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 px-6 py-4">
          <div className="flex items-end justify-between gap-6">
            <div className="flex items-end gap-6">
              <ProjectFilter projects={data.projects} />
              <TimeRangeFilter />
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={fetchData}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                title="Refresh data"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
              
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-500 text-white hover:bg-blue-600 rounded-lg transition-colors"
                title="Export as PNG (Phase 4)"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
            </div>
          </div>
        </div>
        
        {/* Timeline */}
        <div 
          className="flex-1 overflow-hidden"
          data-timeline-container
        >
          <TimelineGrid
            projects={data.projects}
            tasks={data.tasks}
            events={data.events}
            onTaskUpdate={handleTaskUpdate}
          />
        </div>
        
        {/* Capacity Chart */}
        <div className="border-t bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Capacity Pressure
          </h2>
          <CapacityChart tasks={data.tasks} />
        </div>
      </main>
      
      {/* Task Details Modal */}
      {selectedTask && (
        <TaskModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </div>
  );
}
