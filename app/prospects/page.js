'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Search, Filter, Plus, Upload, Download, Edit2, Trash2, Eye, MoreHorizontal, Users, Mail, Building, MapPin, Tag, ExternalLink, Calendar, Star, Phone, Briefcase, Globe, Building2, SlidersHorizontal, ArrowUpDown, CheckSquare, Square, Bookmark, X, ChevronDown, Zap, Target, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarInitials } from '@/components/ui/avatar';
import EnhancedCSVImport from '@/components/EnhancedCSVImport';
import MultiEmailInput from '@/components/MultiEmailInput';

export default function ProspectsPage() {
  const [prospects, setProspects] = useState([]);
  const [filteredProspects, setFilteredProspects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('__all__');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'table'
  const [selectedProspects, setSelectedProspects] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showImportForm, setShowImportForm] = useState(false);
  const [editingProspect, setEditingProspect] = useState(null);
  const [showProspectDetails, setShowProspectDetails] = useState(null);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [sortBy, setSortBy] = useState('newest');
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [savedFilters, setSavedFilters] = useState([]);
  const [activeFilterSet, setActiveFilterSet] = useState(null);
  const [newProspect, setNewProspect] = useState({
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
    personalizationNote: '',
    customFields: [],
    tags: []
  });
  
  const [customFields, setCustomFields] = useState([{ name: '', value: '' }]);

  useEffect(() => {
    fetchProspects();
  }, []);

  // Enhanced filtering and sorting
  useEffect(() => {
    let filtered = prospects;

    // Advanced search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(prospect => 
        prospect.firstName?.toLowerCase().includes(searchLower) ||
        prospect.lastName?.toLowerCase().includes(searchLower) ||
        prospect.email?.toLowerCase().includes(searchLower) ||
        prospect.company?.toLowerCase().includes(searchLower) ||
        prospect.city?.toLowerCase().includes(searchLower) ||
        prospect.neighborhood?.toLowerCase().includes(searchLower) ||
        prospect.position?.toLowerCase().includes(searchLower) ||
        prospect.industry?.toLowerCase().includes(searchLower) ||
        prospect.phone?.includes(searchTerm) ||
        prospect.website?.toLowerCase().includes(searchLower) ||
        prospect.notes?.toLowerCase().includes(searchLower) ||
        prospect.personalizationNote?.toLowerCase().includes(searchLower) ||
        prospect.tags?.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(prospect => prospect.status === statusFilter);
    }

    // Tag filter
    if (tagFilter && tagFilter !== '__all__') {
      filtered = filtered.filter(prospect => 
        prospect.tags?.some(tag => tag.toLowerCase().includes(tagFilter.toLowerCase()))
      );
    }

    // Sort prospects
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        case 'oldest':
          return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
        case 'name':
          return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
        case 'company':
          return (a.company || '').localeCompare(b.company || '');
        case 'status':
          return (a.status || '').localeCompare(b.status || '');
        default:
          return 0;
      }
    });

    setFilteredProspects(filtered);
  }, [prospects, searchTerm, statusFilter, tagFilter, sortBy]);

  const fetchProspects = async () => {
    try {
      const response = await fetch('/api/prospects');
      const data = await response.json();
      if (data.success) {
        setProspects(data.prospects);
        setFilteredProspects(data.prospects);
      }
    } catch (error) {
      console.error('Failed to fetch prospects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditProspect = (updatedProspect) => {
    fetch(`/api/prospects/${updatedProspect._id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...updatedProspect,
        customFields: (updatedProspect.customFields || []).filter(field => 
          field && field.name && field.name.trim() !== ''
        ),
        tags: Array.isArray(updatedProspect.tags) ? 
          updatedProspect.tags : 
          (updatedProspect.tags || '').split(',').map(tag => tag.trim()).filter(tag => tag)
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          const updatedProspects = prospects.map((prospect) =>
            prospect._id === data.prospect._id ? data.prospect : prospect
          );
          setProspects(updatedProspects);
          setFilteredProspects(updatedProspects);
          setEditingProspect(null);
          toast.success('Prospect updated successfully');
        } else {
          toast.error(data.error || 'Failed to update prospect');
        }
      })
      .catch((error) => {
        console.error('Error updating prospect:', error);
        toast.error('Failed to update prospect');
      });
  };

  const handleDeleteProspect = async (prospectId) => {
    if (!confirm('Are you sure you want to delete this prospect?')) return;
    
    try {
      const response = await fetch(`/api/prospects/${prospectId}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      if (data.success) {
        fetchProspects();
      } else {
        alert(data.error || 'Failed to delete prospect');
      }
    } catch (error) {
      console.error('Failed to delete prospect:', error);
      alert('Failed to delete prospect');
    }
  };

  const handleBulkAction = async (action) => {
    if (selectedProspects.length === 0) {
      alert('Please select prospects first');
      return;
    }

    if (action === 'delete') {
      if (!confirm(`Are you sure you want to delete ${selectedProspects.length} prospects?`)) return;
      
      try {
        await Promise.all(selectedProspects.map(id => 
          fetch(`/api/prospects/${id}`, { method: 'DELETE' })
        ));
        fetchProspects();
        setSelectedProspects([]);
      } catch (error) {
        console.error('Failed to delete prospects:', error);
        alert('Failed to delete prospects');
      }
    } else {
      try {
        await Promise.all(selectedProspects.map(id => 
          fetch(`/api/prospects/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: action })
          })
        ));
        fetchProspects();
        setSelectedProspects([]);
      } catch (error) {
        console.error('Failed to update prospects:', error);
        alert('Failed to update prospects');
      }
    }
  };

  const toggleProspectSelection = (prospectId) => {
    setSelectedProspects(prev => 
      prev.includes(prospectId) 
        ? prev.filter(id => id !== prospectId)
        : [...prev, prospectId]
    );
  };

  const selectAllProspects = () => {
    if (selectedProspects.length === filteredProspects.length) {
      setSelectedProspects([]);
    } else {
      setSelectedProspects(filteredProspects.map(p => p._id));
    }
  };

  const selectAllVisible = () => {
    const visibleIds = filteredProspects.slice(0, 50).map(p => p._id); // First 50 visible
    setSelectedProspects(prev => {
      const newSelected = [...new Set([...prev, ...visibleIds])];
      return newSelected;
    });
  };

  const deselectAll = () => {
    setSelectedProspects([]);
  };

  const invertSelection = () => {
    const allIds = filteredProspects.map(p => p._id);
    const unselected = allIds.filter(id => !selectedProspects.includes(id));
    setSelectedProspects(unselected);
  };

  const getUniqueStatuses = () => {
    const statuses = [...new Set(prospects.map(p => p.status).filter(Boolean))];
    return statuses;
  };

  const getUniqueTags = () => {
    const allTags = prospects.flatMap(p => p.tags || []);
    return [...new Set(allTags)];
  };

  const handleAddProspect = (prospectData) => {
    fetch('/api/prospects', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...prospectData,
        customFields: (prospectData.customFields || []).filter(field => 
          field && field.name && field.name.trim() !== ''
        ),
        tags: Array.isArray(prospectData.tags) ? 
          prospectData.tags : 
          (prospectData.tags || '').split(',').map(tag => tag.trim()).filter(tag => tag)
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          setProspects([data.prospect, ...prospects]);
          setFilteredProspects([data.prospect, ...filteredProspects]);
          setShowAddForm(false);
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
            personalizationNote: '',
            customFields: [],
            tags: []
          });
          setCustomFields([{ name: '', value: '' }]);
          toast.success('Prospect added successfully');
        } else {
          toast.error(data.error || 'Failed to add prospect');
        }
      })
      .catch((error) => {
        console.error('Error adding prospect:', error);
        toast.error('Failed to add prospect');
      });
  };

  const updateProspectStatus = async (prospectId, newStatus) => {
    try {
      const response = await fetch(`/api/prospects/${prospectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      
      const data = await response.json();
      if (data.success) {
        fetchProspects(); // Refresh list
      } else {
        alert(data.error || 'Failed to update prospect');
      }
    } catch (error) {
      console.error('Failed to update prospect:', error);
      alert('Failed to update prospect');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'suppressed': return 'text-red-600 bg-red-100';
      case 'bounced': return 'text-yellow-600 bg-yellow-100';
      case 'unsubscribed': return 'text-gray-600 bg-gray-100';
      default: return 'text-blue-600 bg-blue-100';
    }
  };

  const handleCSVImport = async (mappedData) => {
    try {
      const response = await fetch('/api/prospects/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prospects: mappedData })
      });
      
      const data = await response.json();
      if (data.success) {
        toast.success(`Successfully imported ${data.imported} prospects!`);
        setShowImportForm(false);
        fetchProspects();
      } else {
        toast.error(data.error || 'Failed to import prospects');
      }
    } catch (error) {
      console.error('Failed to import prospects:', error);
      toast.error('Failed to import prospects');
    }
  };

  const downloadTemplate = async () => {
    try {
      const response = await fetch('/api/prospects/import');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'prospect-template.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to download template:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <div className="text-gray-600 font-medium">Loading prospects...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Enhanced Header Section */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Contact Management</h1>
              <p className="text-gray-600 text-lg">Advanced prospect database with smart filtering and bulk operations</p>
              
              {/* Enhanced Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <Users className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-gray-900">{prospects.length.toLocaleString()}</div>
                      <div className="text-sm text-gray-600">Total Prospects</div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-50 rounded-lg">
                      <CheckSquare className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-emerald-600">{prospects.filter(p => p.status === 'active').length}</div>
                      <div className="text-sm text-gray-600">Active</div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-50 rounded-lg">
                      <Target className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-purple-600">{filteredProspects.length}</div>
                      <div className="text-sm text-gray-600">Filtered Results</div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-50 rounded-lg">
                      <TrendingUp className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-amber-600">{selectedProspects.length}</div>
                      <div className="text-sm text-gray-600">Selected</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col gap-3">
              <div className="flex gap-3">
                <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
                  <DialogTrigger asChild>
                    <Button className="bg-gray-900 hover:bg-gray-800 text-white shadow-lg gap-2">
                      <Plus className="h-4 w-4" />
                      Add Prospect
                    </Button>
                  </DialogTrigger>
                </Dialog>
                
                <Dialog open={showImportForm} onOpenChange={setShowImportForm}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-50 gap-2">
                      <Upload className="h-4 w-4" />
                      Import CSV
                    </Button>
                  </DialogTrigger>
                </Dialog>
              </div>
              
              <div className="flex gap-3">
                <Button variant="outline" onClick={downloadTemplate} className="border-gray-300 text-gray-700 hover:bg-gray-50 gap-2">
                  <Download className="h-4 w-4" />
                  Template
                </Button>
                
                <Button variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-50 gap-2">
                  <Zap className="h-4 w-4" />
                  Smart Segments
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Search and Filter Bar */}
        <Card className="mb-6 border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardContent className="p-6">
            {/* Main Search Row */}
            <div className="flex flex-col lg:flex-row gap-4 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  placeholder="Search prospects by name, email, company, location, or any field..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 h-12 text-base border-gray-200 focus:border-gray-900 focus:ring-2 focus:ring-gray-900/20 rounded-xl"
                />
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className={`h-12 gap-2 ${showAdvancedFilters ? 'bg-blue-50 border-blue-200 text-blue-700' : ''}`}
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  Advanced Filters
                  <ChevronDown className={`h-4 w-4 transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`} />
                </Button>
              </div>
            </div>

            {/* Quick Filters Row */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">Quick filters:</span>
                <Button
                  variant={statusFilter === 'active' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter(statusFilter === 'active' ? 'all' : 'active')}
                  className="h-8 text-xs"
                >
                  Active ({prospects.filter(p => p.status === 'active').length})
                </Button>
                <Button
                  variant={statusFilter === 'suppressed' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter(statusFilter === 'suppressed' ? 'all' : 'suppressed')}
                  className="h-8 text-xs"
                >
                  Suppressed ({prospects.filter(p => p.status === 'suppressed').length})
                </Button>
                <Button
                  variant={tagFilter !== '__all__' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTagFilter(tagFilter === '__all__' ? getUniqueTags()[0] || '__all__' : '__all__')}
                  className="h-8 text-xs"
                >
                  <Tag className="h-3 w-3 mr-1" />
                  Tagged ({prospects.filter(p => p.tags && p.tags.length > 0).length})
                </Button>
              </div>
              
              <div className="flex items-center gap-2 ml-auto">
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-40 h-8 text-xs">
                    <ArrowUpDown className="h-3 w-3 mr-1" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="oldest">Oldest First</SelectItem>
                    <SelectItem value="name">Name A-Z</SelectItem>
                    <SelectItem value="company">Company A-Z</SelectItem>
                    <SelectItem value="status">Status</SelectItem>
                  </SelectContent>
                </Select>
                
                <div className="flex border border-gray-200 rounded-lg overflow-hidden">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    className="rounded-none h-8 px-3 text-xs"
                  >
                    Grid
                  </Button>
                  <Button
                    variant={viewMode === 'table' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('table')}
                    className="rounded-none h-8 px-3 text-xs"
                  >
                    Table
                  </Button>
                </div>
              </div>
            </div>

            {/* Advanced Filters Panel */}
            {showAdvancedFilters && (
              <div className="border-t border-gray-200 pt-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">Status</label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="All Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        {getUniqueStatuses().map(status => (
                          <SelectItem key={status} value={status}>
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${getStatusColor(status).replace('text-', 'bg-').replace('bg-', 'bg-').split(' ')[0]}`} />
                              {status}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">Tags</label>
                    <Select value={tagFilter} onValueChange={setTagFilter}>
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="All Tags" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">All Tags</SelectItem>
                        {getUniqueTags().map(tag => (
                          <SelectItem key={tag} value={tag}>
                            <Tag className="h-3 w-3 mr-2" />
                            {tag}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">Company</label>
                    <Input placeholder="Filter by company" className="h-10" />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">Location</label>
                    <Input placeholder="Filter by location" className="h-10" />
                  </div>
                </div>
                
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" className="gap-2">
                      <Bookmark className="h-4 w-4" />
                      Save Filter Set
                    </Button>
                    {savedFilters.length > 0 && (
                      <Select>
                        <SelectTrigger className="w-48 h-8">
                          <SelectValue placeholder="Load saved filter" />
                        </SelectTrigger>
                        <SelectContent>
                          {savedFilters.map((filter, index) => (
                            <SelectItem key={index} value={filter.id}>{filter.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => {
                      setSearchTerm('');
                      setStatusFilter('all');
                      setTagFilter('__all__');
                    }}>
                      Clear All
                    </Button>
                    <Button size="sm" className="gap-2">
                      <Filter className="h-4 w-4" />
                      Apply Filters
                    </Button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Enhanced Bulk Actions */}
            {selectedProspects.length > 0 && (
              <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <CheckSquare className="h-5 w-5 text-blue-600" />
                      <span className="font-semibold text-blue-900">
                        {selectedProspects.length} prospects selected
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedProspects([])}
                      className="text-blue-700 hover:text-blue-900 hover:bg-blue-100"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleBulkAction('active')} className="gap-2">
                      <CheckSquare className="h-4 w-4" />
                      Activate
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleBulkAction('suppressed')} className="gap-2">
                      <Square className="h-4 w-4" />
                      Suppress
                    </Button>
                    <Button size="sm" variant="outline" className="gap-2">
                      <Tag className="h-4 w-4" />
                      Add Tags
                    </Button>
                    <Button size="sm" variant="outline" className="gap-2">
                      <Download className="h-4 w-4" />
                      Export
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleBulkAction('delete')} className="gap-2">
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Main Content Area */}
        {filteredProspects.length === 0 ? (
          <Card className="text-center py-16 border border-gray-200 bg-white shadow-sm">
            <CardContent>
              <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No prospects found</h3>
              <p className="text-gray-600 mb-6">
                {searchTerm || statusFilter !== 'all' || tagFilter !== '__all__'
                  ? 'Try adjusting your filters or search terms'
                  : 'Add your first prospect to start building your contact database'
                }
              </p>
              {!searchTerm && statusFilter === 'all' && tagFilter === '__all__' && (
                <Button onClick={() => setShowAddForm(true)} className="bg-gray-900 hover:bg-gray-800">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Prospect
                </Button>
              )}
            </CardContent>
          </Card>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProspects.map((prospect) => (
              <ProspectCard 
                key={prospect._id} 
                prospect={prospect}
                isSelected={selectedProspects.includes(prospect._id)}
                onSelect={() => toggleProspectSelection(prospect._id)}
                onEdit={() => setEditingProspect(prospect)}
                onDelete={() => handleDeleteProspect(prospect._id)}
                onView={() => setShowProspectDetails(prospect)}
                onStatusChange={(status) => updateProspectStatus(prospect._id, status)}
              />
            ))}
          </div>
        ) : (
          <ProspectsTable 
            prospects={filteredProspects}
            selectedProspects={selectedProspects}
            onSelectAll={selectAllProspects}
            onSelect={toggleProspectSelection}
            onEdit={setEditingProspect}
            onDelete={handleDeleteProspect}
            onView={setShowProspectDetails}
            onStatusChange={updateProspectStatus}
          />
        )}

        {/* Add Prospect Dialog */}
        <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Prospect</DialogTitle>
            </DialogHeader>
            <ProspectForm 
              prospect={newProspect}
              customFields={customFields}
              setCustomFields={setCustomFields}
              setProspect={setNewProspect}
              onSubmit={handleAddProspect}
              onCancel={() => setShowAddForm(false)}
              isEditing={false}
            />
          </DialogContent>
        </Dialog>

        {/* Edit Prospect Dialog */}
        <Dialog open={!!editingProspect} onOpenChange={() => setEditingProspect(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Prospect</DialogTitle>
            </DialogHeader>
            {editingProspect && (
              <ProspectForm 
                prospect={editingProspect} 
                customFields={customFields}
                setCustomFields={setCustomFields}
                setProspect={setEditingProspect}
                onSubmit={handleEditProspect}
                onCancel={() => setEditingProspect(null)}
                isEditing={true}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Enhanced CSV Import */}
        <EnhancedCSVImport
          isOpen={showImportForm}
          onClose={() => setShowImportForm(false)}
          onImport={handleCSVImport}
          title="Import Prospects Database"
          description="Upload and manage your prospect database with advanced field mapping and multiple email support"
        />

        {/* Prospect Details Dialog */}
        <Dialog open={!!showProspectDetails} onOpenChange={() => setShowProspectDetails(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Prospect Details</DialogTitle>
            </DialogHeader>
            {showProspectDetails && (
              <ProspectDetails prospect={showProspectDetails} />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

// Prospect Card Component
function ProspectCard({ prospect, isSelected, onSelect, onEdit, onDelete, onView, onStatusChange }) {
  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'suppressed': return 'bg-red-100 text-red-800 border-red-200';
      case 'bounced': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'unsubscribed': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  return (
    <Card className={`group hover:shadow-lg transition-all duration-200 cursor-pointer border-0 bg-white/80 backdrop-blur-sm ${isSelected ? 'ring-2 ring-blue-500' : ''}`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={onSelect}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-blue-100 text-blue-700">
                {prospect.firstName?.[0]}{prospect.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button size="sm" variant="ghost" onClick={onView}>
              <Eye className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={onEdit}>
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={onDelete} className="text-red-600 hover:text-red-700">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <h3 className="font-semibold text-gray-900 text-lg">
              {prospect.firstName} {prospect.lastName}
            </h3>
            <p className="text-gray-600 text-sm">{prospect.email}</p>
          </div>

          {prospect.company && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Building className="h-4 w-4" />
              <span>{prospect.company}</span>
            </div>
          )}

          {(prospect.city || prospect.neighborhood) && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <MapPin className="h-4 w-4" />
              <span>{prospect.neighborhood || prospect.city}</span>
            </div>
          )}

          {prospect.listingPrice && (
            <div className="text-sm font-medium text-green-600">
              {prospect.listingPrice}
            </div>
          )}

          <div className="flex items-center justify-between">
            <Badge className={`text-xs px-2 py-1 ${getStatusColor(prospect.status)}`}>
              {prospect.status}
            </Badge>
            
            {prospect.tags && prospect.tags.length > 0 && (
              <div className="flex gap-1">
                {prospect.tags.slice(0, 2).map((tag, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
                {prospect.tags.length > 2 && (
                  <Badge variant="outline" className="text-xs">
                    +{prospect.tags.length - 2}
                  </Badge>
                )}
              </div>
            )}
          </div>

          {(prospect.linkedin || prospect.instagram || prospect.website || prospect.facebook || prospect.zillow) && (
            <div className="flex gap-2 pt-2 border-t border-gray-100 flex-wrap">
              {prospect.linkedin && (
                <Button size="sm" variant="ghost" asChild>
                  <a href={prospect.linkedin.startsWith('http') ? prospect.linkedin : `https://${prospect.linkedin}`} target="_blank" rel="noopener noreferrer">
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.338 16.338H13.67V12.16c0-.995-.017-2.277-1.387-2.277-1.39 0-1.601 1.086-1.601 2.207v4.248H8.014v-8.59h2.559v1.174h.037c.356-.675 1.227-1.387 2.527-1.387 2.703 0 3.2 1.778 3.2 4.091v4.715zM5.337 7.433c-.322 0-.58-.26-.58-.58 0-.322.26-.58.58-.58.32 0 .58.258.58.58 0 .32-.26.58-.58.58zm.5 8.925H3.26V8.59h2.577v7.768zM17.34 3.75H2.66C2.3 3.75 2 4.05 2 4.41v12.18c0 .36.3.66.66.66h14.68c.36 0 .66-.3.66-.66V4.41c0-.36-.3-.66-.66-.66z" clipRule="evenodd" />
                    </svg>
                  </a>
                </Button>
              )}
              {prospect.instagram && (
                <Button size="sm" variant="ghost" asChild>
                  <a href={`https://instagram.com/${prospect.instagram.replace(/^@/, '')}`} target="_blank" rel="noopener noreferrer">
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.987 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12.001 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                    </svg>
                  </a>
                </Button>
              )}
              {prospect.facebook && (
                <Button size="sm" variant="ghost" asChild>
                  <a href={prospect.facebook.startsWith('http') ? prospect.facebook : `https://${prospect.facebook}`} target="_blank" rel="noopener noreferrer">
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  </a>
                </Button>
              )}
              {prospect.zillow && (
                <Button size="sm" variant="ghost" asChild title="Zillow Profile">
                  <a href={prospect.zillow.startsWith('http') ? prospect.zillow : `https://${prospect.zillow}`} target="_blank" rel="noopener noreferrer">
                    <Globe className="h-4 w-4" />
                  </a>
                </Button>
              )}
              {prospect.website && (
                <Button size="sm" variant="ghost" asChild title="Personal Website">
                  <a href={prospect.website.startsWith('http') ? prospect.website : `https://${prospect.website}`} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Prospects Table Component
function ProspectsTable({ prospects, selectedProspects, onSelectAll, onSelect, onEdit, onDelete, onView, onStatusChange }) {
  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'suppressed': return 'text-red-600 bg-red-100';
      case 'bounced': return 'text-yellow-600 bg-yellow-100';
      case 'unsubscribed': return 'text-gray-600 bg-gray-100';
      default: return 'text-blue-600 bg-blue-100';
    }
  };

  return (
    <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedProspects.length === prospects.length && prospects.length > 0}
                    onChange={onSelectAll}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Company
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {prospects.map((prospect) => (
                <tr key={prospect._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedProspects.includes(prospect._id)}
                      onChange={() => onSelect(prospect._id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Avatar className="h-8 w-8 mr-3">
                        <AvatarFallback className="bg-blue-100 text-blue-700 text-sm">
                          {prospect.firstName?.[0]}{prospect.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {prospect.firstName} {prospect.lastName}
                        </div>
                        {prospect.tags && prospect.tags.length > 0 && (
                          <div className="text-xs text-gray-500">
                            {prospect.tags.slice(0, 3).join(', ')}
                            {prospect.tags.length > 3 && '...'}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {prospect.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {prospect.company || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {prospect.neighborhood || prospect.city || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge className={`text-xs px-2 py-1 ${getStatusColor(prospect.status)}`}>
                      {prospect.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" onClick={() => onView(prospect)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => onEdit(prospect)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => onDelete(prospect._id)} className="text-red-600 hover:text-red-700">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// Prospect Form Component
function ProspectForm({ prospect, customFields, setCustomFields, setProspect, onSubmit, onCancel, isEditing }) {
  const [formData, setFormData] = useState(prospect);

  useEffect(() => {
    if (prospect.customFields && prospect.customFields.length > 0) {
      setCustomFields(prospect.customFields);
    } else {
      setCustomFields([{ name: '', value: '' }]);
    }
  }, [prospect]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.website && !formData.linkedin && !formData.instagram && !formData.facebook && !formData.zillow) {
      toast.error('Please provide at least one social/web link (Website, LinkedIn, Instagram, Facebook, or Zillow)');
      return;
    }
    onSubmit({
      ...formData,
      customFields: customFields.filter(field => field.name.trim() !== '')
    });
  };

  const handleCustomFieldChange = (index, field, value) => {
    const newCustomFields = [...customFields];
    newCustomFields[index] = { ...newCustomFields[index], [field]: value };
    setCustomFields(newCustomFields);
  };

  const addCustomField = () => {
    setCustomFields([...customFields, { name: '', value: '' }]);
  };

  const removeCustomField = (index) => {
    const newCustomFields = customFields.filter((_, i) => i !== index);
    setCustomFields(newCustomFields.length ? newCustomFields : [{ name: '', value: '' }]);
  };

  const handleTagsChange = (e) => {
    const value = e.target.value;
    setFormData({
      ...formData,
      tags: value.split(',').map(tag => tag.trim()).filter(tag => tag)
    });
  };

  const tagsValue = Array.isArray(formData.tags) ? formData.tags.join(', ') : formData.tags || '';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Basic Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              First Name *
            </label>
            <Input
              type="text"
              value={formData.firstName || ''}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Last Name
            </label>
            <Input
              type="text"
              value={formData.lastName || ''}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            />
          </div>
          <div className="col-span-2">
            <MultiEmailInput
              primaryEmail={formData.email}
              additionalEmails={formData.additionalEmails || []}
              onPrimaryEmailChange={(email) => setFormData({ ...formData, email })}
              onAdditionalEmailsChange={(emails) => setFormData({ ...formData, additionalEmails: emails })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone
            </label>
            <Input
              type="tel"
              value={formData.phone || ''}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>
        </div>
      </div>
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Professional Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Company
            </label>
            <Input
              type="text"
              value={formData.company || ''}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Position
            </label>
            <Input
              type="text"
              value={formData.position || ''}
              onChange={(e) => setFormData({ ...formData, position: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Industry
            </label>
            <Input
              type="text"
              value={formData.industry || ''}
              onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Website
            </label>
            <Input
              type="url"
              value={formData.website || ''}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              placeholder="https://"
            />
          </div>
        </div>
      </div>
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Social Media</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              LinkedIn URL
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.338 16.338H13.67V12.16c0-.995-.017-2.277-1.387-2.277-1.39 0-1.601 1.086-1.601 2.207v4.248H8.014v-8.59h2.559v1.174h.037c.356-.675 1.227-1.387 2.527-1.387 2.703 0 3.2 1.778 3.2 4.091v4.715zM5.337 7.433c-.322 0-.58-.26-.58-.58 0-.322.26-.58.58-.58.32 0 .58.258.58.58 0 .32-.26.58-.58.58zm.5 8.925H3.26V8.59h2.577v7.768zM17.34 3.75H2.66C2.3 3.75 2 4.05 2 4.41v12.18c0 .36.3.66.66.66h14.68c.36 0 .66-.3.66-.66V4.41c0-.36-.3-.66-.66-.66z" clipRule="evenodd" />
                </svg>
              </div>
              <Input
                type="url"
                value={formData.linkedin || ''}
                onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                className="pl-10"
                placeholder="https://linkedin.com/in/username"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Instagram
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.987 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12.001 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                </svg>
              </div>
              <Input
                type="text"
                value={formData.instagram || ''}
                onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                className="pl-10"
                placeholder="username"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Facebook
            </label>
            <Input
              type="text"
              value={formData.facebook || ''}
              onChange={(e) => setFormData({ ...formData, facebook: e.target.value })}
              placeholder="facebook.com/username"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Zillow
            </label>
            <Input
              type="text"
              value={formData.zillow || ''}
              onChange={(e) => setFormData({ ...formData, zillow: e.target.value })}
              placeholder="zillow.com/profile/username"
            />
          </div>
        </div>
      </div>
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Additional Information</h3>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Personalization Note
          </label>
          <Textarea
            value={formData.personalizationNote || ''}
            onChange={(e) => setFormData({ ...formData, personalizationNote: e.target.value })}
            rows={3}
            placeholder="Add any personal notes or details about this prospect..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tags
          </label>
          <Input
            type="text"
            value={tagsValue}
            onChange={handleTagsChange}
            placeholder="tag1, tag2, tag3"
          />
          <p className="mt-1 text-xs text-gray-500">Separate tags with commas</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes
          </label>
          <Textarea
            value={formData.notes || ''}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={3}
            placeholder="Add any additional notes..."
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Custom Fields</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addCustomField}
          >
            <Plus className="h-4 w-4 mr-1" /> Add Field
          </Button>
        </div>
        <div className="space-y-3">
          {customFields.map((field, index) => (
            <div key={index} className="flex items-start space-x-2">
              <div className="flex-1 grid grid-cols-2 gap-2">
                <Input
                  type="text"
                  placeholder="Field name"
                  value={field.name}
                  onChange={(e) => handleCustomFieldChange(index, 'name', e.target.value)}
                />
                <div className="flex items-center space-x-2">
                  <Input
                    type="text"
                    placeholder="Value"
                    value={field.value}
                    onChange={(e) => handleCustomFieldChange(index, 'value', e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeCustomField(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="flex justify-end space-x-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button type="submit">
          {isEditing ? 'Update Prospect' : 'Add Prospect'}
        </Button>
      </div>
    </form>
  );
}

// Prospect Details Component
function ProspectDetails({ prospect }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16">
          <AvatarFallback className="bg-blue-100 text-blue-700 text-xl">
            {prospect.firstName?.[0]}{prospect.lastName?.[0]}
          </AvatarFallback>
        </Avatar>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {prospect.firstName} {prospect.lastName}
          </h2>
          <p className="text-gray-600">{prospect.position || 'No position specified'}</p>
          <p className="text-gray-500 text-sm">{prospect.company || 'No company specified'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Contact Information</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-gray-500" />
              <a href={`mailto:${prospect.email}`} className="text-blue-600 hover:underline">
                {prospect.email}
              </a>
            </div>
            {prospect.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-gray-500" />
                <a href={`tel:${prospect.phone}`} className="text-gray-700">
                  {prospect.phone}
                </a>
              </div>
            )}
            {prospect.company && (
              <div className="flex items-center gap-2">
                <Building className="h-4 w-4 text-gray-500" />
                <span>{prospect.company}</span>
              </div>
            )}
            {prospect.position && (
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-gray-500" />
                <span>{prospect.position}</span>
              </div>
            )}
            {prospect.industry && (
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-gray-500" />
                <span>{prospect.industry}</span>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Social & Web</h3>
          <div className="space-y-2">
            {prospect.website && (
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-gray-500" />
                <a 
                  href={prospect.website.startsWith('http') ? prospect.website : `https://${prospect.website}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {prospect.website.replace(/^https?:\/\//, '')}
                </a>
              </div>
            )}
            {prospect.linkedin && (
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.338 16.338H13.67V12.16c0-.995-.017-2.277-1.387-2.277-1.39 0-1.601 1.086-1.601 2.207v4.248H8.014v-8.59h2.559v1.174h.037c.356-.675 1.227-1.387 2.527-1.387 2.703 0 3.2 1.778 3.2 4.091v4.715zM5.337 7.433c-.322 0-.58-.26-.58-.58 0-.322.26-.58.58-.58.32 0 .58.258.58.58 0 .32-.26.58-.58.58zm.5 8.925H3.26V8.59h2.577v7.768zM17.34 3.75H2.66C2.3 3.75 2 4.05 2 4.41v12.18c0 .36.3.66.66.66h14.68c.36 0 .66-.3.66-.66V4.41c0-.36-.3-.66-.66-.66z" clipRule="evenodd" />
                </svg>
                <a 
                  href={prospect.linkedin.startsWith('http') ? prospect.linkedin : `https://${prospect.linkedin}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {prospect.linkedin.replace(/^https?:\/\//, '').replace(/^www\./i, '')}
                </a>
              </div>
            )}
            {prospect.instagram && (
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.987 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12.001 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                </svg>
                <a 
                  href={`https://instagram.com/${prospect.instagram.replace(/^@/, '')}`}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  @{prospect.instagram.replace(/^@/, '')}
                </a>
              </div>
            )}
            {prospect.facebook && (
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                <a 
                  href={prospect.facebook.startsWith('http') ? prospect.facebook : `https://${prospect.facebook}`}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {prospect.facebook.replace(/^https?:\/\//, '').replace(/^www\./i, '')}
                </a>
              </div>
            )}
            {prospect.zillow && (
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-gray-500" />
                <a 
                  href={prospect.zillow.startsWith('http') ? prospect.zillow : `https://${prospect.zillow}`}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  Zillow Profile
                </a>
              </div>
            )}
            {prospect.personalizationNote && (
              <div className="pt-2">
                <h4 className="text-sm font-medium text-gray-500">Personalization Note</h4>
                <p className="text-gray-900 whitespace-pre-line">{prospect.personalizationNote}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {prospect.tags && prospect.tags.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Tags</h3>
            <div className="flex flex-wrap gap-2">
              {prospect.tags.map((tag, index) => (
                <Badge key={index} variant="outline">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {prospect.customFields && prospect.customFields.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Custom Fields</h3>
            <div className="space-y-2">
              {prospect.customFields.map((field, index) => (
                field.name && field.value && (
                  <div key={index} className="flex gap-2">
                    <span className="font-medium text-gray-500 w-1/3">{field.name}:</span>
                    <span className="text-gray-900">{field.value}</span>
                  </div>
                )
              ))}
            </div>
          </div>
        )}
      </div>

      {prospect.notes && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Notes</h3>
          <div className="bg-gray-50 p-4 rounded-md">
            <p className="whitespace-pre-line">{prospect.notes}</p>
          </div>
        </div>
      )}
    </div>
  );
}
