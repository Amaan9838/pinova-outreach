# Campaign Scheduling System

## Overview

The Campaign Scheduling System allows you to schedule campaigns for future execution with comprehensive validation, automatic retry mechanisms, and flexible timing controls. This system supports the complete campaign lifecycle from draft to completion with robust error handling and notifications.

## Campaign Status Model

The system uses an explicit status model to avoid ambiguity:

- **draft** — Campaign is being edited, not scheduled
- **pending_scheduled** — User set a future start time but validations failed (missing mailbox/leads) OR user scheduled but chose "save as draft"
- **scheduled** — All validations passed, waiting until start time
- **active** — Campaign is sending emails
- **paused** — User paused or system auto-paused for errors
- **completed** — All prospects exhausted / sequence finished
- **failed** — Fatal errors (e.g., mailbox revoked)
- **cancelled** — User cancelled before start

## Key Features

### 1. Advanced Scheduling Options

- **Future Scheduling**: Schedule campaigns for any future date and time
- **Timezone Support**: Per-campaign timezone configuration with fallback to account timezone
- **Business Hours**: Configure sending windows (e.g., 9:00–18:00, Mon-Fri)
- **Auto-Activation**: Automatically start campaigns when validation passes
- **Stagger Settings**: Spread emails over time to appear natural (2-minute default with randomization)

### 2. Comprehensive Validation

Before scheduling or activation, the system validates:
- Mailbox configuration and availability
- Prospect count and email validity
- Sequence configuration completeness
- Business hours and timezone settings

### 3. Per-Prospect Scheduling

- Individual timeline management for each prospect
- Flexible follow-up delays (minutes, hours, days, business days)
- Robust retry handling for failed sends
- Accurate pause/resume functionality

### 4. Automatic Retry Logic

- Configurable retry policies with exponential backoff
- Automatic validation re-checks
- Smart recovery from temporary failures
- Maximum retry limits to prevent infinite loops

## Using the Schedule Tab

### Basic Scheduling

1. **Navigate to Campaign**: Go to your campaign details page
2. **Open Schedule Tab**: Click the "Schedule" tab
3. **Set Date & Time**: Choose when you want the campaign to start
4. **Select Timezone**: Choose the appropriate timezone for your campaign
5. **Configure Options**: Set business hours, send limits, and stagger settings
6. **Schedule Campaign**: Click "Schedule Campaign" to save

### Validation Status

The Schedule tab shows real-time validation status:
- **Green (Valid)**: Campaign is ready to be scheduled
- **Yellow (Pending)**: Validation in progress
- **Red (Invalid)**: Issues need to be resolved before scheduling

### Auto-Activation

Enable "Auto-activate when ready" to automatically start the campaign when:
- All validation checks pass
- The scheduled start time arrives
- System resources are available

## Business Hours Configuration

### Setting Business Hours

1. Enable business hours in the Schedule tab
2. Set start and end times (24-hour format)
3. Select days of the week
4. Choose timezone interpretation:
   - **Campaign timezone**: Use campaign's configured timezone
   - **Prospect-local**: Use prospect's timezone if available (advanced)

### Business Hours Behavior

- Emails are only sent during configured hours
- If a send time falls outside business hours, it's moved to the next available window
- Weekend/holiday handling respects the selected days of the week

## Advanced Settings

### Daily Send Limits

- **Campaign Level**: Maximum emails per day across all prospects
- **Mailbox Level**: Respects individual mailbox daily caps
- **Global Limits**: System-wide sending limits for deliverability

### Email Staggering

- **Base Delay**: Minimum time between emails (default: 2 minutes)
- **Random Variation**: Adds randomness to appear natural (±1 minute default)
- **Per-Prospect**: Each prospect gets their own timeline
- **Mailbox Rotation**: Distributes sends across available mailboxes

### Follow-up Timing

