import dbConnect from '../../../../../lib/mongodb.js';
import Campaign from '../../../../../models/Campaign.js';

export async function PUT(request, { params }) {
  try {
    await dbConnect();
    
    const { id } = params;
    console.log('PUT /schedule - Campaign ID:', id);
    
    const scheduleData = await request.json();
    console.log('PUT /schedule - Received data:', scheduleData);
    
    const campaign = await Campaign.findById(id);
    if (!campaign) {
      console.log('PUT /schedule - Campaign not found:', id);
      return Response.json(
        { success: false, error: 'Campaign not found' },
        { status: 404 }
      );
    }

    console.log('PUT /schedule - Found campaign:', campaign.name);

    // Update campaign schedule settings
    campaign.schedule = {
      name: scheduleData.name || 'New schedule',
      startDate: scheduleData.startDate || 'now',
      endDate: scheduleData.endDate || 'no-end',
      timing: {
        from: scheduleData.timing?.from || '9:00 AM',
        to: scheduleData.timing?.to || '6:00 PM',
        timezone: scheduleData.timing?.timezone || 'Eastern Time (US & Canada) (UTC-04:00)'
      },
      days: {
        monday: scheduleData.days?.monday ?? true,
        tuesday: scheduleData.days?.tuesday ?? true,
        wednesday: scheduleData.days?.wednesday ?? true,
        thursday: scheduleData.days?.thursday ?? true,
        friday: scheduleData.days?.friday ?? true,
        saturday: scheduleData.days?.saturday ?? false,
        sunday: scheduleData.days?.sunday ?? false
      },
      settings: {
        dailyLimit: scheduleData.settings?.dailyLimit || 50,
        delayBetweenEmails: scheduleData.settings?.delayBetweenEmails || 5,
        respectHolidays: scheduleData.settings?.respectHolidays ?? true,
        autoPauseOnReplies: scheduleData.settings?.autoPauseOnReplies ?? true,
        trackOpens: scheduleData.settings?.trackOpens ?? true
      }
    };

    console.log('PUT /schedule - Saving schedule:', campaign.schedule);
    await campaign.save();
    console.log('PUT /schedule - Schedule saved successfully');

    return Response.json({
      success: true,
      message: 'Schedule settings saved successfully',
      schedule: campaign.schedule
    });

  } catch (error) {
    console.error('Save schedule settings error:', error);
    return Response.json(
      { success: false, error: 'Failed to save schedule settings' },
      { status: 500 }
    );
  }
}

export async function GET(request, { params }) {
  try {
    await dbConnect();
    
    const { id } = params;
    
    const campaign = await Campaign.findById(id);
    if (!campaign) {
      return Response.json(
        { success: false, error: 'Campaign not found' },
        { status: 404 }
      );
    }

    return Response.json({
      success: true,
      schedule: campaign.schedule || {
        name: 'New schedule',
        startDate: 'now',
        endDate: 'no-end',
        timing: {
          from: '9:00 AM',
          to: '6:00 PM',
          timezone: 'Eastern Time (US & Canada) (UTC-04:00)'
        },
        days: {
          monday: true,
          tuesday: true,
          wednesday: true,
          thursday: true,
          friday: true,
          saturday: false,
          sunday: false
        },
        settings: {
          dailyLimit: 50,
          delayBetweenEmails: 5,
          respectHolidays: true,
          autoPauseOnReplies: true,
          trackOpens: true
        }
      }
    });

  } catch (error) {
    console.error('Get schedule settings error:', error);
    return Response.json(
      { success: false, error: 'Failed to get schedule settings' },
      { status: 500 }
    );
  }
}
