import dbConnect from '@/lib/mongodb';
import Message from '@/models/Message';
import '@/models/Prospect';
import '@/models/Campaign';
import Mailbox from '@/models/MailboxFixed';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);

    const mailboxFilter = searchParams.get('mailbox') || '';
    const campaignFilter = searchParams.get('campaign') || '';
    const statusFilter = searchParams.get('status') || '';
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '200', 10);

    // Build filter
    const filter = { isTest: { $ne: true } };
    if (mailboxFilter) filter.mailboxId = mailboxFilter;
    if (campaignFilter) filter.campaignId = campaignFilter;
    if (statusFilter === 'replied') filter.status = 'replied';
    else if (statusFilter === 'sent') filter.status = { $in: ['sent', 'delivered', 'opened'] };

    // Fetch messages
    const messages = await Message.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate({ path: 'prospectId', select: 'firstName lastName email company' })
      .populate({ path: 'campaignId', select: 'name' })
      .populate({ path: 'mailboxId', select: 'fromEmail fromName' })
      .lean();

    const total = await Message.countDocuments(filter);

    // Group into threads by prospect+campaign
    const threadMap = new Map();
    for (const msg of messages) {
      const prospectId = msg.prospectId?._id?.toString() || 'unknown';
      const campaignId = msg.campaignId?._id?.toString() || 'none';
      const threadKey = `${prospectId}_${campaignId}`;

      if (!threadMap.has(threadKey)) {
        threadMap.set(threadKey, {
          threadKey,
          prospect: msg.prospectId ? {
            _id: msg.prospectId._id,
            name: `${msg.prospectId.firstName || ''} ${msg.prospectId.lastName || ''}`.trim() || msg.prospectId.email,
            email: msg.prospectId.email,
            company: msg.prospectId.company || '',
          } : { name: msg.toEmail || 'Unknown', email: msg.toEmail || '' },
          campaign: msg.campaignId ? { _id: msg.campaignId._id, name: msg.campaignId.name } : null,
          mailbox: msg.mailboxId ? { _id: msg.mailboxId._id, fromEmail: msg.mailboxId.fromEmail, fromName: msg.mailboxId.fromName } : null,
          messages: [],
          hasReply: false,
          lastMessageAt: msg.createdAt,
        });
      }

      const thread = threadMap.get(threadKey);

      // Determine direction:
      // Outbound = has sequenceStep defined, or is the original campaign email
      // Inbound = a reply message created by inbox-monitor (usually has no sequenceStep and status 'replied')
      // But inbox-monitor ALSO sets original message to status:'replied' — so we detect:
      //   - If the message has a replied event with replyText → it's an outbound msg that got a reply
      //   - If the message content matches the reply event text → it's the inbound copy
      const replyEvents = (msg.events || []).filter(e => e.type === 'replied' && e.data);
      const hasReplyEvent = replyEvents.length > 0;
      
      // An outbound message that received a reply: has sequenceStep or sentAt, AND has reply events
      // An inbound reply message: created by inbox-monitor at line 319 — has status 'replied', no sentAt, no trackingId
      const isInbound = msg.status === 'replied' && !msg.sentAt && !msg.trackingId && !msg.sequenceStep;

      const msgObj = {
        _id: msg._id,
        subject: msg.subject,
        content: msg.content,
        status: msg.status,
        direction: isInbound ? 'inbound' : 'outbound',
        createdAt: msg.createdAt,
        sentAt: msg.sentAt,
        repliedAt: msg.repliedAt,
      };

      // If outbound message has reply events, extract reply content
      if (!isInbound && hasReplyEvent) {
        msgObj.replies = replyEvents.map(e => ({
          text: e.data?.text || '',
          html: e.data?.html || '',
          from: e.data?.fromEmail || '',
          timestamp: e.timestamp,
        }));
      }

      thread.messages.push(msgObj);
      if (msg.status === 'replied' || hasReplyEvent) thread.hasReply = true;
    }

    // Process threads: sort messages, detect last activity
    const threads = Array.from(threadMap.values())
      .map(t => {
        t.messages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        // Calculate last activity
        const lastMsg = t.messages[t.messages.length - 1];
        t.lastMessageAt = lastMsg?.createdAt || t.lastMessageAt;
        // Summary metrics
        t.sentCount = t.messages.filter(m => m.direction === 'outbound').length;
        t.replyCount = t.messages.filter(m => m.direction === 'inbound').length +
          t.messages.reduce((acc, m) => acc + (m.replies?.length || 0), 0);
        return t;
      })
      .sort((a, b) => {
        if (a.hasReply && !b.hasReply) return -1;
        if (!a.hasReply && b.hasReply) return 1;
        return new Date(b.lastMessageAt) - new Date(a.lastMessageAt);
      });

    // Pagination for threads
    const threadPage = parseInt(searchParams.get('threadPage') || '1', 10);
    const threadsPerPage = 20;
    const totalThreads = threads.length;
    const paginatedThreads = threads.slice((threadPage - 1) * threadsPerPage, threadPage * threadsPerPage);

    // Mailboxes for filter — include all statuses so paused mailboxes still show their historical messages
    const mailboxes = await Mailbox.find({})
      .select('fromEmail fromName status')
      .lean();

    // Stats
    const [totalMessages, totalReplied, totalSent] = await Promise.all([
      Message.countDocuments({ isTest: { $ne: true } }),
      Message.countDocuments({ status: 'replied', isTest: { $ne: true } }),
      Message.countDocuments({ status: { $in: ['sent', 'delivered', 'opened'] }, isTest: { $ne: true } }),
    ]);

    return Response.json({
      success: true,
      threads: paginatedThreads,
      pagination: {
        threadPage,
        threadsPerPage,
        totalThreads,
        totalThreadPages: Math.ceil(totalThreads / threadsPerPage),
      },
      stats: { totalMessages, totalReplied, totalSent },
      mailboxes: mailboxes.map(m => ({ _id: m._id, fromEmail: m.fromEmail, fromName: m.fromName, status: m.status })),
    }, { headers: { 'Cache-Control': 'no-store' } });

  } catch (error) {
    console.error('Inbox API error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
