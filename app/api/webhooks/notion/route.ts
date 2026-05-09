/**
 * Notion Webhook Endpoint
 * 
 * Receives webhook notifications from Notion when databases are updated.
 * Triggers targeted syncs for the affected database.
 */

import { NextRequest, NextResponse } from 'next/server';
import { syncDatabase, syncAllDatabases } from '@/lib/notion/sync';
import { NOTION_DB_IDS } from '@/lib/notion/client';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 1 minute max execution time

/**
 * Verify Notion webhook signature
 * 
 * Notion signs webhooks with HMAC-SHA256 using the webhook secret.
 * The signature is in the x-notion-signature header.
 */
function verifyWebhookSignature(
  body: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature) return false;

  try {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(body);
    const expectedSignature = hmac.digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch {
    return false;
  }
}

/**
 * POST /api/webhooks/notion
 * 
 * Handles Notion webhook events.
 * 
 * Security: Verifies webhook signature using WEBHOOK_SECRET
 */
export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const body = await request.text();
    const signature = request.headers.get('x-notion-signature');
    const webhookSecret = process.env.WEBHOOK_SECRET;

    // Verify signature if webhook secret is configured
    if (webhookSecret) {
      const isValid = verifyWebhookSignature(body, signature, webhookSecret);
      
      if (!isValid) {
        console.warn('Invalid webhook signature');
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        );
      }
    }

    // Parse webhook payload
    let payload: any;
    try {
      payload = JSON.parse(body);
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }

    console.log('Notion webhook received:', payload.type);

    // Extract database ID from payload
    // Notion webhook structure varies, so we handle multiple formats
    let databaseId: string | undefined;

    if (payload.data?.database_id) {
      databaseId = payload.data.database_id;
    } else if (payload.database_id) {
      databaseId = payload.database_id;
    } else if (payload.parent?.database_id) {
      databaseId = payload.parent.database_id;
    }

    // If we can identify the specific database, sync only that one
    if (databaseId && Object.values(NOTION_DB_IDS).includes(databaseId)) {
      console.log(`Syncing specific database: ${databaseId}`);
      const result = await syncDatabase(databaseId);
      
      return NextResponse.json(result, { 
        status: result.status === 'success' ? 200 : 500 
      });
    }

    // If we can't identify the database, do a full sync as fallback
    console.log('Database ID not identified, performing full sync');
    const result = await syncAllDatabases('webhook');

    return NextResponse.json(result, { 
      status: result.status === 'success' ? 200 : 500 
    });
  } catch (error) {
    console.error('Webhook endpoint error:', error);
    
    return NextResponse.json(
      {
        source: 'webhook',
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
        duration: 0,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/webhooks/notion
 * 
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    endpoint: 'notion-webhook',
    status: 'ready',
    message: 'Webhook endpoint is active',
    databases: NOTION_DB_IDS,
  });
}
