/**
 * Capacity Calculation Utilities
 * 
 * Formula: (Estimated Time × Story Points) / Number of Assigned Members
 */

import { startOfWeek, addWeeks, isWithinInterval, format } from 'date-fns';

export interface CapacityDataPoint {
  period: string; // Week label
  pressure: number; // Calculated workload
  taskCount: number;
}

export interface TaskForCapacity {
  estimatedTime?: number | null;
  storyPoints?: number | null;
  startDate?: Date | null;
  endDate?: Date | null;
  assignedTo?: { id: string } | null;
}

/**
 * Calculate capacity pressure for a set of tasks grouped by week
 */
export function calculateCapacityPressure(
  tasks: TaskForCapacity[],
  startDate: Date,
  endDate: Date
): CapacityDataPoint[] {
  const dataPoints: CapacityDataPoint[] = [];
  
  // Generate weekly periods
  let currentWeek = startOfWeek(startDate, { weekStartsOn: 1 });
  const endWeek = startOfWeek(endDate, { weekStartsOn: 1 });
  
  while (currentWeek <= endWeek) {
    const weekEnd = addWeeks(currentWeek, 1);
    
    // Filter tasks that overlap with this week
    const weekTasks = tasks.filter(task => {
      if (!task.startDate) return false;
      
      const taskEnd = task.endDate || task.startDate;
      
      return isWithinInterval(task.startDate, { start: currentWeek, end: weekEnd }) ||
             isWithinInterval(taskEnd, { start: currentWeek, end: weekEnd }) ||
             (task.startDate < currentWeek && taskEnd > weekEnd);
    });
    
    // Calculate pressure for this week
    let totalPressure = 0;
    const assignedMembers = new Set<string>();
    
    weekTasks.forEach(task => {
      const estimatedTime = task.estimatedTime || 0;
      const storyPoints = task.storyPoints || 1;
      
      // Formula: Estimated Time × Story Points
      const taskPressure = estimatedTime * storyPoints;
      totalPressure += taskPressure;
      
      if (task.assignedTo?.id) {
        assignedMembers.add(task.assignedTo.id);
      }
    });
    
    // Divide by number of assigned members (avoid division by zero)
    const memberCount = assignedMembers.size || 1;
    const averagePressure = totalPressure / memberCount;
    
    dataPoints.push({
      period: format(currentWeek, 'MMM d'),
      pressure: Math.round(averagePressure * 10) / 10, // Round to 1 decimal
      taskCount: weekTasks.length,
    });
    
    currentWeek = weekEnd;
  }
  
  return dataPoints;
}

/**
 * Get pressure level color based on threshold
 */
export function getPressureColor(pressure: number): string {
  if (pressure < 40) return 'bg-green-500';
  if (pressure < 60) return 'bg-yellow-500';
  return 'bg-red-500';
}

/**
 * Get pressure level label
 */
export function getPressureLabel(pressure: number): string {
  if (pressure < 40) return 'Low';
  if (pressure < 60) return 'Medium';
  return 'High';
}
