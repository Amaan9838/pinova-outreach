'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  Users,
  TrendingUp,
  Target,
  Mail,
  Phone,
  Calendar,
  ChevronRight,
  MoreVertical,
  Plus,
  RefreshCw,
  Sparkles,
  ArrowRight,
  AlertTriangle,
  CheckCircle,
  Clock,
  Flame,
  Brain,
  Zap,
  BarChart3,
  DollarSign,
  Filter,
  Search,
  ExternalLink,
  Eye,
  MessageSquare,
  Star
} from 'lucide-react';

// Pipeline stage configuration
const PIPELINE_STAGES = [
  { id: 'new_lead', label: 'New Leads', color: 'bg-slate-500', icon: Users },
  { id: 'contacted', label: 'Contacted', color: 'bg-blue-500', icon: Mail },
  { id: 'engaged', label: 'Engaged', color: 'bg-cyan-500', icon: Eye },
  { id: 'responded', label: 'Responded', color: 'bg-purple-500', icon: MessageSquare },
  { id: 'interested', label: 'Interested', color: 'bg-amber-500', icon: Star },
  { id: 'demo_scheduled', label: 'Demo Scheduled', color: 'bg-orange-500', icon: Calendar },
  { id: 'proposal_sent', label: 'Proposal Sent', color: 'bg-pink-500', icon: Target },
  { id: 'negotiating', label: 'Negotiating', color: 'bg-indigo-500', icon: TrendingUp },
  { id: 'closed_won', label: 'Closed Won', color: 'bg-green-500', icon: CheckCircle },
  { id: 'closed_lost', label: 'Closed Lost', color: 'bg-red-500', icon: AlertTriangle },
];

// Lead score color
const getScoreColor = (score) => {
  if (score >= 70) return 'text-green-500 bg-green-500/10';
  if (score >= 50) return 'text-amber-500 bg-amber-500/10';
  if (score >= 30) return 'text-blue-500 bg-blue-500/10';
  return 'text-slate-500 bg-slate-500/10';
};

