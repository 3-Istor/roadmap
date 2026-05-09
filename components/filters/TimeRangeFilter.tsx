'use client';

/**
 * Time Range Filter Component
 * 
 * Buttons to switch between different time ranges
 */

import { useViewStore, type TimeRange } from '@/lib/store/viewStore';
import { cn } from '@/lib/utils/cn';

const timeRangeOptions: { value: TimeRange; label: string }[] = [
  { value: 'week', label: 'Week' },
  { value: '2weeks', label: '2 Weeks' },
  { value: 'month', label: 'Month' },
  { value: '3months', label: '3 Months' },
  { value: 'year', label: 'Year' },
];

export function TimeRangeFilter() {
  const { timeRange, setTimeRange } = useViewStore();
  
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Time Range
      </label>
      <div className="flex gap-2">
        {timeRangeOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => setTimeRange(option.value)}
            className={cn(
              'px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              timeRange === option.value
                ? 'bg-blue-500 text-white shadow-sm'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
