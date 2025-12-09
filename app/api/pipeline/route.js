import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Pipeline from '@/models/Pipeline';
import Prospect from '@/models/Prospect';
import Campaign from '@/models/Campaign';
import CampaignProspect from '@/models/CampaignProspect';

/**
 * GET /api/pipeline - Get pipeline data with stats
 * Query params:
 *   - stage: Filter by stage
 *   - assignedTo: Filter by assignee
 *   - minScore: Minimum lead score
 *   - limit: Number of results
 *   - includeStats: Include pipeline stats
 */
export async function GET(request) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const stage = searchParams.get('stage');
    const assignedTo = searchParams.get('assignedTo');
    const minScore = parseInt(searchParams.get('minScore') || '0');
    const limit = parseInt(searchParams.get('limit') || '100');
    const includeStats = searchParams.get('includeStats') === 'true';
    
    // Build query
    const query = {};
    
    if (stage && stage !== 'all') {
      query.stage = stage;
    }
    
    if (assignedTo && assignedTo !== 'all') {
      query.assignedTo = assignedTo;
    }
    
    if (minScore > 0) {
      query.leadScore = { $gte: minScore };
    }
    
    // Fetch pipeline items
    const pipelineItems = await Pipeline.find(query)
      .populate('prospect', 'firstName lastName email company phone')
      .sort({ leadScore: -1, stageChangedAt: -1 })
      .limit(limit)
      .lean();
    
    // Get stats if requested
    let stats = null;
    if (includeStats) {
      stats = await getPipelineStats();
    }
    
    // Get hot leads (top 5 by score)
    const hotLeads = await Pipeline.find({
      stage: { $nin: ['closed_won', 'closed_lost'] },
      leadScore: { $gte: 50 }
    })
      .populate('prospect', 'firstName lastName email company')
      .sort({ leadScore: -1 })
      .limit(5)
      .lean();
    
    // Get recent activity
    const recentActivity = await Pipeline.find({})
      .populate('prospect', 'firstName lastName email')
      .sort({ updatedAt: -1 })
      .limit(10)
      .lean();
    
    return NextResponse.json({
      success: true,
      data: {
        items: pipelineItems,
        stats,
        hotLeads,
        recentActivity,
        totalCount: await Pipeline.countDocuments(query)
      }
    });
    
  } catch (error) {
    console.error('Pipeline GET error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/pipeline - Create or sync pipeline entry for prospect
 */
export async function POST(request) {
  try {
    await dbConnect();
    
    const body = await request.json();
    const { prospectId, stage, assignedTo, dealValue, tags } = body;
    
    // Check if prospect exists
    const prospect = await Prospect.findById(prospectId);
    if (!prospect) {
      return NextResponse.json(
        { success: false, error: 'Prospect not found' },
        { status: 404 }
      );
    }
    
    // Check if pipeline entry exists
    let pipelineEntry = await Pipeline.findOne({ prospect: prospectId });
    
    if (pipelineEntry) {
      // Update existing entry
      if (stage && stage !== pipelineEntry.stage) {
        pipelineEntry.moveToStage(stage, 'user', 'Manual stage update');
      }
      if (assignedTo) pipelineEntry.assignedTo = assignedTo;
      if (dealValue !== undefined) pipelineEntry.dealValue = dealValue;
      if (tags) pipelineEntry.tags = tags;
      
      await pipelineEntry.save();
    } else {
      // Create new entry
      pipelineEntry = new Pipeline({
        prospect: prospectId,
        stage: stage || 'new_lead',
        assignedTo: assignedTo || 'unassigned',
        dealValue: dealValue || 0,
        tags: tags || []
      });
      
      await pipelineEntry.save();
    }
    
    // Populate and return
    await pipelineEntry.populate('prospect', 'firstName lastName email company');
    
    return NextResponse.json({
      success: true,
      data: pipelineEntry
    });
    
  } catch (error) {
    console.error('Pipeline POST error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/pipeline - Update pipeline entry
 */
export async function PATCH(request) {
  try {
    await dbConnect();
    
    const body = await request.json();
    const { id, stage, assignedTo, dealValue, tags, notes, nextAction } = body;
    
    const pipelineEntry = await Pipeline.findById(id);
    if (!pipelineEntry) {
      return NextResponse.json(
        { success: false, error: 'Pipeline entry not found' },
        { status: 404 }
      );
    }
    
    // Update fields
    if (stage && stage !== pipelineEntry.stage) {
      pipelineEntry.moveToStage(stage, 'user', 'Manual stage update');
    }
    
    if (assignedTo !== undefined) pipelineEntry.assignedTo = assignedTo;
    if (dealValue !== undefined) pipelineEntry.dealValue = dealValue;
    if (tags) pipelineEntry.tags = tags;
    if (nextAction) pipelineEntry.nextAction = nextAction;
    
    // Add note if provided
    if (notes) {
      pipelineEntry.notes.push({
        content: notes.content,
        author: notes.author || 'user',
        createdAt: new Date()
      });
    }
    
    // Recalculate score
    pipelineEntry.calculateScore();
    
    await pipelineEntry.save();
    await pipelineEntry.populate('prospect', 'firstName lastName email company');
    
    return NextResponse.json({
      success: true,
      data: pipelineEntry
    });
    
  } catch (error) {
    console.error('Pipeline PATCH error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// Helper function to get pipeline stats
async function getPipelineStats() {
  const stageStats = await Pipeline.aggregate([
    {
      $group: {
        _id: '$stage',
        count: { $sum: 1 },
        avgScore: { $avg: '$leadScore' },
        totalValue: { $sum: '$dealValue' }
      }
    }
  ]);
  
  // Convert to object for easier frontend use
  const stageOrder = [
    'new_lead', 'contacted', 'engaged', 'responded', 'interested',
    'demo_scheduled', 'proposal_sent', 'negotiating', 
    'closed_won', 'closed_lost', 'nurturing'
  ];
  
  const stats = {};
  stageOrder.forEach(stage => {
    const found = stageStats.find(s => s._id === stage);
    stats[stage] = {
      count: found?.count || 0,
      avgScore: Math.round(found?.avgScore || 0),
      totalValue: found?.totalValue || 0
    };
  });
  
  // Calculate funnel metrics
  const totalLeads = await Pipeline.countDocuments();
  const activeLeads = await Pipeline.countDocuments({
    stage: { $nin: ['closed_won', 'closed_lost'] }
  });
  const closedWon = stats.closed_won?.count || 0;
  const closedLost = stats.closed_lost?.count || 0;
  
  return {
    byStage: stats,
    totals: {
      total: totalLeads,
      active: activeLeads,
      closedWon,
      closedLost,
      conversionRate: totalLeads > 0 ? Math.round((closedWon / totalLeads) * 100) : 0,
      totalPipelineValue: stageStats.reduce((sum, s) => sum + (s.totalValue || 0), 0)
    }
  };
}
