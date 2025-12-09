import mongoose from 'mongoose';

/**
 * Pipeline Model - Tracks prospects through sales stages
 * From lead discovery to closed deal
 */

const StageHistorySchema = new mongoose.Schema({
  stage: {
    type: String,
    required: true
  },
  changedAt: {
    type: Date,
    default: Date.now
  },
  changedBy: {
    type: String, // 'system' or 'ai' or user ID
    default: 'system'
  },
  reason: {
    type: String, // Why the stage changed (AI classification, manual, etc.)
    default: ''
  },
  daysInPreviousStage: {
    type: Number,
    default: 0
  }
});

const AIInsightSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['recommendation', 'warning', 'opportunity', 'analysis'],
    required: true
  },
  message: {
    type: String,
    required: true
  },
  confidence: {
    type: Number, // 0-100
    default: 80
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  actionable: {
    type: Boolean,
    default: true
  },
  suggestedAction: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  dismissed: {
    type: Boolean,
    default: false
  }
});

const PipelineSchema = new mongoose.Schema({
  // Reference to the prospect
  prospect: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Prospect',
    required: true
  },
  
  // Current stage in the pipeline
  stage: {
    type: String,
    enum: [
      'new_lead',           // Just added, not contacted
      'contacted',          // Initial email sent
      'engaged',            // Opened/clicked emails
      'responded',          // Replied to an email
      'interested',         // Positive response, wants to learn more
      'demo_scheduled',     // Demo/call booked
      'proposal_sent',      // Pricing/proposal shared
      'negotiating',        // In discussions
      'closed_won',         // Deal closed successfully
      'closed_lost',        // Deal lost
      'nurturing'           // Not now, but keep in touch
    ],
    default: 'new_lead',
    index: true
  },
  
  // Lead score (0-100) based on engagement and AI analysis
  leadScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
    index: true
  },
  
  // Breakdown of what contributes to the score
  scoreBreakdown: {
    engagement: { type: Number, default: 0 }, // Opens, clicks, time on emails
    responseQuality: { type: Number, default: 0 }, // Sentiment of replies
    activityRecency: { type: Number, default: 0 }, // Recent interactions
    profileFit: { type: Number, default: 0 }, // Matches ideal customer
    behaviorSignals: { type: Number, default: 0 } // Positive buying signals
  },
  
  // Stage history for tracking progression
  stageHistory: [StageHistorySchema],
  
  // AI-generated insights about this lead
  aiInsights: [AIInsightSchema],
  
  // Current campaign associations
  activeCampaigns: [{
    campaign: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campaign'
    },
    status: {
      type: String,
      enum: ['active', 'paused', 'completed', 'stopped'],
      default: 'active'
    },
    currentStep: {
      type: Number,
      default: 1
    }
  }],
  
  // Engagement metrics
  metrics: {
    totalEmailsSent: { type: Number, default: 0 },
    totalOpens: { type: Number, default: 0 },
    totalClicks: { type: Number, default: 0 },
    totalReplies: { type: Number, default: 0 },
    lastOpenedAt: { type: Date },
    lastClickedAt: { type: Date },
    lastRepliedAt: { type: Date },
    averageOpenTime: { type: Number, default: 0 }, // Seconds
    openRate: { type: Number, default: 0 }, // Percentage
    replyRate: { type: Number, default: 0 } // Percentage
  },
  
  // Reply analysis
  replyAnalysis: {
    lastSentiment: {
      type: String,
      enum: ['positive', 'neutral', 'negative', 'unknown'],
      default: 'unknown'
    },
    lastIntent: {
      type: String,
      enum: [
        'interested',
        'needs_more_info',
        'schedule_meeting',
        'not_now',
        'not_interested',
        'out_of_office',
        'referral',
        'question',
        'unknown'
      ],
      default: 'unknown'
    },
    sentimentScore: { type: Number, default: 0 }, // -100 to 100
    keyPhrases: [String],
    suggestedResponse: { type: String, default: '' }
  },
  
  // Next action tracking
  nextAction: {
    type: {
      type: String,
      enum: ['email', 'call', 'demo', 'follow_up', 'close', 'none'],
      default: 'none'
    },
    dueAt: { type: Date },
    description: { type: String, default: '' },
    aiGenerated: { type: Boolean, default: false }
  },
  
  // Owner/assignee
  assignedTo: {
    type: String, // User identifier
    default: 'unassigned'
  },
  
  // Tags for filtering
  tags: [String],
  
  // Notes from team
  notes: [{
    content: { type: String },
    author: { type: String },
    createdAt: { type: Date, default: Date.now }
  }],
  
  // Win/loss reason (for closed stages)
  closedReason: {
    type: String,
    default: ''
  },
  
  // Estimated deal value
  dealValue: {
    type: Number,
    default: 0
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  stageChangedAt: {
    type: Date,
    default: Date.now
  }
});

