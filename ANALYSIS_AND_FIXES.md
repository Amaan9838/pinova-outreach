# Root Cause Analysis: v2-kick, Tracking, & Scheduling Issues

## 1. Why v2-kick Endpoint Exists (Not Just a Patch)

### Root Cause: Race Condition Between State Setup & Processing

**The Issue**: When a campaign is created/imported, `CampaignProspect` records are bulk-created with:
- `v2State: null` (not yet enrolled)
- `nextActionAt: null` (no schedule set)
- `processingLock: false`
- `stopFlag: false`

The engine's `repairCorruptedLeads()` function (line 735-766 in outreachEngine.js) DOES fix null nextActionAt, BUT there's a timing gap:

1. **Import happens** → creates 100 `CampaignProspect` records
2. **Cron fires immediately** before campaign.start() is called
3. **Engine queries** for `nextActionAt <= now` and `v2State not null` → finds ZERO prospects because v2State is null
4. **Leads remain stuck** with null nextActionAt, null v2State

### v2-kick is a **Manual Trigger** to Fix This

POST `/api/campaigns/{id}/v2-kick`:
- Sets `nextActionAt: new Date()` (immediate)
- Sets `processingLock: false` (unlock)
- Sets `stopFlag: false` (un-stop)
- On NEXT cron run: engine picks them up, initializes v2State to `contacted`, and sends

**The Real Fix**: v2-kick should NOT be needed if initialization happens correctly on campaign start.

---

## 2. Email Tracking is Partially Disabled

### Tracking IS Working (Open Tracking)

The open pixel (`/api/track/open/[trackingId]`) **IS active** (lines 78-92 in route.js):
1. Detects first open
2. Records event in `Message.events[]`
3. Sets `lastOpenedAt` on CampaignProspect
4. Updates Campaign stats

**✅ This is working correctly.**

### What IS Disabled: Click Tracking

`/api/track/click/[trackingId]` exists (file found in glob), but:
- Not embedded in email templates
- No link rewriting in outreachEngine (lines 569-580)
- Click events are defined in Message schema but never recorded

### What IS Disabled: Reply Classification UI

Reply classification happens in the engine (`classifyReply()` call, line 300-330), but:
- No UI endpoint to manually override/review replies
- No bulk classification batch tool
- Dashboard only shows "replied" status, not intent (positive/neutral/objection)

---

## 3. Multiple "Next Send At" Types (CRITICAL BUG)

### The Problem: 3 Overlapping Scheduling Fields

| Field | Location | Purpose | V2 Status |
|-------|----------|---------|-----------|
| `nextSendAt` | CampaignProspect | **Legacy** — used by old cron | ❌ NOT written by v2Engine |
| `nextActionAt` | CampaignProspect | **Canonical v2** — single source of truth | ✅ Written by v2Engine |
| `processingStartedAt` | CampaignProspect | Lock timestamp (internal) | Internal only |
| `lastSentAt` | CampaignProspect | Track when last email was sent | ✅ Updated by v2Engine |

**The Bug**: 
- Line 172 in CampaignProspect.js: indexes `nextSendAt` (legacy)
- Line 173: indexes `nextActionAt` (v2)
- But old code/queries might still use `nextSendAt`, causing the wrong cron to trigger

### Evidence from Your Errors

```
Was scheduled: 21/02/2026, 11:52:13
Now scheduled: 23/02/2026, 21:30:00
```

This shows the engine is writing `nextActionAt` correctly, BUT leads still pile up with:
```
Lead had null nextActionAt with non-terminal state
```

This means **some code path is not initializing nextActionAt on campaign start**.

---

## 4. Root Causes & Solutions

### Problem A: Null nextActionAt on Campaign Start
**Root**: No code initializes nextActionAt when campaign/prospect is created

