'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Play, Pause, Zap, Mail, Trash2 } from 'lucide-react';

export default function Header({
  campaign,
  getStatusColor,
  sendTestEmail,
  processSequencesManually,
  pauseCampaign,
  resumeCampaign,
  startCampaign,
  deleteCampaign,
}) {
  const router = useRouter();

  const getStatusVariant = (status) => {
    switch (status) {
      case 'active': return 'default';
      case 'paused': return 'secondary';
      case 'completed': return 'outline';
      case 'draft': return 'secondary';
      default: return 'secondary';
    }
  };

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4 mb-6">
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
        {/* Left Section - Campaign Info */}
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/campaigns')}
              className="text-gray-500 hover:text-gray-700 p-1 h-8 w-8"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold text-gray-900 truncate">{campaign.name}</h1>
            <Badge variant={getStatusVariant(campaign.status)} className="capitalize">
              {campaign.status}
            </Badge>
          </div>
          {campaign.description && (
            <p className="text-gray-600 text-sm ml-11">{campaign.description}</p>
          )}
          
          {/* Campaign Stats */}
          <div className="flex items-center gap-6 mt-3 ml-11 text-sm text-gray-500">
            <span>{campaign.prospects?.length || 0} prospects</span>
            <span>•</span>
            <span>{campaign.sequence?.length || 0} steps</span>
            <span>•</span>
            <span>Created {new Date(campaign.createdAt).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Right Section - Action Buttons */}
        <div className="flex flex-wrap gap-2 lg:flex-nowrap">
          <Button
            variant="outline"
            size="sm"
            onClick={sendTestEmail}
            className="flex items-center gap-2"
          >
            <Mail className="h-4 w-4" />
            Test Email
          </Button>
          
          
          <Button
            variant="outline"
            size="sm"
            onClick={processSequencesManually}
            className="flex items-center gap-2 text-blue-600 border-blue-200 hover:bg-blue-50"
          >
            <Zap className="h-4 w-4" />
            Process Now
          </Button>
          
          {campaign.status === 'active' && (
            <Button
              variant="outline"
              size="sm"
              onClick={pauseCampaign}
              className="flex items-center gap-2 text-yellow-600 border-yellow-200 hover:bg-yellow-50"
            >
              <Pause className="h-4 w-4" />
              Pause
            </Button>
          )}
          
          {campaign.status === 'paused' && (
            <Button
              variant="default"
              size="sm"
              onClick={resumeCampaign}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
            >
              <Play className="h-4 w-4" />
              Resume
            </Button>
          )}

          {campaign.status === 'draft' && (
            <Button
              variant="default"
              size="sm"
              onClick={startCampaign}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
            >
              <Play className="h-4 w-4" />
              Start
            </Button>
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={deleteCampaign}
            className="flex items-center gap-2 text-red-600 border-red-200 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}
