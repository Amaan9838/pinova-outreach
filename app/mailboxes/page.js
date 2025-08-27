'use client';

import { useState, useEffect } from 'react';

export default function MailboxesPage() {
  const [mailboxes, setMailboxes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingMailbox, setEditingMailbox] = useState(null);
  const [formData, setFormData] = useState({
    fromName: '',
    fromEmail: '',
    dailyCap: 20,
    smtpHost: 'smtpout.secureserver.net',
    smtpPort: 587,
    smtpUser: '',
    smtpPassword: '',
    smtpSecure: true
  });

  useEffect(() => {
    fetchMailboxes();
  }, []);

  const fetchMailboxes = async () => {
    try {
      const response = await fetch('/api/mailboxes');
      const data = await response.json();
      if (data.success) {
        setMailboxes(data.mailboxes);
      }
    } catch (error) {
      console.error('Failed to fetch mailboxes:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      fromName: '',
      fromEmail: '',
      dailyCap: 20,
      smtpHost: 'smtpout.secureserver.net',
      smtpPort: 587,
      smtpUser: '',
      smtpPassword: '',
      smtpSecure: true
    });
  };

  const handleAddMailbox = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/mailboxes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      if (data.success) {
        setMailboxes([...mailboxes, data.mailbox]);
        setShowAddForm(false);
        resetForm();
        alert('✅ Mailbox added successfully!');
      } else {
        alert('❌ Error: ' + (data.error || 'Failed to add mailbox'));
      }
    } catch (error) {
      console.error('Failed to add mailbox:', error);
      alert('❌ Failed to add mailbox');
    }
  };

  const handleEditMailbox = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`/api/mailboxes/${editingMailbox._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      if (data.success) {
        await fetchMailboxes(); // Refresh list
        setEditingMailbox(null);
        resetForm();
        alert('✅ Mailbox updated successfully!');
      } else {
        alert('❌ Error: ' + (data.error || 'Failed to update mailbox'));
      }
    } catch (error) {
      console.error('Failed to update mailbox:', error);
      alert('❌ Failed to update mailbox');
    }
  };

  const startEdit = (mailbox) => {
    setEditingMailbox(mailbox);
    setFormData({
      fromName: mailbox.fromName,
      fromEmail: mailbox.fromEmail,
      dailyCap: mailbox.dailyCap,
      smtpHost: mailbox.smtpConfiguration?.host || 'smtpout.secureserver.net',
      smtpPort: mailbox.smtpConfiguration?.port || 587,
      smtpUser: mailbox.smtpConfiguration?.user || mailbox.fromEmail,
      smtpPassword: '', // Don't populate password for security
      smtpSecure: mailbox.smtpConfiguration?.secure !== false
    });
    setShowAddForm(false);
  };

  const cancelEdit = () => {
    setEditingMailbox(null);
    setShowAddForm(false);
    resetForm();
  };

  const updateMailboxStatus = async (mailboxId, newStatus) => {
    try {
      const response = await fetch(`/api/mailboxes/${mailboxId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      
      const data = await response.json();
      if (data.success) {
        fetchMailboxes(); // Refresh list
      } else {
        alert('❌ Error: ' + (data.error || 'Failed to update mailbox'));
      }
    } catch (error) {
      console.error('Failed to update mailbox:', error);
      alert('❌ Failed to update mailbox');
    }
  };

  const testMailbox = async (mailboxId) => {
    const testEmail = prompt('Enter test email address:', 'your-email@gmail.com');
    if (!testEmail) return;

    try {
      const response = await fetch('/api/test/mailbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mailboxId, testEmail })
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

  const deleteMailbox = async (mailboxId, mailboxName) => {
    if (!confirm(`Are you sure you want to delete the mailbox "${mailboxName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/mailboxes/${mailboxId}/delete`, {
        method: 'DELETE'
      });
      
      const result = await response.json();
      
      if (result.success) {
        alert('✅ Mailbox deleted successfully!');
        fetchMailboxes(); // Refresh list
      } else {
        alert('❌ Delete failed: ' + result.error);
      }
    } catch (error) {
      alert('❌ Error: ' + error.message);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'warming': return 'text-yellow-600 bg-yellow-100';
      case 'paused': return 'text-gray-600 bg-gray-100';
      case 'blocked': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="px-4">
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500">Loading mailboxes...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mailboxes</h1>
          <p className="text-gray-600">Manage your sending email accounts</p>
        </div>
        <button
          onClick={() => {
            setShowAddForm(true);
            setEditingMailbox(null);
            resetForm();
          }}
          className="btn-primary"
        >
          Add Mailbox
        </button>
      </div>

      {/* Add/Edit Mailbox Form */}
      {(showAddForm || editingMailbox) && (
        <div className="card mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {editingMailbox ? 'Edit Mailbox' : 'Add New Mailbox'}
          </h2>
          <form onSubmit={editingMailbox ? handleEditMailbox : handleAddMailbox}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  From Name *
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={formData.fromName}
                  onChange={(e) => setFormData({ ...formData, fromName: e.target.value })}
                  placeholder="Your Name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  className="input-field"
                  value={formData.fromEmail}
                  onChange={(e) => setFormData({ ...formData, fromEmail: e.target.value })}
                  placeholder="your@email.com"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Daily Sending Cap
                </label>
                <input
                  type="number"
                  className="input-field"
                  value={formData.dailyCap}
                  onChange={(e) => setFormData({ ...formData, dailyCap: parseInt(e.target.value) })}
                  min="1"
                  max="200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  SMTP Host *
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={formData.smtpHost}
                  onChange={(e) => setFormData({ ...formData, smtpHost: e.target.value })}
                  placeholder="smtpout.secureserver.net"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  SMTP Port
                </label>
                <select
                  className="input-field"
                  value={formData.smtpPort}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    smtpPort: parseInt(e.target.value),
                    smtpSecure: e.target.value === '465' 
                  })}
                >
                  <option value={587}>587 (TLS)</option>
                  <option value={465}>465 (SSL)</option>
                  <option value={25}>25 (Plain)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  SMTP Username *
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={formData.smtpUser}
                  onChange={(e) => setFormData({ ...formData, smtpUser: e.target.value })}
                  placeholder="Usually your email address"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  SMTP Password * {editingMailbox && <span className="text-xs text-gray-500">(leave blank to keep current password)</span>}
                </label>
                <input
                  type="password"
                  className="input-field"
                  value={formData.smtpPassword}
                  onChange={(e) => setFormData({ ...formData, smtpPassword: e.target.value })}
                  placeholder={editingMailbox ? "Leave blank to keep current password" : "Your email password"}
                  required={!editingMailbox}
                />
              </div>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <h4 className="font-medium text-blue-900 mb-2">🔧 GoDaddy SMTP Settings</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• <strong>Host:</strong> smtpout.secureserver.net</li>
                <li>• <strong>Port:</strong> 587 (TLS recommended) or 465 (SSL)</li>
                <li>• <strong>Username:</strong> Your full email address</li>
                <li>• <strong>Password:</strong> Your email account password</li>
              </ul>
            </div>

            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={cancelEdit}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                {editingMailbox ? 'Update Mailbox' : 'Add Mailbox'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Mailboxes List */}
      {mailboxes.length === 0 ? (
        <div className="card text-center py-12">
          <h3 className="text-lg font-medium text-gray-900 mb-2">No mailboxes yet</h3>
          <p className="text-gray-600 mb-4">Add your first mailbox to start sending campaigns</p>
          <button
            onClick={() => {
              setShowAddForm(true);
              resetForm();
            }}
            className="btn-primary"
          >
            Add Your First Mailbox
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {mailboxes.map((mailbox) => (
            <div key={mailbox._id} className="card">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {mailbox.fromName}
                  </h3>
                  <p className="text-gray-600">{mailbox.fromEmail}</p>
                  <p className="text-sm text-gray-500">
                    Domain: {mailbox.domain} | ISP: {mailbox.isp?.toUpperCase()}
                  </p>
                </div>
                <div className="text-right">
                  <span className={`px-2 py-1 rounded-full text-sm font-medium ${getStatusColor(mailbox.status)}`}>
                    {mailbox.status}
                  </span>
                  <p className="text-xs text-gray-500 mt-1">
                    {mailbox.smtpConfiguration?.host || 'No SMTP config'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-600">Daily Cap</p>
                  <p className="text-xl font-semibold">{mailbox.dailyCap}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Today Sent</p>
                  <p className="text-xl font-semibold">{mailbox.dailySent || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Warm Score</p>
                  <p className="text-xl font-semibold">{mailbox.warmScore}/100</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Last Sent</p>
                  <p className="text-sm text-gray-900">
                    {mailbox.lastSent ? new Date(mailbox.lastSent).toLocaleDateString() : 'Never'}
                  </p>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <div className="flex space-x-2">
                  {mailbox.status === 'warming' && (
                    <button
                      onClick={() => updateMailboxStatus(mailbox._id, 'active')}
                      className="btn-primary"
                    >
                      Activate
                    </button>
                  )}
                  {mailbox.status === 'active' && (
                    <button
                      onClick={() => updateMailboxStatus(mailbox._id, 'paused')}
                      className="btn-secondary"
                    >
                      Pause
                    </button>
                  )}
                  {mailbox.status === 'paused' && (
                    <button
                      onClick={() => updateMailboxStatus(mailbox._id, 'active')}
                      className="btn-primary"
                    >
                      Resume
                    </button>
                  )}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => testMailbox(mailbox._id)}
                    className="text-sm px-3 py-1 bg-blue-100 text-blue-800 rounded hover:bg-blue-200"
                  >
                    Test
                  </button>
                  <button
                    onClick={() => startEdit(mailbox)}
                    className="text-sm px-3 py-1 bg-gray-100 text-gray-800 rounded hover:bg-gray-200"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteMailbox(mailbox._id, mailbox.fromName)}
                    className="text-sm px-3 py-1 bg-red-100 text-red-800 rounded hover:bg-red-200"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
