'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { 
  Settings, 
  Clock, 
  Mail, 
  Bell, 
  Palette, 
  Save, 
  RefreshCw, 
  CheckCircle,
  Globe,
  Calendar,
  Monitor
} from 'lucide-react';

const TIMEZONES = [
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
  { value: 'Europe/Berlin', label: 'Berlin (CET/CEST)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
  { value: 'Asia/Kolkata', label: 'India (IST)' },
  { value: 'Asia/Dubai', label: 'Dubai (GST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST/AEDT)' },
  { value: 'Australia/Melbourne', label: 'Melbourne (AEST/AEDT)' }
];

const DAYS_OF_WEEK = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 0, label: 'Sunday' }
];

export default function SettingsPage() {
  const [settings, setSettings] = useState({
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
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/settings');
      const data = await response.json();
      
      if (data.success) {
        setSettings(data.settings);
      } else {
        toast.error('Failed to load settings');
      }
    } catch (error) {
      console.error('Load settings error:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('Settings saved successfully!');
        setSettings(data.settings);
      } else {
        toast.error('Failed to save settings');
      }
    } catch (error) {
      console.error('Save settings error:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const resetSettings = async () => {
    if (!confirm('Are you sure you want to reset all settings to defaults?')) {
      return;
    }
    
    setSaving(true);
    try {
      const response = await fetch('/api/settings', {
        method: 'DELETE'
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('Settings reset to defaults');
        setSettings(data.settings);
      } else {
        toast.error('Failed to reset settings');
      }
    } catch (error) {
      console.error('Reset settings error:', error);
      toast.error('Failed to reset settings');
    } finally {
      setSaving(false);
    }
  };

  const updateSettings = (path, value) => {
    setSettings(prev => {
      const newSettings = { ...prev };
      const keys = path.split('.');
      let current = newSettings;
      
      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...current[keys[i]] };
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return newSettings;
    });
  };

  const toggleDayOfWeek = (day) => {
    const currentDays = settings.defaultBusinessHours.daysOfWeek;
    const newDays = currentDays.includes(day)
      ? currentDays.filter(d => d !== day)
      : [...currentDays, day].sort();
    
    updateSettings('defaultBusinessHours.daysOfWeek', newDays);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Settings className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        </div>
        <p className="text-gray-600">
          Configure your global preferences and defaults for campaigns
        </p>
      </div>

      {/* Settings Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="email" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email
          </TabsTrigger>
          <TabsTrigger value="ui" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Interface
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Default Timezone & Business Hours
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Default Timezone */}
              <div className="space-y-2">
                <Label htmlFor="defaultTimezone">Default Timezone</Label>
                <Select 
                  value={settings.defaultTimezone} 
                  onValueChange={(value) => updateSettings('defaultTimezone', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map(tz => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-gray-500">
                  This timezone will be used as default for new campaigns
                </p>
              </div>

              {/* Business Hours */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Business Hours</Label>
                  <Switch
                    checked={settings.defaultBusinessHours.enabled}
                    onCheckedChange={(checked) => updateSettings('defaultBusinessHours.enabled', checked)}
                  />
                </div>
                
                {settings.defaultBusinessHours.enabled && (
                  <div className="space-y-4 pl-4 border-l-2 border-gray-200">
                    {/* Time Range */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Start Time</Label>
                        <Input
                          type="time"
                          value={settings.defaultBusinessHours.startTime}
                          onChange={(e) => updateSettings('defaultBusinessHours.startTime', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>End Time</Label>
                        <Input
                          type="time"
                          value={settings.defaultBusinessHours.endTime}
                          onChange={(e) => updateSettings('defaultBusinessHours.endTime', e.target.value)}
                        />
                      </div>
                    </div>
                    
                    {/* Days of Week */}
                    <div className="space-y-2">
                      <Label>Active Days</Label>
                      <div className="flex flex-wrap gap-2">
                        {DAYS_OF_WEEK.map(day => (
                          <Badge
                            key={day.value}
                            variant={settings.defaultBusinessHours.daysOfWeek.includes(day.value) ? "default" : "outline"}
                            className="cursor-pointer"
                            onClick={() => toggleDayOfWeek(day.value)}
                          >
                            {day.label}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Daily Limit */}
              <div className="space-y-2">
                <Label htmlFor="defaultDailyLimit">Default Daily Send Limit</Label>
                <Input
                  id="defaultDailyLimit"
                  type="number"
                  min="1"
                  max="1000"
                  value={settings.defaultDailyLimit}
                  onChange={(e) => updateSettings('defaultDailyLimit', parseInt(e.target.value) || 50)}
                />
                <p className="text-sm text-gray-500">
                  Maximum emails to send per day for new campaigns
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email Settings */}
        <TabsContent value="email" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Default Email Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Track Email Opens</Label>
                  <p className="text-sm text-gray-500">Monitor when recipients open your emails</p>
                </div>
                <Switch
                  checked={settings.emailPreferences.trackOpens}
                  onCheckedChange={(checked) => updateSettings('emailPreferences.trackOpens', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label>Track Link Clicks</Label>
                  <p className="text-sm text-gray-500">Monitor when recipients click links in your emails</p>
                </div>
                <Switch
                  checked={settings.emailPreferences.trackClicks}
                  onCheckedChange={(checked) => updateSettings('emailPreferences.trackClicks', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label>Include Unsubscribe Link</Label>
                  <p className="text-sm text-gray-500">Automatically add unsubscribe links to emails</p>
                </div>
                <Switch
                  checked={settings.emailPreferences.unsubscribeLink}
                  onCheckedChange={(checked) => updateSettings('emailPreferences.unsubscribeLink', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* UI Settings */}
        <TabsContent value="ui" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="h-5 w-5" />
                Interface Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Theme</Label>
                <Select 
                  value={settings.uiPreferences.theme} 
                  onValueChange={(value) => updateSettings('uiPreferences.theme', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Date Format</Label>
                <Select 
                  value={settings.uiPreferences.dateFormat} 
                  onValueChange={(value) => updateSettings('uiPreferences.dateFormat', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                    <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                    <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Time Format</Label>
                <Select 
                  value={settings.uiPreferences.timeFormat} 
                  onValueChange={(value) => updateSettings('uiPreferences.timeFormat', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="12h">12 Hour (AM/PM)</SelectItem>
                    <SelectItem value="24h">24 Hour</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Email Notifications</Label>
                  <p className="text-sm text-gray-500">Receive notifications via email</p>
                </div>
                <Switch
                  checked={settings.notifications.emailNotifications}
                  onCheckedChange={(checked) => updateSettings('notifications.emailNotifications', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label>Campaign Updates</Label>
                  <p className="text-sm text-gray-500">Get notified about campaign status changes</p>
                </div>
                <Switch
                  checked={settings.notifications.campaignUpdates}
                  onCheckedChange={(checked) => updateSettings('notifications.campaignUpdates', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label>System Alerts</Label>
                  <p className="text-sm text-gray-500">Receive important system notifications</p>
                </div>
                <Switch
                  checked={settings.notifications.systemAlerts}
                  onCheckedChange={(checked) => updateSettings('notifications.systemAlerts', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-6 border-t">
        <Button
          onClick={resetSettings}
          variant="outline"
          disabled={saving}
        >
          Reset to Defaults
        </Button>
        
        <div className="flex items-center gap-3">
          <Alert className="border-blue-200 bg-blue-50 p-3">
            <CheckCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800 text-sm">
              These settings will be used as defaults for new campaigns
            </AlertDescription>
          </Alert>
          
          <Button
            onClick={saveSettings}
            disabled={saving}
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </div>
    </div>
  );
}
