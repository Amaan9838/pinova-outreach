'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from "sonner";
import { Plus, Upload, Download, Search, Filter, Eye, Edit, Trash2, Users } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import LeadsCSVImportModal from './LeadsCSVImportModal';
import LeadStepsDrawer from './LeadStepsDrawer';
import MultiEmailInput from '@/components/MultiEmailInput';

export default function EnhancedLeadsTab({ campaign, campaignId, getStatusColor }) {
  const [showAddProspect, setShowAddProspect] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showProspectDetails, setShowProspectDetails] = useState(false);
  const [showAddExisting, setShowAddExisting] = useState(false);
  const [prospects, setProspects] = useState([]);
  const [availableProspects, setAvailableProspects] = useState([]);
  const [searchAvailableTerm, setSearchAvailableTerm] = useState('');
  const [isLoadingProspects, setIsLoadingProspects] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showImportForm, setShowImportForm] = useState(false);
  const [deleteProspectDialog, setDeleteProspectDialog] = useState({ open: false, prospectId: null, prospectName: '' });
  const [selectedProspectIds, setSelectedProspectIds] = useState([]);
  const [clickTimeout, setClickTimeout] = useState(null);
  const [stepsDrawer, setStepsDrawer] = useState({ open: false, prospectId: null, leadName: '' });









  // Handle single/double click functionality
  const handleProspectClick = (prospectData, event) => {
    // Prevent click if clicking on action buttons
    if (event.target.closest('button') || event.target.closest('.dropdown')) {
      return;
    }

    if (clickTimeout) {
      // Double click - open edit modal
      clearTimeout(clickTimeout);
      setClickTimeout(null);
      setEditingProspect(prospectData);
      setShowEditProspect(true);
    } else {
      // Single click - select prospect
      const timeout = setTimeout(() => {
        setSelectedProspectIds(prev => {
          const isSelected = prev.includes(prospectData._id);
          if (event.ctrlKey || event.metaKey) {
            // Multi-select with Ctrl/Cmd
            return isSelected 
              ? prev.filter(id => id !== prospectData._id)
              : [...prev, prospectData._id];
          } else {
            // Single select
            return isSelected ? [] : [prospectData._id];
          }
        });
        setClickTimeout(null);
      }, 250);
      setClickTimeout(timeout);
    }
  };
  const [selectedExistingProspects, setSelectedExistingProspects] = useState([]);
  const [csvData, setCsvData] = useState('');
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [csvRows, setCsvRows] = useState([]);
  const [fieldMapping, setFieldMapping] = useState({});
  const [showFieldMapping, setShowFieldMapping] = useState(false);
  const [importing, setImporting] = useState(false);
  const [filteredAvailableProspects, setFilteredAvailableProspects] = useState([]);
  const [selectedProspect, setSelectedProspect] = useState(null);
  const [editingProspect, setEditingProspect] = useState(null);
  const [showEditProspect, setShowEditProspect] = useState(false);
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
    zillow: '',
    facebook: '',
    personalizationNote: ''
  });
  const [editedProspect, setEditedProspect] = useState({
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
    zillow: '',
    facebook: '',
    personalizationNote: ''
  });
  const [customFields, setCustomFields] = useState([{ name: '', value: '' }]);

  const fetchProspects = async () => {
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/prospects`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const text = await response.text();
      if (!text.trim()) {
        throw new Error('Empty response from server');
      }
      
      const data = JSON.parse(text);
      if (data.success) {
        setProspects(data.prospects || []);
      } else {
        console.error('Failed to fetch prospects:', data.error);
        toast.error('Failed to load prospects: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error fetching prospects:', error);
      toast.error('Error loading prospects: ' + error.message);
    }
  };

  useEffect(() => {
    const loadProspects = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/campaigns/${campaignId}/prospects`);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        if (data.success) {
          setProspects(data.prospects || []);
        } else {
          console.error('Failed to fetch prospects:', data.error);
          toast.error('Failed to load prospects: ' + (data.error || 'Unknown error'));
        }
      } catch (error) {
        console.error('Error loading prospects:', error);
        toast.error('Error loading prospects: ' + error.message);
      } finally {
        setLoading(false);
      }
    };
    loadProspects();
  }, [campaignId]);





  const filteredProspects = prospects.filter(p => {
    const matchesSearch = !searchTerm || 
      `${p.firstName || ''} ${p.lastName || ''} ${p.email} ${p.company || ''}`
        .toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = selectedTag === 'all' || p.status === selectedTag;
    
    return matchesSearch && matchesStatus;
  });
