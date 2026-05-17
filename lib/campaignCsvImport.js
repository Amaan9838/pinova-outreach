import CampaignProspect from '../models/CampaignProspect.js';
import Prospect from '../models/Prospect.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_STEPS = 7;

export function parseCSV(csv) {
  const rows = [];
  let currentField = '';
  let currentRow = [];
  let inQuotes = false;

  for (let i = 0; i < csv.length; i += 1) {
    const char = csv[i];
    const nextChar = csv[i + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      currentField += '"';
      i += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentField.trim());
      currentField = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') i += 1;
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

  return rows.filter((row) => row.some((col) => col.trim() !== ''));
}

function normalizeHeader(header) {
  return String(header || '').toLowerCase().replace(/\s+/g, '').replace(/-/g, '_');
}

function pick(data, keys) {
  for (const key of keys) {
    if (data[key]) return data[key];
  }
  return '';
}

export function validateClaudeCsv(csvData) {
  if (!csvData || !csvData.trim()) {
    return { ok: false, error: 'CSV data is required' };
  }

  const parsedRows = parseCSV(csvData);
  if (parsedRows.length < 2) {
    return { ok: false, error: 'CSV must have a header row and at least one data row' };
  }

  const headers = parsedRows[0].map(normalizeHeader);
  const hasFirstName = headers.some((header) => ['firstname', 'first_name', 'first'].includes(header));
  const hasEmail = headers.includes('email');
  const missingHeaders = [];
  if (!hasFirstName) missingHeaders.push('firstname');
  if (!hasEmail) missingHeaders.push('email');
  if (missingHeaders.length > 0) {
    return { ok: false, error: `Missing required columns: ${missingHeaders.join(', ')}` };
  }

  const headerErrors = [];
  for (let step = 1; step <= MAX_STEPS; step += 1) {
    const hasSubject = headers.includes(`step${step}_subject`);
    const hasBody = headers.includes(`step${step}_body`);
    if (hasBody && !hasSubject) headerErrors.push(`step${step}_body column found but step${step}_subject is missing`);
    if (hasSubject && !hasBody) headerErrors.push(`step${step}_subject column found but step${step}_body is missing`);
  }

  if (headerErrors.length > 0) {
    return { ok: false, error: headerErrors.join('; ') };
  }

  return { ok: true, headers, dataLines: parsedRows.slice(1) };
}

export async function importClaudeCsvToCampaign({ campaignId, csvData, assignMailboxes = [] }) {
  const validation = validateClaudeCsv(csvData);
  if (!validation.ok) {
    return {
      imported: 0,
      total: 0,
      errors: [{ row: 1, reason: validation.error }],
      prospects: []
    };
  }

  const { headers, dataLines } = validation;
  const rowErrors = [];
  const importedProspects = [];
  let imported = 0;

  for (let i = 0; i < dataLines.length; i += 1) {
    const values = dataLines[i];
    const rowNum = i + 2;

    if (!values || values.length === 0) continue;
    if (values.length !== headers.length) {
      rowErrors.push({ row: rowNum, reason: `Column count mismatch (expected ${headers.length}, got ${values.length})` });
      continue;
    }

    const d = {};
    headers.forEach((header, index) => {
      d[header] = (values[index] || '').trim();
    });

    const firstName = pick(d, ['firstname', 'first_name', 'first']) || (d.email ? d.email.split('@')[0] : '');
    const lastName = pick(d, ['lastname', 'last_name', 'last']);
    const email = (d.email || '').toLowerCase();

    const rowIssues = [];
    if (!firstName) rowIssues.push('firstname is required');
    if (!email) rowIssues.push('email is required');
    else if (!EMAIL_REGEX.test(email)) rowIssues.push('invalid email format');

    if (rowIssues.length > 0) {
      rowErrors.push({ row: rowNum, email, reason: rowIssues.join(', ') });
      continue;
    }

    const emailSteps = [];
    for (let step = 1; step <= MAX_STEPS; step += 1) {
      const subject = d[`step${step}_subject`] || '';
      const body = d[`step${step}_body`] || '';
      if (subject || body) {
        emailSteps.push({ step, subject, body });
      }
    }

    const customSubject = d.customsubject || d.custom_subject || null;
    const customBody = d.custombody || d.custom_body || d.customtemplate || d.custom_template || null;
    if (emailSteps.length === 0 && (customSubject || customBody)) {
      emailSteps.push({ step: 1, subject: customSubject || '', body: customBody || '' });
    }

    try {
      const prospect = await Prospect.findOneAndUpdate(
        { email },
        {
          $set: {
            firstName,
            lastName,
            email,
            company: d.company || '',
            phone: d.phone || '',
            website: d.website || '',
            linkedin: d.linkedin || '',
            instagram: d.instagram || '',
            facebook: d.facebook || '',
            zillow: d.zillow || '',
            industry: d.industry || '',
            position: d.position || '',
            notes: d.notes || d.findings || d.research || '',
            status: 'active',
            source: 'campaign_import'
          }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      const exists = await CampaignProspect.findOne({ campaign: campaignId, prospect: prospect._id });
      if (exists) {
        rowErrors.push({ row: rowNum, email, reason: 'Already in campaign - skipped' });
        continue;
      }

      const assignedMailbox = assignMailboxes.length > 0
        ? assignMailboxes[imported % assignMailboxes.length]
        : null;

      await CampaignProspect.create({
        campaign: campaignId,
        prospect: prospect._id,
        status: 'pending',
        v2State: null,
        nextActionAt: null,
        assignedMailbox,
        customSubject: emailSteps.length > 0 ? emailSteps[0].subject || null : customSubject,
        customBody: emailSteps.length > 0 ? emailSteps[0].body || null : customBody,
        emailSteps
      });

      imported += 1;
      importedProspects.push({
        email: prospect.email,
        firstName: prospect.firstName,
        lastName: prospect.lastName,
        company: prospect.company,
        assignedMailbox,
        emailSteps,
        stepCount: emailSteps.length
      });
    } catch (error) {
      rowErrors.push({ row: rowNum, email, reason: error.message });
    }
  }

  return {
    imported,
    total: dataLines.length,
    errors: rowErrors,
    prospects: importedProspects
  };
}
