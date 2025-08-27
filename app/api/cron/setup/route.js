import dbConnect from '../../../../lib/mongodb.js';
import { SequencerService } from '../../../../lib/sequencer.js';

let cronInterval = null;

export async function POST(request) {
  try {
    const { action, intervalMinutes = 10 } = await request.json();
    
    if (action === 'start') {
      // Stop existing interval if running
      if (cronInterval) {
        clearInterval(cronInterval);
      }
      
      // Start new interval
      cronInterval = setInterval(async () => {
        console.log('Auto-processing sequences...');
        try {
          await SequencerService.processSequences();
          console.log('Auto-processing completed successfully');
        } catch (error) {
          console.error('Auto-processing error:', error);
        }
      }, intervalMinutes * 60 * 1000); // Convert minutes to milliseconds
      
      return Response.json({
        success: true,
        message: `Cron job started - processing sequences every ${intervalMinutes} minutes`
      });
      
    } else if (action === 'stop') {
      if (cronInterval) {
        clearInterval(cronInterval);
        cronInterval = null;
        
        return Response.json({
          success: true,
          message: 'Cron job stopped'
        });
      } else {
        return Response.json({
          success: false,
          message: 'No cron job was running'
        });
      }
      
    } else if (action === 'status') {
      return Response.json({
        success: true,
        running: !!cronInterval,
        message: cronInterval ? 'Cron job is running' : 'Cron job is not running'
      });
      
    } else {
      return Response.json(
        { success: false, error: 'Invalid action. Use: start, stop, or status' },
        { status: 400 }
      );
    }
    
  } catch (error) {
    console.error('Cron setup error:', error);
    return Response.json(
      { success: false, error: 'Failed to manage cron job: ' + error.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  return Response.json({
    success: true,
    running: !!cronInterval,
    message: cronInterval ? 'Cron job is running' : 'Cron job is not running'
  });
}
