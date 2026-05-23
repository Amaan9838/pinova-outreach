import dbConnect from '../../../../lib/mongodb.js';
import GtdItem from '../../../../models/GtdItem.js';
import GtdMeta from '../../../../models/GtdMeta.js';

export const dynamic = 'force-dynamic';

/**
 * GET /api/flow/state
 * Full GTD system state — used by MCP and dashboard.
 * Returns structured overview: inbox count, projects, waiting-fors, today's actions, routines, stats.
 */
export async function GET() {
  try {
    await dbConnect();

    const allItems = await GtdItem.find({}).lean();
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const weekAgo = new Date(now.getTime() - 7 * 86400000);

    // Categorize
    const inbox = allItems.filter(i => i.type === 'inbox');
    const actions = allItems.filter(i => i.type === 'action' && !i.completedAt);
    const projects = allItems.filter(i => i.type === 'project' && !i.completedAt);
    const waiting = allItems.filter(i => i.type === 'waiting' && !i.completedAt);
    const someday = allItems.filter(i => i.type === 'someday' && !i.completedAt);
    const routines = allItems.filter(i => i.type === 'routine');
    const doneThisWeek = allItems.filter(i => i.completedAt && new Date(i.completedAt) > weekAgo);

    // Today's actions
    const todayActions = actions
      .filter(i => i.isToday)
      .sort((a, b) => {
        const order = { low: 0, medium: 1, high: 2 };
        return (order[a.energy] || 1) - (order[b.energy] || 1);
      });

    // Projects with next action status
    const projectSummaries = projects.map(p => {
      const nextAction = actions.find(a => a.projectId === (p._id?.toString() || p.id));
      return {
        id: p._id?.toString() || p.id,
        name: p.text,
        area: p.area,
        nextAction: nextAction?.text || null,
        isStuck: !nextAction,
      };
    });

    // Waiting for with days
    const waitingSummaries = waiting.map(w => {
      const days = w.waitingSince ? Math.floor((Date.now() - new Date(w.waitingSince).getTime()) / 86400000) : 0;
      return {
        id: w._id?.toString() || w.id,
        text: w.text,
        waitingOn: w.waitingOn,
        area: w.area,
        daysSince: days,
      };
    });

    // Routines with today's completion status
    const routineSummaries = routines.map(r => ({
      id: r._id?.toString() || r.id,
      text: r.text,
      area: r.area,
      energy: r.energy,
      frequency: r.recurrence?.frequency,
      streak: r.recurrence?.streak || 0,
      bestStreak: r.recurrence?.bestStreak || 0,
      completedToday: r.recurrence?.lastCompletedDate === todayStr,
    }));

    // Meta
    const reviewMeta = await GtdMeta.findOne({ key: 'lastReviewDate' }).lean();
    const lastReviewDate = reviewMeta?.value || null;
    const daysSinceReview = lastReviewDate
      ? Math.floor((Date.now() - new Date(lastReviewDate).getTime()) / 86400000)
      : null;

    return Response.json({
      success: true,
      state: {
        inboxCount: inbox.length,
        todayActions: todayActions.map(a => ({
          id: a._id?.toString() || a.id,
          text: a.text, area: a.area, energy: a.energy,
          estimatedMin: a.estimatedMin, isPriority: a.isPriority,
        })),
        projects: projectSummaries,
        stuckProjects: projectSummaries.filter(p => p.isStuck).length,
        waitingFor: waitingSummaries,
        routines: routineSummaries,
        somedayCount: someday.length,
        lastReviewDate,
        daysSinceReview,
        needsReview: !lastReviewDate || daysSinceReview >= 7,
        stats: {
          completedThisWeek: doneThisWeek.length,
          totalActions: actions.length,
          totalProjects: projects.length,
        },
      },
    });
  } catch (error) {
    console.error('GET /api/flow/state error:', error);
    return Response.json({ success: false, error: 'Failed to get system state' }, { status: 500 });
  }
}
