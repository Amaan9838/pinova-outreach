import mongoose from 'mongoose';

/* ─── Timeline Entry Schema ───────────────────────────────── */
const TimelineEntrySchema = new mongoose.Schema({
  type: {
    type: String,
    enum: [
      'email_sent', 'email_opened', 'email_replied',
      'linkedin_dm', 'call', 'meeting', 'note',
      'proposal_sent', 'proposal_viewed', 'website_visit',
      'stage_change', 'heat_change', 'status_change',
      'task_created', 'task_completed',
    ],
    required: true,
  },
  content: { type: String, default: '' },
  by: { type: String, default: 'system' },            // who performed it
  channel: { type: String, default: '' },              // email, linkedin, phone, etc.
  sentiment: {
    type: String,
    enum: ['positive', 'neutral', 'negative', ''],
    default: '',
  },
  metadata: { type: mongoose.Schema.Types.Mixed },      // extra context
  timestamp: { type: Date, default: Date.now },
});

/* ─── Action Schema ───────────────────────────────────────── */
const ActionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['email', 'call', 'meeting', 'follow_up', 'proposal', 'demo', 'close', 'linkedin', 'task', 'none'],
    default: 'none',
  },
  description: { type: String, default: '' },
  date: { type: Date, default: null },
  by: { type: String, default: '' },
}, { _id: false });

const NextActionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['email', 'call', 'meeting', 'follow_up', 'proposal', 'demo', 'close', 'linkedin', 'task', 'none'],
    default: 'none',
  },
  description: { type: String, default: '' },
  dueDate: { type: Date, default: null },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
  },
  owner: { type: String, default: '' },
}, { _id: false });

/* ─── Lead Schema ─────────────────────────────────────────── */
const LeadSchema = new mongoose.Schema({
  // ── Identity ─────────────────────────────────
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, default: '', trim: true },
  email: { type: String, default: '', trim: true },
  phone: { type: String, default: '', trim: true },
  company: { type: String, default: '', trim: true },
  role: { type: String, default: '', trim: true },
  website: { type: String, default: '', trim: true },
  linkedin: { type: String, default: '', trim: true },
  instagram: { type: String, default: '', trim: true },
  facebook: { type: String, default: '', trim: true },

  // ── Source Tracking ──────────────────────────
  source: {
    type: String,
    enum: [
      'apollo', 'linkedin_outbound', 'facebook_ads', 'organic_website',
      'referral', 'cold_email', 'webinar', 'newsletter', 'instagram',
      'manual_import', 'csv_import', 'google_ads', 'partnership', 'other',
    ],
    default: 'other',
  },

  // ── What We're Selling ───────────────────────
  offerCategory: {
    type: String,
    enum: [
      'website', 'ai_website', 'platform', 'saas', 'custom_ai_solution',
      'automation', 'crm', 'lead_gen_system', 'ai_assistant', 'enterprise_solution', 'other',
    ],
    default: 'other',
  },

  // ── Industry ─────────────────────────────────
  industry: {
    type: String,
    enum: [
      'real_estate', 'healthcare', 'agency', 'ecommerce',
      'education', 'finance', 'saas', 'consulting', 'other',
    ],
    default: 'other',
  },

  // ── Pipeline Stage (linear progression) ──────
  pipelineStage: {
    type: String,
    enum: ['prospect', 'lead', 'qualified_lead', 'pipeline_opportunity', 'client', 'churned'],
    default: 'prospect',
    index: true,
  },

  // ── Heat Level ───────────────────────────────
  heatLevel: {
    type: String,
    enum: ['cold', 'warm', 'hot'],
    default: 'cold',
    index: true,
  },

  // ── Intent Level ─────────────────────────────
  intentLevel: {
    type: String,
    enum: ['unknown', 'curious', 'exploring', 'looking_actively', 'immediate_need'],
    default: 'unknown',
  },

  // ── Relationship Stage ───────────────────────
  relationshipStage: {
    type: String,
    enum: ['stranger', 'aware', 'engaged', 'trusted', 'champion'],
    default: 'stranger',
  },

  // ── Engagement Score (0-100) ─────────────────
  engagementScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
    index: true,
  },

  // ── Buying Readiness ─────────────────────────
  buyingReadiness: {
    type: String,
    enum: ['not_ready', 'researching', 'comparing_vendors', 'ready_to_buy', 'budget_planning', 'scaling'],
    default: 'not_ready',
  },

  // ── Deal Info ────────────────────────────────
  dealValue: { type: Number, default: 0 },
  dealProbability: { type: Number, default: 0, min: 0, max: 100 },
  buyingTimeline: {
    type: String,
    enum: ['immediate', '1_month', '1_3_months', '3_6_months', '6_12_months', 'unknown'],
    default: 'unknown',
  },
  closedReason: { type: String, default: '' },

  // ── Action Engine ────────────────────────────
  lastAction: { type: ActionSchema, default: () => ({}) },
  nextAction: { type: NextActionSchema, default: () => ({}) },

  // ── Nurture Status ───────────────────────────
  nurtureStatus: {
    type: String,
    enum: ['active_outreach', 'nurture_sequence', 'manual_follow_up', 'on_hold', 'do_not_contact'],
    default: 'active_outreach',
  },

  // ── Hot Lead Pipeline (sub-stage when hot) ───
  hotPipelineStage: {
    type: String,
    enum: ['discovery', 'qualified', 'demo', 'proposal_sent', 'negotiation', 'verbal_yes', 'closed_won', ''],
    default: '',
  },

  // ── Communication Timeline ───────────────────
  timeline: [TimelineEntrySchema],

  // ── Tags & Classification ───────────────────
  tags: [{ type: String }],
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
  },

  // ── Ownership ────────────────────────────────
  owner: { type: String, default: 'Amaan', trim: true },
  createdBy: { type: String, default: '', trim: true },

  // ── Notes ────────────────────────────────────
  notes: { type: String, default: '' },

  // ── Follow-Up Intelligence ───────────────────
  followUpIntel: {
    lastOutcome: { type: String, default: '' },     // "no reply", "opened email", "clicked proposal"
    whyNoReply: { type: String, default: '' },      // "busy", "low urgency", "not decision-maker"
    whatNext: { type: String, default: '' },         // "Wait 3 days then send ROI example"
  },

  // ── Timestamps ───────────────────────────────
  lastActivityAt: { type: Date, default: Date.now },
  stageChangedAt: { type: Date, default: Date.now },
}, {
  timestamps: true,
});

/* ─── Pre-save ────────────────────────────────────────────── */
LeadSchema.pre('save', function (next) {
  if (this.isModified('pipelineStage') || this.isModified('heatLevel')) {
    this.stageChangedAt = new Date();
  }
  if (this.isModified('timeline') || this.isModified('nextAction') || this.isModified('lastAction')) {
    this.lastActivityAt = new Date();
  }
  next();
});

/* ─── Indexes ─────────────────────────────────────────────── */
LeadSchema.index({ pipelineStage: 1, heatLevel: 1 });
LeadSchema.index({ owner: 1, pipelineStage: 1 });
LeadSchema.index({ 'nextAction.dueDate': 1 });
LeadSchema.index({ lastActivityAt: -1 });
LeadSchema.index({ engagementScore: -1 });
LeadSchema.index({ source: 1 });
LeadSchema.index({ email: 1 });
LeadSchema.index({ createdAt: -1 });

export default mongoose.models.Lead || mongoose.model('Lead', LeadSchema);
