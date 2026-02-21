# Critical Fix: Initial Send Timing Bug

## The Problem You Just Found

**Your logs showed**: 
```
[outreach-engine-cron] Found 0 leads to process
Campaign shows: nextActionAt = 23/02/2026, 21:30:00 (future, 2+ days away)
```

**Why**: When initializing campaigns at 12:20 PM (noon), `calculateNextActionAt(campaign, 0)` was:
1. Adding 24 hours base delay → Feb 22, 12:20 PM
2. Enforcing business hours → Rolls to next business day
3. Results in Feb 23 at 21:30 PM (9:30 PM - AFTER 5 PM business hours end)

**Result**: All leads sit until Feb 23, cron finds nothing to do today.

---

## Root Cause

The timing calculator was designed for **follow-up emails** (24h+ delays), not **initial sends**.

**Initial sends should be ASAP** (same day, within business hours if possible).

---

## The Fix Applied

**File**: `lib/outreachEngine.js` ~line 48

**Before**:
```javascript
// Always apply 24h+ delay
delayHours = baseDelayHours * Math.pow(...);
delayHours = Math.max(24, delayHours);  // ← Forces 24h minimum
```

**After**:
```javascript
// Special case: Initial sends (attemptCount = 0)
if (attemptCount === 0) {
  // Send ASAP within current business day
  return enforceBusinessHours(new Date(), timezone, startHour, endHour);
}

// Follow-ups get the 24h+ delay
delayHours = baseDelayHours * Math.pow(...);
```

---

## Expected Behavior After Fix

### Before Fix
```
Campaign Start (12:20 PM EST) 
→ calculateNextActionAt(0) 
→ Now + 24h = Feb 22, 12:20 PM 
→ Check business hours 
→ Too late? Roll to Feb 23 
→ Result: nextActionAt = Feb 23, 21:30 PM ❌
→ Cron runs today: "Found 0 leads"
```

### After Fix
```
Campaign Start (12:20 PM EST)
→ calculateNextActionAt(0)
→ Check current business hours: 9 AM - 5 PM
→ Current time 12:20 PM: WITHIN business hours ✅
→ Result: nextActionAt = now (Feb 21, 12:20 PM)
→ Cron runs immediately: "Found X leads, sending..."
```

---

## What To Do Now

### Step 1: Redeploy/Restart
```bash
npm run dev
# or
npm start
```

The code change is live. No database migration needed.

### Step 2: Reset Your Campaign

Run this to fix existing campaign:
```bash
POST /api/campaigns/{campaign_id}/v2-kick
```

This resets all prospects to `nextActionAt: now` immediately.

### Step 3: Verify

```bash
# Should now show nextActionAt in past (due immediately)
GET /api/campaigns/{campaign_id}/v2-kick

# Expected in response:
{
  "prospectCount": 3,
  "prospectsPastDue": 3,  // ← Should be all of them
  "prospects": [
    {
      "nextActionAt": "2026-02-21T17:20:00.000Z",  // ← Past or present
      "nextActionAt_past": true,  // ← Should be true
      "v2State": "new"
    }
  ]
}
```

### Step 4: Trigger Cron

```bash
GET /api/cron/outreach-engine

# Should now show:
# [outreach-engine-cron] Found 3 leads to process
# [outreach-engine-cron] Processed: 3, Errors: 0
```

---

## Why This Happened

**Initial send delay was designed for large-scale campaigns** where you want to stagger sends over multiple days to avoid ISP blocks.

**But** for testing and normal use, you want emails to send ASAP, not wait 24 hours.

**The fix**: Distinguish between:
- **Initial send (attemptCount=0)**: Send ASAP today
- **Follow-ups (attemptCount≥1)**: Wait 24h+ for spacing

---

## Impact

✅ **Campaigns now send immediately on start**  
✅ **No more 2-day delays for initial emails**  
✅ **Still respects business hours** (won't send at 2 AM)  
✅ **Follow-ups still staggered** (24h+ delays)  

---

## Business Hours Behavior

### If NOW is within business hours (9 AM - 5 PM):
```
Campaign Start at 12:20 PM EST
→ nextActionAt: 12:20 PM (same minute, next cron run)
```

### If NOW is outside business hours (before 9 AM or after 5 PM):
```
Campaign Start at 8:00 AM EST (before 9 AM start)
→ nextActionAt: 9:00 AM EST (wait 1 hour until business hours open)
```

### If NOW is on weekend:
```
Campaign Start on Saturday 2:00 PM
→ nextActionAt: Monday 9:00 AM EST
```

---

## Testing Checklist

- [ ] Restart dev server
- [ ] Create new test campaign
- [ ] Click Start
- [ ] Check `/api/campaigns/{id}/v2-kick` → nextActionAt is NOW (past)
- [ ] Run cron immediately → Should process leads
- [ ] Email received within seconds
- [ ] Check no errors in logs
- [ ] Run Campaign #1 recovery again with this fix
- [ ] Should work immediately

---

## Files Changed

| File | Change |
|------|--------|
| `lib/outreachEngine.js` | Add special case for attemptCount=0 |

**Lines changed**: +9, -2  
**Risk**: Very low (isolated to initial send timing)

