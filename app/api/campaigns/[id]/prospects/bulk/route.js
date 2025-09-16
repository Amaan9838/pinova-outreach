import dbConnect from '../../../../../lib/mongodb.js';
import Prospect from '../../../../../models/Prospect.js';
import CampaignProspect from '../../../../../models/CampaignProspect.js';
import Campaign from '../../../../../models/Campaign.js';

export async function POST(request, { params }) {
  try {
    await dbConnect();
    
    const { id } = params;
    const { prospects } = await request.json();

    if (!prospects || !Array.isArray(prospects) || prospects.length === 0) {
      return Response.json(
        { success: false, error: 'No prospects data provided' },
        { status: 400 }
      );
    }

    const campaign = await Campaign.findById(id);
    if (!campaign) {
      return Response.json(
        { success: false, error: 'Campaign not found' },
        { status: 404 }
      );
    }

    const importedCount = 0;
    const errors = [];
    const createdProspects = [];
    const createdCampaignProspects = [];

    for (const prospectData of prospects) {
      try {
        // Validate required fields
        if (!prospectData.email || !prospectData.firstName) {
          errors.push(`Missing required fields for ${prospectData.email || 'unknown'}`);
          continue;
        }

        // Check if prospect already exists
        let prospect = await Prospect.findOne({ 
          email: prospectData.email.toLowerCase().trim() 
        });

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
            customFields: prospectData.customFields || [],
            tags: prospectData.tags || [],
            status: 'active',
            source: 'bulk_import'
          });

          await prospect.save();
          createdProspects.push(prospect._id);
        }

        // Check if already in campaign
        const existingCampaignProspect = await CampaignProspect.findOne({
          campaign: id,
          prospect: prospect._id
        });

        if (!existingCampaignProspect) {
          // Create CampaignProspect
          const campaignProspect = new CampaignProspect({
            campaign: id,
            prospect: prospect._id,
            sequenceStep: 1,
            status: 'pending',
            nextSendAt: undefined // Will be scheduled later
          });

          await campaignProspect.save();
          createdCampaignProspects.push(campaignProspect._id);
        }

        importedCount++;

      } catch (prospectError) {
        console.error(`Error processing bulk prospect ${prospectData.email}:`, prospectError);
        errors.push(`Error processing ${prospectData.email}: ${prospectError.message}`);
      }
    }

    // Update campaign prospect count
    campaign.prospectCount = (campaign.prospectCount || 0) + createdCampaignProspects.length;
    await campaign.save();

    const result = {
      success: true,
      imported: importedCount,
      createdProspects: createdProspects.length,
      createdCampaignProspects: createdCampaignProspects.length,
      errors: errors.length,
      errorDetails: errors
    };

    if (errors.length > 0) {
      console.warn('Bulk import errors:', errors);
    }

    return Response.json(result);

  } catch (error) {
    console.error('Bulk import error:', error);
    return Response.json(
      { success: false, error: 'Failed to import prospects' },
      { status: 500 }
    );
  }
}