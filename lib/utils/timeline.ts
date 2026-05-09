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
  format,
  isSameDay,
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
 * Get the date range for the timeline based on time filter and offset
 */
export function getTimelineRange(timeRange: TimeRange, offset: number = 0): { start: Date; end: Date } {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Start of today
  
  switch (timeRange) {
    case 'week':
      const weekStart = startOfWeek(addWeeks(today, offset), { weekStartsOn: 1 });
      return {
        start: weekStart,
        end: endOfWeek(weekStart, { weekStartsOn: 1 }),
      };
    
    case '2weeks':
      // Start from today + offset, not start of week
      const twoWeeksStart = addWeeks(today, offset * 2);
      return {
        start: twoWeeksStart,
        end: addDays(twoWeeksStart, 13), // Today + 14 days
      };
    
    case 'month':
      const monthStart = startOfMonth(addMonths(today, offset));
      return {
        start: monthStart,
        end: endOfMonth(monthStart),
      };
    
    case '3months':
      // Start from today + offset, not start of month
      const threeMonthsStart = addMonths(today, offset * 3);
      return {
        start: threeMonthsStart,
        end: addDays(threeMonthsStart, 89), // Today + 90 days
      };
    
    case 'year':
      // Start from today + offset, not start of month
      const yearStart = addMonths(today, offset * 12);
      return {
        start: yearStart,
        end: addDays(yearStart, 364), // Today + 365 days
      };
    
    default:
      return {
        start: startOfMonth(today),
        end: endOfMonth(today),
      };
  }
}

/**
 * Generate timeline columns based on time range and offset
 */
export function generateTimelineColumns(timeRange: TimeRange, offset: number = 0): TimelineColumn[] {
  const { start, end } = getTimelineRange(timeRange, offset);
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
  
  // Normalize all dates to start of day
  const normalizedTaskStart = new Date(taskStart);
  normalizedTaskStart.setHours(0, 0, 0, 0);
  
  const normalizedTaskEnd = taskEnd ? new Date(taskEnd) : new Date(taskStart);
  normalizedTaskEnd.setHours(0, 0, 0, 0);
  
  const normalizedTimelineStart = new Date(columns[0].date);
  normalizedTimelineStart.setHours(0, 0, 0, 0);
  
  const normalizedTimelineEnd = new Date(columns[columns.length - 1].date);
  normalizedTimelineEnd.setHours(0, 0, 0, 0);
  
  // Check if task is within visible range
  const isVisible = (normalizedTaskStart >= normalizedTimelineStart && normalizedTaskStart <= normalizedTimelineEnd) ||
                    (normalizedTaskEnd >= normalizedTimelineStart && normalizedTaskEnd <= normalizedTimelineEnd) ||
                    (normalizedTaskStart < normalizedTimelineStart && normalizedTaskEnd > normalizedTimelineEnd);
  
  if (!isVisible) {
    return { gridColumnStart: 1, gridColumnEnd: 2, isVisible: false };
  }
  
  // Find start column by exact date match or closest match
  let startColumnIndex = columns.findIndex(col => {
    const colDate = new Date(col.date);
    colDate.setHours(0, 0, 0, 0);
    return colDate.getTime() === normalizedTaskStart.getTime();
  });
  
  // If no exact match, find closest column
  if (startColumnIndex === -1) {
    startColumnIndex = 0;
    let minDiff = Math.abs(normalizedTaskStart.getTime() - new Date(columns[0].date).setHours(0, 0, 0, 0));
    
    for (let i = 1; i < columns.length; i++) {
      const colDate = new Date(columns[i].date);
      colDate.setHours(0, 0, 0, 0);
      const diff = Math.abs(normalizedTaskStart.getTime() - colDate.getTime());
      
      if (diff < minDiff) {
        minDiff = diff;
        startColumnIndex = i;
      }
    }
  }
  
  // Find end column by exact date match or closest match
  let endColumnIndex = columns.findIndex(col => {
    const colDate = new Date(col.date);
    colDate.setHours(0, 0, 0, 0);
    return colDate.getTime() === normalizedTaskEnd.getTime();
  });
  
  // If no exact match, find closest column
  if (endColumnIndex === -1) {
    endColumnIndex = 0;
    let minDiff = Math.abs(normalizedTaskEnd.getTime() - new Date(columns[0].date).setHours(0, 0, 0, 0));
    
    for (let i = 1; i < columns.length; i++) {
      const colDate = new Date(columns[i].date);
      colDate.setHours(0, 0, 0, 0);
      const diff = Math.abs(normalizedTaskEnd.getTime() - colDate.getTime());
      
      if (diff < minDiff) {
        minDiff = diff;
        endColumnIndex = i;
      }
    }
  }
  
  // Convert to CSS Grid positions (1-indexed)
  const gridColumnStart = Math.max(1, startColumnIndex + 1);
  const gridColumnEnd = Math.max(gridColumnStart + 1, endColumnIndex + 2); // +2 because end is exclusive in CSS Grid
  
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
  
  // Normalize event date to start of day in local timezone
  const normalizedEventDate = new Date(eventDate);
  normalizedEventDate.setHours(0, 0, 0, 0);
  
  // Normalize timeline dates
  const normalizedTimelineStart = new Date(columns[0].date);
  normalizedTimelineStart.setHours(0, 0, 0, 0);
  
  const normalizedTimelineEnd = new Date(columns[columns.length - 1].date);
  normalizedTimelineEnd.setHours(0, 0, 0, 0);
  
  // Check visibility using normalized dates
  const isVisible = normalizedEventDate >= normalizedTimelineStart && normalizedEventDate <= normalizedTimelineEnd;
  
  if (!isVisible) {
    return { columnIndex: 0, isVisible: false };
  }
  
  // Find the exact column that matches this date
  const columnIndex = columns.findIndex(col => {
    const colDate = new Date(col.date);
    colDate.setHours(0, 0, 0, 0);
    return colDate.getTime() === normalizedEventDate.getTime();
  });
  
  // If exact match found, use it
  if (columnIndex >= 0) {
    return { columnIndex, isVisible: true };
  }
  
  // Fallback: find the closest column by comparing timestamps
  let closestIndex = 0;
  let minDiff = Math.abs(normalizedEventDate.getTime() - new Date(columns[0].date).setHours(0, 0, 0, 0));
  
  for (let i = 1; i < columns.length; i++) {
    const colDate = new Date(columns[i].date);
    colDate.setHours(0, 0, 0, 0);
    const diff = Math.abs(normalizedEventDate.getTime() - colDate.getTime());
    
    if (diff < minDiff) {
      minDiff = diff;
      closestIndex = i;
    }
  }
  
  return { columnIndex: closestIndex, isVisible: true };
}

/**
 * Get column width based on time range
 * Returns CSS grid template value - either fixed width or flexible 1fr
 */
export function getColumnWidth(timeRange: TimeRange): string {
  switch (timeRange) {
    case 'week':
      return 'minmax(0, 1fr)'; // Evenly split 7 days across container
    case 'month':
      return 'minmax(0, 1fr)'; // Evenly split ~30 days across container
    case '2weeks':
      return '80px'; // Fixed width for scrolling
    case '3months':
    case 'year':
      return '100px'; // Fixed width for scrolling
    default:
      return '80px';
  }
}
