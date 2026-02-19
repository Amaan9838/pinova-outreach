import mongoose from 'mongoose';

/**
 * CampaignProspect Schema
 * Junction model for managing the relationship between campaigns and prospects
 * Used for tracking campaign sequence progress and scheduling
 */
const CampaignProspectSchema = new mongoose.Schema({
  // References
  campaign: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign',
    required: true
    // index covered by composite indexes below
  },
  prospect: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Prospect',
    required: true
    // index covered by composite indexes below
  },
  
  // Campaign progression
  sequenceStep: {
    type: Number,
    default: 1,
    min: 1
  },
  
  // Status tracking
  status: {
    type: String,
    enum: ['pending', 'active', 'completed', 'paused', 'stopped', 'bounced', 'replied', 'unsubscribed'],
    default: 'pending',
    index: true
  },
  

  // Scheduling
  nextSendAt: {
    type: Date,
    index: true
  },
  firstSendTime: {
    type: Date
  },
  lastSentAt: {
    type: Date
  },
  startedAt: {
    type: Date
  },
  completedAt: {
    type: Date
  },
  
  // Email tracking
  emailsSent: {
    type: Number,
    default: 0
  },
  emailsOpened: {
    type: Number,
    default: 0
  },
  emailsClicked: {
    type: Number,
    default: 0
  },
  emailsReplied: {
    type: Number,
    default: 0
  },
  emailsBounced: {
    type: Number,
    default: 0
  },
  
  // Follow-up tracking
  followUpCount: {
    type: Number,
    default: 0
  },
  lastFollowUpAt: {
    type: Date
  },
  
  // Response tracking
  repliedAt: {
    type: Date
  },
  openedAt: {
    type: Date
  },
  clickedAt: {
    type: Date
  },
  bouncedAt: {
    type: Date
  },
  unsubscribedAt: {
    type: Date
  },
  
  // AI Follow-up System
  lastOpenedAt: {
    type: Date,
    index: true
  },
  awaitingReply: {
    type: Boolean,
    default: false
  },
  aiFollowUpsGenerated: {
    type: Number,
    default: 0,
    max: 5 // Max 5 AI-generated follow-ups
  },
  lastAiFollowUpAt: {
    type: Date
  },
  
  // Visual Flow Tracking
  currentFlowNodeId: {
    type: String,
    description: 'Current position in visual flow (node ID)'
  },
  flowHistory: [{
    nodeId: String,
    enteredAt: Date,
    exitedAt: Date,
    trigger: String, // 'sent', 'opened', 'clicked', 'replied', 'timeout'
    data: mongoose.Schema.Types.Mixed
  }],
  
  // Reply Categorization
  replyCategory: {
    type: String,
    description: 'AI-categorized reply type (curious, interested, objection, not-now, custom)'
  },
  replyCategoryConfidence: {
    type: Number,
    min: 0,
    max: 1
  },
  replyCategorizedAt: {
    type: Date
  },
  replyCategoryOverriddenBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    description: 'If category was manually overridden'
  },
  
  // Additional metadata
  notes: {
    type: String,
    default: ''
  },
  
  // Personalization data specific to this campaign
  personalizedData: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // Error tracking
  lastError: {
    message: String,
    timestamp: Date,
    code: String
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
  }
}, {
  timestamps: true,
  collection: 'campaignprospects'
});

// Indexes for performance
CampaignProspectSchema.index({ campaign: 1, prospect: 1 }, { unique: true });
CampaignProspectSchema.index({ campaign: 1, status: 1 });
CampaignProspectSchema.index({ prospect: 1, status: 1 });
CampaignProspectSchema.index({ nextSendAt: 1, status: 1 });
CampaignProspectSchema.index({ status: 1, nextSendAt: 1 });

// Virtual for campaign prospect identifier
CampaignProspectSchema.virtual('identifier').get(function() {
  return `${this.campaign}_${this.prospect}`;
});

// Methods
CampaignProspectSchema.methods.markAsActive = function() {
  this.status = 'active';
  this.startedAt = this.startedAt || new Date();
  this.updatedAt = new Date();
  return this.save();
};

