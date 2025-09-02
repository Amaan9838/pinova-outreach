import mongoose from 'mongoose';
import dbConnect from '../../../../../lib/mongodb.js';
import Campaign from '../../../../../models/Campaign.js';
import Mailbox from '../../../../../models/MailboxFixed.js';
import { NextResponse } from 'next/server';

export async function PUT(request, { params }) {
  try {
    await dbConnect();
    
    const { id } = params;
    console.log('PUT /options - Campaign ID:', id);
    
    const { followUpSettings, ...options } = await request.json();
    console.log('PUT /options - Received options:', options);
    console.log('PUT /options - Received followUpSettings:', followUpSettings);
    console.log('PUT /options - selectedMailbox value:', options.selectedMailbox);
    console.log('PUT /options - selectedMailbox type:', typeof options.selectedMailbox);
    
    const campaign = await Campaign.findById(id);
    if (!campaign) {
      console.log('PUT /options - Campaign not found:', id);
      return NextResponse.json(
        { success: false, error: 'Campaign not found' },
        { status: 404 }
      );
    }

    console.log('PUT /options - Found campaign:', campaign.name);

    // Update campaign options - preserve existing values if not provided
    if (!campaign.options) {
      campaign.options = {};
    }
    
    // Handle selectedMailbox
    try {
      if (options.selectedMailbox && options.selectedMailbox !== '') {
        // Verify the mailbox exists and is valid
        const mailbox = await Mailbox.findById(options.selectedMailbox);
        if (!mailbox) {
          return NextResponse.json(
            { success: false, error: 'Selected mailbox not found' },
            { status: 400 }
          );
        }
        
        // Update both the options and the main mailbox reference
        campaign.options.selectedMailbox = mailbox._id;
        campaign.mailbox = mailbox._id;
      } else {
        campaign.options.selectedMailbox = null;
        campaign.mailbox = null;
    }
      // Update other options
      campaign.options.trackOpens = options.trackOpens ?? campaign.options.trackOpens ?? true;
      campaign.options.trackClicks = options.trackClicks ?? campaign.options.trackClicks ?? true;
      campaign.options.unsubscribeLink = options.unsubscribeLink ?? campaign.options.unsubscribeLink ?? true;
      campaign.options.dailyLimit = parseInt(options.dailyLimit) || campaign.options.dailyLimit || 50;
      campaign.options.timezone = options.timezone || campaign.options.timezone || 'UTC';
      campaign.options.notes = options.notes ?? campaign.options.notes ?? '';
      
      // Update follow-up settings if provided
      if (followUpSettings) {
        if (!campaign.followUpSettings) {
          campaign.followUpSettings = {};
        }
        
        campaign.followUpSettings.enabled = followUpSettings.enabled ?? campaign.followUpSettings.enabled ?? false;
        campaign.followUpSettings.stopOnReply = followUpSettings.stopOnReply ?? campaign.followUpSettings.stopOnReply ?? true;
        campaign.followUpSettings.stopOnOpen = followUpSettings.stopOnOpen ?? campaign.followUpSettings.stopOnOpen ?? false;
        
        // Mark the followUpSettings field as modified for Mongoose
        campaign.markModified('followUpSettings');
        console.log('PUT /options - Updated followUpSettings:', campaign.followUpSettings);
      }
      
      // Mark the options field as modified for Mongoose
      campaign.markModified('options');
      
      // Save the campaign
      await campaign.save();
      
      return NextResponse.json({
        success: true,
        message: 'Campaign options updated successfully',
        options: campaign.options,
        followUpSettings: campaign.followUpSettings
      });
    } catch (error) {
      console.error('Error updating campaign options:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    console.log('PUT /options - Saving options:', campaign.options);
    console.log('PUT /options - Campaign before save:', {
      id: campaign._id,
      name: campaign.name,
      options: campaign.options
    });
    
    const savedCampaign = await campaign.save();
    console.log('PUT /options - Campaign after save:', {
      id: savedCampaign._id,
      options: savedCampaign.options
    });
    console.log('PUT /options - Options saved successfully');

    return NextResponse.json({
      success: true,
      message: 'Options saved successfully',
      options: campaign.options,
      followUpSettings: campaign.followUpSettings
    });

  } catch (error) {
    console.error('Save options error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save options' },
      { status: 500 }
    );
  }
}

export async function GET(request, { params }) {
  try {
    await dbConnect();
    
    const { id } = params;
    console.log('GET /options - Campaign ID:', id);
    
    const campaign = await Campaign.findById(id);
    if (!campaign) {
      console.log('GET /options - Campaign not found:', id);
      return NextResponse.json(
        { success: false, error: 'Campaign not found' },
        { status: 404 }
      );
    }

    console.log('GET /options - Found campaign:', campaign.name);
    console.log('GET /options - Current options:', campaign.options);

    const options = campaign.options || {
      selectedMailbox: null,
      trackOpens: true,
      trackClicks: true,
      unsubscribeLink: true,
      dailyLimit: 50,
      timezone: 'UTC',
      notes: ''
    };

    const followUpSettings = campaign.followUpSettings || {
      enabled: false,
      stopOnReply: true,
      stopOnOpen: false
    };

    console.log('GET /options - Returning options:', options);
    console.log('GET /options - Returning followUpSettings:', followUpSettings);

    return NextResponse.json({
      success: true,
      options: options,
      followUpSettings: followUpSettings
    });

  } catch (error) {
    console.error('Get options error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get options' },
      { status: 500 }
    );
  }
}
