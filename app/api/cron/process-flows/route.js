import { NextResponse } from 'next/server';
import { FlowEngine } from '@/lib/flowEngine';

/**
 * POST /api/cron/process-flows
 * Cron job to process visual email flows
 * Called periodically to check for:
 * - Expired wait nodes (timeout triggers)
 * - Scheduled sends
 * 
 * Should be called every 5-15 minutes
 */
export async function POST(request) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.warn('Process flows: Invalid cron secret');
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    console.log('FlowEngine Cron: Starting scheduled trigger processing...');
    
    // Process all pending flow triggers
    await FlowEngine.processScheduledTriggers();
    
    console.log('FlowEngine Cron: Processing complete');
    
    return NextResponse.json({
      success: true,
      message: 'Flow triggers processed',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('FlowEngine Cron Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cron/process-flows
 * Health check and manual trigger endpoint
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const execute = searchParams.get('execute') === 'true';
    
    if (execute) {
      // Manual trigger
      await FlowEngine.processScheduledTriggers();
      return NextResponse.json({
        success: true,
        message: 'Flow triggers processed manually',
        timestamp: new Date().toISOString()
      });
    }
    
    // Health check
    return NextResponse.json({
      success: true,
      message: 'Flow processing cron is healthy',
      endpoint: '/api/cron/process-flows',
      methods: ['GET (health check)', 'POST (process triggers)'],
      note: 'Add ?execute=true to manually trigger processing'
    });
    
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
