# Complete Legacy/V2 Conflict Audit & Fix Map

## The Pattern You Spotted: Legacy Code Everywhere

You're absolutely right. The codebase has **two competing systems running in parallel**, creating conflicts at every major function. Here's the complete map:

---

## Level 1: The Core Conflict (Highest Risk)

### 🔴 CULPRIT #1: CampaignProspect Schema (The Foundation)

**File**: `models/CampaignProspect.js`

**The Problem**:
```javascript
// LEGACY fields (old system)
status: { type: String, enum: ['pending', 'active', ...], default: 'pending' }
nextSendAt: { type: Date, index: true }
sequenceStep: { type: Number, default: 0 }
emailsSent: { type: Number, default: 0 }
emailsOpened: { type: Number, default: 0 }

// V2 fields (new system)
v2State: { type: String, enum: ['new', 'contacted', ...], default: null }
nextActionAt: { type: Date, index: true }
attemptCount: { type: Number, default: 0 }
failureCount: { type: Number, default: 0 }
```

**Why It's Broken**:
- Two parallel state machines running simultaneously
- `pre('save')` hook auto-syncs `status` ← `v2State` (but only ONE direction!)
- If you update `status` directly, `v2State` doesn't update
- Indexes on BOTH fields cause confusion about which cron to use
- Legacy code still writes to `nextSendAt`, V2 code uses `nextActionAt`

**The Dependencies It Creates**:
```
Every function that touches prospects must decide:
  → Use legacy status/nextSendAt? OR
  → Use V2 v2State/nextActionAt? OR
  → Try to use both? (WRONG!)
```

---

### 🔴 CULPRIT #2: CampaignProspectService.syncProspectsWithCampaignStatus()

**File**: `lib/services/CampaignProspectService.js` (lines 27-117)

**The Problem**:
```javascript
// This function doesn't know if it's dealing with V2 or legacy!
static async syncProspectsWithCampaignStatus(campaignId, campaignStatus, options = {}) {
  const prospects = await CampaignProspect.find({ campaign: campaignId });
  
  for (const prospect of prospects) {
    switch (campaignStatus) {
      case 'active':
        // ❌ PROBLEM: Sets legacy status + nextSendAt
        // ❌ PROBLEM: Expects V2 init but doesn't check campaign.useV2Engine
        // ❌ RESULT: V2 campaigns left with v2State: null!
        setFields.status = 'active';
        setFields.nextSendAt = new Date(Date.now() + staggerDelay);
        break;
    }
  }
}
```

**Why It's Broken**:
- Doesn't check `campaign.useV2Engine`
- Always sets legacy fields first
- V2 initialization is an afterthought (added by our fix)
- Called by 6 different API routes

**Dependency Chain**:
```
CampaignProspectService.syncProspectsWithCampaignStatus()
  ↓ called by ↓
1. /api/campaigns/[id]/start
2. /api/campaigns/[id]/schedule
3. /api/campaigns/[id]/pause
4. /api/campaigns/[id]/resume
5. /api/campaigns/[id]/activate
6. /api/campaigns/[id]/prospects/activate-pending
```

---

## Level 2: The API Routes (Medium Risk)

### 🟡 CULPRIT #3: /api/campaigns/[id]/start

**File**: `app/api/campaigns/[id]/start/route.js`

**The Problem**:
```javascript
// After our fix, now properly calls sync for 'active'
// BUT: This is the SIMPLE path

const syncResult = await CampaignProspectService.syncProspectsWithCampaignStatus(id, 'active');
```

**Why It Can Still Fail**:
- Doesn't set `campaign.v2Timezone` ← must be set BEFORE sync
- Doesn't set `campaign.v2BusinessHours` ← must be set BEFORE sync
- Campaign model still uses legacy `scheduling.timezone`
- Confusion between campaign-level and prospect-level timing

---

### 🟡 CULPRIT #4: /api/campaigns/[id]/schedule

**File**: `app/api/campaigns/[id]/schedule/route.js`

**The Problem** (WE PARTIALLY FIXED THIS):
```javascript
// ✅ After our fix: Now checks useV2Engine and syncs V2 fields
if (campaign.useV2Engine) {
  campaign.v2Timezone = timezone;      // ✅ NOW SYNCED
  campaign.v2BusinessHours = { ... };  // ✅ NOW SYNCED
}

// ⚠️ BUT: Still calls sync() which has its own logic
const syncResult = await syncProspectsWithCampaignStatus(id, campaign.useV2Engine ? 'active' : 'scheduled');
```

