'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import FlowCanvas from '@/components/FlowBuilder/FlowCanvas';

/**
 * Flow Builder Page for a specific campaign
 * Provides n8n-style visual email sequence building
 */
export default function FlowBuilderPage({ params }) {
  const router = useRouter();
  const [campaign, setCampaign] = useState(null);
  const [flow, setFlow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [saveStatus, setSaveStatus] = useState(null);

  // Fetch campaign and flow data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const { id } = await params;
        
        // Fetch campaign
        const campaignRes = await fetch(`/api/campaigns/${id}`);
        const campaignData = await campaignRes.json();
        
        if (!campaignData.success) {
          throw new Error(campaignData.error || 'Failed to load campaign');
        }
        setCampaign(campaignData.campaign);
        
        // Fetch flow
        const flowRes = await fetch(`/api/campaigns/${id}/flow`);
        const flowData = await flowRes.json();
        
        if (flowData.success && flowData.data) {
          setFlow(flowData.data);
        } else {
          // Create default flow structure if none exists
          setFlow({
            nodes: [
              {
                id: 'start-1',
                type: 'start',
                position: { x: 250, y: 0 },
                data: { label: 'Campaign Start' }
              }
            ],
            edges: []
          });
        }
        
      } catch (err) {
        console.error('Error loading flow builder:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [params]);

  // Save flow to backend
  const handleSave = useCallback(async (flowData) => {
    setSaving(true);
    setSaveStatus(null);
    
    try {
      const { id } = await params;
      
      const res = await fetch(`/api/campaigns/${id}/flow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(flowData)
      });
      
      const data = await res.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to save flow');
      }
      
      setFlow(data.data);
      setSaveStatus('saved');
      
      // Clear save status after 3 seconds
      setTimeout(() => setSaveStatus(null), 3000);
      
    } catch (err) {
      console.error('Error saving flow:', err);
      setSaveStatus('error');
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }, [params]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading flow builder...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Flow</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Link 
            href={`/campaigns/${params.id}`}
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Campaign
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href={`/campaigns/${campaign?._id}`}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">
              Flow Builder
            </h1>
            <p className="text-sm text-gray-500">
              {campaign?.name || 'Loading...'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Save Status */}
          {saveStatus === 'saved' && (
            <div className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-1.5 rounded-lg">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm">Saved</span>
            </div>
          )}
          {saveStatus === 'error' && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 px-3 py-1.5 rounded-lg">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">Save failed</span>
            </div>
          )}
          {saving && (
            <div className="flex items-center gap-2 text-blue-600">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Saving...</span>
            </div>
          )}
        </div>
      </header>
      
      {/* Flow Canvas */}
      <div className="flex-1 overflow-hidden">
        {flow && (
          <FlowCanvas
            initialNodes={flow.nodes || []}
            initialEdges={flow.edges || []}
            onSave={handleSave}
            campaignId={campaign?._id}
            campaignName={campaign?.name}
          />
        )}
      </div>
    </div>
  );
}
