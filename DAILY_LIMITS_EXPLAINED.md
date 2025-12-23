# Daily Email Limits - How They Work

## Priority Order (Highest to Lowest)

### 1. **Mailbox Daily Cap** (HIGHEST PRIORITY) ✅
- **Location**: Mailboxes page
- **Field**: `dailyCap`
- **Used by**: `sequencer.js` - actual sending logic
- **Example**: Set to 50 emails/day per mailbox
- **This is the REAL limit that controls sending**

### 2. Campaign Daily Send Limit (Optional)
- **Location**: Schedule tab → Advanced Settings
- **Field**: `dailySendCap`
- **Purpose**: Additional campaign-level limit
- **Note**: Mailbox limits still apply first

### 3. ~~Options Tab Daily Limit~~ (REMOVED)
- Was just UI, didn't actually work
- Removed to avoid confusion

---

## How It Actually Works

```javascript
// In sequencer.js
if (mailbox.status === 'active' && mailbox.dailySent < mailbox.dailyCap) {
  // Send email
}
```

**The code checks `mailbox.dailyCap` - that's the only limit that matters!**

---

## Setup Guide

### For New Campaigns:

1. **Go to Mailboxes page** → Set `Daily Cap` (e.g., 50)
2. **Go to Schedule tab** → Optionally set campaign limit
3. **Mailbox limit always wins**

### Example Scenario:

```
Mailbox A: dailyCap = 50
Mailbox B: dailyCap = 100
Campaign: dailySendCap = 200

Result:
- Mailbox A sends max 50/day
- Mailbox B sends max 100/day
- Campaign total: 150/day (50+100)
- Campaign limit of 200 doesn't matter because mailboxes limit it to 150
```

---

## Best Practice

**Set limits at the Mailbox level** - this gives you:
- ✅ Per-mailbox control
- ✅ Protects mailbox reputation
- ✅ Works across all campaigns
- ✅ Actually enforced by the code

Campaign-level limit is optional and only useful if you want to limit a specific campaign below the mailbox capacity.
