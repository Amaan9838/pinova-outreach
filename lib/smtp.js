import nodemailer from 'nodemailer';
import { buildTrackingUrl } from './tracking.js';

export class SMTPService {
  static async sendEmail({ 
    mailbox,
    to, 
    subject, 
    html, 
    text, 
    trackingId, 
    messageId,       // unused — kept for backward compat
    headerMessageId, // unused — kept for backward compat
    inReplyTo,
    references,
    disableTracking = true,  // Default: OFF — re-enable when custom tracking domain is set
  }) {
    try {
      // Create transporter with mailbox SMTP configuration
      // DELIVERABILITY RULES:
      // 1. Don't set 'name' (EHLO hostname) — defaults to OS hostname.
      //    Setting it to mailbox.domain (e.g. 'gmail.com') impersonates
      //    Google's servers in Received: headers → spam signal.
      // 2. Don't pool — open one connection, send one email, close.
      //    pool:true + maxMessages:1 creates connect/disconnect churn
      //    that looks like automated tooling to Gmail.
      const transporterConfig = {
        host: mailbox.smtpConfiguration.host,
        port: mailbox.smtpConfiguration.port,
        auth: {
          user: mailbox.smtpConfiguration.user,
          pass: mailbox.smtpConfiguration.password,
        },
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

      // ── TRACKING PIXEL — DISABLED BY DEFAULT FOR DELIVERABILITY ──────────
      // The tracking pixel loads a 1x1 image from TRACKING_DOMAIN (currently
      // a Vercel deployment URL). This cross-domain image embed is a known
      // spam signal when the tracking domain doesn't match the sender domain.
      // Disable by default; re-enable per-campaign once a custom tracking
      // subdomain (e.g. trk.yourdomain.com) is configured.
      let htmlWithTracking;
      if (disableTracking) {
        htmlWithTracking = html;
      } else {
        const trackingPixel = `<img src="${buildTrackingUrl(`/api/track/open/${trackingId}.gif`)}" width="1" height="1" alt="" style="border:0;">`;
        htmlWithTracking = `${html}${trackingPixel}`;
      }

      // ── MAIL OPTIONS — MATCH NORMAL EMAIL CLIENT BEHAVIOR ─────────────────
      // Gmail web and email clients (Thunderbird, Apple Mail) do NOT set:
      //   • envelope — Nodemailer derives it correctly from from/to
      //   • replyTo — redundant when it matches 'from', signals automation
      //   • priority — adds X-Priority, X-MSMail-Priority, Importance headers
      //                that personal emails NEVER have
      //   • messageId — let SMTP server generate its own; custom IDs like
      //                 <trackingId@gmail.com> impersonate the provider
      //   • custom headers — no X-Mailer, X-MimeOLE, etc.
      const mailOptions = {
        from: `${mailbox.fromName} <${mailbox.fromEmail}>`,
        to: to,
        subject: subject,
        text: text,
        html: htmlWithTracking,
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
