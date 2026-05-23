'use strict';
import mongoose from 'mongoose';

// ─────────────────────────────────────────────────────────────
// GTD Meta — system-level settings for FlowOS
// Single document store for review dates, preferences, etc.
// ─────────────────────────────────────────────────────────────

const GtdMetaSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, trim: true },
  value: { type: mongoose.Schema.Types.Mixed },
}, { timestamps: true });

export default mongoose.models.GtdMeta || mongoose.model('GtdMeta', GtdMetaSchema);
