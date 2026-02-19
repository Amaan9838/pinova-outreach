import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import EmailFlow from '@/models/EmailFlow';
import Campaign from '@/models/Campaign';

/**
 * GET /api/campaigns/[id]/flow
 * Get the flow for a specific campaign
 */
export async function GET(request, { params }) {
  try {
    await dbConnect();
    
    const { id } = await params;
    
    const flow = await EmailFlow.findOne({ campaign: id });
    
    if (!flow) {
      return NextResponse.json({
        success: true,
        data: null,
        message: 'No flow exists for this campaign'
      });
    }
    
    return NextResponse.json({
      success: true,
      data: flow
    });
    
  } catch (error) {
    console.error('Error fetching campaign flow:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/campaigns/[id]/flow
 * Create or update the flow for a campaign
 */
export async function POST(request, { params }) {
  try {
    await dbConnect();
    
    const { id } = await params;
    const body = await request.json();
    const { nodes, edges, startNodeId, viewport, name } = body;
    
    // Check if campaign exists
    const campaign = await Campaign.findById(id);
    if (!campaign) {
      return NextResponse.json(
        { success: false, error: 'Campaign not found' },
        { status: 404 }
      );
    }
    
    // Check if flow already exists
    let flow = await EmailFlow.findOne({ campaign: id });
    
    if (flow) {
      // Update existing flow
      flow.nodes = nodes;
      flow.edges = edges;
      flow.startNodeId = startNodeId;
      if (viewport) flow.viewport = viewport;
      if (name) flow.name = name;
      await flow.save();
    } else {
      // Create new flow
      flow = await EmailFlow.create({
        name: name || `${campaign.name} Flow`,
        campaign: id,
        nodes,
        edges,
        startNodeId,
        viewport: viewport || { x: 0, y: 0, zoom: 1 }
      });
      
      // Update campaign to use visual flow
      campaign.emailFlow = flow._id;
      campaign.useVisualFlow = true;
      await campaign.save();
    }
    
    return NextResponse.json({
      success: true,
      data: flow
    });
    
  } catch (error) {
    console.error('Error saving campaign flow:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/campaigns/[id]/flow
 * Update flow nodes/edges (for React Flow auto-save)
 */
export async function PUT(request, { params }) {
  try {
    await dbConnect();
    
    const { id } = await params;
    const body = await request.json();
    const { nodes, edges, viewport } = body;
    
    const flow = await EmailFlow.findOne({ campaign: id });
    
    if (!flow) {
      return NextResponse.json(
        { success: false, error: 'Flow not found for this campaign' },
        { status: 404 }
      );
    }
    
    if (nodes) flow.nodes = nodes;
    if (edges) flow.edges = edges;
    if (viewport) flow.viewport = viewport;
    
    await flow.save();
    
    return NextResponse.json({
      success: true,
      data: flow
    });
    
  } catch (error) {
    console.error('Error updating campaign flow:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/campaigns/[id]/flow
 * Delete the flow for a campaign (reverts to linear sequence)
 */
export async function DELETE(request, { params }) {
  try {
    await dbConnect();
    
    const { id } = await params;
    
    // Delete the flow
    await EmailFlow.findOneAndDelete({ campaign: id });
    
    // Update campaign to not use visual flow
    await Campaign.findByIdAndUpdate(id, {
      $unset: { emailFlow: 1 },
      useVisualFlow: false
    });
    
    return NextResponse.json({
      success: true,
      message: 'Flow deleted, reverting to linear sequence'
    });
    
  } catch (error) {
    console.error('Error deleting campaign flow:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
