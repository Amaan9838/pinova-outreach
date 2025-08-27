'use client';

import { useState, useEffect } from 'react';

export default function ProspectsPage() {
  const [prospects, setProspects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showImportForm, setShowImportForm] = useState(false);
  const [newProspect, setNewProspect] = useState({
    firstName: '',
    lastName: '',
    email: '',
    company: '',
    city: '',
    neighborhood: '',
    listingPrice: '',
    instagramUrl: '',
    linkedinUrl: '',
    websiteUrl: '',
    tags: ''
  });

  useEffect(() => {
    fetchProspects();
  }, []);

  const fetchProspects = async () => {
    try {
      const response = await fetch('/api/prospects');
      const data = await response.json();
      if (data.success) {
        setProspects(data.prospects);
      }
    } catch (error) {
      console.error('Failed to fetch prospects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddProspect = async (e) => {
    e.preventDefault();
    try {
      const prospectData = {
        ...newProspect,
        tags: newProspect.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
      };

      const response = await fetch('/api/prospects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prospectData)
      });
      
      const data = await response.json();
      if (data.success) {
        setProspects([...prospects, data.prospect]);
        setShowAddForm(false);
        setNewProspect({
          firstName: '',
          lastName: '',
          email: '',
          company: '',
          city: '',
          neighborhood: '',
          listingPrice: '',
          instagramUrl: '',
          linkedinUrl: '',
          websiteUrl: '',
          tags: ''
        });
      } else {
        alert(data.error || 'Failed to add prospect');
      }
    } catch (error) {
      console.error('Failed to add prospect:', error);
      alert('Failed to add prospect');
    }
  };

  const updateProspectStatus = async (prospectId, newStatus) => {
    try {
      const response = await fetch(`/api/prospects/${prospectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      
      const data = await response.json();
      if (data.success) {
        fetchProspects(); // Refresh list
      } else {
        alert(data.error || 'Failed to update prospect');
      }
    } catch (error) {
      console.error('Failed to update prospect:', error);
      alert('Failed to update prospect');
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

  const handleFileImport = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    try {
      const response = await fetch('/api/prospects/import', {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      if (data.success) {
        alert(`Import completed! ${data.results.imported} prospects imported, ${data.results.skipped} skipped.`);
        if (data.results.errors.length > 0) {
          console.log('Import errors:', data.results.errors);
        }
        setShowImportForm(false);
        fetchProspects(); // Refresh list
      } else {
        alert(data.error || 'Failed to import prospects');
      }
    } catch (error) {
      console.error('Failed to import prospects:', error);
      alert('Failed to import prospects');
    }
  };

  const downloadTemplate = async () => {
    try {
      const response = await fetch('/api/prospects/import');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'prospect-template.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to download template:', error);
    }
  };

  if (loading) {
    return (
      <div className="px-4">
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500">Loading prospects...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Prospects</h1>
          <p className="text-gray-600">Manage your contact database</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowAddForm(true)}
            className="btn-primary"
          >
            Add Prospect
          </button>
          <button
            onClick={() => setShowImportForm(true)}
            className="btn-secondary"
          >
            Import CSV
          </button>
        </div>
      </div>

      {/* Import CSV Form */}
      {showImportForm && (
        <div className="card mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Import Prospects from CSV</h2>
          <form onSubmit={handleFileImport}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                CSV File
              </label>
              <input
                type="file"
                name="file"
                accept=".csv"
                className="input-field"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Upload a CSV file with prospect data. Required column: email
              </p>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <h4 className="text-sm font-medium text-blue-800 mb-2">Supported Columns:</h4>
              <p className="text-xs text-blue-700">
                first_name, last_name, email (required), company, city, neighborhood, 
                listing_price, instagram_url, linkedin_url, website_url, tags
              </p>
              <button
                type="button"
                onClick={downloadTemplate}
                className="text-xs text-blue-600 hover:text-blue-800 underline mt-2"
              >
                Download CSV template
              </button>
            </div>

            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => setShowImportForm(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                Import Prospects
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add Prospect Form */}
      {showAddForm && (
        <div className="card mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Add New Prospect</h2>
          <form onSubmit={handleAddProspect}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name *
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={newProspect.firstName}
                  onChange={(e) => setNewProspect({ ...newProspect, firstName: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={newProspect.lastName}
                  onChange={(e) => setNewProspect({ ...newProspect, lastName: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  className="input-field"
                  value={newProspect.email}
                  onChange={(e) => setNewProspect({ ...newProspect, email: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={newProspect.company}
                  onChange={(e) => setNewProspect({ ...newProspect, company: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  City
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={newProspect.city}
                  onChange={(e) => setNewProspect({ ...newProspect, city: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Neighborhood
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={newProspect.neighborhood}
                  onChange={(e) => setNewProspect({ ...newProspect, neighborhood: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Listing Price
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={newProspect.listingPrice}
                  onChange={(e) => setNewProspect({ ...newProspect, listingPrice: e.target.value })}
                  placeholder="e.g., $2.5M"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  LinkedIn URL
                </label>
                <input
                  type="url"
                  className="input-field"
                  value={newProspect.linkedinUrl}
                  onChange={(e) => setNewProspect({ ...newProspect, linkedinUrl: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Instagram URL
                </label>
                <input
                  type="url"
                  className="input-field"
                  value={newProspect.instagramUrl}
                  onChange={(e) => setNewProspect({ ...newProspect, instagramUrl: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Website URL
                </label>
                <input
                  type="url"
                  className="input-field"
                  value={newProspect.websiteUrl}
                  onChange={(e) => setNewProspect({ ...newProspect, websiteUrl: e.target.value })}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={newProspect.tags}
                  onChange={(e) => setNewProspect({ ...newProspect, tags: e.target.value })}
                  placeholder="luxury, beverly-hills, seller"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                Add Prospect
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Prospects List */}
      {prospects.length === 0 ? (
        <div className="card text-center py-12">
          <h3 className="text-lg font-medium text-gray-900 mb-2">No prospects yet</h3>
          <p className="text-gray-600 mb-4">Add your first prospect to start building your contact database</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="btn-primary"
          >
            Add Your First Prospect
          </button>
        </div>
      ) : (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Company
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {prospects.map((prospect) => (
                  <tr key={prospect._id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {prospect.firstName} {prospect.lastName}
                      </div>
                      {prospect.tags && prospect.tags.length > 0 && (
                        <div className="text-xs text-gray-500">
                          {prospect.tags.slice(0, 3).join(', ')}
                          {prospect.tags.length > 3 && '...'}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {prospect.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {prospect.company || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {prospect.neighborhood || prospect.city || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(prospect.status)}`}>
                        {prospect.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex space-x-2">
                        {prospect.status === 'suppressed' && (
                          <button
                            onClick={() => updateProspectStatus(prospect._id, 'active')}
                            className="text-green-600 hover:text-green-900"
                          >
                            Reactivate
                          </button>
                        )}
                        {prospect.status === 'active' && (
                          <button
                            onClick={() => updateProspectStatus(prospect._id, 'suppressed')}
                            className="text-red-600 hover:text-red-900"
                          >
                            Suppress
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
