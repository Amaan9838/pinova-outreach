'use client';
import { useState, useMemo } from 'react';
import { LineChart, DoughnutChart } from './Charts';

// Static placeholder data — will be replaced with real LinkedIn API later
const LINKEDIN_DATA = [
  { id: 1, lead_name: 'John Smith', owner: 'Alex', messages_sent: 3, replies: 1, follow_up_due_date: 'Mar 13', status: 'replied' },
  { id: 2, lead_name: 'David Chen', owner: 'Alex', messages_sent: 2, replies: 0, follow_up_due_date: 'Mar 13', status: 'follow_up' },
  { id: 3, lead_name: 'Sarah Miller', owner: 'Sam', messages_sent: 4, replies: 2, follow_up_due_date: 'Mar 14', status: 'call_booked' },
  { id: 4, lead_name: 'Robert Johnson', owner: 'Maria', messages_sent: 1, replies: 0, follow_up_due_date: 'Mar 13', status: 'contacted' },
  { id: 5, lead_name: 'Emily Davis', owner: 'Alex', messages_sent: 5, replies: 3, follow_up_due_date: 'Mar 15', status: 'replied' },
  { id: 6, lead_name: 'Michael Brown', owner: 'Jordan', messages_sent: 2, replies: 1, follow_up_due_date: 'Mar 13', status: 'follow_up' },
  { id: 7, lead_name: 'Lisa Wilson', owner: 'Sam', messages_sent: 3, replies: 0, follow_up_due_date: 'Mar 16', status: 'contacted' },
  { id: 8, lead_name: 'James Taylor', owner: 'Alex', messages_sent: 7, replies: 4, follow_up_due_date: 'Mar 17', status: 'call_booked' },
  { id: 9, lead_name: 'Anna Martinez', owner: 'Maria', messages_sent: 2, replies: 0, follow_up_due_date: 'Mar 13', status: 'contacted' },
  { id: 10, lead_name: 'Kevin Anderson', owner: 'Jordan', messages_sent: 1, replies: 0, follow_up_due_date: 'Mar 14', status: 'contacted' },
  { id: 11, lead_name: 'Patricia Thomas', owner: 'Sam', messages_sent: 4, replies: 2, follow_up_due_date: 'Mar 13', status: 'follow_up' },
  { id: 12, lead_name: 'Charles Jackson', owner: 'Alex', messages_sent: 3, replies: 1, follow_up_due_date: 'Mar 18', status: 'replied' },
];