// console.log("filteredProspects",filteredProspects);
  const handleAddProspect = async () => {
    if (!newProspect.firstName || !newProspect.email) {
      toast('Please fill in all required fields (First Name, Email)');
      return;
    }
    
    if (!newProspect.website && !newProspect.linkedin && !newProspect.instagram && !newProspect.facebook && !newProspect.zillow) {
      toast.error('Please provide at least one social/web link (Website, LinkedIn, Instagram, Facebook, or Zillow)');
      return;
    }
    
    // Prepare custom fields data
    const validCustomFields = customFields
      .filter(field => field.name.trim() !== '' && field.value.trim() !== '')
      .map(field => ({
        name: field.name.trim(),
        value: field.value.trim()
      }));

    try {
      const response = await fetch(`/api/campaigns/${campaignId}/prospects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newProspect,
          customFields: validCustomFields
        })
      });

      const result = await response.json();
      
      if (result.success) {
        toast('✅ Prospect added successfully!');
        setShowAddProspect(false);
        setNewProspect({
          firstName: '',
          lastName: '',
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
          zillow: '',
          facebook: '',
          personalizationNote: ''
        });
        setCustomFields([{ name: '', value: '' }]);
        fetchProspects(); // Refresh prospects list
      } else {
        toast('❌ Failed to add prospect: ' + result.error);
      }
    } catch (error) {
      toast('❌ Error: ' + error.message);
    }
  };

const handleDeleteProspect = async (prospectId) => {
  try {
    const response = await fetch(`/api/campaigns/${campaignId}/prospects/${prospectId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to remove prospect');
    }

    setProspects(prev => prev.filter(p => p._id !== prospectId));
    toast.success('Prospect removed successfully');
    setDeleteProspectDialog({ open: false, prospectId: null, prospectName: '' });
  } catch (error) {
    console.error('Error removing prospect:', error);
    toast.error(error.message);
  }
};

  const handleCSVImport = async (mappedData) => {
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/prospects/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prospects: mappedData })
      });

      const result = await response.json();
      if (result.success) {
        toast.success(`✅ Successfully imported ${result.imported} prospects!`);
        setShowImportModal(false);
        fetchProspects();
      } else {
        toast.error('❌ Import failed: ' + result.error);
      }
    } catch (error) {
      toast.error('❌ Import error: ' + error.message);
    }
  };

  const handleImportWithMapping = async () => {
    setImporting(true);
    try {
      const mappedData = csvRows.map(row => {
        const prospect = {};
        Object.entries(fieldMapping).forEach(([csvIndex, field]) => {
          if (field && field !== 'skip' && field !== '' && row[csvIndex]) {
            prospect[field] = row[csvIndex].trim();
          }
        });
        return prospect;
      }).filter(prospect => prospect.email); // Only include rows with email

      const response = await fetch(`/api/campaigns/${campaignId}/prospects/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prospects: mappedData })
      });

      const result = await response.json();
      if (result.success) {
        toast(`✅ Successfully imported ${result.imported} prospects!`);
        setShowFieldMapping(false);
        setCsvData('');
        fetchProspects();
      } else {
        toast('❌ Import failed: ' + result.error);
      }
    } catch (error) {
      toast('❌ Import error: ' + error.message);
    } finally {
      setImporting(false);
    }
  };

  const fetchAvailableProspects = async (search = '') => {
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/prospects/existing?search=${encodeURIComponent(search)}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const text = await response.text();
      if (!text.trim()) {
        throw new Error('Empty response from server');
      }
      
      const data = JSON.parse(text);
      if (data.success) {
        setAvailableProspects(data.prospects || []);
      } else {
        toast.error('Failed to load available prospects: ' + (data.error || 'Unknown error'));
        setAvailableProspects([]);
      }
    } catch (error) {
      console.error('Error fetching available prospects:', error);
      if (error.message.includes('405')) {
        toast.error('API endpoint error - please check server configuration');
      } else if (error.message.includes('JSON') || error.message.includes('Empty response')) {
        toast.error('Server returned invalid response');
      } else {
        toast.error('Error loading available prospects: ' + error.message);
      }
      setAvailableProspects([]);
    }
  };

  // Debounced search for available prospects
  const debouncedFetchAvailableProspects = useCallback(
    debounce((searchTerm) => {
      setIsLoadingProspects(true);
      fetchAvailableProspects(searchTerm).finally(() => setIsLoadingProspects(false));
    }, 500),
    [campaignId]
  );

  useEffect(() => {
    if (showAddExisting) {
      setIsLoadingProspects(true);
      if (searchAvailableTerm === '') {
        fetchAvailableProspects('').finally(() => setIsLoadingProspects(false));
      } else {
        debouncedFetchAvailableProspects(searchAvailableTerm);
      }
    }
  }, [showAddExisting, searchAvailableTerm, debouncedFetchAvailableProspects]);
  
  // Debounce utility function
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  const handleAddExistingProspects = async () => {
    if (selectedExistingProspects.length === 0) {
      toast('Please select at least one prospect to add');
      return;
    }

    try {
      const response = await fetch(`/api/campaigns/${campaignId}/prospects/existing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prospectIds: selectedExistingProspects })
      });

      const result = await response.json();
      if (result.success) {
        toast.success(`✅ Added ${result.count || selectedExistingProspects.length} prospects to campaign!`);
        setShowAddExisting(false);
        setSelectedExistingProspects([]);
        setSearchAvailableTerm('');
        fetchProspects();
      } else {
        toast.error(`❌ ${result.error || 'Failed to add prospects'}`);
      }
    } catch (error) {
      console.error('Error adding prospects:', error);
      toast.error('❌ Error adding prospects: ' + error.message);
    }
  };



  const handleUpdateProspect = async () => {
    if (!editedProspect.firstName || !editedProspect.email) {
      toast.error('Please fill in all required fields (First Name, Email)');
      return;
    }

    if (!editedProspect.website && !editedProspect.linkedin && !editedProspect.instagram && !editedProspect.facebook && !editedProspect.zillow) {
      toast.error('Please provide at least one social/web link (Website, LinkedIn, Instagram, Facebook, or Zillow)');
      return;
    }

    try {
        const response = await fetch(`/api/campaigns/${campaignId}/prospects/${editingProspect._id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(editedProspect)
        });

        if (!response.ok) {
          throw new Error('Failed to update prospect');
        }
  
        // Update the prospects list with the edited data
        setProspects(prospects.map(p => 
          p._id === editingProspect._id ? {...p, ...editedProspect} : p
        ));
  
        // Reset states
        setEditingProspect(null);
        setShowEditProspect(false);
        setEditedProspect({
          firstName: '',
          email: '',
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
  
        toast.success('Prospect updated successfully');
      } catch (error) {
        console.error('Error updating prospect:', error);
        toast.error('Failed to update prospect: ' + error.message);
      }
  };

  // Add this effect to populate editedProspect when editing starts
  useEffect(() => {
    if (editingProspect) {
      setEditedProspect({
        firstName: editingProspect.firstName || '',
        lastName: editingProspect.lastName || '',
        email: editingProspect.email || '',
        additionalEmails: editingProspect.additionalEmails || [],
        company: editingProspect.company || '',
        phone: editingProspect.phone || '',
        website: editingProspect.website || '',
        industry: editingProspect.industry || '',
        position: editingProspect.position || '',
        notes: editingProspect.notes || '',
        instagram: editingProspect.instagram || '',
        linkedin: editingProspect.linkedin || '',
        personalizationNote: editingProspect.personalizationNote || '',
        customFields: editingProspect.customFields || []
      });
    }
  }, [editingProspect]);

  const handleExportProspects = () => {
    if (prospects.length === 0) {
      toast.error('No prospects to export');
      return;
    }

    const csvHeaders = ['First Name', 'Last Name', 'Email', 'Company', 'Position', 'Status', 'Current Step', 'Next Send At'];
    const csvData = prospects.map(prospect => {
      const currentStepNum = prospect.currentStep || 1;
      const totalSteps = prospect.emailSteps?.length > 0
        ? prospect.emailSteps.length
        : (campaign?.emailSteps?.length || 0);
      let stepDisplay = `Step ${currentStepNum}`;
      if (prospect.status === 'completed' || (totalSteps > 0 && currentStepNum > totalSteps)) {
        stepDisplay = 'Completed';
      }

      return [
        prospect.firstName || '',
        prospect.lastName || '',
        prospect.email || '',
        prospect.company || '',
        prospect.position || '',
        prospect.status || '',
        stepDisplay,
        (prospect.nextActionAt || prospect.nextSendAt) ? new Date(prospect.nextActionAt || prospect.nextSendAt).toLocaleString() :
          (prospect.status === 'active' ? 'Ready Now' : prospect.status === 'completed' ? 'Completed' : '-')
      ];
    });

    const csvContent = [csvHeaders, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `prospects-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success(`Exported ${prospects.length} prospects`);
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      toast.error('Please select a valid CSV file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      toast.error('File size must be less than 10MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      setCsvData(content);
      toast.success('CSV file loaded successfully');
    };
    reader.onerror = () => {
      toast.error('Error reading file');
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">


      {/* Header with Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-gray-900">Prospects</h2>

          </div>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>{prospects.length} total</span>
            <span>•</span>
            <span className="text-green-600">{prospects.filter(p => p.status === 'active').length} active</span>
            <span>•</span>
            <span className="text-blue-600">{prospects.filter(p => {
              const nextTime = p.nextActionAt || p.nextSendAt;
              return nextTime && new Date(nextTime) <= new Date();
            }).length} ready to send</span>
            {campaign?.status === 'pending_scheduled' && prospects.length === 0 && (
              <Badge variant="outline" className="text-yellow-600 border-yellow-300">
                <AlertTriangle className="h-3 w-3 mr-1" />
                No prospects added
              </Badge>
            )}
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => setShowAddProspect(true)}
            className="bg-blue-600 hover:bg-blue-700"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add New
          </Button>
          <Button
            onClick={() => setShowAddExisting(true)}
            className="bg-green-600 hover:bg-green-700"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Existing
          </Button>
          <Button
            onClick={() => setShowImportModal(true)}
            variant="outline"
            size="sm"
          >
            <Upload className="h-4 w-4 mr-2" />
            Import CSV ✨
          </Button>
          <Button
            onClick={handleExportProspects}
            variant="outline"
            size="sm"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>


        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search prospects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedTag} onValueChange={setSelectedTag}>
          <SelectTrigger className="w-48">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="bounced">Bounced</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Prospects Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Prospect
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Company
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Current Step
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email Steps
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Next Send
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProspects.map((prospectData, index) => {
                const isSelected = selectedProspectIds.includes(prospectData._id);
                return (
                <tr 
                  key={index} 
                  className={`cursor-pointer transition-colors ${
                    isSelected 
                      ? 'bg-blue-50 border-blue-200' 
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={(e) => handleProspectClick(prospectData, e)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {prospectData.firstName} {prospectData.lastName}
                      </div>
                      <div className="text-sm text-gray-500">{prospectData.email}</div>
                      {prospectData.additionalEmails && prospectData.additionalEmails.length > 0 && (
                        <div className="text-xs text-gray-400 mt-1">
                          +{prospectData.additionalEmails.length} more email{prospectData.additionalEmails.length > 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{prospectData.company || 'N/A'}</div>
                    <div className="text-sm text-gray-500">{prospectData.position || ''}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {(() => {
                      const currentStepNum = prospectData.currentStep || 1;
                      const totalSteps = prospectData.emailSteps?.length > 0
                        ? prospectData.emailSteps.length
                        : (campaign?.emailSteps?.length || 0);
                      
                      if (prospectData.status === 'completed' || (totalSteps > 0 && currentStepNum > totalSteps)) {
                        return <span className="text-green-600 font-medium">Completed</span>;
                      }
                      
                      return `Step ${currentStepNum}`;
                    })()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setStepsDrawer({
                          open: true,
                          prospectId: prospectData._id,
                          leadName: `${prospectData.firstName || ''} ${prospectData.lastName || ''}`.trim()
                        });
                      }}
                      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                        (prospectData.emailSteps?.length || 0) > 0
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                          : 'bg-gray-50 text-gray-400 border border-gray-200 hover:bg-blue-50 hover:text-blue-500 hover:border-blue-200'
                      }`}
                    >
                      {(prospectData.emailSteps?.length || 0) > 0
                        ? <>{prospectData.emailSteps.length} step{prospectData.emailSteps.length !== 1 ? 's' : ''} ✏️</>
                        : <>+ add steps</>
                      }
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(prospectData.status)}`}>
                      {prospectData.status}
                    </span>
                  </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
  {(() => {
    // V2 uses nextActionAt; legacy uses nextSendAt
    const nextTime = prospectData.nextActionAt || prospectData.nextSendAt;
    if (!nextTime) {
      return prospectData.status === 'active' ? 'Ready Now' : prospectData.status === 'completed' ? 'Completed' : '-';
    }
    const d = new Date(nextTime);
    const now = new Date();
    const diffMs = d - now;
    const isPast = diffMs < 0;

    // Format with timezone abbreviation so user always knows which TZ
    const formatted = d.toLocaleString(undefined, {
      month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit',
      timeZoneName: 'short'
    });

    // Relative time label
    let relative = '';
    if (isPast) {
      relative = 'due now';
    } else if (diffMs < 3600_000) {
      relative = `in ${Math.round(diffMs / 60_000)}m`;
    } else if (diffMs < 86400_000) {
      relative = `in ${Math.round(diffMs / 3600_000)}h`;
    } else {
      relative = `in ${Math.round(diffMs / 86400_000)}d`;
    }

    return (
      <div>
        <div>{formatted}</div>
        <div className={`text-xs ${isPast ? 'text-green-600 font-medium' : 'text-gray-400'}`}>
          {relative}
        </div>
      </div>
    );
  })()}
</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedProspect(prospectData);
                          setShowProspectDetails(true);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingProspect(prospectData);
                          setShowEditProspect(true);
                        }}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem 
                            className="text-red-600"
                            onClick={() => setDeleteProspectDialog({ 
                              open: true, 
                              prospectId: prospectData._id, 
                              prospectName: `${prospectData.firstName} ${prospectData.lastName}`.trim() 
                            })}
                          >
                            Remove from Campaign
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </td>
                </tr>
              );
              })}
            </tbody>
          </table>
          
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-500">Loading prospects...</p>
            </div>
          ) : filteredProspects.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No prospects found</p>
              <Button
                onClick={() => setShowAddProspect(true)}
                className="mt-4 bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Prospect
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      {/* Add Prospect Modal */}
      <Dialog open={showAddProspect} onOpenChange={setShowAddProspect}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col bg-white border-0 shadow-2xl p-0">
          <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-gray-100">
            <DialogTitle className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <div className="p-2 bg-gray-900 rounded-xl">
                <Plus className="h-6 w-6 text-white" />
              </div>
              Add New Prospect
            </DialogTitle>
            <DialogDescription className="text-base text-gray-600">
              Add a new prospect to this campaign with detailed information
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto px-6 py-6">
            <div className="space-y-6">
            
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">First Name *</label>
                    <Input
                      value={newProspect.firstName}
                      onChange={(e) => setNewProspect(prev => ({ ...prev, firstName: e.target.value }))}
                      placeholder="John"
                      required
                      className="h-11"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">Last Name</label>
                    <Input
                      value={newProspect.lastName || ''}
                      onChange={(e) => setNewProspect(prev => ({ ...prev, lastName: e.target.value }))}
                      placeholder="Doe"
                      className="h-11"
                    />
                  </div>
                </div>
                
                <div>
                  <MultiEmailInput
                    primaryEmail={newProspect.email}
                    additionalEmails={newProspect.additionalEmails || []}
                    onPrimaryEmailChange={(email) => setNewProspect(prev => ({ ...prev, email }))}
                    onAdditionalEmailsChange={(emails) => setNewProspect(prev => ({ ...prev, additionalEmails: emails }))}
                  />
                </div>
              </div>

              {/* Company Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Company Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">Company</label>
                    <Input
                      value={newProspect.company}
                      onChange={(e) => setNewProspect(prev => ({ ...prev, company: e.target.value }))}
                      placeholder="Acme Corp"
                      className="h-11"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">Position</label>
                    <Input
                      value={newProspect.position}
                      onChange={(e) => setNewProspect(prev => ({ ...prev, position: e.target.value }))}
                      placeholder="CEO"
                      className="h-11"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">Industry</label>
                    <Input
                      value={newProspect.industry}
                      onChange={(e) => setNewProspect(prev => ({ ...prev, industry: e.target.value }))}
                      placeholder="Technology"
                      className="h-11"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">Website</label>
                    <Input
                      value={newProspect.website}
                      onChange={(e) => setNewProspect(prev => ({ ...prev, website: e.target.value }))}
                      placeholder="https://company.com"
                      className="h-11"
                    />
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Contact Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">Phone</label>
                    <Input
                      value={newProspect.phone}
                      onChange={(e) => setNewProspect(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="+1 (555) 123-4567"
                      className="h-11"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">LinkedIn</label>
                    <Input
                      value={newProspect.linkedin}
                      onChange={(e) => setNewProspect(prev => ({ ...prev, linkedin: e.target.value }))}
                      placeholder="linkedin.com/in/username"
                      className="h-11"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">Instagram</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500">@</span>
                      </div>
                      <Input
                        value={newProspect.instagram}
                        onChange={(e) => setNewProspect(prev => ({ ...prev, instagram: e.target.value }))}
                        className="pl-8 h-11"
                        placeholder="username"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">Facebook</label>
                    <Input
                      value={newProspect.facebook || ''}
                      onChange={(e) => setNewProspect(prev => ({ ...prev, facebook: e.target.value }))}
                      placeholder="facebook.com/username"
                      className="h-11"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">Zillow</label>
                    <Input
                      value={newProspect.zillow || ''}
                      onChange={(e) => setNewProspect(prev => ({ ...prev, zillow: e.target.value }))}
                      placeholder="zillow.com/profile/username"
                      className="h-11"
                    />
                  </div>
                </div>
              </div>
            
              {/* Personalization */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Personalization</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Personalization Note</label>
                  <Textarea
                    value={newProspect.personalizationNote}
                    onChange={(e) => setNewProspect(prev => ({ ...prev, personalizationNote: e.target.value }))}
                    placeholder="Add personalization details for this prospect..."
                    rows={3}
                    className="resize-none"
                  />
                </div>
              </div>
            
              {/* Custom Fields */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-900">Custom Fields</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setCustomFields([...customFields, { name: '', value: '' }])}
                    className="border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    <Plus className="h-4 w-4 mr-2" /> Add Field
                  </Button>
                </div>
                
                <div className="space-y-3">
                  {customFields.map((field, index) => (
                    <div key={index} className="flex gap-3 items-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <Input
                        value={field.name}
                        onChange={(e) => {
                          const updated = [...customFields];
                          updated[index].name = e.target.value;
                          setCustomFields(updated);
                        }}
                        placeholder="Field name"
                        className="flex-1 h-10"
                      />
                      <Input
                        value={field.value}
                        onChange={(e) => {
                          const updated = [...customFields];
                          updated[index].value = e.target.value;
                          setCustomFields(updated);
                        }}
                        placeholder="Value"
                        className="flex-1 h-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const updated = customFields.filter((_, i) => i !== index);
                          setCustomFields(updated);
                        }}
                        className="text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            
              {/* Notes */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Additional Notes</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Notes</label>
                  <Textarea
                    value={newProspect.notes}
                    onChange={(e) => setNewProspect(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Additional notes about this prospect..."
                    rows={4}
                    className="resize-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex-shrink-0 px-6 py-4 border-t border-gray-200 bg-white">
            <div className="flex justify-end gap-3">
            
              <Button 
                variant="outline" 
                onClick={() => setShowAddProspect(false)}
                className="border-gray-300 text-gray-700 hover:bg-gray-50 px-6 py-2"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleAddProspect} 
                className="bg-gray-900 hover:bg-gray-800 text-white px-8 py-2 font-medium"
              >
                Add Prospect
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* LeadsCSVImportModal rendered at bottom of file */}


      {/* Add Existing Prospects Modal */}
      <Dialog open={showAddExisting} onOpenChange={(open) => {
        setShowAddExisting(open);
        if (!open) {
          setSelectedExistingProspects([]);
          setSearchAvailableTerm('');
        } else {
          fetchAvailableProspects('');
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
          <div className="p-6 flex-1 flex flex-col">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Add Existing Prospects</h3>
            
            {/* Search Input - Always rendered, never unmounted */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name, email, or company..."
                  value={searchAvailableTerm}
                  onChange={(e) => setSearchAvailableTerm(e.target.value)}
                  className="pl-10 w-full max-w-md"
                />
              </div>
            </div>
            
            {/* Results Area - Conditional content below input */}
            <div className="flex-1 overflow-hidden border rounded-lg bg-white">
              {isLoadingProspects ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : availableProspects.length > 0 ? (
                <div className="overflow-y-auto max-h-[calc(60vh-200px)]">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="w-12 px-4 py-3">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedExistingProspects(availableProspects.map(p => p._id));
                              } else {
                                setSelectedExistingProspects([]);
                              }
                            }}
                            checked={
                              availableProspects.length > 0 && 
                              selectedExistingProspects.length === availableProspects.length
                            }
                          />
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {availableProspects.map((prospect) => {
                        const isSelected = selectedExistingProspects.includes(prospect._id);
                        const handleToggleSelection = () => {
                          if (isSelected) {
                            setSelectedExistingProspects(selectedExistingProspects.filter(id => id !== prospect._id));
                          } else {
                            setSelectedExistingProspects([...selectedExistingProspects, prospect._id]);
                          }
                        };
                        
                        return (
                          <tr 
                            key={prospect._id} 
                            className={`hover:bg-gray-50 cursor-pointer transition-colors ${isSelected ? 'bg-blue-50 border-l-4 border-blue-500' : ''}`}
                            onClick={handleToggleSelection}
                          >
                            <td className="px-4 py-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                checked={isSelected}
                                onChange={handleToggleSelection}
                              />
                            </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="font-medium text-gray-900">
                              {prospect.firstName} {prospect.lastName}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                            {prospect.email}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                            {prospect.company || '-'}
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  
                  {filteredAvailableProspects.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <p>No available prospects found</p>
                      <p className="text-sm">All prospects are already in this campaign or match your search</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-8 text-center text-gray-500">
                  <Users className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-lg font-medium">No prospects found</p>
                  <p className="text-sm mt-1">
                    {searchAvailableTerm 
                      ? 'No prospects match your search. Try different keywords.'
                      : 'All available prospects are already in this campaign.'}
                  </p>
                </div>
              )}
            </div>
            
            <div className="mt-6 flex justify-between items-center pt-4 border-t">
              <div className="text-sm text-gray-600">
                {selectedExistingProspects.length} selected
              </div>
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowAddExisting(false);
                    setSelectedExistingProspects([]);
                    setSearchAvailableTerm('');
                  }}
                  disabled={isLoadingProspects}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleAddExistingProspects}
                  disabled={selectedExistingProspects.length === 0 || isLoadingProspects}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isLoadingProspects ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Loading...
                    </>
                  ) : `Add ${selectedExistingProspects.length > 0 ? `(${selectedExistingProspects.length})` : ''}`}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Prospect Modal */}
      <Dialog open={showEditProspect} onOpenChange={setShowEditProspect}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col bg-white border-0 shadow-2xl p-0">
          <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-gray-100">
            <DialogTitle className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <div className="p-2 bg-gray-900 rounded-xl">
                <Edit className="h-6 w-6 text-white" />
              </div>
              Edit Prospect
            </DialogTitle>
            <DialogDescription className="text-base text-gray-600">
              Update prospect information and details
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto px-6 py-6">
            {editingProspect && (
              <div className="space-y-6">
              
                {/* Basic Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">First Name *</label>
                      <Input
                        value={editedProspect.firstName || ''}
                        onChange={(e) => setEditedProspect(prev => ({ ...prev, firstName: e.target.value }))}
                        placeholder="John"
                        className="h-11"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">Last Name</label>
                      <Input
                        value={editedProspect.lastName || ''}
                        onChange={(e) => setEditedProspect(prev => ({ ...prev, lastName: e.target.value }))}
                        placeholder="Doe"
                        className="h-11"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-900 mb-2">Primary Email *</label>
                      <Input
                        type="email"
                        value={editedProspect.email || ''}
                        onChange={(e) => setEditedProspect(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="john@company.com"
                        className="h-11"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-900 mb-2">Additional Email</label>
                      <Input
                        type="email"
                        value={editedProspect.additionalEmails?.[0]?.email || ''}
                        onChange={(e) => {
                          const email = e.target.value;
                          setEditedProspect(prev => ({
                            ...prev,
                            additionalEmails: email ? [{ email, type: 'work', isPrimary: false }] : []
                          }));
                        }}
                        placeholder="john.doe@company.com"
                        className="h-11"
                      />
                    </div>
                  </div>
                </div>

                {/* Company Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Company Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">Company</label>
                      <Input
                        value={editedProspect.company || ''}
                        onChange={(e) => setEditedProspect(prev => ({ ...prev, company: e.target.value }))}
                        placeholder="Acme Corp"
                        className="h-11"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">Position</label>
                      <Input
                        value={editedProspect.position || ''}
                        onChange={(e) => setEditedProspect(prev => ({ ...prev, position: e.target.value }))}
                        placeholder="CEO"
                        className="h-11"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">Industry</label>
                      <Input
                        value={editedProspect.industry || ''}
                        onChange={(e) => setEditedProspect(prev => ({ ...prev, industry: e.target.value }))}
                        placeholder="Technology"
                        className="h-11"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">Website</label>
                      <Input
                        value={editedProspect.website || ''}
                        onChange={(e) => setEditedProspect(prev => ({ ...prev, website: e.target.value }))}
                        placeholder="https://company.com"
                        className="h-11"
                      />
                    </div>
                  </div>
                </div>

                {/* Contact Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Contact Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">Phone</label>
                      <Input
                        value={editedProspect.phone || ''}
                        onChange={(e) => setEditedProspect(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="+1 (555) 123-4567"
                        className="h-11"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">LinkedIn</label>
                      <Input
                        value={editedProspect.linkedin || ''}
                        onChange={(e) => setEditedProspect(prev => ({ ...prev, linkedin: e.target.value }))}
                        placeholder="linkedin.com/in/username"
                        className="h-11"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">Instagram</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="text-gray-500">@</span>
                        </div>
                        <Input
                          value={editedProspect.instagram || ''}
                          onChange={(e) => setEditedProspect(prev => ({ ...prev, instagram: e.target.value }))}
                          className="pl-8 h-11"
                          placeholder="username"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">Facebook</label>
                      <Input
                        value={editedProspect.facebook || ''}
                        onChange={(e) => setEditedProspect(prev => ({ ...prev, facebook: e.target.value }))}
                        placeholder="facebook.com/username"
                        className="h-11"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">Zillow</label>
                      <Input
                        value={editedProspect.zillow || ''}
                        onChange={(e) => setEditedProspect(prev => ({ ...prev, zillow: e.target.value }))}
                        placeholder="zillow.com/profile/username"
                        className="h-11"
                      />
                    </div>
                  </div>
                </div>

                {/* Personalization */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Personalization</h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">Personalization Note</label>
                    <Textarea
                      value={editedProspect.personalizationNote || ''}
                      onChange={(e) => setEditedProspect(prev => ({ ...prev, personalizationNote: e.target.value }))}
                      placeholder="Add personalization details for this prospect..."
                      rows={3}
                      className="resize-none"
                    />
                  </div>
                </div>

                {/* Custom Fields */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Custom Fields</h3>
                  {editingProspect?.customFields && editingProspect.customFields.length > 0 ? (
                    <div className="space-y-3">
                      {editingProspect.customFields.map((field, index) => (
                        <div key={index} className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-900 mb-2">
                              {field.name || `Custom Field ${index + 1}`}
                            </label>
                            <Input
                              value={field.value || ''}
                              onChange={(e) => {
                                const updatedFields = [...(editedProspect.customFields || [])];
                                if (!updatedFields[index]) {
                                  updatedFields[index] = { name: field.name, value: '', type: 'text' };
                                }
                                updatedFields[index].value = e.target.value;
                                setEditedProspect(prev => ({ ...prev, customFields: updatedFields }));
                              }}
                              placeholder={`Enter ${field.name || 'value'}`}
                              className="h-11"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No custom fields defined for this prospect.</p>
                  )}
                </div>

                {/* Notes */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Additional Notes</h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">Notes</label>
                    <Textarea
                      value={editedProspect.notes || ''}
                      onChange={(e) => setEditedProspect(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Additional notes about this prospect..."
                      rows={4}
                      className="resize-none"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex-shrink-0 px-6 py-4 border-t border-gray-200 bg-white">
            <div className="flex justify-end gap-3">
              <Button 
                variant="outline" 
                onClick={() => setShowEditProspect(false)}
                className="border-gray-300 text-gray-700 hover:bg-gray-50 px-6 py-2"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleUpdateProspect} 
                className="bg-gray-900 hover:bg-gray-800 text-white px-8 py-2 font-medium"
              >
                Update Prospect
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Prospect Details Modal */}
      <Dialog open={showProspectDetails} onOpenChange={setShowProspectDetails}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col bg-white border-0 shadow-2xl p-0">
          <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-gray-100">
            <DialogTitle className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <div className="p-2 bg-gray-900 rounded-xl">
                <Eye className="h-6 w-6 text-white" />
              </div>
              Prospect Details
            </DialogTitle>
            <DialogDescription className="text-base text-gray-600">
              View detailed information about this prospect
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto px-6 py-6">
            {selectedProspect && (
              <div className="space-y-6">
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Name</label>
                  <p className="text-sm text-gray-900">
                    {selectedProspect.firstName} {selectedProspect.lastName}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Email</label>
                  <p className="text-sm text-gray-900">{selectedProspect.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Company</label>
                  <p className="text-sm text-gray-900">{selectedProspect.company || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Position</label>
                  <p className="text-sm text-gray-900">{selectedProspect.position || 'N/A'}</p>
                </div>
                <div> 
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedProspect.status)}`}>
                    {selectedProspect.status}
                  </span>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Current Step</label>
                  <p className="text-sm text-gray-900">Step {selectedProspect.currentStep || 1}</p>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end">
                <Button onClick={() => setShowProspectDetails(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Delete Prospect Confirmation Dialog */}
      <Dialog open={deleteProspectDialog.open} onOpenChange={(open) => setDeleteProspectDialog({ open, prospectId: null, prospectName: '' })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Prospect</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove {deleteProspectDialog.prospectName} from this campaign? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteProspectDialog({ open: false, prospectId: null, prospectName: '' })}>
              Cancel
            </Button>
           {/* // In the Button onClick handler, update the handleDeleteProspect function: */}
<Button 
  variant="destructive" 
  onClick={async () => {
    if (deleteProspectDialog.prospectId) {
      try {
        const response = await fetch(`/api/campaigns/${campaignId}/prospects/${deleteProspectDialog.prospectId}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to remove prospect');
        }

        // Update the UI immediately by filtering out the deleted prospect
        setProspects(currentProspects => 
          currentProspects.filter(p => p._id !== deleteProspectDialog.prospectId)
        );
        
        // Close the dialog and show success message
        setDeleteProspectDialog({ open: false, prospectId: null, prospectName: '' });
        toast.success('Prospect removed successfully', {
          duration: 3000,
          position: 'top-center',
        });
      } catch (error) {
        console.error('Error removing prospect:', error);
        toast.error(error.message, {
          duration: 5000,
          position: 'top-center',
        });
      }
    } else {
      setDeleteProspectDialog({ open: false, prospectId: null, prospectName: '' });
    }
  }}
>
  Remove Prospect
</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* CSV Import Modal — per-lead step preview */}
      <LeadsCSVImportModal
        open={showImportModal}
        onOpenChange={setShowImportModal}
        campaignId={campaignId}
        onImported={fetchProspects}
      />

      {/* Per-lead email steps viewer/editor */}
      <LeadStepsDrawer
        open={stepsDrawer.open}
        onOpenChange={(v) => setStepsDrawer(prev => ({ ...prev, open: v }))}
        campaignId={campaignId}
        prospectId={stepsDrawer.prospectId}
        leadName={stepsDrawer.leadName}
      />
    </div>
  );
}
