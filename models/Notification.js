import mongoose from 'mongoose';

const NotificationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: [
      'lead_hot',          // lead became hot
      'follow_up_due',     // next action is overdue
      'reply_received',    // got a reply from a lead
      'lead_cooling',      // no activity on warm/hot lead
      'deal_stalled',      // pipeline_opportunity with no activity
      'stage_changed',     // pipeline stage changed
      'task_overdue',      // task past due date
      'new_lead',          // new lead created
      'heat_change',       // heat level changed
    ],
    required: true,
    index: true,
  },
  title: { type: String, required: true },
  message: { type: String, default: '' },
  leadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead',
    default: null,
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
  },
  read: { type: Boolean, default: false, index: true },
  readAt: { type: Date, default: null },
  forUser: { type: String, required: true, index: true },   // 'Amaan' | 'Ayushman'
  actionUrl: { type: String, default: '' },
  // Slack delivery tracking
  slackSent: { type: Boolean, default: false },
  slackTs: { type: String, default: '' },                   // Slack message timestamp
}, {
  timestamps: true,
});

NotificationSchema.index({ forUser: 1, read: 1, createdAt: -1 });
NotificationSchema.index({ createdAt: -1 });

export default mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);
