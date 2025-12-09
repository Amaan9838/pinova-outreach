import dbConnect from '../../../../../lib/mongodb.js';
import Message from '../../../../../models/Message.js';
import Campaign from '../../../../../models/Campaign.js';
import CampaignProspect from '../../../../../models/CampaignProspect.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Initialize DB connection
await dbConnect();

/**
 * GET /api/track/click/[trackingId]
 * Track link clicks and redirect to destination URL
 */
export async function GET(request, { params }) {
  try {
    const trackingId = params.trackingId;
    const url = new URL(request.url);
    const destination = url.searchParams.get('url') || url.searchParams.get('u');
    
    console.log(`Tracking click for ID: ${trackingId}`);
    
    // Find message by tracking ID
    const message = await Message.findOne({ trackingId });
    
    if (message) {
      console.log(`Found message for tracking ID ${trackingId}`);
      
      // Check if this is a new click (first click only for unique count)
      const hasClickEvent = message.events.some(event => event.type === 'clicked');
      
      // Always add click event for tracking all clicks
      message.events.push({
        type: 'clicked',
        timestamp: new Date(),
        data: {
          url: destination,
          userAgent: request.headers.get('user-agent'),
          ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        }
      });
      
      // Only update clickedAt and campaign stats on first click
      if (!hasClickEvent) {
        console.log('Recording first click event');
        message.clickedAt = new Date();
        
        // Update campaign statistics
        const campaign = await Campaign.findById(message.campaignId);
        if (campaign) {
          campaign.stats.clicked = (campaign.stats.clicked || 0) + 1;
          await campaign.save();
          console.log(`Updated campaign ${campaign.name} click stats to ${campaign.stats.clicked}`);
        }

        // Update CampaignProspect statistics for pipeline accuracy
        await CampaignProspect.updateOne(
          { campaign: message.campaignId, prospect: message.prospectId },
          { 
            $inc: { emailsClicked: 1 },
            $set: { clickedAt: new Date() }
          }
        );
      }
      
      await message.save();
    } else {
      console.log(`No message found for tracking ID: ${trackingId}`);
    }
    
    // Redirect to destination URL
    if (destination) {
      return Response.redirect(destination, 302);
    }
    
    // Fallback if no destination URL
    return new Response('Redirecting...', {
      status: 302,
      headers: {
        'Location': process.env.NEXT_PUBLIC_APP_URL || 'https://pinova.io',
      }
    });

  } catch (error) {
    console.error('Click tracking error:', error);
    
    // Still redirect even on error
    const url = new URL(request.url);
    const destination = url.searchParams.get('url') || url.searchParams.get('u');
    
    if (destination) {
      return Response.redirect(destination, 302);
    }
    
    return new Response('Redirecting...', {
      status: 302,
      headers: {
        'Location': process.env.NEXT_PUBLIC_APP_URL || 'https://pinova.io',
      }
    });
  }
}
