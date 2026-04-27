import dbConnect from '../../../../lib/mongodb.js';
import Message from '../../../../models/Message.js';
import Mailbox from '../../../../models/MailboxFixed.js';
import Prospect from '../../../../models/Prospect.js';
import { SMTPService } from '../../../../lib/smtp.js';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request) {
  try {
    await dbConnect();
    
    const { mailboxId, toEmail, prospectId, subject, content } = await request.json();
    
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

    // Get prospect if provided (for personalization tracking)
    let prospect = null;
    if (prospectId) {
      prospect = await Prospect.findById(prospectId);
    }

    // Create tracking ID
    const trackingId = uuidv4();

    // Personalize content if prospect is selected
    let personalizedSubject = subject;
    let personalizedContent = content;
    
    if (prospect) {
      personalizedSubject = personalizeContent(subject, prospect);
      personalizedContent = personalizeContent(content, prospect);
    }

    // Replace [Your name] with mailbox sender name
    personalizedContent = personalizedContent.replace(/\[Your name\]/g, mailbox.fromName);
    
    // Convert \n to proper line breaks for HTML
    personalizedContent = personalizedContent.replace(/\n/g, '<br>');

    // Create message record
    const message = new Message({
      mailboxId: mailbox._id,
      stepNumber: 0, // Individual emails are step 0
      messageId: `compose-${trackingId}`, // Unique messageId for individual emails
      trackingId,
      subject: personalizedSubject,
      content: personalizedContent,
      status: 'queued',
      isIndividual: true,
      toEmail: toEmail, // Store recipient for individual emails
      // Only set these if prospect exists
      ...(prospect && { prospectId: prospect._id })
    });

    await message.save();

    // Send email via SMTP
    const result = await SMTPService.sendEmail({
      mailbox: mailbox,
      to: toEmail,
      subject: personalizedSubject,
      html: personalizedContent,
      text: htmlToText(personalizedContent),
      trackingId: trackingId,
      messageId: message._id.toString()
    });

    if (result.success) {
      // Update message as sent
      message.status = 'sent';
      message.sesMessageId = result.messageId;
      message.sentAt = new Date();
      message.events.push({
        type: 'sent',
        timestamp: new Date(),
        data: {
          emailType: 'individual',
          recipient: toEmail
        }
      });

      // If SMTP accepted the message, consider it delivered for UI purposes
      if (result.accepted) {
        // Do not add a delivered event here; webhook will add the canonical delivered event
        message.status = 'delivered';
        message.deliveredAt = new Date();
      }
      
      await message.save();

      // Update mailbox daily count (auto-resets if day changed)
      await Mailbox.incrementDailySent(mailbox._id);

      return Response.json({
        success: true,
        message: 'Email sent successfully',
        messageId: message._id,
        trackingId: trackingId,
        sesMessageId: result.messageId
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
    console.error('Compose send error:', error);
    return Response.json(
      { success: false, error: 'Failed to send email' },
      { status: 500 }
    );
  }
}

function personalizeContent(template, prospect) {
  let content = template;
  
  // Replace variables
  content = content.replace(/\{\{first_name\}\}/g, prospect.firstName || '');
  content = content.replace(/\{\{last_name\}\}/g, prospect.lastName || '');
  content = content.replace(/\{\{company\}\}/g, prospect.company || '');
  content = content.replace(/\{\{city\}\}/g, prospect.city || '');
  content = content.replace(/\{\{neighborhood\}\}/g, prospect.neighborhood || '');
  content = content.replace(/\{\{listing_price\}\}/g, prospect.listingPrice || '');
  
  return content;
}

function htmlToText(html) {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]*>/g, '')
    .trim();
}
