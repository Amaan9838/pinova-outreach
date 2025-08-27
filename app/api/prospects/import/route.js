import dbConnect from '../../../../lib/mongodb.js';
import Prospect from '../../../../models/Prospect.js';

export async function POST(request) {
  try {
    await dbConnect();
    
    const formData = await request.formData();
    const file = formData.get('file');
    
    if (!file) {
      return Response.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // Read file content
    const fileContent = await file.text();
    const lines = fileContent.split('\n').filter(line => line.trim());
    
    // Better CSV parsing function
    const parseCSVRow = (row) => {
      const result = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < row.length; i++) {
        const char = row[i];
        
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };
    
    if (lines.length < 2) {
      return Response.json(
        { success: false, error: 'File must contain header row and at least one data row' },
        { status: 400 }
      );
    }

    // Parse CSV header
    const headers = parseCSVRow(lines[0]).map(h => h.trim().toLowerCase().replace(/"/g, ''));
    console.log('CSV Headers found:', headers);
    
    // Required fields mapping
    const fieldMap = {
      'first name': 'firstName',
      'firstname': 'firstName', 
      'first_name': 'firstName',
      'last name': 'lastName',
      'lastname': 'lastName',
      'last_name': 'lastName',
      'email': 'email',
      'email address': 'email',
      'e-mail': 'email',
      'emails': 'email',
      'company': 'company',
      'city': 'city',
      'neighborhood': 'neighborhood',
      'listing price': 'listingPrice',
      'listingprice': 'listingPrice',
      'listing_price': 'listingPrice',
      'price': 'listingPrice',
      'instagram': 'instagramUrl',
      'instagram url': 'instagramUrl',
      'linkedin': 'linkedinUrl',
      'linkedin url': 'linkedinUrl',
      'website': 'websiteUrl',
      'website url': 'websiteUrl',
      'tags': 'tags'
    };

    // Find email column (required)
    const emailIndex = headers.findIndex(h => 
      ['email', 'email address', 'e-mail', 'emails'].includes(h)
    );
    
    console.log('Email column index:', emailIndex, 'Looking for:', ['email', 'email address', 'e-mail', 'emails']);
    
    if (emailIndex === -1) {
      return Response.json(
        { success: false, error: `Email column is required. Found headers: ${headers.join(', ')}` },
        { status: 400 }
      );
    }

    const results = {
      imported: 0,
      skipped: 0,
      errors: []
    };

    // Process each row
    for (let i = 1; i < lines.length; i++) {
      try {
        const row = parseCSVRow(lines[i]).map(cell => cell.trim().replace(/"/g, ''));
        
        if (row.length !== headers.length) {
          results.errors.push(`Row ${i + 1}: Column count mismatch - expected ${headers.length}, got ${row.length}`);
          results.skipped++;
          continue;
        }

        // Build prospect object
        const prospectData = {
          status: 'active'
        };

        // Map CSV columns to prospect fields
        headers.forEach((header, index) => {
          const field = fieldMap[header];
          if (field && row[index]) {
            if (field === 'tags') {
              // Split tags by semicolon or comma
              prospectData[field] = row[index].split(/[;,]/).map(tag => tag.trim()).filter(tag => tag);
            } else {
              prospectData[field] = row[index];
            }
          }
        });

        console.log(`Row ${i + 1} mapped data:`, prospectData);

        // Validate required fields
        if (!prospectData.email) {
          results.errors.push(`Row ${i + 1}: Email is required`);
          results.skipped++;
          continue;
        }

        // Set default firstName if missing (model requires it)
        if (!prospectData.firstName) {
          prospectData.firstName = prospectData.email.split('@')[0]; // Use email prefix as fallback
        }

        // Check for duplicate email
        const existingProspect = await Prospect.findOne({ email: prospectData.email });
        if (existingProspect) {
          results.errors.push(`Row ${i + 1}: Email ${prospectData.email} already exists`);
          results.skipped++;
          continue;
        }

        // Create prospect
        const prospect = new Prospect(prospectData);
        await prospect.save();
        results.imported++;

      } catch (error) {
        results.errors.push(`Row ${i + 1}: ${error.message}`);
        results.skipped++;
      }
    }

    return Response.json({
      success: true,
      results: {
        total: lines.length - 1,
        imported: results.imported,
        skipped: results.skipped,
        errors: results.errors.slice(0, 10) // Limit to first 10 errors
      }
    });

  } catch (error) {
    console.error('Import prospects error:', error);
    return Response.json(
      { success: false, error: 'Failed to import prospects' },
      { status: 500 }
    );
  }
}

// GET endpoint to download sample CSV template
export async function GET() {
  const csvTemplate = `first_name,last_name,email,company,city,neighborhood,listing_price,instagram_url,linkedin_url,website_url,tags
John,Doe,john@example.com,Acme Corp,Beverly Hills,West Hollywood,$2.5M,https://instagram.com/johndoe,https://linkedin.com/in/johndoe,https://johndoe.com,"luxury;seller;beverly-hills"
Jane,Smith,jane@company.com,Tech Inc,Malibu,Point Dume,$3.2M,,,https://janesmith.com,"tech;buyer"`;

  return new Response(csvTemplate, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="prospect-template.csv"'
    }
  });
}
