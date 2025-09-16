# 🕐 **Critical Cron Jobs Setup Guide**

## **Overview**
The Pinova Outreach system requires several cron jobs to function properly. Without these, the system will be broken and emails won't send.

## **🚨 Required Cron Jobs (In Order of Importance)**

### **1. Process Email Sequences** ⭐⭐⭐ (CRITICAL)
- **Endpoint**: `POST /api/cron/process-sequences`
- **Frequency**: Every 2-5 minutes
- **Purpose**: Sends scheduled emails from active campaigns
- **What it does**:
  - Finds prospects ready to receive emails (`nextSendAt <= now`)
  - Sends emails using configured mailboxes
  - Updates prospect status and schedules next steps
  - Handles email personalization and tracking
- **Impact if missing**: NO EMAILS WILL BE SENT

**Cron Command**:
```bash
# Every 2 minutes
*/2 * * * * curl -X POST http://localhost:3000/api/cron/process-sequences
```

### **2. Process Scheduled Campaigns** ⭐⭐⭐ (CRITICAL)
- **Endpoint**: `POST /api/cron/process-scheduled`
- **Frequency**: Every 5-10 minutes
- **Purpose**: Activates campaigns that are scheduled to start
- **What it does**:
  - Finds campaigns with `status: 'scheduled'` and `startDateTime <= now`
  - Validates campaigns before activation
  - Changes status from `scheduled` to `active`
  - Schedules first emails for all prospects
  - Handles retry attempts for failed activations
- **Impact if missing**: SCHEDULED CAMPAIGNS NEVER START

**Cron Command**:
```bash
# Every 5 minutes
*/5 * * * * curl -X POST http://localhost:3000/api/cron/process-scheduled
```

### **3. Check Email Replies** ⭐⭐ (HIGH)
- **Endpoint**: `POST /api/cron/check-replies`
- **Frequency**: Every 10-15 minutes
- **Purpose**: Monitors mailboxes for replies and updates campaign data
- **What it does**:
  - Connects to IMAP servers for each mailbox
  - Checks for new replies to sent emails
  - Updates prospect status when replies are received
  - Stops follow-up sequences if configured
  - Tracks engagement metrics
- **Impact if missing**: REPLY TRACKING BROKEN, FOLLOW-UPS CONTINUE AFTER REPLIES

**Cron Command**:
```bash
# Every 10 minutes
*/10 * * * * curl -X POST http://localhost:3000/api/cron/check-replies
```

### **4. Process Follow-ups** ⭐ (MEDIUM)
- **Endpoint**: `POST /api/cron/process-followups` (if exists)
- **Frequency**: Every 15-30 minutes
- **Purpose**: Handles advanced follow-up logic and conditions
- **What it does**:
  - Processes conditional follow-ups
  - Handles complex follow-up rules
  - Manages follow-up delays and conditions
- **Impact if missing**: ADVANCED FOLLOW-UP FEATURES BROKEN

### **5. Process Unified Operations** ⭐ (LOW)
- **Endpoint**: `POST /api/cron/process-unified`
- **Frequency**: Every 30 minutes
- **Purpose**: General maintenance and unified operations
- **What it does**:
  - Initializes mailbox services
  - Performs system maintenance
  - Handles background operations
- **Impact if missing**: SYSTEM MAINTENANCE ISSUES

## **🔧 Complete Cron Setup**

### **For Linux/Unix Systems**:

1. **Edit crontab**:
```bash
crontab -e
```

2. **Add these lines**:
```bash
# Pinova Outreach - Critical Email Processing
*/2 * * * * curl -X POST http://localhost:3000/api/cron/process-sequences >/dev/null 2>&1

# Pinova Outreach - Campaign Scheduling
*/5 * * * * curl -X POST http://localhost:3000/api/cron/process-scheduled >/dev/null 2>&1

# Pinova Outreach - Reply Monitoring
*/10 * * * * curl -X POST http://localhost:3000/api/cron/check-replies >/dev/null 2>&1

# Pinova Outreach - System Maintenance
*/30 * * * * curl -X POST http://localhost:3000/api/cron/process-unified >/dev/null 2>&1
```

### **For Windows Systems**:

1. **Create batch files** in `C:\PinovaOutreach\crons\`:

**process-sequences.bat**:
```batch
@echo off
curl -X POST http://localhost:3000/api/cron/process-sequences
```

**process-scheduled.bat**:
```batch
@echo off
curl -X POST http://localhost:3000/api/cron/process-scheduled
```

**check-replies.bat**:
```batch
@echo off
curl -X POST http://localhost:3000/api/cron/check-replies
```

2. **Use Windows Task Scheduler**:
- Open Task Scheduler
- Create Basic Task for each batch file
- Set appropriate triggers (every 2 min, 5 min, 10 min)

### **For Development (Node.js)**:

Create `scripts/cron-runner.js`:
```javascript
const cron = require('node-cron');
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

// Every 2 minutes - Process sequences
cron.schedule('*/2 * * * *', async () => {
  try {
    await fetch(`${BASE_URL}/api/cron/process-sequences`, { method: 'POST' });
    console.log('✅ Sequences processed');
  } catch (error) {
    console.error('❌ Sequences error:', error);
  }
});

// Every 5 minutes - Process scheduled
cron.schedule('*/5 * * * *', async () => {
  try {
    await fetch(`${BASE_URL}/api/cron/process-scheduled`, { method: 'POST' });
    console.log('✅ Scheduled processed');
  } catch (error) {
    console.error('❌ Scheduled error:', error);
  }
});

// Every 10 minutes - Check replies
cron.schedule('*/10 * * * *', async () => {
  try {
    await fetch(`${BASE_URL}/api/cron/check-replies`, { method: 'POST' });
    console.log('✅ Replies checked');
  } catch (error) {
    console.error('❌ Replies error:', error);
  }
});

console.log('🕐 Cron jobs started');
```

Run with: `node scripts/cron-runner.js`

## **🧪 Testing Cron Jobs**

Test each endpoint manually:

```bash
# Test sequence processing
curl -X POST http://localhost:3000/api/cron/process-sequences

# Test scheduled campaigns
curl -X POST http://localhost:3000/api/cron/process-scheduled

# Test reply checking
curl -X POST http://localhost:3000/api/cron/check-replies

# Test unified processing
curl -X POST http://localhost:3000/api/cron/process-unified
```

## **📊 Monitoring**

Check logs for:
- `=== EMAIL SEQUENCE PROCESSING START ===`
- `=== PROCESSING SCHEDULED CAMPAIGNS ===`
- `Checking for replies...`
- `=== EMAIL PROCESSING START ===`

## **🚨 Troubleshooting**

### **If emails aren't sending**:
1. Check if `process-sequences` cron is running
2. Verify campaigns have `status: 'active'`
3. Check if prospects have `nextSendAt <= now`
4. Verify mailboxes are configured

### **If scheduled campaigns don't start**:
1. Check if `process-scheduled` cron is running
2. Verify campaigns have `status: 'scheduled'`
3. Check `startDateTime` is in the past
4. Verify campaign validation passes

### **If replies aren't tracked**:
1. Check if `check-replies` cron is running
2. Verify mailbox IMAP settings
3. Check mailbox authentication

## **⚡ Production Recommendations**

1. **Use a proper cron service** (not curl)
2. **Add monitoring and alerting**
3. **Use environment-specific URLs**
4. **Add retry logic for failed requests**
5. **Log all cron executions**
6. **Set up health checks**

## **🔐 Security Notes**

- Protect cron endpoints with API keys in production
- Use HTTPS in production
- Limit access to cron endpoints
- Monitor for unauthorized access
