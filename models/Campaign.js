import mongoose from 'mongoose';

// ─────────────────────────────────────────────────────────────────────────────
// Campaign Schema
// NOTE: Fields prefixed `v2` belong exclusively to Outreach Engine v2.
//       Legacy fields (options.dailyLimit, scheduling.staggerSettings etc.) are
//       preserved for backward-compat with non-v2 campaigns.
// ─────────────────────────────────────────────────────────────────────────────


const CampaignSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  persona: {
    type: String,
    required: true,
  },
  // NOTE: mailbox top-level field removed — use options.selectedMailbox (canonical)
  options: {
    selectedMailbox: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Mailbox',
      default: null
    },
    trackOpens: {
      type: Boolean,
      default: true
    },
    trackClicks: {
      type: Boolean,
      default: true
    },
    unsubscribeLink: {
      type: Boolean,
      default: true
    },
    // NOTE: timezone moved to scheduling.timezone for consistency
    dailyLimit: {
      type: Number,
      default: 50
    },
    notes: {
      type: String,
      default: ''
    }
  },
  goal: {
    type: String,
    required: true,
    trim: true
  },

  // AI reply knowledge base — freeform text describing the product, benefits, and objections.
  // The v2 engine injects this into the AI prompt when generating reply responses.
  knowledgeBase: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: ['draft', 'pending_scheduled', 'scheduled', 'active', 'paused', 'completed', 'failed', 'cancelled'],
    default: 'draft'
  },



  // Scheduling Configuration
  scheduling: {
    startDateTime: {
      type: Date,
      index: true
    },
    timezone: {
      type: String,
      default: 'UTC'
    },
    businessHours: {
      enabled: {
        type: Boolean,
        default: true
      },
      startTime: {
        type: String,
        default: '09:00'
      },
      endTime: {
        type: String,
        default: '17:00'
      },
      daysOfWeek: {
        type: [Number],
        default: [1, 2, 3, 4, 5] // Monday to Friday
      }
    },
    dailySendCap: {
      type: Number,
      default: 50
    },
    staggerSettings: {
      enabled: {
        type: Boolean,
        default: true
      },
      baseDelayMinutes: {
        type: Number,
        default: 2
      },
      randomVariationMinutes: {
        type: Number,
        default: 1
      }
    },
    autoActivateWhenReady: {
      type: Boolean,
      default: false
    }
  },

  // Validation and Error Tracking
  validation: {
    lastChecked: {
      type: Date
    },
    status: {
      type: String,
      enum: ['pending', 'valid', 'invalid'],
      default: 'pending'
    },
    errors: [{
      code: String,
      message: String,
      timestamp: {
        type: Date,
        default: Date.now
      }
    }],
    retryCount: {
      type: Number,
      default: 0
    },
    nextRetryAt: {
      type: Date
    }
  },
  mailboxes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Mailbox',
  }],

  stats: {
    sent: {
      type: Number,
      default: 0,
    },
    delivered: {
      type: Number,
      default: 0,
    },
    opened: {
      type: Number,
      default: 0,
    },
    clicked: {
      type: Number,
      default: 0,
    },
    replied: {
      type: Number,
      default: 0,
    },
    bounced: {
      type: Number,
      default: 0,
    },
    unsubscribed: {
      type: Number,
      default: 0,
    },
  },
  // Scheduling Timestamps
  scheduledAt: {
    type: Date
  },
  startedAt: {
    type: Date
  },
  pausedAt: {
    type: Date
  },
  completedAt: {
    type: Date
  },
  failedAt: {
    type: Date
  },
  cancelledAt: {
    type: Date
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },

  // ─── Outreach Engine v2 Fields (PRD §0, §3, §5, §9, §12) ───────────────────
  // Feature flag — v2 engine only processes campaigns with useV2Engine = true
  useV2Engine: {
    type: Boolean,
    default: false
  },

  // §3.1, §9.2 — IANA timezone (e.g. "America/New_York")
  v2Timezone: {
    type: String,
    default: 'America/New_York'
  },

  // §3.3 — Business hours window (hours in campaign timezone)
  v2BusinessHours: {
    startHour: { type: Number, default: 9 },
    endHour:   { type: Number, default: 17 }
  },

  // §3.4, §9.4 — Per-mailbox rate limits
  v2Limits: {
    dailySendLimit:  { type: Number, default: 40 },
    hourlySendLimit: { type: Number, default: 10 },
    minGapMinutes:   { type: Number, default: 3 }
  },

  // §3.5, §3.7, §3.8 — Delay and cooling config
  v2Delays: {
    baseDelayHours:       { type: Number, default: 24 },
    escalationMultiplier: { type: Number, default: 1.5 },
    coolingPeriodDays:    { type: Number, default: 30 },
    maxAttemptsPerCycle:  { type: Number, default: 6 }
  },

  // §5.1–5.3 — Angle rotation (minimum 3 required before v2 activation)
  v2Angles: [{
    key:         { type: String, required: true },
    description: { type: String, required: true }
  }]
});

