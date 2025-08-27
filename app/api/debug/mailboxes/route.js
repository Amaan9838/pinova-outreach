import dbConnect from '../../../../lib/mongodb.js';
import Mailbox from '../../../../models/MailboxFixed.js';

export async function GET() {
  try {
    await dbConnect();
    
    // Get all mailboxes with full data (including sensitive info for debugging)
    const mailboxes = await Mailbox.find({});
    
    console.log('=== MAILBOX DEBUG ===');
    console.log('Total mailboxes found:', mailboxes.length);
    
    const debugData = mailboxes.map(mailbox => ({
      id: mailbox._id,
      fromName: mailbox.fromName,
      fromEmail: mailbox.fromEmail,
      domain: mailbox.domain,
      isp: mailbox.isp,
      status: mailbox.status,
      dailyCap: mailbox.dailyCap,
      hasSmtpConfig: !!mailbox.smtpConfiguration,
      smtpConfigDetails: mailbox.smtpConfiguration ? {
        host: mailbox.smtpConfiguration.host,
        port: mailbox.smtpConfiguration.port,
        user: mailbox.smtpConfiguration.user,
        hasPassword: !!mailbox.smtpConfiguration.password,
        secure: mailbox.smtpConfiguration.secure
      } : null,
      createdAt: mailbox.createdAt,
      updatedAt: mailbox.updatedAt
    }));
    
    debugData.forEach((mailbox, index) => {
      console.log(`Mailbox ${index + 1}:`, JSON.stringify(mailbox, null, 2));
    });
    
    return Response.json({
      success: true,
      count: mailboxes.length,
      mailboxes: debugData
    });
    
  } catch (error) {
    console.error('Debug mailboxes error:', error);
    return Response.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
