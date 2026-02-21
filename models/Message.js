import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema({
  campaignId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign',
    required: function() { return !this.isIndividual && !this.isTest; }
  },
  prospectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Prospect',
    required: function() { return !this.isIndividual && !this.isTest; }
  },
  mailboxId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Mailbox',
    required: true,
  },
  messageId: {
    type: String,
    unique: true,
    sparse: true, // Allow multiple null values
  },
  subject: {
    type: String,
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  contentHash: {
    type: String,
  },
  status: {
    type: String,
    enum: ['queued', 'sending', 'sent', 'delivered', 'opened', 'replied', 'bounced', 'failed'],
    default: 'queued',
  },
  trackingId: {
    type: String,
    sparse: true,
  },
  events: [{
    type: {
      type: String,
      enum: ['sent', 'delivered', 'opened', 'clicked', 'bounced', 'replied', 'unsubscribed'],
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    data: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
    },
  }],
  sesMessageId: {
    type: String,
  },
  errorMessage: {
    type: String,
  },
  sentAt: {
    type: Date,
  },
  deliveredAt: {
    type: Date,
  },
  openedAt: {
    type: Date,
  },
  repliedAt: {
    type: Date,
  },
  // Idempotency keys for processed inbound replies
  processedReplyKeys: [{
    type: String,
  }],
  // Email type flags
  isTest: {
    type: Boolean,
    default: false,
  },
  testType: {
    type: String,
    enum: ['deliverability', 'warmup', 'spam_check'],
  },
  isIndividual: {
    type: Boolean,
    default: false,
  },
  toEmail: {
  type: String, // For individual emails without prospects
  },
  headerMessageId: {
    type: String, // The Message-ID header used for threading
  },
  // RFC 2822 References header — array of previous Message-IDs in this thread
  references: [{
    type: String,
  }],
  // Which flow sequence step created this message
  sequenceStep: {
    type: Number,
  },
  // True if this message was sent by the 'send_response' action node (not initial outreach)
  isResponse: {
    type: Boolean,
    default: false,
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

MessageSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

MessageSchema.index({ campaignId: 1, prospectId: 1, stepNumber: 1 });


export default mongoose.models.Message || mongoose.model('Message', MessageSchema);
