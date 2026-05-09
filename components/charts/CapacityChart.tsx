'use client';

/**
 * Capacity Pressure Chart Component
 * 
 * Displays workload pressure over time using the formula:
 * (Estimated Time × Story Points) / Number of Assigned Members
 */

import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { calculateCapacityPressure, getPressureColor } from '@/lib/utils/capacity';
import { getTimelineRange } from '@/lib/utils/timeline';
import { useViewStore } from '@/lib/store/viewStore';

interface Task {
  estimatedTime?: number | null;
  storyPoints?: number | null;
  startDate?: Date | null;
  endDate?: Date | null;
  assignedTo?: { id: string } | null;
}

interface CapacityChartProps {
  tasks: Task[];
}

export function CapacityChart({ tasks }: CapacityChartProps) {
  const { timeRange } = useViewStore();
  
  const capacityData = useMemo(() => {
    const { start, end } = getTimelineRange(timeRange);
    return calculateCapacityPressure(tasks, start, end);
  }, [tasks, timeRange]);
  
  if (capacityData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
        No capacity data available
      </div>
    );
  }
  
  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={capacityData}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
          <XAxis 
            dataKey="period" 
            className="text-xs fill-gray-600 dark:fill-gray-400"
          />
          <YAxis 
            className="text-xs fill-gray-600 dark:fill-gray-400"
            label={{ value: 'Pressure (hours)', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
            }}
            formatter={(value, name, props) => {
              if (name === 'pressure' && typeof value === 'number') {
                return [
                  `${value}h (${props.payload.taskCount} tasks)`,
                  'Workload Pressure'
                ];
              }
              return [value, name];
            }}
          />
          <Bar dataKey="pressure" radius={[4, 4, 0, 0]}>
            {capacityData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                className={getPressureColor(entry.pressure)}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      
      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-green-500" />
          <span className="text-gray-600 dark:text-gray-400">Low (&lt;40h)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-yellow-500" />
          <span className="text-gray-600 dark:text-gray-400">Medium (40-60h)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-red-500" />
          <span className="text-gray-600 dark:text-gray-400">High (&gt;60h)</span>
        </div>
      </div>
    </div>
  );
}
