// TestEmailModal.js - Create this as a separate component file
'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Send, Eye, Zap, Shield } from 'lucide-react';

export default function TestEmailModal({ 
  isOpen, 
  onClose, 
  steps, 
  editingIndex, 
  campaignId,
  leads = [],
  mailboxes = [] 
}) {
  const [testEmailSettings, setTestEmailSettings] = useState({
    sendFrom: '',
    selectedLead: null,
    testEmail: 'test@example.com'
  });
  const [availableMailboxes, setAvailableMailboxes] = useState([]);
  const [availableLeads, setAvailableLeads] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch mailboxes and leads when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchMailboxes();
      fetchLeads();
    }
  }, [isOpen, campaignId]);

  const fetchMailboxes = async () => {
    try {
      const response = await fetch('/api/mailboxes');
      const data = await response.json();
      if (data.success) {
        setAvailableMailboxes(data.mailboxes || []);
      }
    } catch (error) {
      console.error('Failed to fetch mailboxes:', error);
      toast.error('Error: ' + error.message);
    }
  };

  const fetchLeads = async () => {
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/prospects`);
      const data = await response.json();
      if (data.success) {
        setAvailableLeads(data.prospects || []);
      }
    } catch (error) {
      console.error('Failed to fetch leads:', error);
      toast.error('Error fetching leads: ' + error.message);
    }
  };

  // Function to replace variables in template
  const replaceVariables = (template, lead) => {
    if (!template) return template;
    
    let result = template;
    
    if (lead) {
      result = result
        .replace(/\{\{firstName\}\}/g, lead.firstName || '[firstName]')
        .replace(/\{\{lastName\}\}/g, lead.lastName || '[lastName]')
        .replace(/\{\{company\}\}/g, lead.company || '[company]')
        .replace(/\{\{email\}\}/g, lead.email || '[email]')
        .replace(/\{\{position\}\}/g, lead.position || '[position]')
        .replace(/\{\{phone\}\}/g, lead.phone || '[phone]')
        .replace(/\{\{website\}\}/g, lead.website || '[website]');
    } else {
      // Show placeholder variables when no lead is selected
      result = result
        .replace(/\{\{firstName\}\}/g, '[firstName]')
        .replace(/\{\{lastName\}\}/g, '[lastName]')
        .replace(/\{\{company\}\}/g, '[company]')
        .replace(/\{\{email\}\}/g, '[email]')
        .replace(/\{\{position\}\}/g, '[position]')
        .replace(/\{\{phone\}\}/g, '[phone]')
        .replace(/\{\{website\}\}/g, '[website]');
    }
    
    return result;
  };

  const handleSendTest = async () => {
    if (!testEmailSettings.testEmail) {
      toast.error('Please enter a test email address');
      return;
    }
    
    if (!testEmailSettings.sendFrom) {
      toast.error('Please select a sender mailbox');
      return;
    }

    if (editingIndex === null || !steps[editingIndex]) {
      toast.error('Please select a step to test');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/test-send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testEmail: testEmailSettings.testEmail,
          stepNumber: steps[editingIndex].stepNumber,
          sendFrom: testEmailSettings.sendFrom,
          leadData: testEmailSettings.selectedLead,
          subject: replaceVariables(steps[editingIndex].subject, testEmailSettings.selectedLead),
          content: replaceVariables(steps[editingIndex].template, testEmailSettings.selectedLead)
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast.success("Test email sent successfully!");
        onClose();
      } else {
        toast.error(result.error || "Failed to send test email");
      }
    } catch (error) {
      console.error('Error sending test email:', error);
      toast.error("Failed to send test email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[95vh] p-0">
        <div className="flex h-[85vh]">
          {/* Left Panel - Test Email Configuration */}
          <div className="w-96 border-r bg-gray-50 p-6 overflow-y-auto">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                <Send className="h-4 w-4 text-white" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Test Email</h2>
            </div>

            <div className="space-y-6">
              {/* Send From */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900">Send from:</label>
                <Select 
                  value={testEmailSettings.sendFrom}
                  onValueChange={(value) => 
                    setTestEmailSettings(prev => ({ ...prev, sendFrom: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableMailboxes.length > 0 ? (
                      availableMailboxes.map((mailbox) => (
                        <SelectItem key={mailbox._id || mailbox.id} value={mailbox.email}>
                          <div className="flex flex-col">
                            <span className="font-medium">{mailbox.email}</span>
                            <span className="text-xs text-gray-500">{mailbox.name || 'Default'}</span>
                          </div>
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-mailboxes" disabled>
                        No mailboxes available
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Load Data for Lead */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900">Load data for lead:</label>
                <Select 
                  value={testEmailSettings.selectedLead?._id?.toString()}
                  onValueChange={(value) => {
                    const lead = availableLeads.find(l => l._id?.toString() === value);
                    setTestEmailSettings(prev => ({ ...prev, selectedLead: lead }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a lead..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableLeads.length > 0 ? (
                      availableLeads.map((lead, index) => (
                        <SelectItem key={lead._id || index} value={(lead._id || index)?.toString()}>
                          <div className="flex flex-col">
                            <span className="font-medium">{lead.firstName} {lead.lastName}</span>
                            <span className="text-xs text-gray-500">{lead.company || lead.email}</span>
                          </div>
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-leads" disabled>
                        No leads available
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Variables Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-900">Variables</span>
                </div>
                
                <div className="bg-white border rounded-lg p-4">
                  {testEmailSettings.selectedLead ? (
                    <div className="space-y-3">
                      <div className="text-sm">
                        <span className="font-medium text-gray-600">firstName:</span>
                        <span className="ml-2 text-gray-900">{testEmailSettings.selectedLead.firstName}</span>
                      </div>
                      <div className="text-sm">
                        <span className="font-medium text-gray-600">lastName:</span>
                        <span className="ml-2 text-gray-900">{testEmailSettings.selectedLead.lastName}</span>
                      </div>
                      <div className="text-sm">
                        <span className="font-medium text-gray-600">company:</span>
                        <span className="ml-2 text-gray-900">{testEmailSettings.selectedLead.company || 'N/A'}</span>
                      </div>
                      <div className="text-sm">
                        <span className="font-medium text-gray-600">email:</span>
                        <span className="ml-2 text-gray-900">{testEmailSettings.selectedLead.email}</span>
                      </div>
                      <div className="text-sm">
                        <span className="font-medium text-gray-600">position:</span>
                        <span className="ml-2 text-gray-900">{testEmailSettings.selectedLead.position || 'N/A'}</span>
                      </div>
                      <div className="text-sm">
                        <span className="font-medium text-gray-600">phone:</span>
                        <span className="ml-2 text-gray-900">{testEmailSettings.selectedLead.phone || 'N/A'}</span>
                      </div>
                      <div className="text-sm">
                        <span className="font-medium text-gray-600">website:</span>
                        <span className="ml-2 text-gray-900">{testEmailSettings.selectedLead.website || 'N/A'}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">Select a lead to see variable values</p>
                  )}
                  
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-xs text-gray-500">
                      Available: {'{'}firstName{'}'}, {'{'}lastName{'}'}, {'{'}company{'}'}, {'{'}email{'}'}, {'{'}position{'}'}, {'{'}phone{'}'}, {'{'}website{'}'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Test Email Address */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900">Test email address:</label>
                <Input
                  value={testEmailSettings.testEmail}
                  onChange={(e) => 
                    setTestEmailSettings(prev => ({ ...prev, testEmail: e.target.value }))
                  }
                  placeholder="Enter email address"
                  type="email"
                />
              </div>
            </div>
          </div>

          {/* Right Panel - Email Preview */}
          <div className="flex-1 flex flex-col">
            {/* Header */}
            <div className="border-b p-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
                  <Eye className="h-4 w-4 text-white" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Email Preview</h2>
              </div>
            </div>

            {/* Email Details */}
            <div className="p-6 space-y-4 border-b bg-gray-50">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-gray-500">From:</span>
                  <span className="ml-2 text-sm text-gray-900">
                    {testEmailSettings.sendFrom || 'No sender selected'}
                  </span>
                </div>
                <div>
                  <span className="text-sm text-gray-500">To:</span>
                  <span className="ml-2 text-sm text-gray-900">{testEmailSettings.testEmail}</span>
                </div>
              </div>
              
              <div>
                <span className="text-sm text-gray-500">Subject:</span>
                <span className="ml-2 text-sm font-medium text-gray-900">
                  {editingIndex !== null && steps[editingIndex] 
                    ? replaceVariables(steps[editingIndex].subject, testEmailSettings.selectedLead)
                    : 'No step selected'
                  }
                </span>
              </div>
            </div>

            {/* Email Content Preview */}
            <div className="flex-1 p-6 overflow-y-auto">
              <div className="bg-white border rounded-lg shadow-sm">
                <div className="p-6">
                  <div className="prose max-w-none">
                    <div className="whitespace-pre-wrap text-gray-900 leading-relaxed">
                      {editingIndex !== null && steps[editingIndex]
                        ? replaceVariables(steps[editingIndex].template, testEmailSettings.selectedLead)
                        : 'Select a step and lead to preview the email content'
                      }
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="border-t p-6 bg-gray-50">
              <div className="flex justify-between items-center">
                <Button
                  variant="outline"
                  className="flex items-center gap-2"
                  onClick={() => {
                    console.log('Checking deliverability...');
                  }}
                >
                  <Shield className="h-4 w-4" />
                  Check Deliverability Score
                </Button>
                
                <Button
                  className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
                  onClick={handleSendTest}
                  disabled={loading}
                >
                  <Send className="h-4 w-4" />
                  {loading ? 'Sending...' : 'Send test email'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}