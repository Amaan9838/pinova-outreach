import mongoose from 'mongoose';

const MarketingCampaignSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  channels: [{ type: String, enum: ['LinkedIn', 'Website', 'Facebook', 'Instagram'] }],
  owner: { type: String, default: '' },
  status: { type: String, enum: ['active', 'scheduled', 'paused', 'completed'], default: 'scheduled' },
  startDate: { type: Date },
  endDate: { type: Date },
  createdBy: { type: String, default: '' },
}, { timestamps: true });

export default mongoose.models.MarketingCampaign || mongoose.model('MarketingCampaign', MarketingCampaignSchema);
