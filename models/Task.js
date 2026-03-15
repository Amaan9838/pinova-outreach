'use strict';
import mongoose from 'mongoose';

const TaskSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  owner: { type: String, required: true, trim: true },     // Amaan / Ayushman
  status: {
    type: String,
    enum: ['pending', 'done'],
    default: 'pending',
  },
  dueDate: { type: Date, default: null },
  createdBy: { type: String, default: '', trim: true },
}, { timestamps: true });

TaskSchema.index({ owner: 1, status: 1 });
TaskSchema.index({ dueDate: 1 });

export default mongoose.models.Task || mongoose.model('Task', TaskSchema);
