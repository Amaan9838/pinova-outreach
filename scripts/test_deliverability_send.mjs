import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import dns from 'node:dns';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env (first from parent directory, falling back to local)
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const FALLBACK_DNS_SERVERS = ['8.8.8.8', '8.8.4.4', '1.1.1.1'];
function ensureMongoDnsResolution(uri) {
  if (!uri?.startsWith('mongodb+srv://')) return;
  try { dns.setServers(FALLBACK_DNS_SERVERS); } catch (e) {}
}

const MONGODB_URI = process.env.MONGODB_URI;
ensureMongoDnsResolution(MONGODB_URI);

// Import models to ensure Mailbox model is registered
import '../lib/models.js';
import MailboxFixed from '../models/MailboxFixed.js';
import { SMTPService } from '../lib/smtp.js';

async function runTestSend() {
  try {
    if (!MONGODB_URI) {
      throw new Error('MONGODB_URI is not set in environment variables');
    }

    console.log('Connecting to database...');
    await mongoose.connect(MONGODB_URI);
    console.log('Database connected successfully.');

    // Find an active mailbox
    const mailboxes = await MailboxFixed.find({ status: 'active' });
    if (mailboxes.length === 0) {
      console.log('No active mailboxes found in the database. Listing all mailboxes:');
      const allMailboxes = await MailboxFixed.find({});
      allMailboxes.forEach(mb => {
        console.log(`- ${mb.fromEmail} (status: ${mb.status})`);
      });
      throw new Error('No active mailboxes available to send test email');
    }

    console.log('Available active mailboxes:');
    mailboxes.forEach((mb, index) => {
      console.log(`${index}: ${mb.fromName} <${mb.fromEmail}> (ISP: ${mb.isp})`);
    });

    // We will pick the first active mailbox, preferably sheikhamaan116@gmail.com if it's there
    let selectedMailbox = mailboxes.find(mb => mb.fromEmail.includes('sheikhamaan116@gmail.com')) || mailboxes[0];
    
    console.log(`\nSelected Mailbox: ${selectedMailbox.fromName} <${selectedMailbox.fromEmail}>`);

    const recipient = 'mtwebsite1@gmail.com';
    const trackingId = 'test-' + Date.now();
    console.log(`Sending test email to ${recipient} with tracking enabled...`);

    const result = await SMTPService.sendEmail({
      mailbox: selectedMailbox,
      to: recipient,
      subject: 'Test Email with Tracking from Pinova Mail System',
      html: `<div dir="ltr">Test Email with Tracking<br><br>This is a test email with tracking enabled from your Pinova Mail System.<br><br><b>Mailbox:</b> ${selectedMailbox.fromName} (${selectedMailbox.fromEmail})<br><b>Sent at:</b> ${new Date().toLocaleString()}<br><br>If you received this email, your SMTP configuration is working correctly!</div>`,
      text: `Test Email with Tracking - This is a test email with tracking enabled from your Pinova Mail System. Mailbox: ${selectedMailbox.fromName} (${selectedMailbox.fromEmail}). Sent at: ${new Date().toLocaleString()}. If you received this email, your SMTP configuration is working correctly!`,
      trackingId,
      disableTracking: false,
    });

    console.log('\n--- SEND RESULT ---');
    console.log(JSON.stringify(result, null, 2));

    await mongoose.disconnect();
    console.log('Database disconnected.');
  } catch (err) {
    console.error('Test run failed:', err);
    process.exit(1);
  }
}

runTestSend();
