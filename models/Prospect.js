import mongoose from 'mongoose';

const ProspectSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  firstName: {
    type: String,
    required: true,
  },
  lastName: {
    type: String,
    default: '',
  },
  company: {
    type: String,
    default: '',
  },
  phone: {
    type: String,
    default: '',
  },
  website: {
    type: String,
    default: '',
  },
  industry: {
    type: String,
    default: '',
  },
  position: {
    type: String,
    default: '',
  },
  notes: {
    type: String,
    default: '',
  },
  instagram: {
    type: String,
    default: '',
  },
  linkedin: {
    type: String,
    default: '',
  },
  personalizationNote: {
    type: String,
    default: '',
  },
  customFields: [{
    name: {
      type: String,
      required: true,
    },
    value: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    }
  }],
  status: {
    type: String,
    enum: ['active', 'suppressed', 'bounced', 'unsubscribed', 'pending'],
    default: 'active',
    default: 'active',
  },
  tags: [{
    type: String,
  }],
  customFields: {
    type: Map,
    of: String,
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

ProspectSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.models.Prospect || mongoose.model('Prospect', ProspectSchema);
