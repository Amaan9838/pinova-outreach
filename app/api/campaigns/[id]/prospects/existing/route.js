import { NextResponse } from 'next/server';
import dbConnect from '../../../../../lib/mongodb.js';
import Prospect from '../../../../../models/Prospect.js';
import CampaignProspect from '../../../../../models/CampaignProspect.js';

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

    // Get existing CampaignProspect entries for this campaign
    const existingCampaignProspects = await CampaignProspect.find({
      campaign: id,
      prospect: { $in: prospects.map(p => p._id) }
    });

    const existingProspectIds = existingCampaignProspects.map(cp => cp.prospect._id.toString());
    
    // Filter out prospects that are already in the campaign
    const newProspectIds = prospects
      .filter(prospect => !existingProspectIds.includes(prospect._id.toString()))
      .map(prospect => prospect._id);

    if (newProspectIds.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'All selected prospects are already in this campaign'
      }, { status: 400 });
    }

    // Create new CampaignProspect entries
    const newCampaignProspects = newProspectIds.map(prospectId => ({
      campaign: id,
      prospect: prospectId,
      sequenceStep: 1,
      status: 'pending',
      addedAt: new Date()
    }));

    await CampaignProspect.insertMany(newCampaignProspects);

    // Update campaign prospect count
    const campaign = await Campaign.findById(id);
    if (campaign) {
      campaign.prospectCount = (campaign.prospectCount || 0) + newCampaignProspects.length;
      await campaign.save();
    }

    return NextResponse.json({
      success: true,
      message: `Successfully added ${newCampaignProspects.length} prospects to the campaign`,
      count: newCampaignProspects.length
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

    // Get all prospect IDs that are already in the campaign via CampaignProspect
    const existingCampaignProspects = await CampaignProspect.find({ campaign: id });
    const existingProspectIds = existingCampaignProspects.map(cp => cp.prospect);

    // Build the search query
    const searchQuery = {
      _id: { $nin: existingProspectIds }, // Not already in campaign
      status: { $in: ['active', 'pending'] }
    };

    if (search.trim()) {
      searchQuery.$or = [
        { email: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } }
      ];
    }

    // Find available prospects
    const availableProspects = await Prospect.find(searchQuery)
      .select('firstName lastName email company position createdAt')
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
