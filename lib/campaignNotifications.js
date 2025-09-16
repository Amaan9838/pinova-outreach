import dbConnect from './mongodb.js';

/**
 * Campaign Notification Service
 * 
 * Handles notifications for campaign status changes, validation failures, and scheduling events
 */
export class CampaignNotificationService {
  
  /**
   * Send notification for campaign status change
   * @param {Object} campaign - Campaign object
   * @param {string} previousStatus - Previous status
   * @param {Object} options - Notification options
   */
  static async notifyCampaignStatusChange(campaign, previousStatus, options = {}) {
    try {
      const notification = {
        type: 'campaign_status_change',
        campaignId: campaign._id,
        campaignName: campaign.name,
        previousStatus,
        newStatus: campaign.status,
        timestamp: new Date(),
        message: this.getStatusChangeMessage(campaign, previousStatus),
        priority: this.getStatusChangePriority(campaign.status, previousStatus)
      };
      
      // Store in-app notification
      await this.storeInAppNotification(notification);
      
      // Send external notifications if configured
      if (options.email) {
        await this.sendEmailNotification(notification, options.email);
      }
      
      if (options.webhook) {
        await this.sendWebhookNotification(notification, options.webhook);
      }
      
      console.log(`📢 Campaign notification sent: ${campaign.name} ${previousStatus} → ${campaign.status}`);
      
    } catch (error) {
      console.error('Failed to send campaign status notification:', error);
    }
  }
  
  /**
   * Send notification for validation failure
   * @param {Object} campaign - Campaign object
   * @param {Array} errors - Validation errors
   * @param {Object} options - Notification options
   */
  static async notifyValidationFailure(campaign, errors, options = {}) {
    try {
      const notification = {
        type: 'validation_failure',
        campaignId: campaign._id,
        campaignName: campaign.name,
        errors: errors.map(e => ({ code: e.code, message: e.message })),
        timestamp: new Date(),
        message: `Campaign "${campaign.name}" has ${errors.length} validation issue${errors.length > 1 ? 's' : ''}`,
        priority: 'high'
      };
      
      // Store in-app notification
      await this.storeInAppNotification(notification);
      
      // Send external notifications if configured
      if (options.email) {
        await this.sendEmailNotification(notification, options.email);
      }
      
      console.log(`⚠️ Validation failure notification sent for campaign: ${campaign.name}`);
      
    } catch (error) {
      console.error('Failed to send validation failure notification:', error);
    }
  }
  
  /**
   * Send notification for scheduling events
   * @param {Object} campaign - Campaign object
   * @param {string} event - Event type (scheduled, rescheduled, cancelled)
   * @param {Object} details - Event details
   * @param {Object} options - Notification options
   */
  static async notifySchedulingEvent(campaign, event, details = {}, options = {}) {
    try {
      const notification = {
        type: 'scheduling_event',
        campaignId: campaign._id,
        campaignName: campaign.name,
        event,
        details,
        timestamp: new Date(),
        message: this.getSchedulingEventMessage(campaign, event, details),
        priority: 'medium'
      };
      
      // Store in-app notification
      await this.storeInAppNotification(notification);
      
      console.log(`📅 Scheduling notification sent: ${campaign.name} - ${event}`);
      
    } catch (error) {
      console.error('Failed to send scheduling notification:', error);
    }
  }
  
  /**
   * Store in-app notification
   * @param {Object} notification - Notification object
   */
  static async storeInAppNotification(notification) {
    // For now, just log to console
    // In a real implementation, you would store this in a notifications collection
    console.log('📱 In-app notification:', {
      type: notification.type,
      message: notification.message,
      priority: notification.priority,
      timestamp: notification.timestamp
    });
    
    // TODO: Implement actual storage
    // const Notification = (await import('../models/Notification.js')).default;
    // await new Notification(notification).save();
  }
  
  /**
   * Send email notification
   * @param {Object} notification - Notification object
   * @param {string} email - Email address
   */
  static async sendEmailNotification(notification, email) {
    try {
      // TODO: Implement email sending
      console.log(`📧 Email notification would be sent to ${email}:`, notification.message);
      
      // Example implementation:
      // const emailContent = this.formatEmailNotification(notification);
      // await EmailService.send({
      //   to: email,
      //   subject: `Campaign Notification: ${notification.campaignName}`,
      //   html: emailContent
      // });
      
    } catch (error) {
      console.error('Failed to send email notification:', error);
    }
  }
  
