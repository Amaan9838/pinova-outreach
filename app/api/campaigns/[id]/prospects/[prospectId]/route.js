import dbConnect from '@/lib/mongodb';
import Campaign from '@/models/Campaign';
import { NextResponse } from 'next/server';

export async function DELETE(request, { params }) {
  try {
    await dbConnect();
    
    const { id, prospectId } = params;
    
    const campaign = await Campaign.findById(id);
    if (!campaign) {
      return NextResponse.json(
        { success: false, error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Find and remove prospect from campaign
    const prospectIndex = campaign.prospects.findIndex(p => 
      p.prospectId && p.prospectId.toString() === prospectId
    );

    if (prospectIndex === -1) {
      return NextResponse.json(
        { success: false, error: 'Prospect not found in campaign' },
        { status: 404 }
      );
    }

    // Remove prospect from campaign
    campaign.prospects.splice(prospectIndex, 1);
    await campaign.save();

    return NextResponse.json({
      success: true,
      message: 'Prospect removed from campaign successfully'
    });

  } catch (error) {
    console.error('Delete prospect from campaign error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to remove prospect from campaign' },
      { status: 500 }
    );
  }
}