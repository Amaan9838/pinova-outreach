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

export default mongoose.models.Mailbox || mongoose.model('Mailbox', MailboxSchema);
