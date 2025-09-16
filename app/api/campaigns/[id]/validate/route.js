import dbConnect from '../../../../../lib/mongodb.js';
import { CampaignValidationService } from '../../../../../lib/campaignValidation.js';

export const dynamic = 'force-dynamic';

/**
 * Validate a campaign for scheduling/activation
 */
export async function POST(request, { params }) {
  try {
    await dbConnect();
    
    const { id } = params;
    
    console.log(`Validating campaign ${id}...`);
    
    const validation = await CampaignValidationService.validateCampaign(id);
    
    return Response.json({
      success: true,
      validation: {
        valid: validation.valid,
        errors: validation.errors || [],
        campaign: validation.campaign
      }
    });
    
  } catch (error) {
    console.error('Campaign validation error:', error);
    return Response.json(
      { success: false, error: 'Failed to validate campaign: ' + error.message },
      { status: 500 }
    );
  }
}

/**
 * Get current validation status
 */
export async function GET(request, { params }) {
  try {
    await dbConnect();
    
    const { id } = params;
    
    const Campaign = (await import('../../../../../models/Campaign.js')).default;
    const campaign = await Campaign.findById(id);
    
    if (!campaign) {
      return Response.json(
        { success: false, error: 'Campaign not found' },
        { status: 404 }
      );
    }
    
    return Response.json({
      success: true,
      validation: {
        status: campaign.validation?.status || 'pending',
        errors: campaign.validation?.errors || [],
        lastChecked: campaign.validation?.lastChecked,
        retryCount: campaign.validation?.retryCount || 0,
        nextRetryAt: campaign.validation?.nextRetryAt
      }
    });
    
  } catch (error) {
    console.error('Get validation status error:', error);
    return Response.json(
      { success: false, error: 'Failed to get validation status: ' + error.message },
      { status: 500 }
    );
  }
}
