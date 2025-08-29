'use client';

import { useState, useEffect } from 'react';

export default function Dashboard() {
  const [stats, setStats] = useState({
    campaigns: { total: 0, active: 0 },
    prospects: { total: 0, active: 0 },
    messages: { sent: 0, delivered: 0, opened: 0, replied: 0 },
    mailboxes: { total: 0, active: 0 }
  });

  const [recentActivity, setRecentActivity] = useState([]);
  const [recentReplies, setRecentReplies] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/dashboard');
      const data = await response.json();
      setStats(data.stats);
      setRecentActivity(data.recentActivity || []);
      setRecentReplies(data.recentReplies || []);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    }
  };

  const StatCard = ({ title, value, subtitle, color = 'blue' }) => (
    <div className="card">
      <div className="flex items-center">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className={`text-2xl font-bold text-${color}-600`}>{value}</p>
          {subtitle && (
            <p className="text-sm text-gray-500">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Overview of your outreach performance</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Campaigns"
          value={stats.campaigns.total}
          subtitle={`${stats.campaigns.active} active`}
          color="blue"
        />
        <StatCard
          title="Total Prospects"
          value={stats.prospects.total}
          subtitle={`${stats.prospects.active} active`}
          color="green"
        />
        <StatCard
          title="Messages Sent"
          value={stats.messages.sent}
          subtitle={`${stats.messages.delivered} delivered`}
          color="purple"
        />
        <StatCard
          title="Open Rate"
          value={stats.messages.sent > 0 ? `${((stats.messages.opened / stats.messages.sent) * 100).toFixed(1)}%` : '0%'}
          subtitle={`${stats.messages.opened} opens`}
          color="orange"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Overview */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Performance Overview</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Delivery Rate</span>
              <span className="font-semibold text-black">
                {stats.messages.sent > 0 ? `${((stats.messages.delivered / stats.messages.sent) * 100).toFixed(1)}%` : '0%'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Open Rate</span>
              <span className="font-semibold text-black">
                {stats.messages.sent > 0 ? `${((stats.messages.opened / stats.messages.sent) * 100).toFixed(1)}%` : '0%'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Reply Rate</span>
              <span className="font-semibold text-black">
                {stats.messages.sent > 0 ? `${((stats.messages.replied / stats.messages.sent) * 100).toFixed(1)}%` : '0%'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Active Mailboxes</span>
              <span className="font-semibold text-black">{stats.mailboxes.active} / {stats.mailboxes.total}</span>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
          <div className="space-y-3">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <div className={`w-2 h-2 rounded-full ${
                    activity.type === 'sent' ? 'bg-blue-500' :
                    activity.type === 'opened' ? 'bg-green-500' :
                    activity.type === 'replied' ? 'bg-purple-500' :
                    'bg-gray-400'
                  }`}></div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">{activity.message}</p>
                    <p className="text-xs text-gray-500">{activity.timestamp}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">No recent activity</p>
            )}
          </div>
        </div>

        {/* Latest Replies */}
        <div className="card lg:col-span-2">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Latest Replies</h2>
          {recentReplies.length === 0 ? (
            <p className="text-sm text-gray-500">No replies yet</p>
          ) : (
            <div className="divide-y">
              {recentReplies.map((r, idx) => (
                <div key={idx} className="py-3 flex justify-between items-start">
                  <div className="flex-1 pr-4">
                    <p className="text-sm font-medium text-gray-900">{r.prospect.name} <span className="text-gray-500">({r.prospect.email})</span></p>
                    <p className="text-xs text-gray-600">Campaign: {r.campaign}</p>
                    <p className="text-sm text-gray-800 mt-1 line-clamp-2">{r.snippet}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">{r.repliedAt}</p>
                    <a href={`/emails/${r.messageId}`} className="text-blue-600 hover:text-blue-800 text-xs underline inline-block mt-1">View</a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
