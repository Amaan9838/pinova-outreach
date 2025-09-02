import { SequencerService } from '../../../../lib/sequencer.js';
import { processAllCampaigns } from '../../../../lib/campaignExecutor.js';

export async function POST(request) {
  try {
    console.log('Processing campaigns with integrated settings...');
    
    // Use new integrated campaign executor
    const results = await processAllCampaigns();
    
    // Also run legacy sequencer for backward compatibility
    await SequencerService.processSequences();

    const totalSent = results.reduce((sum, r) => sum + (r.sent || 0), 0);
    const totalFollowUps = results.reduce((sum, r) => sum + (r.followUpsSent || 0), 0);
    const errors = results.filter(r => r.error || (r.errors && r.errors.length > 0));

    return Response.json({
      success: true,
      message: `Campaigns processed successfully`,
      stats: {
        campaignsProcessed: results.length,
        emailsSent: totalSent,
        followUpsSent: totalFollowUps,
        errors: errors.length
      },
      results
    });

  } catch (error) {
    console.error('Process campaigns error:', error);
    return Response.json(
      { success: false, error: 'Failed to process campaigns' },
      { status: 500 }
    );
  }
}

// Allow GET for testing
export async function GET() {
  try {
    console.log('Processing campaigns (GET test)...');
    
    const results = await processAllCampaigns();
    
    return Response.json({
      success: true,
      message: 'Campaigns processed successfully (test run)',
      results
    });

  } catch (error) {
    console.error('Process campaigns test error:', error);
    return Response.json(
      { success: false, error: 'Failed to process campaigns' },
      { status: 500 }
    );
  }
}
