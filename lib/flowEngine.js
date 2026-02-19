import dbConnect from './mongodb.js';
import Campaign from '../models/Campaign.js';
import CampaignProspect from '../models/CampaignProspect.js';
import EmailFlow from '../models/EmailFlow.js';
import ReplyCategory from '../models/ReplyCategory.js';
import Message from '../models/Message.js';
import Mailbox from '../models/MailboxFixed.js';
import Prospect from '../models/Prospect.js';
import { SMTPService } from './smtp.js';
import { aiService } from './services/vertexAI.js';
import crypto from 'crypto';

/**
 * FlowEngine - Executes visual email flows based on triggers
 * 
 * Triggers:
 * - campaign_started: Initial trigger when campaign activates
 * - email_sent: After an email is sent
 * - email_opened: When recipient opens email
 * - email_clicked: When recipient clicks a link
 * - email_replied: When recipient replies
 * - email_bounced: When email bounces
 * - timeout: After wait period expires (no action taken)
 */
export class FlowEngine {
  
  /**
   * Execute flow for a specific prospect based on a trigger
   * @param {string} campaignProspectId - CampaignProspect document ID
   * @param {string} trigger - Trigger type (opened, replied, timeout, etc.)
   * @param {object} triggerData - Additional trigger context
   */
  static async executeTrigger(campaignProspectId, trigger, triggerData = {}) {
    await dbConnect();
    
    const campaignProspect = await CampaignProspect.findById(campaignProspectId)
      .populate('campaign')
      .populate('prospect');
    
    if (!campaignProspect) {
      console.error(`FlowEngine: CampaignProspect ${campaignProspectId} not found`);
      return null;
    }
    
    const campaign = campaignProspect.campaign;
    
    // Check if campaign uses visual flow
    if (!campaign.useVisualFlow || !campaign.emailFlow) {
      console.log(`FlowEngine: Campaign ${campaign._id} does not use visual flow`);
      return null;
    }
    
    const flow = await EmailFlow.findById(campaign.emailFlow);
    if (!flow || !flow.isActive) {
      console.log(`FlowEngine: Flow not found or inactive for campaign ${campaign._id}`);
      return null;
    }
    
    // Get current node position
    const currentNodeId = campaignProspect.currentFlowNodeId || flow.startNodeId;
    const currentNode = flow.getNode(currentNodeId);
    
    if (!currentNode) {
      console.error(`FlowEngine: Node ${currentNodeId} not found in flow`);
      return null;
    }
    
    console.log(`FlowEngine: Processing trigger "${trigger}" for prospect ${campaignProspect.prospect.email} at node ${currentNodeId}`);
    
    // Record history
    await this.recordFlowHistory(campaignProspect, currentNodeId, trigger, triggerData);
    
    // Find next node based on trigger
    const nextNode = await this.evaluateNextNode(flow, currentNode, trigger, triggerData, campaignProspect);
    
    if (nextNode) {
      // Execute the next node
      await this.executeNode(flow, nextNode, campaignProspect, campaign);
      
      // Update position
      campaignProspect.currentFlowNodeId = nextNode.id;
      await campaignProspect.save();
      
      // Record edge traversal for analytics
      const edge = flow.edges.find(e => e.source === currentNodeId && e.target === nextNode.id);
      if (edge) {
        await flow.recordEdgeTraversal(edge.id);
      }
    } else {
      console.log(`FlowEngine: No next node found for trigger "${trigger}" from node ${currentNodeId}`);
    }
    
    return nextNode;
  }
  
  /**
   * Record flow history for a prospect
   */
  static async recordFlowHistory(campaignProspect, nodeId, trigger, data = {}) {
    if (!campaignProspect.flowHistory) {
      campaignProspect.flowHistory = [];
    }
    
    // Close previous entry if exists
    const lastEntry = campaignProspect.flowHistory[campaignProspect.flowHistory.length - 1];
    if (lastEntry && !lastEntry.exitedAt) {
      lastEntry.exitedAt = new Date();
    }
    
    // Add new entry
    campaignProspect.flowHistory.push({
      nodeId,
      enteredAt: new Date(),
      trigger,
      data
    });
    
    await campaignProspect.save();
  }
  
