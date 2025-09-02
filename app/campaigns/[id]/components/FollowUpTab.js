'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, Clock, Mail } from 'lucide-react';
import { toast } from 'sonner';
import SmartTextarea from './SmartTextarea';

export default function FollowUpTab({ campaign, campaignId }) {
  const [followUpSettings, setFollowUpSettings] = useState({
    enabled: false,
    maxFollowUps: 3,
    followUpDelay: 3, // days
    followUpTemplates: [],
    conditions: {
      noReply: true,
      noOpen: false,
      bounced: false
    },
    stopOnReply: true,
    stopOnOpen: false
  });
  
  const [saving, setSaving] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    subject: '',
    content: '',
    delay: 3
  });
  const [showAddTemplate, setShowAddTemplate] = useState(false);

  useEffect(() => {
    const loadFollowUpSettings = async () => {
      try {
        console.log('Loading follow-up settings for campaign:', campaignId);
        const response = await fetch(`/api/campaigns/${campaignId}/followup`);
        console.log('Follow-up API response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('Follow-up API response data:', data);
          
          if (data.success && data.followUpSettings) {
            console.log('Setting follow-up settings:', data.followUpSettings);
            setFollowUpSettings(data.followUpSettings);
          } else {
            console.log('No follow-up settings found, using defaults');
          }
        } else {
          console.error('Follow-up API response not ok:', response.statusText);
        }
      } catch (error) {
        console.error('Failed to load follow-up settings:', error);
      }
    };

    if (campaignId) {
      loadFollowUpSettings();
    }
  }, [campaignId]);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      console.log('Saving follow-up settings:', followUpSettings);
      
      // Validate settings before saving
      if (followUpSettings.followUpTemplates.length === 0 && followUpSettings.enabled) {
        throw new Error('At least one follow-up template is required when enabled');
      }

      const res = await fetch(`/api/campaigns/${campaignId}/followup`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(followUpSettings)
      });
      
      console.log('Save response status:', res.status);
      const data = await res.json();
      console.log('Save response data:', data);
      
      if (!res.ok) throw new Error(data.error || 'Failed to save settings');
      if (!data.success) throw new Error(data.error || 'Failed to save settings');
      
      // Update local state with server response
      setFollowUpSettings(data.followUpSettings);
      console.log('Settings saved successfully, updated state:', data.followUpSettings);
      
      toast.success('Follow-up settings saved successfully!', {
        duration: 3000,
        position: 'top-center',
      });
    } catch (error) {
      console.error('Save settings error:', error);
      toast.error('Failed to save follow-up settings: ' + error.message, {
        duration: 5000,
        position: 'top-center',
      });
    } finally {
      setSaving(false);
    }
  };

  const addFollowUpTemplate = () => {
    if (!newTemplate.subject.trim() || !newTemplate.content.trim()) {
      toast.error('Please fill in both subject and content');
      return;
    }

    const template = {
      id: Date.now(),
      subject: newTemplate.subject,
      content: newTemplate.content,
      delay: newTemplate.delay
    };

    setFollowUpSettings(prev => ({
      ...prev,
      followUpTemplates: [...prev.followUpTemplates, template]
    }));

    setNewTemplate({ subject: '', content: '', delay: 3 });
    setShowAddTemplate(false);
  };

  const removeTemplate = (templateId) => {
    setFollowUpSettings(prev => ({
      ...prev,
      followUpTemplates: prev.followUpTemplates.filter(t => t.id !== templateId)
    }));
  };

  const updateTemplate = (templateId, field, value) => {
    // Update local state only - save will be triggered by save button
    setFollowUpSettings(prev => ({
      ...prev,
      followUpTemplates: prev.followUpTemplates.map(t => 
        t.id === templateId ? { ...t, [field]: value } : t
      )
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Follow-up Settings</h2>
          <p className="text-sm text-gray-600">
            Automatically send follow-up emails based on prospect engagement
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-700">Enable Follow-ups</span>
          <Switch
            checked={followUpSettings.enabled}
            onCheckedChange={(checked) => 
              setFollowUpSettings(prev => ({ ...prev, enabled: checked }))
            }
          />
        </div>
      </div>

      {followUpSettings.enabled && (
        <>
          {/* General Settings */}
          <div className="card p-6 space-y-4">
            <h3 className="text-md font-medium text-gray-900">General Settings</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Max Follow-ups</label>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={followUpSettings.maxFollowUps}
                  onChange={(e) => 
                    setFollowUpSettings(prev => ({ 
                      ...prev, 
                      maxFollowUps: parseInt(e.target.value) || 1 
                    }))
                  }
                  className="max-w-24"
                />
                <p className="text-xs text-gray-500">Maximum number of follow-up emails</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Default Delay</label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="1"
                    max="30"
                    value={followUpSettings.followUpDelay}
                    onChange={(e) => 
                      setFollowUpSettings(prev => ({ 
                        ...prev, 
                        followUpDelay: parseInt(e.target.value) || 1 
                      }))
                    }
                    className="max-w-20"
                  />
                  <span className="text-sm text-gray-500">days</span>
                </div>
                <p className="text-xs text-gray-500">Days to wait before follow-up</p>
              </div>
            </div>

            {/* Trigger Conditions */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-900">Send Follow-up When:</h4>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="no-reply"
                    checked={followUpSettings.conditions.noReply}
                    onCheckedChange={(checked) => 
                      setFollowUpSettings(prev => ({
                        ...prev,
                        conditions: { ...prev.conditions, noReply: checked }
                      }))
                    }
                  />
                  <label htmlFor="no-reply" className="text-sm text-gray-700">
                    No reply received
                  </label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="no-open"
                    checked={followUpSettings.conditions.noOpen}
                    onCheckedChange={(checked) => 
                      setFollowUpSettings(prev => ({
                        ...prev,
                        conditions: { ...prev.conditions, noOpen: checked }
                      }))
                    }
                  />
                  <label htmlFor="no-open" className="text-sm text-gray-700">
                    Email not opened
                  </label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="bounced"
                    checked={followUpSettings.conditions.bounced}
                    onCheckedChange={(checked) => 
                      setFollowUpSettings(prev => ({
                        ...prev,
                        conditions: { ...prev.conditions, bounced: checked }
                      }))
                    }
                  />
                  <label htmlFor="bounced" className="text-sm text-gray-700">
                    Email bounced (retry)
                  </label>
                </div>
              </div>
            </div>

            {/* Stop Conditions */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-900">Stop Follow-ups When:</h4>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="stop-reply"
                    checked={followUpSettings.stopOnReply}
                    onCheckedChange={(checked) => 
                      setFollowUpSettings(prev => ({ ...prev, stopOnReply: checked }))
                    }
                  />
                  <label htmlFor="stop-reply" className="text-sm text-gray-700">
                    Prospect replies
                  </label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="stop-open"
                    checked={followUpSettings.stopOnOpen}
                    onCheckedChange={(checked) => 
                      setFollowUpSettings(prev => ({ ...prev, stopOnOpen: checked }))
                    }
                  />
                  <label htmlFor="stop-open" className="text-sm text-gray-700">
                    Prospect opens email
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Follow-up Templates */}
          <div className="card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-md font-medium text-gray-900">Follow-up Templates</h3>
              <Button
                onClick={() => setShowAddTemplate(true)}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Template
              </Button>
            </div>

            {followUpSettings.followUpTemplates.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Mail className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No follow-up templates yet</p>
                <p className="text-sm">Add templates to customize your follow-up sequence</p>
              </div>
            ) : (
              <div className="space-y-4">
                {followUpSettings.followUpTemplates.map((template, index) => (
                  <div key={template.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-700">
                          Follow-up #{index + 1}
                        </span>
                        <span className="text-xs text-gray-500">
                          (after {template.delay} days)
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeTemplate(template.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div className="md:col-span-3">
                        <label className="text-xs font-medium text-gray-600">Subject</label>
                        <Input
                          value={template.subject}
                          onChange={(e) => updateTemplate(template.id, 'subject', e.target.value)}
                          placeholder="Follow-up subject..."
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600">Delay (days)</label>
                        <Input
                          type="number"
                          min="1"
                          max="30"
                          value={template.delay}
                          onChange={(e) => updateTemplate(template.id, 'delay', parseInt(e.target.value) || 1)}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-gray-600">Content</label>
                      <SmartTextarea
                        value={template.content}
                        onChange={(e) => updateTemplate(template.id, 'content', e.target.value)}
                        placeholder="Follow-up email content... Type { to see variable suggestions"
                        rows={4}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add Template Form */}
            {showAddTemplate && (
              <div className="border rounded-lg p-4 space-y-3 bg-gray-50">
                <h4 className="text-sm font-medium text-gray-900">Add New Follow-up Template</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="md:col-span-3">
                    <label className="text-xs font-medium text-gray-600">Subject</label>
                    <Input
                      value={newTemplate.subject}
                      onChange={(e) => setNewTemplate(prev => ({ ...prev, subject: e.target.value }))}
                      placeholder="Follow-up subject..."
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600">Delay (days)</label>
                    <Input
                      type="number"
                      min="1"
                      max="30"
                      value={newTemplate.delay}
                      onChange={(e) => setNewTemplate(prev => ({ ...prev, delay: parseInt(e.target.value) || 1 }))}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600">Content</label>
                  <SmartTextarea
                    value={newTemplate.content}
                    onChange={(e) => setNewTemplate(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="Follow-up email content... Type { to see variable suggestions"
                    rows={4}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setShowAddTemplate(false);
                      setNewTemplate({ subject: '', content: '', delay: 3 });
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={addFollowUpTemplate}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Add Template
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Cron Information */}
          <div className="card p-6 bg-blue-50 border-blue-200">
            <h3 className="text-md font-medium text-gray-900 mb-2">Automation Setup</h3>
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

          {/* Save Button */}
          <div className="flex justify-end">
            <Button
              onClick={handleSaveSettings}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 px-8"
            >
              {saving ? 'Saving...' : 'Save Follow-up Settings'}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
