'use client';
import { useState } from 'react';

const STATUS_LIST = [
  { value: 'new', label: 'New', cls: 'b-new' },
  { value: 'messaged', label: 'Messaged', cls: 'b-msg' },
  { value: 'replied', label: 'Replied', cls: 'b-repl' },
  { value: 'conversation', label: 'Conversation', cls: 'b-conv' },
  { value: 'interested', label: 'Interested', cls: 'b-int' },
  { value: 'demo', label: 'Demo', cls: 'b-demo' },
  { value: 'closed_won', label: 'Closed Won', cls: 'b-won' },
  { value: 'closed_lost', label: 'Closed Lost', cls: 'b-lost' },
  { value: 'not_interested', label: 'Not Interested', cls: 'b-noint' },
];

export default function AddLeadModal({ onClose, currentUser, onSaved }) {
  const [form, setForm] = useState({
    firstName: '', lastName: '', city: '', linkedInUrl: '', owner: currentUser, status: 'new', nextFollowUp: '',
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSave = async () => {
    if (!form.firstName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/crm/linkedin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-crm-user': currentUser },
        body: JSON.stringify({ ...form, nextFollowUp: form.nextFollowUp || null }),
      });
      const json = await res.json();
      if (json.success) onSaved();
    } catch (err) {
      console.error('Add lead error:', err);
    }
    setSaving(false);
  };

  const fieldStyle = {
    width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)',
    background: 'var(--s2)', color: 'var(--text-1)', fontSize: 13, outline: 'none',
  };
  const labelStyle = { fontSize: 11, fontWeight: 500, color: 'var(--text-3)', marginBottom: 4, display: 'block' };

  return (
    <div className="m-overlay open" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="m-panel">
        <div className="m-head">
          <div className="m-head-l">
            <div className="m-icon ic-b">+</div>
            <div><div className="m-title">Add Lead</div><div className="m-sub">Create a new LinkedIn lead</div></div>
          </div>
          <button className="m-close" onClick={onClose}>✕</button>
        </div>
        <div className="m-body" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label style={labelStyle}>First Name *</label><input style={fieldStyle} value={form.firstName} onChange={e => set('firstName', e.target.value)} placeholder="John" /></div>
            <div><label style={labelStyle}>Last Name</label><input style={fieldStyle} value={form.lastName} onChange={e => set('lastName', e.target.value)} placeholder="Smith" /></div>
          </div>
          <div><label style={labelStyle}>City</label><input style={fieldStyle} value={form.city} onChange={e => set('city', e.target.value)} placeholder="New York, NY" /></div>
          <div><label style={labelStyle}>LinkedIn URL</label><input style={fieldStyle} value={form.linkedInUrl} onChange={e => set('linkedInUrl', e.target.value)} placeholder="https://linkedin.com/in/..." /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Owner</label>
              <select style={fieldStyle} value={form.owner} onChange={e => set('owner', e.target.value)}>
                <option value="Amaan">Amaan</option><option value="Ayushman">Ayushman</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Status</label>
              <select style={fieldStyle} value={form.status} onChange={e => set('status', e.target.value)}>
                {STATUS_LIST.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>
          <div><label style={labelStyle}>Next Follow-up</label><input type="date" style={fieldStyle} value={form.nextFollowUp} onChange={e => set('nextFollowUp', e.target.value)} /></div>
        </div>
        <div className="m-foot" style={{ justifyContent: 'flex-end', gap: 8 }}>
          <button className="m-add-btn" style={{ background: 'transparent', color: 'var(--text-2)' }} onClick={onClose}>Cancel</button>
          <button className="m-add-btn" onClick={handleSave} disabled={saving || !form.firstName.trim()}>
            {saving ? 'Saving…' : 'Add Lead'}
          </button>
        </div>
      </div>
    </div>
  );
}
