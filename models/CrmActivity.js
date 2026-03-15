'use strict';
import mongoose from 'mongoose';

const CrmActivitySchema = new mongoose.Schema({
  user: { type: String, required: true, trim: true },     // Amaan / Ayushman
  action: { type: String, required: true, trim: true },   // e.g. "added lead"
  target: { type: String, default: '', trim: true },       // bold part — e.g. "John Smith"
  type: {
    type: String,
    enum: ['l', 'c', 't', 'k', 's'],  // l=linkedin, c=campaign, t=task, k=call, s=session
    default: 'l',
  },
  timestamp: { type: Date, default: Date.now },
});

CrmActivitySchema.index({ timestamp: -1 });
CrmActivitySchema.index({ user: 1 });

export default mongoose.models.CrmActivity || mongoose.model('CrmActivity', CrmActivitySchema);
