import dbConnect from '../../../lib/mongodb.js';
import Campaign from '../../../models/Campaign.js';
import Prospect from '../../../models/Prospect.js';

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
    
    // Validate required fields
    if (!data.name || !data.persona || !data.goal) {
      return Response.json(
        { success: false, error: 'Name, persona, and goal are required' },
        { status: 400 }
      );
    }

    // Create campaign
    const campaign = new Campaign({
      name: data.name,
      description: data.description,
      persona: data.persona,
      goal: data.goal,
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
