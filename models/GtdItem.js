'use strict';
import mongoose from 'mongoose';

// ─────────────────────────────────────────────────────────────
// GTD Item — the core unit of the FlowOS system.
// Every thought, action, project, routine, and waiting-for
// is stored as a GtdItem with different `type` values.
// ─────────────────────────────────────────────────────────────

const GtdItemSchema = new mongoose.Schema({
  text: { type: String, required: true, trim: true },

  type: {
    type: String,
    enum: ['inbox', 'action', 'project', 'waiting', 'someday', 'routine', 'done'],
    default: 'inbox',
    index: true,
  },

  // GTD Areas of Focus
  area: {
    type: String,
    enum: ['outbound', 'inbound', 'delivery', 'ops', null],
    default: null,
  },

  // Links an action/waiting to its parent project
  projectId: { type: String, default: null, index: true },

  // Energy-based sorting (quick wins first → deep work)
  energy: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium',
  },

  estimatedMin: { type: Number, default: null },

  // Waiting For specifics
  waitingOn: { type: String, default: null, trim: true },
  waitingSince: { type: Date, default: null },

  // Today's focus + priority (The ONE Thing — Gary Keller)
  isToday: { type: Boolean, default: false },
  isPriority: { type: Boolean, default: false }, // THE one thing for today

  // Recurring tasks / Routines (Atomic Habits — James Clear)
  recurrence: {
    frequency: {
      type: String,
      enum: ['daily', 'weekdays', 'weekly', null],
      default: null,
    },
    streak: { type: Number, default: 0 },
    bestStreak: { type: Number, default: 0 },
    lastCompletedDate: { type: String, default: null }, // 'YYYY-MM-DD'
  },

  // Completion
  completedAt: { type: Date, default: null },

  notes: { type: String, default: '', trim: true },
}, { timestamps: true });

// Compound indexes for common queries
GtdItemSchema.index({ type: 1, completedAt: 1 });
GtdItemSchema.index({ type: 1, area: 1 });
GtdItemSchema.index({ type: 1, isToday: 1 });
GtdItemSchema.index({ projectId: 1, type: 1 });

export default mongoose.models.GtdItem || mongoose.model('GtdItem', GtdItemSchema);
