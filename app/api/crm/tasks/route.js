import dbConnect from '@/lib/mongodb';
import Task from '@/models/Task';
import CrmActivity from '@/models/CrmActivity';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const owner = searchParams.get('owner') || '';
    const status = searchParams.get('status') || '';
    const search = searchParams.get('search') || '';

    const filter = {};
    if (owner) filter.owner = owner;
    if (status) filter.status = status;
    if (search) filter.title = { $regex: search, $options: 'i' };

    const tasks = await Task.find(filter).sort({ createdAt: -1 }).lean();
    return Response.json({ success: true, tasks });
  } catch (error) {
    console.error('Tasks GET error:', error);
    return Response.json({ success: false, error: 'Failed to fetch tasks' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await dbConnect();
    const body = await req.json();
    const user = req.headers.get('x-crm-user') || 'Unknown';
    const { title, dueDate } = body;

    if (!title?.trim()) {
      return Response.json({ success: false, error: 'Title required' }, { status: 400 });
    }

    const task = await Task.create({
      title: title.trim(),
      owner: user,
      status: 'pending',
      dueDate: dueDate || null,
      createdBy: user,
    });

    // Log activity
    await CrmActivity.create({
      user,
      action: 'created task',
      target: title.trim(),
      type: 't',
    });

    return Response.json({ success: true, task });
  } catch (error) {
    console.error('Tasks POST error:', error);
    return Response.json({ success: false, error: 'Failed to create task' }, { status: 500 });
  }
}