  /**
   * Evaluate which node to execute next based on current node and trigger
   */
  static async evaluateNextNode(flow, currentNode, trigger, triggerData, campaignProspect) {
    const outgoingEdges = flow.getOutgoingEdges(currentNode.id);
    
    if (outgoingEdges.length === 0) {
      // End of flow
      return null;
    }
    
    // For condition nodes, evaluate the condition
    if (currentNode.type === 'condition') {
      return this.evaluateConditionNode(flow, currentNode, trigger, triggerData, campaignProspect);
    }
    
    // For categorize nodes, route based on reply category
    if (currentNode.type === 'categorize') {
      return this.evaluateCategorizeNode(flow, currentNode, triggerData, campaignProspect);
    }
    
    // For other nodes (email, wait, action, start), follow the first outgoing edge
    if (outgoingEdges.length > 0) {
      return flow.getNode(outgoingEdges[0].target);
    }
    
    return null;
  }
  
  /**
   * Evaluate condition node and return the appropriate next node
   */
  static evaluateConditionNode(flow, conditionNode, trigger, triggerData, campaignProspect) {
    const conditionType = conditionNode.data?.conditionType;
    const outgoingEdges = flow.getOutgoingEdges(conditionNode.id);
    
    let matchedHandle = null;
    
    switch (conditionType) {
      case 'email_opened':
        matchedHandle = (trigger === 'email_opened' || campaignProspect.openedAt) ? 'yes' : 'no';
        break;
        
      case 'email_not_opened':
        matchedHandle = (!campaignProspect.openedAt && trigger === 'timeout') ? 'yes' : 'no';
        break;
        
      case 'email_clicked':
        matchedHandle = (trigger === 'email_clicked' || campaignProspect.clickedAt) ? 'yes' : 'no';
        break;
        
      case 'email_replied':
        matchedHandle = (trigger === 'email_replied' || campaignProspect.repliedAt) ? 'yes' : 'no';
        break;
        
      case 'email_bounced':
        matchedHandle = (trigger === 'email_bounced' || campaignProspect.bouncedAt) ? 'yes' : 'no';
        break;
        
      case 'no_action_after_wait':
        // Check if opened but no reply after wait period
        const hasOpened = campaignProspect.openedAt != null;
        const hasReplied = campaignProspect.repliedAt != null;
        matchedHandle = (hasOpened && !hasReplied && trigger === 'timeout') ? 'yes' : 'no';
        break;
        
      case 'reply_category':
        const targetCategory = conditionNode.data?.targetCategory;
        matchedHandle = (campaignProspect.replyCategory === targetCategory) ? 'yes' : 'no';
        break;
        
      default:
        matchedHandle = 'no';
    }
    
    // Find edge matching the handle
    const matchedEdge = outgoingEdges.find(e => e.sourceHandle === matchedHandle);
    
    if (matchedEdge) {
      return flow.getNode(matchedEdge.target);
    }
    
    // Fallback to first edge if no match
    if (outgoingEdges.length > 0) {
      return flow.getNode(outgoingEdges[0].target);
    }
    
    return null;
  }
  
