'use client';

import { ChartContainer } from '@/components/ui/chart';
import { AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Users, Send, Eye, Reply } from 'lucide-react';

export default function AnalyticsTab({
  campaign,
  messages,
  sentCount,
  openedCount,
  deliveredCount,
  repliedCount,
  computeDailySeries,
  getMessageStatusColor,
}) {
  // Calculate rates for better insights
  const deliveryRate = sentCount > 0 ? ((deliveredCount / sentCount) * 100) : 0;
  const openRate = sentCount > 0 ? ((openedCount / sentCount) * 100) : 0;
  const replyRate = sentCount > 0 ? ((repliedCount / sentCount) * 100) : 0;

  // Get trend indicators (you can enhance this with actual trend calculation)
  const getTrendIcon = (rate) => {
    return rate > 0 ? <TrendingUp className="w-3 h-3 text-green-500" /> : null;
  };

  return (
    <div className="space-y-6">
      {/* Enhanced Stats Grid with Icons and Better Colors */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Prospects Card - Blue (Trust, Professional) */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-sm font-medium text-gray-600">Prospects</p>
            </div>
            {getTrendIcon(campaign.prospects?.length)}
          </div>
          <p className="text-3xl font-bold text-blue-600 mb-1">{campaign.prospects?.length || 0}</p>
          <p className="text-sm text-gray-500">
            <span className="text-green-600 font-medium">
              {campaign.prospects?.filter(p => p.status === 'active').length || 0}
            </span> active campaigns
          </p>
        </div>

        {/* Messages Sent Card - Green (Success, Action) */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-green-50 rounded-lg">
                <Send className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-sm font-medium text-gray-600">Messages Sent</p>
            </div>
            {getTrendIcon(sentCount)}
          </div>
          <p className="text-3xl font-bold text-green-600 mb-1">{sentCount}</p>
          <div className="flex items-center space-x-2 text-sm">
            <span className="text-gray-500">
              <span className="text-green-600 font-medium">{deliveredCount}</span> delivered
            </span>
            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
              {deliveryRate.toFixed(1)}% delivery
            </span>
          </div>
        </div>

        {/* Open Rate Card - Orange (Engagement, Attention) */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-orange-50 rounded-lg">
                <Eye className="w-5 h-5 text-orange-600" />
              </div>
              <p className="text-sm font-medium text-gray-600">Open Rate</p>
            </div>
            {getTrendIcon(openRate)}
          </div>
          <p className="text-3xl font-bold text-orange-600 mb-1">
            {openRate.toFixed(1)}%
          </p>
          <p className="text-sm text-gray-500">
            <span className="text-orange-600 font-medium">{openedCount}</span> opens
          </p>
        </div>

        {/* Reply Rate Card - Purple (Conversion, Success) */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-purple-50 rounded-lg">
                <Reply className="w-5 h-5 text-purple-600" />
              </div>
              <p className="text-sm font-medium text-gray-600">Reply Rate</p>
            </div>
            {getTrendIcon(replyRate)}
          </div>
          <p className="text-3xl font-bold text-purple-600 mb-1">
            {replyRate.toFixed(1)}%
          </p>
          <p className="text-sm text-gray-500">
            <span className="text-purple-600 font-medium">{repliedCount}</span> replies
          </p>
        </div>
      </div>

      {/* Enhanced Chart with Better Color Scheme */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Campaign Performance</h3>
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-gray-600">Sent</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
              <span className="text-gray-600">Opened</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
              <span className="text-gray-600">Replied</span>
            </div>
          </div>
        </div>
        
        <ChartContainer className="h-80 w-full">
          <ResponsiveContainer>
            <AreaChart data={computeDailySeries(messages)}>
              <defs>
                {/* Sent - Green (Action, Success) */}
                <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0.05}/>
                </linearGradient>
                {/* Opened - Orange (Engagement, Attention) */}
                <linearGradient id="colorOpened" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0.05}/>
                </linearGradient>
                {/* Replied - Purple (Conversion, Achievement) */}
                <linearGradient id="colorReplied" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#a855f7" stopOpacity={0.05}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis 
                dataKey="label" 
                tick={{ fontSize: 12, fill: '#64748b' }} 
                axisLine={{ stroke: '#e2e8f0' }}
              />
              <YAxis 
                allowDecimals={false} 
                tick={{ fontSize: 12, fill: '#64748b' }}
                axisLine={{ stroke: '#e2e8f0' }}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Area 
                type="monotone" 
                dataKey="sent" 
                stroke="#22c55e" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorSent)" 
                name="Sent" 
              />
              <Area 
                type="monotone" 
                dataKey="opened" 
                stroke="#f97316" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorOpened)" 
                name="Opened" 
              />
              <Area 
                type="monotone" 
                dataKey="replied" 
                stroke="#a855f7" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorReplied)" 
                name="Replied" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>

      {/* Enhanced Recent Messages */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Recent Messages</h2>
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <Send className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No messages sent yet</p>
            <p className="text-gray-400 text-sm">Your campaign messages will appear here once sent</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div key={message._id} className="border border-gray-100 rounded-lg p-5 hover:shadow-sm transition-shadow">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 mb-1">{message.subject}</h4>
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <span>To:</span>
                      <span className="font-medium">
                        {message.prospectId?.firstName} {message.prospectId?.lastName}
                      </span>
                      <span className="text-gray-400">({message.prospectId?.email})</span>
                    </div>
                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                      <span className="bg-gray-100 px-2 py-1 rounded-full">
                        Step {message.stepNumber}
                      </span>
                      <span>{message.createdAt ? new Date(message.createdAt).toLocaleString() : ''}</span>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getMessageStatusColor(message.status)}`}>
                    {message.status}
                  </span>
                </div>
                {message.events && message.events.length > 0 && (
                  <div className="border-t border-gray-50 pt-3 mt-3">
                    <div className="flex flex-wrap gap-3">
                      {message.events.map((event, idx) => (
                        <div key={idx} className="flex items-center space-x-2 text-xs">
                          <div className={`w-2 h-2 rounded-full ${
                            event.type === 'opened' ? 'bg-orange-400' :
                            event.type === 'clicked' ? 'bg-blue-400' :
                            event.type === 'replied' ? 'bg-purple-400' :
                            'bg-gray-400'
                          }`}></div>
                          <span className="text-gray-600 capitalize">{event.type}</span>
                          <span className="text-gray-400">
                            {new Date(event.timestamp).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}