'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const response = await fetch('/api/campaigns');
      const data = await response.json();
      if (data.success) {
        setCampaigns(data.campaigns);
      }
    } catch (error) {
      console.error('Failed to fetch campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const startCampaign = async (campaignId) => {
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/start`, {
        method: 'POST'
      });
      const data = await response.json();
      if (data.success) {
        fetchCampaigns(); // Refresh list
      } else {
        alert(data.error || 'Failed to start campaign');
      }
    } catch (error) {
      console.error('Failed to start campaign:', error);
      alert('Failed to start campaign');
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

  if (loading) {
    return (
      <div className="px-4">
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500">Loading campaigns...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
          <p className="text-gray-600">Manage your outreach campaigns</p>
        </div>
        <Link href="/campaigns/new" className="btn-primary">
          Create Campaign
        </Link>
      </div>

      {campaigns.length === 0 ? (
        <div className="card text-center py-12">
          <h3 className="text-lg font-medium text-gray-900 mb-2">No campaigns yet</h3>
          <p className="text-gray-600 mb-4">Get started by creating your first outreach campaign</p>
          <Link href="/campaigns/new" className="btn-primary">
            Create Your First Campaign
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 text-black">
          {campaigns.map((campaign) => (
            <div key={campaign._id} className="card">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{campaign.name}</h3>
                  <p className="text-gray-600">{campaign.description}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-sm font-medium ${getStatusColor(campaign.status)}`}>
                  {campaign.status}
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-600">Prospects</p>
                  <p className="text-xl font-semibold">{campaign.prospects?.length || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Sent</p>
                  <p className="text-xl font-semibold">{campaign.stats?.sent || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Opened</p>
                  <p className="text-xl font-semibold">{campaign.stats?.opened || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Replied</p>
                  <p className="text-xl font-semibold">{campaign.stats?.replied || 0}</p>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  <p><strong>Persona:</strong> {campaign.persona}</p>
                  <p><strong>Sequence Steps:</strong> {campaign.sequence?.length || 0}</p>
                  <p><strong>Mailboxes:</strong> {campaign.mailboxes?.length || 0}</p>
                </div>
                <div className="flex space-x-2">
                  {campaign.status === 'draft' && (
                    <button
                      onClick={() => startCampaign(campaign._id)}
                      className="btn-primary"
                    >
                      Start Campaign
                    </button>
                  )}
                  <Link 
                    href={`/campaigns/${campaign._id}`}
                    className="btn-secondary"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
