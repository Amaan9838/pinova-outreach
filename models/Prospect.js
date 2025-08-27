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
  },
  company: {
    type: String,
  },
  city: {
    type: String,
  },
  neighborhood: {
    type: String,
  },
  listingPrice: {
    type: String,
  },
  instagramUrl: {
    type: String,
  },
  linkedinUrl: {
    type: String,
  },
  websiteUrl: {
    type: String,
  },
  sourceUrl: {
    type: String,
  },
  lawfulBasis: {
    type: String,
    default: 'legitimate_interest',
  },
  score: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ['active', 'suppressed', 'bounced', 'unsubscribed'],
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