  /**
   * Send webhook notification
   * @param {Object} notification - Notification object
   * @param {string} webhookUrl - Webhook URL
   */
  static async sendWebhookNotification(notification, webhookUrl) {
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Pinova-Campaign-Notifications/1.0'
        },
        body: JSON.stringify({
          event: notification.type,
          campaign: {
            id: notification.campaignId,
            name: notification.campaignName
          },
          data: notification,
          timestamp: notification.timestamp
        })
      });
      
      if (response.ok) {
        console.log(`🔗 Webhook notification sent to ${webhookUrl}`);
      } else {
        console.error(`Failed to send webhook notification: ${response.status} ${response.statusText}`);
      }
      
    } catch (error) {
      console.error('Failed to send webhook notification:', error);
    }
  }
  
  /**
   * Get status change message
   * @param {Object} campaign - Campaign object
   * @param {string} previousStatus - Previous status
   * @returns {string} Message
   */
  static getStatusChangeMessage(campaign, previousStatus) {
    const statusMessages = {
      'draft': 'Campaign is in draft mode',
      'pending_scheduled': 'Campaign is scheduled but has validation issues',
      'scheduled': 'Campaign is scheduled and ready',
      'active': 'Campaign is now active and sending emails',
      'paused': 'Campaign has been paused',
      'completed': 'Campaign has completed successfully',
      'failed': 'Campaign has failed due to errors',
      'cancelled': 'Campaign has been cancelled'
    };
    
    const newStatusMsg = statusMessages[campaign.status] || 'Status updated';
    return `Campaign "${campaign.name}" status changed from ${previousStatus} to ${campaign.status}. ${newStatusMsg}.`;
  }
  
  /**
   * Get status change priority
   * @param {string} newStatus - New status
   * @param {string} previousStatus - Previous status
   * @returns {string} Priority level
   */
  static getStatusChangePriority(newStatus, previousStatus) {
    const highPriorityStatuses = ['failed', 'cancelled'];
    const mediumPriorityStatuses = ['active', 'completed', 'pending_scheduled'];
    
    if (highPriorityStatuses.includes(newStatus)) {
      return 'high';
    } else if (mediumPriorityStatuses.includes(newStatus)) {
      return 'medium';
    } else {
      return 'low';
    }
  }
  
  /**
   * Get scheduling event message
   * @param {Object} campaign - Campaign object
   * @param {string} event - Event type
   * @param {Object} details - Event details
   * @returns {string} Message
   */
  static getSchedulingEventMessage(campaign, event, details) {
    switch (event) {
      case 'scheduled':
        return `Campaign "${campaign.name}" has been scheduled for ${details.startDateTime ? new Date(details.startDateTime).toLocaleString() : 'future execution'}.`;
      case 'rescheduled':
        return `Campaign "${campaign.name}" has been rescheduled to ${details.newStartDateTime ? new Date(details.newStartDateTime).toLocaleString() : 'a new time'}.`;
      case 'cancelled':
        return `Campaign "${campaign.name}" schedule has been cancelled.`;
      case 'auto_activated':
        return `Campaign "${campaign.name}" was automatically activated after validation passed.`;
      case 'retry_scheduled':
        return `Campaign "${campaign.name}" will retry activation in ${details.retryDelay || 'a few minutes'}.`;
      default:
        return `Campaign "${campaign.name}" scheduling event: ${event}.`;
    }
  }
  
  /**
   * Get unread notifications count
   * @param {string} userId - User ID (for future use)
   * @returns {number} Count of unread notifications
   */
  static async getUnreadCount(userId = null) {
    // TODO: Implement actual count from database
    return 0;
  }
  
  /**
   * Mark notifications as read
   * @param {Array} notificationIds - Notification IDs to mark as read
   */
  static async markAsRead(notificationIds) {
    // TODO: Implement marking notifications as read
    console.log(`Marking ${notificationIds.length} notifications as read`);
  }
}
