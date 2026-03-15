'use client';
import { useState, useEffect } from 'react';

export default function ActivityPage({ data, currentUser }) {
  const [tab, setTab] = useState('user'); // 'user' or 'system'
  const [userActivities, setUserActivities] = useState([]);
  const [loadingUser, setLoadingUser] = useState(true);

  const systemActivity = data?.activity || [];

  // Fetch user activities from API
  useEffect(() => {
    async function fetchUserActivity() {
      try {
        const res = await fetch('/api/crm/activity');
        const json = await res.json();
        if (json.success) setUserActivities(json.activities || []);
      } catch (err) {
        console.error('Failed to fetch user activities:', err);
      } finally {
        setLoadingUser(false);
      }
    }
    fetchUserActivity();
  }, []);

  const dotCls = { c: 'fd-c', l: 'fd-l', k: 'fd-k', t: 'fd-t', s: 'fd-t' };
  const typeLabel = { l: '🔗', c: '📧', t: '✓', k: '📞', s: '🔑' };

  const renderActivity = (items, isUser) => {
    if (items.length === 0) {
      return <div className="empty">{isUser ? 'No user activity yet. Actions like adding leads, changing statuses, and creating tasks will appear here.' : 'No system activity logged yet. Engine logs will appear here when the outreach engine runs.'}</div>;
    }
    return items.map((a, i) => (
      <div key={a._id || i} className="feed-item" style={{ padding: '12px 20px' }}>
        <div className={`feed-dot ${dotCls[a.type] || 'fd-t'}`} />
        <span className="feed-time" style={{ minWidth: 48 }}>{a.time}</span>
        {isUser && a.date && <span style={{ fontSize: 10, color: 'var(--text-4)', marginRight: 8, fontFamily: 'var(--mono)' }}>{a.date}</span>}
        <span className="feed-text">
          {isUser && <span style={{ fontWeight: 600, color: 'var(--blue)' }}>{a.user} </span>}
          {isUser ? a.action : a.text}{' '}
          <b>{isUser ? a.target : a.bold}</b>
          {!isUser && a.campaign && <span style={{ color: 'var(--text-4)', fontSize: 11, marginLeft: 6 }}>in {a.campaign}</span>}
        </span>
      </div>
    ));
  };

  return (
    <div className="page-content active" id="page-activity">
      <div className="ph">
        <div className="ph-left"><h1>Activity Log</h1><p>Full chronological history of all actions.</p></div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', marginBottom: 16 }}>
        <button
          onClick={() => setTab('user')}
          style={{
            padding: '10px 24px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: tab === 'user' ? 600 : 400,
            color: tab === 'user' ? 'var(--blue)' : 'var(--text-3)',
            borderBottom: tab === 'user' ? '2px solid var(--blue)' : '2px solid transparent',
          }}
        >
          👤 User Activity
        </button>
        <button
          onClick={() => setTab('system')}
          style={{
            padding: '10px 24px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: tab === 'system' ? 600 : 400,
            color: tab === 'system' ? 'var(--blue)' : 'var(--text-3)',
            borderBottom: tab === 'system' ? '2px solid var(--blue)' : '2px solid transparent',
          }}
        >
          ⚡ System Activity
        </button>
      </div>

      <div className="card">
        <div>
          {tab === 'user' && (loadingUser
            ? <div className="empty">Loading user activities…</div>
            : renderActivity(userActivities, true)
          )}
          {tab === 'system' && renderActivity(systemActivity, false)}
        </div>
      </div>
    </div>
  );
}
