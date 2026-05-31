import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import dns from 'node:dns';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const FALLBACK_DNS_SERVERS = ['8.8.8.8', '8.8.4.4', '1.1.1.1'];
function ensureMongoDnsResolution(uri) {
  if (!uri?.startsWith('mongodb+srv://')) return;
  try { dns.setServers(FALLBACK_DNS_SERVERS); } catch (e) {}
}

const MONGODB_URI = process.env.MONGODB_URI;
ensureMongoDnsResolution(MONGODB_URI);

import '../lib/models.js';
import Campaign from '../models/Campaign.js';
import CampaignProspect from '../models/CampaignProspect.js';

async function main() {
  try {
    console.log('Connecting to DB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected.');

    const campaign = await Campaign.findOne({ name: 'Deliverability & Tracking Test Campaign' });
    if (!campaign) {
      console.log('Campaign not found!');
      await mongoose.disconnect();
      return;
    }

    console.log('\n=== CAMPAIGN ===');
    console.log({
      id: campaign._id,
      name: campaign.name,
      status: campaign.status,
      useV2Engine: campaign.useV2Engine,
      mailboxes: campaign.mailboxes,
      scheduling: campaign.scheduling
    });

    const prospects = await CampaignProspect.find({ campaign: campaign._id }).populate('prospect');
    console.log(`\n=== CAMPAIGN PROSPECTS (${prospects.length}) ===`);
    prospects.forEach((cp, idx) => {
      console.log(`\nProspect #${idx + 1}:`);
      console.log({
        email: cp.prospect?.email,
        v2State: cp.v2State,
        status: cp.status,
        nextActionAt: cp.nextActionAt ? cp.nextActionAt.toISOString() : null,
        stopFlag: cp.stopFlag,
        processingLock: cp.processingLock,
        attemptCount: cp.attemptCount,
        failureCount: cp.failureCount,
        assignedMailbox: cp.assignedMailbox
      });
    });

    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

main();
