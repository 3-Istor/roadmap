/**
 * Notion API Client
 * 
 * Initializes and exports the Notion client with proper configuration.
 * Handles rate limiting and provides typed database IDs.
 */

import { Client } from '@notionhq/client';

// Validate required environment variables
const NOTION_API_KEY = process.env.NOTION_API_KEY;

if (!NOTION_API_KEY) {
  console.warn('NOTION_API_KEY is not set. Notion sync will not work.');
}

// Initialize Notion client
export const notion = new Client({
  auth: NOTION_API_KEY || 'dummy-key-for-build',
});

// Database IDs from environment
export const NOTION_DB_IDS = {
  members: process.env.NOTION_MEMBERS_DB_ID || '',
  projects: process.env.NOTION_PROJECTS_DB_ID || '',
  events: process.env.NOTION_EVENTS_DB_ID || '',
  tasks: process.env.NOTION_TASKS_DB_ID || '',
} as const;

/**
 * Check if Notion is properly configured
 */
export function isNotionConfigured(): boolean {
  return !!(
    NOTION_API_KEY &&
    NOTION_DB_IDS.members &&
    NOTION_DB_IDS.projects &&
    NOTION_DB_IDS.events &&
    NOTION_DB_IDS.tasks
  );
}

/**
 * Rate limiter for Notion API (3 requests/second)
 * Simple delay-based implementation
 */
export class NotionRateLimiter {
  private lastRequestTime = 0;
  private readonly minInterval = 350; // ~3 requests/second with buffer

  async throttle(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.minInterval) {
      await new Promise(resolve => 
        setTimeout(resolve, this.minInterval - timeSinceLastRequest)
      );
    }
    
    this.lastRequestTime = Date.now();
  }
}

export const rateLimiter = new NotionRateLimiter();
