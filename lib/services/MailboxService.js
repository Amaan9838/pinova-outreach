const mongoose = require('mongoose');
const Campaign = require('../../models/Campaign');
const EmailAccount = require('../../models/EmailAccount');

/**
 * Mailbox Service
 * Standardizes mailbox access and eliminates inconsistencies between
 * campaign.mailboxIds, campaign.emailAccounts, and other mailbox references
 */
class MailboxService {
  constructor() {
    this.initialized = false;
    this.mailboxCache = new Map();
  }

  async initialize() {
    if (this.initialized) return;
    this.initialized = true;
    await this.refreshCache();
  }

  /**
   * Refresh the mailbox cache
   */
  async refreshCache() {
    try {
      const mailboxes = await EmailAccount.find({ active: true });
      this.mailboxCache.clear();
      
      mailboxes.forEach(mailbox => {
        this.mailboxCache.set(mailbox._id.toString(), mailbox);
        // Also cache by email for quick lookup
        this.mailboxCache.set(mailbox.email, mailbox);
      });
      
      console.log(`✓ Refreshed mailbox cache with ${mailboxes.length} active mailboxes`);
    } catch (error) {
      console.error('✗ Error refreshing mailbox cache:', error.message);
    }
  }

  /**
   * Get standardized mailbox references for a campaign
   * Handles both legacy and current mailbox reference formats
   */
  async getCampaignMailboxes(campaignId) {
    await this.initialize();

    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
      throw new Error(`Campaign ${campaignId} not found`);
    }

    const mailboxes = [];
    const mailboxIds = new Set();

    // Handle different mailbox reference formats
    const sources = [
      campaign.mailboxIds || [],
      campaign.emailAccounts || [],
      campaign.mailboxes || [],
      // Legacy format check
      campaign.selectedEmailAccounts || []
    ];

    // Collect all unique mailbox references
    for (const source of sources) {
      if (Array.isArray(source)) {
        for (const ref of source) {
          let mailboxId;
          
          if (typeof ref === 'string') {
            mailboxId = ref;
          } else if (ref && typeof ref === 'object') {
            mailboxId = ref._id || ref.id || ref.emailAccount || ref.mailbox;
          }
          
          if (mailboxId && !mailboxIds.has(mailboxId.toString())) {
            mailboxIds.add(mailboxId.toString());
          }
        }
      }
    }

    // Resolve mailbox IDs to full mailbox objects
    for (const mailboxId of mailboxIds) {
      const mailbox = await this.getMailboxById(mailboxId);
      if (mailbox && mailbox.active) {
        mailboxes.push(mailbox);
      }
    }

    // Fallback: if no mailboxes found, use default active mailbox
    if (mailboxes.length === 0) {
      console.warn(`No valid mailboxes found for campaign ${campaignId}, using default`);
      const defaultMailbox = await this.getDefaultMailbox();
      if (defaultMailbox) {
        mailboxes.push(defaultMailbox);
      }
    }

