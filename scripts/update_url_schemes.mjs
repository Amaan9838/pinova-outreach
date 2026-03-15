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

// Prospect Schema Definition (minimal for updating)
const prospectSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  website: String,
  linkedin: String,
  instagram: String,
  facebook: String,
  zillow: String
}, { strict: false });

const Prospect = mongoose.models.Prospect || mongoose.model('Prospect', prospectSchema);

function ensureHttps(url) {
  if (!url || typeof url !== 'string') return url;
  url = url.trim();
  if (url === '') return url;
  if (!/^https?:\/\//i.test(url)) {
    return `https://${url}`;
  }
  return url;
}

async function fixUrlSchemes() {
  console.log('Connecting to MongoDB...');
  try {
    // Avoid hardcoding dbName so Mongoose correctly infer it from MONGODB_URI
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      family: 4
    });
    console.log('Connected to MongoDB successfully!');
    
    // Find all prospects
    const prospects = await Prospect.find({});
    console.log(`Found ${prospects.length} total prospects in the database.`);
    
    let updatedCount = 0;
    const updatePromises = prospects.map(async (prospect) => {
      let needsUpdate = false;
      const urlFields = ['website', 'linkedin', 'instagram', 'facebook', 'zillow'];

      urlFields.forEach((field) => {
        if (prospect[field] && typeof prospect[field] === 'string' && !/^https?:\/\//i.test(prospect[field])) {
          prospect[field] = `https://${prospect[field]}`;
          needsUpdate = true;
        }
      });

      if (needsUpdate) {
        await prospect.save();
        updatedCount++;
      }
    });

    await Promise.all(updatePromises);
    console.log(`Successfully updated ${updatedCount} Prospects with missing 'https://' scheme.`);

    // --- NEW: Update LinkedInLead URLs ---
    try {
      const LinkedInLeadSchema = new mongoose.Schema({
        linkedInUrl: { type: String, default: '', trim: true }
      }, { strict: false }); // strict:false allows finding without defining all fields
      
      const LinkedInLead = mongoose.models.LinkedInLead || mongoose.model('LinkedInLead', LinkedInLeadSchema);
      
      console.log('Fetching LinkedIn Leads from database...');
      const linkedinLeads = await LinkedInLead.find({});
      console.log(`Found ${linkedinLeads.length} total LinkedIn Leads.`);

      let linkedInUpdatedCount = 0;
      const linkedInUpdatePromises = linkedinLeads.map(async (lead) => {
        let needsUpdate = false;
        
        if (lead.linkedInUrl && typeof lead.linkedInUrl === 'string' && !/^https?:\/\//i.test(lead.linkedInUrl)) {
          lead.linkedInUrl = `https://${lead.linkedInUrl}`;
          needsUpdate = true;
        }

        if (needsUpdate) {
          await lead.save();
          linkedInUpdatedCount++;
        }
      });

      await Promise.all(linkedInUpdatePromises);
      console.log(`Successfully updated ${linkedInUpdatedCount} LinkedIn Leads with missing 'https://' scheme.`);
      
    } catch (llError) {
      console.error('Error updating LinkedIn Leads:', llError);
    }
    // -------------------------------------

  } catch (error) {
    console.error('Error updating URL schemes:', error);
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      console.log('MongoDB disconnected.');
    }
    process.exit(0);
  }
}

fixUrlSchemes();
