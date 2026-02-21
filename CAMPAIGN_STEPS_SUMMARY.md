# Campaign Sending: Complete Steps Summary

## Your Question
> "For sending emails means a proper campaign, what are the list of steps I need to take?"

---

## Answer: 5 Main Stages, 20+ Steps Total

---

## STAGE 1: CAMPAIGN CREATION (2 minutes)

**Go to**: `/campaigns` → "New Campaign"

```
Fill in:
  ✓ Campaign Name (e.g., "Real Estate Outreach")
  ✓ Description (optional)
  ✓ Persona (who you're targeting)
  ✓ Goal (what you want them to do - be specific!)

Click: "Create Campaign"
```

---

## STAGE 2: V2ENGINE CONFIGURATION (5 minutes)

**Go to**: Campaign → "V2Engine" tab

### Part A: Enable & Timezone
```
✓ Toggle "Outreach Engine v2" → ON
✓ Select Timezone (e.g., India (IST), Eastern, etc.)
  - This affects ALL send times
  - Real-time display shows exact times below
✓ Set Business Hours:
  - Start Hour: 9 (9 AM)
  - End Hour: 17 (5 PM)
  - Emails only send within these hours
```

### Part B: Rate Limits
```
✓ Daily Send Limit: 20-30 (new domain) or 40 (established)
  - Max emails per day per mailbox
  - Don't exceed 80 (harms reputation)
✓ Hourly Send Limit: 10 (default - usually OK)
✓ Min Gap Minutes: 3 (default - usually OK)
```

### Part C: Delays & Escalation
```
✓ Base Delay Hours: 24 (minimum between emails)
✓ Escalation Multiplier: 1.5 (increases delays)
  - Email 1→2: 24h
  - Email 2→3: 36h
  - Email 3→4: 54h
  - Email 4→5: 81h
  - Email 5→6: 121h
✓ Max Attempts: 6 (how many before cooling)
✓ Cooling Period: 30 (days to wait after max)
```

### Part D: Email Angles (REQUIRED: 3+ minimum)
```
✓ Add Angle 1: "pain"
  Key: pain
  Description: Focus on specific pain points you solve

✓ Add Angle 2: "roi"
  Key: roi
  Description: Lead with cost savings and ROI numbers

✓ Add Angle 3: "social_proof"
  Key: social_proof
  Description: Reference customer stories and results

✓ (Optional) Add more angles for variety
  - curiosity: Open curiosity loops
  - direct: Professional direct approach
  - custom: Your own angles
```

### Part E: Knowledge Base (Optional but Recommended)
```
✓ Add product/service description:
  - What you do
  - Key benefits
  - Stats/results
  - Who it's for
  
Example:
"We provide AI-powered property valuations. 
Analyzed 500K+ properties with 95% accuracy. 
Typical ROI: 30% cost reduction vs. manual appraisals.
Used by 50+ real estate firms."
```

### Part F: Verify Real-Time Timing
```
Once timezone & hours set, you see:

Email Send Times in [TIMEZONE]:
  Email 1: [Date], [Time] (Immediate)
  Email 2: [Date], [Time] (+24h)
  Email 3: [Date], [Time] (+36h)
  Email 4: [Date], [Time] (+54h)
  Email 5: [Date], [Time] (+81h)
  Email 6: [Date], [Time] (+121h)

After 6 attempts: 30-day cooling period

✓ VERIFY: Times match YOUR timezone, not UTC
✓ VERIFY: No 2 AM or weekend sends
✓ VERIFY: Reasonable gaps between emails
```

---

## STAGE 3: OPTIONS CONFIGURATION (2 minutes)

**Go to**: Campaign → "Options" tab

### Part A: Mailbox Selection
```
✓ Mailbox: Select from dropdown
  - Must be status "Active"
  - This is the "from" email address
  - Must be verified with email provider
```

### Part B: Tracking Settings
```
✓ Track Opens: ON
  - Detects when email is opened (pixel)
✓ Track Clicks: ON
  - Detects when links are clicked (URL wrapper)
✓ Unsubscribe Link: ON
  - Adds unsubscribe option at bottom
```

### Part C: Follow-up Settings
```
✓ Follow-up Enabled: ON
  - Allows automatic follow-ups
✓ Stop on Reply: ON
  - Stops sending after they reply
✓ Stop on Open: OFF
  - Continue even if they open
```

### Part D: Notes (Optional)
```
✓ Add internal notes (not visible to recipients)
```

---

## STAGE 4: ADD PROSPECTS (5-10 minutes)

**Go to**: Campaign → "Leads" tab

### Option A: CSV Import (Recommended)
```
✓ Prepare CSV file:
  email,firstName,lastName,company,city
  john@example.com,John,Smith,Acme Corp,SF
  jane@example.com,Jane,Doe,Tech Inc,NY

✓ Click "Import CSV"
✓ Upload file
✓ Map columns to fields
✓ Click "Import"
✓ Verify: Status shows "pending"
```

### Option B: Manual Add
```
✓ Click "Add Lead"
✓ Enter:
  - Email address (required)
  - First Name (required for personalization)
  - Company (optional but recommended)
  - Other fields as available
✓ Click "Add"
✓ Repeat for each prospect
```

### Verification
```
✓ At least 1 prospect added (minimum)
✓ Email addresses valid
✓ First names populated (for AI personalization)
✓ All showing status "pending"
```

---

## STAGE 5: START CAMPAIGN (1 click!)

**Go to**: Campaign header → "Start" button

