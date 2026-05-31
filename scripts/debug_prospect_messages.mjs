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
import Message from '../models/Message.js';
import Prospect from '../models/Prospect.js';

async function main() {
  try {
    console.log('Connecting to DB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected.');

    const prospects = await Prospect.find({ email: { $in: ['webitzee@gmail.com', 'mtwebsite1@gmail.com'] } });
    console.log(`Found prospects: ${prospects.map(p => p.email).join(', ')}`);

    for (const prospect of prospects) {
      console.log(`\n=== MESSAGES FOR ${prospect.email} ===`);
      const messages = await Message.find({ prospectId: prospect._id }).sort({ createdAt: -1 });
      messages.forEach((msg, idx) => {
        console.log(`\nMessage #${idx + 1}:`);
        console.log({
          id: msg._id,
          trackingId: msg.trackingId,
          subject: msg.subject,
          status: msg.status,
          processedReplyKeys: msg.processedReplyKeys,
          isResponse: msg.isResponse,
          createdAt: msg.createdAt,
          events: msg.events.map(e => ({ type: e.type, timestamp: e.timestamp, data: e.data }))
        });
      });
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

main();
