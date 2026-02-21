# Debug: Campaign Shows "0 Leads Processed"

## Your Issue
- Started campaign with 2 leads
- Triggered cron (outreach-engine)
- Result: "Processed: 0, Errors: 0"
- Emails not sending

---

## Root Cause Analysis

The V2 engine only picks up leads that have:
1. ✅ `v2State` = 'new' (or 'contacted', 'opened', 'replied_neutral', 'replied_objection')
2. ✅ `nextActionAt` <= now (scheduled for today)
3. ✅ `processingLock` = false
4. ✅ `stopFlag` = false
5. ✅ Campaign status = 'active'
6. ✅ Campaign has `useV2Engine` = true

**Query that engine uses**:
```javascript
CampaignProspect.find({
  v2State: { $nin: ['bounced', 'failed', 'stopped', 'completed', null] },
  stopFlag: false,
  processingLock: false,
  nextActionAt: { $lte: new Date() }
})
```

**If ANY of these are wrong → 0 leads processed!**

---

## Diagnostic Steps

### Step 1: Check Campaign Status
**Go to**: `/api/campaigns/{campaign_id}/v2-kick`
(Replace {campaign_id} with your campaign ID)

**Look for**:
```json
{
  "campaign": {
    "useV2Engine": true,        // ✅ Must be TRUE
    "status": "active",         // ✅ Must be "active"
    "mailbox": "...valid id...",// ✅ Must be set
    "anglesCount": 3            // ✅ Must be 3+
  },
  "cronWillProcess": true,      // ✅ Should be TRUE
  "prospectCount": 2,           // ✅ Shows 2
  "byState": {
    "new": 2                    // ✅ Both should be "new"
  },
  "prospects": [
    {
      "v2State": "new",         // ✅ NEW not null!
      "nextActionAt": "2026-02-21T10:00:00Z", // ✅ Set!
      "nextActionAt_past": true,// ✅ TRUE = due now
      "stopFlag": false         // ✅ FALSE
    }
  ]
}
```

### Step 2: Identify What's Wrong

**If `cronWillProcess: false`**, check:

```
Message: "Campaign status is "draft", must be "active""
  ↓ FIX: Click "Start" button again
  
Message: "useV2Engine is false"
  ↓ FIX: Go to V2Engine tab → enable toggle
  
Message: "3 prospects have NO nextActionAt"
  ↓ FIX: nextActionAt is null! See Step 3 below
  
Message: "3 prospects have nextActionAt in the FUTURE"
  ↓ FIX: Scheduled for later, just wait
  
Message: "3 prospects have processingLock=true"
  ↓ FIX: Stuck processing, see Step 4 below
```

### Step 3: Fix Null nextActionAt

If prospects show `nextActionAt: null`, the initialization failed.

**Cause**: Campaign.start() didn't initialize v2State/nextActionAt properly

**Solution**: Run this endpoint to force fix:

```
POST /api/campaigns/{campaign_id}/v2-kick

Response should be:
{
  "success": true,
  "message": "Reset 2 prospects. Hit /api/cron/outreach-engine now.",
  "modified": 2
}
```

Then check `/api/campaigns/{id}/v2-kick` again → should show nextActionAt set

### Step 4: Fix processingLock Stuck

If prospects show `processingLock: true`, they're stuck in the middle of processing.

**Cause**: Previous cron run crashed while processing

**Solution**: Same as Step 3 - POST to v2-kick will unlock them

### Step 5: Check v2State is NOT null

If `v2State: null`, engine will skip them.

**Should be**: `v2State: "new"`

**Cause**: Campaign.start() didn't run the sync properly

**Solution**: 
1. Check if you clicked "Start" button (not "Schedule Campaign")
2. If you used Schedule tab, make sure our fix synced v2Timezone
3. Run POST /api/campaigns/{id}/v2-kick to force init

---

## The Most Common Issue

**99% of the time when you get "0 leads processed":**

