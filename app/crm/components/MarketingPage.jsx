'use client';
import { useState, useMemo } from 'react';
import { DoughnutChart, BarChart, LineChart } from './Charts';

const MKT_DATA = [
  { id: 1, name: 'Q1 Lead Gen Push', channel: 'Email', impressions: 12400, clicks: 820, conversions: 64, spend: 1200, status: 'active' },
  { id: 2, name: 'Solo Agent Blitz', channel: 'LinkedIn', impressions: 8200, clicks: 612, conversions: 38, spend: 900, status: 'active' },
  { id: 3, name: 'Google Search Brokers', channel: 'Paid', impressions: 31000, clicks: 1240, conversions: 92, spend: 2800, status: 'active' },
  { id: 4, name: 'Instagram Brand Awareness', channel: 'Social', impressions: 54000, clicks: 1800, conversions: 28, spend: 1100, status: 'paused' },
  { id: 5, name: 'SEO Content Cluster', channel: 'SEO', impressions: 18000, clicks: 2100, conversions: 140, spend: 400, status: 'active' },
  { id: 6, name: 'Retargeting Campaign', channel: 'Paid', impressions: 9800, clicks: 720, conversions: 55, spend: 650, status: 'active' },
  { id: 7, name: 'Newsletter Growth', channel: 'Email', impressions: 6200, clicks: 480, conversions: 30, spend: 200, status: 'ended' },
  { id: 8, name: 'LinkedIn Thought Leadership', channel: 'LinkedIn', impressions: 14000, clicks: 980, conversions: 45, spend: 1400, status: 'active' },
];