  /**
   * Evaluate categorize node - routes based on AI-categorized reply type
   */
  static async evaluateCategorizeNode(flow, categorizeNode, triggerData, campaignProspect) {
    const outgoingEdges = flow.getOutgoingEdges(categorizeNode.id);
    const replyCategory = campaignProspect.replyCategory;
    
    if (!replyCategory) {
      // No category yet - might need to categorize first if this is a reply trigger
      if (triggerData.replyContent) {
        const category = await this.categorizeReply(triggerData.replyContent, categorizeNode.data);
        campaignProspect.replyCategory = category.name;
        campaignProspect.replyCategoryConfidence = category.confidence;
        campaignProspect.replyCategorizedAt = new Date();
        await campaignProspect.save();
      }
    }
    
    // Find edge matching the category (edge label or sourceHandle should match category slug)
    const categorySlug = campaignProspect.replyCategory?.toLowerCase().replace(/\s+/g, '-');
    const matchedEdge = outgoingEdges.find(e => 
      e.sourceHandle === categorySlug || 
      e.label?.toLowerCase().replace(/\s+/g, '-') === categorySlug
    );
    
    if (matchedEdge) {
      return flow.getNode(matchedEdge.target);
    }
    
    // Fallback behavior
    const fallbackBehavior = categorizeNode.data?.fallbackBehavior || 'none';
    if (fallbackBehavior === 'use_default_category') {
      const defaultCategory = categorizeNode.data?.defaultCategory || 'objection';
      const defaultEdge = outgoingEdges.find(e => 
        e.sourceHandle === defaultCategory || 
        e.label?.toLowerCase() === defaultCategory
      );
      if (defaultEdge) {
        return flow.getNode(defaultEdge.target);
      }
    }
    
    return null;
  }
  
  /**
   * Categorize a reply using AI
   */
  static async categorizeReply(replyContent, config = {}) {
    try {
      // Get available categories
      const categories = await ReplyCategory.find({
        $or: [{ isSystem: true }]
      });
      
      const result = await aiService.categorizeReply({
        replyContent,
        categories: categories.map(c => ({
          name: c.name,
          slug: c.slug,
          description: c.description,
          keywords: c.keywords
        })),
        confidenceThreshold: config.confidenceThreshold || 0.7
      });
      
      return result;
    } catch (error) {
      console.error('FlowEngine: Error categorizing reply:', error);
      return { name: 'objection', confidence: 0.5, error: error.message };
    }
  }
  
  /**
   * Execute a flow node
   */
  static async executeNode(flow, node, campaignProspect, campaign) {
    console.log(`FlowEngine: Executing node ${node.id} (${node.type})`);
    
    try {
      switch (node.type) {
        case 'start':
          // Move to next node immediately
          const nextFromStart = flow.findNextNode(node.id);
          if (nextFromStart) {
            await this.executeNode(flow, nextFromStart, campaignProspect, campaign);
          }
          break;
          
        case 'email':
          await this.executeEmailNode(node, campaignProspect, campaign);
          break;
          
        case 'wait':
          await this.executeWaitNode(node, campaignProspect);
          break;
          
        case 'condition':
          // Conditions are evaluated in evaluateNextNode, not executed
          break;
          
        case 'categorize':
          // Categorization happens in evaluateCategorizeNode
          break;
          
        case 'action':
          await this.executeActionNode(node, campaignProspect, campaign);
          break;
          
        case 'end':
          await this.handleFlowEnd(campaignProspect);
          break;
          
        default:
          console.warn(`FlowEngine: Unknown node type ${node.type}`);
      }
      
      // Record successful execution
      await flow.recordNodeExecution(node.id, true);
      
    } catch (error) {
      console.error(`FlowEngine: Error executing node ${node.id}:`, error);
      await flow.recordNodeExecution(node.id, false);
      throw error;
    }
  }
  
