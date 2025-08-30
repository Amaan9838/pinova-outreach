'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CampaignDetailsPage({ params }) {
  const router = useRouter();
  const [campaign, setCampaign] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
// console.log("this is the camapign", campaign)
  useEffect(() => {
    fetchCampaignDetails();
    fetchMessages();
  }, [params.id]);

  const fetchCampaignDetails = async () => {
    try {
      const response = await fetch(`/api/campaigns/${params.id}`);
      const data = await response.json();
      if (data.success) {
        setCampaign(data.campaign);
      }
    } catch (error) {
      console.error('Failed to fetch campaign:', error);
    }
  };

  const fetchMessages = async () => {
    try {
      const response = await fetch(`/api/campaigns/${params.id}/messages`);
      const data = await response.json();
      if (data.success) {
        setMessages(data.messages);
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const processSequencesManually = async () => {
    try {
      const response = await fetch('/api/cron/process-sequences');
      const data = await response.json();
      if (data.success) {
        alert('Sequences processed! Refresh to see updates.');
        fetchCampaignDetails();
        fetchMessages();
      } else {
        alert('Error processing sequences: ' + data.error);
      }
    } catch (error) {
      console.error('Failed to process sequences:', error);
      alert('Failed to process sequences');
    }
  };

  const sendTestEmail = async () => {
    const testEmail = prompt('Enter test email address:', 'test@example.com');
    if (!testEmail) return;

    try {
      const response = await fetch(`/api/campaigns/${params.id}/test-send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testEmail, stepNumber: 1 })
      });
      
      const result = await response.json();
      
      if (result.success) {
        alert('✅ Test email sent successfully! Check your inbox.');
      } else {
        alert('❌ Test failed: ' + result.error);
      }
    } catch (error) {
      alert('❌ Error: ' + error.message);
    }
  };

  const deleteCampaign = async () => {
    if (!confirm(`Are you sure you want to delete the campaign "${campaign.name}"? This will also delete all associated messages and cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/campaigns/${params.id}/delete`, {
        method: 'DELETE'
      });
      
      const result = await response.json();
      
      if (result.success) {
        alert('✅ Campaign deleted successfully!');
        router.push('/campaigns');
      } else {
        alert('❌ Delete failed: ' + result.error);
      }
    } catch (error) {
      alert('❌ Error: ' + error.message);
    }
  };

  const pauseCampaign = async () => {
    try {
      const response = await fetch(`/api/campaigns/${params.id}/pause`, {
        method: 'POST'
      });
      const data = await response.json();
      if (data.success) {
        fetchCampaignDetails();
      } else {
        alert(data.error || 'Failed to pause campaign');
      }
    } catch (error) {
      console.error('Failed to pause campaign:', error);
      alert('Failed to pause campaign');
    }
  };

  const resumeCampaign = async () => {
    try {
      const response = await fetch(`/api/campaigns/${params.id}/resume`, {
        method: 'POST'
      });
      const data = await response.json();
      if (data.success) {
        alert('✅ Campaign resumed successfully!');
        fetchCampaignDetails();
      } else {
        alert('❌ Failed to resume campaign: ' + data.error);
      }
    } catch (error) {
      console.error('Failed to resume campaign:', error);
      alert('❌ Failed to resume campaign');
    }
  };

  const rescheduleNow = async () => {
    try {
      const response = await fetch(`/api/campaigns/${params.id}/reschedule`, {
        method: 'POST'
      });
      const data = await response.json();
      if (data.success) {
        alert(`✅ Rescheduled ${data.rescheduledCount} prospects for immediate sending!`);
        fetchCampaignDetails();
      } else {
        alert('❌ Failed to reschedule: ' + data.error);
      }
    } catch (error) {
      console.error('Failed to reschedule:', error);
      alert('❌ Failed to reschedule');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'paused': return 'text-yellow-600 bg-yellow-100';
      case 'completed': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getMessageStatusColor = (status) => {
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

  if (loading) {
    return (
      <div className="px-4">
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500">Loading campaign details...</div>
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="px-4">
        <div className="text-center py-12">
          <p className="text-gray-500">Campaign not found</p>
          <button onClick={() => router.push('/campaigns')} className="btn-primary mt-4">
            Back to Campaigns
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => router.push('/campaigns')}
              className="text-gray-500 hover:text-gray-700"
            >
              ← Back
            </button>
            <h1 className="text-2xl font-bold text-gray-900">{campaign.name}</h1>
            <span className={`px-2 py-1 rounded-full text-sm font-medium ${getStatusColor(campaign.status)}`}>
              {campaign.status}
            </span>
          </div>
          <p className="text-gray-600 mt-1">{campaign.description}</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={sendTestEmail}
            className="btn-primary"
          >
            Send Test Email
          </button>
          <button
            onClick={rescheduleNow}
            className="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700"
          >
            Reschedule Now
          </button>
          <button
            onClick={processSequencesManually}
            className="btn-secondary"
          >
            Process Sequences Now
          </button>
          {campaign.status === 'active' && (
            <button onClick={pauseCampaign} className="btn-secondary">
              Pause Campaign
            </button>
          )}
          {campaign.status === 'paused' && (
            <button onClick={resumeCampaign} className="btn-primary">
              Resume Campaign
            </button>
          )}
          <button
            onClick={deleteCampaign}
            className="text-red-600 border border-red-600 px-4 py-2 rounded hover:bg-red-50"
          >
            Delete Campaign
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="card">
          <p className="text-sm text-gray-600">Prospects</p>
          <p className="text-2xl font-bold text-blue-600">{campaign.prospects?.length || 0}</p>
          <p className="text-xs text-gray-500">
            {campaign.prospects?.filter(p => p.status === 'active').length || 0} active
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600">Messages Sent</p>
          <p className="text-2xl font-bold text-green-600">{campaign.stats?.sent || 0}</p>
          <p className="text-xs text-gray-500">
            {campaign.stats?.delivered || 0} delivered
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600">Open Rate</p>
          <p className="text-2xl font-bold text-purple-600">
            {campaign.stats?.sent > 0 ? `${((campaign.stats?.opened / campaign.stats?.sent) * 100).toFixed(1)}%` : '0%'}
          </p>
          <p className="text-xs text-gray-500">
            {campaign.stats?.opened || 0} opens
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600">Reply Rate</p>
          <p className="text-2xl font-bold text-indigo-600">
            {campaign.stats?.sent > 0 ? `${((campaign.stats?.replied / campaign.stats?.sent) * 100).toFixed(1)}%` : '0%'}
          </p>
          <p className="text-xs text-gray-500">
            {campaign.stats?.replied || 0} replies
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Campaign Settings */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Campaign Settings</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Persona</span>
              <span className="text-sm font-medium">{campaign.persona}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Goal</span>
              <span className="text-sm font-medium">{campaign.goal}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Sequence Steps</span>
              <span className="text-sm font-medium">{campaign.sequence?.length || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Mailboxes</span>
              <span className="text-sm font-medium">{campaign.mailboxes?.length || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Daily Limit</span>
              <span className="text-sm font-medium">{campaign.settings?.dailyLimit || 50}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Send Window</span>
              <span className="text-sm font-medium">
                {campaign.settings?.sendTimeStart || '09:00'} - {campaign.settings?.sendTimeEnd || '17:00'}
              </span>
            </div>
          </div>
        </div>

        {/* Email Sequence */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Email Sequence</h2>
          <div className="space-y-3">
            {campaign.sequence?.map((step, index) => (
              <div key={index} className="border-l-4 border-blue-500 pl-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium text-gray-900">Step {step.stepNumber}</h4>
                    <p className="text-sm text-gray-600">{step.subject}</p>
                    <p className="text-xs text-gray-500">Wait: {step.waitHours}h</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Prospects Status */}
      <div className="card mt-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Prospects Status</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Prospect
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Current Step
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Next Send
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {campaign.prospects?.map((prospectData, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {prospectData.prospectId?.firstName} {prospectData.prospectId?.lastName}
                    <div className="text-xs text-gray-500">{prospectData.prospectId?.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {prospectData.currentStep}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(prospectData.status)}`}>
                      {prospectData.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {prospectData.nextSendAt ? new Date(prospectData.nextSendAt).toLocaleString() : 'Not scheduled'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Messages */}
      <div className="card mt-6">
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
