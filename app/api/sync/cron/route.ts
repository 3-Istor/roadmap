/**
 * Cron Sync Endpoint
 * 
 * Triggered by Kubernetes CronJob for scheduled full syncs.
 * Secured with CRON_SECRET header authentication.
 */

import { NextRequest, NextResponse } from 'next/server';
import { syncAllDatabases } from '@/lib/notion/sync';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes max execution time

/**
 * POST /api/sync/cron
 * 
 * Performs a full sync of all Notion databases to PostgreSQL.
 * 
 * Security: Requires CRON_SECRET in x-cron-secret header
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const cronSecret = request.headers.get('x-cron-secret');
    
    if (!cronSecret || cronSecret !== process.env.CRON_SECRET) {
      console.warn('Unauthorized cron sync attempt');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('Cron sync triggered');

    // Perform full sync
    const result = await syncAllDatabases('cron');

    // Return appropriate status code
    const statusCode = result.status === 'success' ? 200 : 500;

    return NextResponse.json(result, { status: statusCode });
  } catch (error) {
    console.error('Cron sync endpoint error:', error);
    
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

/**
 * GET /api/sync/cron
 * 
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    endpoint: 'cron-sync',
    status: 'ready',
    message: 'Use POST with x-cron-secret header to trigger sync',
  });
}
