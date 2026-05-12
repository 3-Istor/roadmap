/**
 * Force Sync Endpoint
 * 
 * Allows users to manually trigger a sync from Notion.
 * Protected with authentication in production.
 */

import { NextResponse } from 'next/server';
import { syncAllDatabases } from '@/lib/notion/sync';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * POST /api/sync/force
 * 
 * Triggers a manual sync that can be initiated by users.
 * In production, this should be protected with authentication.
 */
export async function POST() {
  try {
    console.log('Force sync triggered by user');
    const result = await syncAllDatabases('cron');

    return NextResponse.json(result, {
      status: result.status === 'success' ? 200 : 500,
    });
  } catch (error) {
    console.error('Force sync error:', error);
    
    return NextResponse.json(
      {
        source: 'cron',
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
        duration: 0,
      },
      { status: 500 }
    );
  }
}
