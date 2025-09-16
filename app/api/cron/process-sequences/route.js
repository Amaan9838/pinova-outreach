import { SequencerService } from '../../../../lib/sequencer.js';

export async function POST(request) {
  try {
    console.log('=== EMAIL SEQUENCE PROCESSING START ===');
    
    // Use SequencerService - the unified, working email processor
    console.log('Processing sequences with SequencerService...');
    const results = await SequencerService.processSequences();
    
    // Get campaign count for stats
    const { default: Campaign } = await import('../../../../models/Campaign.js');
    const activeCampaigns = await Campaign.find({ status: 'active' });
    
    console.log('=== EMAIL SEQUENCE PROCESSING COMPLETE ===');
    
    return Response.json({
      success: true,
      message: `Email sequences processed successfully`,
      stats: {
        campaignsProcessed: activeCampaigns.length,
        processingSystem: 'SequencerService (Unified)',
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Process campaigns error:', error);
    return Response.json(
      { success: false, error: 'Failed to process campaigns: ' + error.message },
      { status: 500 }
    );
  }
}

// Allow GET for testing
export async function GET() {
  return POST(); // Use same logic as POST
}
