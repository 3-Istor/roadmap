'use client';

/**
 * Time Range Filter Component
 * 
 * Buttons to switch between different time ranges with prev/next navigation
 */

import { useViewStore, type TimeRange } from '@/lib/store/viewStore';
import { cn } from '@/lib/utils/cn';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const timeRangeOptions: { value: TimeRange; label: string }[] = [
  { value: 'week', label: 'Week' },
  { value: '2weeks', label: '2 Weeks' },
  { value: 'month', label: 'Month' },
  { value: '3months', label: '3 Months' },
  { value: 'year', label: 'Year' },
];

export function TimeRangeFilter() {
  const { timeRange, setTimeRange, timeOffset, prevPeriod, nextPeriod, resetTimeOffset } = useViewStore();
  
  // Get label for current period based on offset
  const getPeriodLabel = () => {
    if (timeOffset === 0) return 'Current';
    if (timeOffset > 0) return `+${timeOffset}`;
    return `${timeOffset}`;
  };
  
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Time Range
      </label>
      <div className="flex gap-2 items-center">
        {/* Time Range Buttons */}
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
        
        {/* Navigation Controls */}
        <div className="flex items-center gap-1 ml-2 border-l border-gray-300 dark:border-gray-600 pl-2">
          <button
            onClick={prevPeriod}
            className="p-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Previous period"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          <button
            onClick={resetTimeOffset}
            disabled={timeOffset === 0}
            className={cn(
              'px-3 py-2 rounded-lg text-xs font-medium transition-colors min-w-[60px]',
              timeOffset === 0
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 cursor-default'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            )}
            title={timeOffset === 0 ? 'Currently viewing present' : 'Jump to present'}
          >
            {getPeriodLabel()}
          </button>
          
          <button
            onClick={nextPeriod}
            className="p-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Next period"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
