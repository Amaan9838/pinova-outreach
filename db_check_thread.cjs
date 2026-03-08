// Check threading data for a specific lead
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
require('dotenv').config({ path: __dirname + '/.env' });
const { MongoClient, ObjectId } = require('mongodb');
const fs = require('fs');

(async () => {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db();

  const campaignId = '69a80e78f5366ce2334bda1f';

  // 1. Get the lead
  const lead = await db.collection('campaignprospects').findOne({
    campaign: new ObjectId(campaignId),
  });

  console.log('\n=== LEAD THREADING DATA ===');
  console.log('threadHeaderMessageId:', lead?.threadHeaderMessageId || 'NOT SET');
  console.log('threadSubject:', lead?.threadSubject || 'NOT SET');
  console.log('attemptCount:', lead?.attemptCount);
  console.log('v2State:', lead?.v2State);
  console.log('nextActionAt:', lead?.nextActionAt);

  // 2. Get all messages sent to this lead's prospect
  const messages = await db.collection('messages')
    .find({ campaignId: new ObjectId(campaignId) })
    .sort({ createdAt: 1 })
    .toArray();

  console.log(`\n=== MESSAGES IN THIS CAMPAIGN (${messages.length}) ===`);
  messages.forEach((m, i) => {
    console.log(`\n--- Message ${i + 1} ---`);
    console.log('  subject:', m.subject);
    console.log('  headerMessageId:', m.headerMessageId || 'NOT SET');
    console.log('  references:', m.references || 'NOT SET');
    console.log('  status:', m.status);
    console.log('  sentAt:', m.createdAt);
    console.log('  content preview:', (m.content || '').substring(0, 100) + '...');
  });

  // Save full data
  const report = { lead: {
    threadHeaderMessageId: lead?.threadHeaderMessageId,
    threadSubject: lead?.threadSubject,
    attemptCount: lead?.attemptCount,
    v2State: lead?.v2State,
    nextActionAt: lead?.nextActionAt,
  }, messages: messages.map(m => ({
    subject: m.subject,
    headerMessageId: m.headerMessageId,
    references: m.references,
    status: m.status,
    createdAt: m.createdAt,
  })) };

  fs.writeFileSync('C:/tmp/thread_check.json', JSON.stringify(report, null, 2));
  console.log('\nFull report saved to C:/tmp/thread_check.json');

  await client.close();
})();
