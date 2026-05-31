import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { buildTrackingUrl } from './tracking.js';

// ─────────────────────────────────────────────────────────────────────────────
// RAW EMAIL BUILDER — Gmail-style MIME structure
// ─────────────────────────────────────────────────────────────────────────────
// Nodemailer's MIME builder generates emails with detectable fingerprints:
//
//   Nodemailer                          Gmail Web
//   ─────────────────────────────────   ─────────────────────────────────
//   Boundary: ----=_Part_123_456.789    Boundary: 000000000000abcd1234
//   charset=utf-8                       charset="UTF-8"
//   Content-Transfer-Encoding: 7bit     (omitted for ASCII)
//   Content-Type first in headers       MIME-Version first in headers
//
// Gmail's spam classifier detects these differences and treats externally-
// constructed emails with lower trust, especially for cold outreach content.
//
// Solution: Build the raw RFC 2822 email ourselves in Gmail's exact format,
// then pass it to Nodemailer with the `raw` option to bypass its MIME builder.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build a raw RFC 2822 email that matches Gmail web's MIME structure.
 * The email is returned as a string ready to be passed to Nodemailer's raw option.
 */
function buildRawEmail({ from, to, subject, text, html, inReplyTo, references }) {
  // Gmail boundary format: 20 hex digits (not Nodemailer's ----=_Part_xxx)
  const boundary = '000000000000' + crypto.randomBytes(4).toString('hex');

  // RFC 2822 date format
  const date = new Date().toUTCString().replace('GMT', '+0000');

  // Headers in Gmail's ordering
  const headers = [
    'MIME-Version: 1.0',
    `Date: ${date}`,
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
  ];

  // Threading headers (only present on follow-ups)
  if (inReplyTo) headers.push(`In-Reply-To: ${inReplyTo}`);
  if (references && references.length > 0) {
    headers.push(`References: ${references.join(' ')}`);
  }

  // Content-Type last in headers (Gmail's order)
  headers.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);

  // MIME body parts — match Gmail's structure:
  // • charset="UTF-8" (quoted, uppercase) not charset=utf-8
  // • No Content-Transfer-Encoding header (Gmail omits for ASCII)
  const body = [
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    '',
    text,
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    '',
    html,
    '',
    `--${boundary}--`,
  ];

  return headers.join('\r\n') + '\r\n\r\n' + body.join('\r\n');
}

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
      // ── TRANSPORTER CONFIG ─────────────────────────────────────────────────
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

      // ── TRACKING PIXEL (disabled by default) ───────────────────────────────
      let htmlWithTracking;
      if (disableTracking) {
        htmlWithTracking = html;
      } else {
        const trackingPixel = `<img src="${buildTrackingUrl(`/api/track/open/${trackingId}.gif`)}" width="1" height="1" alt="" style="border:0;">`;
        htmlWithTracking = `${html}${trackingPixel}`;
      }

      // ── BUILD RAW EMAIL IN GMAIL'S FORMAT ──────────────────────────────────
      // Bypass Nodemailer's MIME builder entirely. This eliminates the
      // detectable Nodemailer fingerprint (boundary format, charset casing,
      // Content-Transfer-Encoding) that Gmail's spam classifier flags on
      // cold outreach emails.
      const rawMessage = buildRawEmail({
        from: `${mailbox.fromName} <${mailbox.fromEmail}>`,
        to,
        subject,
        text,
        html: htmlWithTracking,
        inReplyTo,
        references,
      });

      // Use Nodemailer's raw mode — sends our message as-is through SMTP,
      // only using the envelope for SMTP MAIL FROM / RCPT TO commands.
      const mailOptions = {
        envelope: {
          from: mailbox.fromEmail,
          to: to,
        },
        raw: rawMessage,
      };

      // Send email
      const info = await transporter.sendMail(mailOptions);

      // Close the transporter
      transporter.close();

      return {
        success: true,
        messageId: info.messageId,
        response: info.response,
        accepted: Array.isArray(info.accepted) && info.accepted.length > 0,
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
        transporterConfig.secure = true;
      } else if (smtpConfig.port === 587) {
        transporterConfig.secure = false;
        transporterConfig.requireTLS = true;
      } else {
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
        html: `<div dir="ltr">Test Email<br><br>This is a test email from your Pinova Mail System.<br><br><b>Mailbox:</b> ${mailbox.fromName} (${mailbox.fromEmail})<br><b>Sent at:</b> ${new Date().toLocaleString()}<br><br>If you received this email, your SMTP configuration is working correctly!</div>`,
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
