import nodemailer from 'nodemailer';

export class SMTPService {
  static async sendEmail({ 
    mailbox,
    to, 
    subject, 
    html, 
    text, 
    trackingId, 
    messageId,
    headerMessageId,
    inReplyTo,
    references,
  }) {
    try {
      // Create transporter with mailbox SMTP configuration
      const transporterConfig = {
        host: mailbox.smtpConfiguration.host,
        port: mailbox.smtpConfiguration.port,
        name: mailbox.domain, // EHLO name for better deliverability
        auth: {
          user: mailbox.smtpConfiguration.user,
          pass: mailbox.smtpConfiguration.password,
        },
        // Additional options for better deliverability
        pool: true,
        maxConnections: 1,
        maxMessages: 1, // One message per connection to avoid bulk flags
        rateDelta: 1000, // 1 second between messages
        rateLimit: 1, // max 1 message per rateDelta
      };

      // Configure SSL/TLS based on port
      if (mailbox.smtpConfiguration.port === 465) {
        transporterConfig.secure = true;
      } else if (mailbox.smtpConfiguration.port === 587) {
        transporterConfig.secure = false;
        transporterConfig.requireTLS = true;
        // Removed obsolete SSLv3 cipher - let Nodemailer choose modern ciphers
      } else {
        transporterConfig.secure = mailbox.smtpConfiguration.secure;
      }

      // Add DKIM if configured
      if (mailbox.dkimPrivateKey) {
        transporterConfig.dkim = {
          domainName: mailbox.domain,
          keySelector: mailbox.dkimSelector || 'mail',
          privateKey: mailbox.dkimPrivateKey,
        };
      }

      const transporter = nodemailer.createTransport(transporterConfig);

      // DELIVERABILITY OPTIMIZATION:
      // Gmail categorizes emails based on patterns. To land in Primary:
      // 1. Keep HTML minimal (like a personal email)
      // 2. No marketing headers (removed List-Unsubscribe)
      // 3. Add conversation-style headers
      // 4. Small, invisible tracking pixel at the very end
      
      // Minimal tracking pixel - placed at end, invisible but trackable
      const trackingPixel = `<img src="${process.env.NEXT_PUBLIC_APP_URL}/api/track/open/${trackingId}.gif" width="1" height="1" border="0" style="display:block;width:1px;height:1px;">`;
      
      // Wrap in minimal HTML (no fancy styling = personal email feel)
      const htmlWithTracking = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;font-size:14px;color:#333;">
${html}
${trackingPixel}
</body>
</html>`;

      // Email options optimized for Primary inbox
      const mailOptions = {
        from: `${mailbox.fromName} <${mailbox.fromEmail}>`,
        envelope: { from: mailbox.fromEmail, to: to },
        to: to,
        subject: subject,
        // IMPORTANT: text first, html second - Gmail weighs this
        text: text,
        html: htmlWithTracking,
        replyTo: mailbox.fromEmail,
        headers: {
          // Personal email headers (not marketing)
          'X-Priority': '3', // Normal priority
          'X-Mailer': 'Microsoft Outlook 16.0', // Looks like personal email
          'X-MimeOLE': 'Produced By Microsoft MimeOLE',
          // Removed List-Unsubscribe as it triggers Promotions tab
        },
        // Unique message ID per email
        messageId: headerMessageId || `<${trackingId}@${mailbox.domain}>`,
        // Set priority to normal (not bulk)
        priority: 'normal',
      };

      if (inReplyTo) mailOptions.inReplyTo = inReplyTo;
      if (references && references.length) mailOptions.references = references;

      // Send email
      const info = await transporter.sendMail(mailOptions);
      
      // Close the transporter
      transporter.close();
      
      return {
      success: true,
      messageId: info.messageId,
      response: info.response,
        accepted: Array.isArray(info.accepted) && info.accepted.length > 0
      };

    } catch (error) {
      console.error('SMTP Error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  static async testConnection(smtpConfig) {
    try {
      console.log('Testing SMTP connection with config:', {
        host: smtpConfig.host,
        port: smtpConfig.port,
        user: smtpConfig.user,
        hasPassword: !!smtpConfig.password,
        secure: smtpConfig.secure
      });
      
      const transporterConfig = {
        host: smtpConfig.host,
        port: smtpConfig.port,
        auth: {
          user: smtpConfig.user,
          pass: smtpConfig.password,
        },
      };

      // Configure SSL/TLS based on port
      if (smtpConfig.port === 465) {
        // Port 465 uses direct SSL
        transporterConfig.secure = true;
      } else if (smtpConfig.port === 587) {
        // Port 587 uses STARTTLS
        transporterConfig.secure = false;
        transporterConfig.requireTLS = true;
        // Let Nodemailer choose modern ciphers (removed obsolete SSLv3)
      } else {
        // Use the provided secure setting for other ports
        transporterConfig.secure = smtpConfig.secure;
      }

      console.log('Transporter config:', {
        host: transporterConfig.host,
        port: transporterConfig.port,
        secure: transporterConfig.secure,
        requireTLS: transporterConfig.requireTLS,
        hasAuth: !!transporterConfig.auth
      });

      const transporter = nodemailer.createTransport(transporterConfig);

      // Verify connection
      await transporter.verify();
      transporter.close();

      return { success: true, message: 'SMTP connection successful' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async sendTestEmail(mailbox, testEmail) {
    try {
      const result = await this.sendEmail({
        mailbox,
        to: testEmail,
        subject: 'Test Email from Pinova Mail System',
        html: `
          <h2>Test Email</h2>
          <p>This is a test email from your Pinova Mail System.</p>
          <p><strong>Mailbox:</strong> ${mailbox.fromName} (${mailbox.fromEmail})</p>
          <p><strong>Sent at:</strong> ${new Date().toLocaleString()}</p>
          <p>If you received this email, your SMTP configuration is working correctly!</p>
        `,
        text: `Test Email - This is a test email from your Pinova Mail System. Mailbox: ${mailbox.fromName} (${mailbox.fromEmail}). Sent at: ${new Date().toLocaleString()}. If you received this email, your SMTP configuration is working correctly!`,
        trackingId: 'test-' + Date.now(),
        messageId: 'test-' + Date.now()
      });

      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}