CampaignProspectSchema.methods.markAsCompleted = function() {
  this.status = 'completed';
  this.completedAt = new Date();
  this.updatedAt = new Date();
  return this.save();
};

CampaignProspectSchema.methods.markAsStopped = function(reason = '') {
  this.status = 'stopped';
  this.updatedAt = new Date();
  if (reason) {
    this.notes = `${this.notes}\nStopped: ${reason}`.trim();
  }
  return this.save();
};

CampaignProspectSchema.methods.recordEmailSent = function() {
  this.emailsSent += 1;
  this.lastSentAt = new Date();
  this.updatedAt = new Date();
  return this.save();
};

CampaignProspectSchema.methods.recordEmailOpened = function() {
  this.emailsOpened += 1;
  this.openedAt = new Date();
  this.updatedAt = new Date();
  return this.save();
};

CampaignProspectSchema.methods.recordEmailClicked = function() {
  this.emailsClicked += 1;
  this.clickedAt = new Date();
  this.updatedAt = new Date();
  return this.save();
};

CampaignProspectSchema.methods.recordEmailReplied = function() {
  this.emailsReplied += 1;
  this.repliedAt = new Date();
  this.status = 'replied';
  this.nextSendAt = undefined;
  this.updatedAt = new Date();
  return this.save();
};

CampaignProspectSchema.methods.recordEmailBounced = function() {
  this.emailsBounced += 1;
  this.bouncedAt = new Date();
  this.status = 'bounced';
  this.nextSendAt = undefined;
  this.updatedAt = new Date();
  return this.save();
};

CampaignProspectSchema.methods.recordUnsubscribed = function() {
  this.unsubscribedAt = new Date();
  this.status = 'unsubscribed';
  this.nextSendAt = undefined;
  this.updatedAt = new Date();
  return this.save();
};

// Scheduling methods
CampaignProspectSchema.methods.scheduleFirstSend = function(campaignStartTime, staggerOffsetMinutes = 0) {
  const firstSendTime = new Date(campaignStartTime.getTime() + (staggerOffsetMinutes * 60 * 1000));
  this.firstSendTime = firstSendTime;
  this.nextSendAt = firstSendTime;
  this.updatedAt = new Date();
  return this.save();
};

CampaignProspectSchema.methods.scheduleNextStep = function(delayMinutes = 0, delayHours = 0, delayDays = 0, timezone = 'UTC') {
  if (!this.lastSentAt) {
    throw new Error('Cannot schedule next step without a previous send time');
  }

  const totalDelayMs = (delayMinutes * 60 * 1000) +
                       (delayHours * 60 * 60 * 1000) +
                       (delayDays * 24 * 60 * 60 * 1000);

  // Calculate next send time considering timezone
  let nextSendTime = new Date(this.lastSentAt.getTime() + totalDelayMs);

  // If timezone is provided and not UTC, we need to adjust for timezone differences
  if (timezone && timezone !== 'UTC') {
    try {
      // Create a date in the target timezone
      const targetDate = new Date(nextSendTime.toLocaleString("en-US", {timeZone: timezone}));
      const utcDate = new Date(nextSendTime.toLocaleString("en-US", {timeZone: "UTC"}));
      const timezoneOffset = targetDate.getTime() - utcDate.getTime();

      // Adjust the next send time to account for timezone
      nextSendTime = new Date(nextSendTime.getTime() - timezoneOffset);
    } catch (error) {
      console.warn(`Invalid timezone ${timezone}, using UTC`);
    }
  }

  this.nextSendAt = nextSendTime;
  this.updatedAt = new Date();
  return this.save();
};

CampaignProspectSchema.methods.isReadyToSend = function() {
  return this.status === 'active' &&
         this.nextSendAt &&
         new Date() >= this.nextSendAt;
};

CampaignProspectSchema.methods.clearSchedule = function() {
  this.nextSendAt = undefined;
  this.updatedAt = new Date();
  return this.save();
};

