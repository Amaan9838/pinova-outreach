import mongoose from 'mongoose';

/**
 * CampaignProspect — unified schema.
 *
 * CANONICAL FIELDS (one authority per concept):
 *   Scheduling  → nextActionAt   (v2 engine only)
 *   State       → v2State        (canonical); `status` is auto-synced from it via pre-save
 *   Step index  → attemptCount   (0-based, v2 engine only)
 *   Open track  → lastOpenedAt
 *   Reply track → repliedAt
 *
 * LEGACY FIELDS KEPT FOR UI BACKWARD COMPAT (not written by v2 engine):
 *   nextSendAt, sequenceStep, emailsSent, emailsOpened, emailsClicked, emailsReplied, emailsBounced
 *   These are read by dataAccessLayer for analytics display. v2 engine does NOT write them.
 */
const CampaignProspectSchema = new mongoose.Schema({

  // ─── References ──────────────────────────────────────────────────────────────
  campaign: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign',
    required: true
  },
  prospect: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Prospect',
    required: true
  },

  // ─── Per-lead email step overrides ───────────────────────────────────────────
  // Populated from CSV import (step1_subject, step1_body … step7_subject, step7_body).
  // When present, the engine uses these instead of AI-generated angle content.
  // customSubject/customBody retained as step 0 aliases for backward compat.
  customSubject: { type: String, default: null },
  customBody:    { type: String, default: null },

  emailSteps: [{
    step:    { type: Number, required: true },   // 1-based (1–7)
    subject: { type: String, default: '' },
    body:    { type: String, default: '' }
  }],

  // ─── Status (canonical: v2State; this field auto-synced by pre-save) ─────────
  status: {
    type: String,
    enum: ['pending', 'active', 'paused', 'replied', 'bounced', 'completed', 'stopped', 'unsubscribed', 'failed'],
    default: 'pending',
    index: true
  },

  // ─── Legacy scheduling (not written by v2 engine — kept for UI reads) ────────
  nextSendAt:    { type: Date,   index: true },
  firstSendTime: { type: Date },
  lastSentAt:    { type: Date },
  startedAt:     { type: Date },
  completedAt:   { type: Date },
  pausedAt:      { type: Date },
  sequenceStep:  { type: Number, default: 0 },  // legacy step cursor; v2 uses attemptCount

  // ─── Legacy event counters (read by DAL analytics; v2 does NOT increment these) ─
  emailsSent:    { type: Number, default: 0 },
  emailsOpened:  { type: Number, default: 0 },
  emailsClicked: { type: Number, default: 0 },
  emailsReplied: { type: Number, default: 0 },
  emailsBounced: { type: Number, default: 0 },

  // ─── Legacy event timestamps (not written by v2 engine) ─────────────────────
  bouncedAt:      { type: Date },
  clickedAt:      { type: Date },
  unsubscribedAt: { type: Date },

  // ─── Reply classification (set by v2 engine after IMAP detects reply) ────────
  replyCategory:              { type: String },   // positive | objection | neutral | unsubscribe
  replyCategoryConfidence:    { type: Number, min: 0, max: 1 },
  replyCategorizedAt:         { type: Date },
  replyCategoryOverriddenBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  // ─── Misc metadata ───────────────────────────────────────────────────────────
  notes:           { type: String, default: '' },
  personalizedData:{ type: mongoose.Schema.Types.Mixed, default: {} },
  lastError: {
    message:   String,
    timestamp: Date,
    code:      String
  },

  // ─── v2 Engine State Machine (PRD §2, §4, §5, §6) ───────────────────────────
  v2State: {
    type: String,
    enum: [
      'new',               // Not yet contacted
      'contacted',         // ≥1 email sent, no reply
      'opened',            // Opened email, no reply
      'replied_positive',  // Reply classified as positive intent
      'replied_neutral',   // Reply acknowledged, non-committal
      'replied_objection', // Reply classified as objection
      'bounced',           // Hard bounce — terminal
      'completed',         // Lifecycle finished — semi-terminal
      'failed',            // Repeated SMTP failures — terminal
      'stopped'            // Manual admin stop — terminal
    ],
    default: null,         // null = not yet enrolled in v2
    index: true
  },

  // §3.1 — Single timing authority. Set ONLY by processLead().
  nextActionAt: {
    type: Date,
    default: null,
    index: true
  },

  // §4.3 — Number of send attempts in current cycle (0-based)
  attemptCount: {
    type: Number,
    default: 0
  },

  // §3.8 — Failure counter for exponential backoff
  failureCount: {
    type: Number,
    default: 0
  },

  // §4.4 — Hard stop flag. When true, processLead() exits immediately.
  stopFlag: {
    type: Boolean,
    default: false
  },

  // §11.9 — Concurrency lock: prevents double-processing on same cron tick
  processingLock:     { type: Boolean, default: false },
  processingStartedAt:{ type: Date,    default: null },

  // §6.9, §5.4 — AI memory for angle rotation and reply context
  aiMemory: {
    lastAngleIndex: { type: Number, default: null },
    angleHistory:   { type: [Number], default: [] },   // capped at 20 per PRD §5.4
    sentiment:      { type: String,   default: null },  // positive | neutral | objection
    objectionType:  { type: String,   default: null },  // budget | timing | competitor …
    replySummary:   { type: String,   default: null }   // 1-sentence AI summary of reply
  },

  // §8.3 — Set by IMAP monitor on reply detection
  repliedAt: {
    type: Date,
    default: null
  },

  // §4.3 — Set by open-tracking pixel
  lastOpenedAt: {
    type: Date,
    default: null
  },

  // §7.3 — Email threading: Message-ID of first sent email for In-Reply-To header
  threadHeaderMessageId: {
    type: String,
    default: null
  },

  // §7.3 — Email threading: subject of first sent email so follow-ups can use "Re: <subject>"
  threadSubject: {
    type: String,
    default: null
  }

}, {
  timestamps: true,
  collection: 'campaignprospects'
});

