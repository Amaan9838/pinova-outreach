import dbConnect from '../../../../lib/mongodb.js';
import Message from '../../../../models/Message.js';
import Mailbox from '../../../../models/MailboxFixed.js';
import { SMTPService } from '../../../../lib/smtp.js';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request) {
  try {
    await dbConnect();
    
    const { mailboxId, toEmail, subject, content, testType = 'deliverability' } = await request.json();
    
    if (!mailboxId || !toEmail || !subject || !content) {
      return Response.json(
        { success: false, error: 'Missing required fields: mailboxId, toEmail, subject, content' },
        { status: 400 }
      );
    }

    // Get mailbox
    const mailbox = await Mailbox.findById(mailboxId);
    if (!mailbox || mailbox.status !== 'active') {
      return Response.json(
        { success: false, error: 'Mailbox not found or inactive' },
        { status: 400 }
      );
    }

    // Create tracking ID
    const trackingId = uuidv4();

    // Create test message record
    const message = new Message({
      campaignId: null, // No campaign for test emails
      prospectId: null, // No prospect for test emails
      mailboxId: mailbox._id,
      stepNumber: 0,
      trackingId,
      subject: subject,
      content: content,
      status: 'queued',
      isTest: true,
      testType: testType
    });

    await message.save();

    // Add tracking pixel to content
    const trackingPixel = `<img src="${process.env.NEXT_PUBLIC_APP_URL}/api/track/open/${trackingId}" width="1" height="1" style="display:none;">`;
    const contentWithTracking = content + trackingPixel;

    // Send test email
    const result = await SMTPService.sendEmail({
      mailbox: mailbox,
      to: toEmail,
      subject: subject,
      html: contentWithTracking,
      text: content.replace(/<[^>]*>/g, ''), // Strip HTML for text version
      trackingId: trackingId,
      messageId: message._id.toString()
    });

    if (result.success) {
      // Update message
      message.status = 'sent';
      message.sesMessageId = result.messageId;
      message.sentAt = new Date();
      message.events.push({
        type: 'sent',
        timestamp: new Date(),
        data: {
          testType: testType,
          smtpResponse: result.response
        }
      });
      await message.save();

      return Response.json({
        success: true,
        message: 'Test email sent successfully',
        trackingId: trackingId,
        messageId: message._id,
        sesMessageId: result.messageId,
        trackingUrl: `${process.env.NEXT_PUBLIC_APP_URL}/emails/${message._id}`
      });

    } else {
      // Update message with error
      message.status = 'failed';
      message.errorMessage = result.error;
      await message.save();

      return Response.json(
        { success: false, error: result.error, messageId: message._id },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Test email send error:', error);
    return Response.json(
      { success: false, error: 'Failed to send test email' },
      { status: 500 }
    );
  }
}
