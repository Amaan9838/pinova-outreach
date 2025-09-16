'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  TrendingUp, 
  Users, 
  Mail, 
  Eye, 
  Reply, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  Settings, 
  Plus, 
  BarChart3, 
  Calendar, 
  Target, 
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Bell,
  Filter,
  RefreshCw,
  ExternalLink,
  Maximize2,
  MoreHorizontal
} from 'lucide-react';
import { toast } from 'sonner';

export default function Page() {
  const [stats, setStats] = useState({
    campaigns: { total: 0, active: 0 },
    prospects: { total: 0, active: 0 },
    messages: { sent: 0, delivered: 0, opened: 0, replied: 0 },
    mailboxes: { total: 0, active: 0 }
  });

  const [recentActivity, setRecentActivity] = useState([]);
  const [recentReplies, setRecentReplies] = useState([]);
  const [urgentActions, setUrgentActions] = useState([]);
  const [upcomingTasks, setUpcomingTasks] = useState([]);
  const [selectedTimeRange, setSelectedTimeRange] = useState('7d');
  const [customWidgets, setCustomWidgets] = useState(['overview', 'performance', 'activity', 'tasks']);
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000); // Auto-refresh every 30 seconds
    return () => clearInterval(interval);
  }, [selectedTimeRange]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'r':
            e.preventDefault();
            handleRefresh();
            break;
          case 'd':
            e.preventDefault();
            setIsCustomizing(true);
            break;
        }
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  const fetchDashboardData = useCallback(async () => {
    try {
      const response = await fetch('/api/dashboard');
      const data = await response.json();
      if (data?.success) {
        setStats(data.stats);
        setRecentActivity(data.recentActivity || []);
        setRecentReplies(data.recentReplies || []);
        // Mock data for UI-only features until backend is implemented
        setUrgentActions([]); // Will be populated when backend is ready
        setUpcomingTasks([]); // Will be populated when backend is ready
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      toast.error('Failed to refresh dashboard data');
    }
  }, [selectedTimeRange]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
    toast.success('Dashboard refreshed');
  };

  // Mock trend data for UI demonstration - will be replaced with real data when backend is ready
  const getMockTrend = () => {
    const mockValue = Math.random() * 20 - 10; // Random value between -10 and 10
    const isPositive = mockValue > 0;
    return {
      text: `${isPositive ? '+' : ''}${Math.abs(mockValue).toFixed(1)}%`,
      color: isPositive ? 'text-emerald-600' : 'text-red-600',
      icon: isPositive ? ArrowUpRight : ArrowDownRight
    };
  };

  // Enhanced Stat Card with trends and actions
  const EnhancedStatCard = ({ title, value, subtitle, icon: Icon, showTrend = false, color = 'blue', action, className = '' }) => {
    const trendData = showTrend ? getMockTrend() : null;
    const TrendIcon = trendData?.icon;
    
    return (
      <Card className={`group hover:shadow-lg transition-all duration-200 border-0 bg-white/80 backdrop-blur-sm ${className}`}>
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-xl bg-${color}-50`}>
                <Icon className={`h-6 w-6 text-${color}-600`} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">{title}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-2xl font-bold text-${color}-600`}>{value}</span>
                  {trendData && TrendIcon && (
                    <div className={`flex items-center gap-1 ${trendData.color}`}>
                      <TrendIcon className="h-4 w-4" />
                      <span className="text-sm font-medium">{trendData.text}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            {action && (
              <Button 
                size="sm" 
                variant="ghost" 
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={action.onClick}
              >
                <action.icon className="h-4 w-4" />
              </Button>
            )}
          </div>
          {subtitle && (
            <div className="flex items-center justify-between">
              <Badge variant="secondary" className="text-xs">{subtitle}</Badge>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // Quick Action Card
  const QuickActionCard = ({ title, description, icon: Icon, color, onClick, urgent = false }) => (
    <Card className={`cursor-pointer hover:shadow-lg transition-all duration-200 border-0 ${urgent ? 'ring-2 ring-amber-200 bg-amber-50/50' : 'bg-white/80 backdrop-blur-sm'}`} onClick={onClick}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${urgent ? 'bg-amber-100' : `bg-${color}-50`}`}>
            <Icon className={`h-5 w-5 ${urgent ? 'text-amber-600' : `text-${color}-600`}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-gray-900 truncate">{title}</h4>
            <p className="text-sm text-gray-600 truncate">{description}</p>
          </div>
          {urgent && <Badge variant="destructive" className="text-xs">Urgent</Badge>}
        </div>
      </CardContent>
    </Card>
  );

  const getActivityIcon = (type) => {
    switch (type) {
      case 'campaign':
        return { icon: Target, color: 'bg-blue-100' };
      case 'prospect':
        return { icon: Users, color: 'bg-emerald-100' };
      case 'message':
        return { icon: Mail, color: 'bg-purple-100' };
      default:
        return { icon: Activity, color: 'bg-gray-100' };
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 p-3 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Enhanced Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <Badge variant="outline" className="text-xs">
                Last updated {lastUpdated.toLocaleTimeString()}
              </Badge>
            </div>
            <p className="text-gray-600 text-lg">Real-time insights into your outreach performance</p>
          </div>
          
          <div className="flex items-center gap-3">
            <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">Last 24h</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              disabled={refreshing}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            
            <Dialog open={isCustomizing} onOpenChange={setIsCustomizing}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Settings className="h-4 w-4" />
                  Customize
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Customize Dashboard</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">Select which widgets to display on your dashboard.</p>
                  {/* Widget customization options would go here */}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <EnhancedStatCard
            title="Active Campaigns"
            value={stats.campaigns.active}
            subtitle={`${stats.campaigns.total} total`}
            icon={TrendingUp}
            showTrend={true}
            color="blue"
            action={{
              icon: Plus,
              onClick: () => window.location.href = '/campaigns/new'
            }}
          />
          <EnhancedStatCard
            title="Active Prospects"
            value={stats.prospects.active.toLocaleString()}
            subtitle={`${stats.prospects.total} total`}
            icon={Users}
            showTrend={true}
            color="emerald"
            action={{
              icon: ExternalLink,
              onClick: () => window.location.href = '/prospects'
            }}
          />
          <EnhancedStatCard
            title="Messages Sent"
            value={stats.messages.sent.toLocaleString()}
            subtitle={`${stats.messages.delivered} delivered`}
            icon={Mail}
            showTrend={true}
            color="purple"
          />
          <EnhancedStatCard
            title="Reply Rate"
            value={stats.messages.sent > 0 ? `${((stats.messages.replied / stats.messages.sent) * 100).toFixed(1)}%` : '0%'}
            subtitle={`${stats.messages.replied} replies`}
            icon={Reply}
            showTrend={true}
            color="orange"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Performance Overview */}
          <Card className="lg:col-span-2 border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-6">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-semibold flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <BarChart3 className="h-5 w-5 text-blue-600" />
                  </div>
                  Performance Overview
                </CardTitle>
                <Button variant="ghost" size="sm">
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-xl">
                  <div className="text-2xl font-bold text-emerald-600">
                    {stats.messages.sent > 0 ? ((stats.messages.delivered / stats.messages.sent) * 100).toFixed(1) : '0'}%
                  </div>
                  <div className="text-sm text-gray-600 mt-1">Delivery Rate</div>
                  <Progress value={stats.messages.sent > 0 ? (stats.messages.delivered / stats.messages.sent) * 100 : 0} className="mt-2 h-2" />
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-xl">
                  <div className="text-2xl font-bold text-blue-600">
                    {stats.messages.sent > 0 ? ((stats.messages.opened / stats.messages.sent) * 100).toFixed(1) : '0'}%
                  </div>
                  <div className="text-sm text-gray-600 mt-1">Open Rate</div>
                  <Progress value={stats.messages.sent > 0 ? (stats.messages.opened / stats.messages.sent) * 100 : 0} className="mt-2 h-2" />
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-xl">
                  <div className="text-2xl font-bold text-purple-600">
                    {stats.messages.sent > 0 ? ((stats.messages.replied / stats.messages.sent) * 100).toFixed(1) : '0'}%
                  </div>
                  <div className="text-sm text-gray-600 mt-1">Reply Rate</div>
                  <Progress value={stats.messages.sent > 0 ? (stats.messages.replied / stats.messages.sent) * 100 : 0} className="mt-2 h-2" />
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-xl">
                  <div className="text-2xl font-bold text-amber-600">
                    0.0%
                  </div>
                  <div className="text-sm text-gray-600 mt-1">Bounce Rate</div>
                  <Progress value={0} className="mt-2 h-2" />
                </div>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-lg">
                    <Zap className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">Mailbox Health</div>
                    <div className="text-sm text-gray-600">{stats.mailboxes.active} active mailboxes</div>
                  </div>
                </div>
                <Badge variant="outline" className="bg-white">
                  {stats.mailboxes.active} / {stats.mailboxes.total}
                </Badge>
              </div>
            </CardContent>
          </Card>
          
          {/* Quick Actions & Urgent Tasks */}
          <div className="space-y-6">
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Bell className="h-5 w-5 text-amber-600" />
                  Urgent Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {urgentActions.length === 0 ? (
                  <div className="text-center py-6">
                    <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">All caught up!</p>
                  </div>
                ) : (
                  urgentActions.slice(0, 3).map((action, index) => (
                    <QuickActionCard
                      key={index}
                      title={action.title}
                      description={action.description}
                      icon={AlertCircle}
                      color="red"
                      urgent={true}
                      onClick={() => window.location.href = action.link}
                    />
                  ))
                )}
              </CardContent>
            </Card>
            
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  Upcoming Tasks
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {upcomingTasks.length === 0 ? (
                  <div className="text-center py-6">
                    <Clock className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">No upcoming tasks</p>
                  </div>
                ) : (
                  upcomingTasks.slice(0, 3).map((task, index) => (
                    <QuickActionCard
                      key={index}
                      title={task.title}
                      description={task.description}
                      icon={Clock}
                      color="blue"
                      onClick={() => window.location.href = task.link}
                    />
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Activity & Replies Section */}
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader className="pb-6">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-semibold flex items-center gap-3">
                <div className="p-2 bg-emerald-50 rounded-lg">
                  <Activity className="h-5 w-5 text-emerald-600" />
                </div>
                Recent Activity
              </CardTitle>
              <Button variant="ghost" size="sm" className="gap-2">
                <Filter className="h-4 w-4" />
                Filter
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="activity" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="activity" className="gap-2">
                  <Activity className="h-4 w-4" />
                  Activity Feed
                </TabsTrigger>
                <TabsTrigger value="replies" className="gap-2">
                  <Reply className="h-4 w-4" />
                  Recent Replies
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="activity" className="mt-0">
                <ScrollArea className="h-[400px] pr-4">
                  {recentActivity.length === 0 ? (
                    <div className="text-center py-12">
                      <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 font-medium">No recent activity</p>
                      <p className="text-sm text-gray-500 mt-1">Activity will appear here as you use the platform</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {recentActivity.map((activity, index) => (
                        <div key={index} className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                          <div className="p-2 bg-white rounded-lg shadow-sm">
                            <Mail className="h-4 w-4 text-gray-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="secondary" className="text-xs">{activity.type}</Badge>
                              <span className="text-xs text-gray-500">{activity.timestamp}</span>
                            </div>
                            <p className="text-sm text-gray-900 font-medium truncate">{activity.message}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="replies" className="mt-0">
                <ScrollArea className="h-[400px] pr-4">
                  {recentReplies.length === 0 ? (
                    <div className="text-center py-12">
                      <Reply className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 font-medium">No replies yet</p>
                      <p className="text-sm text-gray-500 mt-1">Prospect replies will appear here</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {recentReplies.map((reply, index) => (
                        <div key={index} className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer" onClick={() => window.location.href = `/emails/${reply.messageId}`}>
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h4 className="font-semibold text-gray-900">{reply.prospect.name}</h4>
                              <p className="text-sm text-gray-600">{reply.prospect.email}</p>
                            </div>
                            <div className="text-right">
                              <Badge variant="outline" className="text-xs mb-1">{reply.campaign}</Badge>
                              <p className="text-xs text-gray-500">{reply.repliedAt}</p>
                            </div>
                          </div>
                          <p className="text-sm text-gray-700 line-clamp-2">{reply.snippet}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
