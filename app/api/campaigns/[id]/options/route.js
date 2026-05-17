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
    
    // Handle selectedMailbox (legacy single-mailbox support)
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

      // ── Multi-mailbox pool (PRD §7.10) ─────────────────────────────────────
      // Accept an array of mailbox IDs for round-robin rotation
      if (Array.isArray(options.mailboxes)) {
        // Validate each mailbox exists and is active
        const validatedMailboxIds = [];
        for (const mbId of options.mailboxes) {
          const mb = await Mailbox.findById(mbId);
          if (mb && mb.status === 'active') {
            validatedMailboxIds.push(mb._id);
          } else {
            console.warn(`[options] Mailbox ${mbId} skipped: not found or inactive`);
          }
        }
        campaign.mailboxes = validatedMailboxIds;
        
        // Backward compat: set campaign.mailbox to first in pool
        if (validatedMailboxIds.length > 0 && !campaign.mailbox) {
          campaign.mailbox = validatedMailboxIds[0];
          campaign.options.selectedMailbox = validatedMailboxIds[0];
        }
        
        console.log(`[options] Multi-mailbox pool set: ${validatedMailboxIds.length} mailbox(es)`);
      }

      // ── Send pacing config (PRD §7.10) ─────────────────────────────────────
      if (options.v2SendPacing) {
        campaign.v2SendPacing = {
          enabled: options.v2SendPacing.enabled ?? campaign.v2SendPacing?.enabled ?? true,
          minGapSeconds: Math.max(0, parseInt(options.v2SendPacing.minGapSeconds) || campaign.v2SendPacing?.minGapSeconds || 120),
          maxGapSeconds: Math.max(0, parseInt(options.v2SendPacing.maxGapSeconds) || campaign.v2SendPacing?.maxGapSeconds || 240),
          respectWarmScore: options.v2SendPacing.respectWarmScore ?? campaign.v2SendPacing?.respectWarmScore ?? true
        };
        // Ensure min <= max
        if (campaign.v2SendPacing.minGapSeconds > campaign.v2SendPacing.maxGapSeconds) {
          campaign.v2SendPacing.maxGapSeconds = campaign.v2SendPacing.minGapSeconds;
        }
        campaign.markModified('v2SendPacing');
        console.log(`[options] Send pacing updated: ${campaign.v2SendPacing.minGapSeconds}–${campaign.v2SendPacing.maxGapSeconds}s`);
      }

      // Update other options
      campaign.options.trackOpens = options.trackOpens ?? campaign.options.trackOpens ?? true;
      campaign.options.trackClicks = options.trackClicks ?? campaign.options.trackClicks ?? true;
      campaign.options.unsubscribeLink = options.unsubscribeLink ?? campaign.options.unsubscribeLink ?? true;
      campaign.options.dailyLimit = parseInt(options.dailyLimit) || campaign.options.dailyLimit || 50;
      // ✅ CRITICAL FIX: Update BOTH legacy scheduling AND v2 timezone
      if (options.timezone) {
        // Legacy: for backward compatibility
        campaign.scheduling = campaign.scheduling || {};
        campaign.scheduling.timezone = options.timezone;
        
        // V2 NATIVE: So V2 engine uses the correct timezone!
        campaign.v2Timezone = options.timezone;
        console.log(`[options] Synced timezone to v2: ${options.timezone}`);
      }
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

      // Auto-validate campaign after mailbox update
      console.log('PUT /options - Running auto-validation after mailbox update');
      const { CampaignValidationService } = await import('../../../../../lib/campaignValidation.js');
      const validation = await CampaignValidationService.validateCampaign(campaign._id);

      // Update validation status
      campaign.validation = {
        status: validation.valid ? 'valid' : 'invalid',
        errors: validation.errors || [],
        lastChecked: new Date()
      };

      let statusChanged = false;
      let autoActivated = false;

      // Auto-transition status if validation now passes
      if (validation.valid) {
        if (campaign.status === 'pending_scheduled' && campaign.scheduling?.startDateTime) {
          // Was pending due to validation, now valid and has schedule - move to scheduled
          campaign.status = 'scheduled';
          statusChanged = true;
          console.log(`Campaign ${campaign._id} auto-transitioned to scheduled after validation pass`);
        } else if (campaign.status === 'pending_scheduled' && !campaign.scheduling?.startDateTime) {
          // Was pending due to validation, now valid but no schedule - could auto-activate
          if (campaign.scheduling?.autoActivateWhenReady) {
            campaign.status = 'active';
            autoActivated = true;
            statusChanged = true;
            console.log(`Campaign ${campaign._id} auto-activated after validation pass`);

            // Sync prospects with campaign status
            const { CampaignProspectService } = await import('../../../../../lib/services/CampaignProspectService.js');

            try {
              const syncResult = await CampaignProspectService.syncProspectsWithCampaignStatus(
                campaign._id,
                'active',
                { staggerSettings: campaign.scheduling?.staggerSettings || {} }
              );
              console.log(`Auto-synced ${syncResult.modified} prospects for activated campaign ${campaign._id}`);
            } catch (scheduleError) {
              console.error(`Failed to sync prospects for campaign ${campaign._id}:`, scheduleError);
            }
          } else {
            campaign.status = 'draft';
            statusChanged = true;
            console.log(`Campaign ${campaign._id} moved to draft - ready for scheduling`);
          }
        }
      }

      // Save again if status changed
      if (statusChanged) {
        await campaign.save();
      }

      return NextResponse.json({
        success: true,
        message: 'Campaign options updated successfully',
        options: campaign.options,
        followUpSettings: campaign.followUpSettings,
        mailboxes: campaign.mailboxes || [],
        v2SendPacing: campaign.v2SendPacing,
        validation: {
          valid: validation.valid,
          errors: validation.errors || []
        },
        statusChanged,
        autoActivated,
        newStatus: campaign.status
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
      notes: ''
    };

    // Canonical timezone for both legacy + v2 callers.
    options.timezone = campaign.scheduling?.timezone || campaign.v2Timezone || 'America/New_York';

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
      followUpSettings: followUpSettings,
      // Multi-mailbox pool for round-robin rotation
      mailboxes: campaign.mailboxes || [],
      // Send pacing config
      v2SendPacing: campaign.v2SendPacing || {
        enabled: true,
        minGapSeconds: 120,
        maxGapSeconds: 240,
        respectWarmScore: true
      }
    });

  } catch (error) {
    console.error('Get options error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get options' },
      { status: 500 }
    );
  }
}
