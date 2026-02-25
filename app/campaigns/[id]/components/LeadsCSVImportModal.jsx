'use client';

import { useState, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Upload, FileText, AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, X, Download
} from 'lucide-react';

const MAX_STEPS = 7;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ─── CSV parser — handles quoted fields containing commas AND newlines ────────
function parseCSVToRows(csv) {
  const rows = [];
  let field = '', row = [], inQuotes = false;
  for (let i = 0; i < csv.length; i++) {
    const ch = csv[i], next = csv[i + 1];
    if (ch === '"' && inQuotes && next === '"') { field += '"'; i++; }
    else if (ch === '"') { inQuotes = !inQuotes; }
    else if (ch === ',' && !inQuotes) { row.push(field.trim()); field = ''; }
    else if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && next === '\n') i++;
      row.push(field.trim()); rows.push(row); row = []; field = '';
    } else { field += ch; }
  }
  if (field || row.length > 0) { row.push(field.trim()); rows.push(row); }
  return rows.filter(r => r.some(c => c.trim() !== ''));
}

function parseCSV(raw) {
  const allRows = parseCSVToRows(raw);
  if (allRows.length < 2) return { headers: [], rows: [], error: 'CSV must have a header + at least one row' };
  const headers = allRows[0].map(h => h.toLowerCase().replace(/\s+/g, ''));
  const rows = allRows.slice(1).map(vals => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = (vals[i] || '').trim(); });
    return obj;
  });
  return { headers, rows };
}

// ─── Validate CSV before hitting the API ────────────────────────────────────
function validateCSV(headers, rows) {
  const errs = [];

  // Required columns
  ['firstname', 'lastname', 'email'].forEach(h => {
    if (!headers.includes(h)) errs.push({ level: 'header', msg: `Missing required column: ${h}` });
  });

  // Step column pairs
  for (let s = 1; s <= MAX_STEPS; s++) {
    const hasSub = headers.includes(`step${s}_subject`);
    const hasBody = headers.includes(`step${s}_body`);
    if (hasSub && !hasBody) errs.push({ level: 'header', msg: `step${s}_subject present but step${s}_body is missing` });
    if (!hasSub && hasBody) errs.push({ level: 'header', msg: `step${s}_body present but step${s}_subject is missing` });
  }

  // Per-row validation
  rows.forEach((row, i) => {
    const rowNum = i + 2;
    if (!row.firstname) errs.push({ level: 'row', row: rowNum, msg: 'firstname is required' });
    if (!row.lastname)  errs.push({ level: 'row', row: rowNum, msg: 'lastname is required' });
    if (!row.email)     errs.push({ level: 'row', row: rowNum, msg: 'email is required' });
    else if (!EMAIL_RE.test(row.email)) errs.push({ level: 'row', row: rowNum, msg: `Invalid email: ${row.email}` });
  });

  return errs;
}

// ─── Build preview rows from parsed CSV ─────────────────────────────────────
function buildPreview(headers, rows) {
  return rows.map(row => {
    const steps = [];
    for (let s = 1; s <= MAX_STEPS; s++) {
      const sub = row[`step${s}_subject`] || '';
      const body = row[`step${s}_body`] || '';
      if (sub || body) steps.push({ step: s, subject: sub, body });
    }
    // Legacy fallback
    if (steps.length === 0 && (row.customsubject || row.custombody)) {
      steps.push({ step: 1, subject: row.customsubject || '', body: row.custombody || row.customtemplate || '' });
    }
    return {
      firstName: row.firstname || '',
      lastName:  row.lastname  || '',
      email:     row.email     || '',
      company:   row.company   || '',
      steps
    };
  });
}

