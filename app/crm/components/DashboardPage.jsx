'use client';
import { LineChart } from './Charts';

export default function DashboardPage({ data, onNav, onOpenModal }) {
  const m = data?.metrics || {};
  const activity = data?.userActivity || [];
  const campaigns = data?.campaigns || [];
  const chart = data?.chartData || {};

  // Real tasks from API + follow-up tasks
  const realTasks = data?.tasks || [];
  const followUpTasks = data?.followUpTasks || [];
  const allTasks = [...followUpTasks, ...realTasks].slice(0, 5);
  const todayDone = allTasks.filter(t => t.status === 'done').length;

  const stCls = { active: 'b-run', running: 'b-run', paused: 'b-pau', completed: 'b-com', draft: 'b-pend' };
  const stLabel = { active: 'Running', running: 'Running', paused: 'Paused', completed: 'Done', draft: 'Draft' };
  const stDot = { active: 'var(--green)', running: 'var(--green)', paused: 'var(--amber)', completed: 'var(--text-4)', draft: 'var(--text-3)' };

  return (
    <div className="page-content active" id="page-dashboard">
      <div className="ph">
        <div className="ph-left">
          <h1>Command Center</h1>
          <p>Your full operations at a glance · Today</p>
        </div>
        <div className="ph-actions">
          <button className="t-btn" onClick={() => onOpenModal('todo')}>+ Add Task</button>
          <button className="t-btn accent" onClick={() => onOpenModal('activity')}>View Activity</button>
        </div>
      </div>

      {/* Metrics */}
      <div className="metrics">
        <div className="mc" onClick={() => onNav('email')}>
          <div className="mc-top"><div className="mc-icon ic-b">📧</div><span className="mc-trend tr-up">+{m.activeCampaigns || 0}</span></div>
          <div className="mc-num">{m.activeCampaigns || 0}</div><div className="mc-label">Active Campaigns</div>
        </div>
        <div className="mc">
          <div className="mc-top"><div className="mc-icon ic-g">👥</div><span className="mc-trend tr-up">{m.totalLeads || 0}</span></div>
          <div className="mc-num">{m.totalLeads || 0}</div><div className="mc-label">Total Leads</div>
        </div>
        <div className="mc">
          <div className="mc-top"><div className="mc-icon ic-a">💬</div><span className="mc-trend tr-up">+{m.emailsSentToday || 0}</span></div>
          <div className="mc-num">{m.emailsSentToday || 0}</div><div className="mc-label">Emails Sent Today</div>
        </div>
        <div className="mc" onClick={() => onOpenModal('activity')}>
          <div className="mc-top"><div className="mc-icon ic-p">↩</div><span className="mc-trend tr-up">+{m.repliesToday || 0}</span></div>
          <div className="mc-num">{m.repliesToday || 0}</div><div className="mc-label">Replies Today</div>
        </div>
      </div>

      {/* Charts + Quick Tasks */}
      <div className="grid-main mb-14">
        <div className="card">
          <div className="card-head">
            <div className="card-head-l"><span className="ch-title">Emails Sent — 7 days</span></div>
            <button className="card-act" onClick={() => onNav('email')}>View →</button>
          </div>
          <div className="chart-pad"><div className="chart-wrap">
            <LineChart id="c-dash-sent" labels={chart.labels || []} data={chart.emailsSent7d || []} color="#2563eb" />
          </div></div>
        </div>
        <div className="card">
          <div className="card-head">
            <div className="card-head-l"><span className="ch-title">Replies — 7 days</span></div>
            <button className="card-act" onClick={() => onNav('email')}>View →</button>
          </div>
          <div className="chart-pad"><div className="chart-wrap">
            <LineChart id="c-dash-rep" labels={chart.labels || []} data={chart.replies7d || []} color="#7c3aed" />
          </div></div>
        </div>
        <div className="card">
          <div className="card-head">
            <div className="card-head-l">
              <span className="ch-title">Today&apos;s Tasks</span>
              <span className="ch-count">{todayDone}/{allTasks.length}</span>
            </div>
            <button className="card-act" onClick={() => onNav('tasks')}>Open →</button>
          </div>
          <div>
            {allTasks.length === 0 && <div className="empty" style={{ padding: '20px 16px' }}>No tasks yet</div>}
            {allTasks.map(t => (
              <div key={t._id} className="qtask" onClick={() => onNav('tasks')}>
                <div className={`qchk ${t.status === 'done' ? 'done' : ''}`} />
                <span className={`qt-text ${t.status === 'done' ? 'done' : ''}`}>{t.title}</span>
                {t.isFollowUp && <span className="qt-badge qb-a" style={{ fontSize: 9, padding: '1px 5px', background: 'rgba(99,102,241,0.12)', color: 'var(--purple)' }}>Follow-up</span>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Activity Feed + Campaigns */}
      <div className="grid-bottom">
        <div className="card">
          <div className="card-head">
            <div className="card-head-l"><span className="ch-title">Activity Feed</span><div className="ch-live" /></div>
            <button className="card-act" onClick={() => onOpenModal('activity')}>View all →</button>
          </div>
          <div>
            {activity.length === 0 && <div className="empty">No recent activity</div>}
            {activity.slice(0, 5).map((a, i) => (
              <div key={i} className="feed-item" onClick={() => onOpenModal('activity')}>
                <div className={`feed-dot fd-${a.type}`} />
                <span className="feed-time">{a.time}</span>
                <span className="feed-text">
                  <span style={{ fontWeight: 600, color: 'var(--blue)' }}>{a.user} </span>
                  {a.action || a.text} <b>{a.target || a.bold}</b>
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="card-head">
            <div className="card-head-l"><span className="ch-title">Campaigns</span><span className="ch-count">{campaigns.length}</span></div>
            <button className="card-act" onClick={() => onNav('email')}>View all →</button>
          </div>
          <div>
            {campaigns.length === 0 && <div className="empty">No campaigns yet</div>}
            {campaigns.slice(0, 5).map(c => {
              const pct = c.leads > 0 ? Math.round((c.sent / c.leads) * 100) : 0;
              return (
                <div key={c._id} className="feed-item" onClick={() => onNav('email')}>
                  <div className="feed-dot" style={{ background: stDot[c.status] || 'var(--text-3)' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '12.5px', fontWeight: 500, color: 'var(--text-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: 1 }}>{c.leads} leads</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <div className="pbar-wrap">
                      <div className="pbar-track"><div className="pbar-fill" style={{ width: `${pct}%` }} /></div>
                      <span className="pbar-pct">{pct}%</span>
                    </div>
                    <span className={`badge ${stCls[c.status] || 'b-pend'}`}>{stLabel[c.status] || c.status}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
