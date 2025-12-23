'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
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
  Search,
  ExternalLink,
  Eye,
  MessageSquare,
  Star,
  LayoutGrid,
  List as ListIcon,
  Filter,
  ArrowUpRight
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

const getScoreColor = (score) => {
  if (score >= 70) return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
  if (score >= 50) return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
  if (score >= 30) return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
  return 'text-slate-500 bg-slate-500/10 border-slate-500/20';
};

export default function PipelinePage() {
  const [pipelineData, setPipelineData] = useState({ items: [], stats: null, hotLeads: [] });
  const [insights, setInsights] = useState({ insights: [], priorityActions: [] });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [activeView, setActiveView] = useState('kanban');
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

  // Group items
  const itemsByStage = PIPELINE_STAGES.reduce((acc, stage) => {
    acc[stage.id] = pipelineData.items.filter(item => item.stage === stage.id);
    return acc;
  }, {});

  // Filter items
  const filteredItems = searchQuery
    ? pipelineData.items.filter(item =>
        `${item.prospect?.firstName} ${item.prospect?.lastName} ${item.prospect?.email} ${item.prospect?.company}`
          .toLowerCase()
          .includes(searchQuery.toLowerCase())
      )
    : pipelineData.items;

  const stats = pipelineData.stats?.totals || {};

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950/50 relative overflow-hidden">
      {/* Dynamic Background */}
      <div className="fixed inset-0 pointer-events-none z-[-1]">
        <div className="absolute top-0 -left-64 w-[600px] h-[600px] bg-purple-500/10 blur-[120px] rounded-full mix-blend-multiply opacity-50 dark:opacity-20 animate-blob" />
        <div 
          className="absolute top-0 -right-64 w-[600px] h-[600px] bg-blue-500/10 blur-[120px] rounded-full mix-blend-multiply opacity-50 dark:opacity-20 animate-blob"
          style={{ animationDelay: '2s' }}
        />
        <div 
          className="absolute -bottom-32 left-1/3 w-[600px] h-[600px] bg-pink-500/10 blur-[120px] rounded-full mix-blend-multiply opacity-50 dark:opacity-20 animate-blob"
          style={{ animationDelay: '4s' }}
        />
      </div>

      <div className="container max-w-[1600px] mx-auto p-4 md:p-8 space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="space-y-1">
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400">
              Pipeline Command
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-lg font-light">
              Overview of your active deals and outreach performance.
            </p>
          </div>
          
          <div className="flex items-center gap-3 w-full lg:w-auto">
            <Button 
              variant="outline" 
              onClick={syncPipeline} 
              disabled={syncing}
              className="relative group overflow-hidden border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 hover:bg-white dark:hover:bg-slate-900 transition-all duration-300"
            >
              <div className={`absolute inset-0 bg-blue-500/10 dark:bg-blue-500/20 transition-transform duration-500 ${syncing ? 'translate-x-0' : '-translate-x-full'}`} />
              <Zap className={`h-4 w-4 mr-2 ${syncing ? 'animate-pulse text-blue-500' : 'text-slate-500'}`} />
              <span className="relative z-10">{syncing ? 'Syncing Intelligence...' : 'Sync Data'}</span>
            </Button>
            
            <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg shadow-blue-500/20 transition-all duration-300 hover:scale-[1.02]">
              <Plus className="h-4 w-4 mr-2" />
              Add Lead
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { label: 'Total Volume', value: stats.total || 0, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
            { label: 'Active Deals', value: stats.active || 0, icon: TrendingUp, color: 'text-amber-500', bg: 'bg-amber-500/10' },
            { label: 'Closed Won', value: stats.closedWon || 0, icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
            { label: 'Conversion', value: `${stats.conversionRate || 0}%`, icon: Target, color: 'text-purple-500', bg: 'bg-purple-500/10' },
            { label: 'Pipeline Value', value: `$${(stats.totalPipelineValue || 0).toLocaleString()}`, icon: DollarSign, color: 'text-green-500', bg: 'bg-green-500/10' }
          ].map((stat, i) => (
            <div key={i} className="group relative p-6 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1">
              <div className="flex justify-between items-start mb-4">
                <div className={cn("p-2 rounded-xl transition-colors duration-300 group-hover:bg-opacity-20", stat.bg)}>
                  <stat.icon className={cn("h-5 w-5", stat.color)} />
                </div>
                {i === 4 && <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 border-none">+12.5%</Badge>}
              </div>
              <div className="space-y-1">
                <h3 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {stat.value}
                </h3>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  {stat.label}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* AI Action Center */}
        {insights.insights?.length > 0 && (
          <div className="relative overflow-hidden rounded-2xl border border-purple-200/50 dark:border-purple-900/50 bg-gradient-to-br from-purple-50/50 to-white/50 dark:from-purple-950/20 dark:to-slate-900/50 backdrop-blur-xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-xl shadow-lg shadow-purple-500/20">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">AI Intelligence Briefing</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Actionable insights from your pipeline activity</p>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              {insights.insights.slice(0, 3).map((insight, i) => (
                <div key={i} className="group relative p-4 bg-white/60 dark:bg-slate-900/60 rounded-xl border border-slate-200/50 dark:border-slate-800/50 hover:bg-white dark:hover:bg-slate-900 transition-all duration-300">
                  <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl bg-gradient-to-b from-purple-500 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="flex gap-3">
                    {insight.type === 'opportunity' ? <Flame className="h-5 w-5 text-orange-500 shrink-0" /> :
                     insight.type === 'warning' ? <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" /> :
                     <Zap className="h-5 w-5 text-blue-500 shrink-0" />}
                    <div>
                      <h4 className="font-semibold text-sm text-slate-900 dark:text-white mb-1">{insight.title}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{insight.message}</p>
                      {insight.action && (
                        <button className="mt-3 text-xs font-semibold text-purple-600 dark:text-purple-400 flex items-center hover:underline">
                          {insight.action} <ArrowRight className="h-3 w-3 ml-1" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filters & View Toggle */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white/60 dark:bg-slate-900/60 backdrop-blur-md p-2 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm sticky top-4 z-30">
          <div className="relative flex-1 w-full md:w-auto md:max-w-md ml-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search leads, companies or details..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-transparent border-slate-200 dark:border-slate-800 focus-visible:ring-purple-500/20 focus-visible:border-purple-500 transition-all"
            />
          </div>
          
          <div className="flex items-center gap-2 mr-2">
            <Tabs value={activeView} onValueChange={setActiveView} className="bg-slate-100/50 dark:bg-slate-800/50 p-1 rounded-lg">
              <TabsList className="bg-transparent p-0 gap-1">
                <TabsTrigger value="kanban" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 shadow-none data-[state=active]:shadow-sm transition-all text-xs px-3 py-1.5 h-auto">
                  <LayoutGrid className="h-3.5 w-3.5 mr-2" /> Board
                </TabsTrigger>
                <TabsTrigger value="list" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 shadow-none data-[state=active]:shadow-sm transition-all text-xs px-3 py-1.5 h-auto">
                  <ListIcon className="h-3.5 w-3.5 mr-2" /> List
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-500 hover:text-slate-900 dark:hover:text-white">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Kanban Board */}
        {activeView === 'kanban' && (
          <div className="overflow-x-auto pb-6 -mx-4 px-4">
            <div className="flex gap-6 min-w-max">
              {PIPELINE_STAGES.filter(s => !['closed_lost'].includes(s.id)).map((stage) => (
                <div key={stage.id} className="w-80 flex-shrink-0 group">
                  <div className="flex items-center justify-between mb-4 sticky top-0 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur z-20 py-2">
                    <div className="flex items-center gap-2">
                      <div className={cn("w-2 h-2 rounded-full", stage.color)} />
                      <span className="font-semibold text-sm text-slate-700 dark:text-slate-200">{stage.label}</span>
                      <span className="text-xs text-slate-400 font-medium ml-1">
                        {itemsByStage[stage.id]?.length || 0}
                      </span>
                    </div>
                    {/* Add visual indicator for empty state */}
                  </div>
                  
                  <div className="space-y-3 min-h-[200px]">
                    {itemsByStage[stage.id]?.map((item) => (
                      <Card
                        key={item._id}
                        onClick={() => setSelectedLead(item)}
                        className="group/card cursor-pointer border-slate-200/60 dark:border-slate-800/60 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm overflow-hidden"
                      >
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300">
                                {item.prospect?.firstName?.[0]}{item.prospect?.lastName?.[0]}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm text-slate-900 dark:text-white truncate max-w-[140px]">
                                  {item.prospect?.firstName} {item.prospect?.lastName}
                                </p>
                                <p className="text-xs text-slate-500 truncate max-w-[140px]">
                                  {item.prospect?.company}
                                </p>
                              </div>
                            </div>
                            <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-5 font-mono", getScoreColor(item.leadScore))}>
                              {item.leadScore}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-3 gap-1 mb-3 pt-3 border-t border-slate-100 dark:border-slate-800/50">
                            {[
                              { icon: Mail, value: item.metrics?.totalEmailsSent },
                              { icon: Eye, value: item.metrics?.totalOpens },
                              { icon: MessageSquare, value: item.metrics?.totalReplies }
                            ].map((metric, idx) => (
                              <div key={idx} className="flex items-center gap-1.5 justify-center">
                                <metric.icon className="h-3 w-3 text-slate-400" />
                                <span className={cn("text-xs font-medium", metric.value > 0 ? "text-slate-700 dark:text-slate-300" : "text-slate-400")}>
                                  {metric.value || 0}
                                </span>
                              </div>
                            ))}
                          </div>

                          {item.nextAction?.type !== 'none' && (
                            <div className="flex items-center gap-2 text-xs bg-amber-50 dark:bg-amber-900/10 text-amber-700 dark:text-amber-400 p-2 rounded-md">
                              <Clock className="h-3 w-3 shrink-0" />
                              <span className="truncate">{item.nextAction?.description}</span>
                            </div>
                          )}

                          <div className="mt-3 opacity-0 group-hover/card:opacity-100 transition-opacity duration-200 flex gap-2">
                             <Button size="sm" variant="outline" className="w-full h-7 text-xs bg-white/50 dark:bg-slate-900/50 hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-purple-600 dark:hover:text-purple-400 border-dashed">
                               View <ArrowUpRight className="h-3 w-3 ml-1" />
                             </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    
                    {(!itemsByStage[stage.id] || itemsByStage[stage.id].length === 0) && (
                      <div className="h-32 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-center text-slate-400 text-xs font-medium">
                        Empty Stage
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* List View */}
        {activeView === 'list' && (
          <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50/50 dark:bg-slate-900/50 text-xs uppercase tracking-wider font-semibold text-slate-500 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="text-left py-4 px-6">Lead</th>
                    <th className="text-left py-4 px-6">Stage</th>
                    <th className="text-left py-4 px-6">Score</th>
                    <th className="text-left py-4 px-6">Engagement</th>
                    <th className="text-right py-4 px-6">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredItems.map((item) => {
                    const stage = PIPELINE_STAGES.find(s => s.id === item.stage);
                    return (
                      <tr key={item._id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="py-4 px-6">
                           <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center font-bold text-slate-500 text-sm">
                                {item.prospect?.firstName?.[0]}{item.prospect?.lastName?.[0]}
                              </div>
                              <div>
                                <p className="font-semibold text-sm text-slate-900 dark:text-white">
                                  {item.prospect?.firstName} {item.prospect?.lastName}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {item.prospect?.company || item.prospect?.email}
                                </p>
                              </div>
                           </div>
                        </td>
                        <td className="py-4 px-6">
                          <Badge variant="secondary" className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 border-none font-medium">
                            <div className={cn("w-1.5 h-1.5 rounded-full mr-2", stage?.color)} />
                            {stage?.label}
                          </Badge>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={cn("font-mono", getScoreColor(item.leadScore))}>
                              {item.leadScore}
                            </Badge>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                           <div className="flex gap-4 text-sm text-slate-500">
                              <span className="flex items-center gap-1.5">
                                <Mail className="h-3.5 w-3.5" /> {item.metrics?.totalEmailsSent || 0}
                              </span>
                              <span className="flex items-center gap-1.5">
                                <Eye className="h-3.5 w-3.5" /> {item.metrics?.totalOpens || 0}
                              </span>
                           </div>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <Button size="sm" variant="ghost" onClick={() => setSelectedLead(item)}>
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filteredItems.length === 0 && (
                <div className="text-center py-16">
                   <div className="h-12 w-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Search className="h-6 w-6 text-slate-400" />
                   </div>
                   <h3 className="text-slate-900 dark:text-white font-medium">No leads found</h3>
                   <p className="text-slate-500 text-sm mt-1">Try adjusting your filters or search query.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Lead Detail Modal */}
        <Dialog open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
          <DialogContent className="max-w-3xl p-0 overflow-hidden bg-white dark:bg-slate-900 border-none shadow-2xl">
            {selectedLead && (
              <div className="flex flex-col h-full">
                {/* Modal Header */}
                <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-8 text-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-10">
                    <TrendingUp className="h-48 w-48 -rotate-12 transform translate-x-12 -translate-y-12" />
                  </div>
                  
                  <div className="relative z-10 flex justify-between items-start">
                    <div className="flex items-center gap-5">
                       <div className="h-20 w-20 rounded-2xl bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center text-3xl font-bold shadow-xl">
                          {selectedLead.prospect?.firstName?.[0]}{selectedLead.prospect?.lastName?.[0]}
                       </div>
                       <div>
                         <h2 className="text-2xl font-bold tracking-tight">
                           {selectedLead.prospect?.firstName} {selectedLead.prospect?.lastName}
                         </h2>
                         <p className="text-slate-300 flex items-center gap-2 mt-1">
                           {selectedLead.prospect?.company} • <span className="text-slate-400">{selectedLead.prospect?.email}</span>
                         </p>
                         <div className="flex gap-2 mt-4">
                           <Badge className="bg-white/20 hover:bg-white/30 border-none text-white backdrop-blur">
                             {PIPELINE_STAGES.find(s => s.id === selectedLead.stage)?.label}
                           </Badge>
                           <Badge variant="outline" className={cn("border-white/20 text-white", getScoreColor(selectedLead.leadScore).replace('text-', 'text-white/90 ').replace('bg-', 'bg-transparent '))}>
                             Score: {selectedLead.leadScore}
                           </Badge>
                         </div>
                       </div>
                    </div>
                  </div>
                </div>

                {/* Modal Body */}
                <div className="p-8 bg-slate-50 dark:bg-slate-900/50">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Left Column: Stats & Actions */}
                      <div className="space-y-6">
                         <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
                               <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-2">Engagement</p>
                               <div className="space-y-2">
                                  <div className="flex justify-between text-sm">
                                     <span className="text-slate-600 dark:text-slate-300">Emails Sent</span>
                                     <span className="font-bold">{selectedLead.metrics?.totalEmailsSent}</span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                     <span className="text-slate-600 dark:text-slate-300">Open Rate</span>
                                     <span className="font-bold text-blue-500">{Math.round(selectedLead.metrics?.openRate || 0)}%</span>
                                  </div>
                               </div>
                            </div>
                            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
                               <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-2">Next Step</p>
                               <div className="flex items-start gap-2">
                                  <Calendar className="h-4 w-4 text-purple-500 mt-0.5" />
                                  <p className="text-sm font-medium leading-tight">
                                     {selectedLead.nextAction?.description || "No scheduled actions"}
                                  </p>
                               </div>
                            </div>
                         </div>

                         <div className="space-y-3">
                            <Button className="w-full bg-slate-900 dark:bg-white dark:text-slate-900 text-white hover:bg-slate-800 h-11 shadow-lg shadow-slate-900/10">
                               <Mail className="h-4 w-4 mr-2" /> Compose Email
                            </Button>
                            <div className="grid grid-cols-2 gap-3">
                               <Button variant="outline" className="h-11 border-slate-200 dark:border-slate-700">
                                 <Calendar className="h-4 w-4 mr-2" /> Schedule
                               </Button>
                               <Button variant="outline" className="h-11 border-slate-200 dark:border-slate-700">
                                 <Phone className="h-4 w-4 mr-2" /> Log Call
                               </Button>
                            </div>
                         </div>
                      </div>

                      {/* Right Column: AI Insights */}
                      <div className="space-y-4">
                         <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-semibold">
                            <Sparkles className="h-4 w-4" /> AI Analysis
                         </div>
                         {selectedLead.aiInsights?.length > 0 ? (
                           <div className="space-y-3">
                             {selectedLead.aiInsights.map((insight, i) => (
                               <div key={i} className="bg-purple-50 dark:bg-purple-900/10 p-4 rounded-xl border border-purple-100 dark:border-purple-900/20">
                                  <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                                    "{insight.message}"
                                  </p>
                               </div>
                             ))}
                           </div>
                         ) : (
                           <div className="text-center py-8 text-slate-400 text-sm bg-slate-100 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                             No AI insights available yet.
                           </div>
                         )}
                         
                         {/* Stage Mover */}
                         <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-700/50">
                            <p className="text-xs text-slate-500 mb-3 font-medium">MOVE TO STAGE</p>
                            <div className="flex flex-wrap gap-2">
                               {PIPELINE_STAGES.filter(s => s.id !== selectedLead.stage).slice(0, 4).map(s => (
                                  <Button 
                                    key={s.id} 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => moveToStage(selectedLead._id, s.id)}
                                    className="text-xs border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                                  >
                                    <div className={cn("w-1.5 h-1.5 rounded-full mr-2", s.color)} />
                                    {s.label}
                                  </Button>
                               ))}
                            </div>
                         </div>
                      </div>
                   </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
