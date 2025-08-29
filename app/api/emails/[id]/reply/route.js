import dbConnect from '../../../../../lib/mongodb.js';
import Message from '../../../../../models/Message.js';
import Mailbox from '../../../../../models/MailboxFixed.js';
import Prospect from '../../../../../models/Prospect.js';
import { SMTPService } from '../../../../../lib/smtp.js';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';

export async function POST(request, { params }) {
  try {
    await dbConnect();
    const { id } = params; // original message id
    const { bodyHtml, bodyText } = await request.json();

    const original = await Message.findById(id)
      .populate('mailboxId')
      .populate('prospectId');

    if (!original) {
      return Response.json({ success: false, error: 'Original message not found' }, { status: 404 });
    }

    const mailbox = original.mailboxId;
    const prospect = original.prospectId;

    if (!mailbox || !prospect) {
      return Response.json({ success: false, error: 'Missing mailbox or prospect on original message' }, { status: 400 });
    }

    const trackingId = uuidv4();
    const headerMessageId = `<${trackingId}@${mailbox.domain}>`;

    // Create a new message record for our outbound reply
    const replyMsg = new Message({
      campaignId: original.campaignId || null,
      prospectId: prospect._id,
      mailboxId: mailbox._id,
      stepNumber: 0,
      messageId: `reply-${trackingId}`,
      headerMessageId,
      trackingId,
      subject: `Re: ${original.subject}`,
      content: bodyHtml || bodyText || '',
      status: 'queued',
      isIndividual: true,
      toEmail: prospect.email
    });
    await replyMsg.save();

    const result = await SMTPService.sendEmail({
      mailbox,
      to: prospect.email,
      subject: `Re: ${original.subject}`,
      html: bodyHtml || bodyText || '',
      text: bodyText || '',
      trackingId,
      messageId: replyMsg._id.toString(),
      headerMessageId,
      inReplyTo: original.headerMessageId,
      references: original.headerMessageId ? [original.headerMessageId] : []
    });

    if (result.success) {
      replyMsg.status = 'sent';
      replyMsg.sentAt = new Date();
      replyMsg.events.push({ type: 'sent', timestamp: new Date() });
      await replyMsg.save();

      return Response.json({ success: true, messageId: replyMsg._id });
    } else {
      replyMsg.status = 'failed';
      replyMsg.errorMessage = result.error;
      await replyMsg.save();
      return Response.json({ success: false, error: result.error }, { status: 500 });
    }
  } catch (error) {
    console.error('Reply send error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
