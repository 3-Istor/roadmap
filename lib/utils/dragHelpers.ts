/**
 * Drag & Drop Helper Functions
 * 
 * Utilities for calculating new dates when tasks are dragged or resized
 */

import { addDays, differenceInDays, startOfDay } from 'date-fns';
import { type TimelineColumn } from './timeline';

/**
 * Calculate new dates when a task is dragged horizontally
 */
export function calculateDraggedDates(
  originalStartDate: Date,
  originalEndDate: Date | null,
  columnsDelta: number
): { startDate: Date; endDate: Date | null } {
  // Calculate duration in days
  const duration = originalEndDate 
    ? differenceInDays(originalEndDate, originalStartDate)
    : 0;

  // Calculate new start date by shifting columns
  const newStartDate = addDays(originalStartDate, columnsDelta);

  // Calculate new end date maintaining the same duration
  const newEndDate = originalEndDate 
    ? addDays(newStartDate, duration)
    : null;

  return {
    startDate: startOfDay(newStartDate),
    endDate: newEndDate ? startOfDay(newEndDate) : null,
  };
}

/**
 * Calculate new end date when a task is resized
 */
export function calculateResizedEndDate(
  startDate: Date,
  newColumnEnd: number,
  columns: TimelineColumn[]
): Date {
  // Find the column at the new end position
  const endColumn = columns[newColumnEnd - 1]; // Grid columns are 1-indexed
  
  if (!endColumn) {
    // Fallback: add 1 day to start date
    return addDays(startDate, 1);
  }

  // Use the column's date as the end date
  return startOfDay(endColumn.date);
}

/**
 * Find which column a date falls into
 */
export function findColumnIndexForDate(
  date: Date,
  columns: TimelineColumn[]
): number {
  const targetDay = startOfDay(date);
  
  for (let i = 0; i < columns.length; i++) {
    const columnDay = startOfDay(columns[i].date);
    if (columnDay.getTime() === targetDay.getTime()) {
      return i;
    }
  }
  
  // If not found, find the closest column
  let closestIndex = 0;
  let closestDiff = Math.abs(differenceInDays(columns[0].date, date));
  
  for (let i = 1; i < columns.length; i++) {
    const diff = Math.abs(differenceInDays(columns[i].date, date));
    if (diff < closestDiff) {
      closestDiff = diff;
      closestIndex = i;
    }
  }
  
  return closestIndex;
}

/**
 * Snap a column index to valid bounds
 */
export function snapColumnIndex(
  columnIndex: number,
  minColumn: number,
  maxColumn: number
): number {
  return Math.max(minColumn, Math.min(maxColumn, columnIndex));
}

/**
 * Format date to YYYY-MM-DD without timezone conversion
 * This prevents the "off by one day" bug when sending to APIs
 */
export function formatDateForAPI(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calculate new start date when resizing from the left
 */
export function calculateResizedStartDate(
  endDate: Date,
  newColumnStart: number,
  columns: TimelineColumn[]
): Date {
  // Find the column at the new start position
  const startColumn = columns[newColumnStart - 1]; // Grid columns are 1-indexed
  
  if (!startColumn) {
    // Fallback: subtract 1 day from end date
    return addDays(endDate, -1);
  }

  // Use the column's date as the start date
  return startOfDay(startColumn.date);
}
