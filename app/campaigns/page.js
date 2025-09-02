'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, Filter, Plus, MoreHorizontal, Play, Pause, Copy, Edit2, Trash2, Calendar, Users, Mail, Eye, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState([]);
  const [filteredCampaigns, setFilteredCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [showRenameDialog, setShowRenameDialog] = useState(null);
  const [renameName, setRenameName] = useState('');

  useEffect(() => {
    fetchCampaigns();
  }, []);

  // Filter and sort campaigns
  useEffect(() => {
    let filtered = campaigns;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(campaign => 
        campaign.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        campaign.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        campaign.persona?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(campaign => campaign.status === statusFilter);
    }

    // Sort campaigns
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        case 'oldest':
          return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
        case 'name':
          return (a.name || '').localeCompare(b.name || '');
        case 'prospects':
          return (b.prospects?.length || 0) - (a.prospects?.length || 0);
        default:
          return 0;
      }
    });

    setFilteredCampaigns(filtered);
  }, [campaigns, searchTerm, statusFilter, sortBy]);

  const fetchCampaigns = async () => {
    try {
      const response = await fetch('/api/campaigns');
      const data = await response.json();
      if (data.success) {
        setCampaigns(data.campaigns);
      }
    } catch (error) {
      console.error('Failed to fetch campaigns:', error);
      toast({
        title: "Error",
        description: "Failed to fetch campaigns",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCampaignAction = async (campaignId, action, newName = null) => {
    try {
      let endpoint = `/api/campaigns/${campaignId}`;
      let method = 'POST';
      let body = {};

      switch (action) {
        case 'start':
          endpoint += '/start';
          break;
        case 'pause':
          endpoint += '/pause';
          break;
        case 'resume':
          endpoint += '/resume';
          break;
        case 'duplicate':
          endpoint += '/duplicate';
          break;
        case 'rename':
          method = 'PATCH';
          body = { name: newName };
          break;
        case 'delete':
          method = 'DELETE';
          break;
      }

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: method !== 'DELETE' ? JSON.stringify(body) : undefined
      });

      const data = await response.json();
      if (data.success) {
        fetchCampaigns();
        toast.success(`Campaign ${action}d successfully`);
      } else {
        toast.error(data.error || `Failed to ${action} campaign`);
      }
    } catch (error) {
      console.error(`Failed to ${action} campaign:`, error);
      toast.error(`Failed to ${action} campaign`);
    }
  };

  const handleRename = (campaign) => {
    setShowRenameDialog(campaign);
    setRenameName(campaign.name);
  };

  const confirmRename = () => {
    if (showRenameDialog && renameName.trim()) {
      handleCampaignAction(showRenameDialog._id, 'rename', renameName.trim());
      setShowRenameDialog(null);
      setRenameName('');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'paused': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'completed': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'draft': return 'bg-gray-50 text-gray-700 border-gray-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getUniqueStatuses = () => {
    const statuses = [...new Set(campaigns.map(c => c.status).filter(Boolean))];
    return statuses;
  };

  // Skeleton Loader Component
  const CampaignSkeleton = () => (
    <Card className="border-0 shadow-sm bg-white">
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <div className="h-6 bg-gray-200 rounded-md w-48 mb-2 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded-md w-64 animate-pulse"></div>
          </div>
          <div className="h-6 bg-gray-200 rounded-full w-20 animate-pulse"></div>
        </div>
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="text-center">
              <div className="h-4 bg-gray-200 rounded w-16 mx-auto mb-2 animate-pulse"></div>
              <div className="h-8 bg-gray-200 rounded w-12 mx-auto animate-pulse"></div>
            </div>
          ))}
        </div>
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-28 animate-pulse"></div>
          </div>
          <div className="flex gap-2">
            <div className="h-9 bg-gray-200 rounded w-24 animate-pulse"></div>
            <div className="h-9 bg-gray-200 rounded w-8 animate-pulse"></div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header Skeleton */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="h-8 bg-gray-200 rounded w-48 mb-2 animate-pulse"></div>
                <div className="h-5 bg-gray-200 rounded w-64 animate-pulse"></div>
              </div>
              <div className="h-10 bg-gray-200 rounded w-36 animate-pulse"></div>
            </div>
          </div>
          
          {/* Filters Skeleton */}
          <Card className="mb-6 border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="h-10 bg-gray-200 rounded flex-1 animate-pulse"></div>
                <div className="flex gap-3">
                  <div className="h-10 bg-gray-200 rounded w-32 animate-pulse"></div>
                  <div className="h-10 bg-gray-200 rounded w-32 animate-pulse"></div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Campaign Cards Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <CampaignSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">Campaigns</h1>
              <p className="text-gray-600 text-lg">Manage your outreach campaigns with precision</p>
              <div className="flex items-center gap-6 mt-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                  <span className="text-sm font-medium text-gray-700">{campaigns.length} Total</span>
                </div>
                <div className="flex items-center gap-2">
                  <Play className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-medium text-gray-700">{campaigns.filter(c => c.status === 'active').length} Active</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-purple-600" />
                  <span className="text-sm font-medium text-gray-700">{filteredCampaigns.length} Filtered</span>
                </div>
              </div>
            </div>
            <Link href="/campaigns/new">
              <Button className="bg-black hover:bg-gray-800 text-white shadow-lg">
                <Plus className="h-4 w-4 mr-2" />
                Create Campaign
              </Button>
            </Link>
          </div>
        </div>

        {/* Search and Filter Bar */}
        <Card className="mb-6 border-0 shadow-sm bg-white">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search campaigns by name, description, or persona..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-12 text-base border-gray-200 focus:border-black focus:ring-black"
                />
              </div>
              <div className="flex gap-3">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40 h-12 border-gray-200">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    {getUniqueStatuses().map(status => (
                      <SelectItem key={status} value={status}>{status}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-40 h-12 border-gray-200">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Sort" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="oldest">Oldest First</SelectItem>
                    <SelectItem value="name">Name A-Z</SelectItem>
                    <SelectItem value="prospects">Most Prospects</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        {filteredCampaigns.length === 0 ? (
          <Card className="text-center py-16 border-0 shadow-sm bg-white">
            <CardContent>
              <TrendingUp className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {campaigns.length === 0 ? 'No campaigns yet' : 'No campaigns found'}
              </h3>
              <p className="text-gray-600 mb-6">
                {campaigns.length === 0 
                  ? 'Get started by creating your first outreach campaign'
                  : 'Try adjusting your search or filter criteria'
                }
              </p>
              {campaigns.length === 0 && (
                <Link href="/campaigns/new">
                  <Button className="bg-black hover:bg-gray-800 text-white">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Campaign
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredCampaigns.map((campaign) => (
              <Card key={campaign._id} className="group hover:shadow-lg transition-all duration-200 border-0 shadow-sm bg-white">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl font-semibold text-gray-900 mb-1 truncate">{campaign.name}</h3>
                      <p className="text-gray-600 text-sm line-clamp-2">{campaign.description}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Badge className={`text-xs px-3 py-1 border ${getStatusColor(campaign.status)}`}>
                        {campaign.status}
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => handleRename(campaign)}>
                            <Edit2 className="h-4 w-4 mr-2" />
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleCampaignAction(campaign._id, 'duplicate')}>
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          {campaign.status === 'active' ? (
                            <DropdownMenuItem onClick={() => handleCampaignAction(campaign._id, 'pause')}>
                              <Pause className="h-4 w-4 mr-2" />
                              Pause Campaign
                            </DropdownMenuItem>
                          ) : campaign.status === 'paused' ? (
                            <DropdownMenuItem onClick={() => handleCampaignAction(campaign._id, 'resume')}>
                              <Play className="h-4 w-4 mr-2" />
                              Resume Campaign
                            </DropdownMenuItem>
                          ) : null}
                          <DropdownMenuItem 
                            onClick={() => handleCampaignAction(campaign._id, 'delete')}
                            className="text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-4 gap-4 mb-6">
                    <div className="text-center">
                      <p className="text-xs text-gray-500 mb-1">Prospects</p>
                      <p className="text-2xl font-bold text-gray-900">{campaign.prospects?.length || 0}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500 mb-1">Sent</p>
                      <p className="text-2xl font-bold text-blue-600">{campaign.stats?.sent || 0}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500 mb-1">Opened</p>
                      <p className="text-2xl font-bold text-green-600">{campaign.stats?.opened || 0}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500 mb-1">Replied</p>
                      <p className="text-2xl font-bold text-purple-600">{campaign.stats?.replied || 0}</p>
                    </div>
                  </div>

                  {/* Campaign Details */}
                  <div className="space-y-2 mb-6">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Users className="h-4 w-4" />
                      <span><strong>Persona:</strong> {campaign.persona || 'Not set'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Mail className="h-4 w-4" />
                      <span><strong>Steps:</strong> {campaign.sequence?.length || 0}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="h-4 w-4" />
                      <span><strong>Created:</strong> {campaign.createdAt ? new Date(campaign.createdAt).toLocaleDateString() : 'Unknown'}</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-between items-center">
                    <div className="flex gap-2">
                      {campaign.status === 'draft' && (
                        <Button 
                          onClick={() => handleCampaignAction(campaign._id, 'start')}
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <Play className="h-4 w-4 mr-1" />
                          Start
                        </Button>
                      )}
                      {campaign.status === 'active' && (
                        <Button 
                          onClick={() => handleCampaignAction(campaign._id, 'pause')}
                          size="sm"
                          variant="outline"
                          className="border-amber-200 text-amber-700 hover:bg-amber-50"
                        >
                          <Pause className="h-4 w-4 mr-1" />
                          Pause
                        </Button>
                      )}
                      {campaign.status === 'paused' && (
                        <Button 
                          onClick={() => handleCampaignAction(campaign._id, 'resume')}
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <Play className="h-4 w-4 mr-1" />
                          Resume
                        </Button>
                      )}
                    </div>
                    <Link href={`/campaigns/${campaign._id}`}>
                      <Button variant="outline" size="sm" className="border-gray-200 hover:bg-gray-50">
                        <Eye className="h-4 w-4 mr-1" />
                        View Details
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Rename Dialog */}
        <Dialog open={!!showRenameDialog} onOpenChange={() => setShowRenameDialog(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Rename Campaign</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                value={renameName}
                onChange={(e) => setRenameName(e.target.value)}
                placeholder="Enter new campaign name"
                className="border-gray-200 focus:border-black focus:ring-black"
              />
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowRenameDialog(null)}>
                  Cancel
                </Button>
                <Button onClick={confirmRename} className="bg-black hover:bg-gray-800">
                  Rename
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
