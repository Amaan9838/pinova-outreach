# Custom Template Guide
## How to Use Custom Templates Per Prospect

---

## 🎯 HOW IT WORKS

**Two-Layer System:**
1. **Default Template** (Sequences tab) = Fallback for all prospects
2. **Custom Template** (CSV) = Override for specific prospects

**Logic:**
```
IF prospect has customTemplate in CSV:
    Use customTemplate
ELSE:
    Use default template from Sequences tab
```

---

## ✅ CORRECT WORKFLOW

### **Step 1: Create Campaign & Add Default Sequence**

1. Create campaign
2. Go to "Sequences" tab
3. Click "Add step" (if not already there)
4. Add DEFAULT template:
   - Subject: `Hello {{firstName}}`
   - Body: `Hi {{firstName}}, this is the default message.`
5. Click outside to auto-save

### **Step 2: Upload CSV with Custom Templates**

1. Go to "Leads" tab
2. Click "Import CSV"
3. Upload your CSV:
```csv
firstName,email,customSubject,customTemplate
Webitzee,webitzee@gmail.com,Quick question about {{company}},Hi {{firstName}}\n\nCustom message for Webitzee...
MT,mtwebsite1@gmail.com,Special offer for {{company}},Hi {{firstName}}\n\nCustom message for MT...
```
4. Map fields:
   - firstName → firstName
   - email → email
   - customSubject → customSubject
   - customTemplate → customTemplate
5. Click "Import"

### **Step 3: Start Campaign**

1. Go to "Options" tab
2. Select mailbox
3. Set limits
4. Click "Start" button (header)
5. **DO NOT click "Activate"**

---

## 📧 WHAT GETS SENT

**Prospect 1 (Webitzee):**
- Subject: "Quick question about Webitzee Inc"
- Body: "Hi Webitzee\n\nCustom message for Webitzee..."

**Prospect 2 (MT):**
- Subject: "Special offer for MT Digital"
- Body: "Hi MT\n\nCustom message for MT..."

**Prospect 3 (No custom template in CSV):**
- Subject: "Hello John"
- Body: "Hi John, this is the default message."

---

## ❌ COMMON MISTAKES

### **Mistake 1: No Default Template**
```
❌ Sequences tab is empty
❌ Upload CSV with custom templates
❌ Start campaign
Result: ERROR - No template found
```

**Fix:** Always add a default template first

### **Mistake 2: Wrong CSV Format**
```csv
❌ firstName,email,subject,template
Should be:
✅ firstName,email,customSubject,customTemplate
```

**Fix:** Use exact column names: `customSubject` and `customTemplate`

### **Mistake 3: Not Mapping Fields**
```
❌ Import CSV but don't map customSubject/customTemplate
Result: Custom templates not saved
```

**Fix:** During import, map ALL fields including custom ones

---

## 🧪 TEST IT

### **Test 1: Verify Custom Template Saved**

After importing CSV, check database:

1. Open MongoDB
2. Find collection: `campaignprospects`
3. Find your prospect
4. Check field: `personalizedData`
5. Should see:
```json
{
  "personalizedData": {
    "customSubject": "Quick question about {{company}}",
    "customTemplate": "Hi {{firstName}}\\n\\nCustom message..."
  }
}
```

### **Test 2: Verify Email Sent**

1. Start campaign
2. Wait 2 minutes
3. Check inbox
4. Verify subject matches customSubject
5. Verify body matches customTemplate

---

## 🔍 DEBUGGING

### **Problem: Custom template not working**

**Check 1: Is personalizedData saved?**
```javascript
// In browser console on campaign page
fetch('/api/campaigns/YOUR_CAMPAIGN_ID/prospects')
  .then(r => r.json())
  .then(d => console.log(d.prospects[0]))
```

Look for `personalizedData` field.

**Check 2: Is default template set?**
- Go to Sequences tab
- Click Step 1
- Should see subject and body filled

**Check 3: Check server logs**
- Look for: "Custom content check for..."
- Should show: `hasCustomTemplate: true`

---

## 💡 PRO TIPS

### **Tip 1: Use Variables in Custom Templates**
```csv
customTemplate
Hi {{firstName}}\n\nI noticed {{company}} is in {{city}}...
```

Variables work in BOTH default and custom templates.

### **Tip 2: Mix Default and Custom**
```csv
firstName,email,customSubject,customTemplate
John,john@example.com,Custom Subject,Custom body...
Jane,jane@example.com,,
```

- John gets custom template
- Jane gets default template

### **Tip 3: Test with Your Own Email First**
```csv
firstName,email,customSubject,customTemplate
Test,your@email.com,Test Subject,Test body
```

Send to yourself first to verify it works.

---

## 📋 CHECKLIST

Before starting campaign with custom templates:

- [ ] Default template added in Sequences tab
- [ ] CSV has customSubject and customTemplate columns
- [ ] CSV imported successfully
- [ ] Fields mapped correctly during import
- [ ] Checked database - personalizedData exists
- [ ] Mailbox configured
- [ ] Click "Start" ONCE (not "Activate")

---

## 🚀 QUICK START

**Fastest way to test:**

1. Create campaign
2. Add sequence: Subject "Default", Body "Default message"
3. Create CSV:
```csv
firstName,email,customSubject,customTemplate
Test,your@email.com,Custom Test,Hi Test - This is custom
```
4. Import CSV, map all fields
5. Configure mailbox
6. Click "Start"
7. Check your email in 2 minutes

**Expected:** Email with subject "Custom Test" and body "Hi Test - This is custom"

---

## 🔧 TROUBLESHOOTING

### **Still sending default template?**

1. Delete campaign
2. Create new campaign
3. Add default sequence FIRST
4. Then import CSV
5. Verify personalizedData in database
6. Start campaign

### **Getting "Hi [firstName]" literally?**

Variables not replaced = template has issue.

Check:
- Use `{{firstName}}` not `{firstName}`
- Use `{{company}}` not `{company}`
- Case-sensitive: `{{firstName}}` works, `{{firstname}}` might not

---

## ✅ FINAL ANSWER

**Your workflow was wrong because:**

1. ❌ You left sequence inputs empty
2. ❌ System needs a default template as fallback
3. ❌ Custom templates OVERRIDE default, not REPLACE it

**Correct workflow:**

1. ✅ Add default template in Sequences tab
2. ✅ Upload CSV with custom templates
3. ✅ System uses custom if exists, default if not
4. ✅ Start campaign

**That's it. Try again with default template first.** 🚀
