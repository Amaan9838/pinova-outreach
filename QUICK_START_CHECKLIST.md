# Quick Start Campaign Checklist

## The Simple Path to Sending Your First Campaign

---

## BEFORE YOU START (Setup Prerequisites)

### ✓ Mailbox Setup
- [ ] Go to `/mailboxes`
- [ ] Add mailbox (email account you'll send from)
- [ ] Enter SMTP credentials
- [ ] Set status to **Active**
- [ ] Verify it's working

### ✓ Prospects Preparation
- [ ] Prepare list of prospects with:
  - Email addresses
  - First names
  - Company names (optional but recommended)
- [ ] Format: CSV or manual entry

---

## STEP 1: Create Campaign (2 minutes)

**Go**: `/campaigns` → "New Campaign" button

**Fill in**:
- [ ] Campaign Name
- [ ] Description (optional)
- [ ] Persona (who you're targeting)
- [ ] Goal (what you want them to do)

**Click**: "Create Campaign"

---

## STEP 2: V2Engine Configuration (5 minutes)

**Click**: "V2Engine" tab

### ✓ Enable V2 Engine
- [ ] Toggle "Outreach Engine v2" → **ON**

### ✓ Timezone & Business Hours
- [ ] Timezone: Select your region (e.g., "India (IST)")
- [ ] Start Hour: 9 (default - 9 AM)
- [ ] End Hour: 17 (default - 5 PM)
- [ ] **Verify**: Real-time timing shows below
  - Email 1: Today/tomorrow at calculated time
  - Email 2: +24 hours
  - Email 3: +36 hours
  - etc.

### ✓ Rate Limits
- [ ] Daily Send Limit: 20-30 (for new domain)
- [ ] Hourly Limit: 10 (default OK)
- [ ] Min Gap: 3 (default OK)

### ✓ Delays & Escalation
- [ ] Base Delay: 24 (hours between emails)
- [ ] Escalation: 1.5 (increase multiplier)
- [ ] Max Attempts: 6 (how many emails)
- [ ] Cooling: 30 (days after max attempts)

### ✓ Email Angles (MUST HAVE 3 MINIMUM)
- [ ] Add Angle 1: "pain" - Focus on problems you solve
- [ ] Add Angle 2: "roi" - Lead with cost savings/ROI
- [ ] Add Angle 3: "social_proof" - Use success stories
- [ ] (Optional) Add more angles for variety

### ✓ Knowledge Base (Optional but Recommended)
- [ ] Add description of your product/service
- [ ] Include key benefits and stats
- [ ] This helps AI write better emails

---

## STEP 3: Options Configuration (2 minutes)

**Click**: "Options" tab

### ✓ Mailbox Selection
- [ ] Mailbox: Select from dropdown

### ✓ Tracking Settings
- [ ] Track Opens: **ON** ✓
- [ ] Track Clicks: **ON** ✓
- [ ] Unsubscribe Link: **ON** ✓

### ✓ Follow-up Settings
- [ ] Follow-up Enabled: **ON** ✓
- [ ] Stop on Reply: **ON** ✓
- [ ] Stop on Open: **OFF** (keep this off)

---

## STEP 4: Add Prospects (5-10 minutes)

**Click**: "Leads" tab

### ✓ Import Prospects
**Option A: CSV Import (Recommended)**
- [ ] Click "Import CSV"
- [ ] Upload file with: email, firstName, company
- [ ] Map columns
- [ ] Click "Import"

**Option B: Manual Add**
- [ ] Click "Add Lead"
- [ ] Enter email and first name
- [ ] Click "Add"

### ✓ Verify
- [ ] At least 1 prospect added
- [ ] Status shows "pending"
- [ ] No error messages

---

## STEP 5: Start Campaign (1 click!)

**Click**: Campaign header → "**Start**" button (green)

### ✓ Wait for Email
- [ ] Check your inbox (sent to first prospect)
- [ ] Look for email from your mailbox
- [ ] Should arrive within 5-10 minutes

### ✓ Verify It's Working
- [ ] Email subject uses angle messaging
- [ ] Email body personalized with name/company
- [ ] Links wrapped for tracking
- [ ] Unsubscribe link at bottom

---

## STEP 6: Monitor & Verify (Ongoing)

**Go**: Campaign page → Analytics tab

### ✓ Check Status
- [ ] Campaign shows "active"
- [ ] Prospects show "active" or "contacted"
- [ ] Email count increasing daily

### ✓ Track Performance
- [ ] Open rate tracking working
- [ ] Click tracking working
- [ ] Reply detection working

**Go**: Individual prospect detail to see:
- [ ] Email timeline
- [ ] Opens/clicks
- [ ] Reply status

---

## VERIFICATION CHECKLIST

### ✓ Email Sent Successfully
- [ ] [ ] First email arrived in recipient inbox
- [ ] [ ] Subject line personalized/compelling
- [ ] [ ] Body text has prospect's name
- [ ] [ ] Timestamp matches selected timezone

### ✓ Tracking Enabled
- [ ] [ ] Open pixel included (invisible)
- [ ] [ ] Links are wrapped for click tracking
- [ ] [ ] Unsubscribe link present

### ✓ Follow-ups Scheduled
- [ ] [ ] Email 2 scheduled for +24 hours
- [ ] [ ] Email 3 scheduled for +36 hours
- [ ] [ ] Timeline respects business hours
- [ ] [ ] No weekend sends

### ✓ AI Working
- [ ] [ ] Each email uses different angle
- [ ] [ ] Personalization includes prospect data
- [ ] [ ] Grammar and tone professional
- [ ] [ ] Length appropriate (not too long)

---

## COMMON ISSUES & QUICK FIXES

| Issue | Fix |
|-------|-----|
| "Can't enable V2Engine" | Add 3+ angles first |
| "Start button grayed out" | Fill in all required fields |
| "Email not sending" | Check mailbox is Active, timezone correct |
| "Wrong send time" | Verify timezone selection, check real-time display |
| "No personalization" | Verify prospect firstName is populated |
| "Email sent at 2 AM" | Adjust business hours, check timezone |

---

## REAL-TIME TIMING REFERENCE

### What You Should See

After selecting timezone in V2Engine tab:

```
Email Send Times in [YOUR TIMEZONE]:

Email 1: [Today/Tomorrow], [Time] (Immediate)
Email 2: [Tomorrow/Next Day], [Time] (+24h)
Email 3: [+2 Days], [Time] (+36h)
Email 4: [+4 Days], [Time] (+54h)
Email 5: [+6 Days], [Time] (+81h)
Email 6: [+9 Days], [Time] (+121h)
```

**Example - India (IST)**:
```
Email 1: 2/21, 2:00 PM (Immediate)
Email 2: 2/22, 2:00 PM (+24h)
Email 3: 2/23, 2:00 PM (+36h)
Email 4: 2/25, 8:00 PM (+54h)
Email 5: 2/28, 5:00 AM (+81h)
Email 6: 3/5, 2:00 PM (+121h)
```

---

## MINIMAL VIABLE CAMPAIGN

**Absolute minimum to send emails:**

✓ Step 1: Create campaign (name + goal)  
✓ Step 2: Enable V2, add 3 angles, select timezone  
✓ Step 3: Select mailbox  
✓ Step 4: Add 1 prospect  
✓ Step 5: Click Start  

**That's it!** 5 steps, ~10 minutes, emails sending.

---

## RECOMMENDED SETUP

**For better results, also include:**

✓ Add 5-20 prospects (not just 1)  
✓ Write clear campaign goal  
✓ Add knowledge base description  
✓ Add 5+ angles (not just 3)  
✓ Set realistic rate limits  
✓ Review real-time timing before starting  

**Time: ~20 minutes, much better results.**

---

## POST-LAUNCH MONITORING

### First 24 Hours
- [ ] Check first email received
- [ ] Verify personalization
- [ ] Ensure no mailbox errors

### Days 2-6
- [ ] Monitor open rates
- [ ] Check click-through rates
- [ ] Watch for replies

### Day 7+
- [ ] Analyze engagement metrics
- [ ] Adjust rate limits if needed
- [ ] Plan follow-up campaigns

---

## Success Timeline

```
T+0:    You click "Start"
        ↓
T+5min: Campaign status: active
        ↓
T+5-10min: First email batch sent
        ↓
T+24h:  Second email batch
        ↓
T+36h:  Third email batch
        ↓
T+24-48h (after first email):
        - Opens detected
        - Clicks tracked
        - Replies received
        - Auto-responses sent
```

---

## You're Ready! 🚀

Once you complete this checklist, your campaign is live and:
- ✅ Sending emails on schedule
- ✅ Tracking opens & clicks
- ✅ Detecting replies
- ✅ Sending follow-ups automatically
- ✅ Running 24/7 without your intervention

**Questions?** Refer to COMPLETE_CAMPAIGN_WORKFLOW.md for detailed explanations.

