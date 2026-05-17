import mongoose from 'mongoose';

const CampaignPresetSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  mailboxes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Mailbox'
  }],
  options: {
    trackOpens: { type: Boolean, default: true },
    trackClicks: { type: Boolean, default: true },
    unsubscribeLink: { type: Boolean, default: false },
    dailyLimit: { type: Number, default: 40 }
  },
  scheduling: {
    timezone: { type: String, default: 'America/New_York' },
    businessHours: {
      enabled: { type: Boolean, default: true },
      startTime: { type: String, default: '09:00' },
      endTime: { type: String, default: '17:00' },
      daysOfWeek: { type: [Number], default: [1, 2, 3, 4, 5] }
    },
    dailySendCap: { type: Number, default: 40 },
    staggerSettings: {
      enabled: { type: Boolean, default: true },
      baseDelayMinutes: { type: Number, default: 2 },
      randomVariationMinutes: { type: Number, default: 1 }
    }
  },
  v2Limits: {
    dailySendLimit: { type: Number, default: 40 },
    hourlySendLimit: { type: Number, default: 10 },
    minGapMinutes: { type: Number, default: 3 }
  },
  v2Delays: {
    baseDelayHours: { type: Number, default: 24 },
    escalationMultiplier: { type: Number, default: 1.5 },
    coolingPeriodDays: { type: Number, default: 30 },
    maxAttemptsPerCycle: { type: Number, default: 6 }
  },
  v2SendPacing: {
    enabled: { type: Boolean, default: true },
    minGapSeconds: { type: Number, default: 120 },
    maxGapSeconds: { type: Number, default: 240 },
    respectWarmScore: { type: Boolean, default: true }
  },
  replyTemplate: {
    enabled: { type: Boolean, default: true },
    subject: { type: String, default: '' },
    body: {
      type: String,
      default: [
        '{{firstName}},',
        '',
        'Got your reply, thank you.',
        '',
        'I can send over the redesigned version within the next hour. The idea is simple: keep the brand premium, make the site easy for relocating and out-of-state buyers to access, and remove the friction that is currently blocking people before they even see the listings.',
        '',
        'I will send you the preview link shortly.',
        '',
        '- {{senderName}}'
      ].join('\n')
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

CampaignPresetSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.models.CampaignPreset || mongoose.model('CampaignPreset', CampaignPresetSchema);
