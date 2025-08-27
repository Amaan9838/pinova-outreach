'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function NewCampaignPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [mailboxes, setMailboxes] = useState([]);
  const [prospects, setProspects] = useState([]);
  
  const [campaign, setCampaign] = useState({
    name: '',
    description: '',
    persona: 'luxury-realtor',
    goal: 'generate-leads',
    sequence: [
      {
        stepNumber: 1,
        subject: 'Question about {{neighborhood}} market',
        template: "Hi {{first_name}},\\n\\nI hope this email finds you well.\\n\\nI\\'m reaching out because I noticed your presence in the {{neighborhood}} area and thought you might be interested in discussing some market opportunities.\\n\\nWould you have a few minutes for a brief conversation this week?\\n\\nBest regards,\\n[Your name]",
        waitHours: 24,
        conditions: {
          ifOpened: 'continue',
          ifReplied: 'stop',
          ifBounced: 'stop'
        }
      }
    ],
    selectedMailboxes: [],
    selectedProspects: [],
    settings: {
      sendTimeStart: '09:00',
      sendTimeEnd: '17:00',
      timezone: 'America/New_York',
      skipWeekends: true,
      dailyLimit: 50
    }
  });

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

  const addSequenceStep = () => {
    const newStep = {
      stepNumber: campaign.sequence.length + 1,
      subject: '',
      template: '',
      waitHours: 24,
      conditions: {
        ifOpened: 'continue',
        ifReplied: 'stop',
        ifBounced: 'stop'
      }
    };
    setCampaign({
      ...campaign,
      sequence: [...campaign.sequence, newStep]
    });
  };

  const updateSequenceStep = (index, field, value) => {
    const updatedSequence = campaign.sequence.map((step, i) => 
      i === index ? { ...step, [field]: value } : step
    );
    setCampaign({ ...campaign, sequence: updatedSequence });
  };

  const removeSequenceStep = (index) => {
    const updatedSequence = campaign.sequence
      .filter((_, i) => i !== index)
      .map((step, i) => ({ ...step, stepNumber: i + 1 }));
    setCampaign({ ...campaign, sequence: updatedSequence });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Create campaign
      const campaignResponse = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...campaign,
          mailboxes: campaign.selectedMailboxes
        })
      });

      const campaignData = await campaignResponse.json();
      if (!campaignData.success) {
        throw new Error(campaignData.error || 'Failed to create campaign');
      }

      // Add prospects to campaign
      if (campaign.selectedProspects.length > 0) {
        const updateResponse = await fetch(`/api/campaigns/${campaignData.campaign._id}/prospects`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prospectIds: campaign.selectedProspects
          })
        });

        const updateData = await updateResponse.json();
        if (!updateData.success) {
          console.error('Failed to add prospects to campaign:', updateData.error);
        }
      }

      router.push('/campaigns');
    } catch (error) {
      console.error('Failed to create campaign:', error);
      alert(error.message || 'Failed to create campaign');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Create New Campaign</h1>
        <p className="text-gray-600">Set up your outreach sequence and targeting</p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
        {/* Basic Information */}
        <div className="card mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Campaign Name
              </label>
              <input
                type="text"
                className="input-field text-black"
                value={campaign.name}
                onChange={(e) => setCampaign({ ...campaign, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Persona
              </label>
              <select
                className="input-field text-black"
                value={campaign.persona}
                onChange={(e) => setCampaign({ ...campaign, persona: e.target.value })}
              >
                <option value="luxury-realtor">Luxury Real Estate Agent</option>
                <option value="property-investor">Property Investor</option>
                <option value="home-seller">Home Seller</option>
                <option value="general">General</option>
              </select>
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              className="input-field text-black"
              rows={3}
              value={campaign.description}
              onChange={(e) => setCampaign({ ...campaign, description: e.target.value })}
              placeholder="Brief description of this campaign's purpose..."
            />
          </div>
        </div>

        {/* Email Sequence */}
        <div className="card mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Email Sequence</h2>
            <button
              type="button"
              onClick={addSequenceStep}
              className="btn-primary"
            >
              Add Step
            </button>
          </div>

          {campaign.sequence.map((step, index) => (
            <div key={index} className="border rounded-lg p-4 mb-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-medium">Step {step.stepNumber}</h3>
                {campaign.sequence.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeSequenceStep(index)}
                    className="text-red-600 hover:text-red-800"
                  >
                    Remove
                  </button>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subject Line
                  </label>
                  <input
                    type="text"
                    className="input-field text-black"
                    value={step.subject}
                    onChange={(e) => updateSequenceStep(index, 'subject', e.target.value)}
                    placeholder={`e.g., Quick question about {{neighborhood}}`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Wait Time (hours)
                  </label>
                  <input
                    type="number"
                    className="input-field text-black"
                    value={step.waitHours}
                    onChange={(e) => updateSequenceStep(index, 'waitHours', parseInt(e.target.value))}
                    min="1"
                  />
                </div>
              </div>
              
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Template
                </label>
                <textarea
                  className="input-field text-black"
                  rows={6}
                  value={step.template}
                  onChange={(e) => updateSequenceStep(index, 'template', e.target.value)}
                  placeholder={`Hi {{first_name}},\n\nYour personalized message here...\n\nBest regards,\n[Your name]`}
                />
                <p className="text-sm text-gray-500 mt-1">
                  Use variables: {'{'}{'{'} first_name {'}'}{'}'},  {'{'}{'{'} last_name {'}'}{'}'},  {'{'}{'{'} company {'}'}{'}'},  {'{'}{'{'} city {'}'}{'}'},  {'{'}{'{'} neighborhood {'}'}{'}'},  {'{'}{'{'} listing_price {'}'}{'}'} 
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Mailbox Selection */}
        <div className="card mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Mailboxes</h2>
          {mailboxes.length === 0 ? (
            <p className="text-gray-500">No active mailboxes available. Please add and activate mailboxes first.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-black">
              {mailboxes.map((mailbox) => (
                <div key={mailbox._id} className="flex items-center">
                  <input
                    type="checkbox"
                    id={`mailbox-${mailbox._id}`}
                    checked={campaign.selectedMailboxes.includes(mailbox._id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setCampaign({
                          ...campaign,
                          selectedMailboxes: [...campaign.selectedMailboxes, mailbox._id]
                        });
                      } else {
                        setCampaign({
                          ...campaign,
                          selectedMailboxes: campaign.selectedMailboxes.filter(id => id !== mailbox._id)
                        });
                      }
                    }}
                    className="mr-2"
                  />
                  <label htmlFor={`mailbox-${mailbox._id}`} className="text-sm">
                    {mailbox.fromName} ({mailbox.fromEmail}) - Daily cap: {mailbox.dailyCap}
                  </label>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Prospect Selection */}
        <div className="card mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Prospects</h2>
          {prospects.length === 0 ? (
            <p className="text-gray-500">No active prospects available. Please add prospects first.</p>
          ) : (
            <div className="max-h-60 overflow-y-auto">
              <div className="grid grid-cols-1 gap-2 text-black">
                {prospects.map((prospect) => (
                  <div key={prospect._id} className="flex items-center">
                    <input
                      type="checkbox"
                      id={`prospect-${prospect._id}`}
                      checked={campaign.selectedProspects.includes(prospect._id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setCampaign({
                            ...campaign,
                            selectedProspects: [...campaign.selectedProspects, prospect._id]
                          });
                        } else {
                          setCampaign({
                            ...campaign,
                            selectedProspects: campaign.selectedProspects.filter(id => id !== prospect._id)
                          });
                        }
                      }}
                      className="mr-2"
                    />
                    <label htmlFor={`prospect-${prospect._id}`} className="text-sm">
                      {prospect.firstName} {prospect.lastName} ({prospect.email})
                      {prospect.company && ` - ${prospect.company}`}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => router.push('/campaigns')}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
          >
            {loading ? 'Creating...' : 'Create Campaign'}
          </button>
        </div>
      </form>
    </div>
  );
}
