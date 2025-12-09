import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Pipeline from '@/models/Pipeline';
import Prospect from '@/models/Prospect';
import CampaignProspect from '@/models/CampaignProspect';
import Message from '@/models/Message';

/**
 * POST /api/pipeline/sync
 * Sync existing prospects and campaign data into the pipeline
 */
export async function POST(request) {
  try {
    await dbConnect();
    
    const body = await request.json();
    const { action, prospectIds } = body;
    
    if (action === 'sync_all') {
      // Sync all prospects into pipeline
      const prospects = await Prospect.find({});
      let created = 0;
      let updated = 0;
      let errors = [];
      
      for (const prospect of prospects) {
        try {
          const existing = await Pipeline.findOne({ prospect: prospect._id });
          
          if (!existing) {
            // Create new pipeline entry
            const pipelineEntry = new Pipeline({
              prospect: prospect._id,
              stage: 'new_lead',
              tags: prospect.tags || []
            });
            
            // Check if prospect has been contacted
            const campaignProspects = await CampaignProspect.find({
              prospect: prospect._id
            });
            
            if (campaignProspects.length > 0) {
              // Find the most advanced status
              const statuses = campaignProspects.map(cp => cp.status);
              
              if (statuses.includes('replied')) {
                pipelineEntry.stage = 'responded';
              } else if (statuses.includes('opened') || statuses.includes('clicked')) {
                pipelineEntry.stage = 'engaged';
              } else if (statuses.includes('sent') || statuses.includes('active')) {
                pipelineEntry.stage = 'contacted';
              }
              
              // Get engagement metrics
              const messages = await Message.find({
                prospectId: prospect._id,
                type: 'outbound'
              });
              
              let totalOpens = 0;
              let totalClicks = 0;
              let totalReplies = 0;
              
              messages.forEach(msg => {
                if (msg.events) {
                  totalOpens += msg.events.filter(e => e.type === 'open').length > 0 ? 1 : 0;
                  totalClicks += msg.events.filter(e => e.type === 'click').length > 0 ? 1 : 0;
                  totalReplies += msg.events.filter(e => e.type === 'reply').length > 0 ? 1 : 0;
                }
              });
              
              pipelineEntry.metrics = {
                totalEmailsSent: messages.length,
                totalOpens,
                totalClicks,
                totalReplies,
                openRate: messages.length > 0 ? (totalOpens / messages.length) * 100 : 0,
                replyRate: messages.length > 0 ? (totalReplies / messages.length) * 100 : 0
              };
              
              // Link active campaigns
              pipelineEntry.activeCampaigns = campaignProspects.map(cp => ({
                campaign: cp.campaign,
                status: cp.status === 'completed' || cp.status === 'stopped' ? 'completed' : 'active',
                currentStep: cp.currentStep || 1
              }));
            }
            
            // Calculate initial score
            pipelineEntry.calculateScore();
            
            await pipelineEntry.save();
            created++;
          } else {
            // Update existing entry with fresh metrics
            const messages = await Message.find({
              prospectId: prospect._id,
              type: 'outbound'
            });
            
            let totalOpens = 0;
            let totalReplies = 0;
            
            messages.forEach(msg => {
              if (msg.events) {
                totalOpens += msg.events.filter(e => e.type === 'open').length > 0 ? 1 : 0;
                totalReplies += msg.events.filter(e => e.type === 'reply').length > 0 ? 1 : 0;
              }
            });
            
            existing.metrics.totalEmailsSent = messages.length;
            existing.metrics.totalOpens = totalOpens;
            existing.metrics.totalReplies = totalReplies;
            existing.calculateScore();
            
            await existing.save();
            updated++;
          }
        } catch (err) {
          errors.push({ prospectId: prospect._id, error: err.message });
        }
      }
      
      return NextResponse.json({
        success: true,
        data: {
          created,
          updated,
          errors: errors.length,
          total: prospects.length,
          errorDetails: errors.slice(0, 10) // First 10 errors
        }
      });
    }
    
    if (action === 'sync_selected' && prospectIds) {
      // Sync specific prospects
      let synced = 0;
      
      for (const prospectId of prospectIds) {
        const prospect = await Prospect.findById(prospectId);
        if (!prospect) continue;
        
        let pipelineEntry = await Pipeline.findOne({ prospect: prospectId });
        
        if (!pipelineEntry) {
          pipelineEntry = new Pipeline({
            prospect: prospectId,
            stage: 'new_lead'
          });
        }
        
        pipelineEntry.calculateScore();
        await pipelineEntry.save();
        synced++;
      }
      
      return NextResponse.json({
        success: true,
        data: { synced }
      });
    }
    
    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    );
    
  } catch (error) {
    console.error('Pipeline sync error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
