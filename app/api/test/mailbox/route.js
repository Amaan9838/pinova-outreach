import dbConnect from '../../../../lib/mongodb.js';
import Mailbox from '../../../../models/MailboxFixed.js';
import { SMTPService } from '../../../../lib/smtp.js';

export async function POST(request) {
  try {
    await dbConnect();
    
    const { mailboxId, testEmail } = await request.json();
    
    if (!mailboxId || !testEmail) {
      return Response.json(
        { success: false, error: 'Mailbox ID and test email are required' },
        { status: 400 }
      );
    }

    // Get mailbox
    const mailbox = await Mailbox.findById(mailboxId);
    if (!mailbox) {
      return Response.json(
        { success: false, error: 'Mailbox not found' },
        { status: 404 }
      );
    }

    // Debug: Check if SMTP configuration exists
    console.log('Mailbox found:', {
      id: mailbox._id,
      fromEmail: mailbox.fromEmail,
      hasSmtpConfig: !!mailbox.smtpConfiguration,
      smtpConfig: mailbox.smtpConfiguration,
      mailbox: mailbox
    });

    if (!mailbox.smtpConfiguration) {
      return Response.json({
        success: false,
        error: 'Mailbox has no SMTP configuration. Please edit the mailbox and add SMTP settings.',
        step: 'validation'
      });
    }

    // Test SMTP connection first
    const connectionTest = await SMTPService.testConnection(mailbox.smtpConfiguration);
    if (!connectionTest.success) {
      return Response.json({
        success: false,
        error: 'SMTP connection failed: ' + connectionTest.error,
        step: 'connection'
      });
    }

    // Send test email
    const result = await SMTPService.sendTestEmail(mailbox, testEmail);
    
    return Response.json({
      success: result.success,
      message: result.success ? 'Test email sent successfully!' : result.error,
      step: result.success ? 'sent' : 'sending',
      details: result
    });

  } catch (error) {
    console.error('Test mailbox error:', error);
    return Response.json(
      { success: false, error: 'Failed to test mailbox: ' + error.message },
      { status: 500 }
    );
  }
}
