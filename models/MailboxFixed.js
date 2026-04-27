import mongoose from 'mongoose';

const MailboxSchema = new mongoose.Schema({
  fromName: {
    type: String,
    required: true,
  },
  fromEmail: {
    type: String,
    required: true,
    unique: true,
  },
  domain: {
    type: String,
    required: true,
  },
  
  // DKIM Configuration for better deliverability
  dkimPrivateKey: {
    type: String, // Private key for DKIM signing
  },
  dkimSelector: {
    type: String,
    default: 'mail', // DKIM selector (mail, m1, etc)
  },
  isp: {
    type: String,
    enum: ['gmail', 'outlook', 'yahoo', 'godaddy', 'other'],
    default: 'other',
  },
  dailyCap: {
    type: Number,
    default: 10,
  },
  warmScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  status: {
  type: String,
  enum: ['warming', 'active', 'paused', 'blocked'],
  default: 'warming',
  },
  smtpConfiguration: {
  host: {
  type: String,
  required: true,
  },
  port: {
  type: Number,
  required: true,
  default: 587,
  },
  user: {
  type: String,
  required: true,
  },
  password: {
  type: String,
  required: true,
  },
  secure: {
  type: Boolean,
  default: true,
  },
  },
  // Optional IMAP configuration for reply checking
  imapConfiguration: {
  host: { type: String },
    port: { type: Number, default: 993 },
    user: { type: String },
  password: { type: String },
    tls: { type: Boolean, default: true },
   },
   // IMAP checkpoint: last processed UID to ensure idempotent scans
   lastProcessedUid: {
     type: Number,
     default: 0,
   },
   dailySent: {
     type: Number,
     default: 0,
   },
   lastDailyReset: {
     type: Date,
     default: Date.now,
   },
   lastSent: {
     type: Date,
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

MailboxSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// ─────────────────────────────────────────────────────────────────────────────
// Auto-reset dailySent counter when the day changes.
// This eliminates the need for an external cron to call /api/mailboxes/reset-daily.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resets dailySent to 0 if lastDailyReset is not today (UTC).
 * Returns the updated mailbox document.
 * Uses atomic findOneAndUpdate to avoid race conditions.
 */
MailboxSchema.statics.resetDailySentIfNeeded = async function(mailboxId) {
  const startOfToday = new Date();
  startOfToday.setUTCHours(0, 0, 0, 0);

  const mailbox = await this.findById(mailboxId);
  if (!mailbox) return null;

  const lastReset = mailbox.lastDailyReset ? new Date(mailbox.lastDailyReset) : new Date(0);

  // If last reset was before today (UTC), reset the counter
  if (lastReset < startOfToday) {
    return this.findByIdAndUpdate(
      mailboxId,
      { $set: { dailySent: 0, lastDailyReset: new Date() } },
      { new: true }
    );
  }

  return mailbox;
};

/**
 * Atomically increment dailySent, auto-resetting first if the day has changed.
 * Call this instead of raw `$inc: { dailySent: 1 }`.
 */
MailboxSchema.statics.incrementDailySent = async function(mailboxId) {
  // Reset if needed first
  await this.resetDailySentIfNeeded(mailboxId);

  // Then increment
  return this.findByIdAndUpdate(
    mailboxId,
    {
      $inc: { dailySent: 1 },
      $set: { lastSent: new Date() }
    },
    { new: true }
  );
};

export default mongoose.models.Mailbox || mongoose.model('Mailbox', MailboxSchema);
