import dbConnect from './mongodb.js';
import Campaign from '../models/Campaign.js';
import CampaignProspect from '../models/CampaignProspect.js';
import Message from '../models/Message.js';
// import Prospect from '../models/Prospect.js';

/**
 * Unified Data Access Layer (DAL)
 * Single source of truth for all data operations
 * Prevents inconsistencies between different data sources
 */
export class DataAccessLayer {

  /**
   * Get campaign data with all related information using CampaignProspect model
   */
  static async getCampaignWithUnifiedData(campaignId) {
    await dbConnect();

    // Get campaign
    const campaign = await Campaign.findById(campaignId).lean();

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    // Get campaign prospects from CampaignProspect model
    const campaignProspects = await CampaignProspect.find({ campaign: campaignId })
      .populate('prospect')
      .lean();

    // Get messages for analytics
    const messages = await Message.find({ campaignId }).lean();

    // Create prospect data with message analytics
    const prospects = campaignProspects.map(campaignProspect => {
      const prospect = campaignProspect.prospect;

      // Get prospect messages for analytics
      const prospectMessages = messages.filter(m =>
        m.prospectId.toString() === prospect._id.toString()
      );

      return {
        // Map CampaignProspect fields to legacy format for compatibility
        prospectId: prospect,
        currentStep: campaignProspect.sequenceStep,
        status: campaignProspect.status,
        // Additional CampaignProspect data
        nextSendAt: campaignProspect.nextSendAt,
        emailsSent: campaignProspect.emailsSent,
        emailsOpened: campaignProspect.emailsOpened,
        emailsClicked: campaignProspect.emailsClicked,
        emailsReplied: campaignProspect.emailsReplied,
        lastSentAt: campaignProspect.lastSentAt,
        // Message analytics
        messageCount: prospectMessages.length,
        lastMessageStatus: prospectMessages[prospectMessages.length - 1]?.status,
        lastMessageSent: prospectMessages[prospectMessages.length - 1]?.sentAt
      };
    });

    return {
      ...campaign,
      prospects,
      totalMessages: messages.length,
      // Add prospect count from CampaignProspect model
      prospectCount: campaignProspects.length
    };
  }

  /**
   * Update prospect status and step using CampaignProspect model
   */
  static async updateProspectStatus(campaignId, prospectId, status, stepNumber = 1) {
    await dbConnect();

    const result = await CampaignProspect.updateOne(
      {
        campaign: campaignId,
        prospect: prospectId
      },
      {
        $set: {
          status: status,
          sequenceStep: stepNumber,
          updatedAt: new Date()
        }
      }
    );

    return {
      success: result.modifiedCount > 0,
      modifiedCount: result.modifiedCount
    };
  }

  /**
   * Get campaign analytics using CampaignProspect model
   */
  static async getCampaignAnalytics(campaignId) {
    await dbConnect();

    const [campaign, campaignProspects, messages] = await Promise.all([
      Campaign.findById(campaignId).lean(),
      CampaignProspect.find({ campaign: campaignId }).lean(),
      Message.find({ campaignId }).lean()
    ]);

    // Calculate stats from CampaignProspect model
    const stats = {
      totalProspects: campaignProspects.length,
      activeProspects: campaignProspects.filter(cp => cp.status === 'active').length,
      pendingProspects: campaignProspects.filter(cp => cp.status === 'pending').length,
      completedProspects: campaignProspects.filter(cp => cp.status === 'completed').length,
      stoppedProspects: campaignProspects.filter(cp => cp.status === 'stopped').length,
      totalMessages: messages.length,
      sentMessages: messages.filter(m => ['sent', 'delivered', 'opened', 'replied'].includes(m.status)).length,
      deliveredMessages: messages.filter(m => ['delivered', 'opened', 'replied'].includes(m.status)).length,
      openedMessages: messages.filter(m => ['opened', 'replied'].includes(m.status)).length,
      repliedMessages: messages.filter(m => m.status === 'replied').length,
      failedEmails: messages.filter(m => m.status === 'failed').length,
      // Aggregate stats from CampaignProspect model
      totalEmailsSent: campaignProspects.reduce((sum, cp) => sum + (cp.emailsSent || 0), 0),
      totalEmailsOpened: campaignProspects.reduce((sum, cp) => sum + (cp.emailsOpened || 0), 0),
      totalEmailsClicked: campaignProspects.reduce((sum, cp) => sum + (cp.emailsClicked || 0), 0),
      totalEmailsReplied: campaignProspects.reduce((sum, cp) => sum + (cp.emailsReplied || 0), 0),
      totalEmailsBounced: campaignProspects.reduce((sum, cp) => sum + (cp.emailsBounced || 0), 0)
    };

    // Calculate rates
    stats.deliveryRate = stats.sentMessages > 0 ? (stats.deliveredMessages / stats.sentMessages * 100).toFixed(1) : 0;
    stats.openRate = stats.deliveredMessages > 0 ? (stats.openedMessages / stats.deliveredMessages * 100).toFixed(1) : 0;
    stats.replyRate = stats.deliveredMessages > 0 ? (stats.repliedMessages / stats.deliveredMessages * 100).toFixed(1) : 0;

    return stats;
  }

}

/**
 * Campaign Service - High-level operations using DAL
 */
export class CampaignService {
  
  static async getFullCampaignData(campaignId) {
    return await DataAccessLayer.getCampaignWithUnifiedData(campaignId);
  }
  
  static async getCampaignProspects(campaignId) {
    const campaign = await DataAccessLayer.getCampaignWithUnifiedData(campaignId);
    return campaign.prospects;
  }
  
  static async getCampaignStats(campaignId) {
    return await DataAccessLayer.getCampaignAnalytics(campaignId);
  }
  
  static async updateProspectStatus(campaignId, prospectId, status, stepNumber) {
    return await DataAccessLayer.updateProspectStatus(campaignId, prospectId, status, stepNumber);
  }
}
