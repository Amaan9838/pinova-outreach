import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Campaign from '@/models/Campaign';
import Prospect from '@/models/Prospect';

export async function POST(request, { params }) {
  try {
    await dbConnect();
    const { id } = params;
    const { prospectIds } = await request.json();

    if (!prospectIds || !Array.isArray(prospectIds) || prospectIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No prospect IDs provided' },
        { status: 400 }
      );
    }

    // Find the campaign
    const campaign = await Campaign.findById(id);
    if (!campaign) {
      return NextResponse.json(
        { success: false, error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Find all valid prospects
    const prospects = await Prospect.find({
      _id: { $in: prospectIds },
      status: { $in: ['active', 'pending'] }
    });

    if (prospects.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid prospects found' },
        { status: 400 }
      );
    }

    // Get existing prospect IDs in the campaign
    const existingProspectIds = campaign.prospects.map(p => p.prospectId.toString());
    
    // Filter out prospects that are already in the campaign
    const newProspects = prospects
      .filter(prospect => !existingProspectIds.includes(prospect._id.toString()))
      .map(prospect => ({
        prospectId: prospect._id,
        currentStep: 1,
        status: 'pending',
        nextSendAt: null,
        addedAt: new Date()
      }));

    if (newProspects.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'All selected prospects are already in this campaign'
      }, { status: 400 });
    }

    // Add new prospects to the campaign
    campaign.prospects.push(...newProspects);
    await campaign.save();

    return NextResponse.json({
      success: true,
      message: `Successfully added ${newProspects.length} prospects to the campaign`,
      count: newProspects.length
    });

  } catch (error) {
    console.error('Error adding existing prospects:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request, { params }) {
  try {
    await dbConnect();
    const { id } = params;
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';

    // Find the campaign
    const campaign = await Campaign.findById(id);
    if (!campaign) {
      return NextResponse.json(
        { success: false, error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Get all prospect IDs that are already in the campaign
    const existingProspectIds = campaign.prospects.map(p => p.prospectId);

    // Build the search query
    const searchQuery = {
      _id: { $nin: existingProspectIds }, // Not already in campaign
      status: { $in: ['active', 'pending'] },
      $or: [
        { email: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } }
      ]
    };

    // Find available prospects
    const availableProspects = await Prospect.find(searchQuery)
      .sort({ createdAt: -1 })
      .limit(100);

    return NextResponse.json({
      success: true,
      prospects: availableProspects
    });

  } catch (error) {
    console.error('Error fetching available prospects:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
