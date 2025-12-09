import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Campaign from '@/models/Campaign';
import CampaignProspect from '@/models/CampaignProspect';
import Prospect from '@/models/Prospect';
import Message from '@/models/Message';
import { aiService } from '@/lib/services/vertexAI';

/**
 * POST /api/campaigns/[id]/ai-variations
 * Generate AI email variations for A/B testing and analyze performance
 */
export async function POST(request, { params }) {
  try {
    await dbConnect();
    
    const { id } = await params;
    const body = await request.json();
    const { action, prospectId, stepNumber } = body;
    
    const campaign = await Campaign.findById(id);
    if (!campaign) {
      return NextResponse.json(
        { success: false, error: 'Campaign not found' },
        { status: 404 }
      );
    }
    
    if (action === 'generate_variations') {
      // Generate email variations for a specific prospect
      const prospect = prospectId ? await Prospect.findById(prospectId) : null;
      
      // Get previous emails sent to this prospect in this campaign
      const previousEmails = prospect ? await Message.find({
        campaignId: id,
        prospectId: prospect._id,
        type: 'outbound'
      }).sort({ createdAt: 1 }).lean() : [];
      
      const variations = await aiService.generateEmailVariations({
        prospect: prospect || {
          firstName: '{{first_name}}',
          lastName: '{{last_name}}',
          company: campaign.persona,
          email: 'prospect@example.com'
        },
        campaign: {
          name: campaign.name,
          persona: campaign.persona,
          sequence: campaign.sequence
        },
        previousEmails: previousEmails.map(e => ({
          subject: e.subject,
          opened: e.events?.some(ev => ev.type === 'open'),
          replied: e.events?.some(ev => ev.type === 'reply')
        })),
        variationCount: body.variationCount || 3,
        purpose: body.purpose || 'follow_up'
      });
      
      return NextResponse.json({
        success: true,
        data: {
          variations,
          generatedFor: prospect ? `${prospect.firstName} ${prospect.lastName}` : 'Template',
          usage: {
            estimatedTokens: 500,
            costEstimate: '$0.002' // Rough estimate for Haiku
          }
        }
      });
    }
    
    if (action === 'analyze_performance') {
      // Analyze campaign performance and get AI recommendations
      const analysis = await aiService.analyzeCampaignPerformance(campaign);
      
      return NextResponse.json({
        success: true,
        data: {
          analysis,
          campaign: {
            id: campaign._id,
            name: campaign.name,
            status: campaign.status
          }
        }
      });
    }
    
    if (action === 'apply_variation') {
      // Apply a variation to the campaign sequence
      const { variation, targetStep } = body;
      
      if (!variation || targetStep === undefined) {
        return NextResponse.json(
          { success: false, error: 'Missing variation or targetStep' },
          { status: 400 }
        );
      }
      
      // Update the sequence step
      if (campaign.sequence[targetStep]) {
        campaign.sequence[targetStep].subject = variation.subject;
        campaign.sequence[targetStep].template = variation.body;
        campaign.sequence[targetStep].aiGenerated = true;
        campaign.sequence[targetStep].variationName = variation.variationName;
        await campaign.save();
      }
      
      return NextResponse.json({
        success: true,
        data: {
          message: `Applied ${variation.variationName} to step ${targetStep + 1}`,
          campaign: campaign._id
        }
      });
    }
    
    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    );
    
  } catch (error) {
    console.error('AI Variations error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/campaigns/[id]/ai-variations
 * Get performance analysis and variation suggestions
 */
export async function GET(request, { params }) {
  try {
    await dbConnect();
    
    const { id } = await params;
    
    const campaign = await Campaign.findById(id);
    if (!campaign) {
      return NextResponse.json(
        { success: false, error: 'Campaign not found' },
        { status: 404 }
      );
    }
    
    // Get detailed metrics per step
    const stepMetrics = [];
    for (let i = 0; i < campaign.sequence.length; i++) {
      const step = campaign.sequence[i];
      
      // Count messages for this step
      const stepMessages = await Message.aggregate([
        {
          $match: {
            campaignId: campaign._id,
            stepNumber: i + 1,
            type: 'outbound'
          }
        },
        {
          $group: {
            _id: null,
            sent: { $sum: 1 },
            opened: {
              $sum: {
                $cond: [
                  { $in: ['open', '$events.type'] },
                  1,
                  0
                ]
              }
            },
            replied: {
              $sum: {
                $cond: [
                  { $in: ['reply', '$events.type'] },
                  1,
                  0
                ]
              }
            }
          }
        }
      ]);
      
      const metrics = stepMessages[0] || { sent: 0, opened: 0, replied: 0 };
      
      stepMetrics.push({
        stepNumber: i + 1,
        subject: step.subject,
        sent: metrics.sent,
        opened: metrics.opened,
        replied: metrics.replied,
        openRate: metrics.sent > 0 ? Math.round((metrics.opened / metrics.sent) * 100) : 0,
        replyRate: metrics.sent > 0 ? Math.round((metrics.replied / metrics.sent) * 100) : 0,
        aiGenerated: step.aiGenerated || false
      });
    }
    
    // Get AI analysis
    let analysis = null;
    try {
      analysis = await aiService.analyzeCampaignPerformance({
        ...campaign.toObject(),
        stepMetrics
      });
    } catch (aiError) {
      console.error('AI analysis failed:', aiError);
    }
    
    return NextResponse.json({
      success: true,
      data: {
        campaign: {
          id: campaign._id,
          name: campaign.name,
          status: campaign.status,
          stats: campaign.stats
        },
        stepMetrics,
        analysis
      }
    });
    
  } catch (error) {
    console.error('AI Variations GET error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
