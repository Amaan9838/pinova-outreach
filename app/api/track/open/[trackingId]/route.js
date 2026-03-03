import dbConnect from '../../../../../lib/mongodb.js';
import Message from '../../../../../models/Message.js';
import Campaign from '../../../../../models/Campaign.js';
import CampaignProspect from '../../../../../models/CampaignProspect.js';

export const runtime = 'nodejs'; // Run in Node.js, not Edge
export const dynamic = 'force-dynamic'; // Force dynamic execution

// Initialize DB connection once
await dbConnect();

export async function GET(request, { params }) {
  try {
    // Remove .gif extension if present for ID lookup
    const trackingId = params.trackingId.replace(/\.gif$/, '');
    
    const userAgent = request.headers.get('user-agent') || '';
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '';
    
    console.log(`Tracking open for ID: ${trackingId}, UA: ${userAgent.substring(0, 80)}`);
    
    // Detect email client preview loads (Gmail, Outlook, Apple Mail, etc.)
    // These user-agents indicate preview/preload, not actual user open
    const previewIndicators = [
      'googlebot',  // Google preview
      'bingbot',    // Bing preview
      'slurp',      // Yahoo preview
      'facebook',   // Facebook link preview
      'twitter',    // Twitter card preview
      'linkedinbot', // LinkedIn preview
      'whatsapp',   // WhatsApp preview
      'skypeuri',   // Skype preview
      'telegrambot', // Telegram preview
      'Mozilla/5.0 (compatible; AmazonBot', // Amazon preview
    ];
    
    const isPreview = previewIndicators.some(indicator => 
      userAgent.toLowerCase().includes(indicator.toLowerCase())
    );
    
    if (isPreview) {
      console.log(`Ignoring preview load from: ${userAgent.substring(0, 80)}`);
      // Return pixel but don't record as opened
      const pixel = Buffer.from([
        0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00, 0x00, 0x00, 0x00, 0x00,
        0xFF, 0xFF, 0xFF, 0x21, 0xF9, 0x04, 0x01, 0x00, 0x00, 0x00, 0x00, 0x2C, 0x00, 0x00, 0x00, 0x00,
        0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x44, 0x01, 0x00, 0x3B
      ]);
      return new Response(pixel, {
        headers: {
          'Content-Type': 'image/gif',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        }
      });
    }
    
    // Find message by tracking ID
    const message = await Message.findOne({ trackingId });
    
    if (message) {
      console.log(`Found message for tracking ID ${trackingId}`);
      message.events = Array.isArray(message.events) ? message.events : [];
      
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

        // Update CampaignProspect stats
        // v2: Only set lastOpenedAt — NO state transition here (PRD §7.7)
        // State changes happen exclusively in outreachEngine.js → processLead()
        await CampaignProspect.updateOne(
          { 
            campaign: message.campaignId, 
            prospect: message.prospectId 
          },
          { 
            $inc: { emailsOpened: 1 },
            $set: { 
              openedAt: new Date(),
              lastOpenedAt: new Date()
              // NOTE: do NOT set awaitingReply, v2State, or nextActionAt here.
              // The engine reads lastOpenedAt on the next cron tick.
            }
          }
        );
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
