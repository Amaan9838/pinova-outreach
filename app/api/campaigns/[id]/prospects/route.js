import dbConnect from '../../../../../lib/mongodb.js';
import Campaign from '../../../../../models/Campaign.js';
import Prospect from '../../../../../models/Prospect.js';

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

    // Handle adding existing prospects by IDs
    if (body.prospectIds) {
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

      // Add prospects to campaign
      const existingProspectIds = campaign.prospects.map(p => p.prospectId.toString());
      const newProspects = prospects
        .filter(prospect => !existingProspectIds.includes(prospect._id.toString()))
        .map(prospect => ({
          prospectId: prospect._id,
          currentStep: 1,
          status: 'pending',
          nextSendAt: null
        }));

      campaign.prospects.push(...newProspects);
      await campaign.save();

      return Response.json({
        success: true,
        message: `Added ${newProspects.length} new prospects to campaign`,
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
      personalizationNote = '',
      customFields = []
    } = body;
    
    if (!firstName || !email) {
      return Response.json(
        { success: false, error: 'First name and email are required' },
        { status: 400 }
      );
    }

    // Check if prospect with this email already exists
    let prospect = await Prospect.findOne({ email });
    
    if (!prospect) {
      // Create new prospect with all fields including custom ones
      const prospectData = {
        firstName,
        lastName,
        email,
        company,
        phone,
        website,
        industry,
        position,
        notes,
        instagram,
        linkedin,
        personalizationNote,
        status: 'active'
      };

      // Add custom fields if any
      if (customFields && customFields.length > 0) {
        prospectData.customFields = customFields;
      }

      prospect = new Prospect(prospectData);
      await prospect.save();
    }

    // Check if prospect is already in campaign
    const existingProspect = campaign.prospects.find(p => 
      p.prospectId.toString() === prospect._id.toString()
    );

    if (existingProspect) {
      return Response.json(
        { success: false, error: 'Prospect already exists in this campaign' },
        { status: 400 }
      );
    }

    // Add prospect to campaign
    campaign.prospects.push({
      prospectId: prospect._id,
      currentStep: 1,
      status: 'pending',
      nextSendAt: null
    });

    await campaign.save();

    return Response.json({
      success: true,
      message: 'Prospect added to campaign successfully',
      prospect
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
    
    const campaign = await Campaign.findById(id).populate('prospects.prospectId');
    
    if (!campaign) {
      return Response.json(
        { success: false, error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Extract prospect details
    const prospects = campaign.prospects.map(cp => ({
      ...cp.prospectId.toObject(),
      campaignStatus: cp.status,
      currentStep: cp.currentStep,
      nextSendAt: cp.nextSendAt
    }));

    return Response.json({
      success: true,
      prospects
    });

  } catch (error) {
    console.error('Fetch prospects error:', error);
    return Response.json(
      { success: false, error: 'Failed to fetch prospects' },
      { status: 500 }
    );
  }
}