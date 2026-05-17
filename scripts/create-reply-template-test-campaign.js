import 'dotenv/config';
import dns from 'node:dns';

dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

const { default: dbConnect } = await import('../lib/mongodb.js');
const { default: Campaign } = await import('../models/Campaign.js');
const { default: Prospect } = await import('../models/Prospect.js');
const { default: CampaignProspect } = await import('../models/CampaignProspect.js');
const { default: Mailbox } = await import('../models/MailboxFixed.js');
const { default: Message } = await import('../models/Message.js');
const { processLead } = await import('../lib/outreachEngine.js');

const senderEmails = ['sheikhamaan116@gmail.com', 'ethanwelbby@gmail.com'];
const recipients = [
  {
    email: 'mtwebsite1@gmail.com',
    firstName: 'Test',
    lastName: 'MTWebsite',
    company: 'MT Website'
  },
  {
    email: 'streamsaver.net@gmail.com',
    firstName: 'Test',
    lastName: 'StreamSaver',
    company: 'StreamSaver'
  }
];

const subjectTemplate = '{{firstName}}, your website preview';
const bodyTemplate = `{{firstName}},

Looked you up before reaching out. I noticed the current website experience has friction that can make it harder for buyers or visitors to get to the actual content quickly.

I redesigned the flow as a cleaner, faster preview so the visitor lands on the important parts immediately: the brand, the listings/services, and the next action.

If you reply to this email, I can send over the redesigned version within the next hour.

Want to see it?

- [Name]`;

function personalize(text, prospect) {
  return text.replace(/{{firstName}}/g, prospect.firstName);
}

async function main() {
  console.log('[test-campaign] Connecting to MongoDB...');
  await dbConnect();
  console.log('[test-campaign] MongoDB connected.');

  const mailboxes = [];
  for (const email of senderEmails) {
    const mailbox = await Mailbox.findOne({ fromEmail: email, status: 'active' });
    if (!mailbox) {
      throw new Error(`Active mailbox not found: ${email}`);
    }
    mailboxes.push(mailbox);
    console.log(`[test-campaign] Sender ready: ${mailbox.fromEmail}`);
  }

  const campaign = await Campaign.create({
    name: `Reply Template Test - ${new Date().toISOString()}`,
    description: 'Two-mailbox reply notification/template auto-reply test campaign',
    persona: 'Amaan testing reply automation',
    goal: 'Test that replies from test inboxes are detected and receive a fixed template auto-reply.',
    knowledgeBase: 'Testing only. Do not use AI auto-reply for this campaign.',
    status: 'active',
    useV2Engine: true,
    mailboxes: mailboxes.map((mailbox) => mailbox._id),
    options: {
      selectedMailbox: mailboxes[0]._id,
      trackOpens: true,
      trackClicks: true,
      unsubscribeLink: false,
      dailyLimit: 10
    },
    scheduling: {
      startDateTime: new Date(),
      timezone: 'Asia/Kolkata',
      businessHours: {
        enabled: false,
        startTime: '00:00',
        endTime: '23:59',
        daysOfWeek: [0, 1, 2, 3, 4, 5, 6]
      },
      dailySendCap: 10,
      staggerSettings: {
        enabled: false,
        baseDelayMinutes: 0,
        randomVariationMinutes: 0
      }
    },
    v2Timezone: 'Asia/Kolkata',
    v2BusinessHours: { startHour: 0, endHour: 23 },
    v2Limits: { dailySendLimit: 20, hourlySendLimit: 20, minGapMinutes: 0 },
    v2SendPacing: {
      enabled: false,
      minGapSeconds: 0,
      maxGapSeconds: 0,
      respectWarmScore: false
    },
    v2Delays: {
      baseDelayHours: 24,
      escalationMultiplier: 1.5,
      coolingPeriodDays: 30,
      maxAttemptsPerCycle: 1
    },
    v2Angles: [
      { key: 'test_preview', description: 'Test preview reply flow' },
      { key: 'test_access', description: 'Test access/friction message' },
      { key: 'test_speed', description: 'Test one-hour preview promise' }
    ]
  });

  console.log(`[test-campaign] Campaign created: ${campaign._id}`);

  const leadIds = [];
  for (let index = 0; index < recipients.length; index += 1) {
    const recipient = recipients[index];
    const mailbox = mailboxes[index];
    const prospect = await Prospect.findOneAndUpdate(
      { email: recipient.email },
      {
        $set: {
          firstName: recipient.firstName,
          lastName: recipient.lastName,
          company: recipient.company,
          source: 'manual',
          status: 'active'
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const lead = await CampaignProspect.create({
      campaign: campaign._id,
      prospect: prospect._id,
      v2State: 'new',
      status: 'pending',
      nextActionAt: new Date(),
      attemptCount: 0,
      failureCount: 0,
      stopFlag: false,
      processingLock: false,
      assignedMailbox: mailbox._id,
      emailSteps: [{
        step: 1,
        subject: personalize(subjectTemplate, recipient),
        body: personalize(bodyTemplate, recipient)
      }]
    });

    leadIds.push(lead._id.toString());
    console.log(`[test-campaign] Lead ${lead._id}: ${mailbox.fromEmail} -> ${recipient.email}`);
  }

  for (const leadId of leadIds) {
    console.log(`[test-campaign] Sending lead ${leadId}...`);
    await processLead(leadId);
  }

  const messages = await Message.find({ campaignId: campaign._id })
    .sort({ createdAt: 1 })
    .populate('mailboxId', 'fromEmail fromName')
    .populate('prospectId', 'email firstName lastName')
    .lean();

  console.log('\n[test-campaign] Results');
  console.log(`Campaign: ${campaign._id}`);
  for (const message of messages) {
    console.log([
      `- ${message.status.toUpperCase()}`,
      `from ${message.mailboxId?.fromEmail || 'unknown'}`,
      `to ${message.prospectId?.email || 'unknown'}`,
      `subject "${message.subject}"`,
      `message ${message._id}`
    ].join(' | '));
    if (message.errorMessage) {
      console.log(`  error: ${message.errorMessage}`);
    }
  }

  const failures = messages.filter((message) => message.status !== 'sent');
  if (messages.length !== recipients.length || failures.length > 0) {
    process.exitCode = 2;
  }
}

main()
  .catch((error) => {
    console.error('[test-campaign] Failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    const mongoose = await import('mongoose');
    await mongoose.default.disconnect().catch(() => {});
  });
