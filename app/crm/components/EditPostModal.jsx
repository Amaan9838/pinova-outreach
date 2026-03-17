'use client';
import { useState, useEffect } from 'react';

export default function EditPostModal({ post, campaignId, currentUser, onClose, onUpdated }) {
  const [title, setTitle] = useState(post.title || '');
  const [channel, setChannel] = useState(post.channel || 'LinkedIn');
  const [type, setType] = useState(post.type || 'Post');
  const [status, setStatus] = useState(post.status || 'draft');
  const [scheduledDate, setScheduledDate] = useState(post.scheduledDate ? post.scheduledDate.substring(0, 10) : '');
  const [publishedDate, setPublishedDate] = useState(post.publishedDate ? post.publishedDate.substring(0, 10) : '');
  const [likes, setLikes] = useState(post.likes || 0);
  const [comments, setComments] = useState(post.comments || 0);
  const [shares, setShares] = useState(post.shares || 0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setError('');
    if (!title.trim()) { setError('Please enter a post title.'); return; }

    setSaving(true);
    try {
      const res = await fetch(`/api/crm/marketing/${campaignId}/posts`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-crm-user': currentUser || '' },
        body: JSON.stringify({
          postId: post._id,
          title: title.trim(),
          channel,
          type,
          status,
          scheduledDate: scheduledDate || null,
          publishedDate: publishedDate || null,
          likes: parseInt(likes) || 0,
          comments: parseInt(comments) || 0,
          shares: parseInt(shares) || 0,
        }),
      });
      const json = await res.json();
      if (json.success) {
        onUpdated();
      } else {
        setError(json.error || 'Failed to update post');
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
              <div className="m-title">Edit post</div>
              <div className="m-sub">Make changes or add engagement</div>
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
            <input className="mk-input" type="text" value={title} onChange={e => setTitle(e.target.value)} autoFocus />
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
              <label className="mk-label">
                {status === 'published' ? 'Published date' : 'Scheduled date'}
              </label>
              {status === 'published' ? (
                <input className="mk-input" type="date" value={publishedDate} onChange={e => setPublishedDate(e.target.value)} />
              ) : (
                <input className="mk-input" type="date" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)} />
              )}
            </div>
          </div>

          {status === 'published' && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Engagement metrics</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                <div className="mk-field" style={{ marginBottom: 0 }}>
                  <label className="mk-label" style={{ fontSize: 11 }}>Likes</label>
                  <input className="mk-input" type="number" min="0" value={likes} onChange={e => setLikes(e.target.value)} />
                </div>
                <div className="mk-field" style={{ marginBottom: 0 }}>
                  <label className="mk-label" style={{ fontSize: 11 }}>Comments</label>
                  <input className="mk-input" type="number" min="0" value={comments} onChange={e => setComments(e.target.value)} />
                </div>
                <div className="mk-field" style={{ marginBottom: 0 }}>
                  <label className="mk-label" style={{ fontSize: 11 }}>Shares</label>
                  <input className="mk-input" type="number" min="0" value={shares} onChange={e => setShares(e.target.value)} />
                </div>
              </div>
            </div>
          )}

          <div style={{ height: 1, background: 'var(--border)', margin: '16px 0' }} />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button className="t-btn" onClick={onClose}>Cancel</button>
            <button className="t-btn accent" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
