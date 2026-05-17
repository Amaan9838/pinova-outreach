import dbConnect from '../../../lib/mongodb.js';
import CampaignPreset from '../../../models/CampaignPreset.js';
import Mailbox from '../../../models/MailboxFixed.js';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await dbConnect();
    const presets = await CampaignPreset.find({})
      .sort({ createdAt: -1 })
      .populate('mailboxes', 'fromName fromEmail status dailyCap');

    return Response.json({ success: true, presets });
  } catch (error) {
    console.error('List campaign presets error:', error);
    return Response.json({ success: false, error: 'Failed to list campaign presets' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await dbConnect();
    const body = await request.json();

    if (!body.name?.trim()) {
      return Response.json({ success: false, error: 'Preset name is required' }, { status: 400 });
    }

    const mailboxIds = Array.isArray(body.mailboxes) ? body.mailboxes : [];
    if (mailboxIds.length > 0) {
      const activeCount = await Mailbox.countDocuments({ _id: { $in: mailboxIds }, status: 'active' });
      if (activeCount !== mailboxIds.length) {
        return Response.json({ success: false, error: 'One or more selected mailboxes are inactive or missing' }, { status: 400 });
      }
    }

    const preset = await CampaignPreset.create({
      name: body.name.trim(),
      description: body.description || '',
      mailboxes: mailboxIds,
      options: body.options || undefined,
      scheduling: body.scheduling || undefined,
      v2Limits: body.v2Limits || undefined,
      v2Delays: body.v2Delays || undefined,
      v2SendPacing: body.v2SendPacing || undefined,
      replyTemplate: body.replyTemplate || undefined
    });

    return Response.json({ success: true, preset }, { status: 201 });
  } catch (error) {
    console.error('Create campaign preset error:', error);
    return Response.json({ success: false, error: error.message || 'Failed to create campaign preset' }, { status: 500 });
  }
}
