import dbConnect from '../../../lib/mongodb.js';
import Prospect from '../../../models/Prospect.js';

export async function GET() {
  try {
    await dbConnect();
    
    const prospects = await Prospect.find().sort({ createdAt: -1 });
    
    return Response.json({
      success: true,
      prospects
    });

  } catch (error) {
    console.error('Get prospects error:', error);
    return Response.json(
      { success: false, error: 'Failed to fetch prospects' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    await dbConnect();
    
    const data = await request.json();
    
    // Validate required fields
    if (!data.email || !data.firstName) {
      return Response.json(
        { success: false, error: 'Email and first name are required' },
        { status: 400 }
      );
    }

    // Check if prospect already exists
    const existingProspect = await Prospect.findOne({ email: data.email });
    if (existingProspect) {
      return Response.json(
        { success: false, error: 'Prospect with this email already exists' },
        { status: 400 }
      );
    }

    // Create prospect
    const prospect = new Prospect({
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      company: data.company,
      city: data.city,
      neighborhood: data.neighborhood,
      listingPrice: data.listingPrice,
      instagramUrl: data.instagramUrl,
      linkedinUrl: data.linkedinUrl,
      websiteUrl: data.websiteUrl,
      sourceUrl: data.sourceUrl,
      tags: data.tags || [],
      customFields: data.customFields || new Map()
    });

    await prospect.save();

    return Response.json({
      success: true,
      prospect
    });

  } catch (error) {
    console.error('Create prospect error:', error);
    return Response.json(
      { success: false, error: 'Failed to create prospect' },
      { status: 500 }
    );
  }
}