**Remaining Issue**:
- Calls sync() with TWO different paths (V2 vs legacy)
- Both paths in syncProspectsWithCampaignStatus() still exist
- Legacy path still writes `nextSendAt` even for V2 campaigns!

---

### 🟡 CULPRIT #5: /api/campaigns/[id]/prospects/activate-pending

**File**: `app/api/campaigns/[id]/prospects/activate-pending/route.js` (lines 45-72)

**The Problem**:
```javascript
// ❌ COMPLETELY IGNORES V2 ENGINE
// Sets legacy fields directly without checking useV2Engine
const result = await CampaignProspect.updateMany(
  { campaign: campaignId, status: 'pending' },
  {
    $set: {
      status: 'active',
      nextSendAt: new Date(Date.now() + delay),  // ← LEGACY ONLY!
      // ❌ MISSING: v2State, nextActionAt, attemptCount
    }
  }
);
```

**Why It's Critical**:
- **Direct database update** (bypasses service layer)
- Doesn't call `syncProspectsWithCampaignStatus()`
- V2 campaigns get activated as legacy → 0 leads on cron
- This is probably why you had 0 leads!

---

## Level 3: The Campaign Model (Medium Risk)

### 🟡 CULPRIT #6: Campaign Schema Has Duplicate Timing Fields

**File**: `models/Campaign.js` (lines 73-98, 222-246)

**The Problem**:
```javascript
// LEGACY timing
scheduling: {
  startDateTime: { type: Date },
  timezone: { type: String, default: 'UTC' },
  businessHours: { ... }
}

// V2 timing (completely separate!)
v2Timezone: { type: String, default: 'America/New_York' }
v2BusinessHours: { startHour: 9, endHour: 17 }
v2Delays: { baseDelayHours: 24, escalationMultiplier: 1.5 }
```

**Why It's Broken**:
- No synchronization between the two
- UI can set one, engine reads the other
- No clear "source of truth"
- Creates the "timezone mismatch" bugs

---

## Level 4: Data Access & UI (Low-Medium Risk)

### 🟡 CULPRIT #7: dataAccessLayer.js

**File**: `lib/dataAccessLayer.js` (line 50)

**The Problem**:
```javascript
// Returns mixed data to frontend
const prospects = await CampaignProspect.find(...)
  .select('status nextSendAt emailsSent emailsOpened ...');
  // ❌ Only legacy fields! V2 stats missing
```

**Result**: UI shows legacy stats, doesn't show V2 engine progress

---

### 🟡 CULPRIT #8: EnhancedLeadsTab Component

**File**: `app/campaigns/[id]/components/EnhancedLeadsTab.js` (lines 489-726)

**The Problem**:
```javascript
// ❌ Uses ONLY legacy fields for display
const readyCount = prospects.filter(p => p.nextSendAt && p.nextSendAt <= now).length;
const statusCount = prospects.filter(p => p.status === 'active').length;

// V2 stats never shown!
// Should show: v2State, attemptCount, etc.
```

---

## Level 5: The Cron Systems (High Risk - Multiple Competing Crons!)

### 🔴 CULPRIT #9: Two Competing Cron Systems

**Legacy Cron**:
- File: `lib/campaignScheduling.js`
- Queries: `nextSendAt <= now && status === 'active'`
- Updates: `status`, `nextSendAt`, `sequenceStep`

**V2 Cron**:
- File: `lib/outreachEngine.js`
- Queries: `nextActionAt <= now && v2State !== null`
- Updates: `v2State`, `nextActionAt`, `attemptCount`

**The Problem**:
- Both fire on same prospects!
- Can process same lead twice
- Can cause "already replied" errors
- Legacy cron ignores V2 fields completely

**Query in Legacy System** (`lib/campaignScheduling.js`):
```javascript
// ❌ This will match V2 prospects that also have status='active'!
CampaignProspect.find({
  status: 'active',
  nextSendAt: { $lte: new Date() }
})
```

**Query in V2 System** (`lib/outreachEngine.js`):
```javascript
// ✅ This only matches V2 (v2State not null)
CampaignProspect.find({
  v2State: { $nin: [null, 'bounced', 'failed', 'stopped'] },
  nextActionAt: { $lte: new Date() }
})
```

**But the Legacy cron is still running!**

---

## Complete Dependency Graph

