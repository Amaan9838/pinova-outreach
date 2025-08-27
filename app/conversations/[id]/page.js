'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ConversationDetailsPage({ params }) {
  const router = useRouter();
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConversationDetails();
  }, [params.id]);

  const fetchConversationDetails = async () => {
    try {
      const response = await fetch(`/api/conversations/${params.id}`);
      const data = await response.json();
      if (data.success) {
        setConversation(data.conversation);
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error('Failed to fetch conversation details:', error);
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

  const getEventIcon = (type) => {
    switch (type) {
      case 'sent': return '📤';
      case 'delivered': return '✅';
      case 'opened': return '👁️';
      case 'clicked': return '🖱️';
      case 'replied': return '💬';
      case 'bounced': return '❌';
      default: return '📧';
    }
  };

  if (loading) {
    return (
      <div className="px-4">
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500">Loading conversation...</div>
        </div>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="px-4">
        <div className="text-center py-12">
          <p className="text-gray-500">Conversation not found</p>
          <button onClick={() => router.push('/conversations')} className="btn-primary mt-4">
            Back to Conversations
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4">
      {/* Header */}
      <div className="flex items-center space-x-3 mb-6">
        <button
          onClick={() => router.push('/conversations')}
          className="text-gray-500 hover:text-gray-700"
        >
          ← Back to Conversations
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Conversation Thread</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Messages Thread */}
        <div className="lg:col-span-2 space-y-6">
          {/* Prospect Header */}
          <div className="card">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-lg font-bold text-blue-600">
                  {conversation.prospect.firstName?.charAt(0)}{conversation.prospect.lastName?.charAt(0)}
                </span>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {conversation.prospect.firstName} {conversation.prospect.lastName}
                </h2>
                <p className="text-sm text-gray-600">{conversation.prospect.email}</p>
                {conversation.prospect.company && (
                  <p className="text-sm text-gray-500">{conversation.prospect.company}</p>
                )}
              </div>
            </div>
          </div>

          {/* Messages Timeline */}
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div key={message._id} className="card">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{message.subject}</h3>
                    <p className="text-sm text-gray-600">
                      Step {message.stepNumber} • {new Date(message.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(message.status)}`}>
                    {message.status}
                  </span>
                </div>

                <div className="bg-gray-50 rounded p-4 mb-4 text-gray-800">
                  <div className="whitespace-pre-wrap text-sm">
                    {message.content.replace(/<[^>]*>/g, '')}
                  </div>
                </div>

                {/* Message Events */}
                {message.events && message.events.length > 0 && (
                  <div className="border-t pt-3">
                    <p className="text-sm font-medium text-gray-700 mb-2">Activity:</p>
                    <div className="flex flex-wrap gap-2">
                      {message.events.map((event, eventIndex) => (
                        <div key={eventIndex} className="flex items-center space-x-1 text-xs">
                          <span>{getEventIcon(event.type)}</span>
                          <span className="text-gray-600">
                            {event.type} • {new Date(event.timestamp).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Conversation Stats */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Conversation Stats</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Messages Sent</span>
                <span className="font-semibold">{messages.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Opens</span>
                <span className="font-semibold">
                  {messages.reduce((acc, msg) => acc + (msg.events?.filter(e => e.type === 'opened').length || 0), 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Clicks</span>
                <span className="font-semibold">
                  {messages.reduce((acc, msg) => acc + (msg.events?.filter(e => e.type === 'clicked').length || 0), 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Replies</span>
                <span className="font-semibold">
                  {messages.reduce((acc, msg) => acc + (msg.events?.filter(e => e.type === 'replied').length || 0), 0)}
                </span>
              </div>
            </div>
          </div>

          {/* Campaign Info */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Campaign</h3>
            <div className="space-y-2 text-sm">
              <p><strong>Name:</strong> {conversation.campaign.name}</p>
              <p><strong>Status:</strong> 
                <span className={`ml-1 px-2 py-1 rounded text-xs ${getStatusColor(conversation.campaign.status)}`}>
                  {conversation.campaign.status}
                </span>
              </p>
              <p><strong>Sequence Steps:</strong> {conversation.campaign.sequence?.length || 0}</p>
            </div>
            <Link
              href={`/campaigns/${conversation.campaign._id}`}
              className="btn-primary w-full mt-3 text-center block"
            >
              View Campaign
            </Link>
          </div>

          {/* Prospect Actions */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions</h3>
            <div className="space-y-2">
              <button className="btn-secondary w-full">
                Mark as Replied
              </button>
              <button className="btn-secondary w-full">
                Suppress Prospect
              </button>
              <Link
                href={`/prospects`}
                className="btn-primary w-full text-center block"
              >
                View All Prospects
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
