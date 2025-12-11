import dbConnect from '../../../../lib/mongodb.js';
import Campaign from '../../../../models/Campaign.js';
import CampaignProspect from '../../../../models/CampaignProspect.js';
// Ensure referenced models are registered before populate
import '../../../../models/Prospect.js';
import '../../../../models/MailboxFixed.js';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  try {
    await dbConnect();
    
    const { id } = params;
    
    // Find the campaign (without populating old prospects)
    let campaign = await Campaign.findById(id)
      .populate('mailboxes', 'fromName fromEmail status dailyCap');
    
    if (!campaign) {
      return Response.json(
        { success: false, error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Get prospects from CampaignProspect model
    const campaignProspects = await CampaignProspect.find({ campaign: id })
      .populate('prospect', 'firstName lastName email company phone website industry position notes instagram linkedin personalizationNote customFields tags status')
      .sort({ createdAt: 1 })
      .lean();

    // Calculate prospect statistics
    const prospectCount = campaignProspects.length;
    const prospectStats = {};
    campaignProspects.forEach(cp => {
      const status = cp.status || 'pending';
      prospectStats[status] = (prospectStats[status] || 0) + 1;
    });

    // Transform for backward compatibility - populate campaign.prospects with prospect data
    const populatedProspects = campaignProspects.map(cp => ({
      _id: cp._id,
      prospectId: cp.prospect._id,
      currentStep: cp.sequenceStep || 1,
      status: cp.status || 'pending',
      // Include all prospect details
      ...cp.prospect,
      // CampaignProspect specific fields
      nextSendAt: cp.nextSendAt,
      emailsSent: cp.emailsSent || 0,
      emailsOpened: cp.emailsOpened || 0,
      emailsClicked: cp.emailsClicked || 0,
      emailsReplied: cp.emailsReplied || 0,
      lastSentAt: cp.lastSentAt
    }));

    // Update campaign object with new data
    campaign = campaign.toObject();
    campaign.prospects = populatedProspects; // For backward compatibility
    campaign.prospectCount = prospectCount;
    campaign.prospectStats = prospectStats;
    campaign.campaignProspects = campaignProspects; // Raw data for new features

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
    
    // console.log('PATCH request received:', updates);
    
    const campaign = await Campaign.findById(id);
    if (!campaign) {
      return Response.json(
        { success: false, error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Handle sequence updates with proper data validation
    if (updates.sequence) {
      // console.log('Updating sequence with data:', updates.sequence);
      
     // Process and validate sequence data
  const processedSequence = updates.sequence.map((step, index) => {
    const stepNumber = parseInt(step.stepNumber) || (index + 1);
    
    // Normalize line breaks in template - convert all to \n
    let normalizedTemplate = step.template || 'Add your email template here...';
    if (normalizedTemplate.trim()) {
      normalizedTemplate = normalizedTemplate.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    }
    
    return {
      ...(step._id && { _id: step._id }),
      stepNumber: stepNumber,
      template: normalizedTemplate,
      subject: step.subject && step.subject.trim() ? step.subject : 'Email Subject',
      waitHours: stepNumber === 1 ? 0 : (parseInt(step.waitHours) || 0),
      waitMinutes: stepNumber === 1 ? 0 : (parseInt(step.waitMinutes) || 0),
      conditions: {
        ifOpened: step.conditions?.ifOpened || 'continue',
        ifReplied: step.conditions?.ifReplied || 'stop',
        ifBounced: step.conditions?.ifBounced || 'stop'
      }
    };
  });

  // Instead of assigning the array, update each step individually
  campaign.sequence = processedSequence;
  campaign.markModified('sequence'); // Force Mongoose to save the array
      
  // console.log('Processed sequence:', processedSequence);
      // campaign.sequence = processedSequence;
    }
    
    // Update other campaign fields
    if (updates.name) campaign.name = updates.name;
    if (updates.description !== undefined) campaign.description = updates.description;
    if (updates.persona) campaign.persona = updates.persona;
    if (updates.goal) campaign.goal = updates.goal;
    
    // Handle settings updates
    if (updates.settings) {
      campaign.settings = { ...campaign.settings.toObject(), ...updates.settings };
    }
    
    // Handle options updates - check if options object exists first
    if (!campaign.options) {
      campaign.options = {};
    }
    
    if (updates.selectedMailbox !== undefined) {
      campaign.options.selectedMailbox = updates.selectedMailbox;
    }
    if (updates.trackOpens !== undefined) {
      campaign.options.trackOpens = updates.trackOpens;
    }
    if (updates.trackClicks !== undefined) {
      campaign.options.trackClicks = updates.trackClicks;
    }
    if (updates.unsubscribeLink !== undefined) {
      campaign.options.unsubscribeLink = updates.unsubscribeLink;
    }
    if (updates.dailyLimit !== undefined) {
      campaign.options.dailyLimit = updates.dailyLimit;
    }
    if (updates.timezone !== undefined) {
      campaign.options.timezone = updates.timezone;
    }
    if (updates.notes !== undefined) {
      campaign.options.notes = updates.notes;
    }
    
    // Handle mailboxes array updates
    if (updates.mailboxes !== undefined) {
      campaign.mailboxes = updates.mailboxes;
    }
    
    // Handle status updates
    if (updates.status !== undefined) {
      campaign.status = updates.status;
    }

    // Update timestamp
    campaign.updatedAt = new Date();
    
    // console.log('About to save campaign with sequence:', JSON.stringify(campaign.sequence, null, 2));

    // Save with validation
    const savedCampaign = await campaign.save();
    // console.log('After save - checking database:', JSON.stringify(savedCampaign.sequence, null, 2));

    // If status changed to active and we have campaign prospects, update their status
    if (updates.status === 'active') {
      await CampaignProspect.updateMany(
        { campaign: id, status: 'pending' },
        { status: 'active', nextSendAt: new Date() }
      );
    }

    return Response.json({
      success: true,
      campaign: savedCampaign
    });

  } catch (error) {
    console.error('Update campaign error:', error);
    console.error('Error stack:', error.stack);
    return Response.json(
      { success: false, error: 'Failed to update campaign: ' + error.message },
      { status: 500 }
    );
  }
}