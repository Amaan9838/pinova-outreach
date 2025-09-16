import dbConnect from '../../../../lib/mongodb.js';
import { CampaignProspectService } from '../../../../lib/services/CampaignProspectService.js';

export const dynamic = 'force-dynamic';

/**
 * Get pending prospect alerts for dashboard
 */
export async function GET() {
  try {
    await dbConnect();
    
    // Get simple count of pending prospects
    const totalPending = await CampaignProspectService.countPendingProspects();

    // For now, return a simple alert if there are pending prospects
    const alerts = [];
    if (totalPending > 0) {
      alerts.push({
        id: 'pending-global',
        type: 'warning',
        title: `${totalPending} prospects need activation`,
        message: `There are ${totalPending} prospects pending across your campaigns that need activation to start sending emails.`,
        actionUrl: '/campaigns',
        actionText: 'View Campaigns',
        timestamp: new Date().toISOString()
      });
    }
    

    
    return Response.json({
      success: true,
      alerts,
      summary: {
        totalPending,
        campaignsAffected: totalPending > 0 ? 1 : 0
      }
    });
    
  } catch (error) {
    console.error('Dashboard pending alerts error:', error);
    return Response.json(
      { success: false, error: 'Failed to get pending alerts: ' + error.message },
      { status: 500 }
    );
  }
}
