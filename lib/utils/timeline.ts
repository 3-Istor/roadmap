/**
 * Timeline Utility Functions
 * 
 * Calculates grid columns, positions tasks, and handles date ranges.
 */

import { 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth,
  addDays, 
  addWeeks,
  addMonths,
  differenceInDays,
  format,
  isSameDay,
  isWithinInterval,
} from 'date-fns';
import type { TimeRange } from '../store/viewStore';

export interface TimelineColumn {
  date: Date;
  label: string;
  isToday: boolean;
}

export interface TaskPosition {
  gridColumnStart: number;
  gridColumnEnd: number;
  isVisible: boolean;
}

/**
 * Get the date range for the timeline based on time filter
 */
export function getTimelineRange(timeRange: TimeRange): { start: Date; end: Date } {
  const today = new Date();
  
  switch (timeRange) {
    case 'week':
      return {
        start: startOfWeek(today, { weekStartsOn: 1 }), // Monday
        end: endOfWeek(today, { weekStartsOn: 1 }),
      };
    
    case '2weeks':
      const weekStart = startOfWeek(today, { weekStartsOn: 1 });
      return {
        start: weekStart,
        end: addDays(weekStart, 13), // 2 weeks = 14 days
      };
    
    case 'month':
      return {
        start: startOfMonth(today),
        end: endOfMonth(today),
      };
    
    case '3months':
      const monthStart = startOfMonth(today);
      return {
        start: monthStart,
        end: addMonths(monthStart, 3),
      };
    
    case 'year':
      const yearStart = startOfMonth(today);
      return {
        start: yearStart,
        end: addMonths(yearStart, 12),
      };
    
    default:
      return {
        start: startOfMonth(today),
        end: endOfMonth(today),
      };
  }
}

/**
 * Generate timeline columns based on time range
 */
export function generateTimelineColumns(timeRange: TimeRange): TimelineColumn[] {
  const { start, end } = getTimelineRange(timeRange);
  const columns: TimelineColumn[] = [];
  const today = new Date();
  
  // For week and 2weeks, show daily columns
  if (timeRange === 'week' || timeRange === '2weeks') {
    let current = start;
    while (current <= end) {
      columns.push({
        date: current,
        label: format(current, 'EEE d'), // "Mon 1"
        isToday: isSameDay(current, today),
      });
      current = addDays(current, 1);
    }
  }
  
  // For month, show daily columns
  else if (timeRange === 'month') {
    let current = start;
    while (current <= end) {
      columns.push({
        date: current,
        label: format(current, 'd'), // "1", "2", "3"
        isToday: isSameDay(current, today),
      });
      current = addDays(current, 1);
    }
  }
  
  // For 3months and year, show weekly columns
  else {
    let current = start;
    while (current <= end) {
      columns.push({
        date: current,
        label: format(current, 'MMM d'), // "Jan 1"
        isToday: isSameDay(current, today),
      });
      current = addWeeks(current, 1);
    }
  }
  
  return columns;
}

/**
 * Calculate task position on the grid
 */
export function calculateTaskPosition(
  taskStart: Date | null,
  taskEnd: Date | null,
  columns: TimelineColumn[]
): TaskPosition {
  if (!taskStart || columns.length === 0) {
    return { gridColumnStart: 1, gridColumnEnd: 2, isVisible: false };
  }
  
  const timelineStart = columns[0].date;
  const timelineEnd = columns[columns.length - 1].date;
  
  // Check if task is within visible range
  const taskEndDate = taskEnd || taskStart;
  const isVisible = isWithinInterval(taskStart, { start: timelineStart, end: timelineEnd }) ||
                    isWithinInterval(taskEndDate, { start: timelineStart, end: timelineEnd }) ||
                    (taskStart < timelineStart && taskEndDate > timelineEnd);
  
  if (!isVisible) {
    return { gridColumnStart: 1, gridColumnEnd: 2, isVisible: false };
  }
  
  // Calculate start column (1-indexed for CSS Grid)
  const startDiff = differenceInDays(taskStart, timelineStart);
  const gridColumnStart = Math.max(1, Math.min(startDiff + 1, columns.length + 1));
  
  // Calculate end column
  const endDiff = taskEnd 
    ? differenceInDays(taskEnd, timelineStart) + 1 // +1 to include end day
    : startDiff + 1;
  const gridColumnEnd = Math.max(gridColumnStart + 1, Math.min(endDiff + 1, columns.length + 2));
  
  return {
    gridColumnStart,
    gridColumnEnd,
    isVisible: true,
  };
}

/**
 * Calculate event position on the grid
 */
export function calculateEventPosition(
  eventDate: Date,
  columns: TimelineColumn[]
): { columnIndex: number; isVisible: boolean } {
  if (columns.length === 0) {
    return { columnIndex: 0, isVisible: false };
  }
  
  const timelineStart = columns[0].date;
  const timelineEnd = columns[columns.length - 1].date;
  
  const isVisible = isWithinInterval(eventDate, { start: timelineStart, end: timelineEnd });
  
  if (!isVisible) {
    return { columnIndex: 0, isVisible: false };
  }
  
  const daysDiff = differenceInDays(eventDate, timelineStart);
  const columnIndex = Math.max(0, Math.min(daysDiff, columns.length - 1));
  
  return { columnIndex, isVisible: true };
}

/**
 * Get column width based on time range
 */
export function getColumnWidth(timeRange: TimeRange): string {
  switch (timeRange) {
    case 'week':
    case '2weeks':
      return '120px'; // Wide columns for daily view
    case 'month':
      return '80px'; // Medium columns for daily view
    case '3months':
    case 'year':
      return '100px'; // Medium columns for weekly view
    default:
      return '80px';
  }
}
