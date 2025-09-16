import dbConnect from '../../../../lib/mongodb.js';
import Campaign from '../../../../models/Campaign.js';
import Mailbox from '../../../../models/MailboxFixed.js';
import Prospect from '../../../../models/Prospect.js';

export async function GET(request) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('id');
    
    if (campaignId) {
      // Debug specific campaign
      return await debugSpecificCampaign(campaignId);
    } else {
      // Debug all campaigns overview
      return await debugAllCampaigns();
    }
    
  } catch (error) {
    console.error('Campaign debug error:', error);
    return Response.json(
      { success: false, error: 'Failed to debug campaigns: ' + error.message },
      { status: 500 }
    );
  }
}

async function debugSpecificCampaign(campaignId) {
  const campaign = await Campaign.findById(campaignId)
    .populate('prospects.prospectId')
    .populate('options.selectedMailbox');
    
  if (!campaign) {
    return Response.json(
      { success: false, error: 'Campaign not found' },
      { status: 404 }
    );
  }
  
  // Analyze prospects
  const prospectAnalysis = {
    total: campaign.prospects?.length || 0,
    byStatus: {},
    readyToSend: 0,
    withNextSendAt: 0,
    activeProspects: 0
  };
  
  const now = new Date();
  
  for (const cp of campaign.prospects || []) {
    const status = cp.status || 'unknown';
    prospectAnalysis.byStatus[status] = (prospectAnalysis.byStatus[status] || 0) + 1;
    
    if (cp.nextSendAt) {
      prospectAnalysis.withNextSendAt++;
      if (cp.status === 'active' && new Date(cp.nextSendAt) <= now) {
        prospectAnalysis.readyToSend++;
      }
    }
    
    if (cp.prospectId?.status === 'active') {
      prospectAnalysis.activeProspects++;
    }
  }
  
  // Check mailbox configuration
  const mailboxConfig = {
    hasSelectedMailbox: !!campaign.options?.selectedMailbox,
    hasMailboxesArray: !!(campaign.mailboxes?.length),
    selectedMailboxDetails: null,
    mailboxesArrayDetails: []
  };
  
  if (campaign.options?.selectedMailbox) {
    const mailbox = await Mailbox.findById(campaign.options.selectedMailbox);
    mailboxConfig.selectedMailboxDetails = {
      id: mailbox?._id,
      email: mailbox?.fromEmail,
      status: mailbox?.status,
      dailySent: mailbox?.dailySent,
      dailyCap: mailbox?.dailyCap
    };
  }
  
  if (campaign.mailboxes?.length) {
    for (const mailboxId of campaign.mailboxes) {
      const mailbox = await Mailbox.findById(mailboxId);
      mailboxConfig.mailboxesArrayDetails.push({
        id: mailbox?._id,
        email: mailbox?.fromEmail,
        status: mailbox?.status,
        dailySent: mailbox?.dailySent,
        dailyCap: mailbox?.dailyCap
      });
    }
  }
  

  
  // Check sequence configuration
  const sequenceConfig = {
    hasSequence: !!(campaign.sequence?.length),
    stepCount: campaign.sequence?.length || 0,
    steps: campaign.sequence?.map((step, index) => ({
      stepNumber: step.stepNumber,
      hasSubject: !!step.subject,
      hasTemplate: !!step.template,

    })) || []
  };
  
  return Response.json({
    success: true,
    campaignId: campaign._id,
    campaignName: campaign.name,
    campaignStatus: campaign.status,
    diagnosis: {
      canSendEmails: (
        campaign.status === 'active' &&
        prospectAnalysis.readyToSend > 0 &&
        (mailboxConfig.hasSelectedMailbox || mailboxConfig.hasMailboxesArray) &&
        sequenceConfig.hasSequence
      ),
      issues: [],
      prospectAnalysis,
      mailboxConfig,
      scheduleConfig,
      sequenceConfig
    }
  });
}

async function debugAllCampaigns() {
  const campaigns = await Campaign.find()
    .populate('options.selectedMailbox')
    .sort({ updatedAt: -1 });
    
  const summary = {
    total: campaigns.length,
    byStatus: {},
    canSendEmails: 0,
    hasIssues: 0
  };
  
  const campaignDetails = [];
  
  for (const campaign of campaigns) {
    const status = campaign.status;
    summary.byStatus[status] = (summary.byStatus[status] || 0) + 1;
    
    const issues = [];
    
    // Check for common issues
    if (campaign.status !== 'active') {
      issues.push('Campaign not active');
    }
    
    if (!campaign.prospects || campaign.prospects.length === 0) {
      issues.push('No prospects');
    }
    
    if (!campaign.sequence || campaign.sequence.length === 0) {
      issues.push('No sequence steps');
    }
    
    if (!campaign.options?.selectedMailbox && (!campaign.mailboxes || campaign.mailboxes.length === 0)) {
      issues.push('No mailbox configured');
    }
    
    const activeProspects = campaign.prospects?.filter(cp => 
      cp.status === 'active' && cp.nextSendAt && new Date(cp.nextSendAt) <= new Date()
    ).length || 0;
    
    if (campaign.status === 'active' && activeProspects === 0) {
      issues.push('No prospects ready to send');
    }
    
    const canSend = issues.length === 0;
    
    if (canSend) summary.canSendEmails++;
    if (issues.length > 0) summary.hasIssues++;
    
    campaignDetails.push({
      id: campaign._id,
      name: campaign.name,
      status: campaign.status,
      prospects: campaign.prospects?.length || 0,
      activeProspects,
      readyToSend: activeProspects,
      hasMailbox: !!(campaign.options?.selectedMailbox || campaign.mailboxes?.length),
      hasSequence: !!(campaign.sequence?.length),
      canSendEmails: canSend,
      issues
    });
  }
  
  return Response.json({
    success: true,
    summary,
    campaigns: campaignDetails
  });
}
