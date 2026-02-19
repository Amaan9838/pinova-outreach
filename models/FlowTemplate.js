import mongoose from 'mongoose';

/**
 * FlowTemplate Schema
 * Reusable flow templates that can be used across multiple campaigns
 * Contains the node/edge structure that defines email sequence logic
 */

// Node data schemas for different node types
const EmailNodeDataSchema = new mongoose.Schema({
  subject: { type: String, default: 'Email Subject' },
  template: { type: String, default: 'Add your email content here...' },
  isFirstEmail: { type: Boolean, default: false },
  personalization: {
    enabled: { type: Boolean, default: true }
  }
}, { _id: false, strict: false });

const WaitNodeDataSchema = new mongoose.Schema({
  duration: { type: Number, default: 24 }, // Hours
  unit: { type: String, enum: ['minutes', 'hours', 'days'], default: 'hours' },
  businessHoursOnly: { type: Boolean, default: true }
}, { _id: false });

const ConditionNodeDataSchema = new mongoose.Schema({
  conditionType: {
    type: String,
    enum: [
      'email_opened',
      'email_not_opened', 
      'email_clicked',
      'email_replied',
      'email_bounced',
      'no_action_after_wait',
      'reply_category'
    ],
    required: true
  },
  // For reply_category condition
  targetCategory: { type: String },
  // Timing settings
  checkAfter: { type: Number, default: 24 }, // Hours
  checkAfterUnit: { type: String, enum: ['hours', 'days'], default: 'hours' }
}, { _id: false });

const CategorizeNodeDataSchema = new mongoose.Schema({
  description: { type: String, default: 'Categorize reply using AI' },
  useAI: { type: Boolean, default: true },
  confidenceThreshold: { type: Number, default: 0.7 },
  // Fallback if AI confidence is too low
  fallbackBehavior: {
    type: String,
    enum: ['manual_review', 'use_default_category', 'none'],
    default: 'manual_review'
  },
  defaultCategory: { type: String, default: 'objection' }
}, { _id: false });

const ActionNodeDataSchema = new mongoose.Schema({
  actionType: {
    type: String,
    enum: ['send_response', 'stop_sequence', 'add_tag', 'move_to_pipeline', 'notify_user', 'schedule_followup'],
    required: true
  },
  // For send_response
  responseCategory: { type: String },
  useTemplate: { type: Boolean, default: true },
  // For add_tag
  tagName: { type: String },
  // For move_to_pipeline
  pipelineStage: { type: String },
  // For schedule_followup
  followupDelay: { type: Number },
  followupDelayUnit: { type: String, enum: ['hours', 'days'], default: 'days' }
}, { _id: false });

// Generic node schema
const FlowNodeSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['email', 'wait', 'condition', 'categorize', 'action', 'start', 'end'],
    required: true
  },
  // React Flow position
  position: {
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 }
  },
  // Node-specific data (depends on type)
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  // Display properties
  label: { type: String },
  style: { type: mongoose.Schema.Types.Mixed }
}, { _id: false });

// Edge schema (connections between nodes)
const FlowEdgeSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  source: {
    type: String,
    required: true,
    description: 'Source node ID'
  },
  target: {
    type: String,
    required: true,
    description: 'Target node ID'
  },
  // For conditional edges from condition nodes
  sourceHandle: {
    type: String,
    description: 'Output handle ID (e.g., "yes", "no", "opened", "replied")'
  },
  targetHandle: {
    type: String,
    description: 'Input handle ID'
  },
  // Edge styling and labeling
  label: { type: String },
  type: { type: String, default: 'smoothstep' },
  animated: { type: Boolean, default: false },
  style: { type: mongoose.Schema.Types.Mixed }
}, { _id: false });

// Main FlowTemplate schema
const FlowTemplateSchema = new mongoose.Schema({
  // Template identity
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  
  // Template classification
  category: {
    type: String,
    enum: ['outreach', 'follow_up', 'nurture', 'onboarding', 'custom'],
    default: 'custom'
  },
  
  // System template vs user-created
  isSystem: {
    type: Boolean,
    default: false
  },
  
  // React Flow structure
  nodes: [FlowNodeSchema],
  edges: [FlowEdgeSchema],
  
  // Entry point
  startNodeId: {
    type: String,
    required: true
  },
  
  // Viewport settings for React Flow
  viewport: {
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 },
    zoom: { type: Number, default: 1 }
  },
  
  // Statistics
  usageCount: {
    type: Number,
    default: 0
  },
  
  // Ownership
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  
  // Tags for filtering
  tags: [{ type: String }],
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'flowtemplates'
});

