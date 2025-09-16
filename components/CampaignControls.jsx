"use client"

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, Square, Clock, Users } from 'lucide-react';
import { toast } from 'sonner';

export function CampaignControls({ campaign, onCampaignUpdate }) {
  const [loading, setLoading] = useState(false);
  
  const handleStart = async () => {
    if (!campaign?.options?.selectedMailbox) {
      toast.error('Please configure a mailbox in the Options tab first');
      return;
    }
    
    if (!campaign?.prospects?.length) {
      toast.error('Please add prospects to the campaign first');
      return;
    }
    
    if (!campaign?.sequence?.length) {
      toast.error('Please configure email sequence first');
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch(`/api/campaigns/${campaign._id}/start`, {
        method: 'POST'
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('Campaign started successfully!');
        onCampaignUpdate?.();
      } else {
        toast.error(data.error || 'Failed to start campaign');
      }
    } catch (error) {
      console.error('Start campaign error:', error);
      toast.error('Failed to start campaign');
    } finally {
      setLoading(false);
    }
  };
  
  const handlePause = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/campaigns/${campaign._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'paused' })
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('Campaign paused');
        onCampaignUpdate?.();
      } else {
        toast.error(data.error || 'Failed to pause campaign');
      }
    } catch (error) {
      console.error('Pause campaign error:', error);
      toast.error('Failed to pause campaign');
    } finally {
      setLoading(false);
    }
  };
  
  const handleResume = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/campaigns/${campaign._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' })
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('Campaign resumed');
        onCampaignUpdate?.();
      } else {
        toast.error(data.error || 'Failed to resume campaign');
      }
    } catch (error) {
      console.error('Resume campaign error:', error);
      toast.error('Failed to resume campaign');
    } finally {
      setLoading(false);
    }
  };
  
  const handleStop = async () => {
    if (!confirm('Are you sure you want to stop this campaign? This will mark it as completed and stop all future emails.')) {
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch(`/api/campaigns/${campaign._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' })
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('Campaign stopped');
        onCampaignUpdate?.();
      } else {
        toast.error(data.error || 'Failed to stop campaign');
      }
    } catch (error) {
      console.error('Stop campaign error:', error);
      toast.error('Failed to stop campaign');
    } finally {
      setLoading(false);
    }
  };
  
  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-50 border-green-200';
      case 'scheduled': return 'text-blue-600 bg-blue-50 border-blue-200'; 
      case 'paused': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'completed': return 'text-gray-600 bg-gray-50 border-gray-200';
      case 'draft': return 'text-gray-600 bg-gray-50 border-gray-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };
  
  if (!campaign) return null;
  
  const status = campaign.status;
  const activeProspects = campaign.prospects?.filter(p => p.status === 'active').length || 0;
  const readyProspects = campaign.prospects?.filter(p => 
    p.status === 'active' && p.nextSendAt && new Date(p.nextSendAt) <= new Date()
  ).length || 0;
  
  return (
    <div className="bg-white border rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`px-3 py-1 rounded-full border text-sm font-medium ${getStatusColor(status)}`}>
            {status?.toUpperCase() || 'DRAFT'}
          </div>
          <div className="text-sm text-gray-600">
            {campaign.name}
          </div>
        </div>
        
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>{activeProspects} active</span>
          </div>
          {readyProspects > 0 && (
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4 text-green-600" />
              <span className="text-green-600">{readyProspects} ready</span>
            </div>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        {status === 'draft' && (
          <Button 
            onClick={handleStart} 
            disabled={loading}
            className="bg-green-600 hover:bg-green-700"
            size="sm"
          >
            <Play className="h-4 w-4 mr-2" />
            Start Campaign
          </Button>
        )}
        
        {status === 'scheduled' && (
          <Button 
            onClick={handleStart} 
            disabled={loading}
            className="bg-green-600 hover:bg-green-700"
            size="sm"
          >
            <Play className="h-4 w-4 mr-2" />
            Start Now
          </Button>
        )}
        
        {status === 'active' && (
          <>
            <Button 
              onClick={handlePause} 
              disabled={loading}
              variant="outline"
              size="sm"
            >
              <Pause className="h-4 w-4 mr-2" />
              Pause
            </Button>
            <Button 
              onClick={handleStop} 
              disabled={loading}
              variant="outline"
              size="sm"
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              <Square className="h-4 w-4 mr-2" />
              Stop
            </Button>
          </>
        )}
        
        {status === 'paused' && (
          <>
            <Button 
              onClick={handleResume} 
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700"
              size="sm"
            >
              <Play className="h-4 w-4 mr-2" />
              Resume
            </Button>
            <Button 
              onClick={handleStop} 
              disabled={loading}
              variant="outline"
              size="sm"
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              <Square className="h-4 w-4 mr-2" />
              Stop
            </Button>
          </>
        )}
        
        {loading && (
          <div className="text-sm text-gray-500">Processing...</div>
        )}
      </div>
      

    </div>
  );
}

// Default export for compatibility
export default CampaignControls;
