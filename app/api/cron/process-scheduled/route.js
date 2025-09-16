import dbConnect from '../../../../lib/mongodb.js';
import { CampaignSchedulingService } from '../../../../lib/campaignScheduling.js';

export const dynamic = 'force-dynamic';

/**
 * Process scheduled campaigns and retry attempts
 * This endpoint should be called by a cron job every 5-10 minutes
 */
export async function POST(request) {
  try {
    await dbConnect();
    
    console.log('=== PROCESSING SCHEDULED CAMPAIGNS ===');
    
    // Process campaigns ready to start
    const scheduledResults = await CampaignSchedulingService.processScheduledCampaigns();
    console.log(`Scheduled campaigns processed: ${scheduledResults.processed}, activated: ${scheduledResults.activated}, failed: ${scheduledResults.failed}`);
    
    // Process retry attempts
    const retryResults = await CampaignSchedulingService.processRetryAttempts();
    console.log(`Retry attempts processed: ${retryResults.processed}, succeeded: ${retryResults.succeeded}, failed: ${retryResults.failed}`);
    
    const totalProcessed = scheduledResults.processed + retryResults.processed;
    const totalSucceeded = scheduledResults.activated + retryResults.succeeded;
    const totalFailed = scheduledResults.failed + retryResults.failed;
    
    console.log('=== SCHEDULED CAMPAIGN PROCESSING COMPLETE ===');
    
    return Response.json({
      success: true,
      message: `Processed ${totalProcessed} campaigns: ${totalSucceeded} succeeded, ${totalFailed} failed`,
      results: {
        scheduled: scheduledResults,
        retries: retryResults,
        summary: {
          totalProcessed,
          totalSucceeded,
          totalFailed
        }
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Process scheduled campaigns error:', error);
    return Response.json(
      { 
        success: false, 
        error: 'Failed to process scheduled campaigns: ' + error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

/**
 * Allow GET for testing
 */
export async function GET(request) {
  return POST(request);
}
