import dbConnect from '@/lib/mongodb';
import MarketingCampaign from '@/models/MarketingCampaign';
import MarketingPost from '@/models/MarketingPost';
import CrmActivity from '@/models/CrmActivity';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  try {
    await dbConnect();
    const campaign = await MarketingCampaign.findById(params.id).lean();
    if (!campaign) {
      return Response.json({ success: false, error: 'Campaign not found' }, { status: 404 });
    }

    const posts = await MarketingPost.find({ campaignId: params.id }).sort({ createdAt: -1 }).lean();

    // Compute stats
    const published = posts.filter(p => p.status === 'published').length;
    const scheduled = posts.filter(p => p.status === 'scheduled').length;
    const draft = posts.filter(p => p.status === 'draft').length;
    const totalLikes = posts.reduce((s, p) => s + (p.likes || 0), 0);
    const totalComments = posts.reduce((s, p) => s + (p.comments || 0), 0);
    const totalShares = posts.reduce((s, p) => s + (p.shares || 0), 0);

    return Response.json({
      success: true,
      campaign: {
        ...campaign,
        posts: posts.length,
        published,
        scheduled,
        draft,
        engagement: totalLikes + totalComments + totalShares,
        likes: totalLikes,
        comments: totalComments,
        shares: totalShares,
      },
      postsList: posts,
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Marketing [id] GET error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    await dbConnect();
    const body = await request.json();
    const user = request.headers.get('x-crm-user') || 'Unknown';

    const updates = {};
    if (body.name) updates.name = body.name.trim();
    if (body.channels) updates.channels = body.channels;
    if (body.owner) updates.owner = body.owner;
    if (body.status) updates.status = body.status;
    if (body.startDate !== undefined) updates.startDate = body.startDate;
    if (body.endDate !== undefined) updates.endDate = body.endDate;

    const campaign = await MarketingCampaign.findByIdAndUpdate(params.id, updates, { new: true });
    if (!campaign) {
      return Response.json({ success: false, error: 'Campaign not found' }, { status: 404 });
    }

    await CrmActivity.create({
      user,
      action: `updated marketing campaign "${campaign.name}"`,
      target: campaign.name,
      type: 'l',
    });

    return Response.json({ success: true, campaign });
  } catch (error) {
    console.error('Marketing [id] PATCH error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    await dbConnect();
    const user = request.headers.get('x-crm-user') || 'Unknown';

    const campaign = await MarketingCampaign.findById(params.id);
    if (!campaign) {
      return Response.json({ success: false, error: 'Campaign not found' }, { status: 404 });
    }

    // Delete all posts, then the campaign
    await MarketingPost.deleteMany({ campaignId: params.id });
    await MarketingCampaign.findByIdAndDelete(params.id);

    await CrmActivity.create({
      user,
      action: `deleted marketing campaign "${campaign.name}"`,
      target: campaign.name,
      type: 'l',
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('Marketing [id] DELETE error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
