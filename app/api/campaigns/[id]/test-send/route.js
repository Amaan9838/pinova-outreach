import dbConnect from '../../../../../lib/mongodb.js';
import Campaign from '../../../../../models/Campaign.js';
import Mailbox from '../../../../../models/MailboxFixed.js';
import { SMTPService } from '../../../../../lib/smtp.js';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request, { params }) {
  try {
    await dbConnect();
    
    const { id } = params;
    const { testEmail, stepNumber = 1 } = await request.json();
    
    if (!testEmail) {
      return Response.json(
        { success: false, error: 'Test email address is required' },
        { status: 400 }
      );
    }

    // Get campaign
    const campaign = await Campaign.findById(id).populate('mailboxes');
    if (!campaign) {
      return Response.json(
        { success: false, error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Get the step to test
    const step = campaign.sequence.find(s => s.stepNumber === stepNumber);
    if (!step) {
      return Response.json(
        { success: false, error: `Step ${stepNumber} not found in campaign` },
        { status: 404 }
      );
    }

    // Get first active mailbox
    const activeMailbox = campaign.mailboxes.find(m => m.status === 'active');
    if (!activeMailbox) {
      return Response.json(
        { success: false, error: 'No active mailboxes found in campaign' },
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

    // Personalize content
    const personalizedSubject = personalizeContent(step.subject, testProspect, campaign);
    let personalizedTemplate = personalizeContent(step.template, testProspect, campaign);
    
    // Replace placeholder [Your name] with actual sender name
    personalizedTemplate = personalizedTemplate.replace(/\[Your name\]/g, activeMailbox.fromName);
    
    // Convert \n to proper line breaks for both HTML and text
    const htmlContent = personalizedTemplate.replace(/\\n/g, '\n').replace(/\n/g, '<br>');
    const textContent = personalizedTemplate.replace(/\\n/g, '\n');

    // Send test email
    const trackingId = 'test-' + uuidv4();
    const result = await SMTPService.sendEmail({
      mailbox: activeMailbox,
      to: testEmail,
      subject: personalizedSubject, // Remove [TEST] prefix to avoid spam triggers
      html: htmlContent,
      text: textContent,
      trackingId: trackingId,
      messageId: 'test-' + Date.now()
    });

    if (result.success) {
      return Response.json({
        success: true,
        message: 'Test email sent successfully!',
        details: {
          to: testEmail,
          subject: personalizedSubject,
          from: `${activeMailbox.fromName} <${activeMailbox.fromEmail}>`,
          step: stepNumber
        }
      });
    } else {
      return Response.json({
        success: false,
        error: 'Failed to send test email: ' + result.error,
        step: 'sending'
      });
    }

  } catch (error) {
    console.error('Test send error:', error);
    return Response.json(
      { success: false, error: 'Failed to send test email: ' + error.message },
      { status: 500 }
    );
  }
}

// Helper function for personalization
function personalizeContent(template, prospect, campaign) {
  let content = template;
  
  content = content.replace(/\{\{first_name\}\}/g, prospect.firstName || '');
  content = content.replace(/\{\{last_name\}\}/g, prospect.lastName || '');
  content = content.replace(/\{\{company\}\}/g, prospect.company || '');
  content = content.replace(/\{\{city\}\}/g, prospect.city || '');
  content = content.replace(/\{\{neighborhood\}\}/g, prospect.neighborhood || '');
  content = content.replace(/\{\{listing_price\}\}/g, prospect.listingPrice || '');
  content = content.replace(/\{\{campaign_name\}\}/g, campaign.name || '');
  
  return content;
}
