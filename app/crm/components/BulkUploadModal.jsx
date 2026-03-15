'use client';
import { useState, useRef } from 'react';

export default function BulkUploadModal({ onClose, currentUser, onSaved }) {
  const [rows, setRows] = useState([]);
  const [fileName, setFileName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef(null);

  const parseCSV = (text) => {
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/[^a-z0-9_]/g, ''));
    const headerMap = {};
    headers.forEach((h, i) => {
      if (['firstname', 'first_name', 'first'].includes(h)) headerMap.firstName = i;
      else if (['lastname', 'last_name', 'last'].includes(h)) headerMap.lastName = i;
      else if (['city', 'location'].includes(h)) headerMap.city = i;
      else if (['linkedinurl', 'linkedin_url', 'linkedin', 'url', 'profile_url', 'profileurl', 'linkedin_profile'].includes(h)) headerMap.linkedInUrl = i;
    });

    return lines.slice(1).map(line => {
      const cols = parseCSVLine(line);
      return {
        firstName: cols[headerMap.firstName] || '',
        lastName: cols[headerMap.lastName] || '',
        city: cols[headerMap.city] || '',
        linkedInUrl: cols[headerMap.linkedInUrl] || '',
      };
    }).filter(r => r.firstName || r.lastName);
  };

  const parseCSVLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQuotes = !inQuotes; continue; }
      if (ch === ',' && !inQuotes) { result.push(current.trim()); current = ''; continue; }
      current += ch;
    }
    result.push(current.trim());
    return result;
  };

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);
    setError('');
    const reader = new FileReader();
    reader.onload = (ev) => {
      const parsed = parseCSV(ev.target.result);
      if (parsed.length === 0) {
        setError('No valid rows found. Ensure CSV has headers: firstName, lastName, city, linkedInUrl');
        return;
      }
      setRows(parsed);
    };
    reader.readAsText(file);
  };

  const handleUpload = async () => {
    setUploading(true);
    try {
      const res = await fetch('/api/crm/linkedin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-crm-user': currentUser },
        body: JSON.stringify({ leads: rows }),
      });
      const json = await res.json();
      if (json.success) onSaved();
      else setError(json.error || 'Upload failed');
    } catch (err) {
      setError(err.message);
    }
    setUploading(false);
  };

  const fieldStyle = { fontSize: 13, color: 'var(--text-1)' };

  return (
    <div className="m-overlay open" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="m-panel">
        <div className="m-head">
          <div className="m-head-l">
            <div className="m-icon ic-a">📁</div>
            <div><div className="m-title">Bulk Upload</div><div className="m-sub">Import leads from CSV</div></div>
          </div>
          <button className="m-close" onClick={onClose}>✕</button>
        </div>
        <div className="m-body" style={{ padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 500 }}>Upload a .csv file with the required headers</div>
            <a 
              href="/sample-linkedin-leads.csv" 
              download="sample-linkedin-leads.csv"
              style={{ fontSize: 12, color: '#2563eb', textDecoration: 'none', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <span style={{ fontSize: 14 }}>📥</span> Download Sample CSV
            </a>
          </div>
          {/* Drop zone */}
          <div
            onClick={() => fileRef.current?.click()}
            style={{
              border: '2px dashed var(--border)', borderRadius: 10, padding: 32, textAlign: 'center',
              cursor: 'pointer', background: 'var(--s2)', marginBottom: 16, transition: 'border-color .15s',
            }}
            onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--accent)'; }}
            onDragLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
            onDrop={e => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--border)'; const file = e.dataTransfer.files[0]; if (file) { const dt = new DataTransfer(); dt.items.add(file); fileRef.current.files = dt.files; handleFile({ target: { files: [file] } }); } }}
          >
            <div style={{ fontSize: 24, marginBottom: 6 }}>📄</div>
            <div style={{ fontSize: 13, color: 'var(--text-2)', fontWeight: 500 }}>
              {fileName ? fileName : 'Click or drop CSV file here'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>
              Headers: firstName, lastName, city, linkedInUrl
            </div>
            <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} style={{ display: 'none' }} />
          </div>

          {error && <div style={{ color: '#dc2626', fontSize: 12, marginBottom: 12, padding: '6px 10px', background: '#fef2f2', borderRadius: 6 }}>{error}</div>}

          {/* Preview */}
          {rows.length > 0 && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)', marginBottom: 8 }}>
                Preview: {rows.length} leads
              </div>
              <div className="tbl-wrap" style={{ maxHeight: 260, overflowY: 'auto' }}>
                <table>
                  <thead><tr>
                    <th style={fieldStyle}>Name</th>
                    <th style={fieldStyle}>City</th>
                    <th style={fieldStyle}>LinkedIn</th>
                  </tr></thead>
                  <tbody>
                    {rows.slice(0, 50).map((r, i) => (
                      <tr key={i}>
                        <td style={fieldStyle}>{r.firstName} {r.lastName}</td>
                        <td style={fieldStyle}>{r.city}</td>
                        <td style={{ fontSize: 11, color: 'var(--text-3)', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {r.linkedInUrl ? '✓' : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rows.length > 50 && <div style={{ fontSize: 11, color: 'var(--text-3)', padding: 8 }}>…and {rows.length - 50} more</div>}
              </div>
            </div>
          )}
        </div>
        <div className="m-foot" style={{ justifyContent: 'flex-end', gap: 8 }}>
          <button className="m-add-btn" style={{ background: 'transparent', color: 'var(--text-2)' }} onClick={onClose}>Cancel</button>
          <button className="m-add-btn" onClick={handleUpload} disabled={uploading || rows.length === 0}>
            {uploading ? 'Importing…' : `Import ${rows.length} Leads`}
          </button>
        </div>
      </div>
    </div>
  );
}
