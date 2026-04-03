'use client';
import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { BarChart, LineChart } from './Charts';

export default function EmailCampaignsPage({ data: initialData }) {
  const [dateRange, setDateRange] = useState('');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);

  // Export state
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exporting, setExporting] = useState(false);
  const exportRef = useRef(null);

  // Close export menu on outside click
  useEffect(() => {
    if (!showExportMenu) return;
    const handler = (e) => {
      if (exportRef.current && !exportRef.current.contains(e.target)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showExportMenu]);

  // ─── Export helpers ────────────────────────────────────────────────────
  const triggerDownload = async (url, fallbackName) => {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      // Try to get filename from Content-Disposition header
      const cd = res.headers.get('Content-Disposition');
      const match = cd && cd.match(/filename="?([^"]+)"?/);
      a.download = match ? match[1] : fallbackName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('Export error:', err);
      alert('Export failed — please try again.');
    }
  };

  const exportCampaigns = async (mode) => {
    setExporting(true);
    setShowExportMenu(false);
    const params = new URLSearchParams({ mode: 'summary' });
    if (mode === 'filtered') {
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
    }
    await triggerDownload(
      `/api/campaigns/export?${params}`,
      `Campaigns_Summary_${new Date().toISOString().slice(0, 10)}.csv`
    );
    setExporting(false);
  };

  const exportCampaignDetail = async (campaignId, campaignName) => {
    setExporting(true);
    const params = new URLSearchParams({ mode: 'detail', campaignId });
    const safeName = (campaignName || 'campaign').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30);
    await triggerDownload(
      `/api/campaigns/export?${params}`,
      `Campaign_${safeName}_Detail_${new Date().toISOString().slice(0, 10)}.csv`
    );
    setExporting(false);
  };

  // Refetch when date range changes
  const fetchData = useCallback(async () => {
    if (!dateRange) { setData(initialData); return; }
    setLoading(true);
    try {
      const params = new URLSearchParams({ dateRange });
      if (dateRange === 'custom' && customFrom) { params.set('from', customFrom); if (customTo) params.set('to', customTo); }
      const res = await fetch(`/api/crm/dashboard?${params}`);
      const json = await res.json();
      if (json.success) setData(json);
    } catch (err) { console.error('Failed to fetch:', err); }
    setLoading(false);
  }, [dateRange, customFrom, customTo, initialData]);

  useEffect(() => { fetchData(); }, [dateRange]);

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
  const totalReplies = campaigns.reduce((s, c) => s + (c.replies || 0), 0);

  const stCls = { active: 'b-run', running: 'b-run', paused: 'b-pau', completed: 'b-com', draft: 'b-pend' };
  const stLabel = { active: 'Running', running: 'Running', paused: 'Paused', completed: 'Done', draft: 'Draft' };
  const dateLabels = { '7d': '7 days', '14d': '14 days', '30d': '30 days', '90d': '90 days', 'custom': 'Custom' };

  function handleSort(key) {
    if (sortKey === key) setSortDir(d => -d);
    else { setSortKey(key); setSortDir(1); }
  }

  return (
    <div className="page-content active" id="page-email">
      <div className="ph">
        <div className="ph-left"><h1>Email Campaigns</h1><p>Track outbound email performance and conversion.</p></div>
        <div className="ph-actions" style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          {['7d', '14d', '30d', '90d'].map(v => (
            <button key={v} className="t-btn" onClick={() => setDateRange(dateRange === v ? '' : v)} style={{
              fontSize: 11, padding: '4px 10px',
              background: dateRange === v ? 'var(--blue)' : undefined,
              color: dateRange === v ? '#fff' : undefined,
              borderColor: dateRange === v ? 'var(--blue)' : undefined,
            }}>
              {dateLabels[v]}
            </button>
          ))}
          <button className="t-btn" onClick={() => setDateRange(dateRange === 'custom' ? '' : 'custom')} style={{
            fontSize: 11, padding: '4px 10px',
            background: dateRange === 'custom' ? 'var(--blue)' : undefined,
            color: dateRange === 'custom' ? '#fff' : undefined,
            borderColor: dateRange === 'custom' ? 'var(--blue)' : undefined,
          }}>
            Custom
          </button>

          {/* ── Export dropdown ── */}
          <div ref={exportRef} style={{ position: 'relative', display: 'inline-block' }}>
            <button
              className="t-btn"
              onClick={() => setShowExportMenu(!showExportMenu)}
              disabled={exporting}
              style={{
                fontSize: 11, padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 4,
                background: showExportMenu ? 'var(--blue)' : undefined,
                color: showExportMenu ? '#fff' : undefined,
                borderColor: showExportMenu ? 'var(--blue)' : undefined,
              }}
            >
              {exporting ? '⏳ Exporting…' : '📥 Export ▾'}
            </button>
            {showExportMenu && (
              <div style={{
                position: 'absolute', right: 0, top: '100%', marginTop: 4, minWidth: 210,
                background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8,
                boxShadow: '0 8px 24px rgba(0,0,0,.15)', zIndex: 100, overflow: 'hidden',
              }}>
                <button
                  onClick={() => exportCampaigns('all')}
                  style={{
                    display: 'block', width: '100%', padding: '10px 14px', border: 'none',
                    background: 'none', textAlign: 'left', cursor: 'pointer', fontSize: 12,
                    color: 'var(--text-1)', borderBottom: '1px solid var(--border)',
                  }}
                  onMouseEnter={e => e.target.style.background = 'var(--hover)'}
                  onMouseLeave={e => e.target.style.background = 'none'}
                >
                  📊 Export All Campaigns (Summary)
                </button>
                <button
                  onClick={() => exportCampaigns('filtered')}
                  style={{
                    display: 'block', width: '100%', padding: '10px 14px', border: 'none',
                    background: 'none', textAlign: 'left', cursor: 'pointer', fontSize: 12,
                    color: 'var(--text-1)',
                  }}
                  onMouseEnter={e => e.target.style.background = 'var(--hover)'}
                  onMouseLeave={e => e.target.style.background = 'none'}
                >
                  🔍 Export Filtered Campaigns{search || statusFilter ? ' (active filters)' : ''}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Custom Date Inputs */}
      {dateRange === 'custom' && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
          <label style={{ fontSize: 12, color: 'var(--text-3)' }}>From</label>
          <input type="date" className="f-input" value={customFrom} onChange={e => setCustomFrom(e.target.value)} style={{ minWidth: 130 }} />
          <label style={{ fontSize: 12, color: 'var(--text-3)' }}>To</label>
          <input type="date" className="f-input" value={customTo} onChange={e => setCustomTo(e.target.value)} style={{ minWidth: 130 }} />
          <button className="t-btn accent" onClick={fetchData} style={{ fontSize: 11, padding: '4px 12px' }}>Apply</button>
        </div>
      )}

      {loading && <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 8 }}>Refreshing data…</div>}

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
          <div className="card-head"><div className="card-head-l"><span className="ch-title">Emails Sent — {dateLabels[dateRange] || '7 days'}</span></div></div>
          <div className="chart-pad"><div className="chart-wrap tall">
            <BarChart id="c-email-sent" labels={chart.labels || []} data={chart.emailsSent7d || []} colors={Array(chart.labels?.length || 7).fill('#2563eb')} />
          </div></div>
        </div>
        <div className="card">
          <div className="card-head"><div className="card-head-l"><span className="ch-title">Reply Rate — {dateLabels[dateRange] || '7 days'}</span></div></div>
          <div className="chart-pad"><div className="chart-wrap tall">
            <LineChart id="c-email-replies" labels={chart.labels || []} data={chart.replies7d || []} color="#7c3aed" />
          </div></div>
        </div>
      </div>

      {/* Campaigns Table */}
      <div className="card mb-14">
        <div className="card-head">
          <div className="card-head-l"><span className="ch-title">All Campaigns</span>{dateRange && <span style={{ fontSize: 11, color: 'var(--text-3)', marginLeft: 8 }}>({dateLabels[dateRange] || dateRange})</span>}</div>
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
            <th>Steps</th>
            <th>Status</th>
            <th onClick={() => handleSort('sent')}>Sent<span className="sort-ic">↕</span></th>
            <th>Progress</th>
            <th onClick={() => handleSort('replies')}>Replies<span className="sort-ic">↕</span></th>
            <th>Reply %</th>
            <th style={{ width: 44, textAlign: 'center' }}>Export</th>
          </tr></thead>
          <tbody>
            {filtered.length === 0 && <tr><td colSpan={9} className="empty">No campaigns found</td></tr>}
            {filtered.map(c => {
              const totalExpected = c.totalExpected || c.leads || 1;
              const pct = Math.min(100, totalExpected > 0 ? Math.round((c.sent / totalExpected) * 100) : 0);
              return (
                <tr key={c._id}>
                  <td><b>{c.name}</b></td>
                  <td>{c.leads}</td>
                  <td style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-3)' }}>{c.totalSteps || 1}</td>
                  <td><span className={`badge ${stCls[c.status] || 'b-pend'}`}>{stLabel[c.status] || c.status}</span></td>
                  <td>{c.sent}<span style={{ fontSize: 10, color: 'var(--text-4)', marginLeft: 4 }}>/ {totalExpected}</span></td>
                  <td>
                    <div className="pbar-wrap">
                      <div className="pbar-track"><div className="pbar-fill" style={{ width: `${pct}%` }} /></div>
                      <span className="pbar-pct">{pct}%</span>
                    </div>
                  </td>
                  <td>{c.replies}</td>
                  <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{c.replyRate}%</td>
                  <td style={{ textAlign: 'center' }}>
                    <button
                      onClick={() => exportCampaignDetail(c._id, c.name)}
                      disabled={exporting}
                      title="Export all prospects &amp; emails for this campaign"
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer', fontSize: 16,
                        padding: '2px 6px', borderRadius: 4, opacity: exporting ? 0.4 : 1,
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => e.target.style.background = 'var(--hover)'}
                      onMouseLeave={e => e.target.style.background = 'none'}
                    >
                      📥
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody></table>
        </div>
      </div>
    </div>
  );
}
