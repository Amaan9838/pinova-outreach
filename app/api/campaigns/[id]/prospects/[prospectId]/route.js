import dbConnect from '../../../../../../lib/mongodb.js';
import CampaignProspect from '../../../../../../models/CampaignProspect.js';
import Prospect from '../../../../../../models/Prospect.js';
import Campaign from '../../../../../../models/Campaign.js';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  try {
    await dbConnect();
    const { id, prospectId } = params;

    const [prospect, campaignProspect] = await Promise.all([
      Prospect.findById(prospectId).lean(),
      CampaignProspect.findOne({ campaign: id, prospect: prospectId }).lean()
    ]);

    if (!prospect || !campaignProspect) {
      return NextResponse.json({ success: false, error: 'Lead not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      lead: {
        ...prospect,
        status:       campaignProspect.status,
        v2State:      campaignProspect.v2State,
        emailSteps:   campaignProspect.emailSteps || [],
        customSubject:campaignProspect.customSubject,
        customBody:   campaignProspect.customBody,
        attemptCount: campaignProspect.attemptCount,
        nextActionAt: campaignProspect.nextActionAt,
        repliedAt:    campaignProspect.repliedAt,
        replyCategory:campaignProspect.replyCategory
      }
    });
  } catch (error) {
    console.error('GET lead error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    await dbConnect();

    const { id, prospectId } = params;
    const body = await request.json();

    // Find the prospect
    const prospect = await Prospect.findById(prospectId);
    if (!prospect) {
      return NextResponse.json(
        { success: false, error: 'Prospect not found' },
        { status: 404 }
      );
    }

    // Update prospect contact fields
    const updateData = {
      firstName: body.firstName?.trim() || prospect.firstName,
      lastName: body.lastName?.trim() || prospect.lastName,
      email: body.email?.toLowerCase().trim() || prospect.email,
      company: body.company?.trim() || prospect.company,
      phone: body.phone?.trim() || prospect.phone,
      website: body.website?.trim() || prospect.website,
      industry: body.industry?.trim() || prospect.industry,
      position: body.position?.trim() || prospect.position,
      notes: body.notes?.trim() || prospect.notes,
      instagram: body.instagram?.trim() || prospect.instagram,
      linkedin: body.linkedin?.trim() || prospect.linkedin,
      personalizationNote: body.personalizationNote?.trim() || prospect.personalizationNote,
    };

    if (body.additionalEmails && Array.isArray(body.additionalEmails)) {
      updateData.additionalEmails = body.additionalEmails;
    }
    if (body.customFields && Array.isArray(body.customFields)) {
      updateData.customFields = body.customFields;
    }

    const updatedProspect = await Prospect.findByIdAndUpdate(
      prospectId,
      updateData,
      { new: true, runValidators: true }
    );

    // Also update emailSteps on CampaignProspect if provided
    let updatedSteps = null;
    if (body.emailSteps !== undefined) {
      const cp = await CampaignProspect.findOneAndUpdate(
        { campaign: id, prospect: prospectId },
        { $set: { emailSteps: body.emailSteps } },
        { new: true }
      );
      updatedSteps = cp?.emailSteps || [];
    }

    return NextResponse.json({
      success: true,
      message: 'Lead updated successfully',
      prospect: updatedProspect,
      ...(updatedSteps !== null && { emailSteps: updatedSteps })
    });

  } catch (error) {
    console.error('Update prospect error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update prospect' },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    await dbConnect();
    
    const { id, prospectId } = params;
    
    // Find and remove CampaignProspect entry
    const deletedCampaignProspect = await CampaignProspect.findOneAndDelete({
      campaign: id,
      prospect: prospectId
    });

    if (!deletedCampaignProspect) {
      return NextResponse.json(
        { success: false, error: 'Prospect not found in campaign' },
        { status: 404 }
      );
    }

    // Update campaign prospect count
    const campaign = await Campaign.findById(id);
    if (campaign) {
      campaign.prospectCount = Math.max(0, (campaign.prospectCount || 0) - 1);
      await campaign.save();
    }

    console.log(`Removed CampaignProspect: campaign=${id}, prospect=${prospectId}`);

    return NextResponse.json({
      success: true,
      message: 'Prospect removed from campaign successfully',
      deletedId: deletedCampaignProspect._id
    });

  } catch (error) {
    console.error('Delete prospect from campaign error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to remove prospect from campaign' },
      { status: 500 }
    );
  }
}