  /**
   * Execute an email node - sends email to prospect
   */
  static async executeEmailNode(node, campaignProspect, campaign) {
    const prospect = await Prospect.findById(campaignProspect.prospect);
    if (!prospect) throw new Error('Prospect not found');

    // ── 1. Resolve mailbox ───────────────────────────────────────────────────
    // Use campaign's assigned mailbox, or fall back to any active GoDaddy mailbox
    let mailbox = null;
    if (campaign.mailboxId) {
      mailbox = await Mailbox.findById(campaign.mailboxId);
    }
    if (!mailbox) {
      mailbox = await Mailbox.findOne({ status: 'active' });
    }
    if (!mailbox) throw new Error('No active mailbox available to send from');

    // ── 2. Build subject + body (per-lead override > node template) ──────────
    // If the lead was imported with their own subject/body those win.
    const rawSubject = campaignProspect.customSubject || node.data?.subject || 'Following up';
    const rawBody    = campaignProspect.customBody    || node.data?.template || '';

    const subject = this.personalizeContent(rawSubject, prospect, campaign);
    const html    = this.personalizeContent(rawBody,    prospect, campaign);
    const text    = html.replace(/<[^>]+>/g, '').trim(); // plain-text fallback

    // ── 3. Find previous message for threading (reply-chain) ─────────────────
    const previousMessage = await Message.findOne({
      campaignId:  campaign._id,
      prospectId:  prospect._id,
    }).sort({ createdAt: -1 }).lean();

    // ── 4. Unique tracking + message IDs ────────────────────────────────────
    const trackingId      = crypto.randomUUID();
    const headerMessageId = `<${trackingId}@${mailbox.domain || 'pinova.in'}>`;
    const inReplyTo       = previousMessage?.headerMessageId || null;
    const references      = previousMessage
      ? [...(previousMessage.references || []), previousMessage.headerMessageId].filter(Boolean)
      : [];

    // ── 5. Send via SMTP ─────────────────────────────────────────────────────
    console.log(`FlowEngine ➤ Sending email to ${prospect.email} | Subject: ${subject}`);
    const result = await SMTPService.sendEmail({
      mailbox,
      to:              prospect.email,
      subject,
      html,
      text,
      trackingId,
      headerMessageId,
      inReplyTo,
      references,
    });

    if (!result.success) {
      throw new Error(`SMTP failed: ${result.error}`);
    }

    // ── 6. Create Message record (enables open tracking + reply threading) ───
    await Message.create({
      campaignId:      campaign._id,
      prospectId:      prospect._id,
      mailboxId:       mailbox._id,
      trackingId,
      headerMessageId,
      subject,
      content:         html,
      status:          'sent',
      sentAt:          new Date(),
      sequenceStep:    campaignProspect.sequenceStep,
      references,
      events:          [],
      processedReplyKeys: [],
    });

    // ── 7. Update CampaignProspect stats ────────────────────────────────────
    campaignProspect.emailsSent   += 1;
    campaignProspect.lastSentAt    = new Date();
    campaignProspect.awaitingReply = true;
    await campaignProspect.save();

    // ── 8. Update campaign stats ─────────────────────────────────────────────
    await Campaign.updateOne(
      { _id: campaign._id },
      { $inc: { 'stats.sent': 1 } }
    );

    console.log(`FlowEngine ✅ Email sent and Message record created (trackingId: ${trackingId})`);
  }
  
  /**
   * Execute a wait node - schedules next send time
   */
  static async executeWaitNode(node, campaignProspect) {
    const duration = node.data.duration || 24;
    const unit = node.data.unit || 'hours';
    
    let delayMs;
    switch (unit) {
      case 'minutes':
        delayMs = duration * 60 * 1000;
        break;
      case 'hours':
        delayMs = duration * 60 * 60 * 1000;
        break;
      case 'days':
        delayMs = duration * 24 * 60 * 60 * 1000;
        break;
      default:
        delayMs = duration * 60 * 60 * 1000; // Default to hours
    }
    
    const nextSendAt = new Date(Date.now() + delayMs);
    
    // TODO: Consider business hours if enabled
    if (node.data.businessHoursOnly) {
      // Adjust to next business hour if needed
      // For now, just use calculated time
    }
    
    campaignProspect.nextSendAt = nextSendAt;
    await campaignProspect.save();
    
    console.log(`FlowEngine: Scheduled next action for ${nextSendAt.toISOString()}`);
  }
  
