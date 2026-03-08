/**
 * Creates a test campaign for testing initial email + follow-up threading.
 * 
 * Usage: node create_test_campaign.cjs
 * 
 * This will:
 * 1. Find the "Amaan" mailbox
 * 2. Create a test campaign with V2 engine enabled
 * 3. Add a test prospect (sends to your own email)
 * 4. Set nextActionAt = now so you can trigger it immediately
 */

require('dotenv').config({ path: '.env.local' });
if (!process.env.MONGODB_URI) {
  require('dotenv').config(); // fallback to .env
}

const { MongoClient, ObjectId } = require('mongodb');

const TARGET_EMAIL = 'mtwebsite1@gmail.com'; // The test recipient

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  console.log('✅ Connected to MongoDB');

  const db = client.db();

  // 1. Find Amaan's mailbox
  const mailbox = await db.collection('mailboxes').findOne({
    $or: [
      { fromName: { $regex: /amaan/i } },
      { fromEmail: { $regex: /amaan/i } }
    ]
  });

  if (!mailbox) {
    console.error('❌ Could not find Amaan mailbox. Available mailboxes:');
    const all = await db.collection('mailboxes').find({}, { projection: { fromName: 1, fromEmail: 1 } }).toArray();
    all.forEach(m => console.log(`  - ${m.fromName} <${m.fromEmail}>`));
    process.exit(1);
  }

  console.log(`✅ Found mailbox: ${mailbox.fromName} <${mailbox.fromEmail}>`);

  // 2. Find or create the test prospect
  let prospect = await db.collection('prospects').findOne({ email: TARGET_EMAIL });
  if (!prospect) {
    const result = await db.collection('prospects').insertOne({
      email: TARGET_EMAIL,
      firstName: 'Test',
      lastName: 'Threading',
      company: 'Threading Test Co',
      status: 'active',
      userId: mailbox.userId,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    prospect = { _id: result.insertedId, email: TARGET_EMAIL, firstName: 'Test', lastName: 'Threading' };
    console.log(`✅ Created test prospect: ${prospect._id}`);
  } else {
    console.log(`✅ Found existing prospect: ${prospect._id} (${prospect.firstName} ${prospect.lastName})`);
  }

  // 3. Create the test campaign
  const campaignId = new ObjectId();
  const campaign = {
    _id: campaignId,
    name: `🧪 Threading Test - ${new Date().toLocaleDateString()}`,
    status: 'active',
    useV2Engine: true,
    mailbox: mailbox._id,
    userId: mailbox.userId,
    startedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    
    // V2 engine flow data with initial email + 1 follow-up
    flowData: {
      nodes: [
        {
          id: 'start-1',
          type: 'start',
          data: { label: 'Start' },
          position: { x: 250, y: 0 }
        },
        {
          id: 'email-1',
          type: 'email',
          data: {
            label: 'Initial Email',
            subject: 'Quick question about {{company}}',
            body: 'Hi {{firstName}},\n\nI came across {{company}} and was impressed by what you\'re building.\n\nWould you be open to a quick chat this week?\n\nBest,\nAmaan',
            useAI: false
          },
          position: { x: 250, y: 100 }
        },
        {
          id: 'delay-1',
          type: 'delay',
          data: {
            label: 'Wait 1 day',
            delayDays: 1,
            delayHours: 0
          },
          position: { x: 250, y: 200 }
        },
        {
          id: 'email-2',
          type: 'email',
          data: {
            label: 'Follow-up',
            subject: 'Re: Quick question about {{company}}',
            body: 'Hi {{firstName}},\n\nJust following up on my previous email. I\'d love to connect if you have a few minutes.\n\nLet me know!\n\nBest,\nAmaan',
            useAI: false
          },
          position: { x: 250, y: 300 }
        }
      ],
      edges: [
        { id: 'e1', source: 'start-1', target: 'email-1' },
        { id: 'e2', source: 'email-1', target: 'delay-1' },
        { id: 'e3', source: 'delay-1', target: 'email-2' }
      ]
    },

    scheduling: {
      timezone: 'Asia/Kolkata',
      businessHoursStart: '09:00',
      businessHoursEnd: '18:00',
      businessDays: [1, 2, 3, 4, 5]
    },

    settings: {
      dailySendLimit: 50,
      trackOpens: true,
      trackClicks: true
    }
  };

  await db.collection('campaigns').insertOne(campaign);
  console.log(`✅ Created campaign: ${campaignId}`);
  console.log(`   Name: ${campaign.name}`);

  // 4. Create the CampaignProspect (lead) — ready to send NOW
  const leadId = new ObjectId();
  const lead = {
    _id: leadId,
    campaign: campaignId,
    prospect: prospect._id,
    status: 'active',
    v2State: 'new',
    nextActionAt: new Date(), // Due NOW
    attemptCount: 0,
    failureCount: 0,
    stopFlag: false,
    processingLock: false,
    emailsSent: 0,
    emailsOpened: 0,
    emailsClicked: 0,
    emailsReplied: 0,
    startedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date()
  };

  await db.collection('campaignprospects').insertOne(lead);
  console.log(`✅ Created lead: ${leadId} (ready to send NOW)`);

  console.log('\n════════════════════════════════════════════════════════════');
  console.log('🎯 TEST CAMPAIGN READY!');
  console.log('════════════════════════════════════════════════════════════');
  console.log(`Campaign ID: ${campaignId}`);
  console.log(`Lead ID:     ${leadId}`);
  console.log(`Recipient:   ${TARGET_EMAIL}`);
  console.log(`Mailbox:     ${mailbox.fromName} <${mailbox.fromEmail}>`);
  console.log('');
  console.log('📧 Step 1: Send the initial email');
  console.log('   Run: node test_followup.cjs');
  console.log('   (or trigger cron manually)');
  console.log('');
  console.log('📧 Step 2: After receiving the initial email, test the follow-up');
  console.log('   Run: node test_followup.cjs');
  console.log('   The follow-up should appear IN THE SAME THREAD');
  console.log('════════════════════════════════════════════════════════════');

  await client.close();
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
