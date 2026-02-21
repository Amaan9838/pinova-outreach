import { NextResponse } from 'next/server';
import { InboxMonitorService } from '../../../../lib/inbox-monitor.js';

const CRON_SECRET = process.env.CRON_SECRET;

export const maxDuration = 300;

export async function GET(req) {
  const isDev = process.env.NODE_ENV !== 'production';
  const authHeader = req.headers.get('authorization');

  if (!isDev && CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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
