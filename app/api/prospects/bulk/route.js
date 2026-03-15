import dbConnect from '../../../../lib/mongodb.js';
import Prospect from '../../../../models/Prospect.js';

export async function POST(request) {
  try {
    await dbConnect();
    
    const { prospects } = await request.json();
    
    if (!prospects || !Array.isArray(prospects) || prospects.length === 0) {
      return Response.json(
        { success: false, error: 'No prospects data provided' },
        { status: 400 }
      );
    }

    const results = {
      imported: 0,
      skipped: 0,
      errors: []
    };

    for (const prospectData of prospects) {
      try {
        // Validate required fields
        if (!prospectData.email || !prospectData.firstName) {
          results.errors.push({
            email: prospectData.email || 'unknown',
            error: 'Email and first name are required'
          });
          results.skipped++;
          continue;
        }

        // Validate at least one link
        if (!prospectData.website && !prospectData.linkedin && !prospectData.instagram && !prospectData.facebook && !prospectData.zillow) {
          results.errors.push({
            email: prospectData.email || 'unknown',
            error: 'At least one social/web link (Website, LinkedIn, Instagram, Facebook, or Zillow) is required.'
          });
          results.skipped++;
          continue;
        }

        // Check if prospect already exists
        const existingProspect = await Prospect.findOne({ email: prospectData.email });
        if (existingProspect) {
          results.errors.push({
            email: prospectData.email,
            error: 'Prospect already exists'
          });
          results.skipped++;
          continue;
        }

        // Process additional emails
        let additionalEmails = [];
        if (prospectData.additionalEmails && Array.isArray(prospectData.additionalEmails)) {
          additionalEmails = prospectData.additionalEmails;
        }

        // Process custom fields
        let customFields = [];
        if (prospectData.customFields && Array.isArray(prospectData.customFields)) {
          customFields = prospectData.customFields.filter(field => 
            field && field.name && field.name.trim() !== ''
          );
        }

        // Process tags
        let tags = [];
        if (prospectData.tags) {
          if (Array.isArray(prospectData.tags)) {
            tags = prospectData.tags;
          } else if (typeof prospectData.tags === 'string') {
            tags = prospectData.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
          }
        }

        const sanitizeUrl = (url) => {
          if (!url || typeof url !== 'string') return url;
          url = url.trim();
          if (url === '') return url;
          return /^https?:\/\//i.test(url) ? url : `https://${url}`;
        };

        // Create prospect
        const prospect = new Prospect({
          email: prospectData.email,
          additionalEmails,
          firstName: prospectData.firstName,
          lastName: prospectData.lastName || '',
          company: prospectData.company || '',
          phone: prospectData.phone || '',
          website: sanitizeUrl(prospectData.website || ''),
          industry: prospectData.industry || '',
          position: prospectData.position || '',
          notes: prospectData.notes || '',
          instagram: sanitizeUrl(prospectData.instagram || ''),
          linkedin: sanitizeUrl(prospectData.linkedin || ''),
          facebook: sanitizeUrl(prospectData.facebook || ''),
          zillow: sanitizeUrl(prospectData.zillow || ''),
          personalizationNote: prospectData.personalizationNote || '',
          customFields,
          tags,
          source: prospectData.source || 'csv_import',
          importMetadata: prospectData.importMetadata || {
            importId: `bulk_${Date.now()}`,
            importDate: new Date(),
            originalData: prospectData
          }
        });

        await prospect.save();
        results.imported++;

      } catch (error) {
        console.error('Error creating prospect:', error);
        results.errors.push({
          email: prospectData.email || 'unknown',
          error: error.message
        });
        results.skipped++;
      }
    }

    return Response.json({
      success: true,
      imported: results.imported,
      skipped: results.skipped,
      errors: results.errors,
      message: `Successfully imported ${results.imported} prospects, skipped ${results.skipped}`
    });

  } catch (error) {
    console.error('Bulk import error:', error);
    return Response.json(
      { success: false, error: 'Failed to import prospects' },
      { status: 500 }
    );
  }
}
