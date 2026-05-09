/**
 * Manual Sync Endpoint (Development Only)
 * 
 * Allows triggering a sync manually during development.
 * Should be disabled or protected in production.
 */

import { NextResponse } from 'next/server';
import { syncAllDatabases } from '@/lib/notion/sync';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * GET /api/sync/manual
 * 
 * Triggers a manual sync for development/testing purposes.
 * 
 * WARNING: This endpoint should be protected or disabled in production!
 */
export async function GET() {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Manual sync is disabled in production' },
      { status: 403 }
    );
  }

  try {
    console.log('Manual sync triggered');
    const result = await syncAllDatabases('cron');

    return NextResponse.json(result, {
      status: result.status === 'success' ? 200 : 500,
    });
  } catch (error) {
    console.error('Manual sync error:', error);
    
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