  /**
   * Execute an action node
   */
  static async executeActionNode(node, campaignProspect, campaign) {
    const actionType = node.data.actionType;
    
    switch (actionType) {
      case 'send_response': {
        // ── Send a pre-written response as a threaded reply ──────────────────
        const category = await ReplyCategory.findOne({ slug: node.data.responseCategory });
        if (!category || !category.responseTemplate) {
          console.warn(`FlowEngine ⚠️ No responseTemplate for category: ${node.data.responseCategory}`);
          break;
        }

        const respProspect = await Prospect.findById(campaignProspect.prospect);
        if (!respProspect) break;

        // Resolve mailbox same way as executeEmailNode
        let respMailbox = campaign.mailboxId
          ? await Mailbox.findById(campaign.mailboxId)
          : null;
        if (!respMailbox) respMailbox = await Mailbox.findOne({ status: 'active' });
        if (!respMailbox) { console.error('FlowEngine: No mailbox for send_response'); break; }

        // Find the last outbound message to thread from
        const lastMsg = await Message.findOne({
          campaignId: campaign._id,
          prospectId: respProspect._id,
        }).sort({ createdAt: -1 }).lean();

        const respHtml    = this.personalizeContent(category.responseTemplate, respProspect, campaign);
        const respText    = respHtml.replace(/<[^>]+>/g, '').trim();
        const respSubject = lastMsg?.subject
          ? (lastMsg.subject.startsWith('Re:') ? lastMsg.subject : `Re: ${lastMsg.subject}`)
          : `Re: ${category.name}`;

        const respTrackingId = crypto.randomUUID();
        const respMsgId      = `<${respTrackingId}@${respMailbox.domain || 'pinova.in'}>`;

        console.log(`FlowEngine ➤ Sending pre-written response to ${respProspect.email}`);
        const respResult = await SMTPService.sendEmail({
          mailbox:        respMailbox,
          to:             respProspect.email,
          subject:        respSubject,
          html:           respHtml,
          text:           respText,
          trackingId:     respTrackingId,
          headerMessageId: respMsgId,
          inReplyTo:      lastMsg?.headerMessageId || null,
          references:     lastMsg
            ? [...(lastMsg.references || []), lastMsg.headerMessageId].filter(Boolean)
            : [],
        });

        if (respResult.success) {
          await Message.create({
            campaignId:  campaign._id,
            prospectId:  respProspect._id,
            mailboxId:   respMailbox._id,
            trackingId:  respTrackingId,
            headerMessageId: respMsgId,
            subject:     respSubject,
            content:     respHtml,
            status:      'sent',
            sentAt:      new Date(),
            isResponse:  true,
            events:      [],
            processedReplyKeys: [],
          });
          console.log(`FlowEngine ✅ Pre-written response sent for category: ${category.name}`);
        } else {
          console.error(`FlowEngine ❌ send_response SMTP failed: ${respResult.error}`);
        }
        break;
      }
        
      case 'stop_sequence':
        campaignProspect.status = 'stopped';
        campaignProspect.nextSendAt = null;
        await campaignProspect.save();
        break;
        
      case 'add_tag':
        // Add tag to prospect
        const prospect = await Prospect.findById(campaignProspect.prospect);
        if (prospect && node.data.tagName) {
          if (!prospect.tags.includes(node.data.tagName)) {
            prospect.tags.push(node.data.tagName);
            await prospect.save();
          }
        }
        break;
        
      case 'move_to_pipeline':
        // TODO: Implement pipeline stage update
        console.log(`FlowEngine: Would move to pipeline stage ${node.data.pipelineStage}`);
        break;
        
      case 'notify_user':
        // TODO: Implement user notification
        console.log(`FlowEngine: Would notify user about ${campaignProspect.prospect}`);
        break;
        
      case 'schedule_followup':
        const delay = node.data.followupDelay || 3;
        const delayUnit = node.data.followupDelayUnit || 'days';
        const delayMs = delayUnit === 'days' ? delay * 24 * 60 * 60 * 1000 : delay * 60 * 60 * 1000;
        campaignProspect.nextSendAt = new Date(Date.now() + delayMs);
        await campaignProspect.save();
        break;
    }
  }
  
