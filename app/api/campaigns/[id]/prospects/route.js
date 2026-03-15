import dbConnect from '../../../../../lib/mongodb.js';
import Campaign from '../../../../../models/Campaign.js';
import Prospect from '../../../../../models/Prospect.js';
import CampaignProspect from '../../../../../models/CampaignProspect.js';
import { CampaignSchedulingService } from '../../../../../lib/campaignScheduling.js';

export async function POST(request, { params }) {
  try {
    await dbConnect();
    
    const { id } = params;
    const body = await request.json();
    
    const campaign = await Campaign.findById(id);
    if (!campaign) {
      return Response.json(
        { success: false, error: 'Campaign not found' },
        { status: 404 }
      );
    }

    let addedCount = 0;

    // Handle adding existing prospects by IDs
    if (body.prospectIds && Array.isArray(body.prospectIds)) {
      const { prospectIds } = body;
      
      // Verify prospects exist
      const prospects = await Prospect.find({
        _id: { $in: prospectIds },
        status: 'active'
      });

      if (prospects.length !== prospectIds.length) {
        return Response.json(
          { success: false, error: 'Some prospects not found or inactive' },
          { status: 400 }
        );
      }

      // Check existing CampaignProspect entries
      const existingCampaignProspects = await CampaignProspect.find({
        campaign: id,
        prospect: { $in: prospectIds }
      });

      const existingProspectIds = existingCampaignProspects.map(cp => cp.prospect._id.toString());
      
      const newProspectIds = prospects
        .filter(prospect => !existingProspectIds.includes(prospect._id.toString()))
        .map(prospect => prospect._id);

      // Create new CampaignProspect entries
      const newCampaignProspects = newProspectIds.map(prospectId => ({
        campaign: id,
        prospect: prospectId,
        sequenceStep: 1,
        status: campaign.status === 'active' ? 'active' : 'pending',
        nextSendAt: campaign.status === 'active' ? new Date() : null // Only schedule if campaign is active
      }));

      if (newCampaignProspects.length > 0) {
        await CampaignProspect.insertMany(newCampaignProspects);
        addedCount += newCampaignProspects.length;

        // If campaign is active, schedule prospects with staggered timing
        if (campaign.status === 'active') {
          console.log(`Scheduling ${newCampaignProspects.length} new prospects for active campaign`);
          for (let i = 0; i < newProspectIds.length; i++) {
            const prospectId = newProspectIds[i];
            const staggerDelay = i * 2 * 60 * 1000; // 2 minutes between each prospect
            await CampaignSchedulingService.scheduleProspect(id, prospectId, staggerDelay);
          }
        }
      }

      // Update campaign prospect count
      campaign.prospectCount = (campaign.prospectCount || 0) + newCampaignProspects.length;
      await campaign.save();

      return Response.json({
        success: true,
        message: `Added ${newCampaignProspects.length} new prospects to campaign`,
        addedCount: newCampaignProspects.length,
        campaign
      });
    }

    // Handle creating new prospect and adding to campaign
    const {
      firstName,
      lastName = '',
      email,
      company = '',
      phone = '',
      website = '',
      industry = '',
      position = '',
      notes = '',
      instagram = '',
      linkedin = '',
      facebook = '',
      zillow = '',
      personalizationNote = '',
      customFields = []
    } = body;
    
    if (!firstName || !email) {
      return Response.json(
        { success: false, error: 'First name and email are required' },
        { status: 400 }
      );
    }

    if (!website && !linkedin && !instagram && !facebook && !zillow) {
      return Response.json(
        { success: false, error: 'At least one social/web link (Website, LinkedIn, Instagram, Facebook, or Zillow) is required' },
        { status: 400 }
      );
    }

    // Check if prospect with this email already exists
    let prospect = await Prospect.findOne({ email: email.toLowerCase().trim() });
    
    if (!prospect) {
      // Create new prospect with all fields including custom ones
      const prospectData = {
        email: email.toLowerCase().trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        company: company.trim(),
        phone: phone.trim(),
        website: website.trim(),
        industry: industry.trim(),
        position: position.trim(),
        notes: notes.trim(),
        instagram: instagram.trim(),
        linkedin: linkedin.trim(),
        facebook: facebook.trim(),
        zillow: zillow.trim(),
        personalizationNote: personalizationNote.trim(),
        status: 'active',
        customFields: Array.isArray(customFields) ? customFields : [],
        source: 'manual'
      };

      prospect = new Prospect(prospectData);
      await prospect.save();
      console.log(`Created new prospect: ${prospect.email}`);
    } else {
      console.log(`Using existing prospect: ${prospect.email}`);
    }

    // Check if prospect is already in campaign via CampaignProspect
    const existingCampaignProspect = await CampaignProspect.findOne({
      campaign: id,
      prospect: prospect._id
    });

    if (existingCampaignProspect) {
      return Response.json(
        { success: false, error: 'Prospect already exists in this campaign' },
        { status: 400 }
      );
    }

    // Create CampaignProspect entry - schedule based on campaign status
    const campaignProspect = new CampaignProspect({
      campaign: id,
      prospect: prospect._id,
      sequenceStep: 1,
      status: campaign.status === 'active' ? 'active' : 'pending',
      nextSendAt: campaign.status === 'active' ? new Date() : null // Only schedule if campaign is active
    });

    await campaignProspect.save();
    addedCount++;

    // If campaign is active, schedule the prospect for immediate sending
    if (campaign.status === 'active') {
      console.log(`Scheduling new prospect ${prospect._id} for active campaign`);
      await CampaignSchedulingService.scheduleProspect(id, prospect._id, 0);
    }

    // Update campaign prospect count
    campaign.prospectCount = (campaign.prospectCount || 0) + 1;
    await campaign.save();

    return Response.json({
      success: true,
      message: 'Prospect added to campaign successfully',
      prospect,
      campaignProspect
    });

  } catch (error) {
    console.error('Add prospect to campaign error:', error);
    return Response.json(
      { success: false, error: 'Failed to add prospect to campaign' },
      { status: 500 }
    );
  }
}

