import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Pipeline from '@/models/Pipeline';
import Campaign from '@/models/Campaign';
import CampaignProspect from '@/models/CampaignProspect';
import Message from '@/models/Message';
// AI insights via vertexAI removed — using rule-based insights (see generateFallbackInsights)

/**
 * GET /api/pipeline/insights - Get AI-generated daily insights
 */
export async function GET(request) {
  try {
    await dbConnect();
    
    // Get campaign performance data
    const campaigns = await Campaign.find({
      status: { $in: ['active', 'paused', 'completed'] }
    }).lean();
    
    // Get pipeline stats
    const pipelineStatsRaw = await Pipeline.aggregate([
      { $group: { _id: '$stage', count: { $sum: 1 } } }
    ]);
    const pipelineStats = {};
    pipelineStatsRaw.forEach(s => { pipelineStats[s._id] = s.count; });
    
    // Get recent replies (last 48 hours)
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const recentReplies = await Message.find({
      type: 'inbound',
      createdAt: { $gte: twoDaysAgo }
    })
      .populate('prospectId', 'firstName lastName')
      .limit(20)
      .lean();
    
    const formattedReplies = recentReplies.map(r => ({
      prospect: `${r.prospectId?.firstName || 'Unknown'} ${r.prospectId?.lastName || ''}`,
      sentiment: r.sentiment || 'unknown',
      preview: r.body?.substring(0, 100) || ''
    }));
    
    // Get stalled leads (no activity in 7+ days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const stalledLeads = await Pipeline.find({
      stage: { $nin: ['closed_won', 'closed_lost', 'nurturing'] },
      updatedAt: { $lt: sevenDaysAgo }
    })
      .populate('prospect', 'firstName lastName')
      .sort({ leadScore: -1 })
      .limit(20)
      .lean();
    
    const formattedStalled = stalledLeads.map(l => ({
      prospect: `${l.prospect?.firstName || 'Unknown'} ${l.prospect?.lastName || ''}`,
      stage: l.stage,
      score: l.leadScore
    }));
    
    // Rule-based insights (vertexAI removed)
    const insights = generateFallbackInsights(pipelineStats, formattedReplies, formattedStalled);
    
    // Get priority actions
    const priorityActions = await getPriorityActions();
    
    return NextResponse.json({
      success: true,
      data: {
        insights,
        priorityActions,
        summary: {
          totalActive: Object.values(pipelineStats).reduce((a, b) => a + b, 0) - (pipelineStats.closed_won || 0) - (pipelineStats.closed_lost || 0),
          hotLeadsCount: await Pipeline.countDocuments({ leadScore: { $gte: 70 } }),
          stalledCount: stalledLeads.length,
          recentRepliesCount: recentReplies.length
        },
        generatedAt: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Insights GET error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// Generate rule-based insights when AI is unavailable
function generateFallbackInsights(pipelineStats, recentReplies, stalledLeads) {
  const insights = [];
  
  // Check for stalled leads
  if (stalledLeads.length > 5) {
    insights.push({
      type: 'warning',
      priority: 'high',
      title: `${stalledLeads.length} leads need attention`,
      message: `You have ${stalledLeads.length} leads with no activity in 7+ days. Consider re-engaging them.`,
      action: 'Review stalled leads and send follow-up emails',
      impact: 'Prevent leads from going cold'
    });
  }
  
  // Check for recent positive replies
  const positiveReplies = recentReplies.filter(r => r.sentiment === 'positive');
  if (positiveReplies.length > 0) {
    insights.push({
      type: 'opportunity',
      priority: 'urgent',
      title: `${positiveReplies.length} hot leads responded!`,
      message: `${positiveReplies.map(r => r.prospect).join(', ')} showed positive interest.`,
      action: 'Respond immediately to capitalize on interest',
      impact: 'High conversion potential'
    });
  }
  
  // Pipeline health check
  const responded = pipelineStats.responded || 0;
  const interested = pipelineStats.interested || 0;
  if (responded > 0 && interested / responded < 0.3) {
    insights.push({
      type: 'analysis',
      priority: 'medium',
      title: 'Response-to-interest conversion low',
      message: 'Only 30% of responded leads move to interested. Review your follow-up messaging.',
      action: 'Analyze what makes leads convert and replicate',
      impact: 'Improve mid-funnel conversion'
    });
  }
  
  return insights;
}

// Get priority actions for today
async function getPriorityActions() {
  const actions = [];
  
  // Get leads with overdue next actions
  const overdue = await Pipeline.find({
    'nextAction.dueAt': { $lt: new Date() },
    stage: { $nin: ['closed_won', 'closed_lost'] }
  })
    .populate('prospect', 'firstName lastName email')
    .limit(5)
    .lean();
  
  overdue.forEach(lead => {
    actions.push({
      type: 'overdue',
      priority: 'urgent',
      lead: {
        id: lead._id,
        name: `${lead.prospect?.firstName || ''} ${lead.prospect?.lastName || ''}`,
        email: lead.prospect?.email
      },
      action: lead.nextAction?.description || 'Follow up required',
      dueAt: lead.nextAction?.dueAt
    });
  });
  
  // Get hot leads that need action
  const hotLeads = await Pipeline.find({
    leadScore: { $gte: 70 },
    stage: { $in: ['responded', 'interested'] }
  })
    .populate('prospect', 'firstName lastName email')
    .sort({ leadScore: -1 })
    .limit(5)
    .lean();
  
  hotLeads.forEach(lead => {
    if (!actions.some(a => a.lead?.id?.toString() === lead._id.toString())) {
      actions.push({
        type: 'hot_lead',
        priority: 'high',
        lead: {
          id: lead._id,
          name: `${lead.prospect?.firstName || ''} ${lead.prospect?.lastName || ''}`,
          email: lead.prospect?.email,
          score: lead.leadScore
        },
        action: 'High-score lead - prioritize outreach',
        stage: lead.stage
      });
    }
  });
  
  return actions;
}
