import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import dns from 'node:dns';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const FALLBACK_DNS_SERVERS = ['8.8.8.8', '8.8.4.4', '1.1.1.1'];

function ensureMongoDnsResolution(uri) {
  if (!uri?.startsWith('mongodb+srv://')) return;

  const currentServers = dns.getServers();
  const hasNonLoopbackDns = currentServers.some(
    (server) => server !== '127.0.0.1' && server !== '::1'
  );

  if (hasNonLoopbackDns) return;

  try {
    dns.setServers(FALLBACK_DNS_SERVERS);
  } catch (error) {
    console.warn('Failed to set fallback DNS servers for MongoDB:', error?.message || error);
  }
}

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('Please define the MONGODB_URI environment variable inside .env.local');
  process.exit(1);
}

ensureMongoDnsResolution(MONGODB_URI);

const LinkedInLeadSchema = new mongoose.Schema({}, { strict: false });
const LinkedInLead = mongoose.models.LinkedInLead || mongoose.model('LinkedInLead', LinkedInLeadSchema);

async function cleanLinkedInLeads() {
  console.log('Connecting to MongoDB...');
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      family: 4
    });
    console.log('Connected to MongoDB successfully!');
    
    const result = await LinkedInLead.deleteMany({});
    console.log(`Successfully deleted ${result.deletedCount} LinkedIn Leads from the database.`);
    
  } catch (error) {
    console.error('Error cleaning LinkedIn Leads:', error);
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      console.log('MongoDB disconnected.');
    }
    process.exit(0);
  }
}

cleanLinkedInLeads();
