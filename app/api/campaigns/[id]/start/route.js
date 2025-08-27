import dbConnect from '../../../../../lib/mongodb.js';
import Campaign from '../../../../../models/Campaign.js';

export async function POST(request, { params }) {
  try {
    await dbConnect();
    
    const { id } = params;
    
    const campaign = await Campaign.findById(id);
    if (!campaign) {
      return Response.json(
        { success: false, error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Validate campaign can be started
    if (!campaign.sequence || campaign.sequence.length === 0) {
      return Response.json(
        { success: false, error: 'Campaign must have at least one sequence step' },
        { status: 400 }
      );
    }

    if (!campaign.mailboxes || campaign.mailboxes.length === 0) {
      return Response.json(
        { success: false, error: 'Campaign must have at least one mailbox' },
        { status: 400 }
      );
    }

    if (!campaign.prospects || campaign.prospects.length === 0) {
      return Response.json(
        { success: false, error: 'Campaign must have at least one prospect' },
        { status: 400 }
      );
    }

    // Update campaign status and set next send times for prospects
    campaign.status = 'active';
    
    const now = new Date();
    console.log('Starting campaign, current time:', now);
    
    campaign.prospects.forEach((prospect, index) => {
      if (prospect.status === 'pending') {
        prospect.status = 'active';
        prospect.currentStep = 1;
        // Schedule first send within next 10 minutes, spread out
        const delayMinutes = index * 2; // 0, 2, 4, 6 minutes etc.
        prospect.nextSendAt = new Date(now.getTime() + delayMinutes * 60 * 1000);
        
        console.log(`Scheduled prospect ${prospect.prospectId} for ${prospect.nextSendAt}`);
      }
    });

    await campaign.save();

    return Response.json({
      success: true,
      message: 'Campaign started successfully',
      campaign
    });

  } catch (error) {
    console.error('Start campaign error:', error);
    return Response.json(
      { success: false, error: 'Failed to start campaign' },
      { status: 500 }
    );
  }
}
