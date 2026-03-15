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

// Setup DNS fallback logic to avoid ECONNREFUSED issues on Windows
function ensureMongoDnsResolution() {
  const originalLookup = dns.lookup;
  dns.lookup = (hostname, options, callback) => {
    let cb = callback;
    let opts = options;
    if (typeof options === 'function') {
      cb = options;
      opts = {};
    }

    originalLookup(hostname, opts, (err, address, family) => {
      if (err) {
        console.warn(`[DNS Fallback] Standard lookup failed for ${hostname}. Trying fallback DNS (8.8.8.8)...`);
        dns.setServers(['8.8.8.8', '8.8.4.4']);
        dns.resolve(hostname, (resolveErr, addresses) => {
          if (resolveErr || !addresses || addresses.length === 0) {
            console.error(`[DNS Fallback] Fully failed to resolve ${hostname}`);
            return cb(err || resolveErr);
          }
          const ipv4Result = addresses.find(a => a.includes('.')) || addresses[0];
          console.log(`[DNS Fallback] Successfully resolved ${hostname} to ${ipv4Result}`);
          cb(null, ipv4Result, ipv4Result.includes(':') ? 6 : 4);
        });
      } else {
        cb(err, address, family);
      }
    });
  };
}

ensureMongoDnsResolution();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('Please define the MONGODB_URI environment variable inside .env.local');
  process.exit(1);
}

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
    
    const fieldsToUpdate = ['website', 'linkedin', 'instagram', 'facebook', 'zillow'];

    for (const prospect of prospects) {
      let isUpdated = false;

      for (const field of fieldsToUpdate) {
        if (prospect[field] && typeof prospect[field] === 'string') {
          const original = prospect[field];
          const sanitized = ensureHttps(original);

          if (original !== sanitized) {
            prospect[field] = sanitized;
            isUpdated = true;
          }
        }
      }

      if (isUpdated) {
        try {
          // Use updateOne to bypass strict validation in script
          await Prospect.updateOne({ _id: prospect._id }, { $set: {
            website: prospect.website,
            linkedin: prospect.linkedin,
            instagram: prospect.instagram,
            facebook: prospect.facebook,
            zillow: prospect.zillow
          }});
          updatedCount++;
          console.log(`Updated URLs for: ${prospect.email}`);
        } catch (saveError) {
          console.error(`Failed to update ${prospect.email}:`, saveError.message);
        }
      }
    }
    
    console.log('\n=====================================');
    console.log(`SUCCESS! Fixed URL schemes for ${updatedCount} prospects.`);
    console.log('=====================================\n');

  } catch (error) {
    console.error('Fatal Error:', error);
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      console.log('Disconnected from MongoDB.');
    }
  }
}

fixUrlSchemes();
