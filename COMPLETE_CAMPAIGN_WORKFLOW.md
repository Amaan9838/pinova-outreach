# Complete Campaign Workflow: Step-by-Step Guide

## Overview

To send a proper outreach campaign, you need to go through **5 main stages** with multiple steps in each.

---

## Stage 1: Campaign Creation & Basic Setup

### Step 1.1: Create a New Campaign
**Location**: `/campaigns` → "New Campaign" button

**Fill in**:
- **Campaign Name**: e.g., "Real Estate Outreach Q1 2026"
- **Description** (optional): e.g., "Targeting property managers in California"
- **Persona**: e.g., "Property Manager", "Real Estate Investor", "Developer"
- **Goal**: Clear statement of what you want, e.g., "Schedule property consultation calls for commercial real estate listings in California. Include details about our valuation methodology and recent deals we've closed."

**After Filling**:
- Click "Create Campaign"
- You're taken to the campaign details page

---

## Stage 2: Configure V2 Engine Settings

### Step 2.1: Go to V2Engine Tab
**Location**: Campaign page → "V2Engine" tab

### Step 2.2: Enable V2 Engine
**Toggle**: "Outreach Engine v2" switch → Turn ON
- This enables all automated sending, scheduling, and reply classification
- **Note**: Can't toggle once campaign is active, so enable BEFORE starting

### Step 2.3: Set Timezone
**Dropdown**: "Lead Timezone"
- Select your timezone: e.g., "India (IST)", "Eastern (ET)", etc.
- **Important**: This affects all email send times
- The tab will **immediately show you real-time send times** for all 6 emails

**Example**:
```
Timezone: India (IST)
↓
Email Send Times in India (IST):
  Email 1: 2/21/2026, 2:00 PM (Immediate)
  Email 2: 2/22/2026, 2:00 PM (+24h)
  Email 3: 2/23/2026, 2:00 PM (+36h)
  ...
```

### Step 2.4: Set Business Hours
**Fields**: "Start Hour" and "End Hour"
- Start Hour: 9 (default, 9 AM)
- End Hour: 17 (default, 5 PM)
- Emails ONLY send within these hours
- **Example**: If you set 9-17, emails won't send at 8 PM or on weekends

### Step 2.5: Set Rate Limits
**Location**: "Deliverability Limits" section

**Fields**:
- **Daily Send Limit**: How many emails per day (default: 40)
  - Recommendation: Start with 20-30 for new domains
  - Don't exceed 80 (can hurt reputation)
- **Hourly Send Limit**: Max per hour (default: 10)
- **Min Gap Minutes**: Minimum between sends to same mailbox (default: 3)

### Step 2.6: Set Delay & Escalation
**Location**: "Email Delays & Escalation" section

**Fields**:
- **Base Delay Hours**: Initial gap between emails (default: 24)
  - Keeps 24h minimum between follow-ups
- **Escalation Multiplier**: How much to increase delays (default: 1.5)
  - Email 1 → 2: 24h
  - Email 2 → 3: 36h (24 × 1.5)
  - Email 3 → 4: 54h (24 × 1.5²)
- **Max Attempts Per Cycle**: How many emails before cooling (default: 6)
- **Cooling Period**: Days to wait after max attempts (default: 30)

### Step 2.7: Add Email Angles (CRITICAL)
**Location**: "Email Angles" section
**Minimum Required**: 3 angles

**What are angles?** Different messaging approaches the AI uses to personalize emails.

**Example Angles**:
1. **pain** - "Focus on the lead's specific pain points"
2. **roi** - "Lead with measurable ROI and cost savings"
3. **social_proof** - "Reference customer stories and results"
4. **direct** - "Professional direct ask with clear value"
5. **curiosity** - "Open curiosity loop without revealing all"

**How to add**:
- Click "+ Add Angle"
- Enter angle key: e.g., "pain" (lowercase, no spaces)
- Enter description: What this angle emphasizes
- Click preset buttons or add custom angles
- Minimum 3 required for campaign validation

### Step 2.8: Add Knowledge Base (Recommended)
**Location**: "Knowledge Base" section
**Type**: Free text

**What goes here?** Info about your product/service that helps AI write better emails:
```
Example:
"We provide AI-powered property valuation using computer vision. 
We've analyzed 500K+ properties and achieved 95% accuracy. 
Typical ROI: 30% cost reduction vs. manual appraisals."
```

---

## Stage 3: Configure Campaign Options

### Step 3.1: Go to Options Tab
**Location**: Campaign page → "Options" tab

### Step 3.2: Select Mailbox
**Field**: "Mailbox"
**Dropdown**: Select the email account to send from

**Prerequisites**:
- Must have at least 1 mailbox configured
- Go to `/mailboxes` to add if needed
- Mailbox must be status "Active"

**What's a mailbox?**
- Email account (Gmail, Outlook, custom domain)
- With SMTP credentials configured
- Must be verified with email provider

