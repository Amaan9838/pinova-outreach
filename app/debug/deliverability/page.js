'use client';

import { useState, useEffect } from 'react';

export default function DeliverabilityDebugPage() {
  const [testResults, setTestResults] = useState(null);
  const [testing, setTesting] = useState(false);

  const runDeliverabilityCheck = async () => {
    setTesting(true);
    
    const checks = {
      environment: {},
      tracking: {},
      smtp: {},
      recommendations: []
    };

    try {
      // Check environment variables
      checks.environment.appUrl = process.env.NEXT_PUBLIC_APP_URL || 'NOT_SET';
      checks.environment.isLocalhost = checks.environment.appUrl.includes('localhost');
      
      // Test tracking pixel
      try {
        const testTrackingId = 'test-' + Date.now();
        const pixelResponse = await fetch(`/api/track/open/${testTrackingId}.gif`);
        checks.tracking.pixelWorks = pixelResponse.ok;
        checks.tracking.pixelStatus = pixelResponse.status;
      } catch (error) {
        checks.tracking.pixelWorks = false;
        checks.tracking.error = error.message;
      }

      // Check mailboxes
      try {
        const mailboxResponse = await fetch('/api/mailboxes');
        const mailboxData = await mailboxResponse.json();
        if (mailboxData.success) {
          checks.smtp.totalMailboxes = mailboxData.mailboxes.length;
          checks.smtp.activeMailboxes = mailboxData.mailboxes.filter(m => m.status === 'active').length;
          checks.smtp.hasGmail = mailboxData.mailboxes.some(m => m.fromEmail.includes('gmail.com'));
          checks.smtp.hasGodaddy = mailboxData.mailboxes.some(m => m.isp === 'godaddy');
          checks.smtp.hasDKIM = mailboxData.mailboxes.some(m => m.dkimPrivateKey);
        }
      } catch (error) {
        checks.smtp.error = error.message;
      }

      // Generate recommendations
      if (checks.environment.isLocalhost) {
        checks.recommendations.push('❌ CRITICAL: localhost URLs cannot be tracked by email clients');
      }
      
      if (!checks.tracking.pixelWorks) {
        checks.recommendations.push('❌ Tracking pixel endpoint not working');
      }
      
      if (checks.smtp.hasGmail) {
        checks.recommendations.push('⚠️ Gmail SMTP has strict limits - consider dedicated ESP');
      }
      
      if (!checks.smtp.hasDKIM) {
        checks.recommendations.push('⚠️ No DKIM configured - may affect deliverability');
      }
      
      if (checks.smtp.activeMailboxes === 0) {
        checks.recommendations.push('❌ No active mailboxes found');
      }

      // Add positive recommendations
      if (checks.environment.appUrl.includes('vercel.app')) {
        checks.recommendations.push('✅ Deployed on Vercel - tracking should work');
      }
      
      if (checks.tracking.pixelWorks) {
        checks.recommendations.push('✅ Tracking pixel working correctly');
      }

      setTestResults(checks);
      
    } catch (error) {
      console.error('Deliverability check error:', error);
      setTestResults({ error: error.message });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Deliverability Diagnostics</h1>
        <p className="text-gray-600">Debug tracking and deliverability issues</p>
      </div>

      <div className="space-y-6">
        {/* Run Test */}
        <div className="card">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">System Health Check</h2>
              <p className="text-sm text-gray-600">Test tracking, SMTP, and environment setup</p>
            </div>
            <button
              onClick={runDeliverabilityCheck}
              disabled={testing}
              className="btn-primary"
            >
              {testing ? 'Testing...' : '🔍 Run Diagnostics'}
            </button>
          </div>
        </div>

        {/* Results */}
        {testResults && (
          <div className="space-y-4">
            {/* Environment */}
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-3">Environment</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>App URL:</span>
                  <span className="font-mono text-xs">{testResults.environment?.appUrl}</span>
                </div>
                <div className="flex justify-between">
                  <span>Is Localhost:</span>
                  <span className={testResults.environment?.isLocalhost ? 'text-red-600' : 'text-green-600'}>
                    {testResults.environment?.isLocalhost ? 'YES (BAD)' : 'NO (GOOD)'}
                  </span>
                </div>
              </div>
            </div>

            {/* Tracking */}
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-3">Email Tracking</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Pixel Endpoint:</span>
                  <span className={testResults.tracking?.pixelWorks ? 'text-green-600' : 'text-red-600'}>
                    {testResults.tracking?.pixelWorks ? 'WORKING' : 'FAILED'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Status Code:</span>
                  <span>{testResults.tracking?.pixelStatus || 'N/A'}</span>
                </div>
                {testResults.tracking?.error && (
                  <div className="text-red-600 text-xs">{testResults.tracking.error}</div>
                )}
              </div>
            </div>

            {/* SMTP */}
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-3">SMTP Configuration</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Total Mailboxes:</span>
                  <span>{testResults.smtp?.totalMailboxes || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Active Mailboxes:</span>
                  <span className={testResults.smtp?.activeMailboxes > 0 ? 'text-green-600' : 'text-red-600'}>
                    {testResults.smtp?.activeMailboxes || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>DKIM Configured:</span>
                  <span className={testResults.smtp?.hasDKIM ? 'text-green-600' : 'text-yellow-600'}>
                    {testResults.smtp?.hasDKIM ? 'YES' : 'NO'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Using Gmail:</span>
                  <span className={testResults.smtp?.hasGmail ? 'text-yellow-600' : 'text-green-600'}>
                    {testResults.smtp?.hasGmail ? 'YES (RISKY)' : 'NO'}
                  </span>
                </div>
              </div>
            </div>

            {/* Recommendations */}
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-3">Recommendations</h3>
              <div className="space-y-2">
                {testResults.recommendations?.map((rec, index) => (
                  <div key={index} className="text-sm">
                    {rec}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Manual Tests */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-3">Manual Testing</h3>
          <div className="space-y-3 text-sm">
            <div className="bg-blue-50 border border-blue-200 rounded p-3">
              <h4 className="font-medium text-blue-800">Test Tracking Pixel</h4>
              <p className="text-blue-700 text-xs mt-1">
                Visit: <code>{typeof window !== 'undefined' ? window.location.origin : ''}/api/track/open/test-123.gif</code>
              </p>
              <p className="text-blue-600 text-xs">Should return a 1x1 transparent image</p>
            </div>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
              <h4 className="font-medium text-yellow-800">Test Email Headers</h4>
              <p className="text-yellow-700 text-xs mt-1">
                Send test email and check raw headers for:
              </p>
              <ul className="text-yellow-600 text-xs mt-1">
                <li>• Authentication-Results: spf=pass</li>
                <li>• dkim=pass (if DKIM configured)</li>
                <li>• dmarc=pass</li>
              </ul>
            </div>

            <div className="bg-green-50 border border-green-200 rounded p-3">
              <h4 className="font-medium text-green-800">Deliverability Tools</h4>
              <div className="text-green-700 text-xs mt-1 space-y-1">
                <p>• <a href="https://mail-tester.com" target="_blank" className="underline">mail-tester.com</a> - Spam score test</p>
                <p>• <a href="https://mxtoolbox.com/spf.aspx" target="_blank" className="underline">mxtoolbox.com</a> - SPF/DKIM check</p>
                <p>• Gmail Postmaster Tools - Domain reputation</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
