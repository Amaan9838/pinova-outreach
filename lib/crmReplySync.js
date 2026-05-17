import Lead from '../models/Lead.js';
import CrmActivity from '../models/CrmActivity.js';

function getProspectName(prospect) {
  const name = `${prospect?.firstName || ''} ${prospect?.lastName || ''}`.trim();
  return name || prospect?.email || 'Unknown lead';
}

export async function syncReplyToCrmLead({ prospect, campaign, mailbox, replyText, subject }) {
  if (!prospect?.email) return null;

  // Prospect remains the canonical contact-list record.
  // This only mirrors reply activity into the CRM Lead pipeline by email.
  const now = new Date();
  const existingLead = await Lead.findOne({ email: prospect.email });
  const timelineEntry = {
    type: 'email_replied',
    content: (replyText || subject || 'Email reply received').slice(0, 2000),
    by: 'system',
    channel: 'email',
    sentiment: 'neutral',
    metadata: {
      campaignId: campaign?._id || campaign || null,
      campaignName: campaign?.name || '',
      mailboxId: mailbox?._id || mailbox || null,
      mailboxEmail: mailbox?.fromEmail || '',
      subject: subject || ''
    },
    timestamp: now
  };

  const update = {
    $set: {
      firstName: prospect.firstName || existingLead?.firstName || prospect.email.split('@')[0],
      lastName: prospect.lastName || existingLead?.lastName || '',
      email: prospect.email,
      company: prospect.company || existingLead?.company || '',
      phone: prospect.phone || existingLead?.phone || '',
      website: prospect.website || existingLead?.website || '',
      linkedin: prospect.linkedin || existingLead?.linkedin || '',
      instagram: prospect.instagram || existingLead?.instagram || '',
      facebook: prospect.facebook || existingLead?.facebook || '',
      source: 'cold_email',
      pipelineStage: existingLead?.pipelineStage === 'prospect' || !existingLead ? 'lead' : existingLead.pipelineStage,
      heatLevel: existingLead?.heatLevel === 'hot' ? 'hot' : 'warm',
      engagementScore: Math.min(100, Math.max(existingLead?.engagementScore || 0, 35)),
      intentLevel: existingLead?.intentLevel === 'unknown' || !existingLead ? 'curious' : existingLead.intentLevel,
      relationshipStage: existingLead?.relationshipStage === 'stranger' || !existingLead ? 'engaged' : existingLead.relationshipStage,
      nurtureStatus: 'manual_follow_up',
      lastAction: {
        type: 'email',
        description: `Replied to ${campaign?.name || 'campaign email'}`,
        date: now,
        by: 'system'
      },
      nextAction: {
        type: 'follow_up',
        description: 'Review reply and decide next step',
        dueDate: now,
        priority: 'high',
        owner: existingLead?.owner || 'Amaan'
      },
      lastActivityAt: now
    },
    $push: { timeline: timelineEntry },
    $addToSet: { tags: 'replied-cold-email' }
  };

  const lead = await Lead.findOneAndUpdate(
    { email: prospect.email },
    update,
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await CrmActivity.create({
    user: 'System',
    action: 'received email reply from',
    target: getProspectName(prospect),
    type: 'c',
    timestamp: now
  }).catch((error) => {
    console.error('[crmReplySync] Failed to create CRM activity:', error.message);
  });

  return lead;
}
