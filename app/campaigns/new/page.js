'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox'
import { 
  ArrowLeft, 
  ArrowRight, 
  Check, 
  Users, 
  Mail, 
  Settings, 
  Target,
  Sparkles,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle2,
  Lightbulb,
  Zap,
  Plus,
  Upload,
  Trash2,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
// import { AlertCircle } from 'lucide-react';

const WIZARD_STEPS = [
  { id: 'basics', title: 'Campaign Basics', icon: Target, description: 'Name and describe your campaign' },
  { id: 'audience', title: 'Target Audience', icon: Users, description: 'Define your ideal prospects' },
  { id: 'message', title: 'Email Content', icon: Mail, description: 'Craft your outreach message' },
  { id: 'settings', title: 'Campaign Settings', icon: Settings, description: 'Configure timing and options' },
  { id: 'leads', title: 'Add Leads', icon: Users, description: 'Import or add prospects to your campaign' },
  { id: 'schedule', title: 'Schedule Campaign', icon: Calendar, description: 'Choose when to start sending' },
  { id: 'review', title: 'Review & Launch', icon: CheckCircle2, description: 'Final review before launch' }
];

const CAMPAIGN_TEMPLATES = [
  {
    id: 'cold-outreach',
    name: 'Cold Outreach',
    description: 'Professional introduction for new prospects',
    subject: 'Quick question about {{company}}',
    body: 'Hi {{firstName}},\n\nI noticed {{company}} is {{personalizationNote}}. I help companies like yours {{value_proposition}}.\n\nWould you be open to a brief 15-minute call this week?\n\nBest regards,\n{{senderName}}'
  },
  {
    id: 'follow-up',
    name: 'Follow-up Sequence',
    description: 'Gentle follow-up for previous contacts',
    subject: 'Following up on {{company}}',
    body: 'Hi {{firstName}},\n\nI wanted to follow up on my previous email about {{topic}}. I understand you\'re busy, but I believe this could be valuable for {{company}}.\n\nWould you have 10 minutes for a quick chat?\n\nThanks,\n{{senderName}}'
  },
  {
    id: 'partnership',
    name: 'Partnership Proposal',
    description: 'Collaboration and partnership outreach',
    subject: 'Partnership opportunity with {{company}}',
    body: 'Hello {{firstName}},\n\nI\'ve been following {{company}}\'s work in {{industry}} and I\'m impressed by {{achievement}}.\n\nI\'d love to explore a potential partnership that could benefit both our companies.\n\nAre you available for a brief call next week?\n\nBest,\n{{senderName}}'
  }
];

export default function NewCampaignPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [campaignData, setCampaignData] = useState({
    name: '',
    description: '',
    persona: '',
    industry: '',
    companySize: '',
    location: '',
    subject: '',
    body: '',
    template: '',
    followUpEnabled: true,
    followUpDelay: 3,
    maxFollowUps: 2,
    scheduleType: 'immediate',
    startDateTime: '',
    timezone: 'UTC'
  });

  const [errorMessages, setErrorMessages] = useState([]);

  // Leads management state
  const [leads, setLeads] = useState([]);
  const [showAddProspect, setShowAddProspect] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showAddExisting, setShowAddExisting] = useState(false);
  const [availableProspects, setAvailableProspects] = useState([]);
  const [searchAvailableTerm, setSearchAvailableTerm] = useState('');
  const [selectedExistingProspects, setSelectedExistingProspects] = useState([]);
  const [isLoadingProspects, setIsLoadingProspects] = useState(false);
  const [newProspect, setNewProspect] = useState({
    firstName: '',
    email: '',
    additionalEmails: [],
    company: '',
    phone: '',
    website: '',
    industry: '',
    position: '',
    notes: '',
    instagram: '',
    linkedin: '',
    personalizationNote: ''
  });
  const [customFields, setCustomFields] = useState([{ name: '', value: '' }]);

  // Add prospect manually
  const addProspectManually = () => {
    const errors = [];
    if (!newProspect.firstName.trim()) {
      errors.push('First name is required');
    }
    if (!newProspect.email.trim()) {
      errors.push('Email is required');
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(newProspect.email)) {
        errors.push('Please enter a valid email address');
      }
    }

    // Check for duplicate emails
    if (newProspect.email.trim() && leads.some(lead => lead.email.toLowerCase() === newProspect.email.toLowerCase())) {
      errors.push('This email is already added');
    }

    if (errors.length > 0) {
      setErrorMessages(errors);
      return;
    }

    const prospectToAdd = {
      ...newProspect,
      customFields: customFields.reduce((acc, field) => {
        if (field.name.trim() && field.value.trim()) {
          acc[field.name] = field.value;
        }
        return acc;
      }, {})
    };

    setLeads([...leads, prospectToAdd]);
    
    // Reset form
    setNewProspect({
      firstName: '',
      email: '',
      additionalEmails: [],
      company: '',
      phone: '',
      website: '',
      industry: '',
      position: '',
      notes: '',
      instagram: '',
      linkedin: '',
      personalizationNote: ''
    });
    setCustomFields([{ name: '', value: '' }]);
    setErrorMessages([]);
    setShowAddProspect(false);
    
    toast.success('Prospect added successfully!');
  };

  // Import CSV functionality
  const handleCSVImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      setErrorMessages(['Please select a valid CSV file']);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csv = e.target.result;
        const lines = csv.split('\n');
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        
        // Required fields mapping
        const requiredFields = {
          firstName: ['firstname', 'first_name', 'first name', 'name'],
          email: ['email', 'email_address', 'mail']
        };

        // Find column indexes
        const fieldIndexes = {};
        Object.keys(requiredFields).forEach(field => {
          const index = headers.findIndex(h => requiredFields[field].includes(h));
          if (index !== -1) fieldIndexes[field] = index;
        });

        if (!fieldIndexes.firstName || !fieldIndexes.email) {
          setErrorMessages(['CSV must contain firstName and email columns']);
          return;
        }

        // Optional field mapping
        const optionalFields = {
          lastName: ['lastname', 'last_name', 'last name'],
          company: ['company', 'organization', 'org'],
          phone: ['phone', 'telephone', 'mobile'],
          website: ['website', 'url', 'site'],
          position: ['position', 'title', 'job_title', 'role'],
          industry: ['industry', 'sector']
        };

        Object.keys(optionalFields).forEach(field => {
          const index = headers.findIndex(h => optionalFields[field].includes(h));
          if (index !== -1) fieldIndexes[field] = index;
        });

        // Parse data
        const importedLeads = [];
        const errors = [];
        
        for (let i = 1; i < lines.length; i++) {
          if (!lines[i].trim()) continue;
          
          const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
          
          const firstName = values[fieldIndexes.firstName]?.trim();
          const email = values[fieldIndexes.email]?.trim();
          
          if (!firstName || !email) {
            errors.push(`Row ${i + 1}: Missing required fields`);
            continue;
          }

          // Email validation
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(email)) {
            errors.push(`Row ${i + 1}: Invalid email format`);
            continue;
          }

          // Check for duplicates
          if (leads.some(lead => lead.email.toLowerCase() === email.toLowerCase()) ||
              importedLeads.some(lead => lead.email.toLowerCase() === email.toLowerCase())) {
            errors.push(`Row ${i + 1}: Duplicate email`);
            continue;
          }

          const prospect = {
            firstName,
            email,
            lastName: values[fieldIndexes.lastName] || '',
            company: values[fieldIndexes.company] || '',
            phone: values[fieldIndexes.phone] || '',
            website: values[fieldIndexes.website] || '',
            position: values[fieldIndexes.position] || '',
            industry: values[fieldIndexes.industry] || '',
            notes: '',
            instagram: '',
            linkedin: '',
            personalizationNote: ''
          };

          importedLeads.push(prospect);
        }

        if (importedLeads.length > 0) {
          setLeads([...leads, ...importedLeads]);
          toast.success(`Successfully imported ${importedLeads.length} prospects`);
        }

        if (errors.length > 0) {
          setErrorMessages(errors);
          toast.warning(`${errors.length} rows had errors and were skipped`);
        } else {
          setErrorMessages([]);
        }

        setShowImportModal(false);
      } catch (error) {
        setErrorMessages(['Failed to parse CSV file']);
      }
    };
    
    reader.readAsText(file);
  };

  // Load existing prospects
  const loadExistingProspects = async () => {
    setIsLoadingProspects(true);
    try {
      const res = await fetch('/api/prospects');
      const data = await res.json();
      
      if (data.success) {
        setAvailableProspects(data.prospects || []);
      } else {
        toast.error('Failed to load existing prospects');
      }
    } catch (error) {
      toast.error('Failed to load existing prospects');
    } finally {
      setIsLoadingProspects(false);
    }
  };

  // Add selected existing prospects
  const addSelectedExistingProspects = () => {
    const prospectsToAdd = availableProspects.filter(p => 
      selectedExistingProspects.includes(p._id) &&
      !leads.some(lead => lead.email.toLowerCase() === p.email.toLowerCase())
    );

    if (prospectsToAdd.length === 0) {
      toast.error('No new prospects selected or all are already added');
      return;
    }

    setLeads([...leads, ...prospectsToAdd]);
    setSelectedExistingProspects([]);
    setShowAddExisting(false);
    toast.success(`Added ${prospectsToAdd.length} existing prospects`);
  };

  const updateCampaignData = (field, value) => {
    setCampaignData(prev => ({ ...prev, [field]: value }));
  };

  const nextStep = () => {
    if (currentStep < WIZARD_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleTemplateSelect = (template) => {
    updateCampaignData('template', template.id);
    updateCampaignData('subject', template.subject);
    updateCampaignData('body', template.body);
    setErrorMessages([]); // Clear errors on template select
  };

  // Real-time validation for email in prospect add
  const validateEmailOnBlur = (email) => {
    if (email.trim() && !/^[\w\.-]+@[\w\.-]+\.\w+$/.test(email)) {
      setErrorMessages(prev => [...new Set([...prev, 'Please enter a valid email address'])]);
    } else {
      setErrorMessages(prev => prev.filter(msg => !msg.includes('email address')));
    }
  };

  // Real-time validation for subject and body
  const validateEmailContent = (field, value) => {
    if (field === 'subject' && !value.trim()) {
      setErrorMessages(prev => [...new Set([...prev, 'Subject line is required'])]);
    } else if (field === 'body' && !value.trim()) {
      setErrorMessages(prev => [...new Set([...prev, 'Email body is required'])]);
    } else {
      setErrorMessages(prev => prev.filter(msg =>
        !msg.includes('Subject line is required') && !msg.includes('Email body is required')
      ));
    }
  };

  const handleSubmit = async () => {
    const errors = [];
    if (!campaignData.name.trim()) {
      errors.push('Campaign name is required');
    }
    if (!campaignData.persona.trim()) {
      errors.push('Target persona is required');
    }
    if (!campaignData.subject.trim()) {
      errors.push('Subject line is required');
    }
    if (!campaignData.body.trim()) {
      errors.push('Email body is required');
    }
    if (leads.length === 0) {
      errors.push('No prospects added - campaign will be in draft status');
    }

    if (errors.length > 0) {
      setErrorMessages(errors);
      return;
    }
    
    setLoading(true);
    try {
      setErrorMessages([]);
      // Determine campaign status based on schedule type and leads
      let campaignStatus = 'draft';
      if (campaignData.scheduleType === 'immediate' && leads.length > 0) {
        campaignStatus = 'active';
      } else if (campaignData.scheduleType === 'scheduled' && leads.length > 0) {
        campaignStatus = 'scheduled';
      } else if (campaignData.scheduleType === 'draft') {
        campaignStatus = 'draft';
      }
      
      // Prepare prospects data
      const prospectsData = leads.map(lead => ({
        firstName: lead.firstName,
        lastName: lead.lastName || '',
        email: lead.email,
        company: lead.company || '',
        phone: lead.phone || '',
        website: lead.website || '',
        industry: lead.industry || '',
        position: lead.position || '',
        notes: lead.notes || '',
        instagram: lead.instagram || '',
        linkedin: lead.linkedin || '',
        personalizationNote: lead.personalizationNote || '',
        customFields: lead.customFields || {}
      }));

      // Create the campaign
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: campaignData.name.trim(),
          description: campaignData.description,
          persona: campaignData.persona,
          status: campaignStatus,
          sequence: [{
            stepNumber: 1,
            subject: campaignData.subject,
            template: campaignData.body
          }],
          options: {
            trackOpens: true,
            trackClicks: true,
            unsubscribeLink: true,
            dailyLimit: parseInt(campaignData.dailyLimit) || 50,
            timezone: campaignData.timezone || 'UTC'
          },
          scheduling: campaignData.scheduleType === 'scheduled' ? {
            startDateTime: new Date(campaignData.startDateTime),
            timezone: campaignData.timezone || 'UTC'
          } : undefined,
          prospects: prospectsData
        })
      });
      
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to create campaign');
      
      // Success message based on status
      if (campaignStatus === 'active') {
        toast.success(`Campaign created successfully with ${leads.length} prospects! Sending will begin immediately.`);
      } else {
        toast.success('Campaign created in draft status. Add prospects to activate it.');
      }
      
      router.push(`/campaigns/${data.campaign._id}`);
    } catch (err) {
      setErrorMessages([err.message || 'Failed to create campaign']);
    } finally {
      setLoading(false);
    }
  };
  


  const isStepValid = () => {
    switch (currentStep) {
      case 0: return campaignData.name.trim() !== '';
      case 1: return campaignData.persona.trim() !== '';
      case 2: return campaignData.subject.trim() !== '' && campaignData.body.trim() !== '';
      case 3: return true;
      case 4: return true; // Leads step - always valid (can skip)
      case 5: return true; // Schedule step - always valid (can skip for draft)
      case 6: return true; // Review step - always valid
      default: return false;
    }
  };

  const validateLeadsStep = () => {
    // Validation for leads step - warn if no leads but allow continuation
    return {
      isValid: true,
      hasLeads: leads.length > 0,
      message: leads.length === 0 ? 'Campaign will be created in draft status without leads' : `Campaign ready with ${leads.length} prospects`
    };
  };

  const StepIndicator = () => (
    <div className="flex items-center justify-between mb-8">
      {WIZARD_STEPS.map((step, index) => {
        const isActive = index === currentStep;
        const isCompleted = index < currentStep;
        const Icon = step.icon;
        
        return (
          <div key={step.id} className="flex items-center">
            <div className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-200 ${
              isActive ? 'bg-blue-50 border-2 border-blue-200' : 
              isCompleted ? 'bg-emerald-50 border-2 border-emerald-200' : 
              'bg-gray-50 border-2 border-gray-200'
            }`}>
              <div className={`p-2 rounded-lg ${
                isActive ? 'bg-blue-100' : 
                isCompleted ? 'bg-emerald-100' : 
                'bg-gray-100'
              }`}>
                {isCompleted ? (
                  <Check className="h-5 w-5 text-emerald-600" />
                ) : (
                  <Icon className={`h-5 w-5 ${
                    isActive ? 'text-blue-600' : 'text-gray-600'
                  }`} />
                )}
              </div>
              <div className="hidden md:block">
                <div className={`font-semibold text-sm ${
                  isActive ? 'text-blue-900' : 
                  isCompleted ? 'text-emerald-900' : 
                  'text-gray-700'
                }`}>
                  {step.title}
                </div>
                <div className="text-xs text-gray-600">{step.description}</div>
              </div>
            </div>
            {index < WIZARD_STEPS.length - 1 && (
              <div className={`hidden md:block w-12 h-0.5 mx-4 ${
                isCompleted ? 'bg-emerald-200' : 'bg-gray-200'
              }`} />
            )}
          </div>
        );
      })}
    </div>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Target className="h-6 w-6 text-blue-600" />
                Campaign Basics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Campaign Name *
                </label>
                <Input
                  placeholder="e.g., Q4 Real Estate Outreach"
                  value={campaignData.name}
                  onChange={(e) => updateCampaignData('name', e.target.value)}
                  className="h-12 text-base"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Description
                </label>
                <Textarea
                  placeholder="Describe the goal and strategy of this campaign..."
                  value={campaignData.description}
                  onChange={(e) => updateCampaignData('description', e.target.value)}
                  rows={4}
                  className="text-base"
                />
              </div>
              <div className="bg-blue-50 p-4 rounded-xl">
                <div className="flex items-start gap-3">
                  <Lightbulb className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-blue-900 mb-1">Pro Tip</h4>
                    <p className="text-sm text-blue-700">
                      Use descriptive names that include your target audience and goal. This helps with organization as your campaign list grows.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 1:
        return (
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Users className="h-6 w-6 text-emerald-600" />
                Target Audience
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Ideal Customer Persona *
                </label>
                <Textarea
                  placeholder="e.g., Real estate agents in California with 5+ years experience, focusing on luxury properties..."
                  value={campaignData.persona}
                  onChange={(e) => updateCampaignData('persona', e.target.value)}
                  rows={3}
                  className="text-base"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Industry
                  </label>
                  <Select value={campaignData.industry} onValueChange={(value) => updateCampaignData('industry', value)}>
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Select industry" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="real-estate">Real Estate</SelectItem>
                      <SelectItem value="technology">Technology</SelectItem>
                      <SelectItem value="healthcare">Healthcare</SelectItem>
                      <SelectItem value="finance">Finance</SelectItem>
                      <SelectItem value="retail">Retail</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Company Size
                  </label>
                  <Select value={campaignData.companySize} onValueChange={(value) => updateCampaignData('companySize', value)}>
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Select size" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1-10">1-10 employees</SelectItem>
                      <SelectItem value="11-50">11-50 employees</SelectItem>
                      <SelectItem value="51-200">51-200 employees</SelectItem>
                      <SelectItem value="201-1000">201-1000 employees</SelectItem>
                      <SelectItem value="1000+">1000+ employees</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Geographic Location
                </label>
                <Input
                  placeholder="e.g., California, USA or Global"
                  value={campaignData.location}
                  onChange={(e) => updateCampaignData('location', e.target.value)}
                  className="h-12 text-base"
                />
              </div>
            </CardContent>
          </Card>
        );

      case 2:
        return (
          <div className="space-y-6">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Mail className="h-6 w-6 text-purple-600" />
                  Email Content
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="templates" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-6">
                    <TabsTrigger value="templates">Choose Template</TabsTrigger>
                    <TabsTrigger value="custom">Write Custom</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="templates" className="space-y-4">
                    <div className="grid gap-4">
                      {CAMPAIGN_TEMPLATES.map((template) => (
                        <Card 
                          key={template.id} 
                          className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                            campaignData.template === template.id ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                          }`}
                          onClick={() => handleTemplateSelect(template)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4 className="font-semibold text-gray-900 mb-1">{template.name}</h4>
                                <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                                <div className="text-xs text-gray-500">
                                  <strong>Subject:</strong> {template.subject}
                                </div>
                              </div>
                              {campaignData.template === template.id && (
                                <CheckCircle2 className="h-5 w-5 text-blue-600" />
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="custom" className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">
                        Subject Line *
                      </label>
                      <Input
                        placeholder="Enter your email subject"
                        value={campaignData.subject}
                        onChange={(e) => {
                          updateCampaignData('subject', e.target.value);
                          validateEmailContent('subject', e.target.value);
                        }}
                        className="h-12 text-base"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">
                        Email Body *
                      </label>
                      <Textarea
                        placeholder="Write your email content here..."
                        value={campaignData.body}
                        onChange={(e) => {
                          updateCampaignData('body', e.target.value);
                          validateEmailContent('body', e.target.value);
                        }}
                        rows={8}
                        className="text-base font-mono"
                      />
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
            
            {(campaignData.subject || campaignData.body) && (
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-lg">Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-gray-50 p-4 rounded-xl">
                    <div className="mb-3">
                      <strong className="text-sm text-gray-600">Subject:</strong>
                      <div className="text-gray-900 mt-1">{campaignData.subject || 'No subject'}</div>
                    </div>
                    <div>
                      <strong className="text-sm text-gray-600">Body:</strong>
                      <div className="text-gray-900 mt-1 whitespace-pre-wrap">{campaignData.body || 'No content'}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        );

      case 3:
        return (
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Settings className="h-6 w-6 text-amber-600" />
                Campaign Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Sending Schedule
                  </label>
                  <Select value={campaignData.sendingSchedule} onValueChange={(value) => updateCampaignData('sendingSchedule', value)}>
                    <SelectTrigger className="h-12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="business-hours">Business Hours (9 AM - 5 PM)</SelectItem>
                      <SelectItem value="morning">Morning (8 AM - 12 PM)</SelectItem>
                      <SelectItem value="afternoon">Afternoon (12 PM - 6 PM)</SelectItem>
                      <SelectItem value="anytime">Anytime</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Daily Email Limit
                      </label>
                      <Select value={""} >
                    <SelectTrigger className="h-12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="25">25 emails/day</SelectItem>
                      <SelectItem value="50">50 emails/day</SelectItem>
                      <SelectItem value="100">100 emails/day</SelectItem>
                      <SelectItem value="200">200 emails/day</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="bg-emerald-50 p-4 rounded-xl">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-emerald-900 mb-1">Immediate Start</h4>
                    <p className="text-sm text-emerald-700">
                      Your campaign will start sending emails immediately when prospects are added. No scheduling delays.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 p-4 rounded-xl">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-amber-900 mb-1">Deliverability Best Practices</h4>
                    <p className="text-sm text-amber-700">
                      Start with lower daily limits (25-50) for new campaigns to maintain good sender reputation. You can increase limits as your campaign performs well.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 4:
        return (
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Users className="h-6 w-6 text-blue-600" />
                Add Leads
              </CardTitle>
              <p className="text-gray-600">Import prospects or add them manually to start your campaign</p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Leads Summary */}
              <div className="bg-gray-50 p-4 rounded-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-gray-900">Current Leads</h4>
                    <p className="text-sm text-gray-600">{leads.length} prospect{leads.length !== 1 ? 's' : ''} added</p>
                  </div>
                  <Badge variant={leads.length > 0 ? "default" : "secondary"}>
                    {leads.length > 0 ? `${leads.length} Ready` : 'No leads yet'}
                  </Badge>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button
                  onClick={() => setShowAddProspect(true)}
                  className="h-20 flex flex-col items-center gap-2 bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="h-6 w-6" />
                  <span className="text-sm font-medium">Add Manually</span>
                </Button>

                <Button
                  onClick={() => setShowImportModal(true)}
                  variant="outline"
                  className="h-20 flex flex-col items-center gap-2 border-2 border-dashed"
                >
                  <Upload className="h-6 w-6" />
                  <span className="text-sm font-medium">Import CSV</span>
                </Button>

                <Button
                  onClick={() => {
                    setShowAddExisting(true);
                    loadExistingProspects();
                  }}
                  variant="outline"
                  className="h-20 flex flex-col items-center gap-2"
                >
                  <Users className="h-6 w-6" />
                  <span className="text-sm font-medium">Add Existing</span>
                </Button>
              </div>

              {/* Leads List Preview */}
              {leads.length > 0 && (
                <div className="border rounded-lg">
                  <div className="p-4 border-b bg-gray-50">
                    <h4 className="font-semibold text-gray-900">Prospects Preview</h4>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {leads.slice(0, 5).map((lead, index) => (
                      <div key={index} className="p-3 border-b last:border-b-0 flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-900">
                            {lead.firstName} {lead.lastName}
                          </div>
                          <div className="text-sm text-gray-600">{lead.email}</div>
                          {lead.company && (
                            <div className="text-xs text-gray-500">{lead.company}</div>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setLeads(leads.filter((_, i) => i !== index))}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    {leads.length > 5 && (
                      <div className="p-3 text-center text-sm text-gray-500">
                        And {leads.length - 5} more prospect{leads.length - 5 !== 1 ? 's' : ''}...
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Info Messages */}
              {leads.length === 0 && (
                <div className="bg-amber-50 p-4 rounded-xl">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-amber-900 mb-1">No Prospects Added</h4>
                      <p className="text-sm text-amber-700">
                        Your campaign will be created in <strong>draft status</strong> and won't send any emails until you add prospects. You can add them later from the campaign dashboard.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {leads.length > 0 && (
                <div className="bg-emerald-50 p-4 rounded-xl">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-emerald-900 mb-1">Ready to Launch!</h4>
                      <p className="text-sm text-emerald-700">
                        Your campaign will be created with {leads.length} prospect{leads.length !== 1 ? 's' : ''} and can start sending immediately.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );

      case 5:
        return (
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Calendar className="h-6 w-6 text-purple-600" />
                Schedule Campaign
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-purple-50 p-4 rounded-xl">
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-purple-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-purple-900 mb-1">Campaign Scheduling</h4>
                    <p className="text-sm text-purple-700">
                      Choose when to start your campaign. You can schedule it for later or start immediately.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Start Option
                  </label>
                  <Select value={campaignData.scheduleType || 'immediate'} onValueChange={(value) => updateCampaignData('scheduleType', value)}>
                    <SelectTrigger className="h-12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="immediate">Start Immediately</SelectItem>
                      <SelectItem value="scheduled">Schedule for Later</SelectItem>
                      <SelectItem value="draft">Save as Draft</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {campaignData.scheduleType === 'scheduled' && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Start Date & Time
                    </label>
                    <Input
                      type="datetime-local"
                      value={campaignData.startDateTime || ''}
                      onChange={(e) => updateCampaignData('startDateTime', e.target.value)}
                      className="h-12"
                      min={new Date().toISOString().slice(0, 16)}
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Timezone
                </label>
                <Select value={campaignData.timezone || 'UTC'} onValueChange={(value) => updateCampaignData('timezone', value)}>
                  <SelectTrigger className="h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UTC">UTC (Coordinated Universal Time)</SelectItem>
                    <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                    <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                    <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                    <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                    <SelectItem value="Europe/London">London (GMT/BST)</SelectItem>
                    <SelectItem value="Europe/Paris">Paris (CET/CEST)</SelectItem>
                    <SelectItem value="Asia/Tokyo">Tokyo (JST)</SelectItem>
                    <SelectItem value="Asia/Kolkata">India (IST)</SelectItem>
                    <SelectItem value="Australia/Sydney">Sydney (AEST/AEDT)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {campaignData.scheduleType === 'immediate' && (
                <div className="bg-green-50 p-4 rounded-xl">
                  <div className="flex items-start gap-3">
                    <Zap className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-green-900 mb-1">Ready to Start!</h4>
                      <p className="text-sm text-green-700">
                        Your campaign will begin sending emails immediately after creation, following your configured timing settings.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {campaignData.scheduleType === 'scheduled' && (
                <div className="bg-blue-50 p-4 rounded-xl">
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-blue-900 mb-1">Scheduled Campaign</h4>
                      <p className="text-sm text-blue-700">
                        Your campaign will be created and scheduled to start at the specified time. You can modify the schedule before it begins.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {campaignData.scheduleType === 'draft' && (
                <div className="bg-gray-50 p-4 rounded-xl">
                  <div className="flex items-start gap-3">
                    <FileText className="h-5 w-5 text-gray-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">Draft Mode</h4>
                      <p className="text-sm text-gray-700">
                        Your campaign will be saved as a draft. You can complete setup and schedule it later from the campaigns dashboard.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );

      case 6:
        return (
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                Review & Launch
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4">
                <div className="p-4 bg-gray-50 rounded-xl">
                  <h4 className="font-semibold text-gray-900 mb-2">Campaign Overview</h4>
                  <div className="space-y-2 text-sm">
                    <div><strong>Name:</strong> {campaignData.name}</div>
                    <div><strong>Target:</strong> {campaignData.persona}</div>
                    <div><strong>Subject:</strong> {campaignData.subject}</div>
                    <div><strong>Prospects:</strong> {leads.length} added</div>
                    <div><strong>Status:</strong>
                      <Badge variant={leads.length > 0 ? "default" : "secondary"} className="ml-2">
                        {leads.length > 0 ? 'Active (Ready to Send)' : 'Draft (No Prospects)'}
                      </Badge>
                    </div>
                  </div>
                </div>

                {leads.length > 0 ? (
                  <div className="bg-emerald-50 p-4 rounded-xl">
                    <div className="flex items-start gap-3">
                      <Zap className="h-5 w-5 text-emerald-600 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-emerald-900 mb-1">Ready to Launch!</h4>
                        <p className="text-sm text-emerald-700">
                          Your campaign will be created with <strong>{leads.length} prospect{leads.length !== 1 ? 's' : ''}</strong> and will start sending emails immediately according to your settings.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-amber-50 p-4 rounded-xl">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-amber-900 mb-1">Draft Campaign</h4>
                        <p className="text-sm text-amber-700">
                          Your campaign will be created in <strong>draft status</strong> and won't send any emails. Add prospects from the campaign dashboard to activate it and begin sending.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Button variant="ghost" onClick={() => router.push('/campaigns')} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Campaigns
            </Button>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Create New Campaign</h1>
          <p className="text-gray-600">Follow the steps below to set up your outreach campaign</p>
          
          {/* Progress */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                Step {currentStep + 1} of {WIZARD_STEPS.length}
              </span>
              <span className="text-sm text-gray-500">
                {Math.round(((currentStep + 1) / WIZARD_STEPS.length) * 100)}% Complete
              </span>
            </div>
            <Progress value={((currentStep + 1) / WIZARD_STEPS.length) * 100} className="h-2" />
          </div>
        </div>

        {/* Step Indicator */}
        <StepIndicator />

        {/* Step Content */}
        <div className="mb-8">
          {renderStepContent()}
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <Button 
            variant="outline" 
            onClick={prevStep} 
            disabled={currentStep === 0}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Previous
          </Button>
          
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => router.push('/campaigns')}>
              Cancel
            </Button>
            
            {currentStep === WIZARD_STEPS.length - 1 ? (
              <Button 
                onClick={handleSubmit} 
                disabled={loading || !isStepValid()}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    Creating...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Create Campaign
                  </>
                )}
              </Button>
            ) : (
              <Button 
                onClick={nextStep} 
                disabled={!isStepValid()}
                className="gap-2"
              >
                Next
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Add Prospect Modal */}
        {showAddProspect && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Add Prospect Manually</h3>
                  <Button variant="ghost" size="sm" onClick={() => setShowAddProspect(false)}>
                    ×
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">First Name *</label>
                    <Input
                      value={newProspect.firstName}
                      onChange={(e) => setNewProspect({...newProspect, firstName: e.target.value})}
                      placeholder="John"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Last Name</label>
                    <Input
                      value={newProspect.lastName}
                      onChange={(e) => setNewProspect({...newProspect, lastName: e.target.value})}
                      placeholder="Doe"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1">Email *</label>
                    <Input
                      type="email"
                      value={newProspect.email}
                      onChange={(e) => setNewProspect({...newProspect, email: e.target.value})}
                      onBlur={(e) => validateEmailOnBlur(e.target.value)}
                      placeholder="john@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Company</label>
                    <Input
                      value={newProspect.company}
                      onChange={(e) => setNewProspect({...newProspect, company: e.target.value})}
                      placeholder="Company Name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Position</label>
                    <Input
                      value={newProspect.position}
                      onChange={(e) => setNewProspect({...newProspect, position: e.target.value})}
                      placeholder="Job Title"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Phone</label>
                    <Input
                      value={newProspect.phone}
                      onChange={(e) => setNewProspect({...newProspect, phone: e.target.value})}
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Website</label>
                    <Input
                      value={newProspect.website}
                      onChange={(e) => setNewProspect({...newProspect, website: e.target.value})}
                      placeholder="https://example.com"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1">Personalization Note</label>
                    <Textarea
                      value={newProspect.personalizationNote}
                      onChange={(e) => setNewProspect({...newProspect, personalizationNote: e.target.value})}
                      placeholder="Something specific about this prospect..."
                      rows={2}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <Button variant="outline" onClick={() => setShowAddProspect(false)}>
                    Cancel
                  </Button>
                  <Button onClick={addProspectManually}>
                    Add Prospect
                  </Button>
                </div>

                {errorMessages.length > 0 && (
                  <div className="mt-4">
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <div className="font-medium mb-2">Validation Errors:</div>
                        <ul className="list-disc list-inside space-y-1 text-sm">
                          {errorMessages.map((error, index) => (
                            <li key={index}>{error}</li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Import CSV Modal */}
        {showImportModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-lg w-full">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Import CSV File</h3>
                  <Button variant="ghost" size="sm" onClick={() => setShowImportModal(false)}>
                    ×
                  </Button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Select CSV File</label>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleCSVImport}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">Required Columns:</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• <strong>firstName</strong> (or first_name, name)</li>
                      <li>• <strong>email</strong> (or email_address)</li>
                    </ul>
                    
                    <h4 className="font-medium mt-3 mb-2">Optional Columns:</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• lastName, company, phone, website, position, industry</li>
                    </ul>
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <Button variant="outline" onClick={() => setShowImportModal(false)}>
                    Cancel
                  </Button>
                </div>

                {errorMessages.length > 0 && (
                  <div className="mt-4">
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <div className="font-medium mb-2">Import Errors:</div>
                        <ul className="list-disc list-inside space-y-1 text-sm">
                          {errorMessages.map((error, index) => (
                            <li key={index}>{error}</li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Add Existing Prospects Modal */}
      {showAddExisting && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
    <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Add Existing Prospects</h3>
          <Button variant="ghost" size="sm" onClick={() => setShowAddExisting(false)}>
            ×
          </Button>
        </div>
        
        {isLoadingProspects ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Loading prospects...</span>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Input
                placeholder="Search prospects..."
                value={searchAvailableTerm}
                onChange={(e) => setSearchAvailableTerm(e.target.value)}
              />
            </div>
            
            <div className="max-h-96 overflow-y-auto border rounded-lg">
              {availableProspects
                .filter(p => 
                  !searchAvailableTerm ||
                  p.firstName?.toLowerCase().includes(searchAvailableTerm.toLowerCase()) ||
                  p.email?.toLowerCase().includes(searchAvailableTerm.toLowerCase()) ||
                  p.company?.toLowerCase().includes(searchAvailableTerm.toLowerCase())
                )
                .map((prospect) => (
                  <label 
                    key={prospect._id} 
                    className="p-3 border-b last:border-b-0 flex items-center cursor-pointer hover:bg-gray-50"
                  >
                    <Checkbox
                      checked={selectedExistingProspects.includes(prospect._id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedExistingProspects([...selectedExistingProspects, prospect._id]);
                        } else {
                          setSelectedExistingProspects(selectedExistingProspects.filter(id => id !== prospect._id));
                        }
                      }}
                      className="mr-3"
                    />
                    <div className="flex-1">
                      <div className="font-medium">
                        {prospect.firstName} {prospect.lastName}
                      </div>
                      <div className="text-sm text-gray-600">{prospect.email}</div>
                      {prospect.company && (
                        <div className="text-xs text-gray-500">{prospect.company}</div>
                      )}
                    </div>
                  </label>
                ))}
              
              {availableProspects.length === 0 && (
                <div className="p-8 text-center text-gray-500">
                  No existing prospects found
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex justify-between items-center mt-6">
          <div className="text-sm text-gray-600">
            {selectedExistingProspects.length} prospect{selectedExistingProspects.length !== 1 ? 's' : ''} selected
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setShowAddExisting(false)}>
              Cancel
            </Button>
            <Button 
              onClick={addSelectedExistingProspects}
              disabled={selectedExistingProspects.length === 0}
            >
              Add Selected
            </Button>
          </div>
        </div>
      </div>
    </div>
  </div>
)}
      </div>
    </div>
  );
}