Configure delays between sequence steps:
- **Minutes**: For immediate follow-ups (1-59 minutes)
- **Hours**: For same-day follow-ups (1-168 hours)
- **Days**: For standard follow-ups (1-365 days)
- **Business Days**: Excludes weekends and holidays

## API Endpoints

### Schedule Campaign
```
POST /api/campaigns/{id}/schedule
{
  "startDateTime": "2024-01-15T09:00:00Z",
  "timezone": "America/New_York",
  "businessHours": {
    "enabled": true,
    "startTime": "09:00",
    "endTime": "17:00",
    "daysOfWeek": [1,2,3,4,5]
  },
  "autoActivateWhenReady": true
}
```

### Validate Campaign
```
POST /api/campaigns/{id}/validate
```

### Reschedule Campaign
```
PATCH /api/campaigns/{id}/schedule
{
  "startDateTime": "2024-01-16T10:00:00Z"
}
```

### Bulk Operations
```
POST /api/campaigns/bulk-schedule
{
  "campaigns": [
    {
      "campaignId": "...",
      "startDateTime": "...",
      "timezone": "UTC"
    }
  ]
}
```

## Cron Job Setup

The system requires a cron job to process scheduled campaigns:

```bash
# Process scheduled campaigns every 5 minutes
*/5 * * * * curl -X POST https://your-domain.com/api/cron/process-scheduled

# Alternative: every 10 minutes for lower server load
*/10 * * * * curl -X POST https://your-domain.com/api/cron/process-scheduled
```

## Timezone Considerations

### Supported Timezones

The system supports all IANA timezone identifiers:
- `UTC` (default)
- `America/New_York` (Eastern Time)
- `America/Los_Angeles` (Pacific Time)
- `Europe/London` (GMT/BST)
- `Asia/Tokyo` (JST)
- And many more...

### Best Practices

1. **Use Specific Timezones**: Prefer `America/New_York` over `EST`
2. **Consider Your Audience**: Use prospect-local time when possible
3. **Test Across Timezones**: Verify behavior during DST transitions
4. **Document Your Choice**: Note timezone decisions for team members

## Troubleshooting

### Common Issues

**Campaign stuck in "pending_scheduled"**
- Check validation errors in the Schedule tab
- Verify mailbox configuration
- Ensure prospects are properly imported
- Confirm sequence steps are complete

**Emails not sending at scheduled time**
- Verify cron job is running
- Check system logs for errors
- Confirm business hours settings
- Review daily send limits

**Validation keeps failing**
- Check mailbox SMTP settings
- Verify prospect email addresses
- Ensure sequence templates are not empty
- Review timezone configuration

### Debug Mode

Enable debug logging by setting environment variable:
```bash
DEBUG_SCHEDULING=true
```

This will provide detailed logs for:
- Validation checks
- Scheduling decisions
- Email sending attempts
- Error conditions

## Performance Considerations

### Scaling Guidelines

- **Small campaigns** (< 1,000 prospects): Default settings work well
- **Medium campaigns** (1,000-10,000 prospects): Increase stagger delay to 5-10 minutes
- **Large campaigns** (> 10,000 prospects): Consider splitting into multiple campaigns

### Resource Management

- Monitor database performance during large campaign processing
- Adjust cron frequency based on campaign volume
- Use multiple mailboxes to distribute sending load
- Consider rate limiting for high-volume sending

## Security & Compliance

### Data Protection

- All scheduling data is encrypted at rest
- Timezone information is not personally identifiable
- Campaign schedules are user-specific and isolated

### Compliance Features

- Automatic unsubscribe handling
- Bounce management integration
- Suppression list checking
- GDPR-compliant data handling

## Support & Maintenance

### Monitoring

The system provides built-in monitoring for:
- Campaign scheduling success rates
- Validation failure patterns
- Email delivery metrics
- System performance indicators

### Maintenance Tasks

Regular maintenance includes:
- Cleaning up completed campaigns
- Archiving old scheduling data
- Updating timezone databases
- Performance optimization

For technical support or feature requests, please contact the development team.
