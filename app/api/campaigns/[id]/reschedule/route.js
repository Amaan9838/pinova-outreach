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

    const now = new Date();
    let rescheduledCount = 0;
    
    console.log('Rescheduling campaign prospects, current time:', now);
    
    // Reschedule all active prospects to send within next 5 minutes
    campaign.prospects.forEach((prospect, index) => {
      if (prospect.status === 'active') {
        const delayMinutes = index; // 0, 1, 2, 3 minutes etc.
        prospect.nextSendAt = new Date(now.getTime() + delayMinutes * 60 * 1000);
        rescheduledCount++;
        
        console.log(`Rescheduled prospect ${prospect.prospectId} (step ${prospect.currentStep}) for ${prospect.nextSendAt}`);
      }
    });

    await campaign.save();

    return Response.json({
      success: true,
      message: `Rescheduled ${rescheduledCount} prospects for immediate sending`,
      rescheduledCount,
      campaign
    });

  } catch (error) {
    console.error('Reschedule campaign error:', error);
    return Response.json(
      { success: false, error: 'Failed to reschedule campaign: ' + error.message },
      { status: 500 }
    );
  }
}
