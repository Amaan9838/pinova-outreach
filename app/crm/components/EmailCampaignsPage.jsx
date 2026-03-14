'use client';
import { useState, useMemo } from 'react';
import { BarChart, LineChart } from './Charts';

export default function EmailCampaignsPage({ data }) {
  const campaigns = data?.campaigns || [];
  const m = data?.metrics || {};
  const chart = data?.chartData || {};

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortKey, setSortKey] = useState('');
  const [sortDir, setSortDir] = useState(1);

  const filtered = useMemo(() => {
    let d = [...campaigns];
    if (search) d = d.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));
    if (statusFilter) d = d.filter(c => c.status === statusFilter);
    if (sortKey) d.sort((a, b) => (a[sortKey] > b[sortKey] ? 1 : a[sortKey] < b[sortKey] ? -1 : 0) * sortDir);
    return d;
  }, [campaigns, search, statusFilter, sortKey, sortDir]);

  const totalSent = m.totalEmailsSent || campaigns.reduce((s, c) => s + c.sent, 0);
  const totalReplies = campaigns.reduce((s, c) => s + c.replies, 0);

  const stCls = { active: 'b-run', running: 'b-run', paused: 'b-pau', completed: 'b-com', draft: 'b-pend' };
  const stLabel = { active: 'Running', running: 'Running', paused: 'Paused', completed: 'Done', draft: 'Draft' };

  function handleSort(key, th) {
    if (sortKey === key) setSortDir(d => -d);
    else { setSortKey(key); setSortDir(1); }
  }

  return (
    <div className="page-content active" id="page-email">
      <div className="ph">
        <div className="ph-left"><h1>Email Campaigns</h1><p>Track outbound email performance and conversion.</p></div>
      </div>

      {/* Metrics */}
      <div className="metrics five">
        <div className="mc"><div className="mc-top"><div className="mc-icon ic-b">📋</div><span className="mc-trend tr-neu">—</span></div><div className="mc-num">{m.totalCampaigns || 0}</div><div className="mc-label">Total Campaigns</div></div>
        <div className="mc"><div className="mc-top"><div className="mc-icon ic-g">👥</div><span className="mc-trend tr-up">{m.totalLeads || 0}</span></div><div className="mc-num">{m.totalLeads || 0}</div><div className="mc-label">Total Leads</div></div>
        <div className="mc"><div className="mc-top"><div className="mc-icon ic-a">📤</div><span className="mc-trend tr-up">+{m.emailsSentToday || 0}</span></div><div className="mc-num">{totalSent}</div><div className="mc-label">Total Emails Sent</div></div>
        <div className="mc"><div className="mc-top"><div className="mc-icon ic-p">↩</div><span className="mc-trend tr-up">+{m.repliesToday || 0}</span></div><div className="mc-num">{totalReplies}</div><div className="mc-label">Total Replies</div></div>
        <div className="mc"><div className="mc-top"><div className="mc-icon ic-n">📞</div></div><div className="mc-num">{m.callsBooked || 0}</div><div className="mc-label">Calls Booked</div></div>
      </div>

      {/* Charts */}
      <div className="grid-2 mb-14">
        <div className="card">
          <div className="card-head"><div className="card-head-l"><span className="ch-title">Emails Sent — 7 days</span></div></div>
          <div className="chart-pad"><div className="chart-wrap tall">
            <BarChart id="c-email-sent" labels={chart.labels || []} data={chart.emailsSent7d || []} colors={Array(7).fill('#2563eb')} />
          </div></div>
        </div>
        <div className="card">
          <div className="card-head"><div className="card-head-l"><span className="ch-title">Reply Rate Trend</span></div></div>
          <div className="chart-pad"><div className="chart-wrap tall">
            <LineChart id="c-email-replies" labels={chart.labels || []} data={chart.replies7d || []} color="#7c3aed" />
          </div></div>
        </div>
      </div>

      {/* Campaigns Table */}
      <div className="card mb-14">
        <div className="card-head">
          <div className="card-head-l"><span className="ch-title">All Campaigns</span></div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <input className="f-input" style={{ minWidth: 140 }} type="text" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} />
            <select className="f-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">All statuses</option>
              <option value="active">Running</option>
              <option value="paused">Paused</option>
              <option value="completed">Completed</option>
              <option value="draft">Draft</option>
            </select>
          </div>
        </div>
        <div className="tbl-wrap">
          <table><thead><tr>
            <th onClick={() => handleSort('name')}>Campaign<span className="sort-ic">↕</span></th>
            <th onClick={() => handleSort('leads')}>Leads<span className="sort-ic">↕</span></th>
            <th>Status</th>
            <th onClick={() => handleSort('sent')}>Sent<span className="sort-ic">↕</span></th>
            <th>Progress</th>
            <th onClick={() => handleSort('replies')}>Replies<span className="sort-ic">↕</span></th>
            <th>Reply %</th>
          </tr></thead>
          <tbody>
            {filtered.length === 0 && <tr><td colSpan={7} className="empty">No campaigns found</td></tr>}
            {filtered.map(c => {
              const pct = c.leads > 0 ? Math.round((c.sent / c.leads) * 100) : 0;
              return (
                <tr key={c._id}>
                  <td><b>{c.name}</b></td>
                  <td>{c.leads}</td>
                  <td><span className={`badge ${stCls[c.status] || 'b-pend'}`}>{stLabel[c.status] || c.status}</span></td>
                  <td>{c.sent}</td>
                  <td>
                    <div className="pbar-wrap">
                      <div className="pbar-track"><div className="pbar-fill" style={{ width: `${pct}%` }} /></div>
                      <span className="pbar-pct">{pct}%</span>
                    </div>
                  </td>
                  <td>{c.replies}</td>
                  <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{c.replyRate}%</td>
                </tr>
              );
            })}
          </tbody></table>
        </div>
      </div>
    </div>
  );
}
