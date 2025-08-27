import { SequencerService } from '../../../../lib/sequencer.js';

export async function POST(request) {
  try {
    // Skip auth check for now during testing
    console.log('Processing sequences...');
    await SequencerService.processSequences();

    return Response.json({
      success: true,
      message: 'Sequences processed successfully'
    });

  } catch (error) {
    console.error('Process sequences cron error:', error);
    return Response.json(
      { success: false, error: 'Failed to process sequences' },
      { status: 500 }
    );
  }
}

// Allow GET for testing
export async function GET() {
  try {
    console.log('Processing sequences (GET test)...');
    await SequencerService.processSequences();

    return Response.json({
      success: true,
      message: 'Sequences processed successfully (test run)'
    });

  } catch (error) {
    console.error('Process sequences test error:', error);
    return Response.json(
      { success: false, error: 'Failed to process sequences' },
      { status: 500 }
    );
  }
}