  /**
   * Handle end of flow
   */
  static async handleFlowEnd(campaignProspect) {
    campaignProspect.status = 'completed';
    campaignProspect.completedAt = new Date();
    campaignProspect.nextSendAt = null;
    await campaignProspect.save();
    
    console.log(`FlowEngine: Flow completed for prospect ${campaignProspect.prospect}`);
  }
  
  /**
   * Personalize content with prospect variables
   */
  static personalizeContent(template, prospect, campaign) {
    if (!template) return '';
    
    let content = template;
    
    // Replace prospect variables
    content = content.replace(/\{\{firstName\}\}/g, prospect.firstName || '');
    content = content.replace(/\{\{lastName\}\}/g, prospect.lastName || '');
    content = content.replace(/\{\{email\}\}/g, prospect.email || '');
    content = content.replace(/\{\{company\}\}/g, prospect.company || '');
    content = content.replace(/\{\{phone\}\}/g, prospect.phone || '');
    content = content.replace(/\{\{industry\}\}/g, prospect.industry || '');
    content = content.replace(/\{\{position\}\}/g, prospect.position || '');
    
    // Replace campaign variables
    content = content.replace(/\{\{campaignName\}\}/g, campaign.name || '');
    content = content.replace(/\{\{persona\}\}/g, campaign.persona || '');
    
    return content;
  }
  
  /**
   * Process all pending flow triggers (called by cron)
   * Finds prospects with expired wait times and triggers timeout
   */
  static async processScheduledTriggers() {
    await dbConnect();
    
    const now = new Date();
    
    // Find campaign prospects with expired nextSendAt using visual flow
    const readyProspects = await CampaignProspect.find({
      status: 'active',
      nextSendAt: { $lte: now },
      currentFlowNodeId: { $exists: true }
    }).populate({
      path: 'campaign',
      match: { useVisualFlow: true, status: 'active' }
    });
    
    console.log(`FlowEngine: Found ${readyProspects.length} prospects ready for processing`);
    
    for (const prospect of readyProspects) {
      if (!prospect.campaign) continue; // Campaign filter didn't match
      
      try {
        await this.executeTrigger(prospect._id, 'timeout', {});
      } catch (error) {
        console.error(`FlowEngine: Error processing prospect ${prospect._id}:`, error);
      }
    }
  }
  
  /**
   * Start flow for a new campaign prospect
   */
  static async startFlowForProspect(campaignProspectId) {
    await dbConnect();
    
    const campaignProspect = await CampaignProspect.findById(campaignProspectId)
      .populate('campaign');
    
    if (!campaignProspect) {
      throw new Error('CampaignProspect not found');
    }
    
    const campaign = campaignProspect.campaign;
    
    if (!campaign.useVisualFlow || !campaign.emailFlow) {
      throw new Error('Campaign does not use visual flow');
    }
    
    const flow = await EmailFlow.findById(campaign.emailFlow);
    if (!flow) {
      throw new Error('Flow not found');
    }
    
    // Set initial position
    campaignProspect.currentFlowNodeId = flow.startNodeId;
    campaignProspect.status = 'active';
    campaignProspect.startedAt = new Date();
    await campaignProspect.save();
    
    // Activate flow if not already
    if (!flow.isActive) {
      flow.isActive = true;
      await flow.save();
    }
    
    // Execute from start node
    await this.executeTrigger(campaignProspectId, 'campaign_started', {});
    
    return campaignProspect;
  }
}

export default FlowEngine;
