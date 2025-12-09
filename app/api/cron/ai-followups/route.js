import dbConnect from '../../../../lib/mongodb.js';
import Campaign from '../../../../models/Campaign.js';
import CampaignProspect from '../../../../models/CampaignProspect.js';
import Prospect from '../../../../models/Prospect.js';
import Message from '../../../../models/Message.js';
import { aiService } from '../../../../lib/services/vertexAI.js';
import { EmailSequencer } from '../../../../lib/sequencer.js';

/**
 * AI Follow-up Cron Job
 * Runs every 6 hours to detect prospects who:
 * - Opened emails but didn't reply
 * - Last opened 24+ hours ago
 * - Haven't received max AI follow-ups (5)
 * 
 * Then generates and schedules AI-powered follow-ups
 */
export async function GET(request) {
  try {
    await dbConnect();
    await aiService.initialize();

    console.log('🤖 Starting AI follow-up generation cron...');

    // Find prospects who need AI follow-ups
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

    const prospectsNeedingFollowUp = await CampaignProspect.find({
      awaitingReply: true,
      emailsReplied: 0,
      lastOpenedAt: { $lte: cutoffTime },
      aiFollowUpsGenerated: { $lt: 5 }, // Max 5 AI follow-ups
      status: { $in: ['active', 'pending'] }
    })
      .populate('prospect', 'firstName lastName email company')
      .populate('campaign', 'name status sequences')
      .limit(50); // Process 50 at a time

    console.log(`Found ${prospectsNeedingFollowUp.length} prospects needing AI follow-ups`);

    const results = {
      processed: 0,
      generated: 0,
      scheduled: 0,
      errors: []
    };

    for (const cp of prospectsNeedingFollowUp) {
      try {
        results.processed++;

        // Skip if campaign is not active
        if (cp.campaign.status !== 'active') {
          console.log(`Skipping ${cp.prospect.email} - campaign not active`);
          continue;
        }

        // Get the original email from messages
        const originalMessage = await Message.findOne({
          campaignId: cp.campaign._id,
          prospectId: cp.prospect._id,
          sequenceStep: 1
        }).sort({ createdAt: 1 }).lean();

        if (!originalMessage) {
          console.log(`No original message found for ${cp.prospect.email}`);
          continue;
        }

        // Calculate engagement metrics
        const daysSinceLastOpen = Math.floor(
          (Date.now() - new Date(cp.lastOpenedAt).getTime()) / (1000 * 60 * 60 * 24)
        );

        const followUpNumber = cp.aiFollowUpsGenerated + 1;

        console.log(`Generating AI follow-up #${followUpNumber} for ${cp.prospect.email} (opened ${cp.emailsOpened}x, ${daysSinceLastOpen}d ago)`);

        // Generate AI follow-up
        const followUp = await aiService.generateFollowUp({
          prospect: cp.prospect,
          campaign: cp.campaign,
          originalEmail: {
            subject: originalMessage.subject,
            body: originalMessage.content
          },
          openCount: cp.emailsOpened,
          daysSinceLastOpen,
          followUpNumber
        });

        if (!followUp || !followUp.subject || !followUp.body) {
          console.error(`Failed to generate follow-up for ${cp.prospect.email}`);
          results.errors.push(`Failed to generate for ${cp.prospect.email}`);
          continue;
        }

        results.generated++;

        // Add follow-up to campaign sequence (if not already there)
        const sequenceStep = cp.sequenceStep + 1;
        
        // Update campaign sequences if needed
        if (!cp.campaign.sequences || cp.campaign.sequences.length < sequenceStep) {
          await Campaign.updateOne(
            { _id: cp.campaign._id },
            {
              $push: {
                sequences: {
                  step: sequenceStep,
                  subject: followUp.subject,
                  content: followUp.body,
                  delayDays: 1,
                  aiGenerated: true
                }
              }
            }
          );
        }

        // Update CampaignProspect
        await CampaignProspect.updateOne(
          { _id: cp._id },
          {
            $inc: { aiFollowUpsGenerated: 1 },
            $set: {
              sequenceStep,
              nextSendAt: new Date(), // Schedule immediately
              lastAiFollowUpAt: new Date(),
              awaitingReply: false // Reset flag
            }
          }
        );

        results.scheduled++;
        console.log(`✅ Scheduled AI follow-up #${followUpNumber} for ${cp.prospect.email}`);

      } catch (error) {
        console.error(`Error processing ${cp.prospect?.email}:`, error);
        results.errors.push(`${cp.prospect?.email}: ${error.message}`);
      }
    }

    console.log('🤖 AI follow-up cron completed:', results);

    return Response.json({
      success: true,
      message: 'AI follow-up generation completed',
      results
    });

  } catch (error) {
    console.error('AI follow-up cron error:', error);
    return Response.json(
      {
        success: false,
        error: 'AI follow-up cron failed',
        message: error.message
      },
      { status: 500 }
    );
  }
}
