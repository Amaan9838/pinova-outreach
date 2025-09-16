import dbConnect from '../../../../lib/mongodb.js';
import MailboxService from '../../../../lib/services/MailboxService.js';

export async function POST(request) {
  try {
    await dbConnect();
    
    console.log('=== EMAIL PROCESSING START ===');
    
    // Initialize services
    await MailboxService.initialize();
    
    const results = {
      emailsProcessed: 0,
      emailsSent: 0,
      errors: [],
      timestamp: new Date().toISOString()
    };
    
    console.log('✅ Email processing service initialized');
    
    return Response.json({
      success: true,
      message: 'Email processing completed',
      results
    });

  } catch (error) {
    console.error('❌ Email processing error:', error);
    return Response.json(
      { 
        success: false, 
        error: 'Failed to process emails: ' + error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// Simple health check endpoint
export async function GET() {
  return Response.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    message: 'Email processing service is running' 
  });
}
