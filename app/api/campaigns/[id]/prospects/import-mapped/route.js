import dbConnect from '../../../../../../lib/mongodb.js';
import Campaign from '../../../../../../models/Campaign.js';
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

        // Check if prospect is already in campaign
        const existingProspect = campaign.prospects.find(p => 
          p.prospectId.toString() === prospect._id.toString()
        );

        if (!existingProspect) {
          // Add prospect to campaign
          campaign.prospects.push({
            prospectId: prospect._id,
            currentStep: 1,
            status: 'pending',
            nextSendAt: null
          });
          imported++;
        }

      } catch (error) {
        errors.push(`Row ${i + 1}: ${error.message}`);
      }
    }

    // Save campaign with new prospects
    if (imported > 0) {
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
