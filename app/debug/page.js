'use client';

import { useState, useEffect } from 'react';

export default function DebugPage() {
  const [mailboxes, setMailboxes] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [prospects, setProspects] = useState([]);
  const [messages, setMessages] = useState([]);
  const [testResults, setTestResults] = useState({});
  const [cronStatus, setCronStatus] = useState({ running: false, message: '' });

  useEffect(() => {
    fetchData();
    fetchCronStatus();
  }, []);

  const fetchData = async () => {
    try {
      const [mailboxRes, campaignRes, prospectRes] = await Promise.all([
        fetch('/api/mailboxes'),
        fetch('/api/campaigns'),
        fetch('/api/prospects')
      ]);

      const mailboxData = await mailboxRes.json();
      const campaignData = await campaignRes.json();
      const prospectData = await prospectRes.json();

      setMailboxes(mailboxData.success ? mailboxData.mailboxes : []);
      setCampaigns(campaignData.success ? campaignData.campaigns : []);
      setProspects(prospectData.success ? prospectData.prospects : []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    }
  };

  const fetchCronStatus = async () => {
    try {
      const response = await fetch('/api/cron/setup');
      const data = await response.json();
      setCronStatus(data);
    } catch (error) {
      console.error('Failed to fetch cron status:', error);
    }
  };

  const controlCron = async (action, minutes = 10) => {
    try {
      const response = await fetch('/api/cron/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, intervalMinutes: minutes })
      });
      
      const result = await response.json();
      alert(result.message);
      fetchCronStatus(); // Refresh status
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  const processSequences = async () => {
    try {
      const response = await fetch('/api/cron/process-sequences');
      const result = await response.json();
      alert(JSON.stringify(result, null, 2));
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  const testMailbox = async (mailboxId) => {
    const testEmail = prompt('Enter test email address:');
    if (!testEmail) return;

    try {
      const response = await fetch('/api/test/mailbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mailboxId, testEmail })
      });
      
      const result = await response.json();
      setTestResults({ ...testResults, [mailboxId]: result });
      
      if (result.success) {
        alert('✅ Test email sent successfully!');
      } else {
        alert('❌ Test failed: ' + result.error);
      }
    } catch (error) {
      alert('❌ Error: ' + error.message);
    }
  };

  return (
    <div className="px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Debug Dashboard</h1>
        <p className="text-gray-600">Troubleshoot your Pinova Mail System</p>
      </div>

      {/* Quick Actions */}
      <div className="card mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="flex space-x-4 mb-4">
          <button onClick={processSequences} className="btn-primary">
            Process Sequences Manually
          </button>
          <button onClick={async () => {
            try {
              const res = await fetch('/api/cron/check-replies');
              const data = await res.json();
              alert(data.message || 'Reply check triggered');
            } catch (e) {
              alert('Failed to check replies');
            }
          }} className="btn-secondary">
            Check Replies Now
          </button>
          <button onClick={fetchData} className="btn-secondary">
            Refresh Data
          </button>
        </div>
        
        {/* Cron Job Controls */}
        <div className="border-t pt-4">
          <h3 className="font-medium text-gray-900 mb-2">Automatic Sequence Processing</h3>
          <div className="flex items-center space-x-4 mb-2">
            <span className={`px-2 py-1 rounded text-sm ${cronStatus.running ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {cronStatus.running ? '🟢 Running' : '🔴 Stopped'}
            </span>
            <span className="text-sm text-gray-600">{cronStatus.message}</span>
          </div>
          <div className="flex space-x-2 flex-wrap">
            {!cronStatus.running ? (
              <>
                <button 
                  onClick={() => controlCron('start', 1)} 
                  className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                >
                  Start (Every 1 min)
                </button>
                <button 
                  onClick={() => controlCron('start', 2)} 
                  className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                >
                  Start (Every 2 min)
                </button>
                <button 
                  onClick={() => controlCron('start', 10)} 
                  className="btn-primary text-sm"
                >
                  Start (Every 10 min)
                </button>
              </>
            ) : (
              <button 
                onClick={() => controlCron('stop')} 
                className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
              >
                Stop Auto-Processing
              </button>
            )}
            <button 
              onClick={fetchCronStatus} 
              className="btn-secondary text-sm"
            >
              Refresh Status
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Mailboxes */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Mailboxes ({mailboxes.length})
          </h2>
          {mailboxes.length === 0 ? (
            <p className="text-red-600">❌ No mailboxes configured! Add a mailbox first.</p>
          ) : (
            <div className="space-y-3">
              {mailboxes.map((mailbox) => (
                <div key={mailbox._id} className="border rounded p-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-gray-700">{mailbox.fromName}</p>
                      <p className="text-sm text-gray-600">{mailbox.fromEmail}</p>
                      <p className="text-xs text-gray-500">
                        Status: {mailbox.status} | Daily: {mailbox.dailySent}/{mailbox.dailyCap}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => testMailbox(mailbox._id)}
                        className="text-xs btn-primary"
                      >
                        Test
                      </button>
                    </div>
                  </div>
                  {testResults[mailbox._id] && (
                    <div className={`mt-2 p-2 rounded text-xs ${
                      testResults[mailbox._id].success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {testResults[mailbox._id].message}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Campaigns */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Campaigns ({campaigns.length})
          </h2>
          {campaigns.length === 0 ? (
            <p className="text-yellow-600">⚠️ No campaigns created yet.</p>
          ) : (
            <div className="space-y-3">
              {campaigns.map((campaign) => (
                <div key={campaign._id} className="border rounded p-3">
                  <p className="font-medium text-gray-700">{campaign.name}</p>
                  <p className="text-sm text-gray-600">
                    Status: {campaign.status} | Prospects: {campaign.prospects?.length || 0}
                  </p>
                  <p className="text-xs text-gray-500">
                    Sent: {campaign.stats?.sent || 0} | 
                    Opened: {campaign.stats?.opened || 0} | 
                    Replied: {campaign.stats?.replied || 0}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Prospects */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Prospects ({prospects.length})
          </h2>
          {prospects.length === 0 ? (
            <p className="text-yellow-600">⚠️ No prospects added yet.</p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {prospects.slice(0, 10).map((prospect) => (
                <div key={prospect._id} className="border rounded p-2">
                  <p className="text-sm font-medium text-gray-700">
                    {prospect.firstName} {prospect.lastName}
                  </p>
                  <p className="text-xs text-gray-600">{prospect.email}</p>
                  <p className="text-xs text-gray-500">Status: {prospect.status}</p>
                </div>
              ))}
              {prospects.length > 10 && (
                <p className="text-xs text-gray-500">...and {prospects.length - 10} more</p>
              )}
            </div>
          )}
        </div>

        {/* System Status */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">System Status</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className='text-gray-600'>Database Connection</span>
              <span className="text-green-600">✅ Connected</span>
            </div>
            <div className="flex justify-between">
              <span className='text-gray-600'>Mailboxes Configured</span>
              <span className={mailboxes.length > 0 ? "text-green-600" : "text-red-600"}>
                {mailboxes.length > 0 ? "✅" : "❌"} {mailboxes.length}
              </span>
            </div>
            <div className="flex justify-between">
              <span className='text-gray-600'>Active Campaigns</span>
              <span className={campaigns.filter(c => c.status === 'active').length > 0 ? "text-green-600" : "text-yellow-600"}>
                {campaigns.filter(c => c.status === 'active').length > 0 ? "✅" : "⚠️"} {campaigns.filter(c => c.status === 'active').length}
              </span>
            </div>
            <div className="flex justify-between">
              <span className='text-gray-600'>Total Prospects</span>
              <span className={prospects.length > 0 ? "text-green-600" : "text-yellow-600"}>
                {prospects.length > 0 ? "✅" : "⚠️"} {prospects.length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Troubleshooting Tips */}
      <div className="card mt-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Troubleshooting Tips</h2>
        <div className="space-y-3 text-sm">
          <div>
            <h4 className="font-medium text-gray-900">📧 Emails not sending?</h4>
            <ul className="list-disc list-inside text-gray-600 space-y-1">
              <li>Make sure you have at least one active mailbox</li>
              <li>Check that campaign status is 'active'</li>
              <li>Verify prospects have nextSendAt scheduled</li>
              <li>Click 'Process Sequences Manually' to trigger sending</li>
              <li>Test mailbox SMTP connection using the Test button</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-gray-900">🔧 GoDaddy SMTP Settings</h4>
            <ul className="list-disc list-inside text-gray-600 space-y-1">
              <li>Host: smtpout.secureserver.net</li>
              <li>Port: 587 (TLS) or 465 (SSL)</li>
              <li>Username: Your full GoDaddy email address</li>
              <li>Password: Your email password</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
