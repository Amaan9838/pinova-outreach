# 🕐 Campaign Scheduling - Quick Status Check

## ✅ Current Status

### Cron Endpoints
All 4 required cron endpoints are **working**:

1. ✅ `/api/cron/process-sequences` - Sends scheduled emails
2. ✅ `/api/cron/process-scheduled` - Activates scheduled campaigns  
3. ✅ `/api/cron/check-replies` - Monitors replies
4. ✅ `/api/cron/process-unified` - System maintenance

### How It Works

**Campaign Lifecycle:**
```
draft → scheduled → active → completed
         ↑            ↑
         |            |
    User sets    Cron activates
    start time   at start time
```

**Email Sending:**
```
1. User creates campaign with sequence
2. User schedules campaign for future date
3. Cron job (process-scheduled) activates campaign at start time
4. Cron job (process-sequences) sends emails every 2 minutes
5. Cron job (check-replies) monitors for responses
```

---

## 🚀 How to Run Scheduling

### Option 1: Automated Cron Runner (Recommended for Windows)

**1. Start your dev server:**
```bash
npm run dev
```

**2. In a new terminal, run the cron runner:**
```bash
node scripts/cron-runner.js
```

This will automatically run all 4 cron jobs at their proper intervals:
- Process Sequences: Every 2 minutes
- Process Scheduled: Every 5 minutes  
- Check Replies: Every 10 minutes
- Process Unified: Every 30 minutes

### Option 2: Manual Testing

Test each endpoint individually:

```powershell
# Process sequences (send emails)
Invoke-WebRequest -Uri "http://localhost:3000/api/cron/process-sequences" -Method POST -UseBasicParsing

# Process scheduled campaigns
Invoke-WebRequest -Uri "http://localhost:3000/api/cron/process-scheduled" -Method POST -UseBasicParsing

# Check replies
Invoke-WebRequest -Uri "http://localhost:3000/api/cron/check-replies" -Method POST -UseBasicParsing

# Process unified
Invoke-WebRequest -Uri "http://localhost:3000/api/cron/process-unified" -Method POST -UseBasicParsing
```

### Option 3: Production Setup

For production, use Windows Task Scheduler or a service like:
- **Vercel Cron** (if deployed on Vercel)
- **GitHub Actions** (scheduled workflows)
- **External cron service** (cron-job.org, EasyCron)

---

## 📋 Campaign Scheduling Workflow

### 1. Create Campaign
```
/campaigns/new → Create sequence → Save as draft
```

### 2. Schedule Campaign
```
/campaigns/[id] → Schedule tab → Set start date/time → Schedule
```

### 3. System Activates
```
Cron runs every 5 min → Checks for campaigns with startDateTime <= now → Activates them
```

### 4. Emails Send
```
Cron runs every 2 min → Finds prospects with nextSendAt <= now → Sends emails
```

---

## 🔍 Troubleshooting

### "My campaign isn't starting"

**Check:**
1. Is the campaign status `scheduled`? (not `draft` or `pending_scheduled`)
2. Is the `startDateTime` in the past?
3. Is the cron job running? (check `scripts/cron-runner.js`)
4. Check campaign validation errors in the Schedule tab

### "Emails aren't sending"

**Check:**
1. Is the campaign status `active`?
2. Are there prospects with `nextSendAt <= now`?
3. Is the `process-sequences` cron running?
4. Check mailbox configuration

### "Replies aren't being tracked"

**Check:**
1. Is the `check-replies` cron running?
2. Are mailbox IMAP settings correct?
3. Check mailbox authentication

---

## 📊 Monitoring

### Check Logs
Look for these messages in your terminal:
```
=== EMAIL SEQUENCE PROCESSING START ===
=== PROCESSING SCHEDULED CAMPAIGNS ===
Checking for replies...
```

### Check Database
```javascript
// Active campaigns
db.campaigns.find({ status: 'active' })

// Scheduled campaigns
db.campaigns.find({ status: 'scheduled' })

// Prospects ready to send
db.campaignprospects.find({ 
  status: 'active',
  nextSendAt: { $lte: new Date() }
})
```

---

## ⚡ Quick Commands

```bash
# Start dev server
npm run dev

# Start cron runner (in new terminal)
node scripts/cron-runner.js

# Test a single cron job
Invoke-WebRequest -Uri "http://localhost:3000/api/cron/process-sequences" -Method POST -UseBasicParsing
```

---

## 📚 Full Documentation

- [CAMPAIGN_SCHEDULING.md](file:///c:/CODING%20PHP/htdocs/pinova-outreach/CAMPAIGN_SCHEDULING.md) - Complete scheduling guide
- [CRON_SETUP.md](file:///c:/CODING%20PHP/htdocs/pinova-outreach/CRON_SETUP.md) - Detailed cron setup instructions
