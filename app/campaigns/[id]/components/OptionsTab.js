'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Mail, Zap, Play, Pause, Trash2, Settings, Save } from 'lucide-react';

export default function OptionsTab({
  campaign,
  sendTestEmail,
  processSequencesManually,
  pauseCampaign,
  resumeCampaign,
  deleteCampaign,
}) {
  const [mailboxes, setMailboxes] = useState([]);
  const [settings, setSettings] = useState({
    selectedMailbox: '',
    trackOpens: true,
    trackClicks: true,
    unsubscribeLink: true,

    notes: '',
    // Follow-up settings
    followUpEnabled: false,
    stopOnReply: true,
    stopOnOpen: false
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchMailboxes();
    
    // Initialize settings from campaign data
    if (campaign?.options || campaign?.followUpSettings) {
      // Use either the options.selectedMailbox or the campaign.mailbox
      const selectedMailbox = campaign.options?.selectedMailbox || campaign.mailbox || '';
      
      setSettings({
        selectedMailbox,
        trackOpens: campaign.options?.trackOpens ?? true,
        trackClicks: campaign.options?.trackClicks ?? true,
        unsubscribeLink: campaign.options?.unsubscribeLink ?? true,

        notes: campaign.options?.notes || '',
        // Follow-up settings from campaign
        followUpEnabled: campaign.followUpSettings?.enabled ?? false,
        stopOnReply: campaign.followUpSettings?.stopOnReply ?? true,
        stopOnOpen: campaign.followUpSettings?.stopOnOpen ?? false
      });
    }
  }, [campaign?._id, campaign?.options, campaign?.mailbox]);

  const loadCampaignOptions = async () => {
    if (!campaign?._id) return;
    
    try {
      console.log('Loading options for campaign:', campaign._id);
      const response = await fetch(`/api/campaigns/${campaign._id}/options`);
      console.log('Options API response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Options API response data:', data);
        
        if (data.success && data.options) {
          console.log('Setting options:', data.options);
          // Handle null selectedMailbox from database
          const optionsToSet = {
            ...data.options,
            selectedMailbox: data.options.selectedMailbox || ''
          };
          console.log('Final options to set:', optionsToSet);
          setSettings(optionsToSet);
        } else {
          console.log('No options found, using defaults');
        }
      } else {
        console.error('Options API response not ok:', response.statusText);
      }
    } catch (error) {
      console.error('Failed to load campaign options:', error);
    }
  };

  const fetchMailboxes = async () => {
    try {
      const response = await fetch('/api/mailboxes');
      const data = await response.json();
      if (data.success) {
        setMailboxes(data.mailboxes || []);
      }
    } catch (error) {
      console.error('Failed to fetch mailboxes:', error);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      // Validate settings before saving
      if (!settings.selectedMailbox && campaign.status === 'active') {
        throw new Error('A mailbox must be selected for active campaigns');
      }
      
      const response = await fetch(`/api/campaigns/${campaign._id}/options`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selectedMailbox: settings.selectedMailbox || null,
          trackOpens: settings.trackOpens,
          trackClicks: settings.trackClicks,
          unsubscribeLink: settings.unsubscribeLink,

          notes: settings.notes || '',
          // Follow-up settings
          followUpSettings: {
            enabled: settings.followUpEnabled,
            stopOnReply: settings.stopOnReply,
            stopOnOpen: settings.stopOnOpen
          }
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        // Update local state with server response
        if (data.options) {
          setSettings({
            selectedMailbox: data.options.selectedMailbox || '',
            trackOpens: data.options.trackOpens ?? true,
            trackClicks: data.options.trackClicks ?? true,
            unsubscribeLink: data.options.unsubscribeLink ?? true,
            dailyLimit: data.options.dailyLimit || 50,
            timezone: data.options.timezone || 'UTC',
            notes: data.options.notes || '',
            // Follow-up settings from response
            followUpEnabled: data.followUpSettings?.enabled ?? false,
            stopOnReply: data.followUpSettings?.stopOnReply ?? true,
            stopOnOpen: data.followUpSettings?.stopOnOpen ?? false
          });
        }
        toast.success('Campaign options saved successfully!', {
          duration: 3000,
          position: 'top-center',
        });
      } else {
        throw new Error(data.error || 'Failed to save options');
      }
    } catch (error) {
      console.error('Error saving campaign options:', error);
      toast.error(error.message, {
        duration: 5000,
        position: 'top-center',
      });
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button onClick={sendTestEmail} className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Send Test Email
            </Button>
            <Button 
              onClick={processSequencesManually} 
              variant="outline"
              className="flex items-center gap-2 text-blue-600 border-blue-200 hover:bg-blue-50"
            >
              <Zap className="h-4 w-4" />
              Process Sequences Now
            </Button>
            {campaign.status === 'active' && (
              <Button 
                onClick={pauseCampaign} 
                variant="outline"
                className="flex items-center gap-2 text-yellow-600 border-yellow-200 hover:bg-yellow-50"
              >
                <Pause className="h-4 w-4" />
                Pause Campaign
              </Button>
            )}
            {campaign.status === 'paused' && (
              <Button 
                onClick={resumeCampaign}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
              >
                <Play className="h-4 w-4" />
                Resume Campaign
              </Button>
            )}
            <Button 
              onClick={deleteCampaign} 
              variant="outline"
              className="flex items-center gap-2 text-red-600 border-red-200 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
              Delete Campaign
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Campaign Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Campaign Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Mailbox Selection */}
          <div className="space-y-2">
            <Label htmlFor="mailbox">Sending Mailbox</Label>
            <Select 
              value={settings.selectedMailbox} 
              onValueChange={(value) => setSettings(prev => ({ ...prev, selectedMailbox: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a mailbox..." />
              </SelectTrigger>
              <SelectContent>
                {mailboxes.length > 0 ? (
                  mailboxes.map((mailbox) => (
                    <SelectItem key={mailbox._id} value={mailbox._id}>
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col">
                          <span className="font-medium">{mailbox.fromEmail}</span>
                          <span className="text-xs text-gray-500">{mailbox.fromName}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className={`w-2 h-2 rounded-full ${
                            mailbox.status === 'active' ? 'bg-green-500' :
                            mailbox.status === 'warming' ? 'bg-yellow-500' :
                            mailbox.status === 'paused' ? 'bg-gray-500' :
                            'bg-red-500'
                          }`}></div>
                          <span className="text-xs text-gray-400 capitalize">{mailbox.status}</span>
                        </div>
                      </div>
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-mailboxes" disabled>
                    No mailboxes available - Add mailboxes first
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Daily Limit */}
          <div className="space-y-2">
            <Label htmlFor="dailyLimit">Daily Email Limit</Label>
            <Input
              id="dailyLimit"
              type="number"
              min="1"
              max="500"
              value={settings.dailyLimit}
              onChange={(e) => setSettings(prev => ({ ...prev, dailyLimit: parseInt(e.target.value) || 50 }))}
              className="w-32"
            />
            <p className="text-xs text-gray-500">Maximum emails to send per day</p>
          </div>

          {/* Timezone */}
          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <Select 
              value={settings.timezone} 
              onValueChange={(value) => setSettings(prev => ({ ...prev, timezone: value }))}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Asia/Kolkata">India Standard Time (IST)</SelectItem>
                <SelectItem value="UTC">UTC</SelectItem>
                <SelectItem value="America/New_York">Eastern Time</SelectItem>
                <SelectItem value="America/Chicago">Central Time</SelectItem>
                <SelectItem value="America/Denver">Mountain Time</SelectItem>
                <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                <SelectItem value="Europe/London">London</SelectItem>
                <SelectItem value="Europe/Paris">Paris</SelectItem>
                <SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tracking Options */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Tracking Options</h4>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="trackOpens">Track Email Opens</Label>
                <p className="text-xs text-gray-500">Monitor when recipients open your emails</p>
              </div>
              <Switch
                id="trackOpens"
                checked={settings.trackOpens}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, trackOpens: checked }))}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="trackClicks">Track Link Clicks</Label>
                <p className="text-xs text-gray-500">Monitor when recipients click links in your emails</p>
              </div>
              <Switch
                id="trackClicks"
                checked={settings.trackClicks}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, trackClicks: checked }))}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="unsubscribeLink">Include Unsubscribe Link</Label>
                <p className="text-xs text-gray-500">Add unsubscribe link to all emails (recommended)</p>
              </div>
              <Switch
                id="unsubscribeLink"
                checked={settings.unsubscribeLink}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, unsubscribeLink: checked }))}
              />
            </div>
          </div>

          {/* Follow-up Settings */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Follow-up Settings</h4>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="followUpEnabled">Enable Follow-ups</Label>
                <p className="text-xs text-gray-500">Automatically send follow-up emails based on engagement</p>
              </div>
              <Switch
                id="followUpEnabled"
                checked={settings.followUpEnabled}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, followUpEnabled: checked }))}
              />
            </div>

            {settings.followUpEnabled && (
              <>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800 font-medium mb-1">Follow-up Configuration</p>
                  <p className="text-xs text-blue-600">
                    Follow-up timing and number of emails are controlled by your <strong>Sequence steps</strong>. 
                    Create additional steps in the Sequences tab to add more follow-ups with custom delays.
                  </p>
                </div>

                <div className="space-y-3">
                  <h5 className="text-sm font-medium text-gray-900">Stop Follow-ups When:</h5>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="stopOnReply">Prospect Replies</Label>
                      <p className="text-xs text-gray-500">Stop sending follow-ups when prospect responds</p>
                    </div>
                    <Switch
                      id="stopOnReply"
                      checked={settings.stopOnReply}
                      onCheckedChange={(checked) => setSettings(prev => ({ ...prev, stopOnReply: checked }))}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="stopOnOpen">Prospect Opens Email</Label>
                      <p className="text-xs text-gray-500">Stop sending follow-ups when prospect opens email</p>
                    </div>
                    <Switch
                      id="stopOnOpen"
                      checked={settings.stopOnOpen}
                      onCheckedChange={(checked) => setSettings(prev => ({ ...prev, stopOnOpen: checked }))}
                    />
                  </div>
                </div>

                {/* Cron Information */}
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h5 className="text-sm font-medium text-gray-900 mb-2">Automation Setup</h5>
                  <p className="text-sm text-gray-600 mb-3">
                    Follow-ups are processed automatically via cron jobs. Set up the following URL to run every hour:
                  </p>
                  <div className="bg-white p-3 rounded border font-mono text-sm break-all">
                    {typeof window !== 'undefined' ? window.location.origin : ''}/api/cron/process-followups
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    This endpoint processes all campaigns and sends follow-up emails based on your settings.
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Campaign Notes</Label>
            <Textarea
              id="notes"
              placeholder="Add any notes about this campaign..."
              value={settings.notes}
              onChange={(e) => setSettings(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
            />
          </div>

          {/* Save Button */}
          <div className="pt-4 border-t">
            <Button onClick={saveSettings} disabled={saving} className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
