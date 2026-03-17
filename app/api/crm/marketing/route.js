import dbConnect from '@/lib/mongodb';
import MarketingCampaign from '@/models/MarketingCampaign';
import MarketingPost from '@/models/MarketingPost';
import CrmActivity from '@/models/CrmActivity';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);

    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const channel = searchParams.get('channel') || '';
    const owner = searchParams.get('owner') || '';

    // Build filter
    const filter = {};
    if (status) filter.status = status;
    if (owner) filter.owner = owner;
    if (search) {
      filter.name = { $regex: search, $options: 'i' };
    }
    if (channel) {
      filter.channels = channel;
    }

    const campaigns = await MarketingCampaign.find(filter).sort({ createdAt: -1 }).lean();
    const campaignIds = campaigns.map(c => c._id);

    // Aggregate post stats per campaign
    const postStats = await MarketingPost.aggregate([
      { $match: { campaignId: { $in: campaignIds } } },
      {
        $group: {
          _id: '$campaignId',
          totalPosts: { $sum: 1 },
          published: { $sum: { $cond: [{ $eq: ['$status', 'published'] }, 1, 0] } },
          scheduled: { $sum: { $cond: [{ $eq: ['$status', 'scheduled'] }, 1, 0] } },
          draft: { $sum: { $cond: [{ $eq: ['$status', 'draft'] }, 1, 0] } },
          totalLikes: { $sum: '$likes' },
          totalComments: { $sum: '$comments' },
          totalShares: { $sum: '$shares' },
        },
      },
    ]);

    const statsMap = {};
    postStats.forEach(s => {
      statsMap[s._id.toString()] = s;
    });

    // Enrich campaigns with post stats
    const enriched = campaigns.map(c => {
      const ps = statsMap[c._id.toString()] || { totalPosts: 0, published: 0, scheduled: 0, draft: 0, totalLikes: 0, totalComments: 0, totalShares: 0 };
      return {
        ...c,
        posts: ps.totalPosts,
        published: ps.published,
        scheduled: ps.scheduled,
        draft: ps.draft,
        engagement: ps.totalLikes + ps.totalComments + ps.totalShares,
        likes: ps.totalLikes,
        comments: ps.totalComments,
        shares: ps.totalShares,
      };
    });

    // Global metrics
    const allPostStats = await MarketingPost.aggregate([
      {
        $group: {
          _id: null,
          totalScheduled: { $sum: { $cond: [{ $eq: ['$status', 'scheduled'] }, 1, 0] } },
          totalPublished: { $sum: { $cond: [{ $eq: ['$status', 'published'] }, 1, 0] } },
          totalLikes: { $sum: '$likes' },
          totalComments: { $sum: '$comments' },
          totalShares: { $sum: '$shares' },
        },
      },
    ]);

    const globalStats = allPostStats[0] || { totalScheduled: 0, totalPublished: 0, totalLikes: 0, totalComments: 0, totalShares: 0 };
    const activeCampaigns = await MarketingCampaign.countDocuments({ status: 'active' });

    // Unique owners for filter dropdown
    const owners = await MarketingCampaign.distinct('owner');

    return Response.json({
      success: true,
      campaigns: enriched,
      metrics: {
        activeCampaigns,
        postsScheduled: globalStats.totalScheduled,
        postsPublished: globalStats.totalPublished,
        totalEngagement: globalStats.totalLikes + globalStats.totalComments + globalStats.totalShares,
      },
      owners: owners.filter(Boolean),
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Marketing GET error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await dbConnect();
    const body = await request.json();
    const user = request.headers.get('x-crm-user') || 'Unknown';

    if (!body.name?.trim()) {
      return Response.json({ success: false, error: 'Campaign name is required' }, { status: 400 });
    }
    if (!body.channels?.length) {
      return Response.json({ success: false, error: 'At least one channel is required' }, { status: 400 });
    }

    const campaign = await MarketingCampaign.create({
      name: body.name.trim(),
      channels: body.channels,
      owner: body.owner || user,
      status: body.status || 'scheduled',
      startDate: body.startDate || null,
      endDate: body.endDate || null,
      createdBy: user,
    });

    await CrmActivity.create({
      user,
      action: `created marketing campaign "${campaign.name}"`,
      target: campaign.name,
      type: 'l',
    });

    return Response.json({ success: true, campaign });
  } catch (error) {
    console.error('Marketing POST error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
