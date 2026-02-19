import dbConnect from '../../../../../lib/mongodb.js';
import Message from '../../../../../models/Message.js';
import Campaign from '../../../../../models/Campaign.js';
import CampaignProspect from '../../../../../models/CampaignProspect.js';
import { FlowEngine } from '../../../../../lib/flowEngine.js';

export const runtime = 'nodejs'; // Run in Node.js, not Edge
export const dynamic = 'force-dynamic'; // Force dynamic execution

// Initialize DB connection once
await dbConnect();

export async function GET(request, { params }) {
  try {
    // Remove .gif extension if present for ID lookup
    const trackingId = params.trackingId.replace(/\.gif$/, '');
    
    console.log(`Tracking open for ID: ${trackingId}`);
    
    // Find message by tracking ID
    const message = await Message.findOne({ trackingId });
    
    if (message) {
      console.log(`Found message for tracking ID ${trackingId}`);
      
      // Check if this is the first open
      const hasOpenEvent = message.events.some(event => event.type === 'opened');
      
      if (!hasOpenEvent) {
        console.log('Recording first open event');
        
        // Add open event
        message.events.push({
          type: 'opened',
          timestamp: new Date(),
          data: {
            userAgent: request.headers.get('user-agent'),
            ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
          }
        });
        
        message.openedAt = new Date();
        await message.save();
        
        // Update campaign statistics
        const campaign = await Campaign.findById(message.campaignId);
        if (campaign) {
          campaign.stats.opened = (campaign.stats.opened || 0) + 1;
          await campaign.save();
          console.log(`Updated campaign ${campaign.name} open stats to ${campaign.stats.opened}`);
        }

        // Update CampaignProspect stats for pipeline tracking
        await CampaignProspect.updateOne(
          { 
            campaign: message.campaignId, 
            prospect: message.prospectId 
          },
          { 
            $inc: { emailsOpened: 1 },
            $set: { 
              openedAt: new Date(),
              lastOpenedAt: new Date(),
              awaitingReply: true
            }
          }
        );

        // ── Wire 4: Tell the FlowEngine an open happened ──────────────────────
        // This allows the flow to branch: opened → Email B, not-opened → Email C
        try {
          const cp = await CampaignProspect.findOne({
            campaign: message.campaignId,
            prospect: message.prospectId,
          }).populate({ path: 'campaign', select: 'useVisualFlow emailFlow' });

          if (cp?.campaign?.useVisualFlow) {
            console.log(`[OpenTracker] Firing FlowEngine 'email_opened' for CampaignProspect ${cp._id}`);
            // Fire-and-forget — don't block the pixel response
            FlowEngine.executeTrigger(cp._id.toString(), 'email_opened', {
              openedAt: new Date(),
            }).catch(err => console.error('[OpenTracker] FlowEngine error:', err.message));
          }
        } catch (feErr) {
          console.error('[OpenTracker] Could not trigger FlowEngine:', feErr.message);
        }
      } else {
        console.log('Email already marked as opened');
      }
    } else {
      console.log(`No message found for tracking ID: ${trackingId}`);
    }
    
    // Return 1x1 transparent pixel
    const pixel = Buffer.from([
      0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00, 0x00, 0x00, 0x00, 0x00,
      0xFF, 0xFF, 0xFF, 0x21, 0xF9, 0x04, 0x01, 0x00, 0x00, 0x00, 0x00, 0x2C, 0x00, 0x00, 0x00, 0x00,
      0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x44, 0x01, 0x00, 0x3B
    ]);

    return new Response(pixel, {
      headers: {
        'Content-Type': 'image/gif',
        'Content-Length': pixel.length.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    console.error('Tracking pixel error:', error);
    
    // Still return pixel even on error
    const pixel = Buffer.from([
      0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00, 0x00, 0x00, 0x00, 0x00,
      0xFF, 0xFF, 0xFF, 0x21, 0xF9, 0x04, 0x01, 0x00, 0x00, 0x00, 0x00, 0x2C, 0x00, 0x00, 0x00, 0x00,
      0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x44, 0x01, 0x00, 0x3B
    ]);

    return new Response(pixel, {
      headers: {
        'Content-Type': 'image/gif',
        'Content-Length': pixel.length.toString(),
      }
    });
  }
}