// ─── Download sample CSV ────────────────────────────────────────────────────
function downloadSampleCSV() {
  const headers = ['firstname','lastname','email','company','phone',
    'step1_subject','step1_body','step2_subject','step2_body',
    'step3_subject','step3_body'];
  const row1 = ['Jane','Smith','jane@example.com','Acme Corp','',
    'Quick question about your property','Hi Jane, I wanted to reach out about your listing...',
    'Following up','Hey Jane, just checking in on my previous message...',
    'Last touch','Hi Jane, I understand timing may not be right...'];
  const content = [headers, row1].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
  const blob = new Blob([content], { type: 'text/csv' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = 'leads-sample.csv'; a.click();
}

// ─── LeadStepPreview (expandable row) ───────────────────────────────────────
function LeadStepRow({ lead, index }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="border border-gray-100 rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 text-left transition-colors"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400 w-5">{index + 1}</span>
          <span className="font-medium text-gray-900 text-sm">{lead.firstName} {lead.lastName}</span>
          <span className="text-gray-500 text-xs">{lead.email}</span>
          {lead.company && <span className="text-gray-400 text-xs">· {lead.company}</span>}
        </div>
        <div className="flex items-center gap-2">
          {lead.steps.length > 0
            ? <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-200 bg-emerald-50">{lead.steps.length} step{lead.steps.length !== 1 ? 's' : ''}</Badge>
            : <Badge variant="outline" className="text-xs text-gray-400">No custom steps</Badge>
          }
          {expanded ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
        </div>
      </button>
      {expanded && lead.steps.length > 0 && (
        <div className="divide-y divide-gray-100 bg-white">
          {lead.steps.map(s => (
            <div key={s.step} className="px-4 py-3 grid grid-cols-[5rem_1fr] gap-4">
              <div className="pt-1">
                <Badge variant="secondary" className="text-xs">Step {s.step}</Badge>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold text-gray-700">{s.subject || <span className="italic text-gray-400">No subject</span>}</p>
                <p className="text-xs text-gray-500 leading-relaxed line-clamp-3">{s.body || <span className="italic text-gray-300">No body</span>}</p>
              </div>
            </div>
          ))}
        </div>
      )}
      {expanded && lead.steps.length === 0 && (
        <div className="px-4 py-3 text-xs text-gray-400 italic bg-white">
          Will use campaign's sequence/angle content.
        </div>
      )}
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────
export default function LeadsCSVImportModal({ open, onOpenChange, campaignId, onImported }) {
  const [stage, setStage] = useState('upload');    // upload | validate | preview | done
  const [isDragging, setIsDragging] = useState(false);
  const [headers, setHeaders] = useState([]);
  const [rows, setRows] = useState([]);
  const [validationErrors, setValidationErrors] = useState([]);
  const [preview, setPreview] = useState([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const inputRef = useRef(null);

  const reset = () => {
    setStage('upload'); setHeaders([]); setRows([]); setValidationErrors([]);
    setPreview([]); setImporting(false); setResult(null);
  };

  const handleClose = (open) => { if (!open) reset(); onOpenChange(open); };

  const processFile = useCallback((file) => {
    if (!file || (!file.name.endsWith('.csv') && file.type !== 'text/csv')) {
      toast.error('Please select a .csv file'); return;
    }
    if (file.size > 10 * 1024 * 1024) { toast.error('File must be < 10 MB'); return; }

    const reader = new FileReader();
    reader.onload = (e) => {
      const { headers: h, rows: r, error } = parseCSV(e.target.result);
      if (error) { toast.error(error); return; }
      const errs = validateCSV(h, r);
      setHeaders(h); setRows(r); setValidationErrors(errs);
      setPreview(buildPreview(h, r));
      setStage(errs.some(e => e.level === 'header') ? 'validate' : 'preview');
    };
    reader.readAsText(file);
  }, []);

  const onDrop = useCallback((e) => {
    e.preventDefault(); setIsDragging(false);
    processFile(e.dataTransfer.files?.[0]);
  }, [processFile]);

  const handleImport = async () => {
    if (validationErrors.some(e => e.level === 'header')) {
      toast.error('Fix header errors before importing'); return;
    }
    setImporting(true);
    const csvLines = [headers.join(','), ...rows.map(r => headers.map(h => `"${(r[h]||'').replace(/"/g,'""')}"`).join(','))];
    const csvText = csvLines.join('\n');
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/prospects/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvData: csvText })
      });
      const data = await res.json();
      if (data.success) {
        setResult(data);
        setStage('done');
        onImported?.();
        toast.success(`Imported ${data.imported} lead${data.imported !== 1 ? 's' : ''}`);
      } else {
        toast.error(data.error || 'Import failed');
      }
    } catch (err) {
      toast.error('Import error: ' + err.message);
    } finally {
      setImporting(false);
    }
  };

  const headerErrors = validationErrors.filter(e => e.level === 'header');
  const rowErrors    = validationErrors.filter(e => e.level === 'row');

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col bg-white">
        <DialogHeader className="pb-4 border-b border-gray-100">
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
            <Upload className="h-5 w-5 text-blue-600" />
            Import Leads via CSV
            {stage !== 'upload' && (
              <Badge variant="outline" className="ml-auto capitalize text-xs">{stage}</Badge>
            )}
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-500">
            CSV supports up to 7 per-lead email steps (step1_subject, step1_body … step7_subject, step7_body)
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-4">

          {/* ── STAGE: upload ── */}
          {stage === 'upload' && (
            <div className="space-y-4">
              <div
                className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors cursor-pointer ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'}`}
                onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onDrop}
                onClick={() => inputRef.current?.click()}
              >
                <input ref={inputRef} type="file" accept=".csv" className="hidden" onChange={e => processFile(e.target.files?.[0])} />
                <FileText className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                <p className="font-medium text-gray-700">Drop CSV here or click to browse</p>
                <p className="text-sm text-gray-400 mt-1">Max 10 MB · Required columns: firstname, lastname, email</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-4 text-sm space-y-2">
                <p className="font-semibold text-blue-800">Column Reference</p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-blue-700 text-xs">
                  <span>✅ firstname (required)</span>
                  <span>⬜ company</span>
                  <span>✅ lastname (required)</span>
                  <span>⬜ phone</span>
                  <span>✅ email (required)</span>
                  <span>⬜ notes</span>
                  <span>⬜ step1_subject + step1_body</span>
                  <span>⬜ step2_subject + step2_body</span>
                  <span>⬜ step3_subject + step3_body … up to step7</span>
                  <span>⬜ customsubject / custombody (legacy)</span>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={downloadSampleCSV} className="gap-2">
                <Download className="h-4 w-4" /> Download Sample CSV
              </Button>
            </div>
          )}

          {/* ── STAGE: validate (header errors) ── */}
          {stage === 'validate' && (
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2 text-red-700 font-semibold">
                  <AlertTriangle className="h-4 w-4" /> Header Errors — fix your CSV before importing
                </div>
                <ul className="space-y-1 text-sm text-red-600 list-disc list-inside">
                  {headerErrors.map((e, i) => <li key={i}>{e.msg}</li>)}
                </ul>
              </div>
              {rowErrors.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-1">
                  <div className="flex items-center gap-2 text-yellow-700 font-semibold text-sm">
                    <AlertTriangle className="h-4 w-4" /> {rowErrors.length} row warning{rowErrors.length > 1 ? 's' : ''} (rows will be skipped)
                  </div>
                  <ul className="text-xs text-yellow-600 list-disc list-inside max-h-40 overflow-y-auto space-y-0.5">
                    {rowErrors.map((e, i) => <li key={i}>Row {e.row}: {e.msg}</li>)}
                  </ul>
                </div>
              )}
              <Button variant="outline" size="sm" onClick={reset} className="gap-2">
                <X className="h-4 w-4" /> Upload Different File
              </Button>
            </div>
          )}

          {/* ── STAGE: preview ── */}
          {stage === 'preview' && (
            <div className="space-y-4">
              {rowErrors.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-sm font-medium text-yellow-700 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    {rowErrors.length} row{rowErrors.length > 1 ? 's' : ''} will be skipped due to validation errors
                  </p>
                  <ul className="text-xs text-yellow-600 mt-1 list-disc list-inside max-h-28 overflow-y-auto space-y-0.5">
                    {rowErrors.map((e, i) => <li key={i}>Row {e.row}: {e.msg}</li>)}
                  </ul>
                </div>
              )}

              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-700">
                  {preview.length} lead{preview.length !== 1 ? 's' : ''} ready to import
                  {preview.filter(l => l.steps.length > 0).length > 0 &&
                    <span className="ml-2 text-emerald-600">· {preview.filter(l => l.steps.length > 0).length} with custom steps</span>
                  }
                </p>
                <Button variant="ghost" size="sm" onClick={reset} className="text-gray-500 text-xs gap-1">
                  <X className="h-3 w-3" /> Different file
                </Button>
              </div>

              <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
                {preview.map((lead, i) => (
                  <LeadStepRow key={i} lead={lead} index={i} />
                ))}
              </div>
            </div>
          )}

          {/* ── STAGE: done ── */}
          {stage === 'done' && result && (
            <div className="space-y-4 text-center py-6">
              <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
              <div>
                <p className="text-xl font-semibold text-gray-900">{result.imported} leads imported!</p>
                <p className="text-sm text-gray-500 mt-1">{result.message}</p>
              </div>
              {result.errors && result.errors.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-left">
                  <p className="text-sm font-medium text-yellow-700 mb-1">{result.errors.length} rows skipped</p>
                  <ul className="text-xs text-yellow-600 list-disc list-inside space-y-0.5 max-h-32 overflow-y-auto">
                    {result.errors.map((e, i) => <li key={i}>Row {e.row}: {e.reason}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-gray-100 pt-4 gap-2">
          {stage === 'done' ? (
            <Button onClick={() => handleClose(false)}>Close</Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => handleClose(false)}>Cancel</Button>
              {stage === 'preview' && (
                <Button
                  onClick={handleImport}
                  disabled={importing || preview.length === 0}
                  className="bg-blue-600 hover:bg-blue-700 gap-2"
                >
                  {importing
                    ? <><span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full inline-block" /> Importing…</>
                    : <><Upload className="h-4 w-4" /> Import {preview.length} Leads</>
                  }
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
