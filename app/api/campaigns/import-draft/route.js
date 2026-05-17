import dbConnect from '../../../../lib/mongodb.js';
import Campaign from '../../../../models/Campaign.js';
import CampaignPreset from '../../../../models/CampaignPreset.js';
import Mailbox from '../../../../models/MailboxFixed.js';
import { importClaudeCsvToCampaign, validateClaudeCsv } from '../../../../lib/campaignCsvImport.js';

export const dynamic = 'force-dynamic';

function normalizePresetDoc(preset) {
  if (!preset) return null;
  return typeof preset.toObject === 'function' ? preset.toObject() : preset;
}

function getHourFromTime(value, fallback) {
  const hour = Number.parseInt(String(value || '').split(':')[0], 10);
  return Number.isFinite(hour) ? hour : fallback;
}

const DEFAULT_PRESET_MAILBOXES = [
  'ethanwelbby@gmail.com',
  'mattkoleno@gmail.com',
  'raybuffet0@gmail.com',
  'sheikhamaan116@gmail.com',
  'silvyyayuuu@gmail.com',
  'tomferyy@gmail.com',
  'tracymilllyy@gmail.com'
];

async function resolveDefaultPreset() {
  let preset = await CampaignPreset.findOne({ name: 'Default Outreach Review Preset' });
  if (preset) return preset;

  const mailboxes = await Mailbox.find({
    fromEmail: { $in: DEFAULT_PRESET_MAILBOXES, $ne: 'hello@pinova.in' },
    status: 'active'
  }).sort({ fromEmail: 1 });

  if (mailboxes.length === 0) return null;

  return CampaignPreset.create({
    name: 'Default Outreach Review Preset',
    description: 'Default draft campaign settings for Claude output imports.',
    mailboxes: mailboxes.map((mailbox) => mailbox._id),
    scheduling: {
      timezone: 'America/New_York',
      businessHours: {
        enabled: true,
        startTime: '09:00',
        endTime: '17:00',
        daysOfWeek: [1, 2, 3, 4, 5]
      },
      dailySendCap: 40,
      staggerSettings: { enabled: true, baseDelayMinutes: 2, randomVariationMinutes: 1 }
    },
    options: { trackOpens: true, trackClicks: true, unsubscribeLink: false, dailyLimit: 40 }
  });
}

