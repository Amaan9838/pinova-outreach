"use client"

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Settings,
  Users,
  Zap,
  RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function ScheduleTab({ campaign, campaignId, onCampaignUpdate }) {
  const [scheduleSettings, setScheduleSettings] = useState({
    startDate: null,
    startTime: '09:00',
    timezone: 'UTC',
    businessHours: {
      enabled: true,
      startTime: '09:00',
      endTime: '17:00',
      daysOfWeek: [1, 2, 3, 4, 5] // Monday to Friday
    },
    dailySendCap: 50,
    staggerSettings: {
      enabled: true,
      baseDelayMinutes: 2,
      randomVariationMinutes: 1
    },
    autoActivateWhenReady: false
  });
  
  const [validationStatus, setValidationStatus] = useState({
    status: 'pending',
    errors: [],
    lastChecked: null
  });
  
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [prospectStats, setProspectStats] = useState({
    total: 0,
    pending: 0,
    active: 0,
    completed: 0,
    failed: 0
  });
  const [loadingProspects, setLoadingProspects] = useState(false);

  // Load existing schedule settings
  useEffect(() => {
    if (campaign?.scheduling) {
      const scheduling = campaign.scheduling;
      setScheduleSettings(prev => ({
        ...prev,
        startDate: scheduling.startDateTime ? new Date(scheduling.startDateTime) : null,
        startTime: scheduling.startDateTime ? 
          format(new Date(scheduling.startDateTime), 'HH:mm') : '09:00',
        timezone: scheduling.timezone || 'UTC',
        businessHours: scheduling.businessHours || prev.businessHours,
        dailySendCap: scheduling.dailySendCap || 50,
        staggerSettings: scheduling.staggerSettings || prev.staggerSettings,
        autoActivateWhenReady: scheduling.autoActivateWhenReady || false
      }));
    }
    
    if (campaign?.validation) {
      setValidationStatus({
        status: campaign.validation.status || 'pending',
        errors: campaign.validation.errors || [],
        lastChecked: campaign.validation.lastChecked
      });
    }
  }, [campaign]);

  // Fetch prospect stats on component mount and when campaign changes
  useEffect(() => {
    fetchProspectStats();
  }, [campaignId, campaign?.status]);

  const timezones = [
    { value: 'UTC', label: 'UTC' },
    { value: 'America/New_York', label: 'Eastern Time (ET)' },
    { value: 'America/Chicago', label: 'Central Time (CT)' },
    { value: 'America/Denver', label: 'Mountain Time (MT)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
    { value: 'Europe/London', label: 'London (GMT)' },
    { value: 'Europe/Paris', label: 'Paris (CET)' },
    { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
    { value: 'Asia/Kolkata', label: 'India (IST)' },
    { value: 'Australia/Sydney', label: 'Sydney (AEST)' }
  ];

  // Fetch prospect statistics
  const fetchProspectStats = async () => {
    if (!campaignId) return;

    setLoadingProspects(true);
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/prospects`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.prospects) {
          const stats = data.prospects.reduce((acc, prospect) => {
            acc.total++;
            acc[prospect.status] = (acc[prospect.status] || 0) + 1;
            return acc;
          }, { total: 0, pending: 0, active: 0, completed: 0, failed: 0, paused: 0 });

          setProspectStats(stats);
        }
      }
    } catch (error) {
      console.error('Failed to fetch prospect stats:', error);
    } finally {
      setLoadingProspects(false);
    }
  };

  // Activate pending prospects
  const activatePendingProspects = async () => {
    if (!campaignId || prospectStats.pending === 0) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/prospects/activate-pending`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          toast.success(`Activated ${data.activated} pending prospects`);
          fetchProspectStats(); // Refresh stats
          if (onCampaignUpdate) onCampaignUpdate();
        } else {
          toast.error(data.error || 'Failed to activate prospects');
        }
      } else {
        toast.error('Failed to activate prospects');
      }
    } catch (error) {
      console.error('Failed to activate prospects:', error);
      toast.error('Error activating prospects');
    } finally {
      setLoading(false);
    }
  };

  const daysOfWeek = [
    { value: 1, label: 'Mon' },
    { value: 2, label: 'Tue' },
    { value: 3, label: 'Wed' },
    { value: 4, label: 'Thu' },
    { value: 5, label: 'Fri' },
    { value: 6, label: 'Sat' },
    { value: 0, label: 'Sun' }
  ];

  const validateCampaign = async () => {
    setValidating(true);
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/validate`, {
        method: 'POST'
      });
      const data = await response.json();
      
      if (data.success) {
        setValidationStatus({
          status: data.validation.valid ? 'valid' : 'invalid',
          errors: data.validation.errors || [],
          lastChecked: new Date()
        });
        
        if (data.validation.valid) {
          toast.success('Campaign validation passed');
        } else {
          toast.error(`Validation failed: ${data.validation.errors.length} issues found`);
        }
      } else {
        toast.error('Failed to validate campaign');
      }
    } catch (error) {
      console.error('Validation error:', error);
      toast.error('Failed to validate campaign');
    } finally {
      setValidating(false);
    }
  };

  const scheduleCampaign = async () => {
    if (!scheduleSettings.startDate) {
      toast.error('Please select a start date');
      return;
    }

    setLoading(true);
    try {
      // Combine date and time
      const [hours, minutes] = scheduleSettings.startTime.split(':');
      const startDateTime = new Date(scheduleSettings.startDate);
      startDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      const response = await fetch(`/api/campaigns/${campaignId}/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDateTime: startDateTime.toISOString(),
          timezone: scheduleSettings.timezone,
          businessHours: scheduleSettings.businessHours,
          staggerSettings: scheduleSettings.staggerSettings,
          autoActivateWhenReady: scheduleSettings.autoActivateWhenReady,
          dailySendCap: scheduleSettings.dailySendCap
        })
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success(data.message);
        if (onCampaignUpdate) {
          onCampaignUpdate(data.campaign);
        }
        
        // Update validation status
        if (data.errors && data.errors.length > 0) {
          setValidationStatus({
            status: 'invalid',
            errors: data.errors,
            lastChecked: new Date()
          });
        } else {
          setValidationStatus({
            status: 'valid',
            errors: [],
            lastChecked: new Date()
          });
        }
      } else {
        toast.error(data.error || 'Failed to schedule campaign');
      }
    } catch (error) {
      console.error('Schedule error:', error);
      toast.error('Failed to schedule campaign');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'valid':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'invalid':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'valid':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'invalid':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Validation Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getStatusIcon(validationStatus.status)}
            Campaign Validation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <Badge className={`${getStatusColor(validationStatus.status)} border`}>
              {validationStatus.status.toUpperCase()}
            </Badge>
            <Button 
              onClick={validateCampaign} 
              disabled={validating}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${validating ? 'animate-spin' : ''}`} />
              Validate Now
            </Button>
          </div>
          
          {validationStatus.errors.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-red-700">Issues to resolve:</h4>
              {validationStatus.errors.map((error, index) => (
                <Alert key={index} className="border-red-200 bg-red-50">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-700">
                    {error.message}
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          )}
          
          {validationStatus.lastChecked && (
            <p className="text-sm text-gray-500 mt-2">
              Last checked: {format(new Date(validationStatus.lastChecked), 'PPp')}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Prospect Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Prospect Status
            {loadingProspects && <RefreshCw className="h-4 w-4 animate-spin" />}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{prospectStats.total}</div>
              <div className="text-sm text-gray-500">Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{prospectStats.pending}</div>
              <div className="text-sm text-gray-500">Pending</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{prospectStats.active}</div>
              <div className="text-sm text-gray-500">Active</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{prospectStats.completed}</div>
              <div className="text-sm text-gray-500">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{prospectStats.failed}</div>
              <div className="text-sm text-gray-500">Failed</div>
            </div>
          </div>

          {/* Action buttons for pending prospects */}
          {prospectStats.pending > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-yellow-800">
                    {prospectStats.pending} prospects are pending
                  </h4>
                  <p className="text-sm text-yellow-700">
                    These prospects need to be activated to start receiving emails.
                  </p>
                </div>
                <Button
                  onClick={activatePendingProspects}
                  disabled={loading}
                  className="bg-yellow-600 hover:bg-yellow-700"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Activating...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      Activate Pending
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {prospectStats.total === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Users className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <p className="text-lg font-medium">No prospects added</p>
              <p className="text-sm">Add prospects to your campaign to start scheduling.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Schedule Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Schedule Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Date and Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {scheduleSettings.startDate ? 
                      format(scheduleSettings.startDate, 'PPP') : 
                      'Select date'
                    }
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={scheduleSettings.startDate}
                    onSelect={(date) => setScheduleSettings(prev => ({ ...prev, startDate: date }))}
                    disabled={(date) => {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      return date < today;
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="space-y-2">
              <Label>Start Time</Label>
              <Input
                type="time"
                value={scheduleSettings.startTime}
                onChange={(e) => setScheduleSettings(prev => ({ ...prev, startTime: e.target.value }))}
              />
            </div>
          </div>

          {/* Timezone */}
          <div className="space-y-2">
            <Label>Timezone</Label>
            <Select 
              value={scheduleSettings.timezone} 
              onValueChange={(value) => setScheduleSettings(prev => ({ ...prev, timezone: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {timezones.map(tz => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Auto-activate toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto-activate when ready</Label>
              <p className="text-sm text-gray-500">
                Automatically start campaign when validation passes
              </p>
            </div>
            <Switch
              checked={scheduleSettings.autoActivateWhenReady}
              onCheckedChange={(checked) =>
                setScheduleSettings(prev => ({ ...prev, autoActivateWhenReady: checked }))
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Business Hours */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Business Hours
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable business hours</Label>
              <p className="text-sm text-gray-500">
                Only send emails during specified hours
              </p>
            </div>
            <Switch
              checked={scheduleSettings.businessHours.enabled}
              onCheckedChange={(checked) =>
                setScheduleSettings(prev => ({
                  ...prev,
                  businessHours: { ...prev.businessHours, enabled: checked }
                }))
              }
            />
          </div>

          {scheduleSettings.businessHours.enabled && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Time</Label>
                  <Input
                    type="time"
                    value={scheduleSettings.businessHours.startTime}
                    onChange={(e) => setScheduleSettings(prev => ({
                      ...prev,
                      businessHours: { ...prev.businessHours, startTime: e.target.value }
                    }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Time</Label>
                  <Input
                    type="time"
                    value={scheduleSettings.businessHours.endTime}
                    onChange={(e) => setScheduleSettings(prev => ({
                      ...prev,
                      businessHours: { ...prev.businessHours, endTime: e.target.value }
                    }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Days of Week</Label>
                <div className="flex gap-2">
                  {daysOfWeek.map(day => (
                    <Button
                      key={day.value}
                      variant={scheduleSettings.businessHours.daysOfWeek.includes(day.value) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        const days = scheduleSettings.businessHours.daysOfWeek;
                        const newDays = days.includes(day.value)
                          ? days.filter(d => d !== day.value)
                          : [...days, day.value];
                        setScheduleSettings(prev => ({
                          ...prev,
                          businessHours: { ...prev.businessHours, daysOfWeek: newDays }
                        }));
                      }}
                    >
                      {day.label}
                    </Button>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Advanced Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Advanced Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Daily Send Cap */}
          <div className="space-y-2">
            <Label>Campaign Daily Send Limit (Optional)</Label>
            <Input
              type="number"
              min="1"
              max="1000"
              value={scheduleSettings.dailySendCap}
              onChange={(e) => setScheduleSettings(prev => ({
                ...prev,
                dailySendCap: parseInt(e.target.value) || 50
              }))}
            />
            <p className="text-sm text-gray-500">
              Maximum emails to send per day for this campaign. Note: Individual mailbox limits (set in Mailboxes page) take priority.
            </p>
          </div>

          {/* Stagger Settings */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable email staggering</Label>
                <p className="text-sm text-gray-500">
                  Spread emails over time to appear more natural
                </p>
              </div>
              <Switch
                checked={scheduleSettings.staggerSettings.enabled}
                onCheckedChange={(checked) =>
                  setScheduleSettings(prev => ({
                    ...prev,
                    staggerSettings: { ...prev.staggerSettings, enabled: checked }
                  }))
                }
              />
            </div>

            {scheduleSettings.staggerSettings.enabled && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Base Delay (minutes)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="60"
                    value={scheduleSettings.staggerSettings.baseDelayMinutes}
                    onChange={(e) => setScheduleSettings(prev => ({
                      ...prev,
                      staggerSettings: {
                        ...prev.staggerSettings,
                        baseDelayMinutes: parseInt(e.target.value) || 2
                      }
                    }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Random Variation (±minutes)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="30"
                    value={scheduleSettings.staggerSettings.randomVariationMinutes}
                    onChange={(e) => setScheduleSettings(prev => ({
                      ...prev,
                      staggerSettings: {
                        ...prev.staggerSettings,
                        randomVariationMinutes: parseInt(e.target.value) || 1
                      }
                    }))}
                  />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Schedule Button */}
      <div className="flex justify-end">
        <Button 
          onClick={scheduleCampaign} 
          disabled={loading || !scheduleSettings.startDate}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Clock className="h-4 w-4 mr-2" />
          {loading ? 'Scheduling...' : 'Schedule Campaign'}
        </Button>
      </div>
    </div>
  );
}
