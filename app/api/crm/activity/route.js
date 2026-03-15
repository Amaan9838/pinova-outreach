import dbConnect from '@/lib/mongodb';
import CrmActivity from '@/models/CrmActivity';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await dbConnect();
    const activities = await CrmActivity.find()
      .sort({ timestamp: -1 })
      .limit(100)
      .lean();

    const formatted = activities.map(a => ({
      _id: a._id,
      user: a.user,
      action: a.action,
      target: a.target,
      type: a.type,
      time: new Date(a.timestamp).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }),
      date: new Date(a.timestamp).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      timestamp: a.timestamp,
    }));

    return Response.json({ success: true, activities: formatted });
  } catch (error) {
    console.error('Activity GET error:', error);
    return Response.json({ success: false, error: 'Failed to fetch activities' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await dbConnect();
    const body = await req.json();
    const user = req.headers.get('x-crm-user') || body.user || 'Unknown';
    const { action, target, type } = body;

    if (!action?.trim()) {
      return Response.json({ success: false, error: 'Action required' }, { status: 400 });
    }

    const activity = await CrmActivity.create({
      user,
      action: action.trim(),
      target: target || '',
      type: type || 'l',
    });

    return Response.json({ success: true, activity });
  } catch (error) {
    console.error('Activity POST error:', error);
    return Response.json({ success: false, error: 'Failed to log activity' }, { status: 500 });
  }
}
