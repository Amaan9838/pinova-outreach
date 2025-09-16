import dbConnect from '../../../lib/mongodb.js';
import User from '../../../models/User.js';

export const dynamic = 'force-dynamic';

/**
 * Get user settings
 */
export async function GET(request) {
  try {
    await dbConnect();
    
    // For now, get default user - in production this would be from auth
    const user = await User.getDefaultUser();
    
    return Response.json({
      success: true,
      settings: user.settings
    });
    
  } catch (error) {
    console.error('Get settings error:', error);
    return Response.json(
      { success: false, error: 'Failed to get settings' },
      { status: 500 }
    );
  }
}

/**
 * Update user settings
 */
export async function PUT(request) {
  try {
    await dbConnect();
    
    const newSettings = await request.json();
    console.log('Updating user settings:', newSettings);
    
    // For now, get default user - in production this would be from auth
    const user = await User.getDefaultUser();
    
    // Update settings using the model method
    await user.updateSettings(newSettings);
    
    console.log('Settings updated successfully');
    
    return Response.json({
      success: true,
      settings: user.settings,
      message: 'Settings updated successfully'
    });
    
  } catch (error) {
    console.error('Update settings error:', error);
    return Response.json(
      { success: false, error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}

/**
 * Reset settings to defaults
 */
export async function DELETE(request) {
  try {
    await dbConnect();
    
    // For now, get default user - in production this would be from auth
    const user = await User.getDefaultUser();
    
    // Reset to default settings
    user.settings = {
      defaultTimezone: 'UTC',
      defaultBusinessHours: {
        enabled: true,
        startTime: '09:00',
        endTime: '17:00',
        daysOfWeek: [1, 2, 3, 4, 5]
      },
      defaultDailyLimit: 50,
      emailPreferences: {
        trackOpens: true,
        trackClicks: true,
        unsubscribeLink: true
      },
      uiPreferences: {
        theme: 'system',
        dateFormat: 'MM/DD/YYYY',
        timeFormat: '12h'
      },
      notifications: {
        emailNotifications: true,
        campaignUpdates: true,
        systemAlerts: true
      }
    };
    
    await user.save();
    
    return Response.json({
      success: true,
      settings: user.settings,
      message: 'Settings reset to defaults'
    });
    
  } catch (error) {
    console.error('Reset settings error:', error);
    return Response.json(
      { success: false, error: 'Failed to reset settings' },
      { status: 500 }
    );
  }
}
