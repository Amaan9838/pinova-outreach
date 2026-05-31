import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import dns from 'node:dns';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env files
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const FALLBACK_DNS_SERVERS = ['8.8.8.8', '8.8.4.4', '1.1.1.1'];
function ensureMongoDnsResolution(uri) {
  if (!uri?.startsWith('mongodb+srv://')) return;
  try { dns.setServers(FALLBACK_DNS_SERVERS); } catch (e) {}
}

const MONGODB_URI = process.env.MONGODB_URI;
ensureMongoDnsResolution(MONGODB_URI);

// Register mongoose models
import '../lib/models.js';
import Campaign from '../models/Campaign.js';
import Prospect from '../models/Prospect.js';
import CampaignProspect from '../models/CampaignProspect.js';
import MailboxFixed from '../models/MailboxFixed.js';

async function main() {
  try {
    if (!MONGODB_URI) {
      throw new Error('MONGODB_URI not found in environment');
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB connected.');

    // 1. Find the active mailbox sheikhamaan116@gmail.com
    const mailbox = await MailboxFixed.findOne({ fromEmail: 'sheikhamaan116@gmail.com', status: 'active' });
    if (!mailbox) {
      throw new Error('Active mailbox sheikhamaan116@gmail.com not found');
    }
    console.log(`Found active mailbox: ${mailbox.fromName} <${mailbox.fromEmail}>`);

    // 2. Find or create the Campaign
    const campaignName = 'Deliverability & Tracking Test Campaign';
    let campaign = await Campaign.findOne({ name: campaignName });
    
    // We set startDateTime to 19:08 IST today (Sunday).
    // IST is UTC + 5.5 hours, so 19:08 IST = 13:38 UTC.
    const now = new Date();
    const scheduledUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 13, 38, 0));
    console.log(`Scheduling next action at 19:08 IST / 13:38 UTC: ${scheduledUTC.toISOString()}`);

    const campaignData = {
      name: campaignName,
      persona: 'Amaan',
      goal: 'Verify raw MIME builder deliverability and open tracking end-to-end',
      useV2Engine: true,
      status: 'active',
      v2Timezone: 'Asia/Kolkata',
      v2BusinessHours: { startHour: 0, endHour: 23 },
      scheduling: {
        startDateTime: scheduledUTC,
        timezone: 'Asia/Kolkata',
        businessHours: {
          enabled: true,
          startTime: '00:00',
          endTime: '23:59',
          daysOfWeek: [0, 1, 2, 3, 4, 5, 6] // Include Sunday (0)
        },
        dailySendCap: 50,
        staggerSettings: {
          enabled: false // Disable stagger for immediate sequential processing in testing
        }
      },
      mailboxes: [mailbox._id],
      options: {
        selectedMailbox: mailbox._id,
        trackOpens: true,
        trackClicks: false,
        unsubscribeLink: false,
        dailyLimit: 50
      },
      v2Angles: [{ key: 'direct', description: 'Direct test campaign' }]
    };

    if (campaign) {
      console.log('Updating existing campaign...');
      campaign = await Campaign.findByIdAndUpdate(campaign._id, { $set: campaignData }, { new: true });
    } else {
      console.log('Creating new campaign...');
      campaign = await Campaign.create(campaignData);
    }
    console.log(`Campaign initialized: ${campaign._id}`);

    // 3. Create or update the two Prospects
    const prospectsData = [
      { email: 'webitzee@gmail.com', firstName: 'Webitzee', lastName: 'Team', company: 'Webitzee' },
      { email: 'mtwebsite1@gmail.com', firstName: 'MT', lastName: 'Website', company: 'MT Digital' }
    ];

    const prospects = [];
    for (const pData of prospectsData) {
      let prospect = await Prospect.findOne({ email: pData.email });
      if (prospect) {
        console.log(`Prospect ${pData.email} exists, updating...`);
        prospect = await Prospect.findByIdAndUpdate(prospect._id, { $set: pData }, { new: true });
      } else {
        console.log(`Creating prospect ${pData.email}...`);
        prospect = await Prospect.create(pData);
      }
      prospects.push(prospect);
    }

    // 4. Create or update CampaignProspect records
    const bestEmailTemplates = {
      'webitzee@gmail.com': {
        subject: 'Quick observation',
        body: 'Hi Webitzee,\n\nI was looking at your website and noticed a quick issue with the layout on mobile.\n\nI put together a quick mockup of how it should look. Want me to send it over?\n\nBest,\n[Name]'
      },
      'mtwebsite1@gmail.com': {
        subject: 'Quick observation',
        body: 'Hi MT,\n\nI was looking at your website and noticed a quick issue with the layout on mobile.\n\nI put together a quick mockup of how it should look. Want me to send it over?\n\nBest,\n[Name]'
      }
    };

    for (const prospect of prospects) {
      const template = bestEmailTemplates[prospect.email];
      const cpData = {
        campaign: campaign._id,
        prospect: prospect._id,
        customSubject: null,
        customBody: null,
        emailSteps: [{
          step: 1,
          subject: template.subject,
          body: template.body
        }],
        v2State: 'new', // Reset state so the engine processes it
        attemptCount: 0,
        failureCount: 0,
        stopFlag: false,
        processingLock: false,
        nextActionAt: scheduledUTC,
        assignedMailbox: mailbox._id
      };

      const existingCp = await CampaignProspect.findOne({ campaign: campaign._id, prospect: prospect._id });
      if (existingCp) {
        console.log(`CampaignProspect for ${prospect.email} exists, resetting for send...`);
        await CampaignProspect.findByIdAndUpdate(existingCp._id, { $set: cpData });
      } else {
        console.log(`Creating CampaignProspect for ${prospect.email}...`);
        await CampaignProspect.create(cpData);
      }
    }

    console.log('\n--- SETUP SUCCESSFUL ---');
    console.log('Real test campaign and prospects are configured in database.');
    console.log(`Emails scheduled to send at: ${scheduledUTC.toISOString()}`);
    console.log('The background outreach worker on EC2 will process them on the next tick after this time.');

    await mongoose.disconnect();
    console.log('Database disconnected.');
  } catch (err) {
    console.error('Failed to set up real tracking test:', err);
    process.exit(1);
  }
}

main();
