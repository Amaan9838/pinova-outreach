'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ComposePage() {
  const router = useRouter();
  const [mailboxes, setMailboxes] = useState([]);
  const [prospects, setProspects] = useState([]);
  const [selectedMailbox, setSelectedMailbox] = useState('');
  const [toEmail, setToEmail] = useState('');
  const [selectedProspect, setSelectedProspect] = useState('');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [showProspectPicker, setShowProspectPicker] = useState(false);

  useEffect(() => {
    fetchMailboxes();
    fetchProspects();
  }, []);

  const fetchMailboxes = async () => {
    try {
      const response = await fetch('/api/mailboxes');
      const data = await response.json();
      if (data.success) {
        setMailboxes(data.mailboxes.filter(m => m.status === 'active'));
      }
    } catch (error) {
      console.error('Failed to fetch mailboxes:', error);
    }
  };

  const fetchProspects = async () => {
    try {
      const response = await fetch('/api/prospects');
      const data = await response.json();
      if (data.success) {
        setProspects(data.prospects.filter(p => p.status === 'active'));
      }
    } catch (error) {
      console.error('Failed to fetch prospects:', error);
    }
  };

  const selectProspect = (prospect) => {
    setSelectedProspect(prospect._id);
    setToEmail(prospect.email);
    setShowProspectPicker(false);
    
    // Auto-personalize if template variables exist
    let personalizedSubject = subject;
    let personalizedContent = content;
    
    if (subject.includes('{{') || content.includes('{{')) {
      personalizedSubject = personalizeContent(subject, prospect);
      personalizedContent = personalizeContent(content, prospect);
      setSubject(personalizedSubject);
      setContent(personalizedContent);
    }
  };

  const personalizeContent = (template, prospect) => {
    return template
      .replace(/\{\{first_name\}\}/g, prospect.firstName || '')
      .replace(/\{\{last_name\}\}/g, prospect.lastName || '')
      .replace(/\{\{company\}\}/g, prospect.company || '')
      .replace(/\{\{city\}\}/g, prospect.city || '')
      .replace(/\{\{neighborhood\}\}/g, prospect.neighborhood || '')
      .replace(/\{\{listing_price\}\}/g, prospect.listingPrice || '');
  };

  const sendEmail = async () => {
    if (!selectedMailbox || !toEmail || !subject || !content) {
      alert('Please fill all required fields');
      return;
    }

    setSending(true);
    
    try {
      const response = await fetch('/api/compose/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mailboxId: selectedMailbox,
          toEmail: toEmail,
          prospectId: selectedProspect || null,
          subject: subject,
          content: content
        })
      });

      const data = await response.json();
      
      if (data.success) {
        alert('Email sent successfully!');
        router.push(`/emails/${data.messageId}`);
      } else {
        alert(`Failed to send email: ${data.error}`);
      }
    } catch (error) {
      console.error('Failed to send email:', error);
      alert('Failed to send email');
    } finally {
      setSending(false);
    }
  };

  const insertTemplate = (templateText) => {
    setContent(content + templateText);
  };

  return (
    <div className="px-4">
      <div className="flex items-center space-x-3 mb-6">
        <Link href="/emails" className="text-gray-500 hover:text-gray-700">
          ← Back to Emails
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Compose Email</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Compose Area */}
        <div className="lg:col-span-3">
          <div className="card">
            <div className="space-y-4">
              {/* From Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  From *
                </label>
                <select
                  value={selectedMailbox}
                  onChange={(e) => setSelectedMailbox(e.target.value)}
                  className="input-field"
                  required
                >
                  <option value="">Select mailbox...</option>
                  {mailboxes.map((mailbox) => (
                    <option key={mailbox._id} value={mailbox._id}>
                      {mailbox.fromName} ({mailbox.fromEmail})
                    </option>
                  ))}
                </select>
              </div>

              {/* To Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  To *
                </label>
                <div className="flex space-x-2">
                  <input
                    type="email"
                    value={toEmail}
                    onChange={(e) => setToEmail(e.target.value)}
                    placeholder="recipient@domain.com"
                    className="input-field flex-1"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowProspectPicker(!showProspectPicker)}
                    className="btn-secondary px-3"
                  >
                    📋 Pick
                  </button>
                </div>
                
                {/* Prospect Picker */}
                {showProspectPicker && (
                  <div className="mt-2 border rounded-lg bg-white shadow-lg max-h-48 overflow-y-auto">
                    {prospects.map((prospect) => (
                      <button
                        key={prospect._id}
                        onClick={() => selectProspect(prospect)}
                        className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b last:border-b-0"
                      >
                        <div className="font-medium">{prospect.firstName} {prospect.lastName}</div>
                        <div className="text-sm text-gray-600">{prospect.email}</div>
                        {prospect.company && <div className="text-xs text-gray-500">{prospect.company}</div>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Subject */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subject *
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Email subject line"
                  className="input-field"
                  required
                />
              </div>

              {/* Content */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message *
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={12}
                  placeholder="Write your email content here..."
                  className="input-field"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Supports HTML and variables: {'{{'} first_name{'}}'}, {'{{'} company{'}}'}, {'{{'} city{'}}'}
                </p>
              </div>

              {/* Actions */}
              <div className="flex justify-between">
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => insertTemplate('\n\nBest regards,\n[Your name]')}
                    className="btn-secondary text-sm"
                  >
                    Add Signature
                  </button>
                  <button
                    type="button"
                    onClick={() => insertTemplate('Hi {{first_name}},\n\n')}
                    className="btn-secondary text-sm"
                  >
                    Add Greeting
                  </button>
                </div>
                
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => router.push('/emails')}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={sendEmail}
                    disabled={sending}
                    className="btn-primary"
                  >
                    {sending ? 'Sending...' : '📤 Send Email'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-3">Quick Actions</h3>
            <div className="space-y-2">
              <Link href="/test/deliverability" className="btn-secondary w-full text-center block text-sm">
                🧪 Test Deliverability
              </Link>
              <Link href="/campaigns/new" className="btn-secondary w-full text-center block text-sm">
                📋 Create Campaign
              </Link>
              <Link href="/prospects" className="btn-secondary w-full text-center block text-sm">
                👥 Manage Prospects
              </Link>
            </div>
          </div>

          {/* Templates */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-3">Quick Templates</h3>
            <div className="space-y-2 text-xs">
              <button
                onClick={() => setContent(`Hi {{first_name}},

I hope this email finds you well. I wanted to reach out regarding an opportunity that might interest you.

{{company}} has been doing great work in {{city}}, and I thought you'd be interested in hearing about our latest project.

Would you be available for a brief call this week to discuss?

Best regards,
[Your name]`)}
                className="w-full text-left p-2 bg-gray-50 hover:bg-gray-100 rounded border"
              >
                💼 Business Introduction
              </button>
              
              <button
                onClick={() => setContent(`Hi {{first_name}},

I noticed your property listing in {{neighborhood}} and wanted to reach out with a quick question.

We've been working with several homeowners in {{city}} and have had some great success stories.

Would you be open to a brief conversation about your goals for the property?

Best,
[Your name]`)}
                className="w-full text-left p-2 bg-gray-50 hover:bg-gray-100 rounded border"
              >
                🏠 Real Estate Follow-up
              </button>

              <button
                onClick={() => setContent(`Hi {{first_name}},

Thank you for your time during our previous conversation. I wanted to follow up on the points we discussed.

As mentioned, {{company}} could benefit from the solutions we offer, especially given your presence in {{city}}.

Let me know if you'd like to schedule a follow-up call.

Best regards,
[Your name]`)}
                className="w-full text-left p-2 bg-gray-50 hover:bg-gray-100 rounded border"
              >
                🔄 Follow-up Template
              </button>
            </div>
          </div>

          {/* Tracking Info */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-3">📊 Tracking Features</h3>
            <div className="text-xs text-gray-600 space-y-1">
              <p>✅ Open tracking (pixel)</p>
              <p>✅ Click tracking (links)</p>
              <p>✅ Reply detection</p>
              <p>✅ Bounce handling</p>
              <p>✅ Delivery confirmation</p>
              <p>✅ Real-time analytics</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
