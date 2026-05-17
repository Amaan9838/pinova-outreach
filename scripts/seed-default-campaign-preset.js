import 'dotenv/config';
import dns from 'node:dns';
import mongoose from 'mongoose';
import dbConnect from '../lib/mongodb.js';
import CampaignPreset from '../models/CampaignPreset.js';
import Mailbox from '../models/MailboxFixed.js';

dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

const FALLBACK_MAILBOXES = [
  'ethanwelbby@gmail.com',
  'mattkoleno@gmail.com',
  'raybuffet0@gmail.com',
  'sheikhamaan116@gmail.com',
  'silvyyayuuu@gmail.com',
  'tomferyy@gmail.com',
  'tracymilllyy@gmail.com'
];

const DEFAULT_MAILBOXES = (process.env.DEFAULT_CAMPAIGN_PRESET_MAILBOXES || FALLBACK_MAILBOXES.join(','))
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter((email) => email && email !== 'hello@pinova.in');

async function main() {
  await dbConnect();

  const mailboxQuery = DEFAULT_MAILBOXES.length > 0
      ? { fromEmail: { $in: DEFAULT_MAILBOXES, $ne: 'hello@pinova.in' }, status: 'active' }
      : { fromEmail: { $ne: 'hello@pinova.in' }, status: 'active' };

  const mailboxes = await Mailbox.find(mailboxQuery).sort({ fromEmail: 1 });
  if (mailboxes.length === 0) {
    throw new Error('No active mailboxes found for the default preset');
  }

  const preset = await CampaignPreset.findOneAndUpdate(
    { name: 'Default Outreach Review Preset' },
    {
      $set: {
        description: 'Default draft campaign settings for Claude output imports.',
        mailboxes: mailboxes.map((mailbox) => mailbox._id),
        options: {
          trackOpens: true,
          trackClicks: true,
          unsubscribeLink: false,
          dailyLimit: 40
        },
        scheduling: {
          timezone: 'America/New_York',
          businessHours: {
            enabled: true,
            startTime: '09:00',
            endTime: '17:00',
            daysOfWeek: [1, 2, 3, 4, 5]
          },
          dailySendCap: 40,
          staggerSettings: {
            enabled: true,
            baseDelayMinutes: 2,
            randomVariationMinutes: 1
          }
        },
        v2Limits: {
          dailySendLimit: 40,
          hourlySendLimit: 10,
          minGapMinutes: 3
        },
        v2Delays: {
          baseDelayHours: 24,
          escalationMultiplier: 1.5,
          coolingPeriodDays: 30,
          maxAttemptsPerCycle: 6
        },
        v2SendPacing: {
          enabled: true,
          minGapSeconds: 120,
          maxGapSeconds: 240,
          respectWarmScore: true
        }
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  console.log(`Preset ready: ${preset.name}`);
  console.log('Timezone: America/New_York');
  console.log(`Mailboxes: ${mailboxes.map((mailbox) => mailbox.fromEmail).join(', ')}`);
}

main()
  .catch((error) => {
    console.error('Failed to seed default campaign preset:', error.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => {});
  });
