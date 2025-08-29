'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

function ReplyForm({ originalMessage }) {
  const [replyHtml, setReplyHtml] = useState('');
  const [sending, setSending] = useState(false);

  const sendReply = async () => {
    if (!replyHtml.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/emails/${originalMessage._id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bodyHtml: replyHtml, bodyText: replyHtml.replace(/<[^>]*>/g, '') })
      });
      const data = await res.json();
      if (data.success) {
        alert('Reply sent');
        window.location.reload();
      } else {
        alert('Failed: ' + data.error);
      }
    } catch (e) {
      alert('Failed: ' + e.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-3">
      <textarea
        className="input-field"
        rows={6}
        placeholder="Write your reply..."
        value={replyHtml}
        onChange={(e) => setReplyHtml(e.target.value)}
      />
      <div className="flex justify-end">
        <button onClick={sendReply} disabled={sending} className="btn-primary">
          {sending ? 'Sending...' : 'Send Reply'}
        </button>
      </div>
    </div>
  );
}

export default function EmailDetailsPage({ params }) {
  const router = useRouter();
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEmailDetails();
  }, [params.id]);

  const fetchEmailDetails = async () => {
    try {
      const response = await fetch(`/api/emails/${params.id}`);
      const data = await response.json();
      if (data.success) {
        setMessage(data.message);
      }
    } catch (error) {
      console.error('Failed to fetch email details:', error);
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
      case 'failed': return '💥';
      default: return '📧';
    }
  };

  if (loading) {
    return (
      <div className="px-4">
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500">Loading email details...</div>
        </div>
      </div>
    );
  }

  if (!message) {
    return (
      <div className="px-4">
        <div className="text-center py-12">
          <p className="text-gray-500">Email not found</p>
          <button onClick={() => router.push('/emails')} className="btn-primary mt-4">
            Back to Emails
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
          onClick={() => router.push('/emails')}
          className="text-gray-500 hover:text-gray-700"
        >
          ← Back to Emails
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Email Details</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Email Header */}
          <div className="card">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{message.subject}</h2>
                <p className="text-sm text-gray-600">Step {message.stepNumber} in sequence</p>
              </div>
              <span className={`px-2 py-1 rounded-full text-sm font-medium ${getStatusColor(message.status)}`}>
                {message.status}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-black">
              <div>
                <p><strong>From:</strong> {message.mailboxId?.fromName} ({message.mailboxId?.fromEmail})</p>
                <p><strong>To:</strong> {message.prospectId?.firstName} {message.prospectId?.lastName} ({message.prospectId?.email})</p>
                <p><strong>Campaign:</strong> 
                  <Link href={`/campaigns/${message.campaignId?._id}`} className="text-blue-600 hover:text-blue-800 ml-1">
                    {message.campaignId?.name}
                  </Link>
                </p>
              </div>
              <div>
                <p><strong>Sent:</strong> {message.sentAt ? new Date(message.sentAt).toLocaleString() : 'Not sent'}</p>
                <p><strong>Delivered:</strong> {message.deliveredAt ? new Date(message.deliveredAt).toLocaleString() : 'Not delivered'}</p>
                <p><strong>Opened:</strong> {message.openedAt ? new Date(message.openedAt).toLocaleString() : 'Not opened'}</p>
              </div>
            </div>
          </div>

          {/* Email Content */}
          <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Email Content</h3>
          <div className="border rounded-lg p-4 bg-gray-50 text-gray-800">
          <div className="mb-2">
          <strong>Subject:</strong> {message.subject}
          </div>
          <hr className="my-2" />
          <div className="whitespace-pre-wrap text-sm">
          {message.content}
          </div>
          </div>
          </div>

           {/* Reply Composer */}
           <div className="card">
             <h3 className="text-lg font-semibold text-gray-900 mb-4">Reply</h3>
             <ReplyForm originalMessage={message} />
           </div>

          {/* Event Timeline */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Event Timeline</h3>
            {message.events && message.events.length > 0 ? (
              <div className="space-y-3 text-gray-800">
                {message.events
                  .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                  .map((event, index) => (
                    <div key={index} className="flex items-start space-x-3">
                      <div className="text-2xl">{getEventIcon(event.type)}</div>
                      <div className="flex-1">
                        <div className="flex justify-between items-center">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(event.type)}`}>
                            {event.type.toUpperCase()}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(event.timestamp).toLocaleString()}
                          </span>
                        </div>
                        {event.data && Object.keys(event.data).length > 0 && (
                          <div className="mt-2 text-xs text-gray-600">
                            {/* Open/Click details */}
                            {event.data.userAgent && <p>User Agent: {event.data.userAgent.substring(0, 120)}...</p>}
                            {event.data.ip && <p>IP: {event.data.ip}</p>}

                            {/* Reply details */}
                            {event.type === 'replied' && (
                              <div className="mt-2">
                                {event.data.subject && (
                                  <p className="text-sm font-medium text-gray-900">Subject: {event.data.subject}</p>
                                )}
                                {event.data.html ? (
                                  <div className="mt-2 border rounded bg-white p-3 text-sm" dangerouslySetInnerHTML={{ __html: event.data.html }} />
                                ) : (
                                  <pre className="mt-2 border rounded bg-gray-50 p-3 text-sm whitespace-pre-wrap">{event.data.text || 'No content'}</pre>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-gray-500">No events recorded</p>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Message ID</span>
                <span className="text-sm font-mono text-gray-900">{message._id.substring(0, 8)}...</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Tracking ID</span>
                <span className="text-sm font-mono text-gray-900">{message.trackingId?.substring(0, 8)}...</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Events Count</span>
                <span className="text-sm font-semibold text-gray-900">{message.events?.length || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Created</span>
                <span className="text-sm text-gray-900">
                  {new Date(message.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          {/* Prospect Info */}
          {message.prospectId && (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Prospect Details</h3>
              <div className="space-y-2 text-sm text-gray-800">
                <p><strong>Name:</strong> {message.prospectId.firstName} {message.prospectId.lastName}</p>
                <p><strong>Email:</strong> {message.prospectId.email}</p>
                {message.prospectId.company && <p><strong>Company:</strong> {message.prospectId.company}</p>}
                {message.prospectId.city && <p><strong>City:</strong> {message.prospectId.city}</p>}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions</h3>
            <div className="space-y-2">
              <Link
                href={`/campaigns/${message.campaignId?._id}`}
                className="btn-primary w-full text-center block"
              >
                View Campaign
              </Link>
              <Link
                href={`/prospects`}
                className="btn-secondary w-full text-center block"
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
