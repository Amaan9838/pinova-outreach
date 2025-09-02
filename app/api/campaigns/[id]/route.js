import dbConnect from '../../../../lib/mongodb.js';
import Campaign from '../../../../models/Campaign.js';
// Ensure referenced models are registered before populate
import '../../../../models/Prospect.js';
import '../../../../models/MailboxFixed.js';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  try {
    await dbConnect();
    
    const { id } = params;
    
    const campaign = await Campaign.findById(id)
      .populate('mailboxes', 'fromName fromEmail status dailyCap')
      .populate('prospects.prospectId', 'firstName lastName email company city');
    
    if (!campaign) {
      return Response.json(
        { success: false, error: 'Campaign not found' },
        { status: 404 }
      );
    }
    
    return Response.json({
      success: true,
      campaign
    }, { headers: { 'Cache-Control': 'no-store' } });

  } catch (error) {
    console.error('Get campaign error:', error);
    return Response.json(
      { success: false, error: 'Failed to fetch campaign' },
      { status: 500 }
    );
  }
}

export async function PATCH(request, { params }) {
  try {
    await dbConnect();
    
    const { id } = params;
    const updates = await request.json();
    
    const campaign = await Campaign.findById(id);
    if (!campaign) {
      return Response.json(
        { success: false, error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Update allowed fields
    if (updates.sequence) {
      campaign.sequence = updates.sequence;
    }
    if (updates.name) campaign.name = updates.name;
    if (updates.description !== undefined) campaign.description = updates.description;
    if (updates.persona) campaign.persona = updates.persona;
    if (updates.goal) campaign.goal = updates.goal;
    if (updates.settings) {
      campaign.settings = { ...campaign.settings, ...updates.settings };
    }
    
    // Handle mailbox and other option settings
    if (updates.selectedMailbox !== undefined) campaign.mailbox = updates.selectedMailbox;
    if (updates.trackOpens !== undefined) campaign.trackOpens = updates.trackOpens;
    if (updates.trackClicks !== undefined) campaign.trackClicks = updates.trackClicks;
    if (updates.unsubscribeLink !== undefined) campaign.unsubscribeLink = updates.unsubscribeLink;
    if (updates.dailyLimit !== undefined) campaign.dailyLimit = updates.dailyLimit;
    if (updates.timezone !== undefined) campaign.timezone = updates.timezone;
    if (updates.notes !== undefined) campaign.notes = updates.notes;

    campaign.updatedAt = new Date();
    await campaign.save();

    return Response.json({
      success: true,
      campaign
    });

  } catch (error) {
    console.error('Update campaign error:', error);
    return Response.json(
      { success: false, error: 'Failed to update campaign' },
      { status: 500 }
    );
  }
}
