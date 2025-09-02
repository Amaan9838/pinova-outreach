'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar, Plus } from 'lucide-react';
import { toast } from 'sonner';

export default function ScheduleTab({
  campaign,
  scheduleSettings,
  setScheduleSettings,
  scheduleSaving,
  saveScheduleSettings,
}) {
  const [saving, setSaving] = useState(false);

  // Load schedule settings on component mount
  useEffect(() => {
    const loadScheduleSettings = async () => {
      try {
        console.log('Loading schedule settings for campaign:', campaign._id);
        const response = await fetch(`/api/campaigns/${campaign._id}/schedule`);
        console.log('Schedule API response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('Schedule API response data:', data);
          
          if (data.success && data.schedule) {
            console.log('Setting schedule settings:', data.schedule);
            setScheduleSettings(data.schedule);
          } else {
            console.log('No schedule settings found, using defaults');
          }
        } else {
          console.error('Schedule API response not ok:', response.statusText);
        }
      } catch (error) {
        console.error('Failed to load schedule settings:', error);
      }
    };

    if (campaign?._id) {
      loadScheduleSettings();
    }
  }, [campaign?._id, setScheduleSettings]);

  const handleSaveSchedule = async () => {
    setSaving(true);
    try {
      console.log('Saving schedule settings:', scheduleSettings);
      
      const response = await fetch(`/api/campaigns/${campaign._id}/schedule`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scheduleSettings)
      });
      
      console.log('Schedule save response status:', response.status);
      const data = await response.json();
      console.log('Schedule save response data:', data);
      
      if (data.success) {
        console.log('Schedule settings saved successfully');
        // Update local state with server response
        if (data.schedule) {
          setScheduleSettings(data.schedule);
        }
        toast.success('Schedule settings saved successfully!');
      } else {
        toast.error('Failed to save schedule settings: ' + data.error);
      }
    } catch (error) {
      console.error('Error saving schedule settings:', error);
      toast.error('Error saving schedule settings: ' + error.message);
    } finally {
      setSaving(false);
    }
  };
  const [schedules] = useState([
    { id: 1, name: 'New schedule', active: true }
  ]);

  // Time options for dropdowns
  const timeOptions = [
    '12:00 AM', '1:00 AM', '2:00 AM', '3:00 AM', '4:00 AM', '5:00 AM',
    '6:00 AM', '7:00 AM', '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM',
    '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM',
    '6:00 PM', '7:00 PM', '8:00 PM', '9:00 PM', '10:00 PM', '11:00 PM'
  ];

  const timezones = [
    'India Standard Time (UTC+05:30)',
    'Eastern Time (US & Canada) (UTC-04:00)',
    'Central Time (US & Canada) (UTC-05:00)',
    'Mountain Time (US & Canada) (UTC-06:00)',
    'Pacific Time (US & Canada) (UTC-07:00)',
    'UTC (UTC+00:00)',
    'London Time (UTC+00:00)',
    'Tokyo Time (UTC+09:00)',
    'Sydney Time (UTC+10:00)'
  ];

  return (
    <div className="flex gap-6">
      {/* Left Sidebar - Schedule List */}
      <div className="w-80 space-y-4">
        {/* Start/End Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <Calendar className="h-5 w-5 text-gray-600" />
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-900">Start</div>
              <div className="text-sm text-blue-600 font-medium">Now</div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <Calendar className="h-5 w-5 text-gray-600" />
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-900">End</div>
              <div className="text-sm text-blue-600 font-medium">No end date</div>
            </div>
          </div>
        </div>

        {/* Schedule List */}
        <div className="space-y-2">
          {schedules.map((schedule) => (
            <div
              key={schedule.id}
              className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                schedule.active
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Calendar className="h-5 w-5 text-gray-600" />
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900">{schedule.name}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Add Schedule Button */}
        <button className="w-full text-blue-600 font-medium text-sm hover:text-blue-700 transition-colors flex items-center justify-center gap-2 py-2">
          <Plus className="h-4 w-4" />
          Add schedule
        </button>
      </div>

      {/* Right Panel - Schedule Editor */}
      <div className="flex-1 space-y-6">
        {/* Schedule Name */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-900">Schedule Name</label>
          <Input
            value={scheduleSettings.name}
            onChange={(e) => setScheduleSettings(prev => ({ ...prev, name: e.target.value }))}
            className="max-w-md"
            placeholder="Enter schedule name"
          />
        </div>

        {/* Timing Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Timing</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* From Time */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-600">From</label>
              <Select 
                value={scheduleSettings.timing.from} 
                onValueChange={(value) => 
                  setScheduleSettings(prev => ({
                    ...prev,
                    timing: { ...prev.timing, from: value }
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timeOptions.map((time) => (
                    <SelectItem key={time} value={time}>{time}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* To Time */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-600">To</label>
              <Select 
                value={scheduleSettings.timing.to}
                onValueChange={(value) => 
                  setScheduleSettings(prev => ({
                    ...prev,
                    timing: { ...prev.timing, to: value }
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timeOptions.map((time) => (
                    <SelectItem key={time} value={time}>{time}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Timezone */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-600">Timezone</label>
              <Select 
                value={scheduleSettings.timing.timezone}
                onValueChange={(value) => 
                  setScheduleSettings(prev => ({
                    ...prev,
                    timing: { ...prev.timing, timezone: value }
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timezones.map((tz) => (
                    <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Days Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Days</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {Object.entries({
              monday: 'Monday',
              tuesday: 'Tuesday', 
              wednesday: 'Wednesday',
              thursday: 'Thursday',
              friday: 'Friday',
              saturday: 'Saturday',
              sunday: 'Sunday'
            }).map(([key, label]) => (
              <div key={key} className="flex items-center space-x-2">
                <Checkbox
                  id={key}
                  checked={scheduleSettings.days[key]}
                  onCheckedChange={(checked) => 
                    setScheduleSettings(prev => ({
                      ...prev,
                      days: { ...prev.days, [key]: checked }
                    }))
                  }
                />
                <label 
                  htmlFor={key}
                  className="text-sm font-medium text-gray-900 cursor-pointer"
                >
                  {label}
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Additional Settings */}
        <div className="space-y-4 pt-6 border-t">
          <h3 className="text-lg font-medium text-gray-900">Additional Settings</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-600">Daily Email Limit</label>
              <Input
                type="number"
                min="1"
                max="1000"
                value={campaign?.settings?.dailyLimit || 50}
                className="max-w-32"
                placeholder="50"
              />
              <p className="text-xs text-gray-500">Maximum emails to send per day</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-600">Delay Between Emails</label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="1"
                  max="60"
                  defaultValue={5}
                  className="max-w-20"
                />
                <span className="text-sm text-gray-500">minutes</span>
              </div>
              <p className="text-xs text-gray-500">Time to wait between each email</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox id="respect-holidays" defaultChecked />
              <label htmlFor="respect-holidays" className="text-sm font-medium text-gray-900">
                Respect holidays and weekends
              </label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox id="auto-pause" defaultChecked />
              <label htmlFor="auto-pause" className="text-sm font-medium text-gray-900">
                Auto-pause on replies
              </label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox id="track-opens" defaultChecked />
              <label htmlFor="track-opens" className="text-sm font-medium text-gray-900">
                Track email opens
              </label>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-6">
          <Button 
            className="bg-blue-600 hover:bg-blue-700 px-8"
            disabled={saving || scheduleSaving}
            onClick={handleSaveSchedule}
          >
            {(saving || scheduleSaving) ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  );
}
