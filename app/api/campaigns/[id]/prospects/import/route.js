import dbConnect from '../../../../../../lib/mongodb.js';
import Campaign from '../../../../../../models/Campaign.js';
import CampaignProspect from '../../../../../../models/CampaignProspect.js';
import Prospect from '../../../../../../models/Prospect.js';

export async function POST(request, { params }) {
  try {
    await dbConnect();
    
    const { id } = params;
    const { csvData } = await request.json();
    
    const campaign = await Campaign.findById(id);
    if (!campaign) {
      return Response.json(
        { success: false, error: 'Campaign not found' },
        { status: 404 }
      );
    }

    if (!csvData || !csvData.trim()) {
      return Response.json(
        { success: false, error: 'CSV data is required' },
        { status: 400 }
      );
    }

    // Parse CSV data
    const lines = csvData.trim().split('\n');
    if (lines.length < 2) {
      return Response.json(
        { success: false, error: 'CSV must have at least a header row and one data row' },
        { status: 400 }
      );
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const dataLines = lines.slice(1);

    // Validate required headers
    const requiredHeaders = ['firstname', 'lastname', 'email'];
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
    
    if (missingHeaders.length > 0) {
      return Response.json(
        { success: false, error: `Missing required headers: ${missingHeaders.join(', ')}` },
        { status: 400 }
      );
    }

    const prospects = [];
    const errors = [];
    let imported = 0;

    for (let i = 0; i < dataLines.length; i++) {
      const line = dataLines[i];
      if (!line.trim()) continue;

      const values = line.split(',').map(v => v.trim());
      
      if (values.length !== headers.length) {
        errors.push(`Row ${i + 2}: Column count mismatch`);
        continue;
      }

      const prospectData = {};
      headers.forEach((header, index) => {
        prospectData[header] = values[index] || '';
      });

      // Validate required fields
      if (!prospectData.firstname || !prospectData.lastname || !prospectData.email) {
        errors.push(`Row ${i + 2}: Missing required fields (firstName, lastName, email)`);
        continue;
      }

      // Check for valid email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(prospectData.email)) {
        errors.push(`Row ${i + 2}: Invalid email format`);
        continue;
      }

      try {
        // Check if prospect already exists
        let prospect = await Prospect.findOne({ email: prospectData.email });
        
        if (!prospect) {
          // Create new prospect
          prospect = new Prospect({
            firstName: prospectData.firstname,
            lastName: prospectData.lastname,
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
          // Create new CampaignProspect entry
          const personalizedData = {};
          if (prospectData.customsubject) personalizedData.customSubject = prospectData.customsubject;
          if (prospectData.customtemplate) personalizedData.customTemplate = prospectData.customtemplate;
          
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

        prospects.push(prospect);

      } catch (error) {
        errors.push(`Row ${i + 2}: ${error.message}`);
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
      total: dataLines.length,
      errors: errors.length > 0 ? errors : undefined,
      message: `Successfully imported ${imported} prospects${errors.length > 0 ? ` with ${errors.length} errors` : ''}`
    });

  } catch (error) {
    console.error('Import prospects error:', error);
    return Response.json(
      { success: false, error: 'Failed to import prospects' },
      { status: 500 }
    );
  }
}
