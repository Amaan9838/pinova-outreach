'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function ConversationsPage() {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, replied, opened, bounced

  useEffect(() => {
    fetchConversations();
  }, [filter]);

  const fetchConversations = async () => {
    try {
      const response = await fetch(`/api/conversations?filter=${filter}`);
      const data = await response.json();
      if (data.success) {
        setConversations(data.conversations);
      }
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'replied': return 'text-green-600 bg-green-100';
      case 'opened': return 'text-blue-600 bg-blue-100';
      case 'bounced': return 'text-red-600 bg-red-100';
      case 'sent': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getLastActivityIcon = (lastActivity) => {
    switch (lastActivity) {
      case 'replied': return '💬';
      case 'opened': return '👁️';
      case 'bounced': return '❌';
      case 'clicked': return '🖱️';
      default: return '📧';
    }
  };

  if (loading) {
    return (
      <div className="px-4">
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500">Loading conversations...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Conversations</h1>
          <p className="text-gray-600">Track prospect interactions and replies</p>
        </div>
        
        {/* Filter Buttons */}
        <div className="flex space-x-2">
          {['all', 'replied', 'opened', 'bounced'].map((filterType) => (
            <button
              key={filterType}
              onClick={() => setFilter(filterType)}
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                filter === filterType 
                  ? 'bg-blue-100 text-blue-800' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card text-center">
          <div className="text-2xl font-bold text-blue-600">
            {conversations.filter(c => c.lastActivity === 'replied').length}
          </div>
          <div className="text-sm text-gray-600">Replies</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-green-600">
            {conversations.filter(c => c.lastActivity === 'opened').length}
          </div>
          <div className="text-sm text-gray-600">Opens</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-purple-600">
            {conversations.filter(c => c.lastActivity === 'clicked').length}
          </div>
          <div className="text-sm text-gray-600">Clicks</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-red-600">
            {conversations.filter(c => c.lastActivity === 'bounced').length}
          </div>
          <div className="text-sm text-gray-600">Bounces</div>
        </div>
      </div>

      {/* Conversations List */}
      {conversations.length === 0 ? (
        <div className="card text-center py-12">
          <h3 className="text-lg font-medium text-gray-900 mb-2">No conversations found</h3>
          <p className="text-gray-600 mb-4">
            {filter === 'all' 
              ? 'Start campaigns to see prospect interactions here' 
              : `No ${filter} conversations yet`
            }
          </p>
          <Link href="/campaigns" className="btn-primary">
            View Campaigns
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {conversations.map((conversation) => (
            <div key={conversation._id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="text-2xl">{getLastActivityIcon(conversation.lastActivity)}</div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {conversation.prospect.firstName} {conversation.prospect.lastName}
                      </h3>
                      <p className="text-sm text-gray-600">{conversation.prospect.email}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-700 mb-3">
                    <div>
                      <p><strong>Company:</strong> {conversation.prospect.company || 'N/A'}</p>
                      <p><strong>Location:</strong> {conversation.prospect.city || 'N/A'}</p>
                    </div>
                    <div>
                      <p><strong>Campaign:</strong> 
                        <Link href={`/campaigns/${conversation.campaign._id}`} className="text-blue-600 hover:text-blue-800 ml-1">
                          {conversation.campaign.name}
                        </Link>
                      </p>
                      <p><strong>Messages:</strong> {conversation.messageCount}</p>
                    </div>
                    <div>
                      <p><strong>Last Activity:</strong> {new Date(conversation.lastActivityAt).toLocaleDateString()}</p>
                      <p><strong>Current Step:</strong> {conversation.currentStep}</p>
                    </div>
                  </div>

                  {/* Recent Messages Summary */}
                  {conversation.recentMessage && (
                    <div className="bg-gray-50 rounded p-3 mb-3">
                      <p className="text-sm font-medium text-gray-900 mb-1">Latest: {conversation.recentMessage.subject}</p>
                      <p className="text-xs text-gray-600 truncate">
                        {conversation.recentMessage.content.replace(/<[^>]*>/g, '').substring(0, 150)}...
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-end space-y-2 ml-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(conversation.lastActivity)}`}>
                    {conversation.lastActivity}
                  </span>
                  
                  <div className="flex space-x-2">
                    <Link
                      href={`/conversations/${conversation._id}`}
                      className="btn-secondary text-xs px-3 py-1"
                    >
                      View Thread
                    </Link>
                    <Link
                      href={`/campaigns/${conversation.campaign._id}`}
                      className="btn-primary text-xs px-3 py-1"
                    >
                      Campaign
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
