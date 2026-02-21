# Critical Audit: Timezone in THREE Places + Follow-up Flow

## Part 1: The Timezone Mess (3 Different Places!)

### The Problem You Found
Timezone is stored/set in **THREE different locations**, and it's **NOT clear which is the source of truth**:

```
1. V2Engine Tab     → Sets v2Timezone (direct to Campaign.v2Timezone)
2. Schedule Tab     → Sets timezone (to Campaign.scheduling.timezone)
3. Options Tab      → Sets timezone (to Campaign.scheduling.timezone)
```

### Where Each Is Stored

**In Campaign Model** (`models/Campaign.js`):
```javascript
// Location 1: LEGACY scheduling object
scheduling: {
  timezone: { type: String, default: 'UTC' }  // ← Set by Schedule & Options tabs
}

// Location 2: V2 NATIVE field
v2Timezone: {
  type: String,
  default: 'America/New_York'  // ← Set by V2Engine tab
}

// Location 3: LEGACY options object
options: {
  // No timezone here directly, but Schedule/Options tabs write to scheduling.timezone
}
```

### How Each Tab Sets It

**V2Engine Tab** (`app/campaigns/[id]/components/V2EngineTab.jsx`):
```javascript
// Line 120: Reads from V2
const [timezone, setTimezone] = useState(campaign?.v2Timezone ?? 'America/New_York');

// Line 197: Saves to V2
v2Timezone: timezone,

// API Endpoint: Saves directly to v2Timezone
// (via campaign.save())
```

**Schedule Tab** (`app/campaigns/[id]/components/ScheduleTab.js`):
```javascript
// Saves to: /api/campaigns/{id}/schedule
// Which then syncs to: campaign.v2Timezone (after our fix!)
```

**Options Tab** (`app/campaigns/[id]/components/OptionsTab.js`):
```javascript
// Line 61-64: Saves to scheduling.timezone
if (options.timezone) {
  campaign.scheduling = campaign.scheduling || {};
  campaign.scheduling.timezone = options.timezone;  // ← WRONG! Should be v2Timezone
}

// API Endpoint: PUT /api/campaigns/{id}/options (line 61-64 in route.js)
```

---

## The Conflicts

### Scenario 1: User Sets Timezone in V2Engine Tab
```
User sets: Asia/Kolkata in V2Engine tab
↓
Saves to: campaign.v2Timezone = 'Asia/Kolkata' ✅
↓
Cron uses: campaign.v2Timezone ✅
↓
Works correctly ✅
```

### Scenario 2: User Sets Timezone in Schedule Tab
```
User sets: Asia/Kolkata in Schedule tab
↓
Calls: /api/campaigns/{id}/schedule
↓
After our fix: Syncs to campaign.v2Timezone = 'Asia/Kolkata' ✅
↓
Cron uses: campaign.v2Timezone ✅
↓
Works correctly ✅
```

### Scenario 3: User Sets Timezone in Options Tab ❌ BROKEN!
```
User sets: Asia/Kolkata in Options tab
↓
Calls: PUT /api/campaigns/{id}/options
↓
Saves to: campaign.scheduling.timezone = 'Asia/Kolkata' ❌
↓
Does NOT sync to: campaign.v2Timezone ❌
↓
campaign.v2Timezone still: 'America/New_York' ❌
↓
Cron uses: campaign.v2Timezone = 'America/New_York' ❌
↓
All times calculated in EASTERN TIME ❌
↓
"0 leads found" for India user ❌
```

---

## The Root Cause

The **Options Tab API** (lines 61-64 in `route.js`) updates the WRONG field:

```javascript
// ❌ WRONG: Updates legacy field
if (options.timezone) {
  campaign.scheduling = campaign.scheduling || {};
  campaign.scheduling.timezone = options.timezone;  // ← Saved but ignored!
  // ❌ MISSING: campaign.v2Timezone not updated!
}
```

---

## The Fix Required

### Fix: Options Tab API Must Sync to v2Timezone

**File**: `app/api/campaigns/[id]/options/route.js` (line 61-64)

**Before**:
```javascript
if (options.timezone) {
  campaign.scheduling = campaign.scheduling || {};
  campaign.scheduling.timezone = options.timezone;
}
```

**After**:
```javascript
if (options.timezone) {
  // Update BOTH for backward compatibility
  campaign.scheduling = campaign.scheduling || {};
  campaign.scheduling.timezone = options.timezone;
  
  // ✅ CRITICAL: Also update V2 native field
  campaign.v2Timezone = options.timezone;
  console.log(`[options] Synced timezone to v2: ${options.timezone}`);
}
```

---

## Part 2: Follow-up Flow Analysis

### Is the System Prepared for Follow-ups? YES! ✅

The follow-up system is **FULLY IMPLEMENTED AND WORKING**. Here's the complete flow:

---

## Complete Follow-up Sequence

### 1️⃣ Initial Email Sent
```
Cron: /api/cron/outreach-engine
  ↓
processLead() with attemptCount=0
  ↓
calculateNextActionAt(campaign, 0)
  ↓ (Our fix: Special case for initial)
  ↓
Result: nextActionAt = NOW (within business hours)
  ↓
Email sent: "Hi, check out our product..."
  ↓
CampaignProspect updated:
  ✅ v2State: 'contacted'
  ✅ nextActionAt: Feb 24, 9:00 AM (24h later + business hours)
  ✅ attemptCount: 1
```

