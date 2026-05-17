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
import { Settings, Save, Mail, Clock, Shield } from 'lucide-react';

function normalizeMailboxId(mailbox) {
  if (!mailbox) return '';
  if (typeof mailbox === 'string') return mailbox;
  if (typeof mailbox === 'object' && mailbox._id) return mailbox._id.toString();
  return mailbox.toString?.() || '';
}

export default function OptionsTab({
  campaign,
  sendTestEmail,
  processSequencesManually,
  pauseCampaign,
  resumeCampaign,
  deleteCampaign,
}) {
  const [availableMailboxes, setAvailableMailboxes] = useState([]);
  const [selectedMailboxIds, setSelectedMailboxIds] = useState([]);
  const [settings, setSettings] = useState({
    selectedMailbox: '',
    trackOpens: true,
    trackClicks: true,
    unsubscribeLink: true,
    timezone: 'America/New_York',
    notes: '',
    // Follow-up settings
    followUpEnabled: false,
    stopOnReply: true,
    stopOnOpen: false
  });
  const [sendPacing, setSendPacing] = useState({
    enabled: true,
    minGapSeconds: 120,
    maxGapSeconds: 240,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchMailboxes();
    
    // Initialize settings from campaign data
    if (campaign?.options || campaign?.followUpSettings) {
      const selectedMailbox = campaign.options?.selectedMailbox || campaign.mailbox || '';
      
      setSettings({
        selectedMailbox,
        trackOpens: campaign.options?.trackOpens ?? true,
        trackClicks: campaign.options?.trackClicks ?? true,
        unsubscribeLink: campaign.options?.unsubscribeLink ?? true,
        timezone: campaign.scheduling?.timezone || campaign.v2Timezone || 'America/New_York',
        notes: campaign.options?.notes || '',
        followUpEnabled: campaign.followUpSettings?.enabled ?? false,
        stopOnReply: campaign.followUpSettings?.stopOnReply ?? true,
        stopOnOpen: campaign.followUpSettings?.stopOnOpen ?? false
      });

      // Initialize multi-mailbox pool from campaign data
      if (campaign.mailboxes && campaign.mailboxes.length > 0) {
        setSelectedMailboxIds(campaign.mailboxes.map(normalizeMailboxId).filter(Boolean));
      } else if (selectedMailbox) {
        setSelectedMailboxIds([selectedMailbox.toString()]);
      }

      // Initialize send pacing
      if (campaign.v2SendPacing) {
        setSendPacing({
          enabled: campaign.v2SendPacing.enabled ?? true,
          minGapSeconds: campaign.v2SendPacing.minGapSeconds ?? 120,
          maxGapSeconds: campaign.v2SendPacing.maxGapSeconds ?? 240,
        });
      }
    }
  }, [campaign?._id, campaign?.options, campaign?.mailbox, campaign?.scheduling, campaign?.v2Timezone]);

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
          const optionsToSet = {
            ...data.options,
            selectedMailbox: data.options.selectedMailbox || ''
          };
          console.log('Final options to set:', optionsToSet);
          setSettings(optionsToSet);

          // Load multi-mailbox pool
          if (data.mailboxes && data.mailboxes.length > 0) {
            setSelectedMailboxIds(data.mailboxes.map(normalizeMailboxId).filter(Boolean));
          }

          // Load send pacing
          if (data.v2SendPacing) {
            setSendPacing(data.v2SendPacing);
          }
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
        setAvailableMailboxes(data.mailboxes || []);
      }
    } catch (error) {
      console.error('Failed to fetch mailboxes:', error);
    }
  };

  // Toggle a mailbox in the multi-select pool
  const toggleMailbox = (mailboxId) => {
    setSelectedMailboxIds(prev => {
      if (prev.includes(mailboxId)) {
        return prev.filter(id => id !== mailboxId);
      }
      return [...prev, mailboxId];
    });
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      // Validate: at least one mailbox for active campaigns
      if (selectedMailboxIds.length === 0 && campaign.status === 'active') {
        throw new Error('At least one mailbox must be selected for active campaigns');
      }

      // Validate pacing values
      if (sendPacing.enabled && sendPacing.minGapSeconds > sendPacing.maxGapSeconds) {
        throw new Error('Min gap cannot be greater than max gap');
      }
      
      const response = await fetch(`/api/campaigns/${campaign._id}/options`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selectedMailbox: selectedMailboxIds[0] || null,
          mailboxes: selectedMailboxIds,
          trackOpens: settings.trackOpens,
          trackClicks: settings.trackClicks,
          unsubscribeLink: settings.unsubscribeLink,
          timezone: settings.timezone,
          notes: settings.notes || '',
          v2SendPacing: sendPacing,
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
        if (data.options) {
          setSettings({
            selectedMailbox: data.options.selectedMailbox || '',
            trackOpens: data.options.trackOpens ?? true,
            trackClicks: data.options.trackClicks ?? true,
            unsubscribeLink: data.options.unsubscribeLink ?? true,
            dailyLimit: data.options.dailyLimit || 50,
            timezone: data.options.timezone || 'UTC',
            notes: data.options.notes || '',
            followUpEnabled: data.followUpSettings?.enabled ?? false,
            stopOnReply: data.followUpSettings?.stopOnReply ?? true,
            stopOnOpen: data.followUpSettings?.stopOnOpen ?? false
          });
        }
        if (data.mailboxes) {
          setSelectedMailboxIds(data.mailboxes.map(normalizeMailboxId).filter(Boolean));
        }
        if (data.v2SendPacing) {
          setSendPacing(data.v2SendPacing);
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

  const activeMailboxes = availableMailboxes.filter(mb => mb.status === 'active');
  const inactiveMailboxes = availableMailboxes.filter(mb => mb.status !== 'active');

  return (
    <div className="space-y-6">

      {/* Mailbox Pool Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Sending Mailboxes
          </CardTitle>
          <p className="text-sm text-gray-500 mt-1">
            Select multiple mailboxes for round-robin rotation. Each lead will be assigned a mailbox and stick with it for all follow-ups.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {availableMailboxes.length > 0 ? (
            <>
              {/* Active mailboxes */}
              <div className="space-y-2">
                {activeMailboxes.map((mailbox) => {
                  const mailboxId = normalizeMailboxId(mailbox);
                  const isSelected = selectedMailboxIds.includes(mailboxId);
                  return (
                    <label
                      key={mailboxId}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-200'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleMailbox(mailboxId)}
                        className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">{mailbox.fromEmail}</span>
                          <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0"></div>
                        </div>
                        <span className="text-xs text-gray-500">{mailbox.fromName}</span>
                      </div>
                      <div className="text-xs text-gray-400 flex-shrink-0">
                        {mailbox.dailySent || 0}/{mailbox.dailyLimit || 40}/day
                      </div>
                    </label>
                  );
                })}
              </div>

              {/* Inactive mailboxes (dimmed) */}
              {inactiveMailboxes.length > 0 && (
                <div className="space-y-2 pt-2 border-t">
                  <p className="text-xs text-gray-400 font-medium">Inactive</p>
                  {inactiveMailboxes.map((mailbox) => (
                    <div
                      key={mailbox._id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 opacity-50 cursor-not-allowed"
                    >
                      <input type="checkbox" disabled className="h-4 w-4 rounded border-gray-300" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">{mailbox.fromEmail}</span>
                          <div className={`w-2 h-2 rounded-full ${
                            mailbox.status === 'warming' ? 'bg-yellow-500' : 'bg-red-500'
                          } flex-shrink-0`}></div>
                        </div>
                        <span className="text-xs text-gray-500">{mailbox.fromName} — {mailbox.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Pool summary */}
              {selectedMailboxIds.length > 0 && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800 font-medium">
                    {selectedMailboxIds.length} mailbox{selectedMailboxIds.length > 1 ? 'es' : ''} selected
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    {activeMailboxes
                      .filter((mailbox) => selectedMailboxIds.includes(normalizeMailboxId(mailbox)))
                      .map((mailbox) => mailbox.fromEmail)
                      .join(', ')}
                  </p>
                  <p className="text-xs text-blue-600 mt-0.5">
                    Leads will be distributed evenly via round-robin. The <code className="bg-blue-100 px-1 rounded">[Name]</code> placeholder in your email body will be replaced with each mailbox&apos;s sender name.
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-6 text-gray-500">
              <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No mailboxes available</p>
              <p className="text-xs mt-1">Add mailboxes in the Mailbox settings first</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Send Pacing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Send Pacing
          </CardTitle>
          <p className="text-sm text-gray-500 mt-1">
            Control the delay between individual email sends to protect deliverability.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="pacingEnabled">Enable Send Pacing</Label>
              <p className="text-xs text-gray-500">Add random delays between sends to mimic human patterns</p>
            </div>
            <Switch
              id="pacingEnabled"
              checked={sendPacing.enabled}
              onCheckedChange={(checked) => setSendPacing(prev => ({ ...prev, enabled: checked }))}
            />
          </div>

          {sendPacing.enabled && (
            <div className="p-4 bg-gray-50 rounded-lg space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="minGap" className="text-xs">Min Gap (seconds)</Label>
                  <Input
                    id="minGap"
                    type="number"
                    min={30}
                    max={600}
                    value={sendPacing.minGapSeconds}
                    onChange={(e) => setSendPacing(prev => ({ ...prev, minGapSeconds: parseInt(e.target.value) || 120 }))}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="maxGap" className="text-xs">Max Gap (seconds)</Label>
                  <Input
                    id="maxGap"
                    type="number"
                    min={30}
                    max={600}
                    value={sendPacing.maxGapSeconds}
                    onChange={(e) => setSendPacing(prev => ({ ...prev, maxGapSeconds: parseInt(e.target.value) || 240 }))}
                    className="h-9"
                  />
                </div>
              </div>
              <div className="flex items-start gap-2 p-2 bg-amber-50 border border-amber-200 rounded-md">
                <Shield className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-700">
                  Industry standard: 2–4 min gaps between sends. With {selectedMailboxIds.length || 1} mailbox{selectedMailboxIds.length !== 1 ? 'es' : ''}, 
                  each will send ~{Math.round(60 / ((sendPacing.minGapSeconds + sendPacing.maxGapSeconds) / 2 / 60))} emails/hour.
                </p>
              </div>
            </div>
          )}
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
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                <p className="text-sm text-purple-800 font-medium mb-1">v2 Engine controls follow-ups</p>
                <p className="text-xs text-purple-600">
                  Follow-up timing, escalation delays, and max attempts are configured in the <strong>v2 Engine tab</strong>. The engine will automatically send follow-ups based on your angle rotation and delay settings.
                </p>
              </div>
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
