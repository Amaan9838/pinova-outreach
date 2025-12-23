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
// import { AICampaignPerformancePanel } from '@/components/AICampaignPerformancePanel';

import SequencesTab from './components/SequencesTab';
import ScheduleTab from './components/ScheduleTab';
import CampaignControls from '@/components/CampaignControls';
import OptionsTab from './components/OptionsTab';
import TemplateModal from './components/TemplateModal';
import { Skeleton } from '@/components/ui/skeleton';
// Import utilities
import { getStatusColor, getMessageStatusColor, computeDailySeries, computeMessageStats } from './utils/campaignUtils';
import { 
  BarChart3, 
  Users, 
  ListOrdered, 
  Calendar, 
  Settings, 
  ArrowLeft,
  LayoutDashboard
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function CampaignDetailsPage({ params }) {
  const router = useRouter();
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('analytics');
  const [isEditing, setIsEditing] = useState(false);
  const [editedCampaign, setEditedCampaign] = useState({});
  const [deleteCampaignDialog, setDeleteCampaignDialog] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [sequenceSaving, setSequenceSaving] = useState(false);
  const [templatesModalOpen, setTemplatesModalOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [steps, setSteps] = useState([]);
  const [sentCount, setSentCount] = useState(0);
  const [openedCount, setOpenedCount] = useState(0);
  const [deliveredCount, setDeliveredCount] = useState(0);
  const [repliedCount, setRepliedCount] = useState(0);

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
        
        // Calculate message counts - check events array for actual sent status
        const sent = data.messages.filter(m => 
          m.sentAt || 
          (m.events && m.events.some(event => event.type === 'sent'))
        ).length;
        const delivered = data.messages.filter(m => 
          m.deliveredAt || 
          m.status === 'delivered' || 
          m.status === 'opened' || 
          m.status === 'replied'
        ).length;
        
        // Fix open rate calculation - check openedAt field or events array for opens
        const opened = data.messages.filter(m => 
          m.openedAt || 
          (m.events && m.events.some(event => event.type === 'opened')) ||
          m.status === 'replied' // replied implies opened
        ).length;
        
        // Fix reply rate calculation - check events array for replies
        const replied = data.messages.filter(m => 
          (m.events && m.events.some(event => event.type === 'replied')) ||
          m.status === 'replied'
        ).length;
        
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
        toast.success('Test email sent successfully! Check your inbox.');
      } else {
        toast.error('Test failed: ' + result.error);
      }
    } catch (error) {
      toast.error('Error: ' + error.message);
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
        toast.success("Campaign paused");
      } else {
        toast.error(data.error || 'Failed to pause campaign');
      }
    } catch (error) {
      console.error('Failed to pause campaign:', error);
      toast.error('Failed to pause campaign');
    }
  };

  const resumeCampaign = async () => {
    try {
      const response = await fetch(`/api/campaigns/${params.id}/resume`, {
        method: 'POST'
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Campaign resumed successfully!');
        fetchCampaignDetails();
      } else {
        toast.error('Failed to resume campaign: ' + data.error);
      }
    } catch (error) {
      console.error('Failed to resume campaign:', error);
      toast.error('Failed to resume campaign');
    }
  };

  const startCampaign = async () => {
    try {
      const response = await fetch(`/api/campaigns/${params.id}/start`, {
        method: 'POST'
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Campaign started successfully!');
        fetchCampaignDetails();
      } else {
        toast.error('Failed to start campaign: ' + data.error);
      }
    } catch (error) {
      console.error('Failed to start campaign:', error);
      toast.error('Failed to start campaign');
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
      toast.success("Sequence saved successfully");
    } catch (err) {
      toast.error(err.message || 'Failed to save sequence');
    } finally {
      setSequenceSaving(false);
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50/50 p-8 space-y-6">
        <div className="flex gap-4">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
        <Skeleton className="h-[600px] w-full rounded-xl" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50/50">
        <div className="text-center p-12 bg-white rounded-2xl shadow-sm border border-slate-100">
          <p className="text-slate-500 mb-4">Campaign not found</p>
          <Button onClick={() => router.push('/campaigns')} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Campaigns
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950/50 relative overflow-hidden">
      {/* Dynamic Background */}
      <div className="fixed inset-0 pointer-events-none z-[-1]">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-purple-500/10 blur-[100px] rounded-full mix-blend-multiply opacity-50 animate-blob" />
        <div 
          className="absolute top-[20%] left-[-10%] w-[600px] h-[600px] bg-blue-500/10 blur-[120px] rounded-full mix-blend-multiply opacity-50 animate-blob"
          style={{ animationDelay: '2s' }}
        />
        <div 
          className="absolute bottom-[-10%] right-[10%] w-[500px] h-[500px] bg-pink-500/10 blur-[100px] rounded-full mix-blend-multiply opacity-50 animate-blob"
          style={{ animationDelay: '4s' }}
        />
      </div>

      <div className="container max-w-[1600px] mx-auto p-4 md:p-6 lg:p-8 space-y-6">
        
        {/* Navigation Wrapper */}
        <div className="flex items-center gap-2 mb-2">
           <Button 
             variant="ghost" 
             className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
             onClick={() => router.push('/campaigns')}
           >
             <ArrowLeft className="h-4 w-4 mr-2" /> Back to Campaigns
           </Button>
        </div>

        {/* Campaign Header */}
        <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-6 shadow-sm">
          <Header
            campaign={campaign}
            getStatusColor={getStatusColor}
            sendTestEmail={sendTestEmail}
            processSequencesManually={processSequencesManually}
            pauseCampaign={pauseCampaign}
            resumeCampaign={resumeCampaign}
            startCampaign={startCampaign}
            deleteCampaign={() => setDeleteCampaignDialog(true)}
          />

          <div className="mt-6 pt-6 border-t border-slate-200/50 dark:border-slate-800/50">
             <CampaignControls
              campaign={campaign}
              onStart={startCampaign}
              onPause={pauseCampaign}
              onResume={resumeCampaign}
              onCampaignUpdate={(updatedCampaign) => {
                setCampaign(updatedCampaign);
                fetchCampaignDetails();
              }}
            />
          </div>
        </div>

        {/* Start Delete Dialog */}
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

        {/* Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
          <div className="sticky top-4 z-30 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-md p-1.5 rounded-xl border border-slate-200/50 dark:border-slate-800/50 inline-flex shadow-sm">
            <TabsList className="bg-transparent h-auto p-0 gap-1">
              <TabsTrigger 
                value="analytics"
                className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-purple-600 dark:data-[state=active]:text-purple-400 data-[state=active]:shadow-sm rounded-lg px-4 py-2.5 h-auto transition-all text-slate-500"
              >
                <BarChart3 className="h-4 w-4 mr-2" /> Analytics
              </TabsTrigger>
              <TabsTrigger 
                value="leads"
                className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:shadow-sm rounded-lg px-4 py-2.5 h-auto transition-all text-slate-500"
              >
                <Users className="h-4 w-4 mr-2" /> Leads
              </TabsTrigger>
              <TabsTrigger 
                value="sequences"
                className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-emerald-600 dark:data-[state=active]:text-emerald-400 data-[state=active]:shadow-sm rounded-lg px-4 py-2.5 h-auto transition-all text-slate-500"
              >
                <ListOrdered className="h-4 w-4 mr-2" /> Sequences
              </TabsTrigger>
              <TabsTrigger 
                value="schedule"
                className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-orange-600 dark:data-[state=active]:text-orange-400 data-[state=active]:shadow-sm rounded-lg px-4 py-2.5 h-auto transition-all text-slate-500"
              >
                <Calendar className="h-4 w-4 mr-2" /> Schedule
              </TabsTrigger>
              <TabsTrigger 
                value="options"
                className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-slate-900 dark:data-[state=active]:text-slate-100 data-[state=active]:shadow-sm rounded-lg px-4 py-2.5 h-auto transition-all text-slate-500"
              >
                <Settings className="h-4 w-4 mr-2" /> Options
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Dynamic Tab Content with Glassmorphic Container */}
          <div className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-6 shadow-sm min-h-[500px]">
            <TabsContent value="analytics" className="mt-0 focus-visible:outline-none">
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                {/* <AICampaignPerformancePanel 
                  campaignId={params.id} 
                  campaignData={{
                    ...campaign,
                    stats: {
                      sent: sentCount,
                      delivered: deliveredCount,
                      opened: openedCount,
                      clicked: 0,
                      replied: repliedCount,
                      bounced: 0
                    }
                  }} 
                /> */}
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
              </div>
            </TabsContent>

            <TabsContent value="leads" className="mt-0 focus-visible:outline-none">
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                <EnhancedLeadsTab 
                  campaign={campaign}
                  getStatusColor={getStatusColor}
                  campaignId={params.id}
                />
              </div>
            </TabsContent>

            <TabsContent value="sequences" className="mt-0 focus-visible:outline-none">
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
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
              </div>
            </TabsContent>

            <TabsContent value="schedule" className="mt-0 focus-visible:outline-none">
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                <ScheduleTab
                  campaign={campaign}
                  campaignId={params.id}
                  onCampaignUpdate={(updatedCampaign) => {
                    setCampaign(updatedCampaign);
                    fetchCampaignDetails();
                  }}
                />
              </div>
            </TabsContent>

            <TabsContent value="options" className="mt-0 focus-visible:outline-none">
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                <OptionsTab
                  campaign={campaign}
                  sendTestEmail={sendTestEmail}
                  processSequencesManually={processSequencesManually}
                  pauseCampaign={pauseCampaign}
                  resumeCampaign={resumeCampaign}
                  startCampaign={startCampaign}
                  deleteCampaign={() => setDeleteCampaignDialog(true)}
                />
              </div>
            </TabsContent>
          </div>
        </Tabs>
        
        {/* Template Modal Component - Portal */}
        <TemplateModal
          templatesModalOpen={templatesModalOpen}
          setTemplatesModalOpen={setTemplatesModalOpen}
          editingIndex={editingIndex}
          steps={steps}
          setSteps={setSteps}
        />

      </div>
    </div>
  );
}
