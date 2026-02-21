import { NextResponse } from 'next/server';
import { InboxMonitorService } from '../../../../lib/inbox-monitor.js';

export const maxDuration = 300;

export async function GET() {
  try {
    const startedAt = Date.now();
    await InboxMonitorService.checkReplies();
    const durationMs = Date.now() - startedAt;

    return NextResponse.json({
      success: true,
      message: 'Inbox monitor run completed',
      durationMs
    });
  } catch (error) {
    console.error('[inbox-monitor-cron] Fatal error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
