import AWS from 'aws-sdk';
import { buildTrackingUrl } from './tracking.js';

const ses = new AWS.SES({
  region: process.env.AWS_REGION || 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

export class SESService {
  static async sendEmail({ 
    from, 
    to, 
    subject, 
    html, 
    text, 
    trackingId, 
    messageId,
    replyTo 
  }) {
    try {
      // Add tracking pixel to HTML content
      const trackingPixel = `<img src="${buildTrackingUrl(`/api/track/open/${trackingId}`)}" width="1" height="1" style="display:none;">`;
      const htmlWithTracking = html + trackingPixel;

      const params = {
        Source: from,
        Destination: {
          ToAddresses: [to],
        },
        Message: {
          Subject: {
            Data: subject,
            Charset: 'UTF-8',
          },
          Body: {
            Html: {
              Data: htmlWithTracking,
              Charset: 'UTF-8',
            },
            Text: {
              Data: text,
              Charset: 'UTF-8',
            },
          },
        },
        ReplyToAddresses: replyTo ? [replyTo] : [from],
        Tags: [
          {
            Name: 'TrackingId',
            Value: trackingId,
          },
          {
            Name: 'MessageId',
            Value: messageId,
          },
        ],
      };

      const result = await ses.sendEmail(params).promise();
      
      return {
        success: true,
        messageId: result.MessageId,
        sesMessageId: result.MessageId,
      };
    } catch (error) {
      console.error('SES Error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  static async verifyEmailAddress(email) {
    try {
      const params = {
        EmailAddress: email,
      };
      
      await ses.verifyEmailIdentity(params).promise();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async getSendQuota() {
    try {
      const result = await ses.getSendQuota().promise();
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async getSendStatistics() {
    try {
      const result = await ses.getSendStatistics().promise();
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}
