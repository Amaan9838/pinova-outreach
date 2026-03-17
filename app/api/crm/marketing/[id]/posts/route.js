import dbConnect from '@/lib/mongodb';
import MarketingPost from '@/models/MarketingPost';
import MarketingCampaign from '@/models/MarketingCampaign';
import CrmActivity from '@/models/CrmActivity';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  try {
    await dbConnect();
    const posts = await MarketingPost.find({ campaignId: params.id }).sort({ createdAt: -1 }).lean();
    return Response.json({ success: true, posts }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Marketing posts GET error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    await dbConnect();
    const body = await request.json();
    const user = request.headers.get('x-crm-user') || 'Unknown';

    if (!body.title?.trim()) {
      return Response.json({ success: false, error: 'Post title is required' }, { status: 400 });
    }

    const campaign = await MarketingCampaign.findById(params.id);
    if (!campaign) {
      return Response.json({ success: false, error: 'Campaign not found' }, { status: 404 });
    }

    const post = await MarketingPost.create({
      campaignId: params.id,
      title: body.title.trim(),
      channel: body.channel || campaign.channels[0] || 'LinkedIn',
      type: body.type || 'Post',
      status: body.status || 'draft',
      scheduledDate: body.scheduledDate || null,
      publishedDate: body.status === 'published' ? (body.publishedDate || new Date()) : null,
      likes: body.likes || 0,
      comments: body.comments || 0,
      shares: body.shares || 0,
      createdBy: user,
    });

    await CrmActivity.create({
      user,
      action: `added post "${post.title}" to campaign "${campaign.name}"`,
      target: campaign.name,
      type: 'l',
    });

    return Response.json({ success: true, post });
  } catch (error) {
    console.error('Marketing posts POST error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    await dbConnect();
    const body = await request.json();

    if (!body.postId) {
      return Response.json({ success: false, error: 'postId is required' }, { status: 400 });
    }

    const updates = {};
    if (body.title) updates.title = body.title.trim();
    if (body.channel) updates.channel = body.channel;
    if (body.type) updates.type = body.type;
    if (body.status) {
      updates.status = body.status;
      if (body.status === 'published' && !body.publishedDate) {
        updates.publishedDate = new Date();
      }
    }
    if (body.scheduledDate !== undefined) updates.scheduledDate = body.scheduledDate;
    if (body.publishedDate !== undefined) updates.publishedDate = body.publishedDate;
    if (body.likes !== undefined) updates.likes = body.likes;
    if (body.comments !== undefined) updates.comments = body.comments;
    if (body.shares !== undefined) updates.shares = body.shares;

    const post = await MarketingPost.findByIdAndUpdate(body.postId, updates, { new: true });
    if (!post) {
      return Response.json({ success: false, error: 'Post not found' }, { status: 404 });
    }

    return Response.json({ success: true, post });
  } catch (error) {
    console.error('Marketing posts PATCH error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const postId = searchParams.get('postId');

    if (!postId) {
      return Response.json({ success: false, error: 'postId is required' }, { status: 400 });
    }

    const post = await MarketingPost.findByIdAndDelete(postId);
    if (!post) {
      return Response.json({ success: false, error: 'Post not found' }, { status: 404 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Marketing posts DELETE error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
