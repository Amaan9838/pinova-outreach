import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import dns from 'node:dns';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

async function main() {
  try {
    await mongoose.connect(MONGODB_URI);
    const msg = await Message.findById('6a1c3e89665edd4c333b05c1');
    console.log(JSON.stringify(msg, null, 2));
    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

main();
