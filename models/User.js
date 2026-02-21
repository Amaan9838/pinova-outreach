import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  // Global user settings
  settings: {
    // Default timezone for all campaigns
    defaultTimezone: {
      type: String,
      default: 'UTC'
    },
    // Default business hours
    defaultBusinessHours: {
      enabled: {
        type: Boolean,
        default: true
      },
      startTime: {
        type: String,
        default: '09:00'
      },
      endTime: {
        type: String,
        default: '17:00'
      },
      daysOfWeek: {
        type: [Number],
        default: [1, 2, 3, 4, 5] // Monday to Friday
      }
    },
    // Default sending limits
    defaultDailyLimit: {
      type: Number,
      default: 50
    },
    // Email preferences
    emailPreferences: {
      trackOpens: {
        type: Boolean,
        default: true
      },
      trackClicks: {
        type: Boolean,
        default: true
      },
      unsubscribeLink: {
        type: Boolean,
        default: true
      }
    },
    // UI preferences
    uiPreferences: {
      theme: {
        type: String,
        enum: ['light', 'dark', 'system'],
        default: 'system'
      },
      dateFormat: {
        type: String,
        enum: ['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'],
        default: 'MM/DD/YYYY'
      },
      timeFormat: {
        type: String,
        enum: ['12h', '24h'],
        default: '12h'
      }
    },
    // Notification preferences
    notifications: {
      emailNotifications: {
        type: Boolean,
        default: true
      },
      campaignUpdates: {
        type: Boolean,
        default: true
      },
      systemAlerts: {
        type: Boolean,
        default: true
      }
    }
  },
  // Account status
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  },
  // Subscription info (for future use)
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'starter', 'professional', 'enterprise'],
      default: 'free'
    },
    status: {
      type: String,
      enum: ['active', 'cancelled', 'past_due', 'trialing'],
      default: 'trialing'
    },
    currentPeriodEnd: {
      type: Date
    }
  }
}, {
  timestamps: true
});

// Indexes
UserSchema.index({ 'settings.defaultTimezone': 1 });

// Methods
UserSchema.methods.getDefaultCampaignSettings = function() {
  return {
    timezone: this.settings.defaultTimezone,
    businessHours: this.settings.defaultBusinessHours,
    dailyLimit: this.settings.defaultDailyLimit,
    trackOpens: this.settings.emailPreferences.trackOpens,
    trackClicks: this.settings.emailPreferences.trackClicks,
    unsubscribeLink: this.settings.emailPreferences.unsubscribeLink
  };
};

UserSchema.methods.updateSettings = function(newSettings) {
  // Deep merge settings
  this.settings = {
    ...this.settings,
    ...newSettings,
    defaultBusinessHours: {
      ...this.settings.defaultBusinessHours,
      ...(newSettings.defaultBusinessHours || {})
    },
    emailPreferences: {
      ...this.settings.emailPreferences,
      ...(newSettings.emailPreferences || {})
    },
    uiPreferences: {
      ...this.settings.uiPreferences,
      ...(newSettings.uiPreferences || {})
    },
    notifications: {
      ...this.settings.notifications,
      ...(newSettings.notifications || {})
    }
  };
  return this.save();
};

// Static methods
UserSchema.statics.getDefaultUser = async function() {
  // For now, return a default user - in production this would be from auth
  let user = await this.findOne({ email: 'default@example.com' });
  if (!user) {
    user = await this.create({
      email: 'default@example.com',
      name: 'Default User'
    });
  }
  return user;
};

const User = mongoose.models.User || mongoose.model('User', UserSchema);

export default User;