// Static methods
CampaignProspectSchema.statics.findByCampaign = function(campaignId, status = null) {
  const query = { campaign: campaignId };
  if (status) {
    query.status = status;
  }
  return this.find(query).populate('prospect');
};

CampaignProspectSchema.statics.findByProspect = function(prospectId, status = null) {
  const query = { prospect: prospectId };
  if (status) {
    query.status = status;
  }
  return this.find(query).populate('campaign');
};



CampaignProspectSchema.statics.getCampaignStats = function(campaignId) {
  return this.aggregate([
    { $match: { campaign: new mongoose.Types.ObjectId(campaignId) } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalSent: { $sum: '$emailsSent' },
        totalOpened: { $sum: '$emailsOpened' },
        totalClicked: { $sum: '$emailsClicked' },
        totalReplied: { $sum: '$emailsReplied' },
        totalBounced: { $sum: '$emailsBounced' }
      }
    }
  ]);
};

// Scheduling static methods
CampaignProspectSchema.statics.findReadyToSend = function(campaignId = null, limit = 100) {
  const query = {
    status: 'active',
    nextSendAt: { $lte: new Date() }
  };

  if (campaignId) {
    query.campaign = campaignId;
  }

  return this.find(query)
    .populate('prospect')
    .populate('campaign')
    .limit(limit)
    .sort({ nextSendAt: 1 });
};

CampaignProspectSchema.statics.countPendingProspects = function(campaignId = null) {
  const query = { status: 'pending' };

  if (campaignId) {
    query.campaign = campaignId;
  }

  return this.countDocuments(query);
};

CampaignProspectSchema.statics.getPendingProspectsByCampaign = async function() {
  try {
    const pendingStats = await this.aggregate([
      { $match: { status: 'pending' } },
      {
        $group: {
          _id: '$campaign',
          pendingCount: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'campaigns',
          localField: '_id',
          foreignField: '_id',
          as: 'campaign'
        }
      },
      { $unwind: '$campaign' },
      {
        $project: {
          campaignId: '$_id',
          campaignName: '$campaign.name',
          campaignStatus: '$campaign.status',
          pendingCount: 1
        }
      },
      { $sort: { pendingCount: -1 } }
    ]);

    return pendingStats;
  } catch (error) {
    console.error('Error getting pending prospects by campaign:', error);
    return [];
  }
};

CampaignProspectSchema.statics.scheduleProspectsForCampaign = function(campaignId, startTime, staggerSettings = {}) {
  const { baseDelayMinutes = 2, randomVariationMinutes = 1 } = staggerSettings;

  return this.find({ campaign: campaignId, status: 'pending' })
    .then(prospects => {
      const updates = prospects.map((prospect, index) => {
        const staggerOffset = (index * baseDelayMinutes) +
                             (Math.random() * randomVariationMinutes * 2 - randomVariationMinutes);
        const firstSendTime = new Date(startTime.getTime() + (staggerOffset * 60 * 1000));

        return {
          updateOne: {
            filter: { _id: prospect._id },
            update: {
              $set: {
                firstSendTime,
                nextSendAt: firstSendTime,
                status: 'active',
                startedAt: new Date(),
                updatedAt: new Date()
              }
            }
          }
        };
      });

      return this.bulkWrite(updates);
    });
};

// Pre-save middleware
CampaignProspectSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Ensure sequence step is at least 1
  if (this.sequenceStep < 1) {
    this.sequenceStep = 1;
  }
  
  // Clear nextSendAt for certain statuses
  if (['completed', 'stopped', 'bounced', 'replied', 'unsubscribed'].includes(this.status)) {
    this.nextSendAt = undefined;
  }
  
  next();
});

// Post-save middleware for logging
CampaignProspectSchema.post('save', function(doc) {
  if (process.env.NODE_ENV === 'development') {
    console.log(`CampaignProspect updated: ${doc.campaign}_${doc.prospect} - Status: ${doc.status}`);
  }
});

export default mongoose.models.CampaignProspect || mongoose.model('CampaignProspect', CampaignProspectSchema);
