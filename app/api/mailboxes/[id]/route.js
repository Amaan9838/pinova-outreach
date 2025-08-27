import dbConnect from '../../../../lib/mongodb.js';
import Mailbox from '../../../../models/MailboxFixed.js';

export async function PATCH(request, { params }) {
  try {
    await dbConnect();
    
    const { id } = params;
    const { status } = await request.json();
    
    const mailbox = await Mailbox.findById(id);
    if (!mailbox) {
      return Response.json(
        { success: false, error: 'Mailbox not found' },
        { status: 404 }
      );
    }

    // Update mailboxa status
    mailbox.status = status;
    await mailbox.save();

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
    console.error('Update mailbox error:', error);
    return Response.json(
      { success: false, error: 'Failed to update mailbox' },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    await dbConnect();
    
    const { id } = params;
    const data = await request.json();
    
    console.log('=== EDIT MAILBOX DEBUG ===');
    console.log('Received data:', JSON.stringify(data, null, 2));
    
    const mailbox = await Mailbox.findById(id);
    if (!mailbox) {
      return Response.json(
        { success: false, error: 'Mailbox not found' },
        { status: 404 }
      );
    }

    // Validate required fields (password is optional when editing)
    if (!data.fromName || !data.fromEmail || !data.smtpHost || !data.smtpUser) {
      return Response.json(
        { success: false, error: 'From name, email, SMTP host, and user are required' },
        { status: 400 }
      );
    }

    // Update mailbox fields
    mailbox.fromName = data.fromName;
    mailbox.fromEmail = data.fromEmail;
    mailbox.dailyCap = data.dailyCap || mailbox.dailyCap;
    
    // Update domain and ISP
    const domain = data.fromEmail.split('@')[1];
    mailbox.domain = domain;
    
    let isp = 'other';
    if (domain.includes('gmail')) isp = 'gmail';
    else if (domain.includes('outlook') || domain.includes('hotmail') || domain.includes('live')) isp = 'outlook';
    else if (domain.includes('yahoo')) isp = 'yahoo';
    // Note: Using 'other' instead of 'godaddy' to avoid enum validation issues
    else if (data.smtpHost && data.smtpHost.includes('secureserver')) isp = 'other';
    mailbox.isp = isp;

    // Update SMTP configuration
    const newSmtpConfig = {
      host: data.smtpHost,
      port: data.smtpPort,
      user: data.smtpUser,
      password: data.smtpPassword || mailbox.smtpConfiguration?.password, // Keep existing password if not provided
      secure: data.smtpSecure,
    };
    
    console.log('New SMTP config to save:', JSON.stringify(newSmtpConfig, null, 2));
    
    mailbox.smtpConfiguration = newSmtpConfig;

    console.log('Mailbox before save:', {
      id: mailbox._id,
      fromEmail: mailbox.fromEmail,
      smtpConfig: mailbox.smtpConfiguration
    });

    await mailbox.save();
    
    console.log('Mailbox saved successfully');

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
    console.error('Edit mailbox error:', error);
    return Response.json(
      { success: false, error: 'Failed to edit mailbox: ' + error.message },
      { status: 500 }
    );
  }
}