// This should be in the same file or a separate GET handler
export async function GET(request, { params }) {
  try {
    await dbConnect();
    
    const { id } = params; // campaignId
    
    // Get prospects from CampaignProspect model
    const campaignProspects = await CampaignProspect.find({ campaign: id })
      .populate('prospect', 'firstName lastName email company phone website industry position notes instagram linkedin personalizationNote customFields tags status')
      .sort({ createdAt: 1 })
      .lean();

    // Transform for backward compatibility - use expected field names
    const prospects = campaignProspects.map(cp => ({
      _id: cp.prospect._id,
      firstName: cp.prospect.firstName,
      lastName: cp.prospect.lastName,
      email: cp.prospect.email,
      company: cp.prospect.company,
      phone: cp.prospect.phone,
      website: cp.prospect.website,
      industry: cp.prospect.industry,
      position: cp.prospect.position,
      notes: cp.prospect.notes,
      instagram: cp.prospect.instagram,
      linkedin: cp.prospect.linkedin,
      personalizationNote: cp.prospect.personalizationNote,
      customFields: cp.prospect.customFields,
      tags: cp.prospect.tags,
      // Campaign-specific fields - map to expected names for frontend compatibility
      status: cp.status,
      currentStep: (cp.attemptCount || 0) + 1,
      nextSendAt: cp.nextSendAt,
      nextActionAt: cp.nextActionAt, // V2 engine timing
      v2State: cp.v2State,           // V2 engine state
      emailsSent: cp.emailsSent || 0,
      emailsOpened: cp.emailsOpened || 0,
      emailsClicked: cp.emailsClicked || 0,
      emailsReplied: cp.emailsReplied || 0,
      lastSentAt: cp.lastSentAt,
      emailSteps: cp.emailSteps || []
    }));

    return Response.json({
      success: true,
      prospects,
      total: prospects.length,
      prospectStats: {
        total: prospects.length,
        active: prospects.filter(p => p.campaignStatus === 'active').length,
        pending: prospects.filter(p => p.campaignStatus === 'pending').length,
        completed: prospects.filter(p => p.campaignStatus === 'completed').length
      }
    });

  } catch (error) {
    console.error('Fetch prospects error:', error);
    return Response.json(
      { success: false, error: 'Failed to fetch prospects' },
      { status: 500 }
    );
  }
}