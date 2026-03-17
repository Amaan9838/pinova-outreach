'use client';
import { useState } from 'react';

export default function NewCampaignModal({ currentUser, onClose, onCreated }) {
  const [name, setName] = useState('');
  const [channels, setChannels] = useState([]);
  const [owner, setOwner] = useState(currentUser || '');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const toggleChannel = (ch) => {
    setChannels(prev => prev.includes(ch) ? prev.filter(c => c !== ch) : [...prev, ch]);
  };

  const handleSave = async () => {
    setError('');
    if (!name.trim()) { setError('Please enter a campaign name.'); return; }
    if (!channels.length) { setError('Please select at least one channel.'); return; }

    setSaving(true);
    try {
      const res = await fetch('/api/crm/marketing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-crm-user': currentUser || '' },
        body: JSON.stringify({
          name: name.trim(),
          channels,
          owner: owner || currentUser || '',
          startDate: startDate || null,
          endDate: endDate || null,
        }),
      });
      const json = await res.json();
      if (json.success) {
        onCreated();
      } else {
        setError(json.error || 'Failed to create campaign');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="m-overlay open" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="m-panel" style={{ width: 560 }}>
        <div className="m-head">
          <div className="m-head-l">
            <div className="m-icon" style={{ background: 'var(--s2)' }}>+</div>
            <div>
              <div className="m-title">New campaign</div>
              <div className="m-sub">Set up a new marketing campaign</div>
            </div>
          </div>
          <button className="m-close" onClick={onClose}>✕</button>
        </div>

        <div className="m-body" style={{ padding: 20 }}>
          {error && (
            <div style={{ background: 'var(--red-bg)', border: '1px solid var(--red-border)', borderRadius: 6, padding: '8px 12px', marginBottom: 14, fontSize: 12, color: 'var(--red)' }}>
              {error}
            </div>
          )}

          <div className="mk-field">
            <label className="mk-label">Campaign name</label>
            <input className="mk-input" type="text" placeholder="e.g. Spring Launch 2026" value={name} onChange={e => setName(e.target.value)} autoFocus />
          </div>

          <div className="mk-field">
            <label className="mk-label">Channels</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', padding: '3px 0' }}>
              {['LinkedIn', 'Website', 'Facebook', 'Instagram'].map(ch => (
                <button key={ch} type="button"
                  className={`mk-ch-opt ${channels.includes(ch) ? 'sel' : ''}`}
                  onClick={() => toggleChannel(ch)}>{ch}</button>
              ))}
            </div>
            <span style={{ fontSize: '11.5px', color: 'var(--text-3)', marginTop: 3 }}>Select all that apply</span>
          </div>

          <div className="mk-field">
            <label className="mk-label">Owner</label>
            <input className="mk-input" type="text" placeholder="Owner name" value={owner} onChange={e => setOwner(e.target.value)} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="mk-field">
              <label className="mk-label">Start date</label>
              <input className="mk-input" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div className="mk-field">
              <label className="mk-label">End date</label>
              <input className="mk-input" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </div>

          <div style={{ height: 1, background: 'var(--border)', margin: '16px 0' }} />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button className="t-btn" onClick={onClose}>Cancel</button>
            <button className="t-btn accent" onClick={handleSave} disabled={saving}>
              {saving ? 'Creating...' : 'Create campaign'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