export default function PipelinePage() {
  const [pipelineData, setPipelineData] = useState({ items: [], stats: null, hotLeads: [] });
  const [insights, setInsights] = useState({ insights: [], priorityActions: [] });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [activeView, setActiveView] = useState('kanban'); // kanban or list
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch pipeline data
  const fetchPipeline = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/pipeline?includeStats=true');
      const data = await res.json();
      if (data.success) {
        setPipelineData(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch pipeline:', error);
      toast.error('Failed to load pipeline');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch AI insights
  const fetchInsights = useCallback(async () => {
    try {
      const res = await fetch('/api/pipeline/insights');
      const data = await res.json();
      if (data.success) {
        setInsights(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch insights:', error);
    }
  }, []);

  // Sync pipeline from existing data
  const syncPipeline = async () => {
    try {
      setSyncing(true);
      const res = await fetch('/api/pipeline/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync_all' })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Synced ${data.data.created} new leads, updated ${data.data.updated}`);
        await fetchPipeline();
      }
    } catch (error) {
      toast.error('Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  // Move lead to new stage
  const moveToStage = async (leadId, newStage) => {
    try {
      const res = await fetch('/api/pipeline', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: leadId, stage: newStage })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Moved to ${PIPELINE_STAGES.find(s => s.id === newStage)?.label}`);
        await fetchPipeline();
      }
    } catch (error) {
      toast.error('Failed to update stage');
    }
  };

  useEffect(() => {
    fetchPipeline();
    fetchInsights();
  }, [fetchPipeline, fetchInsights]);

  // Group items by stage
  const itemsByStage = PIPELINE_STAGES.reduce((acc, stage) => {
    acc[stage.id] = pipelineData.items.filter(item => item.stage === stage.id);
    return acc;
  }, {});

  // Filter items by search
  const filteredItems = searchQuery
    ? pipelineData.items.filter(item =>
        `${item.prospect?.firstName} ${item.prospect?.lastName} ${item.prospect?.email} ${item.prospect?.company}`
          .toLowerCase()
          .includes(searchQuery.toLowerCase())
      )
    : pipelineData.items;

  // Stats summary
  const stats = pipelineData.stats?.totals || {};

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto p-6 space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-600">
              Sales Pipeline
            </h1>
            <p className="text-muted-foreground mt-1">
              Track and manage your real estate agent outreach
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchPipeline} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline" onClick={syncPipeline} disabled={syncing}>
              <Zap className={`h-4 w-4 mr-2 ${syncing ? 'animate-pulse' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync Data'}
            </Button>
            <Button className="bg-gradient-to-r from-purple-600 to-blue-600">
              <Plus className="h-4 w-4 mr-2" />
              Add Lead
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="border-0 shadow-md bg-white/50 backdrop-blur">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Leads</p>
                  <p className="text-2xl font-bold">{stats.total || 0}</p>
                </div>
                <Users className="h-8 w-8 text-blue-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-md bg-white/50 backdrop-blur">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active</p>
                  <p className="text-2xl font-bold">{stats.active || 0}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-amber-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-md bg-white/50 backdrop-blur">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Won</p>
                  <p className="text-2xl font-bold text-green-600">{stats.closedWon || 0}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-md bg-white/50 backdrop-blur">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Conversion</p>
                  <p className="text-2xl font-bold">{stats.conversionRate || 0}%</p>
                </div>
                <Target className="h-8 w-8 text-purple-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-md bg-white/50 backdrop-blur">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pipeline Value</p>
                  <p className="text-2xl font-bold">${(stats.totalPipelineValue || 0).toLocaleString()}</p>
                </div>
                <DollarSign className="h-8 w-8 text-green-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* AI Insights Panel */}
        {insights.insights?.length > 0 && (
          <Card className="border-0 shadow-lg bg-gradient-to-r from-purple-500/10 to-blue-500/10 backdrop-blur">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-purple-500" />
                <CardTitle className="text-lg">AI Insights</CardTitle>
                <Badge variant="outline" className="ml-auto">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Gemini 2.5 Flash
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                {insights.insights.slice(0, 3).map((insight, i) => (
                  <div
                    key={i}
                    className={`p-4 rounded-lg border ${
                      insight.priority === 'urgent' ? 'border-red-300 bg-red-50/50' :
                      insight.priority === 'high' ? 'border-amber-300 bg-amber-50/50' :
                      'border-slate-200 bg-white/50'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {insight.type === 'opportunity' && <Flame className="h-4 w-4 text-orange-500 mt-0.5" />}
                      {insight.type === 'warning' && <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5" />}
                      {insight.type === 'recommendation' && <Zap className="h-4 w-4 text-blue-500 mt-0.5" />}
                      {insight.type === 'analysis' && <BarChart3 className="h-4 w-4 text-purple-500 mt-0.5" />}
                      <div className="flex-1">
                        <p className="font-medium text-sm">{insight.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">{insight.message}</p>
                        {insight.action && (
                          <Button size="sm" variant="link" className="p-0 h-auto mt-2 text-xs">
                            {insight.action}
                            <ArrowRight className="h-3 w-3 ml-1" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Hot Leads */}
        {pipelineData.hotLeads?.length > 0 && (
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Flame className="h-5 w-5 text-orange-500" />
                <CardTitle className="text-lg">Hot Leads - Take Action Now</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 overflow-x-auto pb-2">
                {pipelineData.hotLeads.map((lead) => (
                  <div
                    key={lead._id}
                    className="flex-shrink-0 p-4 bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg border border-orange-200 min-w-[250px]"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold">
                          {lead.prospect?.firstName} {lead.prospect?.lastName}
                        </p>
                        <p className="text-sm text-muted-foreground">{lead.prospect?.company}</p>
                      </div>
                      <Badge className={getScoreColor(lead.leadScore)}>
                        {lead.leadScore}
                      </Badge>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button size="sm" variant="outline">
                        <Mail className="h-3 w-3 mr-1" />
                        Email
                      </Button>
                      <Button size="sm" className="bg-orange-500 hover:bg-orange-600">
                        <Phone className="h-3 w-3 mr-1" />
                        Call
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search and View Toggle */}
        <div className="flex gap-4 items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search leads..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Tabs value={activeView} onValueChange={setActiveView}>
            <TabsList>
              <TabsTrigger value="kanban">Kanban</TabsTrigger>
              <TabsTrigger value="list">List</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Kanban Board */}
        {activeView === 'kanban' && (
          <div className="overflow-x-auto pb-4">
            <div className="flex gap-4 min-w-max">
              {PIPELINE_STAGES.filter(s => !['closed_lost'].includes(s.id)).map((stage) => (
                <div key={stage.id} className="w-72 flex-shrink-0">
                  <div className={`p-3 rounded-t-lg ${stage.color} text-white`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <stage.icon className="h-4 w-4" />
                        <span className="font-medium">{stage.label}</span>
                      </div>
                      <Badge variant="secondary" className="bg-white/20 text-white">
                        {itemsByStage[stage.id]?.length || 0}
                      </Badge>
                    </div>
                  </div>
                  
                  <ScrollArea className="h-[500px] bg-slate-100/50 rounded-b-lg p-2">
                    <div className="space-y-2">
                      {itemsByStage[stage.id]?.map((item) => (
                        <Card
                          key={item._id}
                          className="cursor-pointer hover:shadow-md transition-shadow border-0"
                          onClick={() => setSelectedLead(item)}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">
                                  {item.prospect?.firstName} {item.prospect?.lastName}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {item.prospect?.company || item.prospect?.email}
                                </p>
                              </div>
                              <Badge className={`${getScoreColor(item.leadScore)} ml-2`}>
                                {item.leadScore}
                              </Badge>
                            </div>
                            
                            {/* Quick metrics */}
                            <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {item.metrics?.totalEmailsSent || 0}
                              </span>
                              <span className="flex items-center gap-1">
                                <Eye className="h-3 w-3" />
                                {item.metrics?.totalOpens || 0}
                              </span>
                              <span className="flex items-center gap-1">
                                <MessageSquare className="h-3 w-3" />
                                {item.metrics?.totalReplies || 0}
                              </span>
                            </div>
                            
                            {/* Next action indicator */}
                            {item.nextAction?.type !== 'none' && (
                              <div className="mt-2 flex items-center gap-1 text-xs text-amber-600">
                                <Clock className="h-3 w-3" />
                                {item.nextAction?.description}
                              </div>
                            )}
                            
                            {/* Stage change dropdown */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button size="sm" variant="ghost" className="w-full mt-2 h-7">
                                  Move to <ChevronRight className="h-3 w-3 ml-1" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                {PIPELINE_STAGES.filter(s => s.id !== item.stage).map((s) => (
                                  <DropdownMenuItem
                                    key={s.id}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      moveToStage(item._id, s.id);
                                    }}
                                  >
                                    <div className={`w-2 h-2 rounded-full ${s.color} mr-2`} />
                                    {s.label}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </CardContent>
                        </Card>
                      ))}
                      
                      {(!itemsByStage[stage.id] || itemsByStage[stage.id].length === 0) && (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                          No leads in this stage
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* List View */}
        {activeView === 'list' && (
          <Card className="border-0 shadow-lg">
            <CardContent className="p-0">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr className="text-left text-sm text-muted-foreground">
                    <th className="p-4">Lead</th>
                    <th className="p-4">Stage</th>
                    <th className="p-4">Score</th>
                    <th className="p-4">Emails</th>
                    <th className="p-4">Opens</th>
                    <th className="p-4">Replies</th>
                    <th className="p-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item) => {
                    const stage = PIPELINE_STAGES.find(s => s.id === item.stage);
                    return (
                      <tr key={item._id} className="border-t hover:bg-slate-50">
                        <td className="p-4">
                          <div>
                            <p className="font-medium">
                              {item.prospect?.firstName} {item.prospect?.lastName}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {item.prospect?.email}
                            </p>
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge className={`${stage?.color} text-white`}>
                            {stage?.label}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <Badge className={getScoreColor(item.leadScore)}>
                            {item.leadScore}
                          </Badge>
                        </td>
                        <td className="p-4">{item.metrics?.totalEmailsSent || 0}</td>
                        <td className="p-4">{item.metrics?.totalOpens || 0}</td>
                        <td className="p-4">{item.metrics?.totalReplies || 0}</td>
                        <td className="p-4">
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline">
                              <Mail className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="outline">
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              
              {filteredItems.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  {searchQuery ? 'No leads match your search' : 'No leads in pipeline. Click "Sync Data" to import from campaigns.'}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Lead Detail Modal */}
        <Dialog open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {selectedLead?.prospect?.firstName} {selectedLead?.prospect?.lastName}
              </DialogTitle>
              <DialogDescription>
                {selectedLead?.prospect?.company} • {selectedLead?.prospect?.email}
              </DialogDescription>
            </DialogHeader>
            
            {selectedLead && (
              <div className="space-y-4 mt-4">
                {/* Score and Stage */}
                <div className="flex gap-4">
                  <div className="flex-1 p-4 bg-slate-50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Lead Score</p>
                    <p className="text-3xl font-bold">{selectedLead.leadScore}</p>
                    <Progress value={selectedLead.leadScore} className="mt-2" />
                  </div>
                  <div className="flex-1 p-4 bg-slate-50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Current Stage</p>
                    <Badge className={`${PIPELINE_STAGES.find(s => s.id === selectedLead.stage)?.color} text-white mt-1`}>
                      {PIPELINE_STAGES.find(s => s.id === selectedLead.stage)?.label}
                    </Badge>
                  </div>
                </div>
                
                {/* Engagement Metrics */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <Mail className="h-5 w-5 mx-auto text-blue-500" />
                    <p className="text-xl font-bold">{selectedLead.metrics?.totalEmailsSent || 0}</p>
                    <p className="text-xs text-muted-foreground">Emails Sent</p>
                  </div>
                  <div className="text-center p-3 bg-cyan-50 rounded-lg">
                    <Eye className="h-5 w-5 mx-auto text-cyan-500" />
                    <p className="text-xl font-bold">{selectedLead.metrics?.totalOpens || 0}</p>
                    <p className="text-xs text-muted-foreground">Opens</p>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <MessageSquare className="h-5 w-5 mx-auto text-purple-500" />
                    <p className="text-xl font-bold">{selectedLead.metrics?.totalReplies || 0}</p>
                    <p className="text-xs text-muted-foreground">Replies</p>
                  </div>
                  <div className="text-center p-3 bg-amber-50 rounded-lg">
                    <Target className="h-5 w-5 mx-auto text-amber-500" />
                    <p className="text-xl font-bold">{Math.round(selectedLead.metrics?.openRate || 0)}%</p>
                    <p className="text-xs text-muted-foreground">Open Rate</p>
                  </div>
                </div>
                
                {/* AI Insights for this lead */}
                {selectedLead.aiInsights?.length > 0 && (
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <p className="font-medium flex items-center gap-2">
                      <Brain className="h-4 w-4 text-purple-500" />
                      AI Insights
                    </p>
                    <ul className="mt-2 space-y-1">
                      {selectedLead.aiInsights.slice(-3).map((insight, i) => (
                        <li key={i} className="text-sm text-muted-foreground">
                          • {insight.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {/* Quick Actions */}
                <div className="flex gap-2 pt-4 border-t">
                  <Button className="flex-1">
                    <Mail className="h-4 w-4 mr-2" />
                    Send Email
                  </Button>
                  <Button variant="outline" className="flex-1">
                    <Calendar className="h-4 w-4 mr-2" />
                    Schedule Demo
                  </Button>
                  <Button variant="outline">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
}
