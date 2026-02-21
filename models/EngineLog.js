import mongoose from 'mongoose';

/**
 * EngineLog — Outreach Engine v2 Audit Trail
 *
 * Every execution of processLead() must create one EngineLog entry.
 * No state transition may occur without a corresponding log entry.
 *
 * PRD §11.1 — Mandatory for every decision
 * PRD §11.2 — Lead lifecycle traceability
 * PRD §11.3 — Error visibility rules
 */
const EngineLogSchema = new mongoose.Schema({
  // References
  campaignId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign',
    required: true,
    index: true
  },
  leadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CampaignProspect',
    required: true,
    index: true
  },

  // State transition snapshot (PRD §11.1)
  stateBefore: {
    type: String,
    enum: ['new', 'contacted', 'opened', 'replied_positive', 'replied_neutral',
           'replied_objection', 'bounced', 'completed', 'failed', 'stopped', null],
    default: null
  },
  stateAfter: {
    type: String,
    enum: ['new', 'contacted', 'opened', 'replied_positive', 'replied_neutral',
           'replied_objection', 'bounced', 'completed', 'failed', 'stopped'],
    required: true
  },

  // Action taken (PRD §11.1)
  // Values: initial_send | followup_send | reply_classified | objection_handled |
  //         cooling_triggered | retry_scheduled | hard_stopped | skipped_rate_limit |
  //         skipped_business_hours | skipped_lock | corruption_repaired
  action: {
    type: String,
    required: true
  },

  // AI context snapshot (PRD §5, §6)
  angleIndex: {
    type: Number,
    default: null
  },
  angleKey: {
    type: String,
    default: null
  },
  escalationLevel: {
    type: Number,
    default: null
  },

  // Timing snapshot (PRD §11.1)
  nextActionAtBefore: {
    type: Date,
    default: null
  },
  nextActionAtAfter: {
    type: Date,
    default: null
  },

  // Attempt/failure snapshot
  attemptCountBefore: {
    type: Number,
    default: null
  },
  attemptCountAfter: {
    type: Number,
    default: null
  },
  failureCount: {
    type: Number,
    default: null
  },

  // Error details (PRD §11.3) — null if no error
  error: {
    type: String,
    default: null
  },
  errorCategory: {
    // smtp_failure | ai_generation_failure | ai_classification_failure |
    // imap_failure | rate_limit | state_corruption | none
    type: String,
    default: null
  },

  // AI reply classification result (if applicable)
  replyIntent: {
    type: String,  // positive | neutral | objection | stop
    default: null
  },
  replyObjectionType: {
    type: String,
    default: null
  },

  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// Compound indexes for fast querying in the Lead Debug View (PRD §10.6)
EngineLogSchema.index({ leadId: 1, timestamp: -1 });
EngineLogSchema.index({ campaignId: 1, timestamp: -1 });
EngineLogSchema.index({ campaignId: 1, leadId: 1, timestamp: -1 });

export default mongoose.models.EngineLog || mongoose.model('EngineLog', EngineLogSchema);
