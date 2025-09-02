import dbConnect from '../../../../../lib/mongodb.js';
import Campaign from '../../../../../models/Campaign.js';
import Mailbox from '../../../../../models/MailboxFixed.js';
import { SMTPService } from '../../../../../lib/smtp.js';
import { v4 as uuidv4 } from 'uuid';
import { NextResponse } from 'next/server';

// Helper function to personalize content
function personalizeContent(template, prospect, campaign) {
  if (!template) return '';
  
  let content = template;
  
  // Replace prospect fields
  Object.keys(prospect).forEach(key => {
    content = content.replace(new RegExp(`\\[${key}\\]`, 'g'), prospect[key] || '');
  });
  
  // Replace campaign fields
  if (campaign) {
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

    // Get campaign and populate mailbox
    const campaign = await Campaign.findById(id);
      
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

    // Get the selected mailbox from campaign options or campaign.mailbox
    const selectedMailboxId = campaign.options?.selectedMailbox || campaign.mailbox;
    if (!selectedMailboxId) {
      return NextResponse.json(
        { success: false, error: 'No mailbox selected for this campaign. Please select a mailbox in campaign options.' },
        { status: 400 }
      );
    }

    // Fetch and verify the mailbox
    const mailbox = await Mailbox.findById(selectedMailboxId);
    if (!mailbox) {
      return NextResponse.json(
        { success: false, error: 'Selected mailbox not found' },
        { status: 400 }
      );
    }

    if (mailbox.status !== 'active') {
      return NextResponse.json(
        { success: false, error: 'Selected mailbox is not active. Please select an active mailbox.' },
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
        mailbox,
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

      return NextResponse.json({
        success: true,
        message: 'Test email sent successfully!'
      });
    } catch (error) {
      console.error('Error sending test email:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: `Failed to send test email: ${error.message}`
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Test send error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