// Pre-save middleware
PipelineSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // If stage changed, update stageChangedAt and calculate lead score
  if (this.isModified('stage')) {
    this.stageChangedAt = Date.now();
  }
  
  next();
});

// Instance method: Move to new stage
PipelineSchema.methods.moveToStage = function(newStage, changedBy = 'system', reason = '') {
  const oldStage = this.stage;
  const now = new Date();
  
  // Calculate days in previous stage
  const daysInPreviousStage = this.stageChangedAt 
    ? Math.floor((now - this.stageChangedAt) / (1000 * 60 * 60 * 24))
    : 0;
  
  // Add to stage history
  this.stageHistory.push({
    stage: oldStage,
    changedAt: now,
    changedBy,
    reason,
    daysInPreviousStage
  });
  
  // Update stage
  this.stage = newStage;
  this.stageChangedAt = now;
  
  return this;
};

// Instance method: Add AI insight
PipelineSchema.methods.addInsight = function(insight) {
  this.aiInsights.push({
    type: insight.type || 'recommendation',
    message: insight.message,
    confidence: insight.confidence || 80,
    priority: insight.priority || 'medium',
    actionable: insight.actionable !== false,
    suggestedAction: insight.suggestedAction || ''
  });
  
  return this;
};

// Instance method: Calculate lead score
PipelineSchema.methods.calculateScore = function() {
  const { metrics, replyAnalysis, stage } = this;
  
  // Engagement score (0-30)
  let engagement = 0;
  if (metrics.openRate > 50) engagement += 15;
  else if (metrics.openRate > 25) engagement += 10;
  else if (metrics.openRate > 0) engagement += 5;
  if (metrics.totalClicks > 0) engagement += 10;
  if (metrics.totalReplies > 0) engagement += 5;
  
  // Response quality (0-25)
  let responseQuality = 0;
  if (replyAnalysis.lastSentiment === 'positive') responseQuality = 25;
  else if (replyAnalysis.lastSentiment === 'neutral') responseQuality = 15;
  else if (replyAnalysis.lastIntent === 'needs_more_info') responseQuality = 20;
  else if (replyAnalysis.lastIntent === 'schedule_meeting') responseQuality = 25;
  
  // Activity recency (0-20)
  let activityRecency = 0;
  const daysSinceActivity = this.stageChangedAt 
    ? Math.floor((Date.now() - this.stageChangedAt) / (1000 * 60 * 60 * 24))
    : 999;
  if (daysSinceActivity < 1) activityRecency = 20;
  else if (daysSinceActivity < 3) activityRecency = 15;
  else if (daysSinceActivity < 7) activityRecency = 10;
  else if (daysSinceActivity < 14) activityRecency = 5;
  
  // Stage bonus (0-25)
  let stageBonus = 0;
  const stageScores = {
    'new_lead': 0,
    'contacted': 5,
    'engaged': 10,
    'responded': 15,
    'interested': 20,
    'demo_scheduled': 22,
    'proposal_sent': 23,
    'negotiating': 24,
    'closed_won': 25,
    'nurturing': 8
  };
  stageBonus = stageScores[stage] || 0;
  
  // Calculate total
  this.scoreBreakdown = {
    engagement,
    responseQuality,
    activityRecency,
    profileFit: this.scoreBreakdown.profileFit || 0,
    behaviorSignals: stageBonus
  };
  
  this.leadScore = Math.min(100, 
    engagement + responseQuality + activityRecency + 
    this.scoreBreakdown.profileFit + stageBonus
  );
  
  return this.leadScore;
};

// Static method: Get pipeline stats
PipelineSchema.statics.getPipelineStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: '$stage',
        count: { $sum: 1 },
        avgScore: { $avg: '$leadScore' },
        totalValue: { $sum: '$dealValue' }
      }
    },
    {
      $sort: { _id: 1 }
    }
  ]);
  
  return stats;
};

// Static method: Get hot leads (high score, recent activity)
PipelineSchema.statics.getHotLeads = async function(limit = 10) {
  return this.find({
    stage: { $nin: ['closed_won', 'closed_lost'] },
    leadScore: { $gte: 50 }
  })
  .sort({ leadScore: -1, stageChangedAt: -1 })
  .limit(limit)
  .populate('prospect');
};

// Indexes
PipelineSchema.index({ stage: 1, leadScore: -1 });
PipelineSchema.index({ assignedTo: 1, stage: 1 });
PipelineSchema.index({ 'nextAction.dueAt': 1 });

export default mongoose.models.Pipeline || mongoose.model('Pipeline', PipelineSchema);