export async function POST(request) {
  try {
    await dbConnect();
    const body = await request.json();

    const csvData = body.csvData || '';
    const csvValidation = validateClaudeCsv(csvData);
    if (!csvValidation.ok) {
      return Response.json({ success: false, error: csvValidation.error }, { status: 400 });
    }

    if (!body.name?.trim()) {
      return Response.json({ success: false, error: 'Campaign name is required' }, { status: 400 });
    }

    let preset = body.presetId
      ? await CampaignPreset.findById(body.presetId)
      : await resolveDefaultPreset();

    if (body.presetId && !preset) {
      return Response.json({ success: false, error: 'Campaign preset not found' }, { status: 404 });
    }

    if (!preset) {
      return Response.json({ success: false, error: 'Default campaign preset could not be created because no active default mailboxes were found' }, { status: 400 });
    }

    const presetData = normalizePresetDoc(preset) || body.preset || {};
    if (body.replyTemplate) {
      presetData.replyTemplate = {
        enabled: body.replyTemplate.enabled !== false,
        subject: body.replyTemplate.subject || presetData.replyTemplate?.subject || 'Re: Website preview',
        body: body.replyTemplate.body || presetData.replyTemplate?.body || ''
      };
    }
    const mailboxIds = Array.isArray(body.mailboxes) && body.mailboxes.length > 0
      ? body.mailboxes
      : (presetData.mailboxes || []);

    if (mailboxIds.length === 0) {
      return Response.json({ success: false, error: 'At least one mailbox is required in the preset or request' }, { status: 400 });
    }

    const mailboxes = await Mailbox.find({ _id: { $in: mailboxIds }, status: 'active' });
    if (mailboxes.length !== mailboxIds.length) {
      return Response.json({ success: false, error: 'One or more selected mailboxes are inactive or missing' }, { status: 400 });
    }

    const scheduling = {
      timezone: presetData.scheduling?.timezone || 'Asia/Kolkata',
      businessHours: {
        enabled: presetData.scheduling?.businessHours?.enabled ?? true,
        startTime: presetData.scheduling?.businessHours?.startTime || '09:00',
        endTime: presetData.scheduling?.businessHours?.endTime || '17:00',
        daysOfWeek: presetData.scheduling?.businessHours?.daysOfWeek || [1, 2, 3, 4, 5]
      },
      dailySendCap: presetData.scheduling?.dailySendCap || presetData.options?.dailyLimit || 40,
      staggerSettings: {
        enabled: presetData.scheduling?.staggerSettings?.enabled ?? true,
        baseDelayMinutes: presetData.scheduling?.staggerSettings?.baseDelayMinutes || 2,
        randomVariationMinutes: presetData.scheduling?.staggerSettings?.randomVariationMinutes || 1
      },
      autoActivateWhenReady: false
    };

    const campaign = await Campaign.create({
      name: body.name.trim(),
      description: body.description || `Draft created from Claude output${preset ? ` using preset ${preset.name}` : ''}`,
      persona: body.persona || 'real_estate_outreach',
      goal: body.goal || 'Create a reviewed cold outreach campaign from Claude-generated email steps.',
      knowledgeBase: body.knowledgeBase || '',
      autoReplyTemplate: {
        enabled: presetData.replyTemplate?.enabled ?? false,
        subject: presetData.replyTemplate?.subject || '',
        body: presetData.replyTemplate?.body || ''
      },
      status: 'draft',
      useV2Engine: true,
      mailboxes: mailboxIds,
      options: {
        selectedMailbox: mailboxIds[0],
        trackOpens: presetData.options?.trackOpens ?? true,
        trackClicks: presetData.options?.trackClicks ?? true,
        unsubscribeLink: presetData.options?.unsubscribeLink ?? false,
        dailyLimit: presetData.options?.dailyLimit || 40,
        notes: body.notes || ''
      },
      scheduling,
      v2Timezone: scheduling.timezone,
      v2BusinessHours: {
        startHour: getHourFromTime(scheduling.businessHours.startTime, 9),
        endHour: getHourFromTime(scheduling.businessHours.endTime, 17)
      },
      v2Limits: presetData.v2Limits || {
        dailySendLimit: 40,
        hourlySendLimit: 10,
        minGapMinutes: 3
      },
      v2Delays: presetData.v2Delays || {
        baseDelayHours: 24,
        escalationMultiplier: 1.5,
        coolingPeriodDays: 30,
        maxAttemptsPerCycle: 6
      },
      v2SendPacing: presetData.v2SendPacing || {
        enabled: true,
        minGapSeconds: 120,
        maxGapSeconds: 240,
        respectWarmScore: true
      },
      v2Angles: [
        { key: 'claude_output', description: 'Use per-lead Claude generated email steps from import.' },
        { key: 'review_ready', description: 'Campaign remains draft until reviewed manually.' },
        { key: 'mailbox_rotation', description: 'Leads are assigned to preset mailboxes in round-robin.' }
      ]
    });

    const importResult = await importClaudeCsvToCampaign({
      campaignId: campaign._id,
      csvData,
      assignMailboxes: mailboxIds
    });

    if (importResult.imported === 0) {
      await Campaign.findByIdAndDelete(campaign._id);
      return Response.json({
        success: false,
        error: 'No prospects were imported',
        errors: importResult.errors
      }, { status: 400 });
    }

    return Response.json({
      success: true,
      campaign: {
        id: campaign._id,
        name: campaign.name,
        status: campaign.status,
        useV2Engine: campaign.useV2Engine
      },
      imported: importResult.imported,
      total: importResult.total,
      errors: importResult.errors.length > 0 ? importResult.errors : undefined,
      prospects: importResult.prospects,
      message: `Draft campaign created with ${importResult.imported} prospects. Review before scheduling or starting.`
    }, { status: 201 });
  } catch (error) {
    console.error('Create draft campaign from import error:', error);
    return Response.json({ success: false, error: error.message || 'Failed to create draft campaign' }, { status: 500 });
  }
}