// ─── Indexes ─────────────────────────────────────────────────────────────────
CampaignProspectSchema.index({ campaign: 1, prospect: 1 }, { unique: true });
CampaignProspectSchema.index({ campaign: 1, status: 1 });
CampaignProspectSchema.index({ prospect: 1, status: 1 });
CampaignProspectSchema.index({ nextSendAt: 1, status: 1 });     // legacy cron compat
CampaignProspectSchema.index({ nextActionAt: 1, v2State: 1 });  // v2 cron pickup

// ─── Pre-save: sync `status` from `v2State` + enforce terminal rules ─────────
CampaignProspectSchema.pre('save', function(next) {

  // Sync legacy `status` field from canonical v2State so UI reads stay accurate
  if (this.v2State) {
    const stateToStatus = {
      'new':               'pending',
      'contacted':         'active',
      'opened':            'active',
      'replied_positive':  'replied',
      'replied_neutral':   'replied',
      'replied_objection': 'replied',
      'bounced':           'bounced',
      'completed':         'completed',
      'failed':            'failed',
      'stopped':           'stopped'
    };
    this.status = stateToStatus[this.v2State] ?? this.status;
  }

  // Enforce: terminal states clear nextActionAt and set stopFlag
  const TERMINAL_V2 = ['bounced', 'failed', 'stopped'];
  if (this.stopFlag === true || (this.v2State && TERMINAL_V2.includes(this.v2State))) {
    this.nextActionAt = null;
    this.stopFlag     = true;
  }

  // Legacy guard: clear nextSendAt for terminal statuses
  const TERMINAL_LEGACY = ['completed', 'stopped', 'bounced', 'replied', 'unsubscribed', 'failed'];
  if (TERMINAL_LEGACY.includes(this.status)) {
    this.nextSendAt = undefined;
  }

  next();
});

// ─── Virtual ─────────────────────────────────────────────────────────────────
CampaignProspectSchema.virtual('identifier').get(function() {
  return `${this.campaign}_${this.prospect}`;
});

// ─── Static: find v2 leads due for processing ────────────────────────────────
CampaignProspectSchema.statics.findDueForV2 = function(limit = 50) {
  return this.find({
    v2State:       { $nin: ['bounced', 'failed', 'stopped', 'completed', null] },
    stopFlag:      false,
    processingLock:false,
    nextActionAt:  { $lte: new Date() }
  })
  .populate('prospect')
  .populate('campaign')
  .limit(limit)
  .sort({ nextActionAt: 1 });
};

// ─── Static: campaign analytics (works for both v2 and legacy) ───────────────
CampaignProspectSchema.statics.getCampaignStats = function(campaignId) {
  return this.aggregate([
    { $match: { campaign: new mongoose.Types.ObjectId(campaignId) } },
    {
      $group: {
        _id:           '$status',
        count:         { $sum: 1 },
        totalSent:     { $sum: '$emailsSent' },
        totalOpened:   { $sum: '$emailsOpened' },
        totalReplied:  { $sum: '$emailsReplied' },
        totalBounced:  { $sum: '$emailsBounced' }
      }
    }
  ]);
};

// ─── Static: find by campaign ────────────────────────────────────────────────
CampaignProspectSchema.statics.findByCampaign = function(campaignId, status = null) {
  const query = { campaign: campaignId };
  if (status) query.status = status;
  return this.find(query).populate('prospect');
};

export default mongoose.models.CampaignProspect || mongoose.model('CampaignProspect', CampaignProspectSchema);