### Step 3.3: Configure Tracking Settings
**Toggles**:
- **Track Opens**: ON (default) - Detects when email is opened
- **Track Clicks**: ON (default) - Detects when links are clicked
- **Unsubscribe Link**: ON (default) - Adds unsubscribe link to emails

### Step 3.4: Add Notes (Optional)
**Field**: "Notes"
- Internal notes about this campaign
- Not visible to recipients

### Step 3.5: Configure Follow-up Settings
**Location**: "Follow-up Settings" section

**Toggles**:
- **Follow-up Enabled**: ON (recommended)
  - Allows automatic follow-ups based on replies
- **Stop on Reply**: ON (default)
  - Stops sending more emails once they reply
- **Stop on Open**: OFF (default)
  - Usually keep OFF (continue even if they open)

---

## Stage 4: Add Prospects

### Step 4.1: Go to Leads Tab
**Location**: Campaign page → "Leads" tab

### Step 4.2: Add Prospects Manually OR Import CSV
**Option A: Manual Entry**
- Click "Add Lead"
- Enter:
  - Email address (required)
  - First Name (required for personalization)
  - Company (optional but recommended)
  - Any other custom fields
- Click "Add"

**Option B: Import CSV**
- Click "Import CSV"
- Upload file with columns:
  ```
  email,firstName,lastName,company,city,neighborhood
  john@example.com,John,Smith,Acme Corp,San Francisco,Mission District
  jane@example.com,Jane,Doe,Tech Inc,New York,Manhattan
  ```
- Map columns to fields
- Click "Import"

### Step 4.3: Verify Prospects
- Check the prospect list
- Verify emails are correct
- Each prospect shows status: "pending"

**Minimum**: At least 1 prospect required to start

---

## Stage 5: Configure Email Content

### Option A: Upload Sequence with Custom Emails
**Location**: Leads tab → "Email Steps" section

**What this is**: Pre-written subject/body for each email attempt
- Overrides AI generation
- Useful if you have proven templates

**Format**:
```
step1_subject, step1_body
step2_subject, step2_body
...
```

**In CSV**:
```
email,firstName,step1_subject,step1_body,step2_subject,step2_body
john@example.com,John,Subject 1,Body 1,Subject 2,Body 2
```

### Option B: Use AI Generation (Recommended)
**No setup needed!** The system will:
1. Use your "knowledge base" description
2. Use your "goal" statement
3. Use selected "angles"
4. Generate personalized emails for each prospect
5. Automatically escalate the angle with each follow-up

---

## Stage 6: Schedule or Start Campaign

### Step 6.1: Choose Start Method

#### Method A: Start Immediately
**Location**: Campaign header → "Start" button
- Sends first email in next 5-10 minutes (next cron cycle)
- Best for: Testing, urgent campaigns

**What happens**:
```
Click Start
  ↓
Campaign status: active
  ↓
Prospects status: pending → active
  ↓
v2State: null → new
  ↓
nextActionAt: calculated with business hours
  ↓
Next cron run: Emails sent!
```

#### Method B: Schedule for Later
**Location**: Campaign page → "Schedule" tab
- Set date and time to start
- Prospects get activated at that time
- Emails send according to schedule

**Steps**:
1. Go to "Schedule" tab
2. Click on calendar → Select start date
3. Set start time (e.g., 2:00 PM)
4. Select timezone
5. Set business hours
6. Click "Schedule Campaign"

---

## Stage 7: Monitor Campaign

### Step 7.1: Go to Dashboard
**Location**: `/dashboard` or campaign → "Analytics" tab

**What you see**:
- **Total Prospects**: How many enrolled
- **By Status**: Pending, Active, Replied, Bounced, etc.
- **Open Rate**: % who opened emails
- **Click Rate**: % who clicked links
- **Reply Rate**: % who replied

### Step 7.2: Check Individual Lead Status
**Location**: Campaign → "Leads" tab → Click on prospect

**Shows**:
- Current state (new, contacted, replied_positive, etc.)
- When next email will send
- All emails sent so far
- All replies received
- Open/click history

### Step 7.3: View Email Threads
**Location**: Campaign → "Emails" tab

**Shows**:
- All emails sent
- Delivery status
- Open times
- Click events
- Reply threads

---

## Complete Checklist

### Before Starting: Pre-Flight

- [ ] Mailbox is configured and "Active"
- [ ] Mailbox domain has SPF, DKIM, DMARC records
- [ ] Campaign name and goal are clear
- [ ] Knowledge base describes your product
- [ ] At least 3 angles added
- [ ] At least 1 prospect added with valid email
- [ ] Timezone selected (matches where YOUR office is or where leads are)
- [ ] Business hours set (e.g., 9 AM - 5 PM)
- [ ] Rate limits are reasonable (daily: 20-40, not 100+)

### V2Engine Tab Checklist

