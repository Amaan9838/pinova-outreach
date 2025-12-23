# Schedule Tab - How It Works (Simplified)

## ✅ The Simple Truth

**You were right!** We don't need a separate cron job for scheduled campaigns.

The existing `process-sequences` cron already handles everything by checking `nextSendAt` times.

---

## How It Actually Works

### 1. **User Schedules Campaign**
In Schedule tab:
- Set start date/time: Tomorrow at 9 AM
- Click "Schedule Campaign"

### 2. **What Happens Immediately**
```
Campaign status → "active"
Prospect 1: nextSendAt = Tomorrow 9:00 AM
Prospect 2: nextSendAt = Tomorrow 9:02 AM (stagger +2min)
Prospect 3: nextSendAt = Tomorrow 9:04 AM (stagger +2min)
...
```

### 3. **Existing Cron Does Everything**
```bash
# This ONE cron handles everything:
*/5 * * * * curl -X POST http://localhost:3000/api/cron/process-sequences
```

**What it does:**
- Runs every 5 minutes
- Checks: `WHERE nextSendAt <= NOW()`
- Sends emails for prospects whose time has arrived
- Schedules follow-ups with wait times

---

## Complete Example

### Schedule campaign for tomorrow 9 AM:

**Step 1: User clicks "Schedule Campaign"**
```
Campaign: status = "active"
Prospect A: nextSendAt = 2024-01-15 09:00:00
Prospect B: nextSendAt = 2024-01-15 09:02:00
Prospect C: nextSendAt = 2024-01-15 09:04:00
```

**Step 2: Tomorrow at 9:00 AM**
```
process-sequences cron runs
→ Finds Prospect A (nextSendAt = 9:00 AM ≤ NOW)
→ Sends Step 1 email
→ Sets nextSendAt = 9:00 AM + 48 hours (for Step 2)
```

**Step 3: Tomorrow at 9:05 AM**
```
process-sequences cron runs again
→ Finds Prospect B (nextSendAt = 9:02 AM ≤ NOW)
→ Finds Prospect C (nextSendAt = 9:04 AM ≤ NOW)
→ Sends Step 1 to both
→ Schedules their Step 2 follow-ups
```

**Step 4: 48 hours later**
```
process-sequences cron runs
→ Finds prospects with Step 2 ready
→ Sends Step 2 emails
→ Schedules Step 3 follow-ups
```

---

## Key Code Flow

### When Scheduling:
```javascript
// 1. Set scheduled times
syncProspectsWithCampaignStatus(campaignId, 'scheduled', {
  startDateTime: scheduledTime,
  timezone: 'America/New_York'
});
// Result: All prospects get nextSendAt = scheduledTime + stagger

// 2. Activate campaign
syncProspectsWithCampaignStatus(campaignId, 'active');
// Result: Campaign active, prospects keep their scheduled nextSendAt
```

### When Cron Runs:
```javascript
// Find prospects ready to send
CampaignProspect.findReadyToSend()
// Query: WHERE nextSendAt <= NOW() AND status = 'active'

// Send emails
for (prospect of readyProspects) {
  sendEmail(prospect);
  scheduleNextStep(prospect); // Sets nextSendAt for follow-up
}
```

---

## Why This Is Better

### ❌ Old Approach (Complex)
- Separate cron for activation
- Campaign status: draft → scheduled → active
- Two-step process
- More moving parts

### ✅ New Approach (Simple)
- One cron handles everything
- Campaign status: draft → active
- `nextSendAt` controls when emails send
- Fewer moving parts

---

## Setup Required

### Only ONE cron job needed:

```bash
# Process sequences (sends emails when nextSendAt arrives)
*/5 * * * * curl -X POST http://localhost:3000/api/cron/process-sequences
```

### For Vercel:
```json
{
  "crons": [{
    "path": "/api/cron/process-sequences",
    "schedule": "*/5 * * * *"
  }]
}
```

---

## Testing

### Test scheduling:
```bash
# 1. Schedule campaign for 2 minutes from now
# 2. Wait 2 minutes
# 3. Check logs - emails should send automatically
```

### Manual trigger (for testing):
```bash
curl -X POST http://localhost:3000/api/cron/process-sequences
```

---

## Summary

**Before**: Overcomplicated with multiple crons and status transitions

**After**: 
- ✅ One cron (`process-sequences`)
- ✅ Simple status: draft → active
- ✅ `nextSendAt` controls everything
- ✅ Works for immediate AND scheduled sends
- ✅ Follow-ups work the same way

**The key insight**: `nextSendAt` is the single source of truth for when to send emails, whether that's now or in the future.
