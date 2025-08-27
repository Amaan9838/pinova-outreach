import mongoose from 'mongoose';

const SequenceStepSchema = new mongoose.Schema({
  stepNumber: {
    type: Number,
    required: true,
  },
  template: {
    type: String,
    required: true,
  },
  subject: {
    type: String,
    required: true,
  },
  waitHours: {
    type: Number,
    default: 24,
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
});

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

CampaignSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.models.Campaign || mongoose.model('Campaign', CampaignSchema);
