import mongoose from 'mongoose';

const SequenceStepSchema = new mongoose.Schema({
  stepNumber: {
    type: Number,
    required: true,
  },
  template: {
    type: String,
    required: true,
    default: ''
  },
  subject: {
    type: String,
    required: true,
    default: ''
  },
  waitHours: {
    type: Number,
    default: 24,  // Changed from conditional default
  },
  waitMinutes: {
    type: Number,
    default: 0,
  },
  conditions: {
    ifOpened: {
      type: String,
      enum: ['continue', 'stop', 'skip_next'],
      default: 'continue',
    },
    ifReplied: {
      type: String,
      enum: ['continue', 'stop'],
      default: 'stop',
    },
    ifBounced: {
      type: String,
      enum: ['stop', 'retry'],
      default: 'stop',
    },
  },
}, { strict: false });


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
  mailbox: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Mailbox',
    required: false
  },
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
    timezone: {
      type: String,
      default: 'UTC'
    },
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
  },
  status: {
    type: String,
    enum: ['draft', 'active', 'paused', 'completed'],
    default: 'draft',
  },
  sequence: [SequenceStepSchema],
  prospects: [{
    prospectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Prospect',
    },
    currentStep: {
      type: Number,
      default: 1,
    },
    status: {
      type: String,
      enum: ['pending', 'active', 'completed', 'stopped'],
      default: 'pending',
    },
    nextSendAt: {
      type: Date,
    },
  }],
  mailboxes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Mailbox',
  }],
  // Follow-up Settings
  followUpSettings: {
    enabled: {
      type: Boolean,
      default: false,
    },
    maxFollowUps: {
      type: Number,
      default: 3,
    },
    followUpDelay: {
      type: Number,
      default: 3,
    },
    followUpTemplates: [{
      id: Number,
      subject: String,
      content: String,
      delay: Number,
    }],
    conditions: {
      noReply: {
        type: Boolean,
        default: true,
      },
      noOpen: {
        type: Boolean,
        default: false,
      },
      bounced: {
        type: Boolean,
        default: false,
      },
    },
    stopOnReply: {
      type: Boolean,
      default: true,
    },
    stopOnOpen: {
      type: Boolean,
      default: false,
    },
  },
  // Schedule Settings
  schedule: {
    name: {
      type: String,
      default: 'New schedule',
    },
    startDate: {
      type: String,
      default: 'now',
    },
    endDate: {
      type: String,
      default: 'no-end',
    },
    timing: {
      from: {
        type: String,
        default: '9:00 AM',
      },
      to: {
        type: String,
        default: '6:00 PM',
      },
      timezone: {
        type: String,
        default: 'Eastern Time (US & Canada) (UTC-04:00)',
      },
    },
    days: {
      monday: {
        type: Boolean,
        default: true,
      },
      tuesday: {
        type: Boolean,
        default: true,
      },
      wednesday: {
        type: Boolean,
        default: true,
      },
      thursday: {
        type: Boolean,
        default: true,
      },
      friday: {
        type: Boolean,
        default: true,
      },
      saturday: {
        type: Boolean,
        default: false,
      },
      sunday: {
        type: Boolean,
        default: false,
      },
    },
    settings: {
      dailyLimit: {
        type: Number,
        default: 50,
      },
      delayBetweenEmails: {
        type: Number,
        default: 5,
      },
      respectHolidays: {
        type: Boolean,
        default: true,
      },
      autoPauseOnReplies: {
        type: Boolean,
        default: true,
      },
      trackOpens: {
        type: Boolean,
        default: true,
      },
    },
    emailDelay: {
      type: Number,
      default: 5,
    },
  },
  settings: {
    sendTimeStart: {
      type: String,
      default: '09:00',
    },
    sendTimeEnd: {
      type: String,
      default: '17:00',
    },
    timezone: {
      type: String,
      default: 'America/New_York',
    },
    skipWeekends: {
      type: Boolean,
      default: true,
    },
    dailyLimit: {
      type: Number,
      default: 50,
    },
  },
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
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  }
});

// Pre-save middleware to ensure data consistency
CampaignSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.models.Campaign || mongoose.model('Campaign', CampaignSchema);