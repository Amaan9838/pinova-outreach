# Cron Job Setup for Pinova Mail System

## What is a Cron Job?

A cron job is an automated task that runs at specified intervals. For the Pinova Mail System, we need it to process email sequences automatically so emails get sent out according to your campaign timing.

## How It Works

The system has an endpoint `/api/cron/process-sequences` that:
1. Checks all active campaigns
2. Finds prospects ready for their next email
3. Sends emails according to sequence timing
4. Updates campaign statistics

## Complete Cron Job List

### Primary Cron Jobs (Essential)

These are the core cron jobs required for the system to function properly:

```bash
# Main sequence processor - Every 15 minutes
https://yourdomain.com/api/cron/process-sequences

# Reply checker - Every 30 minutes
https://yourdomain.com/api/cron/check-replies

# Schedule processor - Every 15 minutes
https://yourdomain.com/api/cron/process-schedules
```

### Follow-up Cron Jobs (If using follow-ups)

```bash
# Follow-up processor - Every 2 hours
https://yourdomain.com/api/cron/process-followups
```

### Recommended Cron Schedule

For cPanel or server-based cron setup, use these exact commands:

```bash
# cPanel/Server cron format:
*/15 * * * * curl -s https://yourdomain.com/api/cron/process-sequences
*/15 * * * * curl -s https://yourdomain.com/api/cron/process-schedules
*/30 * * * * curl -s https://yourdomain.com/api/cron/check-replies
0 */2 * * * curl -s https://yourdomain.com/api/cron/process-followups
```

**Schedule Explanation:**
- `*/15 * * * *` = Every 15 minutes
- `*/30 * * * *` = Every 30 minutes
- `0 */2 * * *` = Every 2 hours (at minute 0)

## Setup Options

### Option 1: Manual Triggering (For Testing)
- Go to `/debug` page
- Click "Process Sequences Manually" 
- This sends any queued emails immediately

### Option 2: Local Development (Windows)
Use Windows Task Scheduler:

1. **Open Task Scheduler** (search "Task Scheduler" in Windows)
2. **Create Basic Task**:
   - Name: "Pinova Mail Sequences"
   - Trigger: Daily
   - Start: Select time (e.g., 9:00 AM)
   - Repeat: Every 10 minutes for 12 hours
3. **Action**: Start a program
   - Program: `curl`
   - Arguments: `http://localhost:3000/api/cron/process-sequences`

### Option 3: Cloud Hosting (Recommended for Production)

#### Vercel Cron (if using Vercel):
```javascript
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/process-sequences",
      "schedule": "*/10 * * * *"
    }
  ]
}
```

#### External Cron Services:
1. **cron-job.org** (Free):
   - Sign up at cron-job.org
   - Add job: `https://yourdomain.com/api/cron/process-sequences`
   - Schedule: Every 10 minutes (`*/10 * * * *`)

2. **EasyCron** (Free tier available):
   - Similar setup to cron-job.org
   - More reliable for production

3. **GitHub Actions** (Free):
```yaml
# .github/workflows/cron.yml
name: Process Email Sequences
on:
  schedule:
    - cron: '*/10 * * * *'  # Every 10 minutes

jobs:
  process:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger sequence processing
        run: curl -X GET https://yourdomain.com/api/cron/process-sequences
```

## Current Status

Right now, the system works but **requires manual triggering**. This means:

✅ **What works:**
- You can create campaigns
- Add prospects and mailboxes  
- Email sending works when triggered manually
- All tracking and sequencing logic is ready

⚠️ **What you need to do:**
1. Set up a cron job using one of the options above
2. OR manually trigger sequences from the debug page when you want to send emails

## Recommended Setup for You

Since you're testing locally:

1. **For now**: Use the "Process Sequences Manually" button in `/debug`
2. **For production**: Set up cron-job.org to hit your live domain every 10 minutes

## Security Note

The cron endpoint is currently open for testing. For production, you should:
1. Add authentication to the cron endpoint
2. Use a secret token to secure it
3. Whitelist only your cron service IP

## Testing Your Setup

1. Create a campaign with a prospect
2. Start the campaign  
3. Check the campaign details page to see "Next Send" times
4. Either wait for cron OR click "Process Sequences Now"
5. Check if emails are sent and stats update

The sequence processing happens automatically once you set up the cron job!
