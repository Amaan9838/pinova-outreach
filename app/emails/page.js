'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function EmailsPage() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    try {
      const response = await fetch('/api/emails');
      const data = await response.json();
      console.log(data);
      if (data.success) {
        setMessages(data.messages);
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'sent': return 'text-green-600 bg-green-100';
      case 'delivered': return 'text-blue-600 bg-blue-100';
      case 'opened': return 'text-purple-600 bg-purple-100';
      case 'replied': return 'text-indigo-600 bg-indigo-100';
      case 'bounced': return 'text-red-600 bg-red-100';
      case 'failed': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getLatestEvent = (message) => {
    if (!message.events || message.events.length === 0) return message.status;
    
    const eventPriority = { replied: 5, opened: 4, delivered: 3, sent: 2, bounced: 1, failed: 0 };
    const sortedEvents = message.events.sort((a, b) => 
      (eventPriority[b.type] || 0) - (eventPriority[a.type] || 0)
    );
    
    return sortedEvents[0].type;
  };

  const filteredMessages = messages
    .filter(message => {
      if (filter === 'all') return true;
      return getLatestEvent(message) === filter;
    })
    .filter(message => {
      if (!searchTerm) return true;
      const searchLower = searchTerm.toLowerCase();
      return (
        message.subject.toLowerCase().includes(searchLower) ||
        message.prospectId?.firstName?.toLowerCase().includes(searchLower) ||
        message.prospectId?.lastName?.toLowerCase().includes(searchLower) ||
        message.prospectId?.email?.toLowerCase().includes(searchLower) ||
        message.campaignId?.name?.toLowerCase().includes(searchLower)
      );
    });

  if (loading) {
    return (
      <div className="px-4">
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500">Loading emails...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Email Management</h1>
          <p className="text-gray-600">Track and manage all your outreach emails</p>
        </div>
        <div className="flex space-x-3">
          <Link href="/compose" className="btn-secondary">
            ✉️ Compose Email
          </Link>
          <Link href="/test/deliverability" className="btn-secondary">
            🧪 Test Email
          </Link>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="card mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex space-x-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded text-sm font-medium ${
                filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              All ({messages.length})
            </button>
            <button
              onClick={() => setFilter('sent')}
              className={`px-3 py-1 rounded text-sm font-medium ${
                filter === 'sent' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Sent ({messages.filter(m => getLatestEvent(m) === 'sent').length})
            </button>
            <button
              onClick={() => setFilter('opened')}
              className={`px-3 py-1 rounded text-sm font-medium ${
                filter === 'opened' ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Opened ({messages.filter(m => getLatestEvent(m) === 'opened').length})
            </button>
            <button
              onClick={() => setFilter('replied')}
              className={`px-3 py-1 rounded text-sm font-medium ${
                filter === 'replied' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Replied ({messages.filter(m => getLatestEvent(m) === 'replied').length})
            </button>
            <button
              onClick={() => setFilter('bounced')}
              className={`px-3 py-1 rounded text-sm font-medium ${
                filter === 'bounced' ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Bounced ({messages.filter(m => getLatestEvent(m) === 'bounced').length})
            </button>
          </div>
          
          <div className="flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search emails..."
              className="input-field"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Email List */}
      {filteredMessages.length === 0 ? (
        <div className="card text-center py-12">
          <h3 className="text-lg font-medium text-gray-900 mb-2">No emails found</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm ? 'Try adjusting your search terms' : 'Start a campaign to see emails here'}
          </p>
        </div>
      ) : (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Recipient
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Subject
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Campaign
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredMessages.map((message) => {
                  const latestEvent = getLatestEvent(message);
                  return (
                    <tr key={message._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {message.prospectId?.firstName} {message.prospectId?.lastName}
                            </div>
                            <div className="text-sm text-gray-500">
                              {message.prospectId?.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-xs truncate">
                          {message.subject}
                        </div>
                        <div className="text-xs text-gray-500">
                          Step {message.stepNumber}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          <Link 
                            href={`/campaigns/${message.campaignId?._id}`}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            {message.campaignId?.name || 'Unknown'}
                          </Link>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(latestEvent)}`}>
                          {latestEvent}
                        </span>
                        {message.events && message.events.length > 1 && (
                          <div className="text-xs text-gray-500 mt-1">
                            {message.events.length} events
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {message.sentAt ? new Date(message.sentAt).toLocaleDateString() : 'Not sent'}
                        <div className="text-xs">
                          {message.sentAt ? new Date(message.sentAt).toLocaleTimeString() : ''}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium">
                        <Link
                          href={`/emails/${message._id}`}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          View Details
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
