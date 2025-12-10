import dbConnect from '../../../../../../lib/mongodb.js';
import Campaign from '../../../../../../models/Campaign.js';
import CampaignProspect from '../../../../../../models/CampaignProspect.js';
import Prospect from '../../../../../../models/Prospect.js';

export async function POST(request, { params }) {
  try {
    await dbConnect();
    
    const { id } = params;
    const { prospects: mappedProspects } = await request.json();
    
    const campaign = await Campaign.findById(id);
    if (!campaign) {
      return Response.json(
        { success: false, error: 'Campaign not found' },
        { status: 404 }
      );
    }

    if (!mappedProspects || !Array.isArray(mappedProspects)) {
      return Response.json(
        { success: false, error: 'Invalid prospects data' },
        { status: 400 }
      );
    }

    let imported = 0;
    const errors = [];

    for (let i = 0; i < mappedProspects.length; i++) {
      const prospectData = mappedProspects[i];
      
      // Validate required fields
      if (!prospectData.firstName || !prospectData.email) {
        errors.push(`Row ${i + 1}: Missing required fields (firstName, email)`);
        continue;
      }

      // Check for valid email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(prospectData.email)) {
        errors.push(`Row ${i + 1}: Invalid email format`);
        continue;
      }

      try {
        // Check if prospect already exists
        let prospect = await Prospect.findOne({ email: prospectData.email });
        
        if (!prospect) {
          // Create new prospect
          prospect = new Prospect({
            firstName: prospectData.firstName,
            lastName: prospectData.lastName || '',
            email: prospectData.email,
            company: prospectData.company || '',
            phone: prospectData.phone || '',
            website: prospectData.website || '',
            industry: prospectData.industry || '',
            position: prospectData.position || '',
            notes: prospectData.notes || '',
            status: 'active'
          });
          await prospect.save();
        }

        // Check if prospect is already in campaign using CampaignProspect model
        const existingCampaignProspect = await CampaignProspect.findOne({
          campaign: id,
          prospect: prospect._id
        });

        if (!existingCampaignProspect) {
          // Prepare personalized data if custom fields exist
          const personalizedData = {};
          if (prospectData.customSubject) {
            personalizedData.customSubject = prospectData.customSubject;
          }
          if (prospectData.customTemplate) {
            personalizedData.customTemplate = prospectData.customTemplate;
          }

          // Create new CampaignProspect entry
          const campaignProspect = new CampaignProspect({
            campaign: id,
            prospect: prospect._id,
            sequenceStep: 1,
            status: 'pending',
            personalizedData: Object.keys(personalizedData).length > 0 ? personalizedData : {},
            createdAt: new Date(),
            updatedAt: new Date()
          });
          await campaignProspect.save();
          imported++;
        }

      } catch (error) {
        errors.push(`Row ${i + 1}: ${error.message}`);
      }
    }

    // Update campaign prospect count
    if (imported > 0) {
      campaign.prospectCount = (campaign.prospectCount || 0) + imported;
      await campaign.save();
    }

    return Response.json({
      success: true,
      imported,
      total: mappedProspects.length,
      errors: errors.length > 0 ? errors : undefined,
      message: `Successfully imported ${imported} prospects${errors.length > 0 ? ` with ${errors.length} errors` : ''}`
    });

  } catch (error) {
    console.error('Import mapped prospects error:', error);
    return Response.json(
      { success: false, error: 'Failed to import prospects' },
      { status: 500 }
    );
  }
}
