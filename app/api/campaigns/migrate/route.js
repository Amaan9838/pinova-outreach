import dbConnect from '../../../../lib/mongodb.js';
import { CampaignMigrationService } from '../../../../lib/campaignMigration.js';

export const dynamic = 'force-dynamic';

/**
 * Campaign Migration API
 * Handles migration from old embedded prospects to new CampaignProspect model
 */
export async function POST(request) {
  try {
    await dbConnect();
    
    const { action, campaignId } = await request.json();
    
    switch (action) {
      case 'migrate_single':
        return await migrateSingleCampaign(campaignId);
      case 'migrate_all':
        return await migrateAllCampaigns();
      case 'status':
        return await getMigrationStatus();
      case 'cleanup':
        return await cleanupOldData(campaignId);
      default:
        return Response.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
    
  } catch (error) {
    console.error('Migration API error:', error);
    return Response.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

async function migrateSingleCampaign(campaignId) {
  if (!campaignId) {
    return Response.json(
      { success: false, error: 'Campaign ID is required' },
      { status: 400 }
    );
  }
  
  const result = await CampaignMigrationService.migrateCampaign(campaignId);
  
  return Response.json(result);
}

async function migrateAllCampaigns() {
  const result = await CampaignMigrationService.migrateAllCampaigns();
  
  return Response.json(result);
}

async function getMigrationStatus() {
  const result = await CampaignMigrationService.getMigrationStatus();
  
  return Response.json(result);
}

async function cleanupOldData(campaignId) {
  if (!campaignId) {
    return Response.json(
      { success: false, error: 'Campaign ID is required' },
      { status: 400 }
    );
  }
  
  const result = await CampaignMigrationService.cleanupOldProspectData(campaignId);
  
  return Response.json(result);
}

/**
 * GET endpoint for quick status check
 */
export async function GET(request) {
  try {
    await dbConnect();
    
    const url = new URL(request.url);
    const action = url.searchParams.get('action') || 'status';
    
    if (action === 'status') {
      const result = await CampaignMigrationService.getMigrationStatus();
      return Response.json(result);
    }
    
    return Response.json({
      success: true,
      message: 'Campaign Migration API',
      availableActions: [
        'migrate_single',
        'migrate_all', 
        'status',
        'cleanup'
      ],
      usage: {
        post: 'POST with { "action": "action_name", "campaignId": "..." }',
        get: 'GET with ?action=status'
      }
    });
    
  } catch (error) {
    console.error('Migration GET error:', error);
    return Response.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
