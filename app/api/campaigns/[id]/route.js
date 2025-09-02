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
  return {
    ...(step._id && { _id: step._id }), // Preserve existing _id if it exists
    stepNumber: stepNumber,
    template: step.template || '',
    subject: step.subject || '',
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

    // Update timestamp
    campaign.updatedAt = new Date();
    
    // console.log('About to save campaign with sequence:', JSON.stringify(campaign.sequence, null, 2));

    // Save with validation
    const savedCampaign = await campaign.save();
    // console.log('After save - checking database:', JSON.stringify(savedCampaign.sequence, null, 2));

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