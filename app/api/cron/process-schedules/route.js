import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Campaign from '@/models/Campaign';
import Message from '@/models/Message';
import { sendEmail } from '@/lib/email-service';

export async function GET() {
  try {
    await connectDB();
    
    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.toLocaleDateString('en-US', { weekday: 'lowercase' });
    
    // Find active campaigns with schedule settings
    const campaigns = await Campaign.find({
      status: 'active',
      'settings.sendTimeStart': { $exists: true },
      'settings.sendTimeEnd': { $exists: true }
    }).populate('prospects.prospectId');
    
    let processedCount = 0;
    let errors = [];
    
    for (const campaign of campaigns) {
      try {
        const settings = campaign.settings || {};
        
        // Parse time settings
        const startHour = parseInt(settings.sendTimeStart?.split(':')[0] || '9');
        const endHour = parseInt(settings.sendTimeEnd?.split(':')[0] || '17');
        
        // Check if current time is within sending window
        if (currentHour < startHour || currentHour >= endHour) {
          continue;
        }
        
        // Check if today is a sending day
        if (settings.skipWeekends && (currentDay === 'saturday' || currentDay === 'sunday')) {
          continue;
        }
        
        // Check daily limit
        const dailyLimit = settings.dailyLimit || 50;
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const sentToday = await Message.countDocuments({
          campaignId: campaign._id,
          createdAt: { $gte: todayStart },
          status: { $in: ['sent', 'delivered', 'opened', 'replied'] }
        });
        
        if (sentToday >= dailyLimit) {
          continue;
        }
        
        // Find prospects ready for next step
        const readyProspects = campaign.prospects.filter(p => {
          if (p.status !== 'active') return false;
          if (!p.nextSendAt) return true; // First message
          return new Date(p.nextSendAt) <= now;
        });
        
        // Process prospects up to daily limit
        const remainingLimit = dailyLimit - sentToday;
        const prospectsToProcess = readyProspects.slice(0, remainingLimit);
        
        for (const prospectData of prospectsToProcess) {
          const prospect = prospectData.prospectId;
          const currentStep = prospectData.currentStep || 1;
          const sequence = campaign.sequence || [];
          const step = sequence.find(s => s.stepNumber === currentStep);
          
          if (!step || !prospect) continue;
          
          // Replace variables in template
          let subject = step.subject || '';
          let content = step.template || '';
          
          const variables = {
            firstName: prospect.firstName || '',
            lastName: prospect.lastName || '',
            email: prospect.email || '',
            company: prospect.company || '',
            phone: prospect.phone || '',
            website: prospect.website || '',
            industry: prospect.industry || '',
            position: prospect.position || ''
          };
          
          Object.entries(variables).forEach(([key, value]) => {
            const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
            subject = subject.replace(regex, value);
            content = content.replace(regex, value);
          });
          
          // Create message record
          const message = new Message({
            campaignId: campaign._id,
            prospectId: prospect._id,
            stepNumber: currentStep,
            subject,
            content,
            status: 'pending',
            scheduledAt: now
          });
          
          await message.save();
          
          // Send email (implement your email service)
          try {
            await sendEmail({
              to: prospect.email,
              subject,
              content,
              campaignId: campaign._id,
              messageId: message._id
            });
            
            message.status = 'sent';
            message.sentAt = now;
            await message.save();
            
            // Update prospect for next step
            const nextStep = currentStep + 1;
            const nextStepData = sequence.find(s => s.stepNumber === nextStep);
            
            if (nextStepData) {
              const nextSendAt = new Date(now.getTime() + (nextStepData.waitHours || 24) * 60 * 60 * 1000);
              prospectData.currentStep = nextStep;
              prospectData.nextSendAt = nextSendAt;
            } else {
              prospectData.status = 'completed';
              prospectData.nextSendAt = null;
            }
            
            processedCount++;
            
          } catch (emailError) {
            message.status = 'failed';
            message.error = emailError.message;
            await message.save();
            errors.push(`Email failed for ${prospect.email}: ${emailError.message}`);
          }
        }
        
        // Save campaign with updated prospect data
        await campaign.save();
        
      } catch (campaignError) {
        errors.push(`Campaign ${campaign._id}: ${campaignError.message}`);
      }
    }
    
    return NextResponse.json({
      success: true,
      processedCount,
      errors: errors.length > 0 ? errors : null,
      timestamp: now.toISOString()
    });
    
  } catch (error) {
    console.error('Schedule processing error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

export async function POST() {
  return GET(); // Allow both GET and POST for flexibility
}
