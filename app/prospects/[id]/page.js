'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ProspectDetailsPage({ params }) {
  const router = useRouter();
  const [prospect, setProspect] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    fetchProspectDetails();
  }, [params.id]);

  const fetchProspectDetails = async () => {
    try {
      const response = await fetch(`/api/prospects/${params.id}`);
      const data = await response.json();
      if (data.success) {
        setProspect(data.prospect);
        setFormData({
          ...data.prospect,
          tags: data.prospect.tags?.join(', ') || ''
        });
      }
    } catch (error) {
      console.error('Failed to fetch prospect details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    
    try {
      const updateData = {
        ...formData,
        tags: formData.tags?.split(',').map(tag => tag.trim()).filter(tag => tag) || []
      };

      const response = await fetch(`/api/prospects/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });
      
      const data = await response.json();
      if (data.success) {
        setProspect(data.prospect);
        setEditing(false);
        alert('Prospect updated successfully!');
      } else {
        alert(data.error || 'Failed to update prospect');
      }
    } catch (error) {
      console.error('Failed to update prospect:', error);
      alert('Failed to update prospect');
    }
  };

  const deleteProspect = async () => {
    if (!confirm('Are you sure you want to delete this prospect? This cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/prospects/${params.id}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      if (data.success) {
        alert('Prospect deleted successfully');
        router.push('/prospects');
      } else {
        alert(data.error || 'Failed to delete prospect');
      }
    } catch (error) {
      console.error('Failed to delete prospect:', error);
      alert('Failed to delete prospect');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'suppressed': return 'text-red-600 bg-red-100';
      case 'bounced': return 'text-yellow-600 bg-yellow-100';
      case 'unsubscribed': return 'text-gray-600 bg-gray-100';
      default: return 'text-blue-600 bg-blue-100';
    }
  };

  if (loading) {
    return (
      <div className="px-4">
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500">Loading prospect...</div>
        </div>
      </div>
    );
  }

  if (!prospect) {
    return (
      <div className="px-4">
        <div className="text-center py-12">
          <p className="text-gray-500">Prospect not found</p>
          <button onClick={() => router.push('/prospects')} className="btn-primary mt-4">
            Back to Prospects
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => router.push('/prospects')}
            className="text-gray-500 hover:text-gray-700"
          >
            ← Back to Prospects
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            {prospect.firstName} {prospect.lastName}
          </h1>
          <span className={`px-2 py-1 rounded-full text-sm font-medium ${getStatusColor(prospect.status)}`}>
            {prospect.status}
          </span>
        </div>
        
        <div className="flex space-x-3">
          {!editing ? (
            <>
              <button
                onClick={() => setEditing(true)}
                className="btn-secondary"
              >
                ✏️ Edit
              </button>
              <Link
                href={`/compose?prospect=${prospect._id}`}
                className="btn-primary"
              >
                ✉️ Send Email
              </Link>
            </>
          ) : (
            <>
              <button
                onClick={() => setEditing(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="btn-primary"
              >
                💾 Save Changes
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
            
            {editing ? (
              <form onSubmit={handleSave}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                    <input
                      type="text"
                      value={formData.firstName || ''}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="input-field"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                    <input
                      type="text"
                      value={formData.lastName || ''}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                    <input
                      type="email"
                      value={formData.email || ''}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="input-field"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                    <input
                      type="text"
                      value={formData.company || ''}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                    <input
                      type="text"
                      value={formData.city || ''}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Neighborhood</label>
                    <input
                      type="text"
                      value={formData.neighborhood || ''}
                      onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Listing Price</label>
                    <input
                      type="text"
                      value={formData.listingPrice || ''}
                      onChange={(e) => setFormData({ ...formData, listingPrice: e.target.value })}
                      className="input-field"
                      placeholder="e.g., $2.5M"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                      value={formData.status || 'active'}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="input-field"
                    >
                      <option value="active">Active</option>
                      <option value="suppressed">Suppressed</option>
                      <option value="bounced">Bounced</option>
                      <option value="unsubscribed">Unsubscribed</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn URL</label>
                    <input
                      type="url"
                      value={formData.linkedinUrl || ''}
                      onChange={(e) => setFormData({ ...formData, linkedinUrl: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Instagram URL</label>
                    <input
                      type="url"
                      value={formData.instagramUrl || ''}
                      onChange={(e) => setFormData({ ...formData, instagramUrl: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Website URL</label>
                    <input
                      type="url"
                      value={formData.websiteUrl || ''}
                      onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma-separated)</label>
                    <input
                      type="text"
                      value={formData.tags || ''}
                      onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                      className="input-field"
                      placeholder="luxury, beverly-hills, seller"
                    />
                  </div>
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-800">
                <div>
                  <p className="text-sm text-gray-600">First Name</p>
                  <p className="font-medium">{prospect.firstName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Last Name</p>
                  <p className="font-medium">{prospect.lastName || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="font-medium">{prospect.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Company</p>
                  <p className="font-medium">{prospect.company || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">City</p>
                  <p className="font-medium">{prospect.city || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Neighborhood</p>
                  <p className="font-medium">{prospect.neighborhood || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Listing Price</p>
                  <p className="font-medium">{prospect.listingPrice || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(prospect.status)}`}>
                    {prospect.status}
                  </span>
                </div>
                
                {/* Social Links */}
                {(prospect.linkedinUrl || prospect.instagramUrl || prospect.websiteUrl) && (
                  <div className="md:col-span-2">
                    <p className="text-sm text-gray-600 mb-2">Links</p>
                    <div className="flex space-x-4">
                      {prospect.linkedinUrl && (
                        <a href={prospect.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 text-sm">
                          LinkedIn
                        </a>
                      )}
                      {prospect.instagramUrl && (
                        <a href={prospect.instagramUrl} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:text-purple-800 text-sm">
                          Instagram  
                        </a>
                      )}
                      {prospect.websiteUrl && (
                        <a href={prospect.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:text-green-800 text-sm">
                          Website
                        </a>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Tags */}
                {prospect.tags && prospect.tags.length > 0 && (
                  <div className="md:col-span-2">
                    <p className="text-sm text-gray-600 mb-2">Tags</p>
                    <div className="flex flex-wrap gap-2">
                      {prospect.tags.map((tag, index) => (
                        <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-3">Quick Actions</h3>
            <div className="space-y-2">
              <Link
                href={`/compose?prospect=${prospect._id}`}
                className="btn-primary w-full text-center block"
              >
                ✉️ Send Email
              </Link>
              <button
                onClick={() => setEditing(true)}
                className="btn-secondary w-full"
                disabled={editing}
              >
                ✏️ Edit Details
              </button>
              <button
                onClick={deleteProspect}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 w-full"
              >
                🗑️ Delete Prospect
              </button>
            </div>
          </div>

          {/* Prospect Stats */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-3">Prospect Stats</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Created</span>
                <span>{new Date(prospect.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Last Updated</span>
                <span>{new Date(prospect.updatedAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Score</span>
                <span className="font-semibold">{prospect.score || 0}</span>
              </div>
            </div>
          </div>

          {/* Campaign Activity */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-3">Recent Activity</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <p>Email activity and campaign participation will show here</p>
              <Link href="/conversations" className="text-blue-600 hover:text-blue-800 text-xs">
                View All Conversations →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
