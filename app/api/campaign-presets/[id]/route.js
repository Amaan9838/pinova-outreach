import dbConnect from '../../../../lib/mongodb.js';
import CampaignPreset from '../../../../models/CampaignPreset.js';
import Mailbox from '../../../../models/MailboxFixed.js';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  try {
    await dbConnect();
    const preset = await CampaignPreset.findById(params.id)
      .populate('mailboxes', 'fromName fromEmail status dailyCap');

    if (!preset) {
      return Response.json({ success: false, error: 'Preset not found' }, { status: 404 });
    }

    return Response.json({ success: true, preset });
  } catch (error) {
    console.error('Get campaign preset error:', error);
    return Response.json({ success: false, error: 'Failed to get campaign preset' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    await dbConnect();
    const body = await request.json();

    const preset = await CampaignPreset.findById(params.id);
    if (!preset) {
      return Response.json({ success: false, error: 'Preset not found' }, { status: 404 });
    }

    if (body.name !== undefined) preset.name = body.name;
    if (body.description !== undefined) preset.description = body.description;

    if (body.mailboxes !== undefined) {
      const mailboxIds = Array.isArray(body.mailboxes) ? body.mailboxes : [];
      if (mailboxIds.length > 0) {
        const activeCount = await Mailbox.countDocuments({ _id: { $in: mailboxIds }, status: 'active' });
        if (activeCount !== mailboxIds.length) {
          return Response.json({ success: false, error: 'One or more selected mailboxes are inactive or missing' }, { status: 400 });
        }
      }
      preset.mailboxes = mailboxIds;
    }

    for (const field of ['options', 'scheduling', 'v2Limits', 'v2Delays', 'v2SendPacing', 'replyTemplate']) {
      if (body[field] !== undefined) {
        preset[field] = body[field];
        preset.markModified(field);
      }
    }

    await preset.save();
    return Response.json({ success: true, preset });
  } catch (error) {
    console.error('Update campaign preset error:', error);
    return Response.json({ success: false, error: error.message || 'Failed to update campaign preset' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    await dbConnect();
    const deleted = await CampaignPreset.findByIdAndDelete(params.id);
    if (!deleted) {
      return Response.json({ success: false, error: 'Preset not found' }, { status: 404 });
    }
    return Response.json({ success: true });
  } catch (error) {
    console.error('Delete campaign preset error:', error);
    return Response.json({ success: false, error: 'Failed to delete campaign preset' }, { status: 500 });
  }
}