```
Click: Green "Start" button

What happens:
  ✓ Campaign status: draft → active
  ✓ Prospects status: pending → active
  ✓ v2State: null → new
  ✓ nextActionAt: calculated with timezone/hours
  
Wait 5-10 minutes:
  ✓ Cron runs (/api/cron/outreach-engine)
  ✓ First email batch sent
  ✓ Check your inbox for first email
```

---

## WHAT HAPPENS AFTER CLICKING START

### Immediately (0-1 min)
```
✓ Campaign status changes to "active"
✓ All prospects activated
✓ Timing calculated for each prospect
✓ System ready to send
```

### Next Cron Run (5-10 min)
```
✓ Email 1 sent to all prospects
✓ Personalized with each prospect's name/company
✓ Tracking enabled (opens & clicks)
```

### Following Days (Auto)
```
Day 1: Email 1 sent
Day 2: Email 2 sent (+24h)
Day 3: Email 3 sent (+36h)
Day 4-5: Email 4 sent (+54h)
Day 6-7: Email 5 sent (+81h)
Day 9-10: Email 6 sent (+121h)

(All automatically, no action needed)
```

### When Prospect Replies
```
15-30 minutes:
  ✓ Inbox Monitor detects reply
  ✓ Logs it in system
  
Next Cron Run:
  ✓ AI classifies reply intent
  ✓ Auto-response generated
  ✓ Auto-response sent automatically
  ✓ v2State updated (replied_positive, etc.)
  ✓ No more emails if positive
```

---

## COMPLETE STEP LIST

### Prerequisites (Before Creating Campaign)
1. [ ] Mailbox configured and "Active" status
2. [ ] SMTP credentials working
3. [ ] Domain has SPF/DKIM/DMARC records
4. [ ] Prospect list prepared (emails + names)

### Stage 1: Campaign Creation
5. [ ] Go to /campaigns
6. [ ] Click "New Campaign"
7. [ ] Fill in name, description, persona, goal
8. [ ] Click "Create Campaign"

### Stage 2: V2Engine Setup
9. [ ] Go to "V2Engine" tab
10. [ ] Toggle "V2 Engine" ON
11. [ ] Select timezone
12. [ ] Set business hours (9-17)
13. [ ] Verify real-time timing display
14. [ ] Set rate limits
15. [ ] Set delay/escalation settings
16. [ ] Add 3+ email angles
17. [ ] (Optional) Add knowledge base

### Stage 3: Options Setup
18. [ ] Go to "Options" tab
19. [ ] Select mailbox
20. [ ] Enable tracking (opens, clicks)
21. [ ] Enable follow-ups
22. [ ] Set Stop on Reply: ON

### Stage 4: Add Prospects
23. [ ] Go to "Leads" tab
24. [ ] Import CSV OR add manually
25. [ ] Verify at least 1 prospect
26. [ ] Verify status: "pending"

### Stage 5: Start Campaign
27. [ ] Click "Start" button
28. [ ] Wait 5-10 minutes
29. [ ] Check inbox for first email
30. [ ] Verify personalization worked
31. [ ] Monitor dashboard for activity

---

## QUICK TIME ESTIMATE

| Stage | Time |
|-------|------|
| Create campaign | 2 min |
| V2Engine config | 5 min |
| Options config | 2 min |
| Add 1-10 prospects | 2-5 min |
| Add 100+ prospects | 10-20 min |
| **TOTAL** | **15-30 min** |

After clicking Start: **Automatic!** No more action needed.

---

## CHECKLIST: READY TO LAUNCH?

Before clicking Start, verify:

```
Campaign Tab:
  ✓ Name filled
  ✓ Goal clear

V2Engine Tab:
  ✓ V2Engine toggle ON
  ✓ Timezone selected
  ✓ Business hours set
  ✓ 3+ angles added
  ✓ Real-time timing makes sense

Options Tab:
  ✓ Mailbox selected
  ✓ Tracking ON
  ✓ Follow-up enabled

Leads Tab:
  ✓ At least 1 prospect
  ✓ Status: pending
  ✓ No error messages

Ready:
  ✓ All above checked
  ✓ Mailbox is Active
  ✓ Timezone correct
  ✓ Times reasonable (not midnight/weekend)
  ✓ All looks good!
```

---

## SUCCESS INDICATORS

After clicking Start, you should see within 15 minutes:

✅ Campaign status: "active"  
✅ First email sent to first prospect  
✅ Email personalized with name  
✅ Tracking links working  
✅ Dashboard shows activity  

---

## COMMON MISTAKES TO AVOID

❌ Don't forget to add 3+ angles  
❌ Don't set rate limit too high (80+)  
❌ Don't select wrong timezone  
❌ Don't add prospects with invalid emails  
❌ Don't forget first names (needed for personalization)  
❌ Don't disable tracking  
❌ Don't leave business hours at defaults if you mean different hours  
❌ Don't start campaign without verifying real-time timing  

---

## YOU'RE READY! 🚀

5 stages, 30 steps, ~20 minutes setup.

Then it runs completely automatically:
- Sends emails on schedule
- Tracks opens & clicks
- Detects replies
- Classifies intent
- Sends auto-responses
- Manages state machine

**No more action needed from you. The system takes care of everything!**

For detailed explanations, see:
- `COMPLETE_CAMPAIGN_WORKFLOW.md` - Full step-by-step
- `QUICK_START_CHECKLIST.md` - Minimal checklist
- Campaign header "?" for context help

