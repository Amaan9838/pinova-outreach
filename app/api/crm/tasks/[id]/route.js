import dbConnect from '@/lib/mongodb';
import Task from '@/models/Task';
import CrmActivity from '@/models/CrmActivity';

export const dynamic = 'force-dynamic';

export async function PATCH(req, { params }) {
  try {
    await dbConnect();
    const { id } = await params;
    const body = await req.json();
    const user = req.headers.get('x-crm-user') || 'Unknown';

    const allowed = ['status', 'title', 'dueDate', 'owner'];
    const update = {};
    for (const key of allowed) {
      if (body[key] !== undefined) update[key] = body[key];
    }

    const task = await Task.findByIdAndUpdate(id, update, { new: true }).lean();
    if (!task) {
      return Response.json({ success: false, error: 'Task not found' }, { status: 404 });
    }

    // Log activity
    if (update.status) {
      await CrmActivity.create({
        user,
        action: update.status === 'done' ? 'completed task' : 'reopened task',
        target: task.title,
        type: 't',
      });
    }

    return Response.json({ success: true, task });
  } catch (error) {
    console.error('Task PATCH error:', error);
    return Response.json({ success: false, error: 'Failed to update task' }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    await dbConnect();
    const { id } = await params;
    const user = req.headers.get('x-crm-user') || 'Unknown';

    const task = await Task.findByIdAndDelete(id).lean();
    if (!task) {
      return Response.json({ success: false, error: 'Task not found' }, { status: 404 });
    }

    await CrmActivity.create({
      user,
      action: 'deleted task',
      target: task.title,
      type: 't',
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('Task DELETE error:', error);
    return Response.json({ success: false, error: 'Failed to delete task' }, { status: 500 });
  }
}
