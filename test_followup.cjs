// ═══════════════════════════════════════════════════════════════════════════
// FOLLOW-UP TESTER — One command to test follow-ups instantly
//
// Usage:  node test_followup.cjs
//
// What it does:
//   1. Sets the lead's nextActionAt to RIGHT NOW
//   2. Calls your cron endpoint to trigger the engine
//   3. Shows you the result
//
// No DB knowledge needed. Just run it.
// ═══════════════════════════════════════════════════════════════════════════

const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
require('dotenv').config({ path: __dirname + '/.env' });
const { MongoClient, ObjectId } = require('mongodb');

// ─── CONFIG: Change these if you want to test a different lead ───────────
const CAMPAIGN_ID = '69a80e78f5366ce2334bda1f';
const LEAD_EMAIL  = 'mtwebsite1@gmail.com';
const CRON_URL    = process.env.NEXT_PUBLIC_APP_URL
  ? `${process.env.NEXT_PUBLIC_APP_URL}/api/cron/outreach-engine`
  : 'http://localhost:3000/api/cron/outreach-engine';
// ─────────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🚀 Follow-Up Tester');
  console.log('═'.repeat(60));

  // Step 1: Connect to DB
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db();
  console.log('✅ Connected to MongoDB');

  // Step 2: Find the lead
  const prospect = await db.collection('prospects').findOne({ email: LEAD_EMAIL });
  if (!prospect) {
    console.log(`❌ No prospect found with email: ${LEAD_EMAIL}`);
    await client.close();
    return;
  }

  const lead = await db.collection('campaignprospects').findOne({
    campaign: new ObjectId(CAMPAIGN_ID),
    prospect: prospect._id
  });

  if (!lead) {
    console.log(`❌ No lead found for campaign ${CAMPAIGN_ID} + email ${LEAD_EMAIL}`);
    await client.close();
    return;
  }

  console.log(`✅ Found lead: ${lead._id}`);
  console.log(`   State: ${lead.v2State}`);
  console.log(`   Attempt count: ${lead.attemptCount}`);
  console.log(`   Current nextActionAt: ${lead.nextActionAt}`);
  console.log(`   Thread subject: ${lead.threadSubject || 'NOT SET'}`);
  console.log(`   Thread messageId: ${lead.threadHeaderMessageId || 'NOT SET'}`);

  // Step 3: Set nextActionAt to RIGHT NOW (minus 1 minute to be safe)
  const rightNow = new Date(Date.now() - 60 * 1000); // 1 minute ago
  const result = await db.collection('campaignprospects').updateOne(
    { _id: lead._id },
    {
      $set: {
        nextActionAt: rightNow,
        processingLock: false,  // Clear any stale lock
      }
    }
  );

  if (result.modifiedCount === 1) {
    console.log(`\n✅ Updated nextActionAt to: ${rightNow.toISOString()}`);
    console.log('   (Set to 1 minute ago so cron picks it up immediately)');
  } else {
    console.log('⚠️  No update made — lead might already be at this time');
  }

  await client.close();

  // Step 4: Call the cron endpoint
  console.log(`\n🔄 Triggering cron at: ${CRON_URL}`);
  console.log('   (This will make the engine process the lead NOW)...\n');

  try {
    const cronKey = process.env.CRON_SECRET || '';
    const headers = { 'Content-Type': 'application/json' };
    if (cronKey) headers['Authorization'] = `Bearer ${cronKey}`;

    const resp = await fetch(CRON_URL, { method: 'GET', headers });
    const body = await resp.text();

    console.log(`📬 Cron response (${resp.status}):`);
    try {
      const json = JSON.parse(body);
      console.log(JSON.stringify(json, null, 2));
    } catch {
      console.log(body.substring(0, 500));
    }
  } catch (err) {
    console.log(`⚠️  Could not call cron: ${err.message}`);
    console.log('   That\'s okay! Just open this URL in your browser:');
    console.log(`   ${CRON_URL}`);
  }

  console.log('\n═'.repeat(60));
  console.log('✅ Done! Check your email inbox for the follow-up.');
  console.log('   Also check the engine logs in the V2 Engine tab.');
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
