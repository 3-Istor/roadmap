/**
 * Type definitions for Notion API responses
 * 
 * These types help with parsing the complex nested Notion JSON structure.
 */

import type { 
  PageObjectResponse,
  DatabaseObjectResponse,
} from '@notionhq/client/build/src/api-endpoints';

export type NotionPage = PageObjectResponse;
export type NotionDatabase = DatabaseObjectResponse;

/**
 * Helper type for extracting property values from Notion pages
 */
export type NotionProperties = NotionPage['properties'];

/**
 * Parsed data structures ready for Prisma
 */
export interface ParsedMember {
  notionId: string;
  name: string;
  phoneNumber?: string;
  profilePicture?: string;
  anniversary?: Date;
}

export interface ParsedProject {
  notionId: string;
  name: string;
  status: 'BACKLOG' | 'PAUSED' | 'IN_PROGRESS' | 'DONE';
  startDate?: Date;
  endDate?: Date;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface ParsedEvent {
  notionId: string;
  name: string;
  startDate: Date;
  endDate?: Date;
  eventType: 'MANAGER_PERIOD' | 'VACATION' | 'KEY_DATE' | 'DELIVERABLE' | 'MILESTONE' | 'ANNIVERSARY';
  personIds: string[]; // Notion IDs of related members
  projectIds: string[]; // Notion IDs of related projects
}

export interface ParsedTask {
  notionId: string;
  title: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'REVIEW' | 'DONE';
  track: 'BUG' | 'DESIGN' | 'DOC' | 'DEV';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  startDate?: Date;
  endDate?: Date;
  estimatedTime?: number;
  storyPoints?: number;
  projectId?: string; // Notion ID of related project
  assignedToId?: string; // Notion ID of assigned member
  blockIds: string[]; // Notion IDs of tasks this blocks
  blockedByIds: string[]; // Notion IDs of tasks blocking this
}

/**
 * Sync result tracking
 */
export interface SyncResult {
  source: 'webhook' | 'cron';
  status: 'success' | 'error';
  message?: string;
  recordCount?: number;
  duration: number;
  errors?: string[];
}
