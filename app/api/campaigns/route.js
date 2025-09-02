import dbConnect from '../../../lib/mongodb.js';
import Campaign from '../../../models/Campaign.js';
import Prospect from '../../../models/Prospect.js';
// Ensure referenced models for populate are registered
import '../../../models/MailboxFixed.js';

export async function GET() {
  try {
    await dbConnect();
    
    const campaigns = await Campaign.find()
      .populate('mailboxes', 'fromName fromEmail status')
      .sort({ createdAt: -1 });
    
    return Response.json({
      success: true,
      campaigns
    });

  } catch (error) {
    console.error('Get campaigns error:', error);
    return Response.json(
      { success: false, error: 'Failed to fetch campaigns' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    await dbConnect();
    
    const data = await request.json();
    
    // Validate required fields (allow name-first creation; fill sensible defaults)
    if (!data.name) {
      return Response.json(
        { success: false, error: 'Name is required' },
        { status: 400 }
      );
    }

    const persona = data.persona || 'general';
    const goal = data.goal || 'outreach';

    // Create campaign
    const campaign = new Campaign({
      name: data.name,
      description: data.description,
      persona,
      goal,
      sequence: data.sequence || [],
      mailboxes: data.mailboxes || [],
      settings: {
        sendTimeStart: data.sendTimeStart || '09:00',
        sendTimeEnd: data.sendTimeEnd || '17:00',
        timezone: data.timezone || 'America/New_York',
        skipWeekends: data.skipWeekends !== false,
        dailyLimit: data.dailyLimit || 50,
      }
    });

    await campaign.save();

    return Response.json({
      success: true,
      campaign
    });

  } catch (error) {
    console.error('Create campaign error:', error);
    return Response.json(
      { success: false, error: 'Failed to create campaign' },
      { status: 500 }
    );
  }
}