- [ ] V2Engine toggle is ON
- [ ] Timezone selected (India/Eastern/etc.)
- [ ] Business hours set (start hour, end hour)
- [ ] Real-time timing display shows expected send times
- [ ] Base delay: 24h (minimum between emails)
- [ ] Escalation multiplier: 1.5 (increases delays)
- [ ] Max attempts: 6 (before cooling period)
- [ ] Cooling period: 30 days
- [ ] At least 3 angles added with descriptions

### Options Tab Checklist

- [ ] Mailbox selected
- [ ] Track Opens: ON
- [ ] Track Clicks: ON
- [ ] Unsubscribe Link: ON
- [ ] Follow-up Enabled: ON
- [ ] Stop on Reply: ON (or OFF if you want to continue)

### Leads Tab Checklist

- [ ] Prospects imported or added manually
- [ ] Email addresses are valid
- [ ] First names populated (for personalization)
- [ ] Status shows "pending" (not errors)

### Ready to Launch

- [ ] All checklists above: ✅
- [ ] You reviewed real-time timing (emails won't send at midnight)
- [ ] Click "Start" button in header

---

## What Happens After You Click Start

### Immediately (0-5 min)
```
Click Start
  ↓
Campaign.status: draft → active
  ↓
All prospects: status pending → active
  ↓
v2State: null → new
  ↓
nextActionAt: calculated (respects business hours + timezone)
```

### Next Cron Cycle (5-10 min)
```
Cron: /api/cron/outreach-engine runs
  ↓
Queries: nextActionAt <= now, v2State != null
  ↓
Finds your prospects
  ↓
Email 1 sent to each prospect
  ↓
Message created (with trackingId)
  ↓
nextActionAt: updated to +24h
```

### Daily (Continuing)
```
Day 1: Email 1 sent
Day 2: Email 2 sent (+24h)
Day 3: Email 3 sent (+36h)
Day 4-5: Email 4 sent (+54h)
Day 6-7: Email 5 sent (+81h)
Day 9-10: Email 6 sent (+121h)
```

### When Lead Replies
```
Prospect replies to email
  ↓ (15-30 min later)
Inbox Monitor detects reply
  ↓
repliedAt: updated
  ↓
nextActionAt: set to NOW
  ↓
Next cron run:
  - AI classifies reply intent (positive/objection/neutral/stop)
  - Auto-response generated
  - Reply sent automatically
  - v2State: replied_positive (or other)
  - No more emails if positive
```

---

## Troubleshooting

### "Campaign won't start"
**Check**:
1. [ ] V2Engine toggle is ON
2. [ ] At least 3 angles added
3. [ ] At least 1 mailbox selected
4. [ ] At least 1 prospect added
5. [ ] Mailbox status is "Active"

### "Emails not sending"
**Check**:
1. [ ] Campaign status is "active" (not paused/draft)
2. [ ] Prospects show "active" status (not "pending")
3. [ ] Current time is within business hours (9-17 in your timezone)
4. [ ] It's not a weekend (Saturday/Sunday)
5. [ ] Check `/api/campaigns/{id}/v2-kick` → should show prospects with nextActionAt <= now

### "No personalization in emails"
**Check**:
1. [ ] Prospects have firstName populated
2. [ ] Knowledge base filled with product info
3. [ ] Goal statement is clear
4. [ ] At least 3 angles with good descriptions
5. [ ] V2Engine toggle is ON

### "Email times wrong"
**Check**:
1. [ ] Correct timezone selected (check real-time timing display)
2. [ ] Business hours set correctly
3. [ ] Current time is within hours (or will roll to next day)
4. [ ] Not a weekend (or will roll to Monday)

---

## Quick Reference: Workflow Path

```
1. Create Campaign
   ↓
2. Enable V2Engine tab
   - Set timezone
   - Set business hours
   - Add 3+ angles
   - Set delays/limits
   ↓
3. Configure Options tab
   - Select mailbox
   - Enable tracking
   ↓
4. Add Prospects (Leads tab)
   - Import CSV or add manually
   ↓
5. Start Campaign
   - Click "Start" button
   ↓
6. Monitor
   - Watch emails send in real-time
   - Check analytics
   - Monitor replies
```

---

## Estimated Time

- **Setup**: 5-10 minutes
- **Add prospects**: Depends on count (1 min for 1, 10 min for 100)
- **Total before sending**: 15-30 minutes
- **After clicking Start**: Automatic!

---

## Success Indicators

✅ **First email sends** within 5-10 minutes of clicking Start  
✅ **Email times match** your timezone (check real-time display)  
✅ **Follow-ups arrive** on schedule (24h, 36h, etc. later)  
✅ **Replies detected** within 15-30 min  
✅ **Click tracking works** (links have tracking URLs)  
✅ **Opens tracked** (pixel fires)  

---

## Next: Advanced Features (Optional)

Once basic campaign is running, you can:
- [ ] Set up custom reply responses
- [ ] Add more angles for variety
- [ ] Adjust rate limits based on performance
- [ ] Create segments for different personalization
- [ ] Set up webhook notifications

