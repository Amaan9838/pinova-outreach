import mongoose from 'mongoose';

const ConversationSchema = new mongoose.Schema({
  message: { type: String, required: true },
  direction: { type: String, enum: ['outbound', 'inbound', 'note'], default: 'note' },
  loggedBy: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

const LinkedInLeadSchema = new mongoose.Schema({
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, default: '', trim: true },
  city: { type: String, default: '', trim: true },
  linkedInUrl: { type: String, default: '', trim: true },
  status: {
    type: String,
    enum: ['new', 'messaged', 'replied', 'conversation', 'interested', 'demo', 'closed_won', 'closed_lost', 'not_interested'],
    default: 'new',
  },
  owner: { type: String, required: true, trim: true },
  nextFollowUp: { type: Date, default: null },
  conversations: [ConversationSchema],
  createdBy: { type: String, required: true, trim: true },
}, {
  timestamps: true,
});

LinkedInLeadSchema.index({ status: 1 });
LinkedInLeadSchema.index({ owner: 1 });
LinkedInLeadSchema.index({ nextFollowUp: 1 });
LinkedInLeadSchema.index({ createdAt: -1 });

const LinkedInLead = mongoose.models.LinkedInLead || mongoose.model('LinkedInLead', LinkedInLeadSchema);

export default LinkedInLead;
