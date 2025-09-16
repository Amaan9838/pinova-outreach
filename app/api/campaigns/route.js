import dbConnect from '../../../lib/mongodb.js';
import Campaign from '../../../models/Campaign.js';
import Prospect from '../../../models/Prospect.js';
import CampaignProspect from '../../../models/CampaignProspect.js';
import User from '../../../models/User.js';
// Ensure referenced models for populate are registered
import '../../../models/MailboxFixed.js';

export async function GET() {
  try {
    await dbConnect();

    const campaigns = await Campaign.find()
      .populate('mailboxes', 'fromName fromEmail status')
      .sort({ createdAt: -1 });

    // Enhance campaigns with prospect counts from both old and new systems
    const enhancedCampaigns = await Promise.all(
      campaigns.map(async (campaign) => {
        const campaignObj = campaign.toObject();

        // Get prospect count from new CampaignProspect model
        const campaignProspectCount = await CampaignProspect.countDocuments({
          campaign: campaign._id
        });

        // Get prospect count from old embedded prospects array
        const oldProspectCount = campaign.prospects?.length || 0;

        // Use the higher count (in case of mixed data)
        const totalProspects = Math.max(campaignProspectCount, oldProspectCount);

        // If we have CampaignProspect data, get more detailed stats
        if (campaignProspectCount > 0) {
          const prospectStats = await CampaignProspect.aggregate([
            { $match: { campaign: campaign._id } },
            {
              $group: {
                _id: '$status',
                count: { $sum: 1 }
              }
            }
          ]);

          // Convert to object for easier access
          const statusCounts = {};
          prospectStats.forEach(stat => {
            statusCounts[stat._id] = stat.count;
          });

          // Update campaign object with enhanced data
          campaignObj.prospectCount = totalProspects;
          campaignObj.prospectStats = statusCounts;

          // Ensure prospects array shows correct count for UI compatibility
          if (!campaignObj.prospects || campaignObj.prospects.length === 0) {
            campaignObj.prospects = new Array(totalProspects).fill(null);
          }
        } else {
          // Fallback to old system data
          campaignObj.prospectCount = oldProspectCount;
          campaignObj.prospectStats = {};
        }

        return campaignObj;
      })
    );

    return Response.json({
      success: true,
      campaigns: enhancedCampaigns
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
    
    console.log('Campaign creation attempt - Incoming data:', {
      name: data.name,
      hasProspects: data.prospects && data.prospects.length > 0,
      sequenceLength: data.sequence ? data.sequence.length : 0,
      mailboxes: data.mailboxes || []
    });
    
    // Validate required fields (allow name-first creation; fill sensible defaults)
    if (!data.name) {
      return Response.json(
        { success: false, error: 'Name is required' },
        { status: 400 }
      );
    }

    const persona = data.persona || 'general';
    const goal = data.goal || 'outreach';

    // Get user default settings
    const user = await User.getDefaultUser();
    const defaultSettings = user.getDefaultCampaignSettings();

    // Determine initial status based on request data and prospects
    const hasProspects = data.prospects && data.prospects.length > 0;
    let initialStatus = data.status || 'draft';

    // Validate status transitions
    if (initialStatus === 'active' && !hasProspects) {
      initialStatus = 'draft'; // Can't be active without prospects
    }
    if (initialStatus === 'scheduled' && !data.scheduling?.startDateTime) {
      initialStatus = 'draft'; // Can't be scheduled without start time
    }

    // Create campaign without embedded prospects (we'll use CampaignProspect model)
    const campaign = new Campaign({
      name: data.name,
      description: data.description,
      persona,
      goal,
      status: initialStatus,
      sequence: data.sequence || [{
        stepNumber: 1,
        subject: data.subject || 'Hello {{firstName}}',
        template: data.body || 'Hi {{firstName}},\n\nI hope this email finds you well.\n\nBest regards,\n{{senderName}}'
      }],
      options: {
        trackOpens: data.options?.trackOpens ?? defaultSettings.trackOpens,
        trackClicks: data.options?.trackClicks ?? defaultSettings.trackClicks,
        unsubscribeLink: data.options?.unsubscribeLink ?? defaultSettings.unsubscribeLink,
        dailyLimit: data.options?.dailyLimit ?? defaultSettings.dailyLimit
        // NOTE: timezone moved to scheduling.timezone for consistency
      },
      // Set scheduling information from request or defaults
      scheduling: {
        startDateTime: data.scheduling?.startDateTime || null,
        timezone: data.scheduling?.timezone || data.options?.timezone || defaultSettings.timezone,
        businessHours: defaultSettings.businessHours,
        dailySendCap: defaultSettings.dailyLimit,
        staggerSettings: {
          enabled: true,
          baseDelayMinutes: 2,
          randomVariationMinutes: 1
        },
        autoActivateWhenReady: data.scheduling?.autoActivateWhenReady || false
      },
      mailboxes: data.mailboxes || [],
      // Don't populate prospects array - we'll use CampaignProspect instead
      prospects: [] // Empty array for backward compatibility
    });

    await campaign.save();

    let createdCampaignProspects = [];
    let prospectCount = 0;

    // Handle prospects creation/linking using CampaignProspect model
    if (hasProspects && Array.isArray(data.prospects)) {
      const prospectPromises = data.prospects.map(async (prospectData, index) => {
        try {
          console.log(`Processing prospect ${index + 1}/${data.prospects.length}:`, {
            email: prospectData.email,
            firstName: prospectData.firstName
          });
          
          // Validate required prospect fields
          if (!prospectData.email || !prospectData.firstName) {
            console.warn(`Skipping invalid prospect ${index + 1}: Missing required fields`, prospectData);
            return null;
          }

          // Check if prospect already exists by email
          let prospect = await Prospect.findOne({ email: prospectData.email.toLowerCase().trim() });

          if (!prospect) {
            // Create new prospect
            prospect = new Prospect({
              email: prospectData.email.toLowerCase().trim(),
              firstName: prospectData.firstName.trim(),
              lastName: prospectData.lastName?.trim() || '',
              company: prospectData.company?.trim() || '',
              phone: prospectData.phone?.trim() || '',
              website: prospectData.website?.trim() || '',
              industry: prospectData.industry?.trim() || '',
              position: prospectData.position?.trim() || '',
              notes: prospectData.notes?.trim() || '',
              instagram: prospectData.instagram?.trim() || '',
              linkedin: prospectData.linkedin?.trim() || '',
              personalizationNote: prospectData.personalizationNote?.trim() || '',
              customFields: prospectData.customFields || {},
              source: 'campaign_import'
            });

            await prospect.save();
            console.log(`Created new prospect: ${prospect.email}`);
          } else {
            console.log(`Using existing prospect: ${prospect.email}`);
          }

          // Create or update CampaignProspect entry
          let campaignProspect = await CampaignProspect.findOne({
            campaign: campaign._id,
            prospect: prospect._id
          });

          if (!campaignProspect) {
            // Create new CampaignProspect with context-aware initialization
            const prospectData = {
              campaign: campaign._id,
              prospect: prospect._id,
              sequenceStep: 1
            };

            // Initialize status and scheduling based on campaign type
            if (initialStatus === 'active') {
              // Immediate start - activate prospects with staggered timing
              prospectData.status = 'active';
              const staggerDelay = index * 2 * 60 * 1000; // 2 minutes between prospects
              prospectData.nextSendAt = new Date(Date.now() + staggerDelay);
              prospectData.startedAt = new Date();
              console.log(`Initialized active prospect ${prospect.email} with nextSendAt: ${prospectData.nextSendAt.toISOString()}`);
            } else if (initialStatus === 'scheduled' && campaign.scheduling?.startDateTime) {
              // Scheduled start - set prospects as pending but with future scheduling
              prospectData.status = 'pending';
              const staggerDelay = index * 2 * 60 * 1000; // 2 minutes between prospects
              prospectData.nextSendAt = new Date(campaign.scheduling.startDateTime.getTime() + staggerDelay);
              console.log(`Scheduled prospect ${prospect.email} for: ${prospectData.nextSendAt.toISOString()}`);
            } else {
              // Draft or other status - keep as pending without scheduling
              prospectData.status = 'pending';
              prospectData.nextSendAt = null;
              console.log(`Created pending prospect ${prospect.email} - awaiting campaign scheduling`);
            }

            campaignProspect = new CampaignProspect(prospectData);
            await campaignProspect.save();
            createdCampaignProspects.push(campaignProspect);
            prospectCount++;
            console.log(`Added CampaignProspect for: ${prospect.email}`);
          } else {
            // Update existing prospect with same logic
            campaignProspect.sequenceStep = 1;

            if (initialStatus === 'active') {
              campaignProspect.status = 'active';
              const staggerDelay = index * 2 * 60 * 1000;
              campaignProspect.nextSendAt = new Date(Date.now() + staggerDelay);
              campaignProspect.startedAt = new Date();
            } else if (initialStatus === 'scheduled' && campaign.scheduling?.startDateTime) {
              campaignProspect.status = 'pending';
              const staggerDelay = index * 2 * 60 * 1000;
              campaignProspect.nextSendAt = new Date(campaign.scheduling.startDateTime.getTime() + staggerDelay);
            } else {
              campaignProspect.status = 'pending';
              campaignProspect.nextSendAt = null;
            }

            await campaignProspect.save();
            prospectCount++;
            console.log(`Updated CampaignProspect for: ${prospect.email}`);
          }

          return campaignProspect;

        } catch (prospectError) {
          console.error(`Error processing prospect ${index + 1} (${prospectData?.email || 'unknown'}):`, prospectError);
          return null;
        }
      });

      const results = await Promise.all(prospectPromises);
      
      // Filter out null results (failed prospects)
      createdCampaignProspects = results.filter(cp => cp !== null);
      
      // Update campaign prospect count for UI
      campaign.prospectCount = prospectCount;
      await campaign.save();
    }

    // Store validation status but don't block creation
    console.log(`Validating newly created campaign: ${campaign._id}`);
    const { CampaignValidationService } = await import('../../../lib/campaignValidation.js');
    const validation = await CampaignValidationService.validateCampaign(campaign._id);

    // Update campaign with validation results and proper status
    campaign.validation = {
      status: validation.valid ? 'valid' : 'invalid',
      errors: validation.errors || [],
      lastChecked: new Date()
    };

    // Set final campaign status based on validation and scheduling
    if (initialStatus === 'active' && !validation.valid) {
      // Wanted to be active but validation failed - set to pending_scheduled
      campaign.status = 'pending_scheduled';
      console.log(`Campaign ${campaign._id} set to pending_scheduled due to validation errors`);
    } else if (initialStatus === 'scheduled' && validation.valid) {
      // Scheduled and valid - set to scheduled
      campaign.status = 'scheduled';
      console.log(`Campaign ${campaign._id} set to scheduled - will activate at ${campaign.scheduling.startDateTime}`);
    } else if (initialStatus === 'scheduled' && !validation.valid) {
      // Scheduled but invalid - set to pending_scheduled
      campaign.status = 'pending_scheduled';
      console.log(`Campaign ${campaign._id} set to pending_scheduled due to validation errors`);
    } else if (initialStatus === 'active' && validation.valid) {
      // Active and valid - keep as active
      campaign.status = 'active';
      console.log(`Campaign ${campaign._id} activated successfully`);
    } else {
      // Default to draft
      campaign.status = 'draft';
      console.log(`Campaign ${campaign._id} created as draft`);
    }

    await campaign.save();

    console.log(`Campaign ${campaign._id} created with validation status: ${validation.valid ? 'valid' : 'invalid'}`);

    return Response.json({
      success: true,
      campaign: {
        ...campaign.toObject(),
        prospectCount: prospectCount,
        campaignProspects: createdCampaignProspects
      },
      validation: {
        valid: validation.valid,
        errors: validation.errors || []
      },
      message: hasProspects
        ? `Campaign created successfully with ${prospectCount} prospects! Configure mailbox and schedule to start sending.`
        : 'Campaign created in draft status. Add prospects and configure settings to get started.'
    });
    
  } catch (error) {
    console.error('Create campaign error:', error);
    console.error('Error details - Request data preview:', {
      name: data?.name,
      prospectsCount: data?.prospects?.length || 0
    });
    
    // Cleanup if campaign was partially created
    if (campaign && campaign._id) {
      await Campaign.findByIdAndDelete(campaign._id);
      await CampaignProspect.deleteMany({ campaign: campaign._id });
    }
    
    return Response.json(
      { success: false, error: 'Failed to create campaign' },
      { status: 500 }
    );
  }
}
