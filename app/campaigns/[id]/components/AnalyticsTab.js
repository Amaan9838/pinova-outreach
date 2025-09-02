'use client';

import { ChartContainer } from '@/components/ui/chart';
import { AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

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
  return (
    <div>
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="card">
          <p className="text-sm text-gray-600">Prospects</p>
          <p className="text-2xl font-bold text-blue-600">{campaign.prospects?.length || 0}</p>
          <p className="text-xs text-gray-500">
            {campaign.prospects?.filter(p => p.status === 'active').length || 0} active
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600">Messages Sent</p>
          <p className="text-2xl font-bold text-green-600">{sentCount}</p>
          <p className="text-xs text-gray-500">
            {deliveredCount} delivered
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600">Open Rate</p>
          <p className="text-2xl font-bold text-purple-600">
            {sentCount > 0 ? `${((openedCount / sentCount) * 100).toFixed(1)}%` : '0%'}
          </p>
          <p className="text-xs text-gray-500">
            {openedCount} opens
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600">Reply Rate</p>
          <p className="text-2xl font-bold text-indigo-600">
            {sentCount > 0 ? `${((repliedCount / sentCount) * 100).toFixed(1)}%` : '0%'}
          </p>
          <p className="text-xs text-gray-500">
            {repliedCount} replies
          </p>
        </div>
      </div>

      {/* Charts */}
      <ChartContainer className="mb-6">
        <div className="h-64 w-full">
          <ResponsiveContainer>
            <AreaChart data={computeDailySeries(messages)}>
              <defs>
                <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorOpened" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#7c3aed" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorReplied" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Area type="monotone" dataKey="sent" stroke="#2563eb" fillOpacity={1} fill="url(#colorSent)" name="Sent" />
              <Area type="monotone" dataKey="opened" stroke="#7c3aed" fillOpacity={1} fill="url(#colorOpened)" name="Opened" />
              <Area type="monotone" dataKey="replied" stroke="#0ea5e9" fillOpacity={1} fill="url(#colorReplied)" name="Replied" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </ChartContainer>

      {/* Recent Messages */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Messages</h2>
        {messages.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No messages sent yet</p>
        ) : (
          <div className="space-y-3">
            {messages.map((message) => (
              <div key={message._id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-medium text-gray-900">{message.subject}</h4>
                    <p className="text-sm text-gray-600">
                      To: {message.prospectId?.firstName} {message.prospectId?.lastName} ({message.prospectId?.email})
                    </p>
                    <p className="text-xs text-gray-500">
                      Step {message.stepNumber} • {message.createdAt ? new Date(message.createdAt).toLocaleString() : ''}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getMessageStatusColor(message.status)}`}>
                    {message.status}
                  </span>
                </div>
                {message.events && message.events.length > 0 && (
                  <div className="flex space-x-4 text-xs text-gray-500">
                    {message.events.map((event, idx) => (
                      <span key={idx}>
                        {event.type}: {new Date(event.timestamp).toLocaleString()}
                      </span>
                    ))}
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
