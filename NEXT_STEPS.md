# Next Steps - What To Do Now

## Summary
✅ **3 Critical Fixes Applied**:
1. V2 engine initialization (automatic on campaign start)
2. Click tracking now enabled
3. Scheduling fields consolidated

---

## Immediate Actions (Do These Now)

### Step 1: Verify Fixes Are Working

**Create a test campaign:**
```
1. Go to /campaigns/new
2. Add 3 test prospects
3. Make sure "useV2Engine" toggle is ON
4. Click Save then Start
```

**Check initialization:**
```
5. Open browser DevTools → Console
6. Run:
   fetch('/api/campaigns/{campaign_id}/v2-kick')
     .then(r => r.json())
     .then(d => console.log(d.prospects))

7. Look for:
   ✅ v2State: "new"
   ✅ nextActionAt: (future date, not null)
   ✅ attemptCount: 0
   ✅ stopFlag: false
```

If you see all ✅, the fix is working!

### Step 2: Trigger Email Send

**Run the outreach engine immediately:**
```
8. Go to /api/cron/outreach-engine (in browser or curl)
9. Should see logs like:
   "[v2Engine] Processing lead..."
   "Sent email to prospect@email.com"
10. Check your inbox — email should arrive
```

### Step 3: Test Click Tracking

**Verify click wrapping:**
```
11. Open email source (don't click yet)
12. Look for a link in the email body
13. Click it → should redirect to destination
14. Check browser console — no errors
```

**Check tracking in database:**
```
15. Open MongoDB compass or shell
16. Look at messages collection
17. Find your sent message
18. Check content field for wrapped URLs:
    ✅ Contains "http://localhost:3000/api/track/click/"
    ✅ Contains "?url=" with encoded destination
```

### Step 4: Fix Campaign #1

**For the campaign that had 18 errors:**

**Fix A: Mailbox Port**
```
1. Go to /mailboxes
2. Select the mailbox used by Campaign #1
3. Edit SMTP settings
4. Change Port from 465 → 587
5. Save
```

**Fix B: Mailbox Status**
```
6. Make sure mailbox status is "Active"
7. If "Inactive" → click activate
```

**Fix C: Reset Campaign**
```
8. POST /api/campaigns/{campaign_id}/v2-kick
   (Use curl or Postman or browser fetch)
9. Response: should show "Reset N prospects"
10. Wait for next cron cycle (5-10 minutes)
11. Check campaign again → should see emails sending
```

---

## Verify All 3 Fixes

### ✅ Fix #1: V2 Initialization
**What to check:**
```
New campaign → Start → first cron run
Expected: No "corrupted state" errors
Actual: Check /api/campaigns/{id}/v2-kick → v2State is "new"
```

### ✅ Fix #2: Click Tracking
**What to check:**
```
Send email → click link → check tracking
Expected: Message.events contains "clicked" event
Check: 
  - Email body has wrapped URLs
  - Click records IP, user-agent
  - CampaignProspect.emailsClicked increments
```

### ✅ Fix #3: Scheduling Consolidated
**What to check:**
```
Campaign starts → check nextActionAt is set
Expected: nextActionAt populated (not null)
Check: /api/campaigns/{id}/v2-kick response shows all dates filled
```

---

## Troubleshooting If Something Is Wrong

### If v2State is Still Null
**Cause**: Campaign doesn't have useV2Engine enabled, OR sync didn't run
**Fix**:
```
1. Check Campaign.useV2Engine === true
2. Check Campaign.status === 'active'
3. Try POST /api/campaigns/{id}/start again
4. Check logs for errors
```

### If nextActionAt is Still Null
**Cause**: Campaign initialization failed
**Fix**:
```
1. Go to campaign settings
2. Check all required fields are filled (goal, mailboxes, prospects)
3. Try starting campaign again
4. If still null, POST /api/campaigns/{id}/v2-kick to force fix
```

### If Links Aren't Wrapped
**Cause**: Environment variable not set or caching issue
**Fix**:
```
1. Check .env.local has NEXT_PUBLIC_APP_URL set
2. Restart dev server: npm run dev
3. Send new test email
4. Check email body again
```

### If Click Tracking Doesn't Record
**Cause**: Tracking endpoint down or link syntax wrong
**Fix**:
```
1. Test endpoint directly:
   curl 'http://localhost:3000/api/track/click/test123?url=https://example.com'
2. Should redirect to example.com
3. Check /api/track/click route exists
4. Check logs for 404 errors
```

---

## Campaign Recovery Checklist

**For Campaign #1 (18 errors):**
- [ ] Mailbox SMTP port changed to 587
- [ ] Mailbox status is "Active"
- [ ] Campaign status is "Active"
- [ ] Campaign has useV2Engine = true
- [ ] POST /api/campaigns/{id}/v2-kick executed
- [ ] Waited for next cron cycle
- [ ] Checked that emails now send
- [ ] Clicked email link — tracked correctly
- [ ] No validation errors in logs

**For any new campaign:**
- [ ] Create with 3 test prospects
- [ ] Enable useV2Engine
- [ ] Click Start
- [ ] Check /api/campaigns/{id}/v2-kick → v2State: "new"
- [ ] Trigger cron
- [ ] Email received with tracked links
- [ ] Click a link → gets tracked

---

## When You Can Stop Using v2-kick

**You're good to stop using v2-kick POST when:**
1. ✅ All new campaigns initialize with v2State = "new"
2. ✅ No "corrupted state" errors on first cron run
3. ✅ Campaign #1 recovers without needing it

**Keep using v2-kick GET for:**
- Diagnosing why a campaign isn't sending
- Checking prospect states before manual intervention
- Debugging stuck leads

---

## What NOT To Do

❌ **Don't** use v2-kick as a band-aid for every problem  
❌ **Don't** change nextSendAt manually (let engine handle it)  
❌ **Don't** set v2State to anything other than engine values  
❌ **Don't** disable useV2Engine unless you want legacy behavior  
❌ **Don't** skip the mailbox configuration (port 587!)  

---

## Success Criteria

**You'll know everything is working when:**

```
✅ Create campaign → Start → First cron run
✅ 0 errors in logs
✅ All emails sent on first cycle
✅ Click links in emails → traced in Message.events
✅ Campaign dashboard shows clicks > 0
✅ No manual v2-kick needed
```

---

## Questions?

**Check these docs in order:**
1. `ANALYSIS_AND_FIXES.md` — Why these issues existed
2. `FIXES_APPLIED.md` — What exactly changed
3. `MIGRATION_GUIDE.md` — How to verify it works
4. `ISSUES_AND_SOLUTIONS.md` — Detailed troubleshooting

---

## Timeline

- **Today**: Apply these fixes (already done)
- **Today/Tomorrow**: Test with new campaign
- **This week**: Fix Campaign #1
- **This week**: Verify all tracking works
- **Next week**: Remove v2-kick from daily workflow

