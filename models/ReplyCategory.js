import mongoose from 'mongoose';

/**
 * ReplyCategory Schema
 * Defines categories for classifying email replies (Curious, Interested, Objection, Not Now)
 * Users can create custom categories beyond the system defaults
 */

// Response template sub-schema
const ResponseTemplateSchema = new mongoose.Schema({
  subject: {
    type: String,
    default: ''
  },
  body: {
    type: String,
    default: ''
  },
  useAI: {
    type: Boolean,
    default: false,
    description: 'If true, AI generates response instead of using template'
  },
  aiTone: {
    type: String,
    enum: ['professional', 'friendly', 'urgent', 'casual', 'formal'],
    default: 'professional'
  },
  aiInstructions: {
    type: String,
    default: '',
    description: 'Additional instructions for AI when generating response'
  }
}, { _id: false });

const ReplyCategorySchema = new mongoose.Schema({
  // Category identity
  name: {
    type: String,
    required: true,
    trim: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  description: {
    type: String,
    default: '',
    description: 'Description used for AI categorization guidance'
  },
  
  // UI customization
  color: {
    type: String,
    default: '#6366f1' // Indigo
  },
  icon: {
    type: String,
    default: 'MessageCircle',
    description: 'Lucide icon name'
  },
  
  // System vs user-created
  isSystem: {
    type: Boolean,
    default: false,
    description: 'True for default categories, false for user-created'
  },
  
  // AI Detection configuration
  keywords: [{
    type: String,
    trim: true
  }],
  aiPromptGuidance: {
    type: String,
    default: '',
    description: 'Extra context to help AI detect this category'
  },
  confidenceThreshold: {
    type: Number,
    default: 0.7,
    min: 0,
    max: 1,
    description: 'Minimum confidence score required for auto-categorization'
  },
  
  // Response configuration (Option C: both template and AI)
  responseTemplate: ResponseTemplateSchema,
  
  // Priority for display order
  priority: {
    type: Number,
    default: 0
  },
  
  // Ownership
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'replycategories'
});

// Indexes
ReplyCategorySchema.index({ userId: 1, isSystem: 1 });
ReplyCategorySchema.index({ slug: 1 });

// Pre-save: generate slug from name if not provided
ReplyCategorySchema.pre('save', function(next) {
  if (!this.slug && this.name) {
    this.slug = this.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }
  next();
});

// Static method: Get all categories for a user (system + user-created)
ReplyCategorySchema.statics.getForUser = async function(userId) {
  return this.find({
    $or: [
      { isSystem: true },
      { userId: userId }
    ]
  }).sort({ priority: 1, name: 1 });
};

// Static method: Get system defaults
ReplyCategorySchema.statics.getSystemDefaults = async function() {
  return this.find({ isSystem: true }).sort({ priority: 1 });
};

// Static method: Initialize system defaults (run once)
ReplyCategorySchema.statics.initializeDefaults = async function() {
  const defaults = [
    {
      name: 'Curious',
      slug: 'curious',
      description: 'Prospect is asking questions, wanting more information, or exploring the solution',
      color: '#3b82f6', // Blue
      icon: 'HelpCircle',
      isSystem: true,
      keywords: ['what', 'how', 'tell me more', 'curious', 'interested to know', 'explain', 'wondering'],
      aiPromptGuidance: 'Reply shows genuine curiosity or asks clarifying questions about the product/service',
      priority: 1,
      responseTemplate: {
        subject: 'Re: Quick answers to your questions',
        body: 'Great question! Let me explain...',
        useAI: true,
        aiTone: 'friendly',
        aiInstructions: 'Address their specific questions. Be helpful and informative. Invite them to schedule a call.'
      }
    },
    {
      name: 'Interested',
      slug: 'interested',
      description: 'Prospect shows positive intent, wants to proceed, or is ready for next steps',
      color: '#22c55e', // Green
      icon: 'ThumbsUp',
      isSystem: true,
      keywords: ['interested', 'yes', 'sounds good', 'let\'s talk', 'demo', 'schedule', 'pricing', 'next steps'],
      aiPromptGuidance: 'Reply indicates clear buying intent, agreement, or readiness to move forward',
      priority: 2,
      responseTemplate: {
        subject: 'Re: Let\'s get you started',
        body: 'Fantastic! I\'m excited to help you...',
        useAI: true,
        aiTone: 'professional',
        aiInstructions: 'Move quickly to next steps. Offer calendar link. Be enthusiastic but professional.'
      }
    },
    {
      name: 'Objection',
      slug: 'objection',
      description: 'Prospect has concerns, doubts, or pushback about the product/service',
      color: '#f59e0b', // Amber
      icon: 'AlertCircle',
      isSystem: true,
      keywords: ['too expensive', 'not sure', 'already have', 'don\'t need', 'competitor', 'budget', 'later', 'concern'],
      aiPromptGuidance: 'Reply expresses hesitation, concerns about price/value, or mentions competing solutions',
      priority: 3,
      responseTemplate: {
        subject: 'Re: I understand your concern',
        body: 'I totally understand where you\'re coming from...',
        useAI: true,
        aiTone: 'professional',
        aiInstructions: 'Acknowledge the objection. Provide counter-points. Share relevant case study or proof point.'
      }
    },
    {
      name: 'Not Now',
      slug: 'not-now',
      description: 'Prospect is not interested at this time but may be open to future contact',
      color: '#6b7280', // Gray
      icon: 'Clock',
      isSystem: true,
      keywords: ['not now', 'not right time', 'maybe later', 'reach out later', 'next quarter', 'busy', 'timing'],
      aiPromptGuidance: 'Reply indicates timing is wrong but doesn\'t close the door permanently',
      priority: 4,
      responseTemplate: {
        subject: 'Re: No problem - keeping in touch',
        body: 'Completely understand! Would it be okay if I...',
        useAI: true,
        aiTone: 'friendly',
        aiInstructions: 'Respect their timing. Ask for permission to follow up. Suggest a specific future date.'
      }
    }
  ];
  
  for (const category of defaults) {
    await this.findOneAndUpdate(
      { slug: category.slug, isSystem: true },
      category,
      { upsert: true, new: true }
    );
  }
  
  console.log('Reply categories initialized');
};

export default mongoose.models.ReplyCategory || mongoose.model('ReplyCategory', ReplyCategorySchema);
