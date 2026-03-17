'use client';
import { useState } from 'react';

export default function AddPostModal({ campaignId, campaignName, channels, currentUser, onClose, onAdded }) {
  const [title, setTitle] = useState('');
  const [channel, setChannel] = useState(channels?.[0] || 'LinkedIn');
  const [type, setType] = useState('Post');
  const [status, setStatus] = useState('draft');
  const [scheduledDate, setScheduledDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setError('');
    if (!title.trim()) { setError('Please enter a post title.'); return; }

    setSaving(true);
    try {
      const res = await fetch(`/api/crm/marketing/${campaignId}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-crm-user': currentUser || '' },
        body: JSON.stringify({
          title: title.trim(),
          channel,
          type,
          status,
          scheduledDate: scheduledDate || null,
        }),
      });
      const json = await res.json();
      if (json.success) {
        onAdded();
      } else {
        setError(json.error || 'Failed to add post');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="m-overlay open" style={{ zIndex: 250 }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="m-panel" style={{ width: 480 }}>
        <div className="m-head">
          <div className="m-head-l">
            <div className="m-icon" style={{ background: 'var(--blue-bg)' }}>✎</div>
            <div>
              <div className="m-title">Add post</div>
              <div className="m-sub">Adding to {campaignName}</div>
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
            <label className="mk-label">Post title</label>
            <input className="mk-input" type="text" placeholder="e.g. Why Agents Lose Leads" value={title} onChange={e => setTitle(e.target.value)} autoFocus />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="mk-field">
              <label className="mk-label">Channel</label>
              <select className="mk-input" value={channel} onChange={e => setChannel(e.target.value)}>
                {['LinkedIn', 'Website', 'Facebook', 'Instagram'].map(ch => (
                  <option key={ch} value={ch}>{ch}</option>
                ))}
              </select>
            </div>
            <div className="mk-field">
              <label className="mk-label">Post type</label>
              <select className="mk-input" value={type} onChange={e => setType(e.target.value)}>
                {['Post', 'Blog', 'Carousel', 'Video', 'Reel', 'Story', 'Ad'].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="mk-field">
              <label className="mk-label">Status</label>
              <select className="mk-input" value={status} onChange={e => setStatus(e.target.value)}>
                <option value="draft">Draft</option>
                <option value="scheduled">Scheduled</option>
                <option value="published">Published</option>
              </select>
            </div>
            <div className="mk-field">
              <label className="mk-label">Scheduled date</label>
              <input className="mk-input" type="date" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)} />
            </div>
          </div>

          <div style={{ height: 1, background: 'var(--border)', margin: '16px 0' }} />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button className="t-btn" onClick={onClose}>Cancel</button>
            <button className="t-btn accent" onClick={handleSave} disabled={saving}>
              {saving ? 'Adding...' : 'Add post'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
