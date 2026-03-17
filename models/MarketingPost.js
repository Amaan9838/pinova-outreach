import mongoose from 'mongoose';

const MarketingPostSchema = new mongoose.Schema({
  campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'MarketingCampaign', required: true, index: true },
  title: { type: String, required: true, trim: true },
  channel: { type: String, enum: ['LinkedIn', 'Website', 'Facebook', 'Instagram'], required: true },
  type: { type: String, enum: ['Post', 'Blog', 'Carousel', 'Video', 'Reel', 'Story', 'Ad'], default: 'Post' },
  status: { type: String, enum: ['draft', 'scheduled', 'published'], default: 'draft' },
  scheduledDate: { type: Date },
  publishedDate: { type: Date },
  likes: { type: Number, default: 0 },
  comments: { type: Number, default: 0 },
  shares: { type: Number, default: 0 },
  createdBy: { type: String, default: '' },
}, { timestamps: true });

export default mongoose.models.MarketingPost || mongoose.model('MarketingPost', MarketingPostSchema);