**Solution**: Add initialization in campaign.start() endpoint
```javascript
// app/api/campaigns/[id]/start/route.js
const { calculateNextActionAt } = require('@/lib/outreachEngine.js');

// Before setting campaign.status = 'active'
await CampaignProspect.updateMany(
  { campaign: id, v2State: null },
  { 
    v2State: 'new',
    nextActionAt: calculateNextActionAt(campaign, 0) // Schedule first send
  }
);
```

### Problem B: nextSendAt vs nextActionAt Confusion
**Root**: Legacy field index not removed; old cron logic might still be called

**Solution**: 
1. Remove `nextSendAt` index from CampaignProspect schema
2. Search codebase for all queries using `nextSendAt` → replace with `nextActionAt`
3. In dataAccessLayer.js, map `nextSendAt` for legacy UI reads only (as virtual)

### Problem C: Click Tracking Not Implemented
**Root**: No link rewriting in email body; no click handler

**Solution**: Implement click tracking wrapper:
```javascript
// In outreachEngine.js processLead() around line 575:
const emailWithTracking = wrapLinksWithTracking(body, trackingId);
```

---

## 5. Why v2-kick Shouldn't Be Needed (Post-Fix)

After applying fixes A, B, C:
- Campaigns initialize with `v2State: 'new'` and `nextActionAt: <now + delays>`
- Cron sees properly scheduled leads
- No corrupted state
- v2-kick becomes **diagnostic only** (GET endpoint), not a repair tool

---

## 6. Immediate Actions (Priority Order)

### 1️⃣ CRITICAL: Fix Campaign Start Initialization
**File**: `app/api/campaigns/[id]/start/route.js`
- Import `calculateNextActionAt` from outreachEngine
- On campaign.start(), initialize all prospects with `v2State: 'new'` and proper `nextActionAt`
- Test: create campaign → check CampaignProspect records have nextActionAt before any cron

### 2️⃣ HIGH: Consolidate Scheduling Fields
**File**: `models/CampaignProspect.js`
- Remove `nextSendAt` index
- Keep `nextSendAt` field but **ONLY** for legacy UI reads (mark as deprecated)
- Add comment: "DEPRECATED — use nextActionAt instead"

**File**: Search all files for `nextSendAt` queries
```bash
grep -r "nextSendAt" app/ lib/ --include="*.js" | grep -v "// DEPRECATED"
```
Replace with `nextActionAt`

### 3️⃣ HIGH: Enable Click Tracking
**File**: `lib/outreachEngine.js` ~line 575
Add link wrapper:
```javascript
// Wrap links for click tracking
const trackedBody = body.replace(
  /https?:\/\/[^\s>]+/g,
  (url) => `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/track/click/${trackingId}?url=${encodeURIComponent(url)}`
);

sendResult = await SMTPService.sendEmail({
  // ... other fields
  html: `<p>${trackedBody.replace(/\n/g, '<br>')}</p>`,
  text: trackedBody,
});
```

**File**: `app/api/track/click/[trackingId]/route.js`
Ensure it records event and redirects:
```javascript
// Record click event
message.events.push({
  type: 'clicked',
  timestamp: new Date(),
  data: { url: request.nextUrl.searchParams.get('url') }
});
await message.save();

// Redirect to actual URL
const targetUrl = request.nextUrl.searchParams.get('url');
return NextResponse.redirect(targetUrl);
```

### 4️⃣ MEDIUM: Remove Stale Lock Repair
**File**: `lib/outreachEngine.js` ~line 238
Currently allows 10-minute stale locks to be reset. Consider lowering to 5 minutes or removing entirely if start() initializes properly.

---

## 7. Testing Checklist

- [ ] Create new campaign with 5 prospects
- [ ] GET `/api/campaigns/{id}/v2-kick` → shows all prospects with `nextActionAt` set
- [ ] Run cron immediately → sees leads, sends first email
- [ ] No 18 errors on second run (all leads should be in proper state)
- [ ] Click a link in email → verify redirects and logs to Message.events
- [ ] Open email → verify tracking pixel fires
- [ ] Campaign test 1 recovers after fixes

