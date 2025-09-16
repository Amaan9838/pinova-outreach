import dbConnect from '../../../../lib/mongodb.js';
import Campaign from '../../../../models/Campaign.js';
import CampaignProspect from '../../../../models/CampaignProspect.js';
import Prospect from '../../../../models/Prospect.js';
import Mailbox from '../../../../models/MailboxFixed.js';
import { CampaignValidationService } from '../../../../lib/campaignValidation.js';
import { CampaignSchedulingService } from '../../../../lib/campaignScheduling.js';

export const dynamic = 'force-dynamic';

/**
 * Test endpoint for campaign scheduling functionality
 */
export async function POST(request) {
  try {
    await dbConnect();

    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'create_test_campaign':
        return await createTestCampaign();
      case 'test_validation':
        return await testValidation(body);
      case 'test_scheduling':
        return await testScheduling(body);
      case 'cleanup':
        return await cleanup();
      default:
        return Response.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Test scheduling error:', error);
    return Response.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

async function createTestCampaign() {
  try {
    // Create test mailbox
    const testMailbox = new Mailbox({
      fromName: 'Test Sender',
      fromEmail: 'test-scheduling@example.com',
      domain: 'example.com',
      status: 'active',
      dailyCap: 100,
      dailySent: 0,
      smtpConfiguration: {
        host: 'smtp.example.com',
        port: 587,
        user: 'test-scheduling@example.com',
        password: 'test-password'
      }
    });
    await testMailbox.save();
    
    // Create test prospect
    const testProspect = new Prospect({
      email: 'test-prospect@example.com',
      firstName: 'John',
      lastName: 'Doe',
      company: 'Test Company'
    });
    await testProspect.save();
    
    // Create test campaign
    const testCampaign = new Campaign({
      name: 'Test Scheduling Campaign',
      description: 'Campaign created for testing scheduling functionality',
      persona: 'test',
      goal: 'testing scheduling',
      status: 'draft',
      sequence: [
        {
          stepNumber: 1,
          subject: 'Hello {{firstName}} - Test Email',
          template: 'Hi {{firstName}},\n\nThis is a test email for the scheduling system.\n\nBest regards,\nTest Team'
        },
        {
          stepNumber: 2,
          subject: 'Follow-up - {{firstName}}',
          template: 'Hi {{firstName}},\n\nFollowing up on my previous email.\n\nBest regards,\nTest Team',
          waitHours: 24,
          waitMinutes: 0
        }
      ],
      options: {
        selectedMailbox: testMailbox._id,
        timezone: 'UTC',
        trackOpens: true,
        trackClicks: true
      },
      scheduling: {
        timezone: 'UTC',
        businessHours: {
          enabled: true,
          startTime: '09:00',
          endTime: '17:00',
          daysOfWeek: [1, 2, 3, 4, 5]
        },
        dailySendCap: 50,
        staggerSettings: {
          enabled: true,
          baseDelayMinutes: 2,
          randomVariationMinutes: 1
        },
        autoActivateWhenReady: false
      }
    });
    await testCampaign.save();
    
    // Create campaign prospect
    const campaignProspect = new CampaignProspect({
      campaign: testCampaign._id,
      prospect: testProspect._id,
      sequenceStep: 1,
      status: 'pending'
    });
    await campaignProspect.save();
    
    return Response.json({
      success: true,
      message: 'Test campaign created successfully',
      data: {
        campaignId: testCampaign._id,
        prospectId: testProspect._id,
        mailboxId: testMailbox._id,
        campaignProspectId: campaignProspect._id
      }
    });
    
  } catch (error) {
    console.error('Error creating test campaign:', error);
    return Response.json(
      { success: false, error: 'Failed to create test campaign: ' + error.message },
      { status: 500 }
    );
  }
}

async function testValidation(body) {
  try {
    const { campaignId } = body;

    if (!campaignId) {
      return Response.json(
        { success: false, error: 'Campaign ID is required' },
        { status: 400 }
      );
    }

    const validation = await CampaignValidationService.validateCampaign(campaignId);

    return Response.json({
      success: true,
      message: 'Validation completed',
      validation: {
        valid: validation.valid,
        errors: validation.errors,
        errorCount: validation.errors?.length || 0
      }
    });

  } catch (error) {
    console.error('Error testing validation:', error);
    return Response.json(
      { success: false, error: 'Failed to test validation: ' + error.message },
      { status: 500 }
    );
  }
}

async function testScheduling(body) {
  try {
    const { campaignId, minutesFromNow = 60 } = body;

    if (!campaignId) {
      return Response.json(
        { success: false, error: 'Campaign ID is required' },
        { status: 400 }
      );
    }

    const startDateTime = new Date(Date.now() + minutesFromNow * 60 * 1000);

    const result = await CampaignSchedulingService.scheduleCampaign(
      campaignId,
      startDateTime,
      {
        timezone: 'UTC',
        autoActivateWhenReady: true,
        businessHours: {
          enabled: true,
          startTime: '09:00',
          endTime: '17:00',
          daysOfWeek: [1, 2, 3, 4, 5]
        },
        staggerSettings: {
          enabled: true,
          baseDelayMinutes: 2,
          randomVariationMinutes: 1
        }
      }
    );

    return Response.json({
      success: true,
      message: 'Scheduling test completed',
      result: {
        schedulingSuccess: result.success,
        status: result.status,
        startDateTime: result.startDateTime,
        errors: result.errors || [],
        errorCount: result.errors?.length || 0
      }
    });

  } catch (error) {
    console.error('Error testing scheduling:', error);
    return Response.json(
      { success: false, error: 'Failed to test scheduling: ' + error.message },
      { status: 500 }
    );
  }
}

async function cleanup() {
  try {
    // Clean up test data
    await Campaign.deleteMany({ name: /Test Scheduling/ });
    await CampaignProspect.deleteMany({});
    await Prospect.deleteMany({ email: /test-prospect/ });
    await Mailbox.deleteMany({ fromEmail: /test-scheduling/ });
    
    return Response.json({
      success: true,
      message: 'Test data cleaned up successfully'
    });
    
  } catch (error) {
    console.error('Error cleaning up test data:', error);
    return Response.json(
      { success: false, error: 'Failed to cleanup: ' + error.message },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint for quick testing
 */
export async function GET(request) {
  const url = new URL(request.url);
  const action = url.searchParams.get('action') || 'status';
  
  if (action === 'status') {
    return Response.json({
      success: true,
      message: 'Campaign scheduling test endpoint is active',
      availableActions: [
        'create_test_campaign',
        'test_validation',
        'test_scheduling',
        'cleanup'
      ],
      usage: {
        post: 'POST with { "action": "action_name", ...params }',
        get: 'GET with ?action=status'
      }
    });
  }
  
  // Handle GET requests by converting to POST format
  return POST(new Request(request.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action })
  }));
}
