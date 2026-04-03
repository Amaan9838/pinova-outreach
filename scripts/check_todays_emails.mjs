import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dns from 'node:dns';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

const FALLBACK_DNS_SERVERS = ['8.8.8.8', '8.8.4.4', '1.1.1.1'];
function ensureMongoDnsResolution(uri) {
  if (!uri?.startsWith('mongodb+srv://')) return;
  try { dns.setServers(FALLBACK_DNS_SERVERS); } catch (e) {}
}

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pinova-mail';
ensureMongoDnsResolution(MONGODB_URI);

console.log('Connecting to MongoDB...');
try {
  await mongoose.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  });
  console.log('✅ Connected to MongoDB\n');
} catch (error) {
  console.error('❌ MongoDB connection failed:', error.message);
  process.exit(1);
}

const CampaignProspect = mongoose.model('CampaignProspect', new mongoose.Schema({}, { strict: false }));
const Campaign = mongoose.model('Campaign', new mongoose.Schema({}, { strict: false }));
const Mailbox = mongoose.model('Mailbox', new mongoose.Schema({}, { strict: false }));

const today = new Date();
today.setHours(0, 0, 0, 0);
const tomorrow = new Date(today);
tomorrow.setDate(tomorrow.getDate() + 1);

console.log(`\n📅 Checking emails scheduled for: ${today.toDateString()}\n`);

// Get all active campaigns
const campaigns = await Campaign.find({ status: { $in: ['active', 'scheduled'] } });

if (campaigns.length === 0) {
  console.log('❌ No active campaigns found.\n');
  await mongoose.disconnect();
  process.exit(0);
}

// Get all mailboxes
const mailboxes = await Mailbox.find({});
const mailboxMap = {};
mailboxes.forEach(mb => {
  mailboxMap[mb._id.toString()] = {
    name: mb.fromName,
    email: mb.fromEmail,
    dailyCap: mb.dailyCap,
    dailySent: mb.dailySent || 0,
    campaigns: []
  };
});

console.log('📬 MAILBOX SUMMARY:\n');

for (const campaign of campaigns) {
  // Check v2 engine leads
  const v2Leads = await CampaignProspect.find({
    campaign: campaign._id,
    v2State: { $nin: ['bounced', 'failed', 'stopped', 'completed', null] },
    stopFlag: false,
    nextActionAt: { $gte: today, $lt: tomorrow }
  });

  // Check legacy leads
  const legacyLeads = await CampaignProspect.find({
    campaign: campaign._id,
    status: { $in: ['pending', 'active'] },
    nextSendAt: { $gte: today, $lt: tomorrow }
  });

  const totalLeads = v2Leads.length + legacyLeads.length;

  if (totalLeads > 0) {
    // Determine which mailbox(es) this campaign uses
    const mailboxIds = [];
    
    if (campaign.options?.selectedMailbox) {
      mailboxIds.push(campaign.options.selectedMailbox.toString());
    }
    
    if (campaign.mailboxes && campaign.mailboxes.length > 0) {
      campaign.mailboxes.forEach(mb => mailboxIds.push(mb.toString()));
    }

    // Add to each mailbox
    mailboxIds.forEach(mbId => {
      if (mailboxMap[mbId]) {
        mailboxMap[mbId].campaigns.push({
          name: campaign.name,
          id: campaign._id.toString(),
          emailsToday: totalLeads,
          v2: v2Leads.length,
          legacy: legacyLeads.length
        });
      }
    });
  }
}

// Display results
let grandTotal = 0;

for (const [mbId, data] of Object.entries(mailboxMap)) {
  const totalForMailbox = data.campaigns.reduce((sum, c) => sum + c.emailsToday, 0);
  grandTotal += totalForMailbox;

  console.log(`📧 ${data.name} <${data.email}>`);
  console.log(`   Daily Cap: ${data.dailyCap} | Already Sent Today: ${data.dailySent}`);
  console.log(`   📊 Total Scheduled Today: ${totalForMailbox} emails`);
  
  if (data.campaigns.length > 0) {
    console.log(`   📋 Campaigns:`);
    data.campaigns.forEach(c => {
      console.log(`      • ${c.name} (${c.emailsToday} emails)`);
      if (c.v2 > 0 && c.legacy > 0) {
        console.log(`        └─ v2: ${c.v2}, legacy: ${c.legacy}`);
      } else if (c.v2 > 0) {
        console.log(`        └─ v2 engine`);
      } else {
        console.log(`        └─ legacy engine`);
      }
    });
  } else {
    console.log(`   ℹ️  No campaigns scheduled`);
  }
  console.log('');
}

console.log(`\n🎯 GRAND TOTAL: ${grandTotal} emails scheduled for today\n`);

await mongoose.disconnect();
