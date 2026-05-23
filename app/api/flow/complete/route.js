import dbConnect from '../../../../lib/mongodb.js';
import GtdItem from '../../../../models/GtdItem.js';
import GtdMeta from '../../../../models/GtdMeta.js';

export const dynamic = 'force-dynamic';

/**
 * POST /api/flow/complete
 * Complete an action, routine, or waiting-for item.
 * Body: { id, nextAction?: "text for next action" }
 *
 * For routines: increments streak, doesn't delete the item.
 * For actions with projectId + nextAction: creates the follow-up action.
 */
export async function POST(request) {
  try {
    await dbConnect();
    const { id, nextAction } = await request.json();

    const item = await GtdItem.findById(id);
    if (!item) {
      return Response.json({ success: false, error: 'Item not found' }, { status: 404 });
    }

    const todayStr = new Date().toISOString().slice(0, 10);

    // Handle routine completion (Don't Break the Chain — Seinfeld method)
    if (item.type === 'routine') {
      const lastDate = item.recurrence?.lastCompletedDate;
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

      let newStreak = 1;
      if (lastDate === yesterday) {
        // Consecutive day — increment streak
        newStreak = (item.recurrence?.streak || 0) + 1;
      } else if (lastDate === todayStr) {
        // Already completed today
        return Response.json({ success: true, item, message: 'Already completed today' });
      }

      const bestStreak = Math.max(newStreak, item.recurrence?.bestStreak || 0);

      item.recurrence = {
        ...item.recurrence,
        streak: newStreak,
        bestStreak,
        lastCompletedDate: todayStr,
      };
      await item.save();

      return Response.json({ success: true, item, streak: newStreak, bestStreak });
    }

    // Handle regular action/waiting completion
    item.completedAt = new Date();
    item.isToday = false;
    item.type = 'done';
    await item.save();

    // If a next action is provided and item belongs to a project, create follow-up
    let newItem = null;
    if (nextAction && nextAction.trim()) {
      newItem = await GtdItem.create({
        text: nextAction.trim(),
        type: 'action',
        area: item.area,
        projectId: item.projectId,
        energy: item.energy,
      });
    }

    return Response.json({
      success: true,
      completed: item,
      newAction: newItem || undefined,
    });
  } catch (error) {
    console.error('POST /api/flow/complete error:', error);
    return Response.json({ success: false, error: 'Failed to complete item' }, { status: 500 });
  }
}

/**
 * PUT /api/flow/complete
 * Mark weekly review as complete.
 * Body: { reviewDate: "ISO string" }
 */
export async function PUT(request) {
  try {
    await dbConnect();
    const { reviewDate } = await request.json();

    await GtdMeta.findOneAndUpdate(
      { key: 'lastReviewDate' },
      { value: reviewDate || new Date().toISOString() },
      { upsert: true }
    );

    return Response.json({ success: true, reviewDate });
  } catch (error) {
    console.error('PUT /api/flow/complete error:', error);
    return Response.json({ success: false, error: 'Failed to save review date' }, { status: 500 });
  }
}