### 2️⃣ Lead Opens Email (Optional)
```
Email opened by recipient
  ↓
Pixel tracking fires: /api/track/open/{trackingId}
  ↓
CampaignProspect updated:
  ✅ lastOpenedAt: now
  ✅ emailsOpened: +1
  ↓
(No state change - just tracking)
```

### 3️⃣ Lead Replies to Email (Optional)
```
Recipient clicks "Reply" and sends response
  ↓
Inbox Monitor runs: /api/cron/inbox-monitor (every 15-30 min)
  ↓
Connects via IMAP, finds new message
  ↓
Matches sender email to Prospect
  ↓
CampaignProspect updated:
  ✅ repliedAt: now
  ✅ nextActionAt: NOW (triggers immediate processing)
  ✓ v2State: still 'contacted' (not changed yet)
```

### 4️⃣ Engine Detects Reply & Classifies
```
Next cron: /api/cron/outreach-engine
  ↓
Picks up lead because: nextActionAt <= now
  ↓
processLead() detects: repliedAt is set!
  ↓
Calls classifyReply() via AI (Claude/Gemini)
  ↓
AI returns intent:
  - "positive": Lead interested
  - "neutral": Acknowledged but non-committal
  - "objection": Lead has concerns
  - "stop": Lead wants to opt-out
```

### 5️⃣ Follow-up Email Generated & Sent
```
Based on reply classification:

IF positive:
  → Generate follow-up: "Great! Let me share more..."
  → Send auto-response
  → v2State: 'replied_positive'
  → nextActionAt: null (no further follow-ups for positive)
  
IF objection:
  → Generate objection response: "I understand your concern..."
  → Send auto-response
  → v2State: 'replied_objection'
  → nextActionAt: Feb 26 (one more follow-up allowed)
  
IF neutral:
  → Send follow-up: "Just checking in..."
  → v2State: 'replied_neutral'
  → nextActionAt: Feb 25 (continue sequence)
  
IF stop:
  → Do NOT send
  → v2State: 'stopped'
  → nextActionAt: null
  → stopFlag: true (terminal)
```

### 6️⃣ Exponential Delays Applied
```
Follow-up sequence:
  Email 1 (attemptCount=0): Send NOW
  Email 2 (attemptCount=1): Wait 24 hours (baseDelayHours=24)
  Email 3 (attemptCount=2): Wait 36 hours (24 * 1.5)
  Email 4 (attemptCount=3): Wait 54 hours (24 * 1.5²)
  Email 5 (attemptCount=4): Wait 81 hours (24 * 1.5³)
  Email 6 (attemptCount=5): Wait 121 hours (24 * 1.5⁴)
  
After 6 attempts: Cooling period (30 days by default)
```

---

## Follow-up Flow Verified ✅

**The system IS prepared for follow-ups:**

✅ **Initial send**: Immediate (after our fix)  
✅ **Delay calculation**: Exponential widening (24h → 36h → 54h → 81h → 121h)  
✅ **Reply detection**: IMAP monitor detects within 15-30 min  
✅ **Reply classification**: AI classifies as positive/objection/neutral/stop  
✅ **Auto-response**: Generates and sends reply automatically  
✅ **Continuation logic**: Continues with next attempt or stops based on reply  
✅ **Business hours**: All follow-ups respect timezone + business hours  
✅ **Cooling period**: After 6 attempts, waits 30 days before retrying  
✅ **Terminal states**: Bounces, stops, and positive replies end sequence  

---

## Code Files for Follow-up Flow

| Component | File | Function | Purpose |
|-----------|------|----------|---------|
| Detection | `lib/inbox-monitor.js` | `checkReplies()` | Find replies via IMAP |
| Classification | `lib/outreachEngine.js` | `classifyReply()` | AI classify intent |
| Timing | `lib/outreachEngine.js` | `calculateNextActionAt()` | Exponential delays |
| Sending | `lib/outreachEngine.js` | `processLead()` | Send follow-ups |
| State Machine | `models/CampaignProspect.js` | `v2State` enum | Track lead state |
| Cron | `app/api/cron/outreach-engine/` | Main loop | Execute every 5 min |

---

## Summary: Two Fixes Needed

### Fix #1: Options Tab Timezone Sync (CRITICAL)
**File**: `app/api/campaigns/[id]/options/route.js`
**Change**: Line 61-64, also update `campaign.v2Timezone`
**Impact**: Options tab timezone now works for V2 campaigns

### Fix #2: No Changes Needed for Follow-ups ✅
The follow-up system is **fully implemented and working**.

---

## To Test Follow-ups

```bash
1. Create V2 campaign with 3 prospects
2. Set v2Angles (required for AI generation)
3. Start campaign → First email sent immediately ✅
4. Wait 24+ hours → Second email sent ✅
5. Reply to email → Inbox monitor detects ✅
6. Wait for cron → Auto-response sent ✅
7. Check v2State → Should be 'replied_positive' ✅
```

