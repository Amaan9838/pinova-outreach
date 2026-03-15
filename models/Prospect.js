import mongoose from 'mongoose';

const ProspectSchema = new mongoose.Schema({
  // Primary email (required)
  email: {
    type: String,
    required: true,
    unique: true,
  },
  // Additional emails for multi-email support
  additionalEmails: [{
    email: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['work', 'personal', 'other'],
      default: 'work',
    },
    isPrimary: {
      type: Boolean,
      default: false,
    }
  }],
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
  zillow: {
    type: String,
    default: '',
  },
  facebook: {
    type: String,
    default: '',
  },
  personalizationNote: {
    type: String,
    default: '',
  },
  // Enhanced custom fields with proper structure
  customFields: [{
    name: {
      type: String,
      required: true,
    },
    value: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    type: {
      type: String,
      enum: ['text', 'number', 'url', 'email', 'date'],
      default: 'text',
    }
  }],
  status: {
    type: String,
    enum: ['active', 'suppressed', 'bounced', 'unsubscribed', 'pending'],
    default: 'active',
  },
  tags: [{
    type: String,
  }],
  // Source information for tracking where prospect came from
  source: {
    type: String,
    enum: ['manual', 'csv_import', 'bulk_import', 'campaign_import', 'api', 'integration'],
    default: 'manual',
  },
  // Import metadata
  importMetadata: {
    importId: String,
    importDate: Date,
    originalData: mongoose.Schema.Types.Mixed,
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
