import dbConnect from '../../../../../../lib/mongodb.js';
import Campaign from '../../../../../../models/Campaign.js';
import CampaignProspect from '../../../../../../models/CampaignProspect.js';
import Prospect from '../../../../../../models/Prospect.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_STEPS = 7;

/**
 * Fully robust CSV parser. Handles quoted fields containing newlines and commas.
 * Returns an array of rows (each row is an array of strings).
 */
function parseCSV(csv) {
  const rows = [];
  let currentField = '';
  let currentRow = [];
  let inQuotes = false;
  
  for (let i = 0; i < csv.length; i++) {
    const char = csv[i];
    const nextChar = csv[i + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      currentField += '"';
      i++; // Skip the double quote escape
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentField.trim());
      currentField = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++; // skip \n
      }
      currentRow.push(currentField.trim());
      rows.push(currentRow);
      currentRow = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }
  
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    rows.push(currentRow);
  }

  // Filter out any rows that are completely empty
  return rows.filter(row => row.some(col => col.trim() !== ''));
}

/**
 * POST /api/campaigns/[id]/prospects/import
 *
 * Body: { csvData: string }
 *
 * Returns:
 *   { success, imported, total, errors[], prospects[] }
 *   prospects[] contains per-lead preview including emailSteps
 *
 * CSV Column Reference:
 *   Required: firstname, lastname, email
 *   Optional: company, phone, website, industry, position, notes
 *   Per-step:  step1_subject, step1_body, step2_subject, step2_body … step7_subject, step7_body
 *   Legacy:    customsubject, custombody (alias for step1_subject / step1_body)
 */
export async function POST(request, { params }) {
  try {
    await dbConnect();

    const { id } = params;
    const { csvData } = await request.json();

    const campaign = await Campaign.findById(id);
    if (!campaign) {
      return Response.json({ success: false, error: 'Campaign not found' }, { status: 404 });
    }

    if (!csvData || !csvData.trim()) {
      return Response.json({ success: false, error: 'CSV data is required' }, { status: 400 });
    }

    const parsedRows = parseCSV(csvData);
    if (parsedRows.length < 2) {
      return Response.json(
        { success: false, error: 'CSV must have a header row and at least one data row' },
        { status: 400 }
      );
    }

    const headers = parsedRows[0].map(h => h.toLowerCase().replace(/\s+/g, ''));
    const dataLines = parsedRows.slice(1);

    // ── Header-level validation ─────────────────────────────────────────────
    const requiredHeaders = ['firstname', 'lastname', 'email'];
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
    if (missingHeaders.length > 0) {
      return Response.json(
        { success: false, error: `Missing required columns: ${missingHeaders.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate step column pairs: if step{n}_body exists, step{n}_subject must too
    const headerErrors = [];
    for (let s = 1; s <= MAX_STEPS; s++) {
      const hasSubject = headers.includes(`step${s}_subject`);
      const hasBody    = headers.includes(`step${s}_body`);
      if (hasBody && !hasSubject) {
        headerErrors.push(`step${s}_body column found but step${s}_subject is missing`);
      }
      if (hasSubject && !hasBody) {
        headerErrors.push(`step${s}_subject column found but step${s}_body is missing`);
      }
    }
    if (headerErrors.length > 0) {
      return Response.json({ success: false, error: headerErrors.join('; ') }, { status: 400 });
    }

    // ── Row-level processing ────────────────────────────────────────────────
    const rowErrors = [];
    const importedProspects = [];  // for preview response
    let imported = 0;

    for (let i = 0; i < dataLines.length; i++) {
      const values = dataLines[i];
      if (!values || values.length === 0) continue;

      const rowNum = i + 2; // 1-based, accounting for header

      if (values.length !== headers.length) {
        rowErrors.push({ row: rowNum, reason: `Column count mismatch (expected ${headers.length}, got ${values.length})` });
        continue;
      }

      // Map headers → values
      const d = {};
      headers.forEach((h, idx) => { d[h] = (values[idx] || '').trim(); });

      // Per-row validation
      const rowIssues = [];
      if (!d.firstname) rowIssues.push('firstname is required');
      if (!d.lastname)  rowIssues.push('lastname is required');
      if (!d.email)     rowIssues.push('email is required');
      else if (!EMAIL_REGEX.test(d.email)) rowIssues.push('invalid email format');

      if (rowIssues.length > 0) {
        rowErrors.push({ row: rowNum, email: d.email || '', reason: rowIssues.join(', ') });
        continue;
      }

      // Build emailSteps array from step{n}_subject + step{n}_body columns
      const emailSteps = [];
      for (let s = 1; s <= MAX_STEPS; s++) {
        const subjectKey = `step${s}_subject`;
        const bodyKey    = `step${s}_body`;
        const subject    = d[subjectKey] || '';
        const body       = d[bodyKey]    || '';
        if (subject || body) {
          emailSteps.push({ step: s, subject, body });
        }
      }

      // Legacy fallback: customsubject/custombody → step 1 if emailSteps empty
      const customSubject = d.customsubject || null;
      const customBody    = d.custombody || d.customtemplate || null;
      if (emailSteps.length === 0 && (customSubject || customBody)) {
        emailSteps.push({ step: 1, subject: customSubject || '', body: customBody || '' });
      }

      try {
        // Upsert Prospect
        let prospect = await Prospect.findOne({ email: d.email });
        if (!prospect) {
          prospect = await new Prospect({
            firstName: d.firstname,
            lastName:  d.lastname,
            email:     d.email,
            company:   d.company   || '',
            phone:     d.phone     || '',
            website:   d.website   || '',
            industry:  d.industry  || '',
            position:  d.position  || '',
            notes:     d.notes     || '',
            status:    'active'
          }).save();
        }

        // Skip if already in campaign
        const exists = await CampaignProspect.findOne({ campaign: id, prospect: prospect._id });
        if (!exists) {
          await new CampaignProspect({
            campaign:      id,
            prospect:      prospect._id,
            status:        'pending',
            customSubject: emailSteps.length > 0 ? emailSteps[0].subject || null : customSubject,
            customBody:    emailSteps.length > 0 ? emailSteps[0].body    || null : customBody,
            emailSteps
          }).save();
          imported++;

          // Build preview entry
          importedProspects.push({
            email:      prospect.email,
            firstName:  prospect.firstName,
            lastName:   prospect.lastName,
            company:    prospect.company,
            emailSteps,
            stepCount:  emailSteps.length
          });
        } else {
          rowErrors.push({ row: rowNum, email: d.email, reason: 'Already in campaign — skipped' });
        }

      } catch (err) {
        rowErrors.push({ row: rowNum, email: d.email || '', reason: err.message });
      }
    }

    // Update campaign prospect count
    if (imported > 0) {
      await Campaign.updateOne({ _id: id }, { $inc: { prospectCount: imported } });
    }

    return Response.json({
      success: true,
      imported,
      total:     dataLines.length,
      errors:    rowErrors.length > 0 ? rowErrors : undefined,
      prospects: importedProspects,   // used by frontend for step preview
      message:   `Imported ${imported} leads${rowErrors.length > 0 ? ` (${rowErrors.length} skipped)` : ''}`
    });

  } catch (error) {
    console.error('Import prospects error:', error);
    return Response.json({ success: false, error: 'Failed to import prospects' }, { status: 500 });
  }
}
