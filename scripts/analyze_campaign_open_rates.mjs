import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import dns from 'node:dns';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const FALLBACK_DNS_SERVERS = ['8.8.8.8', '8.8.4.4', '1.1.1.1'];
function ensureMongoDnsResolution(uri) {
  if (!uri?.startsWith('mongodb+srv://')) return;
  try { dns.setServers(FALLBACK_DNS_SERVERS); } catch (e) {}
}

const MONGODB_URI = process.env.MONGODB_URI;
ensureMongoDnsResolution(MONGODB_URI);

const CampaignSchema = new mongoose.Schema({ name: String }, { strict: false });
const MessageSchema = new mongoose.Schema({
  campaignId: mongoose.Schema.Types.ObjectId,
  status: String,
  sentAt: Date,
  openedAt: Date,
  events: Array
}, { strict: false });

const Campaign = mongoose.models.Campaign || mongoose.model('Campaign', CampaignSchema);
const Message = mongoose.models.Message || mongoose.model('Message', MessageSchema);

const CAMPAIGN_GROUPS = {
  "Money": /Money/i,
  "Busy Moment": /Busy Moment/i,
  "First Responder": /First-Responder/i,
  "Ghosting": /Ghosting/i,
  "Forgotten Lead": /Forgotten Lead/i
};

async function analyzeOpenRates() {
  console.log('Connecting to MongoDB...');
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB successfully!\n');
    
    // 1. Get all campaigns and filter by target names
    const allCampaigns = await Campaign.find({});
    const campaignToGroup = new Map();
    const groupStats = {};
    
    Object.keys(CAMPAIGN_GROUPS).forEach(group => {
      groupStats[group] = { sent: 0, opened: 0 };
    });

    allCampaigns.forEach(c => {
      for (const [group, regex] of Object.entries(CAMPAIGN_GROUPS)) {
        if (regex.test(c.name)) {
          campaignToGroup.set(c._id.toString(), group);
          break;
        }
      }
    });

    const targetCampaignIds = Array.from(campaignToGroup.keys()).map(id => new mongoose.Types.ObjectId(id));

    if (targetCampaignIds.length === 0) {
      console.log('No matching campaigns found in DB.');
      return;
    }

    // 2. Aggregate from Message collection using logic from campaign detail page
    const messages = await Message.find({
      campaignId: { $in: targetCampaignIds }
    });

    console.log(`Found ${messages.length} total messages for target campaigns.\n`);

    messages.forEach(m => {
      const group = campaignToGroup.get(m.campaignId.toString());
      if (group) {
        // Sent logic from app/campaigns/[id]/page.js
        const isSent = m.sentAt || (m.events && m.events.some(event => event.type === 'sent'));
        
        if (isSent) {
          groupStats[group].sent++;
          
          // Opened logic from app/campaigns/[id]/page.js
          const isOpened = m.openedAt || 
                           (m.events && m.events.some(event => event.type === 'opened')) ||
                           m.status === 'replied';
          
          if (isOpened) {
            groupStats[group].opened++;
          }
        }
      }
    });

    // 3. Calculate rates and sort
    const results = Object.entries(groupStats).map(([name, stats]) => {
      const openRate = stats.sent > 0 ? (stats.opened / stats.sent) * 100 : 0;
      return {
        Campaign: name,
        Sent: stats.sent,
        Opened: stats.opened,
        'Open Rate': openRate.toFixed(2) + '%'
      };
    }).sort((a, b) => parseFloat(b['Open Rate']) - parseFloat(a['Open Rate']));

    const outputPath = path.join('c:/CODING PHP/htdocs/pinova-outreach/tmp', 'campaign_analysis.json');
    if (!fs.existsSync(path.dirname(outputPath))) {
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    }
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
    console.log(`Results written to ${outputPath}\n`);
    
    results.forEach(r => {
      console.log(`${r.Campaign.padEnd(20)} | Sent: ${String(r.Sent).padStart(5)} | Opened: ${String(r.Opened).padStart(5)} | Rate: ${r['Open Rate']}`);
    });

    if (results.length > 0 && results[0].Sent > 0) {
      console.log(`\n🏆 Winner: "${results[0].Campaign}" with an open rate of ${results[0]['Open Rate']}`);
    } else {
       console.log('\nNo matching messages found for these campaigns.');
    }
    
  } catch (error) {
    console.error('Error analyzing campaigns:', error);
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    process.exit(0);
  }
}

analyzeOpenRates();
