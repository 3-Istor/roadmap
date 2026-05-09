/**
 * Members Parser
 * 
 * Parses Notion Members database pages into Prisma-ready format.
 */

import type { NotionPage, ParsedMember } from '../types';
import {
  extractTitle,
  extractPhoneNumber,
  extractFileUrl,
  extractDate,
} from './utils';

/**
 * Parse a Notion Member page into ParsedMember format
 */
export function parseMember(page: NotionPage): ParsedMember | null {
  try {
    const { id, properties } = page;

    // Extract required fields
    const name = extractTitle(properties, 'Name');
    
    // If no name, skip this member
    if (!name || name === 'Untitled') {
      console.warn(`Skipping member ${id}: missing name`);
      return null;
    }

    // Extract optional fields with defensive parsing
    const phoneNumber = extractPhoneNumber(properties, 'Phone Number');
    const profilePicture = extractFileUrl(properties, 'Profile Picture');
    const anniversary = extractDate(properties, 'Anniversary');

    return {
      notionId: id,
      name,
      phoneNumber,
      profilePicture,
      anniversary,
    };
  } catch (error) {
    console.error(`Error parsing member ${page.id}:`, error);
    return null;
  }
}

/**
 * Parse multiple member pages
 */
export function parseMembers(pages: NotionPage[]): ParsedMember[] {
  return pages
    .map(parseMember)
    .filter((member): member is ParsedMember => member !== null);
}