export default function LinkedInPage() {
  const [search, setSearch] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const filtered = useMemo(() => {
    return LINKEDIN_DATA.filter(r =>
      (!search || r.lead_name.toLowerCase().includes(search.toLowerCase())) &&
      (!ownerFilter || r.owner === ownerFilter) &&
      (!statusFilter || r.status === statusFilter)
    );
  }, [search, ownerFilter, statusFilter]);

  const followups = LINKEDIN_DATA.filter(r => r.follow_up_due_date === 'Mar 13' || r.status === 'follow_up');

  const sb = { contacted: 'b-cont', replied: 'b-repl', follow_up: 'b-foll', call_booked: 'b-book', closed: 'b-clos' };
  const sl = { contacted: 'Contacted', replied: 'Replied', follow_up: 'Follow-up', call_booked: 'Call Booked', closed: 'Closed' };

  const statusCounts = [5, 4, 3, 2, 1];
  const statusLabels = ['Contacted', 'Replied', 'Follow-up', 'Call Booked', 'Closed'];
  const statusColors = ['#2563eb', '#7c3aed', '#c9820a', '#2a9d5c', '#9b9b96'];

  return (
    <div className="page-content active" id="page-linkedin">
      <div className="ph">
        <div className="ph-left"><h1>LinkedIn Outreach</h1><p>Monitor and manage social outreach across your team.</p></div>
        <div className="ph-actions"><button className="t-btn accent">+ Add Lead</button></div>
      </div>

      <div className="metrics">
        <div className="mc"><div className="mc-top"><div className="mc-icon ic-b">🔗</div><span className="mc-trend tr-up">+8</span></div><div className="mc-num">184</div><div className="mc-label">Total Leads</div></div>
        <div className="mc"><div className="mc-top"><div className="mc-icon ic-g">💬</div><span className="mc-trend tr-up">+8</span></div><div className="mc-num">72</div><div className="mc-label">Messages Today</div></div>
        <div className="mc"><div className="mc-top"><div className="mc-icon ic-p">↩</div><span className="mc-trend tr-up">+3</span></div><div className="mc-num">19</div><div className="mc-label">Replies Today</div></div>
        <div className="mc"><div className="mc-top"><div className="mc-icon ic-a">⏰</div><span className="mc-trend tr-dn">+2</span></div><div className="mc-num">14</div><div className="mc-label">Follow-ups Due</div></div>
      </div>

      <div className="card mb-14">
        <div className="card-head"><div className="card-head-l"><span className="ch-title">Messages by day</span></div></div>
        <div className="chart-pad"><div className="chart-wrap tall">
          <LineChart id="c-li-msgs" labels={['Mon','Tue','Wed','Thu','Fri','Sat','Sun']} data={[58,65,48,72,80,60,72]} color="#2563eb" />
        </div></div>
      </div>

      <div className="grid-linkedin">
        <div>
          <div className="filter-row">
            <input className="f-input" type="text" placeholder="Search leads…" value={search} onChange={e => setSearch(e.target.value)} />
            <select className="f-select" value={ownerFilter} onChange={e => setOwnerFilter(e.target.value)}>
              <option value="">All owners</option>
              <option>Alex</option><option>Sam</option><option>Maria</option><option>Jordan</option>
            </select>
            <select className="f-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">All statuses</option>
              <option value="contacted">Contacted</option><option value="replied">Replied</option>
              <option value="follow_up">Follow-up</option><option value="call_booked">Call Booked</option><option value="closed">Closed</option>
            </select>
          </div>
          <div className="card">
            <div className="tbl-wrap">
              <table><thead><tr>
                <th>Name<span className="sort-ic">↕</span></th>
                <th>Owner<span className="sort-ic">↕</span></th>
                <th>Msgs<span className="sort-ic">↕</span></th>
                <th>Replies<span className="sort-ic">↕</span></th>
                <th>Follow-up</th>
                <th>Status<span className="sort-ic">↕</span></th>
              </tr></thead>
              <tbody>
                {filtered.length === 0 && <tr><td colSpan={6} className="empty">No leads found</td></tr>}
                {filtered.map(r => (
                  <tr key={r.id}>
                    <td><b>{r.lead_name}</b></td>
                    <td>{r.owner}</td>
                    <td style={{ fontFamily: 'var(--mono)' }}>{r.messages_sent}</td>
                    <td style={{ fontFamily: 'var(--mono)' }}>{r.replies}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--mono)' }}>{r.follow_up_due_date}</td>
                    <td><span className={`badge ${sb[r.status]}`}>{sl[r.status]}</span></td>
                  </tr>
                ))}
              </tbody></table>
            </div>
          </div>
        </div>
        <div>
          <div className="card mb-14">
            <div className="card-head"><div className="card-head-l"><span className="ch-title">Follow-ups Due</span><span className="ch-count">14</span></div></div>
            <div>
              {followups.map(r => (
                <div key={r.id} className="followup-item">
                  <div className="fu-avatar">{r.lead_name.split(' ').map(w => w[0]).join('')}</div>
                  <div><div className="fu-name">{r.lead_name}</div><div className="fu-day">{r.owner}</div></div>
                  <span className="fu-due">Due {r.follow_up_due_date}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="card">
            <div className="card-head"><div className="card-head-l"><span className="ch-title">Status Breakdown</span></div></div>
            <div className="chart-pad" style={{ paddingBottom: 10 }}><div className="chart-wrap" style={{ height: 130 }}>
              <DoughnutChart id="c-li-status" labels={statusLabels} data={statusCounts} colors={statusColors} />
            </div></div>
            <div style={{ padding: '0 18px 14px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {statusLabels.map((l, i) => (
                <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-3)' }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: statusColors[i], display: 'inline-block' }} />
                  {l} {statusCounts[i]}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