    return mailboxes;
  }

  /**
   * Get a mailbox by ID or email
   */
  async getMailboxById(identifier) {
    await this.initialize();

    // Try cache first
    let mailbox = this.mailboxCache.get(identifier);
    if (mailbox) {
      return mailbox;
    }

    // If not in cache, query database
    try {
      if (mongoose.Types.ObjectId.isValid(identifier)) {
        mailbox = await EmailAccount.findById(identifier);
      } else {
        mailbox = await EmailAccount.findOne({ email: identifier });
      }

      if (mailbox) {
        this.mailboxCache.set(mailbox._id.toString(), mailbox);
        this.mailboxCache.set(mailbox.email, mailbox);
      }

      return mailbox;
    } catch (error) {
      console.error(`Error getting mailbox ${identifier}:`, error.message);
      return null;
    }
  }

  /**
   * Get default/primary mailbox
   */
  async getDefaultMailbox() {
    await this.initialize();

    // Try to find a mailbox marked as default
    let defaultMailbox = await EmailAccount.findOne({ 
      active: true, 
      isDefault: true 
    });

    // If no default, use first active mailbox
    if (!defaultMailbox) {
      defaultMailbox = await EmailAccount.findOne({ active: true });
    }

    return defaultMailbox;
  }

  /**
   * Select appropriate mailbox for sending
   * Uses round-robin or load balancing if multiple mailboxes available
   */
  async selectMailboxForSending(campaignId, prospectId = null) {
    const mailboxes = await this.getCampaignMailboxes(campaignId);
    
    if (mailboxes.length === 0) {
      throw new Error(`No active mailboxes available for campaign ${campaignId}`);
    }

    if (mailboxes.length === 1) {
      return mailboxes[0];
    }

    // Simple round-robin selection based on prospect ID or timestamp
    const index = prospectId 
      ? Math.abs(prospectId.toString().charCodeAt(0)) % mailboxes.length
      : Date.now() % mailboxes.length;

    return mailboxes[index];
  }

  /**
   * Standardize campaign mailbox references
   * Converts legacy formats to the new standard format
   */
  async standardizeCampaignMailboxes(campaignId) {
    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
      throw new Error(`Campaign ${campaignId} not found`);
    }

    const mailboxes = await this.getCampaignMailboxes(campaignId);
    const standardizedMailboxIds = mailboxes.map(m => m._id);

    // Update campaign with standardized format
    const updateData = {
      mailboxIds: standardizedMailboxIds,
      updatedAt: new Date()
    };

    // Clean up legacy fields
    const unsetData = {};
    if (campaign.emailAccounts) unsetData.emailAccounts = 1;
    if (campaign.selectedEmailAccounts) unsetData.selectedEmailAccounts = 1;
    if (campaign.mailboxes && campaign.mailboxes !== campaign.mailboxIds) {
      unsetData.mailboxes = 1;
    }

    const updateQuery = { $set: updateData };
    if (Object.keys(unsetData).length > 0) {
      updateQuery.$unset = unsetData;
    }

    await Campaign.updateOne({ _id: campaignId }, updateQuery);

    console.log(`✓ Standardized mailboxes for campaign ${campaignId}: ${standardizedMailboxIds.length} mailboxes`);
    
    return standardizedMailboxIds;
  }

  /**
   * Validate mailbox configuration
   */
  async validateMailbox(mailboxId) {
    const mailbox = await this.getMailboxById(mailboxId);
    
    if (!mailbox) {
      return { valid: false, error: 'Mailbox not found' };
    }

    if (!mailbox.active) {
      return { valid: false, error: 'Mailbox is inactive' };
    }

    // Check required fields
    const requiredFields = ['email', 'smtpHost', 'smtpPort', 'smtpUser'];
    for (const field of requiredFields) {
      if (!mailbox[field]) {
        return { valid: false, error: `Missing required field: ${field}` };
      }
    }

    // Check SMTP credentials
    if (!mailbox.smtpPass && !mailbox.smtpToken) {
      return { valid: false, error: 'Missing SMTP authentication' };
    }

    return { valid: true, mailbox };
  }

  /**
   * Get mailbox usage statistics
   */
  async getMailboxStats(mailboxId, timeframe = '24h') {
    const mailbox = await this.getMailboxById(mailboxId);
    if (!mailbox) {
      throw new Error(`Mailbox ${mailboxId} not found`);
    }

    const now = new Date();
    let startTime;

    switch (timeframe) {
      case '1h':
        startTime = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '24h':
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      default:
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    // This would typically query an email tracking/logging system
    // For now, return placeholder stats
    return {
      mailboxId: mailbox._id,
      email: mailbox.email,
      timeframe,
      stats: {
        sent: 0,
        delivered: 0,
        bounced: 0,
        complained: 0,
        opened: 0,
        clicked: 0
      }
    };
  }

  /**
   * Migrate legacy campaign mailbox references
   * Batch operation to standardize all campaigns
   */
  async migrateLegacyReferences(batchSize = 10) {
    console.log('🔄 Starting mailbox reference migration...');
    
    let processed = 0;
    let migrated = 0;
    let errors = [];

    try {
      const campaigns = await Campaign.find({
        $or: [
          { emailAccounts: { $exists: true, $ne: [] } },
          { selectedEmailAccounts: { $exists: true, $ne: [] } },
          { mailboxes: { $exists: true, $ne: [] } }
        ]
      });

      console.log(`Found ${campaigns.length} campaigns with legacy mailbox references`);

      for (let i = 0; i < campaigns.length; i += batchSize) {
        const batch = campaigns.slice(i, i + batchSize);
        
        for (const campaign of batch) {
          try {
            await this.standardizeCampaignMailboxes(campaign._id);
            migrated++;
          } catch (error) {
            console.error(`Error migrating campaign ${campaign._id}:`, error.message);
            errors.push({
              campaignId: campaign._id,
              error: error.message
            });
          }
          processed++;
        }

        // Small delay between batches
        if (i + batchSize < campaigns.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      console.log(`✓ Migration complete: ${migrated}/${processed} campaigns migrated`);
      if (errors.length > 0) {
        console.log(`✗ ${errors.length} errors occurred during migration`);
      }

      return {
        total: campaigns.length,
        processed,
        migrated,
        errors
      };

    } catch (error) {
      console.error('✗ Migration failed:', error.message);
      throw error;
    }
  }

  /**
   * Get all active mailboxes
   */
  async getAllActiveMailboxes() {
    await this.initialize();
    return Array.from(this.mailboxCache.values()).filter(m => m.active);
  }

  /**
   * Clear cache (useful for testing or after mailbox updates)
   */
  clearCache() {
    this.mailboxCache.clear();
    this.initialized = false;
  }
}

// Export singleton instance
module.exports = new MailboxService();
