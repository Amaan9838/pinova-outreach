import { InboxMonitorService } from '../../../../lib/inbox-monitor.js';

export async function POST(request) {
  try {
    console.log('Checking for replies...');
    await InboxMonitorService.checkReplies();

    return Response.json({
      success: true,
      message: 'Reply check completed successfully'
    });

  } catch (error) {
    console.error('Check replies cron error:', error);
    return Response.json(
      { success: false, error: 'Failed to check replies' },
      { status: 500 }
    );
  }
}

// Allow GET for testing
export async function GET() {
  try {
    console.log('Checking for replies (GET test)...');
    await InboxMonitorService.checkReplies();

    return Response.json({
      success: true,
      message: 'Reply check completed successfully (test run)'
    });

  } catch (error) {
    console.error('Check replies test error:', error);
    return Response.json(
      { success: false, error: 'Failed to check replies' },
      { status: 500 }
    );
  }
}
