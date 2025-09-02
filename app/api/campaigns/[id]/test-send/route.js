import dbConnect from '../../../../../lib/mongodb.js';
import Campaign from '../../../../../models/Campaign.js';
import Mailbox from '../../../../../models/MailboxFixed.js';
import { SMTPService } from '../../../../../lib/smtp.js';
import { v4 as uuidv4 } from 'uuid';
import { NextResponse } from 'next/server';

// Helper function for personalization
function personalizeContent(template, prospect, campaign) {
  if (!template) return '';
  
  let content = template;
  
  // Replace prospect fields with both {{}} and [] syntax
  if (prospect) {
    content = content.replace(/\{\{first_name\}\}/g, prospect.firstName || '');
    content = content.replace(/\{\{last_name\}\}/g, prospect.lastName || '');
    content = content.replace(/\{\{email\}\}/g, prospect.email || '');
    content = content.replace(/\{\{company\}\}/g, prospect.company || '');
    content = content.replace(/\{\{city\}\}/g, prospect.city || '');
    content = content.replace(/\{\{neighborhood\}\}/g, prospect.neighborhood || '');
    content = content.replace(/\{\{listing_price\}\}/g, prospect.listingPrice || '');
    
    // Also support bracket syntax for dynamic fields
    Object.keys(prospect).forEach(key => {
      content = content.replace(new RegExp(`\\[${key}\\]`, 'g'), prospect[key] || '');
    });
  }
  
  // Replace campaign fields
  if (campaign) {
    content = content.replace(/\{\{campaign_name\}\}/g, campaign.name || '');
    content = content.replace(/\[campaignName\]/g, campaign.name || '');
  }
  
  return content;
}

export async function POST(request, { params }) {
  try {
    await dbConnect();
    
    const { id } = params;
    const { testEmail, stepNumber = 1 } = await request.json();
    
    if (!testEmail) {
      return NextResponse.json(
        { success: false, error: 'Test email address is required' },
        { status: 400 }
      );
    }

    // Get campaign
    const campaign = await Campaign.findById(id).populate('mailboxes');
    if (!campaign) {
      return NextResponse.json(
        { success: false, error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Get the step to test
    const step = campaign.sequence.find(s => s.stepNumber === stepNumber);
    if (!step) {
      return NextResponse.json(
        { success: false, error: `Step ${stepNumber} not found in campaign` },
        { status: 404 }
      );
    }

    // Get the selected mailbox from campaign options
    if (!campaign.options?.selectedMailbox) {
      return NextResponse.json(
        { success: false, error: 'No mailbox selected for this campaign. Please select a mailbox in campaign options.' },
        { status: 400 }
      );
    }

    // Fetch and verify the mailbox
    const mailbox = await Mailbox.findById(campaign.options.selectedMailbox);
    if (!mailbox) {
      return NextResponse.json(
        { success: false, error: 'Selected mailbox not found' },
        { status: 400 }
      );
    }

    if (mailbox.status !== 'active') {
      return NextResponse.json(
        { success: false, error: 'Selected mailbox is not active' },
        { status: 400 }
      );
    }

    // Create test prospect data for personalization
    const testProspect = {
      firstName: 'John',
      lastName: 'Doe', 
      email: testEmail,
      company: 'Test Company',
      city: 'New York',
      neighborhood: 'Manhattan',
      listingPrice: '$2.5M'
    };

    try {
      // Personalize content
      const personalizedSubject = personalizeContent(step.subject, testProspect, campaign);
      let personalizedTemplate = personalizeContent(step.template, testProspect, campaign);
      
      // Replace placeholder [Your name] with actual sender name
      personalizedTemplate = personalizedTemplate.replace(/\[Your name\]/g, mailbox.fromName);
      
      // Convert \n to proper line breaks for both HTML and text
      const htmlContent = personalizedTemplate.replace(/\\n/g, '\n').replace(/\n/g, '<br>');
      const textContent = personalizedTemplate.replace(/\\n/g, '\n');

      // Send test email
      const trackingId = 'test-' + uuidv4();
      const result = await SMTPService.sendEmail({
        mailbox: mailbox, // Use the verified mailbox
        to: testEmail,
        subject: personalizedSubject,
        html: htmlContent,
        text: textContent,
        trackingId: trackingId,
        messageId: 'test-' + Date.now()
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to send email');
      }

      // Return success response
      return NextResponse.json({
        success: true,
        message: 'Test email sent successfully!',
        details: {
          to: testEmail,
          subject: personalizedSubject,
          from: `${mailbox.fromName} <${mailbox.fromEmail}>`,
          step: stepNumber
        }
      });

    } catch (emailError) {
      console.error('Email sending error:', emailError);
      return NextResponse.json({
        success: false,
        error: 'Failed to send test email: ' + emailError.message,
        step: 'sending'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Test send error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send test email: ' + error.message },
      { status: 500 }
    );
  }
}