export default function MarketingPage() {
  const [search, setSearch] = useState('');
  const [channelFilter, setChannelFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const filtered = useMemo(() => {
    return MKT_DATA.filter(r =>
      (!search || r.name.toLowerCase().includes(search.toLowerCase())) &&
      (!channelFilter || r.channel === channelFilter) &&
      (!statusFilter || r.status === statusFilter)
    );
  }, [search, channelFilter, statusFilter]);

  const stCls = { active: 'b-run', paused: 'b-pau', ended: 'b-com' };
  const stLabel = { active: 'Active', paused: 'Paused', ended: 'Ended' };

  return (
    <div className="page-content active" id="page-marketing">
      <div className="ph">
        <div className="ph-left"><h1>Marketing Campaigns</h1><p>Performance, reach and conversion across all channels.</p></div>
      </div>

      <div className="metrics">
        <div className="mc"><div className="mc-top"><div className="mc-icon ic-b">👁</div><span className="mc-trend tr-up">+18%</span></div><div className="mc-num">24.4k</div><div className="mc-label">Visitors This Week</div></div>
        <div className="mc"><div className="mc-top"><div className="mc-icon ic-g">🎯</div><span className="mc-trend tr-up">+5%</span></div><div className="mc-num">7.6%</div><div className="mc-label">Conversion Rate</div></div>
        <div className="mc"><div className="mc-top"><div className="mc-icon ic-a">💰</div><span className="mc-trend tr-up">↓$4</span></div><div className="mc-num">$38</div><div className="mc-label">Cost per Acquisition</div></div>
        <div className="mc"><div className="mc-top"><div className="mc-icon ic-p">📣</div><span className="mc-trend tr-up">+2</span></div><div className="mc-num">6</div><div className="mc-label">Active Channels</div></div>
      </div>

      <div className="grid-2 mb-14">
        <div className="card">
          <div className="card-head"><div className="card-head-l"><span className="ch-title">Traffic Sources</span></div></div>
          <div className="chart-pad"><div className="chart-wrap" style={{ height: 180 }}>
            <DoughnutChart id="c-mkt-src" labels={['Organic','Paid','Direct','Social','Referral']} data={[38,26,18,12,6]} colors={['#2563eb','#c9820a','#9b9b96','#7c3aed','#2a9d5c']} />
          </div></div>
        </div>
        <div className="card">
          <div className="card-head"><div className="card-head-l"><span className="ch-title">Conversions by Channel</span></div></div>
          <div className="chart-pad"><div className="chart-wrap" style={{ height: 180 }}>
            <BarChart id="c-mkt-conv" labels={['Email','LinkedIn','Paid','SEO','Social']} data={[64,83,147,140,28]} colors={['#2563eb','#7c3aed','#c9820a','#2a9d5c','#c0392b']} />
          </div></div>
        </div>
      </div>

      <div className="card mb-14">
        <div className="card-head">
          <div className="card-head-l"><span className="ch-title">Campaign Performance</span><span className="ch-count">8</span></div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="f-input" style={{ minWidth: 130 }} type="text" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} />
            <select className="f-select" value={channelFilter} onChange={e => setChannelFilter(e.target.value)}>
              <option value="">All channels</option>
              <option value="Email">Email</option><option value="LinkedIn">LinkedIn</option>
              <option value="Paid">Paid</option><option value="SEO">SEO</option><option value="Social">Social</option>
            </select>
            <select className="f-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">All statuses</option>
              <option value="active">Active</option><option value="paused">Paused</option><option value="ended">Ended</option>
            </select>
          </div>
        </div>
        <div className="tbl-wrap">
          <table><thead><tr>
            <th>Campaign<span className="sort-ic">↕</span></th><th>Channel</th>
            <th>Impressions<span className="sort-ic">↕</span></th><th>Clicks<span className="sort-ic">↕</span></th>
            <th>CTR</th><th>Conversions<span className="sort-ic">↕</span></th>
            <th>Spend<span className="sort-ic">↕</span></th><th>CAC</th><th>Status</th>
          </tr></thead>
          <tbody>
            {filtered.length === 0 && <tr><td colSpan={9} className="empty">No campaigns found</td></tr>}
            {filtered.map(r => {
              const ctr = (r.clicks / r.impressions * 100).toFixed(1);
              const cac = r.conversions > 0 ? '$' + (r.spend / r.conversions).toFixed(0) : '—';
              return (
                <tr key={r.id}>
                  <td><b>{r.name}</b></td>
                  <td><span style={{ fontSize: 11, fontWeight: 500, padding: '2px 7px', borderRadius: 4, background: 'var(--s2)', color: 'var(--text-2)' }}>{r.channel}</span></td>
                  <td style={{ fontFamily: 'var(--mono)' }}>{r.impressions.toLocaleString()}</td>
                  <td style={{ fontFamily: 'var(--mono)' }}>{r.clicks.toLocaleString()}</td>
                  <td style={{ fontFamily: 'var(--mono)' }}>{ctr}%</td>
                  <td style={{ fontFamily: 'var(--mono)' }}>{r.conversions}</td>
                  <td style={{ fontFamily: 'var(--mono)' }}>${r.spend.toLocaleString()}</td>
                  <td style={{ fontFamily: 'var(--mono)' }}>{cac}</td>
                  <td><span className={`badge ${stCls[r.status]}`}>{stLabel[r.status]}</span></td>
                </tr>
              );
            })}
          </tbody></table>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-head"><div className="card-head-l"><span className="ch-title">Weekly Visitors</span></div></div>
          <div className="chart-pad"><div className="chart-wrap">
            <LineChart id="c-mkt-visitors" labels={['Mon','Tue','Wed','Thu','Fri','Sat','Sun']} data={[18400,21200,19800,22400,24100,20800,24381]} color="#2a9d5c" />
          </div></div>
        </div>
        <div className="card">
          <div className="card-head"><div className="card-head-l"><span className="ch-title">CPA Trend</span></div></div>
          <div className="chart-pad"><div className="chart-wrap">
            <LineChart id="c-mkt-cpa" labels={['Mon','Tue','Wed','Thu','Fri','Sat','Sun']} data={[52,48,45,44,41,39,38]} color="#c9820a" />
          </div></div>
        </div>
      </div>
    </div>
  );
}
