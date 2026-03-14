'use client';

export default function ActivityPage({ data }) {
  const activity = data?.activity || [];

  const dotCls = { c: 'fd-c', l: 'fd-l', k: 'fd-k', t: 'fd-t' };

  return (
    <div className="page-content active" id="page-activity">
      <div className="ph">
        <div className="ph-left"><h1>Activity Log</h1><p>Full chronological history of engine actions.</p></div>
      </div>
      <div className="card">
        <div>
          {activity.length === 0 && <div className="empty">No activity logged yet. Engine logs will appear here when the outreach engine runs.</div>}
          {activity.map((a, i) => (
            <div key={i} className="feed-item" style={{ padding: '12px 20px' }}>
              <div className={`feed-dot ${dotCls[a.type] || 'fd-t'}`} />
              <span className="feed-time">{a.time}</span>
              <span className="feed-text">
                {a.text} <b>{a.bold}</b>
                {a.campaign && <span style={{ color: 'var(--text-4)', fontSize: 11, marginLeft: 6 }}>in {a.campaign}</span>}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
