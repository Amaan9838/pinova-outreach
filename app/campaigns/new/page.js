'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  ArrowLeft, 
  ArrowRight, 
  Sparkles,
  Upload,
  Users,
  Zap,
  Rocket,
  Loader2,
  CheckCircle,
  Plus,
  Calendar,
  Save,
  UserPlus,
  Database,
  Trash2,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';

/**
 * CAMPAIGN CREATION - Enhanced but Simple
 * Step 1: Name + Add Leads (CSV, Manual, or Import)
 * Step 2: AI writes email + Launch Options (Draft/Schedule/Immediate)
 */

export default function NewCampaignPage() {
  const router = useRouter();
  const fileInputRef = useRef(null);
  
  // State
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [leadTab, setLeadTab] = useState('csv'); // csv, manual, existing
  
  const [campaignData, setCampaignData] = useState({
    name: '',
    goal: '',
    subject: '',
    body: '',
    launchType: 'immediate' // immediate, scheduled, draft
  });
  
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('09:00');
  
  const [leads, setLeads] = useState([]);
  const [csvFileName, setCsvFileName] = useState('');
  
  // Manual lead entry
  const [manualLead, setManualLead] = useState({ firstName: '', email: '', company: '' });
  
  // Existing prospects
  const [existingProspects, setExistingProspects] = useState([]);
  const [selectedProspects, setSelectedProspects] = useState([]);
  const [loadingProspects, setLoadingProspects] = useState(false);

  // Load existing prospects
  useEffect(() => {
    if (leadTab === 'existing' && existingProspects.length === 0) {
      loadExistingProspects();
    }
  }, [leadTab]);

  const loadExistingProspects = async () => {
    setLoadingProspects(true);
    try {
      const res = await fetch('/api/prospects');
      const data = await res.json();
      if (data.success) {
        setExistingProspects(data.prospects || []);
      }
    } catch (err) {
      toast.error('Failed to load prospects');
    } finally {
      setLoadingProspects(false);
    }
  };

  // CSV import
  const handleCSVUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setCsvFileName(file.name);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csv = e.target.result;
        const lines = csv.split('\n');
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        
        const emailIdx = headers.findIndex(h => h.includes('email'));
        const nameIdx = headers.findIndex(h => h.includes('first') || h.includes('name'));
        const companyIdx = headers.findIndex(h => h.includes('company') || h.includes('org'));
        
        if (emailIdx === -1) {
          toast.error('CSV must have an email column');
          return;
        }

        const imported = [];
        for (let i = 1; i < lines.length; i++) {
          if (!lines[i].trim()) continue;
          const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
          
          const email = values[emailIdx]?.trim();
          if (!email || !email.includes('@')) continue;
          
          // Skip duplicates
          if (leads.some(l => l.email.toLowerCase() === email.toLowerCase())) continue;
          
          imported.push({
            email,
            firstName: values[nameIdx] || email.split('@')[0],
            company: values[companyIdx] || ''
          });
        }

        if (imported.length > 0) {
          setLeads(prev => [...prev, ...imported]);
          toast.success(`Imported ${imported.length} prospects`);
        } else {
          toast.error('No new valid emails found');
        }
      } catch (err) {
        toast.error('Failed to parse CSV');
      }
    };
    reader.readAsText(file);
  };

  // Add manual lead
  const addManualLead = () => {
    if (!manualLead.email.trim() || !manualLead.email.includes('@')) {
      toast.error('Enter a valid email');
      return;
    }
    if (leads.some(l => l.email.toLowerCase() === manualLead.email.toLowerCase())) {
      toast.error('Email already added');
      return;
    }
    
    setLeads(prev => [...prev, {
      email: manualLead.email.trim(),
      firstName: manualLead.firstName.trim() || manualLead.email.split('@')[0],
      company: manualLead.company.trim() || ''
    }]);
    setManualLead({ firstName: '', email: '', company: '' });
    toast.success('Prospect added');
  };

  // Add from existing
  const addSelectedExisting = () => {
    const toAdd = existingProspects.filter(p => 
      selectedProspects.includes(p._id) && 
      !leads.some(l => l.email.toLowerCase() === p.email.toLowerCase())
    );
    
    if (toAdd.length === 0) {
      toast.error('No new prospects to add');
      return;
    }
    
    setLeads(prev => [...prev, ...toAdd.map(p => ({
      email: p.email,
      firstName: p.firstName,
      company: p.company || ''
    }))]);
    setSelectedProspects([]);
    toast.success(`Added ${toAdd.length} prospects`);
  };

  // Remove lead
  const removeLead = (email) => {
    setLeads(prev => prev.filter(l => l.email !== email));
  };

  // AI email generation
  const generateEmailWithAI = async () => {
    if (!campaignData.goal.trim()) {
      toast.error('Tell us what you\'re selling');
      return;
    }

    setAiGenerating(true);
    try {
      const res = await fetch('/api/ai/generate-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal: campaignData.goal,
          prospectSample: leads[0] || null
        })
      });
      
      const data = await res.json();
      if (data.success) {
        setCampaignData(prev => ({
          ...prev,
          subject: data.subject,
          body: data.body
        }));
        toast.success('AI generated your email!');
      } else {
        // Fallback template
        setCampaignData(prev => ({
          ...prev,
          subject: `Quick question about {{company}}`,
          body: `Hi {{firstName}},\n\n${campaignData.goal}\n\nWould you be open to a quick 10-minute call this week?\n\nBest,\n[Your Name]`
        }));
      }
    } catch (err) {
      setCampaignData(prev => ({
        ...prev,
        subject: `Quick question about {{company}}`,
        body: `Hi {{firstName}},\n\n${campaignData.goal}\n\nWould you be open to a quick call?\n\nBest,\n[Your Name]`
      }));
    } finally {
      setAiGenerating(false);
    }
  };

  // Create campaign
  const createCampaign = async () => {
    if (!campaignData.name.trim()) {
      toast.error('Enter a campaign name');
      return;
    }
    if (campaignData.launchType !== 'draft' && leads.length === 0) {
      toast.error('Add prospects first or save as draft');
      return;
    }
    if (campaignData.launchType !== 'draft' && (!campaignData.subject.trim() || !campaignData.body.trim())) {
      toast.error('Write your email first or save as draft');
      return;
    }
    if (campaignData.launchType === 'scheduled' && !scheduleDate) {
      toast.error('Select a schedule date');
      return;
    }

    setLoading(true);
    try {
      // Determine status
      let status = 'draft';
      let scheduling = undefined;
      
      if (campaignData.launchType === 'immediate' && leads.length > 0) {
        status = 'active';
      } else if (campaignData.launchType === 'scheduled' && leads.length > 0) {
        status = 'scheduled';
        scheduling = {
          startDateTime: new Date(`${scheduleDate}T${scheduleTime}`),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        };
      }

      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: campaignData.name.trim(),
          description: campaignData.goal,
          persona: 'outreach',
          status,
          sequence: [{
            stepNumber: 1,
            subject: campaignData.subject || 'Hello {{firstName}}',
            template: campaignData.body || 'Hi {{firstName}},'
          }],
          options: { trackOpens: true, trackClicks: true },
          scheduling,
          prospects: leads.map(l => ({
            email: l.email,
            firstName: l.firstName,
            company: l.company || ''
          }))
        })
      });
      
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      
      if (status === 'active') {
        toast.success(`🚀 Campaign launched with ${leads.length} prospects!`);
      } else if (status === 'scheduled') {
        toast.success(`📅 Campaign scheduled for ${scheduleDate}`);
      } else {
        toast.success('Campaign saved as draft');
      }
      
      router.push(`/campaigns/${data.campaign._id}`);
    } catch (err) {
      toast.error(err.message || 'Failed to create campaign');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-2xl mx-auto px-4 py-8">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Button variant="ghost" onClick={() => router.push('/campaigns')} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          
          <div className="flex items-center gap-2">
            <Badge variant={step === 1 ? "default" : "outline"}>1. Setup</Badge>
            <ArrowRight className="h-4 w-4 text-gray-400" />
            <Badge variant={step === 2 ? "default" : "outline"}>2. Email</Badge>
          </div>
        </div>

        {/* Step 1: Name + Leads */}
        {step === 1 && (
          <Card className="border-0 shadow-xl">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-2xl flex items-center justify-center mb-4">
                <Zap className="h-8 w-8 text-blue-600" />
              </div>
              <CardTitle className="text-2xl">New Campaign</CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-6 pt-4">
              {/* Campaign Name */}
              <div>
                <label className="block text-sm font-medium mb-2">Campaign Name *</label>
                <Input
                  placeholder="e.g., Q4 Real Estate Outreach"
                  value={campaignData.name}
                  onChange={(e) => setCampaignData(prev => ({ ...prev, name: e.target.value }))}
                  className="h-12"
                />
              </div>

              {/* Add Leads */}
              <div>
                <label className="block text-sm font-medium mb-2">Add Prospects</label>
                
                <Tabs value={leadTab} onValueChange={setLeadTab}>
                  <TabsList className="grid w-full grid-cols-3 mb-4">
                    <TabsTrigger value="csv" className="gap-1">
                      <Upload className="h-4 w-4" /> CSV
                    </TabsTrigger>
                    <TabsTrigger value="manual" className="gap-1">
                      <UserPlus className="h-4 w-4" /> Manual
                    </TabsTrigger>
                    <TabsTrigger value="existing" className="gap-1">
                      <Database className="h-4 w-4" /> Existing
                    </TabsTrigger>
                  </TabsList>

                  {/* CSV Upload */}
                  <TabsContent value="csv">
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 text-center cursor-pointer hover:border-blue-400 transition-colors"
                    >
                      <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                      <p className="font-medium">Drop CSV or click to upload</p>
                      <p className="text-sm text-gray-500">Must have email column</p>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv"
                      className="hidden"
                      onChange={handleCSVUpload}
                    />
                  </TabsContent>

                  {/* Manual Entry */}
                  <TabsContent value="manual">
                    <div className="space-y-3">
                      <Input
                        placeholder="Email *"
                        value={manualLead.email}
                        onChange={(e) => setManualLead(prev => ({ ...prev, email: e.target.value }))}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          placeholder="First Name"
                          value={manualLead.firstName}
                          onChange={(e) => setManualLead(prev => ({ ...prev, firstName: e.target.value }))}
                        />
                        <Input
                          placeholder="Company"
                          value={manualLead.company}
                          onChange={(e) => setManualLead(prev => ({ ...prev, company: e.target.value }))}
                        />
                      </div>
                      <Button onClick={addManualLead} className="w-full gap-2">
                        <Plus className="h-4 w-4" /> Add Prospect
                      </Button>
                    </div>
                  </TabsContent>

                  {/* Existing Prospects */}
                  <TabsContent value="existing">
                    {loadingProspects ? (
                      <div className="text-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                      </div>
                    ) : existingProspects.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        No existing prospects found
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="max-h-48 overflow-y-auto space-y-2 border rounded-lg p-2">
                          {existingProspects.slice(0, 50).map(p => (
                            <label key={p._id} className="flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded cursor-pointer">
                              <Checkbox
                                checked={selectedProspects.includes(p._id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedProspects(prev => [...prev, p._id]);
                                  } else {
                                    setSelectedProspects(prev => prev.filter(id => id !== p._id));
                                  }
                                }}
                              />
                              <span className="text-sm">{p.firstName} - {p.email}</span>
                            </label>
                          ))}
                        </div>
                        <Button onClick={addSelectedExisting} disabled={selectedProspects.length === 0} className="w-full gap-2">
                          <Plus className="h-4 w-4" /> Add {selectedProspects.length} Selected
                        </Button>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>

              {/* Added Leads List */}
              {leads.length > 0 && (
                <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="font-medium text-green-700 dark:text-green-400">{leads.length} prospects added</span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setLeads([])}>Clear all</Button>
                  </div>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {leads.slice(0, 10).map(l => (
                      <div key={l.email} className="flex items-center justify-between text-sm">
                        <span>{l.firstName} ({l.email})</span>
                        <button onClick={() => removeLead(l.email)} className="text-red-500 hover:text-red-700">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    {leads.length > 10 && <p className="text-sm text-gray-500">...and {leads.length - 10} more</p>}
                  </div>
                </div>
              )}

              {/* Next Button */}
              <Button 
                className="w-full h-12 text-lg gap-2"
                onClick={() => setStep(2)}
                disabled={!campaignData.name.trim()}
              >
                Next: Write Email
                <ArrowRight className="h-5 w-5" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Email + Launch */}
        {step === 2 && (
          <Card className="border-0 shadow-xl">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto w-16 h-16 bg-purple-100 dark:bg-purple-900 rounded-2xl flex items-center justify-center mb-4">
                <Sparkles className="h-8 w-8 text-purple-600" />
              </div>
              <CardTitle className="text-2xl">Your Email</CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-6 pt-4">
              {/* AI Generation */}
              <div>
                <label className="block text-sm font-medium mb-2">What are you selling?</label>
                <Input
                  placeholder="e.g., I help real estate agents get more listings"
                  value={campaignData.goal}
                  onChange={(e) => setCampaignData(prev => ({ ...prev, goal: e.target.value }))}
                />
              </div>

              <Button 
                variant="outline"
                className="w-full gap-2"
                onClick={generateEmailWithAI}
                disabled={aiGenerating || !campaignData.goal.trim()}
              >
                {aiGenerating ? (
                  <><Loader2 className="h-5 w-5 animate-spin" /> AI is writing...</>
                ) : (
                  <><Sparkles className="h-5 w-5" /> Generate Email with AI</>
                )}
              </Button>

              {/* Subject & Body */}
              <div>
                <label className="block text-sm font-medium mb-2">Subject Line</label>
                <Input
                  placeholder="Subject..."
                  value={campaignData.subject}
                  onChange={(e) => setCampaignData(prev => ({ ...prev, subject: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Email Body</label>
                <Textarea
                  placeholder="Use {{firstName}} and {{company}} for personalization"
                  value={campaignData.body}
                  onChange={(e) => setCampaignData(prev => ({ ...prev, body: e.target.value }))}
                  rows={6}
                  className="font-mono text-sm"
                />
              </div>

              {/* Launch Options */}
              <div>
                <label className="block text-sm font-medium mb-3">Launch Option</label>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant={campaignData.launchType === 'draft' ? 'default' : 'outline'}
                    onClick={() => setCampaignData(prev => ({ ...prev, launchType: 'draft' }))}
                    className="flex-col h-auto py-3 gap-1"
                  >
                    <Save className="h-5 w-5" />
                    <span className="text-xs">Draft</span>
                  </Button>
                  <Button
                    variant={campaignData.launchType === 'scheduled' ? 'default' : 'outline'}
                    onClick={() => setCampaignData(prev => ({ ...prev, launchType: 'scheduled' }))}
                    className="flex-col h-auto py-3 gap-1"
                  >
                    <Calendar className="h-5 w-5" />
                    <span className="text-xs">Schedule</span>
                  </Button>
                  <Button
                    variant={campaignData.launchType === 'immediate' ? 'default' : 'outline'}
                    onClick={() => setCampaignData(prev => ({ ...prev, launchType: 'immediate' }))}
                    className="flex-col h-auto py-3 gap-1"
                  >
                    <Rocket className="h-5 w-5" />
                    <span className="text-xs">Now</span>
                  </Button>
                </div>
              </div>

              {/* Schedule Date/Time */}
              {campaignData.launchType === 'scheduled' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-2">Date</label>
                    <Input
                      type="date"
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Time</label>
                    <Input
                      type="time"
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                  <ArrowLeft className="h-4 w-4 mr-2" /> Back
                </Button>
                <Button 
                  className={`flex-1 gap-2 ${campaignData.launchType === 'immediate' ? 'bg-green-600 hover:bg-green-700' : ''}`}
                  onClick={createCampaign}
                  disabled={loading}
                >
                  {loading ? (
                    <><Loader2 className="h-5 w-5 animate-spin" /> Creating...</>
                  ) : campaignData.launchType === 'draft' ? (
                    <><Save className="h-5 w-5" /> Save Draft</>
                  ) : campaignData.launchType === 'scheduled' ? (
                    <><Clock className="h-5 w-5" /> Schedule</>
                  ) : (
                    <><Rocket className="h-5 w-5" /> Launch Now</>
                  )}
                </Button>
              </div>

              {/* Summary */}
              <div className="bg-gray-100 dark:bg-gray-800 rounded-xl p-3 text-center text-sm text-gray-600 dark:text-gray-400">
                {campaignData.launchType === 'draft' ? (
                  'Campaign will be saved as draft'
                ) : campaignData.launchType === 'scheduled' ? (
                  `${leads.length} prospects will receive emails on ${scheduleDate || 'selected date'}`
                ) : (
                  `${leads.length} prospects will receive emails immediately`
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
