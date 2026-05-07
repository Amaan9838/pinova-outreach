import { NextResponse } from 'next/server';
import { InboxMonitorService } from '../../../../lib/inbox-monitor.js';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const startedAt = Date.now();

    // Fire-and-forget: start the inbox monitor in the background.
    // This ensures cron-job.org gets a 200 immediately (within <1s)
    // and doesn't kill the request at its 30s timeout.
    // The Node.js process keeps running the IMAP checks after the response is sent.
    InboxMonitorService.checkReplies()
      .then(() => {
        const durationMs = Date.now() - startedAt;
        console.log(`[inbox-monitor-cron] Background run completed in ${durationMs}ms`);
      })
      .catch((error) => {
        console.error('[inbox-monitor-cron] Background run failed:', error);
      });

    return NextResponse.json({
      success: true,
      message: 'Inbox monitor started (processing in background)',
      startedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('[inbox-monitor-cron] Fatal error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
