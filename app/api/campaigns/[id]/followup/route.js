import dbConnect from '../../../../../lib/mongodb.js';
import Campaign from '../../../../../models/Campaign.js';
import { NextResponse } from 'next/server';

export async function PUT(request, { params }) {
  try {
    await dbConnect();
    
    const { id } = params;
    console.log('PUT /followup - Campaign ID:', id);
    
    const followUpSettings = await request.json();
    console.log('PUT /followup - Received settings:', followUpSettings);
    
    const campaign = await Campaign.findById(id);
    if (!campaign) {
      console.log('PUT /followup - Campaign not found:', id);
      return Response.json(
        { success: false, error: 'Campaign not found' },
        { status: 404 }
      );
    }

    console.log('PUT /followup - Found campaign:', campaign.name);

    // Update campaign follow-up settings
    campaign.followUpSettings = {
      enabled: followUpSettings.enabled || false,
      maxFollowUps: followUpSettings.maxFollowUps || 3,
      followUpDelay: followUpSettings.followUpDelay || 3,
      followUpTemplates: followUpSettings.followUpTemplates || [],
      conditions: {
        noReply: followUpSettings.conditions?.noReply ?? true,
        noOpen: followUpSettings.conditions?.noOpen ?? false,
        bounced: followUpSettings.conditions?.bounced ?? false
      },
      stopOnReply: followUpSettings.stopOnReply ?? true,
      stopOnOpen: followUpSettings.stopOnOpen ?? false
    };

    console.log('PUT /followup - Saving settings:', campaign.followUpSettings);
    await campaign.save();
    console.log('PUT /followup - Settings saved successfully');

    return NextResponse.json({
      success: true,
      message: 'Follow-up settings saved successfully',
      followUpSettings: campaign.followUpSettings
    });

  } catch (error) {
    console.error('Save follow-up settings error:', error);
    return Response.json(
      { success: false, error: 'Failed to save follow-up settings' },
      { status: 500 }
    );
  }
}

export async function GET(request, { params }) {
  try {
    await dbConnect();
    
    const { id } = params;
    console.log('GET /followup - Campaign ID:', id);
    
    const campaign = await Campaign.findById(id);
    if (!campaign) {
      console.log('GET /followup - Campaign not found:', id);
      return Response.json(
        { success: false, error: 'Campaign not found' },
        { status: 404 }
      );
    }

    console.log('GET /followup - Found campaign:', campaign.name);
    console.log('GET /followup - Current followUpSettings:', campaign.followUpSettings);

    const settings = campaign.followUpSettings || {
      enabled: false,
      maxFollowUps: 3,
      followUpDelay: 3,
      followUpTemplates: [],
      conditions: {
        noReply: true,
        noOpen: false,
        bounced: false
      },
      stopOnReply: true,
      stopOnOpen: false
    };

    console.log('GET /followup - Returning settings:', settings);

    return Response.json({
      success: true,
      followUpSettings: settings
    });

  } catch (error) {
    console.error('Get follow-up settings error:', error);
    return Response.json(
      { success: false, error: 'Failed to get follow-up settings' },
      { status: 500 }
    );
  }
}
