'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import Header from './components/Header';
import AnalyticsTab from './components/AnalyticsTab';
import EnhancedLeadsTab from './components/EnhancedLeadsTab';
import SequencesTab from './components/SequencesTab';
import ScheduleTab from './components/ScheduleTab';
import OptionsTab from './components/OptionsTab';
import TemplateModal from './components/TemplateModal';
import { Skeleton } from '@/components/ui/skeleton';
// Import utilities
import { getStatusColor, getMessageStatusColor, computeDailySeries, computeMessageStats } from './utils/campaignUtils';

export default function CampaignDetailsPage({ params }) {
  const router = useRouter();
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [editedCampaign, setEditedCampaign] = useState({});
  const [deleteCampaignDialog, setDeleteCampaignDialog] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [sequenceSaving, setSequenceSaving] = useState(false);
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [templatesModalOpen, setTemplatesModalOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [steps, setSteps] = useState([]);
  const [sentCount, setSentCount] = useState(0);
  const [openedCount, setOpenedCount] = useState(0);
  const [deliveredCount, setDeliveredCount] = useState(0);
  const [repliedCount, setRepliedCount] = useState(0);
  const [scheduleSettings, setScheduleSettings] = useState({
    name: 'New schedule',
    startDate: 'now',
    endDate: 'no-end',
    timing: {
      from: '9:00 AM',
      to: '6:00 PM',
      timezone: 'Eastern Time (US & Canada) (UTC-04:00)'
    },
    days: {
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: false,
      sunday: false
    }
  });

  useEffect(() => {
    fetchCampaignDetails();
    fetchMessages();
  }, [params.id]);

  const fetchCampaignDetails = async () => {
    try {
      const response = await fetch(`/api/campaigns/${params.id}`);
      const data = await response.json();
      if (data.success) {
        setCampaign(data.campaign);
        setSteps(data.campaign.sequence || []);
      }
    } catch (error) {
      console.error('Failed to fetch campaign:', error);
    }
  };

  const fetchMessages = async () => {
    try {
      const response = await fetch(`/api/campaigns/${params.id}/messages`);
      const data = await response.json();
      if (data.success) {
        setMessages(data.messages);
        
        // Calculate message counts
        const sent = data.messages.filter(m => m.status === 'sent' || m.status === 'delivered' || m.status === 'opened' || m.status === 'replied').length;
        const delivered = data.messages.filter(m => m.status === 'delivered' || m.status === 'opened' || m.status === 'replied').length;
        const opened = data.messages.filter(m => m.status === 'opened' || m.status === 'replied').length;
        const replied = data.messages.filter(m => m.status === 'replied').length;
        
        setSentCount(sent);
        setDeliveredCount(delivered);
        setOpenedCount(opened);
        setRepliedCount(replied);
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const processSequencesManually = async () => {
    try {
      const response = await fetch('/api/cron/process-sequences');
      const data = await response.json();
      if (data.success) {
        alert('Sequences processed! Refresh to see updates.');
        fetchCampaignDetails();
        fetchMessages();
      } else {
        alert('Error processing sequences: ' + data.error);
      }
    } catch (error) {
      console.error('Failed to process sequences:', error);
      alert('Failed to process sequences');
    }
  };

  const sendTestEmail = async () => {
    const testEmail = prompt('Enter test email address:', 'test@example.com');
    if (!testEmail) return;

    try {
      const response = await fetch(`/api/campaigns/${params.id}/test-send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testEmail, stepNumber: 1 })
      });
      
      const result = await response.json();
      
      if (result.success) {
        alert('✅ Test email sent successfully! Check your inbox.');
      } else {
        alert('❌ Test failed: ' + result.error);
      }
    } catch (error) {
      alert('❌ Error: ' + error.message);
    }
  };

  const deleteCampaign = async () => {
    try {
      const response = await fetch(`/api/campaigns/${params.id}/delete`, {
        method: 'DELETE'
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast.success("Campaign deleted successfully");
        router.push('/campaigns');
      } else {
        toast.error(result.error || "Failed to delete campaign");
      }
    } catch (error) {
      console.error('Error deleting campaign:', error);
      toast.error("Failed to delete campaign");
    }
  };

  const pauseCampaign = async () => {
    try {
      const response = await fetch(`/api/campaigns/${params.id}/pause`, {
        method: 'POST'
      });
      const data = await response.json();
      if (data.success) {
        fetchCampaignDetails();
      } else {
        alert(data.error || 'Failed to pause campaign');
      }
    } catch (error) {
      console.error('Failed to pause campaign:', error);
      alert('Failed to pause campaign');
    }
  };

  const resumeCampaign = async () => {
    try {
      const response = await fetch(`/api/campaigns/${params.id}/resume`, {
        method: 'POST'
      });
      const data = await response.json();
      if (data.success) {
        alert('✅ Campaign resumed successfully!');
        fetchCampaignDetails();
      } else {
        alert('❌ Failed to resume campaign: ' + data.error);
      }
    } catch (error) {
      console.error('Failed to resume campaign:', error);
      alert('❌ Failed to resume campaign');
    }
  };

  const startCampaign = async () => {
    try {
      const response = await fetch(`/api/campaigns/${params.id}/start`, {
        method: 'POST'
      });
      const data = await response.json();
      if (data.success) {
        alert('✅ Campaign started successfully!');
        fetchCampaignDetails();
      } else {
        alert('❌ Failed to start campaign: ' + data.error);
      }
    } catch (error) {
      console.error('Failed to start campaign:', error);
      alert('❌ Failed to start campaign');
    }
  };

  const rescheduleNow = async () => {
    try {
      const response = await fetch(`/api/campaigns/${params.id}/reschedule`, {
        method: 'POST'
      });
      const data = await response.json();
      if (data.success) {
        alert(`✅ Rescheduled ${data.rescheduledCount} prospects for immediate sending!`);
        fetchCampaignDetails();
      } else {
        alert('❌ Failed to reschedule: ' + data.error);
      }
    } catch (error) {
      console.error('Failed to reschedule:', error);
      alert('❌ Failed to reschedule');
    }
  };

  const saveSequence = async (updatedSteps) => {
    setSequenceSaving(true);
    try {
      const res = await fetch(`/api/campaigns/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sequence: updatedSteps })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setCampaign(data.campaign);
      setSteps(data.campaign.sequence || []);
      setEditingIndex(null);
    } catch (err) {
      alert(err.message || 'Failed to save sequence');
    } finally {
      setSequenceSaving(false);
    }
  };

  const saveScheduleSettings = async () => {
    setScheduleSaving(true);
    try {
      const res = await fetch(`/api/campaigns/${params.id}/schedule`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scheduleSettings)
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      toast.success('Schedule settings saved successfully!');
    } catch (err) {
      toast.error(err.message || 'Failed to save schedule settings');
    } finally {
      setScheduleSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="px-4 space-y-4">
        <div className="flex gap-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="px-4">
        <div className="text-center py-12">
          <p className="text-gray-500">Campaign not found</p>
          <button onClick={() => router.push('/campaigns')} className="btn-primary mt-4">
            Back to Campaigns
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4">
      {/* Header Component */}
      <Header
        campaign={campaign}
        getStatusColor={getStatusColor}
        sendTestEmail={sendTestEmail}
        rescheduleNow={rescheduleNow}
        processSequencesManually={processSequencesManually}
        pauseCampaign={pauseCampaign}
        resumeCampaign={resumeCampaign}
        startCampaign={startCampaign}
        deleteCampaign={() => setDeleteCampaignDialog(true)}
      />

      {/* Delete Campaign Confirmation Dialog */}
      <Dialog open={deleteCampaignDialog} onOpenChange={setDeleteCampaignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Campaign</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the campaign "{campaign?.name}"? This will also delete all associated messages and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteCampaignDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => {
                deleteCampaign();
                setDeleteCampaignDialog(false);
              }}
            >
              Delete Campaign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tabs */}
      <Tabs defaultValue="analytics" className="w-full">
        <TabsList className="mb-4 grid w-full grid-cols-5">
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="leads">Leads</TabsTrigger>
          <TabsTrigger value="sequences">Sequences</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="options">Options</TabsTrigger>
        </TabsList>

        <TabsContent value="analytics">
          <AnalyticsTab
            campaign={campaign}
            messages={messages}
            sentCount={sentCount}
            openedCount={openedCount}
            deliveredCount={deliveredCount}
            repliedCount={repliedCount}
            computeDailySeries={computeDailySeries}
            getMessageStatusColor={getMessageStatusColor}
          />
        </TabsContent>

        <TabsContent value="leads">
          <EnhancedLeadsTab 
            campaign={campaign}
            getStatusColor={getStatusColor}
            campaignId={params.id}
          />
        </TabsContent>

        <TabsContent value="sequences">
          <SequencesTab
            steps={steps}
            editingIndex={editingIndex}
            setEditingIndex={setEditingIndex}
            saveSequence={saveSequence}
            sequenceSaving={sequenceSaving}
            setSteps={setSteps}
            setTemplatesModalOpen={setTemplatesModalOpen}
            campaign={campaign}
            campaignId={params.id}
          />
        </TabsContent>

        <TabsContent value="schedule">
          <ScheduleTab
            campaign={campaign}
            scheduleSettings={scheduleSettings}
            setScheduleSettings={setScheduleSettings}
            scheduleSaving={scheduleSaving}
            saveScheduleSettings={saveScheduleSettings}
          />
        </TabsContent>

        <TabsContent value="options">
          <OptionsTab
            campaign={campaign}
            sendTestEmail={sendTestEmail}
            rescheduleNow={rescheduleNow}
            processSequencesManually={processSequencesManually}
            pauseCampaign={pauseCampaign}
            resumeCampaign={resumeCampaign}
            startCampaign={startCampaign}
            deleteCampaign={() => setDeleteCampaignDialog(true)}
          />
        </TabsContent>
      </Tabs>
      
      {/* Template Modal Component */}
      <TemplateModal
        templatesModalOpen={templatesModalOpen}
        setTemplatesModalOpen={setTemplatesModalOpen}
        editingIndex={editingIndex}
        steps={steps}
        setSteps={setSteps}
      />

    </div>
  );
}
