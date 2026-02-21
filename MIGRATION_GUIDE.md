# Migration Guide: Legacy → V2 Engine

## What Changed for Users

### Before (Broken)
1. Create campaign → click Start
2. Wait 5-10 minutes → no emails sent
3. Check status → "corrupted state" errors
4. Run `/api/campaigns/{id}/v2-kick` manually
5. Wait another cron cycle → emails finally send

### After (Fixed)
1. Create campaign → click Start
2. Wait for next cron tick (every 5-10 minutes)
3. Emails send immediately
4. Click tracking works automatically
5. No manual interventions needed

---

## What Changed in Code

### Field Mapping (CampaignProspect)

| Legacy Field | V2 Field | Purpose | Who Writes It |
|---|---|---|---|
| `nextSendAt` | `nextActionAt` | When to send next | V2 Engine (now) |
| `status: 'pending'/'active'` | `v2State: 'new'/'contacted'` | Lead state machine | V2 Engine (now) |
| `sequenceStep` | `attemptCount` | How many emails sent | V2 Engine (now) |
| N/A | `processingLock` | Prevent double-send | V2 Engine (internal) |
| N/A | `threadHeaderMessageId` | Email thread ID | SMTP Service |
| `emailsOpened` | N/A | Open count (display only) | Open tracker |
| `emailsClicked` | N/A | Click count (display only) | Click tracker |

### Code Changes

#### 1. CampaignProspectService.js
```javascript
// ADDED: Import for V2 calculations
import { calculateNextActionAt } from '../outreachEngine.js';

// CHANGED: syncProspectsWithCampaignStatus() now does this on campaign.start():
if (campaign && campaign.useV2Engine) {
  setFields.v2State = 'new';                                    // Initialize state
  setFields.nextActionAt = calculateNextActionAt(campaign, 0); // Schedule first send
  setFields.attemptCount = 0;                                   // Start attempt counter
  setFields.failureCount = 0;                                   // No failures yet
}
```

#### 2. outreachEngine.js (processLead)
```javascript
// ADDED: Click tracking wrapping before send
const wrapUrlForTracking = (url, tid) => {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return `${appUrl}/api/track/click/${tid}?url=${encodeURIComponent(url)}`;
};

const trackedBody = body.replace(/https?:\/\/[^\s<>"]+/g, (url) => wrapUrlForTracking(url, trackingId));

// Now send with tracked body instead of raw body
await SMTPService.sendEmail({
  html: `<p>${trackedBody.replace(/\n/g, '<br>')}</p>`,
  text: trackedBody,  // ← tracked version stored
  // ... other fields
});

// CHANGED: Message.create() now uses tracked body
await Message.create({
  content: trackedBody,  // ← auditable version
  // ... other fields
});
```

---

## How to Verify the Fixes

### Check 1: Campaign Initialization
```bash
# After clicking "Start" on a campaign, run:
curl -s http://localhost:3000/api/campaigns/{campaign_id}/v2-kick | jq '.prospects[] | {v2State, nextActionAt, stopFlag}'

# Expected output:
{
  "v2State": "new",
  "nextActionAt": "2026-02-21T13:00:00.000Z",
  "stopFlag": false
}
```

### Check 2: Click Tracking Works
```bash
# 1. Create a test campaign with a link in body
# 2. Send email via cron
# 3. Check the Message in database:

db.messages.findOne({ trackingId: "..." }, { content: 1 })

# Expected: content has wrapped URLs
# "Check out http://localhost:3000/api/track/click/xxx?url=https%3A%2F%2Fexample.com"
```

### Check 3: Click Event Recorded
```bash
# After clicking a link in email:
db.messages.findOne({ trackingId: "..." }, { events: 1 })

# Expected: has 'clicked' event
{
  "_id": ObjectId(...),
  "events": [
    { "type": "sent", "timestamp": ... },
    { "type": "clicked", "timestamp": ..., "data": { "url": "..." } }
  ]
}
```

---

## Backward Compatibility

### Still Works
- Legacy campaigns (with `useV2Engine: false`)
- Old `nextSendAt` field (for UI display)
- Old `status` field (auto-synced from v2State)
- Campaign pause/resume
- Manual prospect activation

### Deprecated (but still there)
- `nextSendAt` ← replaced by `nextActionAt`
- Old cron jobs ← replaced by outreachEngine
- `status` field mutations ← now read-only (auto-synced)

### Won't Break
- Existing database (all old fields preserved)
- Old UI code (reads still work)
- Old API clients (backward compat)

---

## Migration Path (for existing campaigns)

### Option A: Automatic (recommended)
```javascript
// On next campaign.start() call, V2 initialization runs automatically
// No action needed — just start using it
```

### Option B: Manual (if you want immediate fix)
```bash
# For each campaign that uses V2:
POST /api/campaigns/{id}/v2-kick

# This resets all prospects to due immediately
# Next cron cycle will process them with proper V2 state
```

---

## Performance Impact

- ✅ No performance change (same fields, just different names)
- ✅ Same database indexes apply
- ✅ Cron speed unchanged
- ✅ Slightly better: no "repair corrupted" calls needed

---

## Troubleshooting

### "Still getting corrupted state errors"
1. Check: campaign.useV2Engine is `true`
2. Check: campaign.status is `active`
3. Check: v2State is NOT null (should be 'new')
4. Fix: POST /api/campaigns/{id}/v2-kick

### "Click tracking not working"
1. Check: `NEXT_PUBLIC_APP_URL` env var set
2. Check: Message.content contains wrapped URLs
3. Check: Redirect endpoint `/api/track/click/[id]` is working
4. Test: manually visit `http://localhost:3000/api/track/click/xxx-123?url=https://example.com`

### "Links are broken in emails"
1. Check: `NEXT_PUBLIC_APP_URL` is correct
2. Check: wrapped URL is valid
3Example: `http://localhost:3000/api/track/click/xxx?url=https%3A%2F%2Fexample.com`
4. If NEXT_PUBLIC_APP_URL is wrong, links point to wrong place

---

## Rollback Plan (if needed)

**To disable these changes:**

1. In CampaignProspectService.js, comment out the V2 initialization block
2. In outreachEngine.js, remove click tracking wrapper
3. Set `useV2Engine: false` on affected campaigns
4. Revert to legacy cron

**But you shouldn't need to** — the fixes are compatible with all existing code.

