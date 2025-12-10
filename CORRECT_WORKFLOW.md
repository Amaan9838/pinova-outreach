# Correct Workflow to Start a Campaign
## Step-by-Step Guide

---

## ❌ WHAT YOU DID WRONG

You clicked BOTH buttons:
1. **"Activate" button** (in Schedule tab) → Activated prospects
2. **"Start" button** (in header) → Activated prospects AGAIN

**Result:** Prospects got activated twice = duplicate emails

---

## ✅ CORRECT WORKFLOW

### **Option A: Manual Start (Immediate)**

**Step 1: Create Campaign**
- Add campaign name
- Click "Save as Draft"

**Step 2: Upload CSV**
- Go to "Leads" tab
- Click "Import CSV"
- Upload your `sample-custom-emails.csv`
- Map fields (make sure customSubject and customTemplate are mapped)
- Click "Import"

**Step 3: Add Sequence**
- Go to "Sequences" tab
- Add email steps (subject + template)
- Click "Save"

**Step 4: Configure Options**
- Go to "Options" tab
- Select active mailbox
- Set email limit
- Set timezone
- Click "Save"

**Step 5: Start Campaign**
- Click "Start" button in header
- **DO NOT click "Activate" button**
- Done! Emails will send immediately

---

### **Option B: Scheduled Start (Future Time)**

**Step 1-4:** Same as above

**Step 5: Schedule Campaign**
- Go to "Schedule" tab
- Set start date/time
- Click "Save Schedule"

**Step 6: Start Campaign**
- Click "Start" button in header
- **DO NOT click "Activate" button**
- Done! Emails will send at scheduled time

---

## 🔴 IMPORTANT RULES

### **NEVER Do This:**
❌ Click "Activate" AND "Start"
❌ Click "Activate" multiple times
❌ Start campaign without sequence
❌ Start campaign without mailbox

### **ALWAYS Do This:**
✅ Upload CSV first
✅ Add sequence
✅ Configure mailbox
✅ Click "Start" ONCE
✅ Wait for emails to send

---

## 🐛 WHY YOU GOT DUPLICATES

### **What Happened:**

1. You uploaded CSV → Prospects created with status "pending"
2. You clicked "Activate" → Changed status to "active", set nextSendAt = NOW
3. You clicked "Start" → Campaign status changed to "active", which triggered ANOTHER activation
4. Cron job ran → Found prospects with nextSendAt in past
5. Sent emails
6. But prospects were still marked as "ready to send" due to double activation
7. Cron ran again → Sent duplicates

### **The Fix:**

I just fixed the code so:
- "Activate" button only activates prospects that are still "pending"
- If already "active", it skips them
- No more duplicates

---

## 🧪 HOW TO TEST

### **Test 1: Custom Templates**

1. Create new campaign
2. Upload this CSV:
```csv
firstName,email,customSubject,customTemplate
Test,your@email.com,Custom Subject Test,Hi {{firstName}} - This is a custom template
```
3. Add default sequence (any subject/template)
4. Configure mailbox
5. Click "Start"
6. Check your email
7. **Expected:** Should receive email with "Custom Subject Test" and custom body

### **Test 2: No Duplicates**

1. Create new campaign
2. Add 1 prospect (your email)
3. Add sequence
4. Configure mailbox
5. Click "Start" ONCE
6. Wait 10 minutes
7. Check inbox
8. **Expected:** Should receive ONLY 1 email

---

## 📋 QUICK CHECKLIST

Before starting any campaign:

- [ ] CSV uploaded with prospects
- [ ] Custom fields mapped (if using custom emails)
- [ ] Sequence added (at least 1 step)
- [ ] Mailbox selected and active
- [ ] Email limit set
- [ ] Timezone configured
- [ ] Click "Start" button ONCE
- [ ] DO NOT click "Activate" button

---

## 🚀 RECOMMENDED WORKFLOW (Safest)

### **For Your First Campaign:**

**Day 1: Setup**
1. Create campaign
2. Upload CSV with 2 prospects (both your emails)
3. Add simple sequence:
   - Subject: "Test - {{firstName}}"
   - Body: "Hi {{firstName}}, this is a test from {{company}}"
4. Configure mailbox
5. Click "Start"
6. Wait 10 minutes
7. Check both emails received

**Day 2: Real Campaign**
1. If test worked, create new campaign
2. Upload real prospects CSV
3. Add real sequence
4. Click "Start"
5. Monitor for first hour
6. If all good, let it run

---

## 🔧 TROUBLESHOOTING

### **Problem: Emails not sending**

**Check:**
- Is campaign status "active"?
- Are prospects status "active"?
- Is nextSendAt in the past?
- Is mailbox active?
- Is daily limit reached?

**Solution:**
- Go to campaign details
- Check "Leads" tab
- Look at prospect status
- If "pending", something went wrong

### **Problem: Still getting duplicates**

**Check:**
- Did you click "Activate" AND "Start"?
- Are there multiple CampaignProspect entries for same prospect?

**Solution:**
- Delete campaign
- Start fresh
- Follow correct workflow above

### **Problem: Custom templates not working**

**Check:**
- Did CSV have customSubject and customTemplate columns?
- Were they mapped during import?
- Are they saved in CampaignProspect.personalizedData?

**Solution:**
- Re-import CSV
- Make sure to map custom fields
- Check database: campaignprospects collection
- Look for personalizedData field

---

## 💡 PRO TIPS

### **1. Always Test First**
- Use your own email
- Send 1-2 test emails
- Verify everything works
- Then scale up

### **2. Start Small**
- First campaign: 10 prospects
- Second campaign: 50 prospects
- Third campaign: 100+ prospects

### **3. Monitor Closely**
- Check inbox after 10 minutes
- Check after 1 hour
- Check after 1 day
- Look for any issues

### **4. Use Custom Templates Wisely**
- Only for VIP prospects
- Highly personalized
- Worth the extra effort

### **5. Don't Rush**
- Take time to set up correctly
- Double-check everything
- Better slow and right than fast and wrong

---

## ✅ FINAL CHECKLIST

Before clicking "Start":

- [ ] I uploaded the CSV
- [ ] I added the sequence
- [ ] I configured the mailbox
- [ ] I set the timezone
- [ ] I will click "Start" ONCE
- [ ] I will NOT click "Activate"
- [ ] I will monitor the first emails

**If all checked, you're ready to go!** 🚀