// Indexes
FlowTemplateSchema.index({ userId: 1, isSystem: 1 });
FlowTemplateSchema.index({ category: 1 });
FlowTemplateSchema.index({ tags: 1 });

// Pre-save middleware
FlowTemplateSchema.pre('save', function(next) {
  // Validate startNodeId exists in nodes
  if (this.startNodeId && this.nodes.length > 0) {
    const startNode = this.nodes.find(n => n.id === this.startNodeId);
    if (!startNode) {
      return next(new Error('startNodeId must reference an existing node'));
    }
  }
  next();
});

// Instance method: Clone template for a new campaign
FlowTemplateSchema.methods.cloneForCampaign = function(campaignId) {
  return {
    name: this.name,
    description: this.description,
    nodes: JSON.parse(JSON.stringify(this.nodes)),
    edges: JSON.parse(JSON.stringify(this.edges)),
    startNodeId: this.startNodeId,
    viewport: { ...this.viewport },
    template: this._id,
    campaign: campaignId
  };
};

// Static method: Get templates for user
FlowTemplateSchema.statics.getForUser = async function(userId) {
  return this.find({
    $or: [
      { isSystem: true },
      { userId: userId }
    ]
  }).sort({ usageCount: -1, name: 1 });
};

// Static method: Create a basic outreach template
FlowTemplateSchema.statics.createBasicOutreachTemplate = async function(userId) {
  const template = {
    name: 'Basic Outreach Sequence',
    description: 'Simple outreach with follow-ups based on opens and replies',
    category: 'outreach',
    isSystem: false,
    userId,
    startNodeId: 'start-1',
    nodes: [
      {
        id: 'start-1',
        type: 'start',
        position: { x: 250, y: 0 },
        data: { label: 'Campaign Start' }
      },
      {
        id: 'email-1',
        type: 'email',
        position: { x: 250, y: 100 },
        data: {
          subject: 'Quick question about {{company}}',
          template: 'Hi {{firstName}},\n\nI noticed...',
          isFirstEmail: true
        }
      },
      {
        id: 'wait-1',
        type: 'wait',
        position: { x: 250, y: 200 },
        data: { duration: 24, unit: 'hours', businessHoursOnly: true }
      },
      {
        id: 'condition-1',
        type: 'condition',
        position: { x: 250, y: 300 },
        data: { conditionType: 'email_opened' }
      },
      {
        id: 'email-2a',
        type: 'email',
        position: { x: 100, y: 420 },
        data: {
          subject: 'Re: {{previousSubject}}',
          template: 'Hi {{firstName}},\n\nI saw you opened my previous email...'
        }
      },
      {
        id: 'email-2b',
        type: 'email',
        position: { x: 400, y: 420 },
        data: {
          subject: 'Following up - {{company}}',
          template: 'Hi {{firstName}},\n\nWanted to make sure my last email didn\'t get buried...'
        }
      },
      {
        id: 'categorize-1',
        type: 'categorize',
        position: { x: 250, y: 540 },
        data: { useAI: true, confidenceThreshold: 0.7 }
      }
    ],
    edges: [
      { id: 'e-start-email1', source: 'start-1', target: 'email-1' },
      { id: 'e-email1-wait1', source: 'email-1', target: 'wait-1' },
      { id: 'e-wait1-cond1', source: 'wait-1', target: 'condition-1' },
      { id: 'e-cond1-opened', source: 'condition-1', target: 'email-2a', sourceHandle: 'yes', label: 'Opened' },
      { id: 'e-cond1-not-opened', source: 'condition-1', target: 'email-2b', sourceHandle: 'no', label: 'Not Opened' }
    ]
  };
  
  return this.create(template);
};

export default mongoose.models.FlowTemplate || mongoose.model('FlowTemplate', FlowTemplateSchema);
