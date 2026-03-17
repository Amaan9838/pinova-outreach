import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import dns from 'node:dns';

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

const Campaign = mongoose.models.Campaign || mongoose.model('Campaign', new mongoose.Schema({ name: String }, { strict: false }));

async function listCampaignNames() {
  try {
    await mongoose.connect(MONGODB_URI);
    const names = await Campaign.find().distinct('name');
    console.log('All Campaign Names:\n', names.join('\n'));
    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}
listCampaignNames();