```
Campaign Create/Start
  ↓
/api/campaigns/[id]/start (V2 aware ✅)
  ↓
CampaignProspectService.syncProspectsWithCampaignStatus('active')
  ↓ (SPLITS HERE!)
  ├─ IF V2: Sets v2State, nextActionAt ✅
  └─ IF Legacy: Sets status, nextSendAt ✓
  ↓
Prospect saved
  ↓ (pre-save hook)
  └─ Syncs status ← v2State (one-way only! ❌)
  ↓
Cron runs
  ├─ V2 Cron: outreachEngine.js (queries v2State) ✅
  └─ Legacy Cron: campaignScheduling.js (queries status) ❌ Still active!
  ↓
CONFLICT: Both might process same lead!
```

---

## The Complete Fix Required

### Phase 1: Eliminate Legacy Cron (CRITICAL)
- Disable `lib/campaignScheduling.js` completely
- Remove `/api/cron/process-scheduled` endpoint
- Verify all campaigns use V2 engine

### Phase 2: Consolidate Campaign Model
- Remove `scheduling` object from Campaign (keep it for display only)
- Make `v2Timezone`, `v2BusinessHours`, `v2Limits` the source of truth
- Sync UI reads from V2 fields

### Phase 3: Fix Service Layer
- Rewrite `syncProspectsWithCampaignStatus()` with explicit V2/Legacy branching
- Eliminate legacy path (after migration complete)
- Add assertions to prevent mixed-mode operations

### Phase 4: Fix All API Routes
- Audit every route that touches prospects
- Ensure V2 routes check `campaign.useV2Engine`
- Eliminate direct database updates (use service layer)

### Phase 5: Fix UI & Data Access Layer
- Update `dataAccessLayer.js` to return V2 fields
- Update `EnhancedLeadsTab` to show V2 stats
- Remove legacy field displays from V2 campaigns

---

## Full List of All Culprits

| Priority | Culprit | File | Issue |
|----------|---------|------|-------|
| 🔴 CRITICAL | Schema Design | `models/CampaignProspect.js` | Parallel state machines |
| 🔴 CRITICAL | Legacy Cron Still Active | `lib/campaignScheduling.js` | Competing with V2 cron |
| 🔴 CRITICAL | activate-pending Endpoint | `app/api/campaigns/[id]/prospects/activate-pending/route.js` | Bypasses V2 init entirely |
| 🟡 HIGH | syncProspectsWithCampaignStatus | `lib/services/CampaignProspectService.js` | Doesn't check useV2Engine |
| 🟡 HIGH | Campaign Model | `models/Campaign.js` | Duplicate timing fields |
| 🟡 MEDIUM | Schedule Endpoint | `app/api/campaigns/[id]/schedule/route.js` | Partially fixed, still legacy code |
| 🟡 MEDIUM | dataAccessLayer | `lib/dataAccessLayer.js` | Only returns legacy fields |
| 🟡 MEDIUM | EnhancedLeadsTab | `app/campaigns/[id]/components/EnhancedLeadsTab.js` | Shows legacy stats only |
| 🟢 LOW | repairCorruptedLeads | `lib/outreachEngine.js` | Awkward logic but works |

---

## Root Cause Summary

**Why This Mess Exists**:
1. **System evolved**: Started with legacy, added V2 without removing legacy
2. **Backward compatibility**: Kept old fields "just in case"
3. **Incomplete migration**: Some endpoints updated, others forgotten
4. **No clear migration plan**: When should teams use V2 vs legacy?

**How It Breaks Your Campaigns**:
```
✓ You click "Start"
  → Calls /api/campaigns/[id]/start (V2 aware!)
  → syncProspectsWithCampaignStatus('active')
  → Sets v2State='new', nextActionAt=calculated
  
BUT:
  ❌ If you used "Schedule Campaign" tab instead
  → Calls /api/campaigns/[id]/schedule (partially fixed)
  → Might call syncProspectsWithCampaignStatus('scheduled')
  → Old legacy path writes only nextSendAt!
  
OR:
  ❌ If using activate-pending endpoint
  → Direct database update
  → V2 fields NEVER initialized!
  → v2State stays null forever
  
RESULT:
  Cron runs, V2 engine finds 0 leads (v2State=null)
  Or legacy cron processes them instead
  Or both croons run, cause conflicts
```

---

## Next Steps

Shall I systematically fix each culprit in order of criticality?

1. **First**: Disable legacy cron (safest, least risky)
2. **Second**: Fix activate-pending endpoint
3. **Third**: Rewrite syncProspectsWithCampaignStatus
4. **Fourth**: Consolidate Campaign model timing
5. **Fifth**: Update UI to show V2 stats

Which would you like me to tackle first?

