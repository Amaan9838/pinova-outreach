import fs from 'fs';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import dns from 'node:dns';

// Define Prospect schema inline to avoid ESM/CJS require issues with Next.js models
const prospectSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  zillow: { type: String, default: '' },
  facebook: { type: String, default: '' },
  instagram: { type: String, default: '' },
  linkedin: { type: String, default: '' },
  website: { type: String, default: '' }
}, { strict: false });

const Prospect = mongoose.models.Prospect || mongoose.model('Prospect', prospectSchema);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
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

/**
 * Robust CSV parser. Handles quoted fields containing newlines and commas.
 */
function parseCSV(csv) {
  const rows = [];
  let currentField = '';
  let currentRow = [];
  let inQuotes = false;
  
  for (let i = 0; i < csv.length; i++) {
    const char = csv[i];
    const nextChar = csv[i + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      currentField += '"';
      i++; // Skip double quote escape
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentField.trim());
      currentField = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++; // skip \n
      }
      currentRow.push(currentField.trim());
      rows.push(currentRow);
      currentRow = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }
  
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    rows.push(currentRow);
  }

  return rows.filter(row => row.some(col => col.trim() !== ''));
}

async function main() {
  const csvFile = process.argv[2];
  if (!csvFile) {
    console.error('Usage: node update_social_links.mjs <path/to/csv>');
    process.exit(1);
  }

  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    console.error('Missing MONGODB_URI in .env.local');
    process.exit(1);
  }

  ensureMongoDnsResolution(MONGODB_URI);

  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('Connected.');

  console.log(`Reading CSV file: ${csvFile}`);
  const fileContent = fs.readFileSync(csvFile, 'utf8');
  
  const parsedRows = parseCSV(fileContent);
  if (parsedRows.length < 2) {
    console.error('CSV must have a header row and data.');
    process.exit(1);
  }
  
  const headers = parsedRows[0].map(h => {
    const clean = h.toLowerCase().trim();
    if (clean.includes('zillow')) return 'zillow';
    if (clean.includes('facebook')) return 'facebook';
    if (clean.includes('instagram')) return 'instagram';
    if (clean.includes('linkedin')) return 'linkedin';
    if (clean.includes('website')) return 'website';
    return clean;
  });
  const dataLines = parsedRows.slice(1);
  
  // Create array of row objects
  const records = dataLines.map(line => {
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = line[idx] || '';
    });
    return row;
  });
  
  let updatedCount = 0;
  let notFoundCount = 0;

  for (const record of records) {
    // lowercase headers for easy access
    const row = {};
    for (const [key, value] of Object.entries(record)) {
      row[key.toLowerCase().trim()] = value;
    }

    const email = row.email;
    if (!email) {
      console.warn('Skipping row with missing email:', record);
      continue;
    }

    // Build the update object dynamically based on what's in the CSV
    const update = {};
    const linkFields = ['zillow', 'facebook', 'linkedin', 'instagram', 'website'];
    
    for (const field of linkFields) {
      if (row[field]) {
        update[field] = row[field].trim();
      }
    }

    if (Object.keys(update).length === 0) {
      console.log(`No link fields found for email ${email}. Skipping.`);
      continue;
    }

    const result = await Prospect.updateOne(
      { email: email },
      { $set: update }
    );

    if (result.matchedCount > 0) {
      if (result.modifiedCount > 0) {
        console.log(`✅ Updated ${email} with `, update);
        updatedCount++;
      } else {
        console.log(`➖ No fields changed for ${email} (already up to date)`);
      }
    } else {
      console.log(`❌ Prospect not found for email: ${email}`);
      notFoundCount++;
    }
  }

  console.log('--- Summary ---');
  console.log(`Total processed: ${records.length}`);
  console.log(`Successfully updated: ${updatedCount}`);
  console.log(`Not found in DB: ${notFoundCount}`);

  await mongoose.disconnect();
}

main().catch(console.error);
