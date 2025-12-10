'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Mail, Plus, Settings, Play, Pause, TestTube, Edit, Trash2, MoreVertical, CheckCircle, AlertCircle, Clock, Zap } from 'lucide-react';

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
        toast('✅ Mailbox added successfully!');
      } else {
        toast('❌ Error: ' + (data.error || 'Failed to add mailbox'));
      }
    } catch (error) {
      console.error('Failed to add mailbox:', error);
      toast('❌ Failed to add mailbox');
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
        toast('✅ Mailbox updated successfully!');
      } else {
        toast('❌ Error: ' + (data.error || 'Failed to update mailbox'));
      }
    } catch (error) {
      console.error('Failed to update mailbox:', error);
      toast('❌ Failed to update mailbox');
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
      smtpPassword: '',
      smtpSecure: mailbox.smtpConfiguration?.secure !== false
    });
    setShowAddForm(true);
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
        toast('❌ Error: ' + (data.error || 'Failed to update mailbox'));
      }
    } catch (error) {
      console.error('Failed to update mailbox:', error);
      toast('❌ Failed to update mailbox');
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
        toast('✅ Test email sent successfully! Check your inbox.');
      } else {
        toast('❌ Test failed: ' + result.error);
      }
    } catch (error) {
      toast('❌ Error: ' + error.message);
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
        toast('✅ Mailbox deleted successfully!');
        fetchMailboxes(); // Refresh list
      } else {
        toast('❌ Delete failed: ' + result.error);
      }
    } catch (error) {
      toast('❌ Error: ' + error.message);
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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white p-6">
        <div className="flex justify-center items-center h-64">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
            <span className="text-gray-600 font-medium">Loading mailboxes...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-black rounded-lg">
                <Mail className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900">Mailboxes</h1>
            </div>
            <p className="text-gray-600">Manage your sending email accounts and monitor performance</p>
            <div className="flex items-center gap-4 mt-2">
              <Badge variant="outline" className="text-xs">
                {mailboxes.length} Total
              </Badge>
              <Badge variant="outline" className="text-xs text-green-600">
                {mailboxes.filter(m => m.status === 'active').length} Active
              </Badge>
            </div>
          </div>
          <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
            <DialogTrigger asChild>
              <Button className="bg-black hover:bg-gray-800 text-white" onClick={() => {
                setEditingMailbox(null);
                resetForm();
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Mailbox
              </Button>
            </DialogTrigger>

            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingMailbox ? 'Edit Mailbox' : 'Add New Mailbox'}</DialogTitle>
                <DialogDescription>
                  {editingMailbox ? 'Update your mailbox configuration' : 'Configure a new email account for sending campaigns'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={editingMailbox ? handleEditMailbox : handleAddMailbox} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">From Name *</label>
                    <Input
                      value={formData.fromName}
                      onChange={(e) => setFormData({ ...formData, fromName: e.target.value })}
                      placeholder="Your Name"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email Address *</label>
                    <Input
                      type="email"
                      value={formData.fromEmail}
                      onChange={(e) => setFormData({ ...formData, fromEmail: e.target.value })}
                      placeholder="your@email.com"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Daily Sending Cap</label>
                    <Input
                      type="number"
                      value={formData.dailyCap}
                      onChange={(e) => setFormData({ ...formData, dailyCap: parseInt(e.target.value) })}
                      min="1"
                      max="200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">SMTP Host *</label>
                    <Input
                      value={formData.smtpHost}
                      onChange={(e) => setFormData({ ...formData, smtpHost: e.target.value })}
                      placeholder="smtpout.secureserver.net"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">SMTP Port</label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">SMTP Username *</label>
                    <Input
                      value={formData.smtpUser}
                      onChange={(e) => setFormData({ ...formData, smtpUser: e.target.value })}
                      placeholder="Usually your email address"
                      required
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      SMTP Password * {editingMailbox && <span className="text-xs text-gray-500">(leave blank to keep current password)</span>}
                    </label>
                    <Input
                      type="password"
                      value={formData.smtpPassword}
                      onChange={(e) => setFormData({ ...formData, smtpPassword: e.target.value })}
                      placeholder={editingMailbox ? "Leave blank to keep current password" : "Your email password"}
                      required={!editingMailbox}
                    />
                  </div>
                </div>
                
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4">
                    <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      GoDaddy SMTP Settings
                    </h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• <strong>Host:</strong> smtpout.secureserver.net</li>
                      <li>• <strong>Port:</strong> 587 (TLS recommended) or 465 (SSL)</li>
                      <li>• <strong>Username:</strong> Your full email address</li>
                      <li>• <strong>Password:</strong> Your email account password</li>
                    </ul>
                  </CardContent>
                </Card>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-black hover:bg-gray-800">
                    {editingMailbox ? 'Update Mailbox' : 'Add Mailbox'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Mailboxes Grid */}
        {mailboxes.length === 0 ? (
          <Card className="text-center py-16">
            <CardContent className="space-y-4">
              <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                <Mail className="h-8 w-8 text-gray-400" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No mailboxes yet</h3>
                <p className="text-gray-600 mb-6">Add your first mailbox to start sending campaigns</p>
                <Button onClick={() => setShowAddForm(true)} className="bg-black hover:bg-gray-800">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Mailbox
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {mailboxes.map((mailbox) => (
              <Card key={mailbox._id} className="group hover:shadow-lg transition-all duration-200 border-2 hover:border-gray-300">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <Mail className="h-5 w-5 text-gray-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{mailbox.fromName}</CardTitle>
                        <CardDescription className="text-sm">{mailbox.fromEmail}</CardDescription>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => testMailbox(mailbox._id)}>
                          <TestTube className="h-4 w-4 mr-2" />
                          Test Connection
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => startEdit(mailbox)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Settings
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => deleteMailbox(mailbox._id, mailbox.fromName)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  
                  <div className="flex items-center justify-between mt-3">
                    <Badge 
                      variant={mailbox.status === 'active' ? 'default' : 'secondary'}
                      className={`${
                        mailbox.status === 'active' ? 'bg-green-100 text-green-800 hover:bg-green-100' :
                        mailbox.status === 'warming' ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100' :
                        mailbox.status === 'paused' ? 'bg-gray-100 text-gray-800 hover:bg-gray-100' :
                        'bg-red-100 text-red-800 hover:bg-red-100'
                      }`}
                    >
                      {mailbox.status === 'active' && <CheckCircle className="h-3 w-3 mr-1" />}
                      {mailbox.status === 'warming' && <Clock className="h-3 w-3 mr-1" />}
                      {mailbox.status === 'paused' && <Pause className="h-3 w-3 mr-1" />}
                      {mailbox.status === 'blocked' && <AlertCircle className="h-3 w-3 mr-1" />}
                      {mailbox.status}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {mailbox.domain} • {mailbox.isp?.toUpperCase()}
                    </span>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-gray-900">{mailbox.dailyCap}</div>
                      <div className="text-xs text-gray-600">Daily Cap</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{mailbox.dailySent || 0}</div>
                      <div className="text-xs text-gray-600">Today Sent</div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Warm Score</span>
                      <span className="font-medium">{mailbox.warmScore || 0}/100</span>
                    </div>
                    <Progress value={mailbox.warmScore || 0} className="h-2" />
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Last Sent</span>
                    <span className="font-medium">
                      {mailbox.lastSent ? new Date(mailbox.lastSent).toLocaleDateString() : 'Never'}
                    </span>
                  </div>
                  
                  <div className="flex gap-2 pt-2">
                    {mailbox.status === 'warming' && (
                      <Button
                        onClick={() => updateMailboxStatus(mailbox._id, 'active')}
                        size="sm"
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        <Play className="h-3 w-3 mr-1" />
                        Activate
                      </Button>
                    )}
                    {mailbox.status === 'active' && (
                      <Button
                        onClick={() => updateMailboxStatus(mailbox._id, 'paused')}
                        size="sm"
                        variant="outline"
                        className="flex-1"
                      >
                        <Pause className="h-3 w-3 mr-1" />
                        Pause
                      </Button>
                    )}
                    {mailbox.status === 'paused' && (
                      <Button
                        onClick={() => updateMailboxStatus(mailbox._id, 'active')}
                        size="sm"
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        <Play className="h-3 w-3 mr-1" />
                        Resume
                      </Button>
                    )}
                    <Button
                      onClick={() => testMailbox(mailbox._id)}
                      size="sm"
                      variant="outline"
                      className="px-3"
                    >
                      <Zap className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
