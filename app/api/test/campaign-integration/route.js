import dbConnect from '../../../../lib/mongodb.js';
import Campaign from '../../../../models/Campaign.js';
// import { CampaignExecutor } from '../../../../lib/campaignExecutor.js';

/**
 * Test endpoint to validate end-to-end campaign integration
 * Tests data persistence and workflow integration across all tabs
 */
export async function POST(request) {
  const testResults = {
    success: true,
    tests: [],
    errors: [],
    summary: {}
  };

  try {
    await dbConnect();
    
    // Test 1: Create test campaign with all settings
    const testCampaign = await createTestCampaign();
    testResults.tests.push({
      name: 'Campaign Creation',
      status: 'passed',
      details: `Created campaign: ${testCampaign._id}`
    });

    // Test 2: Validate Follow-up Settings Persistence
    await testFollowUpPersistence(testCampaign._id, testResults);

    // Test 3: Validate Schedule Settings Persistence
    await testSchedulePersistence(testCampaign._id, testResults);

    // Test 4: Validate Options Settings Persistence
    await testOptionsPersistence(testCampaign._id, testResults);

    // Test 5: Test Campaign Execution Integration
    // await testCampaignExecution(testCampaign._id, testResults);

    // Test 6: Cleanup
    await Campaign.findByIdAndDelete(testCampaign._id);
    testResults.tests.push({
      name: 'Cleanup',
      status: 'passed',
      details: 'Test campaign deleted'
    });

    // Generate summary
    const passed = testResults.tests.filter(t => t.status === 'passed').length;
    const failed = testResults.tests.filter(t => t.status === 'failed').length;
    
    testResults.summary = {
      total: testResults.tests.length,
      passed,
      failed,
      success: failed === 0
    };

    testResults.success = failed === 0;

  } catch (error) {
    testResults.success = false;
    testResults.errors.push(`Test suite error: ${error.message}`);
  }

  return Response.json(testResults);
}

async function createTestCampaign() {
  const campaign = new Campaign({
    name: 'Test Campaign - Integration Test',
    description: 'Automated test campaign',
    persona: 'Test Persona',
    goal: 'Test Goal',
    status: 'draft',
    sequence: [{
      stepNumber: 1,
      template: 'Test email content',
      subject: 'Test Subject',
      waitHours: 24
    }]
  });

  return await campaign.save();
}

async function testFollowUpPersistence(campaignId, testResults) {
  try {
    // Save follow-up settings
    const followUpData = {
      enabled: true,
      maxFollowUps: 5,
      followUpDelay: 7,
      followUpTemplates: [{
        id: 1,
        subject: 'Test Follow-up',
        content: 'Test follow-up content',
        delay: 7
      }],
      conditions: {
        noReply: true,
        noOpen: false,
        bounced: true
      },
      stopOnReply: true,
      stopOnOpen: false
    };

    const saveResponse = await fetch(`http://localhost:3000/api/campaigns/${campaignId}/followup`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(followUpData)
    });

    if (!saveResponse.ok) {
      throw new Error('Failed to save follow-up settings');
    }

    // Retrieve and validate
    const getResponse = await fetch(`http://localhost:3000/api/campaigns/${campaignId}/followup`);
    const retrieved = await getResponse.json();

    if (!retrieved.success || !retrieved.followUpSettings.enabled) {
      throw new Error('Follow-up settings not persisted correctly');
    }

    testResults.tests.push({
      name: 'Follow-up Settings Persistence',
      status: 'passed',
      details: 'Settings saved and retrieved successfully'
    });

  } catch (error) {
    testResults.tests.push({
      name: 'Follow-up Settings Persistence',
      status: 'failed',
      details: error.message
    });
    testResults.errors.push(error.message);
  }
}

async function testSchedulePersistence(campaignId, testResults) {
  try {
    // Schedule functionality has been removed
    testResults.scheduleTest = {
      success: true,
      message: 'Schedule functionality removed - test skipped'
    };

    testResults.tests.push({
      name: 'Schedule Settings Persistence (Removed)',
      status: 'skipped',
      details: 'Schedule functionality has been removed from the system'
    });

  } catch (error) {
    testResults.tests.push({
      name: 'Schedule Settings Persistence',
      status: 'failed',
      details: error.message
    });
    testResults.errors.push(error.message);
  }
}

async function testOptionsPersistence(campaignId, testResults) {
  try {
    const optionsData = {
      trackOpens: true,
      trackClicks: false,
      unsubscribeLink: true,
      dailyLimit: 100,
      timezone: 'UTC',
      notes: 'Test campaign notes'
    };

    const saveResponse = await fetch(`http://localhost:3000/api/campaigns/${campaignId}/options`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(optionsData)
    });

    if (!saveResponse.ok) {
      throw new Error('Failed to save options settings');
    }

    // Retrieve and validate
    const getResponse = await fetch(`http://localhost:3000/api/campaigns/${campaignId}/options`);
    const retrieved = await getResponse.json();

    if (!retrieved.success || retrieved.options.dailyLimit !== 100) {
      throw new Error('Options settings not persisted correctly');
    }

    testResults.tests.push({
      name: 'Options Settings Persistence',
      status: 'passed',
      details: 'Settings saved and retrieved successfully'
    });

  } catch (error) {
    testResults.tests.push({
      name: 'Options Settings Persistence',
      status: 'failed',
      details: error.message
    });
    testResults.errors.push(error.message);
  }
}

// async function testCampaignExecution(campaignId, testResults) {
//   try {
//     // Test campaign executor initialization
//     const executor = new CampaignExecutor(campaignId);
//     await executor.initialize();

//     if (!executor.campaign) {
//       throw new Error('Campaign executor failed to initialize');
//     }

//     // Test schedule checking
//     const withinSchedule = executor.isWithinSchedule();
    
//     // Test prospect retrieval (should be empty for test campaign)
//     const readyProspects = await executor.getProspectsReadyForSending();
//     const followUpProspects = await executor.getProspectsReadyForFollowUp();

//     testResults.tests.push({
//       name: 'Campaign Execution Integration',
//       status: 'passed',
//       details: `Executor initialized, schedule check: ${withinSchedule}, prospects: ${readyProspects.length}, follow-ups: ${followUpProspects.length}`
//     });

//   } catch (error) {
//     testResults.tests.push({
//       name: 'Campaign Execution Integration',
//       status: 'failed',
//       details: error.message
//     });
//     testResults.errors.push(error.message);
//   }
// }

export async function GET() {
  return Response.json({
    message: 'Campaign Integration Test Endpoint',
    usage: 'POST to run comprehensive integration tests',
    tests: [
      'Campaign Creation',
      'Follow-up Settings Persistence',
      'Schedule Settings Persistence (Removed)',
      'Options Settings Persistence',
      'Campaign Execution Integration',
      'Cleanup'
    ]
  });
}
