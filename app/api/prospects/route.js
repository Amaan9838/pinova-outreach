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
    
    if (!data.email || !data.firstName) {
      return Response.json(
        { success: false, error: 'Email and first name are required' },
        { status: 400 }
      );
    }

    if (!data.website && !data.linkedin && !data.instagram && !data.facebook && !data.zillow) {
      return Response.json(
        { success: false, error: 'At least one social/web link (Website, LinkedIn, Instagram, Facebook, or Zillow) is required' },
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

    // Process additional emails
    let additionalEmails = [];
    if (data.additionalEmails && Array.isArray(data.additionalEmails)) {
      additionalEmails = data.additionalEmails;
    }

    // Process custom fields
    let customFields = [];
    if (data.customFields && Array.isArray(data.customFields)) {
      customFields = data.customFields.filter(field => 
        field && field.name && field.name.trim() !== ''
      );
    }

    // Process tags
    let tags = [];
    if (data.tags) {
      if (Array.isArray(data.tags)) {
        tags = data.tags;
      } else if (typeof data.tags === 'string') {
        tags = data.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
      }
    }

    // Create prospect
    const prospect = new Prospect({
      email: data.email,
      additionalEmails,
      firstName: data.firstName,
      lastName: data.lastName || '',
      company: data.company || '',
      phone: data.phone || '',
      website: data.website || '',
      industry: data.industry || '',
      position: data.position || '',
      notes: data.notes || '',
      instagram: data.instagram || '',
      linkedin: data.linkedin || '',
      facebook: data.facebook || '',
      zillow: data.zillow || '',
      personalizationNote: data.personalizationNote || '',
      customFields,
      tags,
      source: data.source || 'manual'
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