// Instance methods for scheduling
CampaignSchema.methods.canBeScheduled = function() {
  return ['draft', 'pending_scheduled', 'failed', 'active'].includes(this.status);
};

CampaignSchema.methods.isScheduled = function() {
  return ['pending_scheduled', 'scheduled'].includes(this.status);
};

CampaignSchema.methods.isReadyToStart = function() {
  return this.status === 'scheduled' &&
         this.scheduling?.startDateTime &&
         new Date() >= this.scheduling.startDateTime;
};

CampaignSchema.methods.markAsScheduled = function(startDateTime, timezone = 'UTC') {
  this.status = 'scheduled';
  this.scheduling = this.scheduling || {};
  this.scheduling.startDateTime = startDateTime;
  this.scheduling.timezone = timezone;
  this.scheduledAt = new Date();
  this.validation.status = 'pending';
  return this.save();
};

CampaignSchema.methods.markAsPendingScheduled = function(startDateTime, timezone = 'UTC', errors = []) {
  this.status = 'pending_scheduled';
  this.scheduling = this.scheduling || {};
  this.scheduling.startDateTime = startDateTime;
  this.scheduling.timezone = timezone;
  this.scheduledAt = new Date();
  this.validation.status = 'invalid';
  this.validation.errors = errors;
  return this.save();
};

CampaignSchema.methods.addValidationError = function(code, message) {
  this.validation.errors = this.validation.errors || [];
  this.validation.errors.push({
    code,
    message,
    timestamp: new Date()
  });
  this.validation.status = 'invalid';
  this.validation.lastChecked = new Date();
};

CampaignSchema.methods.clearValidationErrors = function() {
  this.validation.errors = [];
  this.validation.status = 'valid';
  this.validation.lastChecked = new Date();
  this.validation.retryCount = 0;
  this.validation.nextRetryAt = undefined;
};

// Pre-save middleware to ensure data consistency and validate status transitions
CampaignSchema.pre('save', function(next) {
  this.updatedAt = Date.now();

  // Validate status transitions if status is being modified
  if (this.isModified('status')) {
    const previousStatus = this.isNew ? null : this.$__original?.status;
    const newStatus = this.status;

    // Define valid status transitions
    const validTransitions = {
      // From draft
      'draft': ['pending_scheduled', 'scheduled', 'active', 'cancelled'],
      // From pending_scheduled
      'pending_scheduled': ['scheduled', 'draft', 'failed', 'cancelled'],
      // From scheduled
      'scheduled': ['active', 'failed', 'cancelled', 'draft'],
      // From active
      'active': ['paused', 'completed', 'failed', 'cancelled'],
      // From paused
      'paused': ['active', 'cancelled', 'failed'],
      // From completed (generally final)
      'completed': ['cancelled'], // Allow cancellation for data cleanup
      // From failed
      'failed': ['scheduled', 'draft', 'cancelled'], // Allow retry
      // From cancelled (generally final)
      'cancelled': [] // No transitions from cancelled
    };

    // Check if transition is valid (skip check for new documents)
    if (!this.isNew && previousStatus && validTransitions[previousStatus]) {
      if (!validTransitions[previousStatus].includes(newStatus)) {
        const error = new Error(
          `Invalid status transition from "${previousStatus}" to "${newStatus}". ` +
          `Valid transitions: ${validTransitions[previousStatus].join(', ')}`
        );
        error.code = 'INVALID_STATUS_TRANSITION';
        return next(error);
      }
    }

    // Set status timestamps
    const now = new Date();
    switch (this.status) {
      case 'scheduled':
        if (!this.scheduledAt) this.scheduledAt = now;
        break;
      case 'active':
        if (!this.startedAt) this.startedAt = now;
        break;
      case 'paused':
        if (!this.pausedAt) this.pausedAt = now;
        break;
      case 'completed':
        if (!this.completedAt) this.completedAt = now;
        break;
      case 'failed':
        if (!this.failedAt) this.failedAt = now;
        break;
      case 'cancelled':
        if (!this.cancelledAt) this.cancelledAt = now;
        break;
    }

    // Log status transition for debugging
    if (previousStatus && previousStatus !== newStatus) {
      console.log(`Campaign ${this._id} status transition: ${previousStatus} → ${newStatus}`);
    }
  }

  next();
});

// Store original document for transition validation
CampaignSchema.pre('save', function(next) {
  if (!this.isNew && this.isModified()) {
    this.$__original = this.$__original || {};
    if (this.isModified('status')) {
      // Store original status before changes
      const original = this.$__original;
      if (!original.status) {
        original.status = this.getChanges().$set?.status ?
          this.depopulate().toObject().status : this.status;
      }
    }
  }
  next();
});

// ─ v2 engine fields are defined inline in the main schema (see options below) ─

// Indexes for performance
CampaignSchema.index({ status: 1, 'scheduling.startDateTime': 1 });
CampaignSchema.index({ 'validation.nextRetryAt': 1, status: 1 });
CampaignSchema.index({ useV2Engine: 1, status: 1 });

export default mongoose.models.Campaign || mongoose.model('Campaign', CampaignSchema);