### The Problem
```
User clicks "Start"
  ↓ 
But uses SCHEDULE TAB instead
  ↓
Schedule API calls syncProspectsWithCampaignStatus('scheduled')
  ↓
Prospects get status='active' (legacy)
  ↓
But v2State stays null! ❌
  ↓
Engine queries: v2State != null
  ↓
Finds 0 leads ❌
```

### The Fix
```
POST /api/campaigns/{campaign_id}/v2-kick
  ↓
Resets: v2State='new', nextActionAt=calculated
  ↓
Next cron finds and processes them ✅
```

---

## Quick Diagnostic Checklist

Run through this:

```bash
# 1. Check campaign state
curl https://yourdomain.com/api/campaigns/{id}/v2-kick
# Look for: useV2Engine: true, status: active, cronWillProcess: true

# 2. Check prospect state
# In response above, look at each prospect:
#   - v2State: "new" (not null)
#   - nextActionAt_past: true (due now, not future)
#   - stopFlag: false

# 3. If any are wrong, run:
curl -X POST https://yourdomain.com/api/campaigns/{id}/v2-kick

# 4. Check again:
curl https://yourdomain.com/api/campaigns/{id}/v2-kick
# Should now show: cronWillProcess: true, all nextActionAt in past

# 5. Run cron:
curl https://yourdomain.com/api/cron/outreach-engine
# Should show: Processed: 2, Errors: 0
```

---

## Your Specific Case

**What you see**: "Processed: 0, Errors: 0"  
**What probably happened**:
- Started campaign (clicked Start)
- Leads are "pending" not "active" in v2
- v2State is null (not 'new')
- nextActionAt is null

**What to do RIGHT NOW**:

1. Go to: `/api/campaigns/{campaign_id}/v2-kick`
   - Replace {campaign_id} with your campaign ID
   - Check if you see the issues above

2. If nextActionAt is null or v2State is null:
   ```
   POST /api/campaigns/{campaign_id}/v2-kick
   ```

3. Wait 5-10 minutes for next cron
   - Should process 2 leads now

4. Check: `/api/campaigns/{campaign_id}/v2-kick` again
   - Should show: cronWillProcess: true

---

## Why This Happens

The chain:
```
Campaign.start()
  ↓
Calls: syncProspectsWithCampaignStatus(id, 'active')
  ↓
Should check: if (campaign.useV2Engine)
  ↓
And initialize: v2State='new', nextActionAt=calculated
  ↓
But if this check is skipped:
  ↓
v2State stays null
nextActionAt stays null
  ↓
Engine finds 0 leads
```

We fixed this in `CampaignProspectService.js`, but if you're using an older version or didn't restart the app, you might still have the old code.

---

## Permanent Fix (If v2-kick Doesn't Work)

If running `/api/campaigns/{id}/v2-kick` doesn't fix it, there's likely a code issue:

**Check**:
1. Did you restart your dev server after our fixes?
   ```bash
   npm run dev
   ```

2. Is the fix actually in the code?
   - Open `lib/services/CampaignProspectService.js`
   - Line 40-53 should check `if (campaign && campaign.useV2Engine)`
   - If not, the fix didn't get applied

3. If code looks right but still broken:
   - Clear browser cache
   - Try incognito window
   - Restart dev server completely

---

## Testing After Fix

Once you fix it:

```bash
1. Go to /api/campaigns/{id}/v2-kick
   Should show: cronWillProcess: true, prospectCount: 2
   
2. See real-time email times in V2Engine tab
   Should show: Email 1 at [today], Email 2 at [tomorrow], etc.
   
3. Wait 5-10 minutes or manually run:
   /api/cron/outreach-engine
   
4. Should see: Processed: 2, Errors: 0
   
5. Check inbox: First email from your mailbox should arrive
```

---

## Summary

**Your problem**: Leads have `v2State: null` or `nextActionAt: null`

**Quick fix**: 
```
POST /api/campaigns/{campaign_id}/v2-kick
```

**Then wait**: 5-10 minutes for next cron

**Should process**: 2 leads successfully

**If still doesn't work**: Restart dev server (`npm run dev`) - you're running old code

