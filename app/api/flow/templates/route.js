import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import FlowTemplate from '@/models/FlowTemplate';
import EmailFlow from '@/models/EmailFlow';
import Campaign from '@/models/Campaign';

/**
 * GET /api/flow/templates
 * Get all flow templates for the user (system + custom)
 */
export async function GET(request) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const category = searchParams.get('category');
    
    const query = {
      $or: [
        { isSystem: true },
        { userId: userId }
      ]
    };
    
    if (category) {
      query.category = category;
    }
    
    const templates = await FlowTemplate.find(query)
      .sort({ usageCount: -1, name: 1 });
    
    return NextResponse.json({
      success: true,
      data: templates
    });
    
  } catch (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/flow/templates
 * Create a new flow template or use a template for a campaign
 */
export async function POST(request) {
  try {
    await dbConnect();
    
    const body = await request.json();
    const { action, template, templateId, campaignId, userId } = body;
    
    // Create new template
    if (action === 'create' && template) {
      const newTemplate = await FlowTemplate.create({
        ...template,
        isSystem: false,
        userId: userId
      });
      
      return NextResponse.json({
        success: true,
        data: newTemplate
      });
    }
    
    // Use template for campaign (creates EmailFlow from template)
    if (action === 'use_for_campaign' && templateId && campaignId) {
      // Check if campaign already has a flow
      const existingFlow = await EmailFlow.findOne({ campaign: campaignId });
      if (existingFlow) {
        return NextResponse.json(
          { success: false, error: 'Campaign already has a flow' },
          { status: 400 }
        );
      }
      
      // Create flow from template
      const flow = await EmailFlow.createFromTemplate(templateId, campaignId);
      
      // Update campaign to use visual flow
      await Campaign.findByIdAndUpdate(campaignId, {
        emailFlow: flow._id,
        useVisualFlow: true,
        flowTemplate: templateId
      });
      
      // Increment template usage count
      await FlowTemplate.findByIdAndUpdate(templateId, {
        $inc: { usageCount: 1 }
      });
      
      return NextResponse.json({
        success: true,
        data: flow
      });
    }
    
    // Create basic outreach template
    if (action === 'create_basic_template' && userId) {
      const template = await FlowTemplate.createBasicOutreachTemplate(userId);
      
      return NextResponse.json({
        success: true,
        data: template
      });
    }
    
    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    );
    
  } catch (error) {
    console.error('Error with templates:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/flow/templates
 * Update a flow template
 */
export async function PUT(request) {
  try {
    await dbConnect();
    
    const body = await request.json();
    const { templateId, updates, userId } = body;
    
    const template = await FlowTemplate.findById(templateId);
    
    if (!template) {
      return NextResponse.json(
        { success: false, error: 'Template not found' },
        { status: 404 }
      );
    }
    
    // Check ownership for non-system templates
    if (!template.isSystem && template.userId.toString() !== userId) {
      return NextResponse.json(
        { success: false, error: 'Not authorized to edit this template' },
        { status: 403 }
      );
    }
    
    // Don't allow editing system templates
    if (template.isSystem) {
      return NextResponse.json(
        { success: false, error: 'Cannot modify system template' },
        { status: 403 }
      );
    }
    
    Object.assign(template, updates);
    await template.save();
    
    return NextResponse.json({
      success: true,
      data: template
    });
    
  } catch (error) {
    console.error('Error updating template:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/flow/templates
 * Delete a flow template
 */
export async function DELETE(request) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get('templateId');
    const userId = searchParams.get('userId');
    
    const template = await FlowTemplate.findById(templateId);
    
    if (!template) {
      return NextResponse.json(
        { success: false, error: 'Template not found' },
        { status: 404 }
      );
    }
    
    if (template.isSystem) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete system template' },
        { status: 403 }
      );
    }
    
    if (template.userId.toString() !== userId) {
      return NextResponse.json(
        { success: false, error: 'Not authorized to delete this template' },
        { status: 403 }
      );
    }
    
    await FlowTemplate.findByIdAndDelete(templateId);
    
    return NextResponse.json({
      success: true,
      message: 'Template deleted'
    });
    
  } catch (error) {
    console.error('Error deleting template:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
