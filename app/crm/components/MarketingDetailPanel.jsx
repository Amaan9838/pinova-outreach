'use client';
import { useState, useEffect, useCallback } from 'react';
import AddPostModal from './AddPostModal';

const CH_CLS = { LinkedIn: 'ch-li', Website: 'ch-web', Facebook: 'ch-fb', Instagram: 'ch-ig' };
const ST_CLS = { active: 'b-run', scheduled: 'b-prog', completed: 'b-com', paused: 'b-pau' };
const ST_LBL = { active: 'Active', scheduled: 'Scheduled', completed: 'Completed', paused: 'Paused' };
const PST_CLS = { published: 'b-run', scheduled: 'b-prog', draft: 'b-com' };
const PST_LBL = { published: 'Published', scheduled: 'Scheduled', draft: 'Draft' };

const fmtDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export default function MarketingDetailPanel({ campaignId, currentUser, onClose }) {
  const [campaign, setCampaign] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('posts');
  const [showAddPost, setShowAddPost] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);

  const fetchDetail = useCallback(async () => {
    try {
      const res = await fetch(`/api/crm/marketing/${campaignId}`);
      const json = await res.json();
      if (json.success) {
        setCampaign(json.campaign);
        setPosts(json.postsList || []);
      }
    } catch (err) {
      console.error('Failed to fetch campaign detail:', err);
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  const handlePostAdded = () => {
    setShowAddPost(false);
    fetchDetail();
  };

  const handleStatusChange = async (newStatus) => {
    setStatusUpdating(true);
    try {
      await fetch(`/api/crm/marketing/${campaignId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-crm-user': currentUser || '' },
        body: JSON.stringify({ status: newStatus }),
      });
      fetchDetail();
    } catch (err) {
      console.error('Status update failed:', err);
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleDeleteCampaign = async () => {
    if (!confirm('Delete this campaign and all its posts? This cannot be undone.')) return;
    try {
      await fetch(`/api/crm/marketing/${campaignId}`, {
        method: 'DELETE',
        headers: { 'x-crm-user': currentUser || '' },
      });
      onClose();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const handleDeletePost = async (postId) => {
    if (!confirm('Delete this post?')) return;
    try {
      await fetch(`/api/crm/marketing/${campaignId}/posts?postId=${postId}`, {
        method: 'DELETE',
        headers: { 'x-crm-user': currentUser || '' },
      });
      fetchDetail();
    } catch (err) {
      console.error('Delete post failed:', err);
    }
  };

  if (!campaignId) return null;

  const maxEng = Math.max(...posts.map(p => (p.likes || 0) + (p.comments || 0) + (p.shares || 0)), 1);

  // Build timeline from posts and campaign data
  const timeline = [];
  if (campaign) {
    timeline.push({ date: campaign.startDate || campaign.createdAt, text: 'Campaign <strong>created</strong>', done: true });
    posts.filter(p => p.status === 'published' && p.publishedDate).sort((a, b) => new Date(a.publishedDate) - new Date(b.publishedDate)).forEach(p => {
      const eng = (p.likes || 0) + (p.comments || 0) + (p.shares || 0);
      timeline.push({ date: p.publishedDate, text: `${p.channel} ${p.type.toLowerCase()} "<strong>${p.title}</strong>" published${eng > 0 ? ` — ${eng} engagement` : ''}`, done: true });
    });
    posts.filter(p => p.status === 'scheduled' && p.scheduledDate).sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate)).forEach(p => {
      timeline.push({ date: p.scheduledDate, text: `${p.channel} ${p.type.toLowerCase()} "<strong>${p.title}</strong>" <strong>due</strong>`, done: false });
    });
    if (campaign.endDate) {
      timeline.push({ date: campaign.endDate, text: 'Campaign <strong>ends</strong>', done: campaign.status === 'completed' });
    }
  }

  return (
    <div className="m-overlay open" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="m-panel" style={{ width: 640 }}>
        {/* Header */}
        <div className="m-head">
          <div className="m-head-l">
            <div className="m-icon" style={{ background: 'var(--s2)' }}>◎</div>
            <div>
              <div className="m-title">{loading ? 'Loading…' : campaign?.name}</div>
              <div className="m-sub">{campaign?.owner} · {(campaign?.channels || []).join(', ')}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {campaign && (
              <select className="f-select" value={campaign.status} onChange={e => handleStatusChange(e.target.value)} disabled={statusUpdating}
                style={{ fontSize: 11, height: 26, padding: '0 20px 0 8px' }}>
                <option value="active">Active</option>
                <option value="scheduled">Scheduled</option>
                <option value="paused">Paused</option>
                <option value="completed">Completed</option>
              </select>
            )}
            <button onClick={handleDeleteCampaign} title="Delete campaign"
              style={{ fontSize: 13, color: 'var(--text-3)', background: 'none', border: '1px solid var(--border)', borderRadius: 6, width: 26, height: 26, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🗑</button>
            <button className="m-close" onClick={onClose}>✕</button>
          </div>
        </div>

        {/* Tabs */}
        <div className="m-tabs">
          {['Posts', 'Overview', 'Timeline'].map(tab => (
            <button key={tab} className={`m-tab ${activeTab === tab.toLowerCase() ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.toLowerCase())}>{tab}</button>
          ))}
        </div>

        {/* Body */}
        <div className="m-body">
          {loading && (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)' }}>Loading...</div>
          )}

          {!loading && activeTab === 'posts' && (
            <div style={{ padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>
                  Posts <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-3)', marginLeft: 3 }}>{posts.length} total</span>
                </span>
                <button className="t-btn" onClick={() => setShowAddPost(true)}>+ Add post</button>
              </div>

              {posts.length === 0 && (
                <div className="empty">No posts yet. Click &quot;+ Add post&quot; to create one.</div>
              )}

              {posts.map(p => {
                const eng = (p.likes || 0) + (p.comments || 0) + (p.shares || 0);
                const pct = Math.round(eng / maxEng * 100);
                const dotColor = { published: 'var(--green)', scheduled: 'var(--blue)', draft: 'var(--text-4)' }[p.status] || 'var(--text-4)';
                return (
                  <div key={p._id} className="mk-post-item">
                    <div style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, marginTop: 5, background: dotColor }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 5, lineHeight: 1.3 }}>{p.title}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span className={`mk-ch-badge ${CH_CLS[p.channel] || ''}`}>{p.channel}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-3)', background: 'var(--s2)', padding: '1px 6px', borderRadius: 3 }}>{p.type}</span>
                        <span className={`badge ${PST_CLS[p.status] || 'b-com'}`}>{PST_LBL[p.status] || p.status}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--mono)' }}>
                          {p.status === 'published' ? `Published ${fmtDate(p.publishedDate)}` : p.scheduledDate ? `Due ${fmtDate(p.scheduledDate)}` : 'Draft'}
                        </span>
                      </div>
                    </div>
                    <div style={{ flexShrink: 0, textAlign: 'right', display: 'flex', alignItems: 'center', gap: 8 }}>
                      {eng > 0 ? (
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 500, fontFamily: 'var(--mono)' }}>{eng}</div>
                          <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>engagement</div>
                          <div style={{ width: 52, height: 3, background: 'var(--s3)', borderRadius: 99, marginTop: 4, overflow: 'hidden' }}>
                            <div style={{ height: 3, background: 'var(--text-2)', borderRadius: 99, width: `${pct}%` }} />
                          </div>
                        </div>
                      ) : (
                        <span style={{ fontSize: 12, color: 'var(--text-4)' }}>—</span>
                      )}
                      <button onClick={(e) => { e.stopPropagation(); handleDeletePost(p._id); }}
                        title="Delete post"
                        style={{ fontSize: 11, color: 'var(--text-4)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px' }}>✕</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!loading && activeTab === 'overview' && campaign && (
            <>
              <div className="mk-stats-row">
                {[
                  { num: campaign.published || 0, label: 'Published' },
                  { num: campaign.scheduled || 0, label: 'Scheduled' },
                  { num: campaign.draft || 0, label: 'Draft' },
                  { num: (campaign.engagement || 0).toLocaleString(), label: 'Engagement' },
                ].map((s, i) => (
                  <div key={i} className="mk-stat-cell">
                    <div className="mk-stat-num">{s.num}</div>
                    <div className="mk-stat-lbl">{s.label}</div>
                  </div>
                ))}
              </div>

              <div className="mk-ov-grid">
                <div className="mk-ov-cell">
                  <div className="mk-ov-lbl">Owner</div>
                  <div className="mk-ov-val">{campaign.owner}</div>
                </div>
                <div className="mk-ov-cell">
                  <div className="mk-ov-lbl">Status</div>
                  <span className={`badge ${ST_CLS[campaign.status]}`}>{ST_LBL[campaign.status]}</span>
                </div>
                <div className="mk-ov-cell">
                  <div className="mk-ov-lbl">Start date</div>
                  <div className="mk-ov-val" style={{ fontFamily: 'var(--mono)', fontSize: '12.5px' }}>{fmtDate(campaign.startDate)}</div>
                </div>
                <div className="mk-ov-cell">
                  <div className="mk-ov-lbl">End date</div>
                  <div className="mk-ov-val" style={{ fontFamily: 'var(--mono)', fontSize: '12.5px' }}>{fmtDate(campaign.endDate)}</div>
                </div>
                <div className="mk-ov-cell" style={{ gridColumn: '1 / -1', borderRight: 'none' }}>
                  <div className="mk-ov-lbl">Channels</div>
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 4 }}>
                    {(campaign.channels || []).map(ch => (
                      <span key={ch} className={`mk-ch-badge ${CH_CLS[ch]}`}>{ch}</span>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontSize: '12.5px', fontWeight: 600, marginBottom: 12 }}>Engagement breakdown</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                  {[
                    { num: campaign.likes || 0, label: 'Likes' },
                    { num: campaign.comments || 0, label: 'Comments' },
                    { num: campaign.shares || 0, label: 'Shares' },
                  ].map((s, i) => (
                    <div key={i} style={{ background: 'var(--s2)', borderRadius: 6, padding: '12px 14px' }}>
                      <div style={{ fontSize: 20, fontWeight: 600, fontFamily: 'var(--mono)', letterSpacing: '-.5px' }}>{s.num}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 3 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {!loading && activeTab === 'timeline' && (
            <div style={{ padding: '16px 18px' }}>
              {timeline.length === 0 && (
                <div className="empty">No timeline events yet.</div>
              )}
              {timeline.map((t, i) => (
                <div key={i} className="mk-tl-item">
                  <div className={`mk-tl-dot ${t.done ? 'done' : ''}`} />
                  <div>
                    <div className="mk-tl-date">{fmtDate(t.date)}</div>
                    <div className="mk-tl-text" dangerouslySetInnerHTML={{ __html: t.text }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Post Sub-modal */}
      {showAddPost && (
        <AddPostModal
          campaignId={campaignId}
          campaignName={campaign?.name}
          channels={campaign?.channels}
          currentUser={currentUser}
          onClose={() => setShowAddPost(false)}
          onAdded={handlePostAdded}
        />
      )}
    </div>
  );
}
