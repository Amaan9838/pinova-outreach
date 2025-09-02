'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function Page() {
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
      if (data?.success) {
        setStats(data.stats);
        setRecentActivity(data.recentActivity || []);
        setRecentReplies(data.recentReplies || []);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    }
  };

  const StatCard = ({ title, value, subtitle, color = 'blue', percent }) => (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-gray-600">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className={`text-2xl font-bold text-${color}-600`}>{value}</div>
          {subtitle && <Badge variant="secondary">{subtitle}</Badge>}
        </div>
        {typeof percent === 'number' && (
          <Progress value={percent} className="mt-3" />
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="flex flex-1 flex-col gap-4 p-0">
      <div className="mb-2 px-1">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Overview of your outreach performance</p>
      </div>

      <div className="grid auto-rows-min gap-4 md:grid-cols-2 lg:grid-cols-4">
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
          percent={stats.messages.sent > 0 ? (stats.messages.delivered / stats.messages.sent) * 100 : undefined}
        />
        <StatCard
          title="Open Rate"
          value={stats.messages.sent > 0 ? `${((stats.messages.opened / stats.messages.sent) * 100).toFixed(1)}%` : '0%'}
          subtitle={`${stats.messages.opened} opens`}
          color="orange"
          percent={stats.messages.sent > 0 ? (stats.messages.opened / stats.messages.sent) * 100 : undefined}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Performance Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Delivery Rate</span>
                <span className="font-semibold text-black">
                  {stats.messages.sent > 0 ? `${((stats.messages.delivered / stats.messages.sent) * 100).toFixed(1)}%` : '0%'}
                </span>
              </div>
              <Progress value={stats.messages.sent > 0 ? (stats.messages.delivered / stats.messages.sent) * 100 : 0} className="mt-2" />
            </div>
            <div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Open Rate</span>
                <span className="font-semibold text-black">
                  {stats.messages.sent > 0 ? `${((stats.messages.opened / stats.messages.sent) * 100).toFixed(1)}%` : '0%'}
                </span>
              </div>
              <Progress value={stats.messages.sent > 0 ? (stats.messages.opened / stats.messages.sent) * 100 : 0} className="mt-2" />
            </div>
            <div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Reply Rate</span>
                <span className="font-semibold text-black">
                  {stats.messages.sent > 0 ? `${((stats.messages.replied / stats.messages.sent) * 100).toFixed(1)}%` : '0%'}
                </span>
              </div>
              <Progress value={stats.messages.sent > 0 ? (stats.messages.replied / stats.messages.sent) * 100 : 0} className="mt-2" />
            </div>
            <div className="flex justify-between items-center text-sm text-gray-600">
              <span>Active Mailboxes</span>
              <Badge variant="outline">{stats.mailboxes.active} / {stats.mailboxes.total}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Activity & Replies</CardTitle>
        </CardHeader>
        <CardContent>
        <ScrollArea className="h-[360px]">
        <div className="p-1">
        <div className="flex space-x-2 border-b pb-2 mb-3">
        {/* Tabs */}
        <button id="tab-activity" className="px-3 py-1 rounded bg-gray-100 text-sm" onClick={(e) => {
        document.getElementById('panel-activity').style.display = 'block';
          document.getElementById('panel-replies').style.display = 'none';
          e.currentTarget.classList.add('bg-gray-200');
        document.getElementById('tab-replies').classList.remove('bg-gray-200');
        }}>Activity</button>
        <button id="tab-replies" className="px-3 py-1 rounded text-sm" onClick={(e) => {
            document.getElementById('panel-activity').style.display = 'none';
              document.getElementById('panel-replies').style.display = 'block';
                e.currentTarget.classList.add('bg-gray-200');
              document.getElementById('tab-activity').classList.remove('bg-gray-200');
              }}>Replies</button>
              </div>

                       {/* Activity Panel */}
                <div id="panel-activity" style={{ display: 'block' }}>
                {recentActivity.length === 0 ? (
                  <p className="text-sm text-gray-500">No recent activity</p>
              ) : (
                  <Table>
                  <TableHeader>
                  <TableRow>
                  <TableHead>Type</TableHead>
                <TableHead>Message</TableHead>
              <TableHead className="text-right">Time</TableHead>
            </TableRow>
          </TableHeader>
            <TableBody>
              {recentActivity.map((a, i) => (
              <TableRow key={i}>
                <TableCell><Badge variant="secondary">{a.type}</Badge></TableCell>
                  <TableCell className="max-w-[420px] truncate">{a.message}</TableCell>
                    <TableCell className="text-right text-xs text-gray-500">{a.timestamp}</TableCell>
                    </TableRow>
                    ))}
                    </TableBody>
                    </Table>
                  )}
                </div>

                {/* Replies Panel */}
                <div id="panel-replies" style={{ display: 'none' }}>
                  {recentReplies.length === 0 ? (
                    <p className="text-sm text-gray-500">No replies yet</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Prospect</TableHead>
                          <TableHead>Campaign</TableHead>
                          <TableHead>Snippet</TableHead>
                          <TableHead className="text-right">Time</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {recentReplies.map((r, i) => (
                          <TableRow key={i}>
                            <TableCell>
                              <div className="text-sm font-medium text-gray-900">{r.prospect.name}</div>
                              <div className="text-xs text-gray-500">{r.prospect.email}</div>
                            </TableCell>
                            <TableCell className="text-xs">{r.campaign}</TableCell>
                            <TableCell className="max-w-[420px] truncate text-xs">{r.snippet}</TableCell>
                            <TableCell className="text-right text-xs text-gray-500">
                              <a href={`/emails/${r.messageId}`} className="text-blue-600 hover:text-blue-800 underline">{r.repliedAt}</a>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
