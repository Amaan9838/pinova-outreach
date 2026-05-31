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
import MailboxFixed from '../models/MailboxFixed.js';

async function main() {
  try {
    console.log('Connecting to DB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected.');

    const mailboxes = await MailboxFixed.find({});
    console.log('\n=== MAILBOXES ===');
    mailboxes.forEach(mb => {
      console.log({
        email: mb.fromEmail,
        status: mb.status,
        lastProcessedUid: mb.lastProcessedUid,
        updatedAt: mb.updatedAt
      });
    });

    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

main();
