import mongoose from 'mongoose';

const SuppressionSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  reason: {
    type: String,
    enum: ['bounce', 'complaint', 'unsubscribe', 'manual'],
    required: true,
  },
  source: {
    type: String,
    required: true,
  },
  campaignId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign',
  },
  messageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

export default mongoose.models.Suppression || mongoose.model('Suppression', SuppressionSchema);
