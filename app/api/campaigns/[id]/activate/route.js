import dbConnect from '../../../../../lib/mongodb.js';
import Campaign from '../../../../../models/Campaign.js';
import CampaignProspect from '../../../../../models/CampaignProspect.js';
import MailboxService from '../../../../../lib/services/MailboxService.js';

export async function POST(request, { params }) {
  try {
    await dbConnect();
    
    const { id } = params;
    const { selectedMailboxId, startImmediately = true } = await request.json();
    
    console.log(`Activating campaign ${id} with mailbox ${selectedMailboxId}`);
    
    // Find campaign
    const campaign = await Campaign.findById(id);
      
    if (!campaign) {
      return Response.json(
        { success: false, error: 'Campaign not found' },
        { status: 404 }
      );
    }
    
    if (campaign.status === 'active') {
      return Response.json(
        { success: false, error: 'Campaign is already active' },
        { status: 400 }
      );
    }
    
    // Validate selected mailbox using MailboxService
    const mailboxValidation = await MailboxService.validateMailbox(selectedMailboxId);
    if (!mailboxValidation.valid) {
      return Response.json(
        { success: false, error: `Mailbox validation failed: ${mailboxValidation.error}` },
        { status: 400 }
      );
    }
    const mailbox = mailboxValidation.mailbox;
    
    // Check if campaign has prospects using CampaignProspect model
    const prospectCount = await CampaignProspect.countDocuments({
      campaign: id,
      status: { $in: ['pending', 'active'] }
    });
    
    if (prospectCount === 0) {
      return Response.json(
        { success: false, error: 'Cannot activate campaign without prospects' },
        { status: 400 }
      );
    }
    
    // ────────────────────────────────────────────────────────────
    // v2 Activation Validation (PRD §9.2, £9.4, £12.4)
    // ────────────────────────────────────────────────────────────
    if (campaign.useV2Engine) {
      // Must have minimum 3 angles configured (PRD §5.1)
      const angles = campaign.v2Angles || [];
      if (angles.length < 3) {
        return Response.json(
          { success: false, error: 'v2 campaigns require at least 3 angles before activation (PRD §5.1)' },
          { status: 400 }
        );
      }
      // Must have a timezone set
      if (!campaign.v2Timezone) {
        return Response.json(
          { success: false, error: 'v2 campaigns require a timezone (v2Timezone) before activation (PRD §3.1)' },
          { status: 400 }
        );
      }
      console.log(`[v2] Activation validation passed. ${angles.length} angles configured.`);
    } else {
      // Legacy: must have sequence steps
      if (!campaign.sequences || campaign.sequences.length === 0) {
        return Response.json(
          { success: false, error: 'Cannot activate campaign without sequence steps' },
          { status: 400 }
        );
      }
    }
    console.log(`Campaign validation passed. Prospects: ${prospectCount}`);
    
    // Standardize mailbox references using MailboxService
    if (!campaign.mailboxIds) {
      campaign.mailboxIds = [];
    }
    if (!campaign.mailboxIds.includes(selectedMailboxId)) {
      campaign.mailboxIds.push(selectedMailboxId);
    }
    
    // Clean up legacy mailbox fields
    await MailboxService.standardizeCampaignMailboxes(id);
    
    console.log(`Activating campaign ${campaign.name}...`);
    
    // Update prospects to active status
    if (campaign.useV2Engine) {
      // v2: Initialize state machine for all pending prospects (PRD £4.1, £12.4)
      // Set state = new and nextActionAt = now so cron picks up immediately
      const updateResult = await CampaignProspect.updateMany(
        { campaign: id, $or: [{ v2State: null }, { v2State: 'new' }] },
        {
          $set: {
            v2State: 'new',
            nextActionAt: new Date(), // Immediate pickup on next cron tick
            stopFlag: false,
            attemptCount: 0,
            failureCount: 0,
            processingLock: false
          }
        }
      );
      if (updateResult.modifiedCount === 0) {
        return Response.json({ success: false, error: 'No prospects to initialize for v2 engine' }, { status: 400 });
      }
      console.log(`[v2] Initialized ${updateResult.modifiedCount} prospects with state=new`);
    } else {
      // Legacy
      const updateResult = await CampaignProspect.updateMany(
        { campaign: id, status: 'pending' },
        { status: 'active' }
      );
      if (updateResult.modifiedCount === 0) {
        return Response.json({ success: false, error: 'No prospects to activate' }, { status: 400 });
      }
    }
    
    // Set campaign as active
    campaign.status = 'active';
    campaign.startedAt = new Date();
    campaign.mailbox = selectedMailboxId;
    
    await campaign.save();
    
    console.log(`Campaign ${campaign.name} activated with ${updateResult.modifiedCount} prospects`);
    
    return Response.json({
      success: true,
      message: `Campaign activated with ${updateResult.modifiedCount} prospects`,
      campaign: {
        id: campaign._id,
        name: campaign.name,
        status: campaign.status,
        prospectCount: updateResult.modifiedCount,
        mailbox: {
          id: mailbox._id,
          email: mailbox.email
        }
      }
    });
    
  } catch (error) {
    console.error('Campaign activation error:', error);
    return Response.json(
      { success: false, error: 'Failed to activate campaign: ' + error.message },
      { status: 500 }
    );
  }
}

