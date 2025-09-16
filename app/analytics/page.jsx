'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Mail, 
  Users, 
  Eye, 
  MousePointer, 
  Reply, 
  Calendar,
  Download,
  Filter,
  RefreshCw,
  Target,
  Zap,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Globe,
  Smartphone,
  Monitor,
  PieChart,
  LineChart
} from 'lucide-react';

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30d');
  const [campaignFilter, setCampaignFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  
  // Mock analytics data - replace with real API calls
  const [analyticsData, setAnalyticsData] = useState({
    overview: {
      totalCampaigns: 24,
      totalProspects: 15420,
      emailsSent: 45680,
      totalReplies: 1234,
      openRate: 24.5,
      clickRate: 3.2,
      replyRate: 2.7,
      bounceRate: 1.8
    },
    trends: {
      emailsSent: { value: 45680, change: 12.5, trend: 'up' },
      opens: { value: 11192, change: -2.1, trend: 'down' },
      clicks: { value: 1462, change: 8.7, trend: 'up' },
      replies: { value: 1234, change: 15.3, trend: 'up' }
    },
    campaignPerformance: [
      { name: 'Q4 Outreach', sent: 5420, opened: 1354, clicked: 187, replied: 89, openRate: 25.0, replyRate: 1.6 },
      { name: 'Product Launch', sent: 3200, opened: 896, clicked: 124, replied: 67, openRate: 28.0, replyRate: 2.1 },
      { name: 'Follow-up Series', sent: 2800, opened: 644, clicked: 89, replied: 45, openRate: 23.0, replyRate: 1.6 },
      { name: 'Cold Outreach', sent: 8900, opened: 1958, clicked: 267, replied: 134, openRate: 22.0, replyRate: 1.5 },
      { name: 'Webinar Invite', sent: 1560, opened: 468, clicked: 78, replied: 23, openRate: 30.0, replyRate: 1.5 }
    ],
    timeSeriesData: {
      labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
      emailsSent: [8500, 12300, 9800, 15080],
      opens: [2125, 3198, 2254, 3615],
      clicks: [255, 384, 294, 529],
      replies: [170, 246, 196, 322]
    },
    deviceStats: {
      desktop: 45.2,
      mobile: 38.7,
      tablet: 16.1
    },
    topPerformers: [
      { subject: 'Quick question about [Company]', openRate: 42.3, replyRate: 8.7, sent: 450 },
      { subject: 'Following up on our conversation', openRate: 38.9, replyRate: 6.2, sent: 320 },
      { subject: '[First Name], interested in reducing costs?', openRate: 35.1, replyRate: 5.8, sent: 680 },
      { subject: 'Saw your recent LinkedIn post', openRate: 33.7, replyRate: 7.1, sent: 290 },
      { subject: 'Quick intro - [Your Company] + [Their Company]', openRate: 31.2, replyRate: 4.9, sent: 520 }
    ]
  });

  useEffect(() => {
    // Simulate loading
    setTimeout(() => setLoading(false), 1000);
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    // Simulate API call
    setTimeout(() => setRefreshing(false), 2000);
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const getTrendIcon = (trend) => {
    return trend === 'up' ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />;
  };

  const getTrendColor = (trend) => {
    return trend === 'up' ? 'text-emerald-600' : 'text-red-600';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <div className="text-gray-600 font-medium">Loading analytics...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Analytics Dashboard</h1>
              <p className="text-gray-600 text-lg">Comprehensive insights into your outreach performance</p>
            </div>
            
            <div className="flex flex-wrap gap-3">
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-40">
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                  <SelectItem value="1y">Last year</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={campaignFilter} onValueChange={setCampaignFilter}>
                <SelectTrigger className="w-48">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Campaigns</SelectItem>
                  <SelectItem value="active">Active Only</SelectItem>
                  <SelectItem value="completed">Completed Only</SelectItem>
                </SelectContent>
              </Select>
              
              <Button 
                variant="outline" 
                onClick={handleRefresh}
                disabled={refreshing}
                className="gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              
              <Button className="gap-2">
                <Download className="h-4 w-4" />
                Export Report
              </Button>
            </div>
          </div>
        </div>

        {/* Key Metrics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-600 text-sm font-medium">Emails Sent</p>
                  <p className="text-3xl font-bold text-blue-900">{formatNumber(analyticsData.trends.emailsSent.value)}</p>
                  <div className={`flex items-center gap-1 mt-2 ${getTrendColor(analyticsData.trends.emailsSent.trend)}`}>
                    {getTrendIcon(analyticsData.trends.emailsSent.trend)}
                    <span className="text-sm font-medium">{analyticsData.trends.emailsSent.change}%</span>
                  </div>
                </div>
                <div className="p-3 bg-blue-200 rounded-xl">
                  <Mail className="h-8 w-8 text-blue-700" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-50 to-emerald-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-emerald-600 text-sm font-medium">Opens</p>
                  <p className="text-3xl font-bold text-emerald-900">{formatNumber(analyticsData.trends.opens.value)}</p>
                  <div className={`flex items-center gap-1 mt-2 ${getTrendColor(analyticsData.trends.opens.trend)}`}>
                    {getTrendIcon(analyticsData.trends.opens.trend)}
                    <span className="text-sm font-medium">{Math.abs(analyticsData.trends.opens.change)}%</span>
                  </div>
                </div>
                <div className="p-3 bg-emerald-200 rounded-xl">
                  <Eye className="h-8 w-8 text-emerald-700" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-600 text-sm font-medium">Clicks</p>
                  <p className="text-3xl font-bold text-purple-900">{formatNumber(analyticsData.trends.clicks.value)}</p>
                  <div className={`flex items-center gap-1 mt-2 ${getTrendColor(analyticsData.trends.clicks.trend)}`}>
                    {getTrendIcon(analyticsData.trends.clicks.trend)}
                    <span className="text-sm font-medium">{analyticsData.trends.clicks.change}%</span>
                  </div>
                </div>
                <div className="p-3 bg-purple-200 rounded-xl">
                  <MousePointer className="h-8 w-8 text-purple-700" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-amber-50 to-amber-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-amber-600 text-sm font-medium">Replies</p>
                  <p className="text-3xl font-bold text-amber-900">{formatNumber(analyticsData.trends.replies.value)}</p>
                  <div className={`flex items-center gap-1 mt-2 ${getTrendColor(analyticsData.trends.replies.trend)}`}>
                    {getTrendIcon(analyticsData.trends.replies.trend)}
                    <span className="text-sm font-medium">{analyticsData.trends.replies.change}%</span>
                  </div>
                </div>
                <div className="p-3 bg-amber-200 rounded-xl">
                  <Reply className="h-8 w-8 text-amber-700" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Performance Rates */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-center mb-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Eye className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">{analyticsData.overview.openRate}%</p>
              <p className="text-sm text-gray-600">Open Rate</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-center mb-3">
                <div className="p-2 bg-purple-50 rounded-lg">
                  <MousePointer className="h-6 w-6 text-purple-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">{analyticsData.overview.clickRate}%</p>
              <p className="text-sm text-gray-600">Click Rate</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-center mb-3">
                <div className="p-2 bg-emerald-50 rounded-lg">
                  <Reply className="h-6 w-6 text-emerald-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">{analyticsData.overview.replyRate}%</p>
              <p className="text-sm text-gray-600">Reply Rate</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-center mb-3">
                <div className="p-2 bg-red-50 rounded-lg">
                  <XCircle className="h-6 w-6 text-red-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">{analyticsData.overview.bounceRate}%</p>
              <p className="text-sm text-gray-600">Bounce Rate</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Analytics Tabs */}
        <Tabs defaultValue="performance" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:grid-cols-4">
            <TabsTrigger value="performance" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Performance
            </TabsTrigger>
            <TabsTrigger value="campaigns" className="gap-2">
              <Target className="h-4 w-4" />
              Campaigns
            </TabsTrigger>
            <TabsTrigger value="trends" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              Trends
            </TabsTrigger>
            <TabsTrigger value="insights" className="gap-2">
              <Zap className="h-4 w-4" />
              Insights
            </TabsTrigger>
          </TabsList>

          <TabsContent value="performance" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Time Series Chart Placeholder */}
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <LineChart className="h-5 w-5" />
                    Email Performance Over Time
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 font-medium">Interactive Chart</p>
                      <p className="text-sm text-gray-500">Time series data visualization</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Device Breakdown */}
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5" />
                    Device Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Monitor className="h-5 w-5 text-blue-600" />
                        <span className="font-medium">Desktop</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div className="bg-blue-600 h-2 rounded-full" style={{width: `${analyticsData.deviceStats.desktop}%`}}></div>
                        </div>
                        <span className="text-sm font-medium w-12">{analyticsData.deviceStats.desktop}%</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Smartphone className="h-5 w-5 text-emerald-600" />
                        <span className="font-medium">Mobile</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div className="bg-emerald-600 h-2 rounded-full" style={{width: `${analyticsData.deviceStats.mobile}%`}}></div>
                        </div>
                        <span className="text-sm font-medium w-12">{analyticsData.deviceStats.mobile}%</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Globe className="h-5 w-5 text-purple-600" />
                        <span className="font-medium">Tablet</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div className="bg-purple-600 h-2 rounded-full" style={{width: `${analyticsData.deviceStats.tablet}%`}}></div>
                        </div>
                        <span className="text-sm font-medium w-12">{analyticsData.deviceStats.tablet}%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="campaigns" className="space-y-6">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Campaign Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Campaign</th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-700">Sent</th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-700">Opened</th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-700">Clicked</th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-700">Replied</th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-700">Open Rate</th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-700">Reply Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analyticsData.campaignPerformance.map((campaign, index) => (
                        <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-4 px-4">
                            <div className="font-medium text-gray-900">{campaign.name}</div>
                          </td>
                          <td className="py-4 px-4 text-right text-gray-700">{campaign.sent.toLocaleString()}</td>
                          <td className="py-4 px-4 text-right text-gray-700">{campaign.opened.toLocaleString()}</td>
                          <td className="py-4 px-4 text-right text-gray-700">{campaign.clicked.toLocaleString()}</td>
                          <td className="py-4 px-4 text-right text-gray-700">{campaign.replied.toLocaleString()}</td>
                          <td className="py-4 px-4 text-right">
                            <Badge variant={campaign.openRate >= 25 ? 'default' : 'secondary'}>
                              {campaign.openRate}%
                            </Badge>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <Badge variant={campaign.replyRate >= 2 ? 'default' : 'secondary'}>
                              {campaign.replyRate}%
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trends" className="space-y-6">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Performance Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-96 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <TrendingUp className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 font-medium text-lg">Advanced Trend Analysis</p>
                    <p className="text-sm text-gray-500">Interactive charts showing performance over time</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="insights" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Top Performing Subject Lines
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analyticsData.topPerformers.map((subject, index) => (
                      <div key={index} className="p-4 bg-gray-50 rounded-lg">
                        <div className="font-medium text-gray-900 mb-2">{subject.subject}</div>
                        <div className="flex justify-between text-sm text-gray-600">
                          <span>Open: {subject.openRate}%</span>
                          <span>Reply: {subject.replyRate}%</span>
                          <span>Sent: {subject.sent}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                        <div>
                          <p className="font-medium text-blue-900">Optimize Send Times</p>
                          <p className="text-sm text-blue-700">Your emails perform 23% better when sent between 9-11 AM</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                      <div className="flex items-start gap-3">
                        <TrendingUp className="h-5 w-5 text-emerald-600 mt-0.5" />
                        <div>
                          <p className="font-medium text-emerald-900">Subject Line Length</p>
                          <p className="text-sm text-emerald-700">Keep subject lines under 50 characters for better open rates</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                      <div className="flex items-start gap-3">
                        <Clock className="h-5 w-5 text-amber-600 mt-0.5" />
                        <div>
                          <p className="font-medium text-amber-900">Follow-up Timing</p>
                          <p className="text-sm text-amber-700">Wait 3-4 days between follow-ups for optimal response rates</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
