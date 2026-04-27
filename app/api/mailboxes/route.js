import dbConnect from '../../../lib/mongodb.js';
import Mailbox from '../../../models/MailboxFixed.js';

export async function GET() {
  try {
    await dbConnect();
    
    const mailboxes = await Mailbox.find().sort({ createdAt: -1 });
    
    // Auto-reset dailySent counters for any mailbox whose lastDailyReset is stale
    const startOfToday = new Date();
    startOfToday.setUTCHours(0, 0, 0, 0);
    
    const staleMailboxIds = mailboxes
      .filter(mb => !mb.lastDailyReset || new Date(mb.lastDailyReset) < startOfToday)
      .map(mb => mb._id);
    
    if (staleMailboxIds.length > 0) {
      await Mailbox.updateMany(
        { _id: { $in: staleMailboxIds } },
        { $set: { dailySent: 0, lastDailyReset: new Date() } }
      );
      // Refresh the stale ones in our result set
      staleMailboxIds.forEach(id => {
        const mb = mailboxes.find(m => m._id.equals(id));
        if (mb) mb.dailySent = 0;
      });
    }
    
    return Response.json({
      success: true,
      mailboxes
    });

  } catch (error) {
    console.error('Get mailboxes error:', error);
    return Response.json(
      { success: false, error: 'Failed to fetch mailboxes' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    await dbConnect();
    
    const data = await request.json();
    
    console.log('=== CREATE MAILBOX DEBUG ===');
    console.log('Received data:', JSON.stringify(data, null, 2));
    
    // Validate required fields
    if (!data.fromName || !data.fromEmail || !data.smtpHost || !data.smtpUser || !data.smtpPassword) {
      return Response.json(
        { success: false, error: 'All SMTP configuration fields are required' },
        { status: 400 }
      );
    }

    // Extract domain from email
    const domain = data.fromEmail.split('@')[1];
    
    // Detect ISP
    let isp = 'other';
    if (domain.includes('gmail')) isp = 'gmail';
    else if (domain.includes('outlook') || domain.includes('hotmail') || domain.includes('live')) isp = 'outlook';
    else if (domain.includes('yahoo')) isp = 'yahoo';
    // Note: Using 'other' for GoDaddy to avoid enum validation issues
    else if (domain.includes('secureserver') || data.smtpHost.includes('secureserver')) isp = 'other';

    // Check if mailbox already exists
    const existingMailbox = await Mailbox.findOne({ fromEmail: data.fromEmail });
    if (existingMailbox) {
      return Response.json(
        { success: false, error: 'Mailbox with this email already exists' },
        { status: 400 }
      );
    }

    // Create mailbox
    const mailbox = new Mailbox({
      fromName: data.fromName,
      fromEmail: data.fromEmail,
      domain: domain,
      isp: isp,
      dailyCap: data.dailyCap || 10,
      warmScore: data.warmScore || 0,
      status: data.status || 'warming',
      smtpConfiguration: {
        host: data.smtpHost,
        port: data.smtpPort,
        user: data.smtpUser,
        password: data.smtpPassword,
        secure: data.smtpSecure,
      }
    });

    console.log('About to save mailbox with SMTP config:', {
      fromEmail: mailbox.fromEmail,
      smtpHost: mailbox.smtpConfiguration.host,
      smtpPort: mailbox.smtpConfiguration.port,
      smtpUser: mailbox.smtpConfiguration.user,
      hasPassword: !!mailbox.smtpConfiguration.password
    });

    await mailbox.save();

    console.log('Mailbox saved successfully:', mailbox._id);

    // Don't return sensitive SMTP credentials
    const sanitizedMailbox = mailbox.toObject();
    if (sanitizedMailbox.smtpConfiguration) {
      delete sanitizedMailbox.smtpConfiguration.password;
    }

    return Response.json({
      success: true,
      mailbox: sanitizedMailbox
    });

  } catch (error) {
    console.error('Create mailbox error:', error);
    return Response.json(
      { success: false, error: 'Failed to create mailbox: ' + error.message },
      { status: 500 }
    );
  }
}
