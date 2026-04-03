'use client';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { DoughnutChart } from './Charts';
import AddLeadModal from './AddLeadModal';
import BulkUploadModal from './BulkUploadModal';
import LeadDetailPanel from './LeadDetailPanel';

const STATUS_LIST = [
  { value: 'new', label: 'New', cls: 'b-new', color: '#94a3b8' },
  { value: 'messaged', label: 'Messaged', cls: 'b-msg', color: '#2563eb' },
  { value: 'replied', label: 'Replied', cls: 'b-repl', color: '#7c3aed' },
  { value: 'conversation', label: 'Conversation', cls: 'b-conv', color: '#0891b2' },
  { value: 'interested', label: 'Interested', cls: 'b-int', color: '#059669' },
  { value: 'demo', label: 'Demo', cls: 'b-demo', color: '#d97706' },
  { value: 'closed_won', label: 'Closed Won', cls: 'b-won', color: '#16a34a' },
  { value: 'closed_lost', label: 'Closed Lost', cls: 'b-lost', color: '#6b7280' },
  { value: 'not_interested', label: 'Not Interested', cls: 'b-noint', color: '#dc2626' },
];

const statusMap = Object.fromEntries(STATUS_LIST.map(s => [s.value, s]));

export default function LinkedInPage({ currentUser }) {
  const [leads, setLeads] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [stats, setStats] = useState({ total: 0, statusCounts: {}, followUpsDue: 0 });
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('');
  const [page, setPage] = useState(1);

  const [modal, setModal] = useState(null); // 'add' | 'bulk' | null
  const [detailId, setDetailId] = useState(null);
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

  const exportLeads = async (mode) => {
    setExporting(true);
    setShowExportMenu(false);
    try {
      const params = new URLSearchParams();
      if (mode === 'filtered') {
        if (search) params.set('search', search);
        if (statusFilter) params.set('status', statusFilter);
        if (ownerFilter) params.set('owner', ownerFilter);
      }
      const res = await fetch(`/api/crm/linkedin/export?${params}`);
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `LinkedIn_Outreach_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) { console.error('Export error:', err); }
    setExporting(false);
  };

  const fetchLeads = useCallback(async (pg = page) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: pg, limit: 25 });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      if (ownerFilter) params.set('owner', ownerFilter);

      const res = await fetch(`/api/crm/linkedin?${params}`);
      const json = await res.json();
      if (json.success) {
        setLeads(json.leads);
        setPagination(json.pagination);
        setStats(json.stats);
      }
    } catch (err) { console.error(err); }
    setLoading(false);
  }, [page, search, statusFilter, ownerFilter]);

  useEffect(() => { fetchLeads(1); setPage(1); }, [search, statusFilter, ownerFilter]);
  useEffect(() => { fetchLeads(page); }, [page]);

  const handleStatusChange = async (leadId, newStatus) => {
    try {
      await fetch(`/api/crm/linkedin/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-crm-user': currentUser },
        body: JSON.stringify({ status: newStatus }),
      });
      fetchLeads(page);
    } catch (err) { console.error(err); }
  };

  const onModalSaved = () => { setModal(null); fetchLeads(1); setPage(1); };

  const doughnutLabels = STATUS_LIST.map(s => s.label);
  const doughnutData = STATUS_LIST.map(s => stats.statusCounts[s.value] || 0);
  const doughnutColors = STATUS_LIST.map(s => s.color);

  // Follow-ups due today
  const todayLeads = leads.filter(l => {
    if (!l.nextFollowUp) return false;
    const fu = new Date(l.nextFollowUp);
    const now = new Date();
    return fu <= new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  });

  const hasActiveFilter = !!(search || statusFilter || ownerFilter);

  return (
    <div className="page-content active" id="page-linkedin">
      <div className="ph">
        <div className="ph-left"><h1>LinkedIn Outreach</h1><p>Monitor and manage social outreach.</p></div>
        <div className="ph-actions" style={{ display: 'flex', gap: 8 }}>
          <div ref={exportRef} style={{ position: 'relative' }}>
            <button
              className="t-btn"
              onClick={() => setShowExportMenu(!showExportMenu)}
              disabled={exporting}
              style={{ display: 'flex', alignItems: 'center', gap: 4 }}
            >
              {exporting ? '⏳ Exporting…' : '📥 Export'}
              <span style={{ fontSize: 9, opacity: 0.6 }}>▼</span>
            </button>
            {showExportMenu && (
              <div style={{
                position: 'absolute', top: '100%', right: 0, marginTop: 4, zIndex: 50,
                background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: 8,
                boxShadow: '0 8px 24px rgba(0,0,0,.15)', minWidth: 200, overflow: 'hidden',
              }}>
                <button
                  onClick={() => exportLeads('all')}
                  style={{
                    display: 'block', width: '100%', padding: '10px 14px', border: 'none',
                    background: 'transparent', textAlign: 'left', cursor: 'pointer',
                    fontSize: 12, color: 'var(--text-1)', transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--s2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ fontWeight: 600 }}>📊 Export All Leads</div>
                  <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>
                    All {stats.total} leads with conversations
                  </div>
                </button>
                <div style={{ height: 1, background: 'var(--border)' }} />
                <button
                  onClick={() => exportLeads('filtered')}
                  disabled={!hasActiveFilter}
                  style={{
                    display: 'block', width: '100%', padding: '10px 14px', border: 'none',
                    background: 'transparent', textAlign: 'left', cursor: hasActiveFilter ? 'pointer' : 'default',
                    fontSize: 12, color: hasActiveFilter ? 'var(--text-1)' : 'var(--text-4)',
                    opacity: hasActiveFilter ? 1 : 0.5, transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => { if (hasActiveFilter) e.currentTarget.style.background = 'var(--s2)'; }}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ fontWeight: 600 }}>🔍 Export Filtered View</div>
                  <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>
                    {hasActiveFilter
                      ? `${pagination.total} leads matching current filters`
                      : 'Apply filters first'}
                  </div>
                </button>
              </div>
            )}
          </div>
          <button className="t-btn" onClick={() => setModal('bulk')}>📁 Bulk Upload</button>
          <button className="t-btn accent" onClick={() => setModal('add')}>+ Add Lead</button>
        </div>
      </div>

      {/* Metrics */}
      <div className="metrics">
        <div className="mc"><div className="mc-top"><div className="mc-icon ic-b">🔗</div></div><div className="mc-num">{stats.total}</div><div className="mc-label">Total Leads</div></div>
        <div className="mc"><div className="mc-top"><div className="mc-icon ic-g">💬</div></div><div className="mc-num">{stats.totalMessaged || 0}</div><div className="mc-label">Messaged</div></div>
        <div className="mc"><div className="mc-top"><div className="mc-icon ic-p">↩</div></div><div className="mc-num">{stats.statusCounts.replied || 0}</div><div className="mc-label">Replied</div></div>
        <div className="mc"><div className="mc-top"><div className="mc-icon ic-a">⏰</div></div><div className="mc-num">{stats.followUpsDue}</div><div className="mc-label">Follow-ups Due</div></div>
      </div>

      <div className="grid-linkedin">
        <div>
          {/* Filters */}
          <div className="filter-row">
            <input className="f-input" type="text" placeholder="Search leads…" value={search} onChange={e => setSearch(e.target.value)} />
            <select className="f-select" value={ownerFilter} onChange={e => setOwnerFilter(e.target.value)}>
              <option value="">All owners</option>
              <option value="Amaan">Amaan</option><option value="Ayushman">Ayushman</option>
            </select>
            <select className="f-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">All statuses</option>
              {STATUS_LIST.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>

          {/* Table */}
          <div className="card">
            <div className="tbl-wrap">
              <table>
                <thead><tr>
                  <th>Name</th>
                  <th>City</th>
                  <th>Owner</th>
                  <th>Messages Sent</th>
                  <th>Replies</th>
                  <th>Follow-up</th>
                  <th>Status</th>
                  <th style={{ width: 30 }}>🔗</th>
                </tr></thead>
                <tbody>
                  {loading && <tr><td colSpan={8} className="empty">Loading…</td></tr>}
                  {!loading && leads.length === 0 && <tr><td colSpan={8} className="empty">No leads found. Add your first lead!</td></tr>}
                  {!loading && leads.map(l => (
                    <tr key={l._id} onClick={() => setDetailId(l._id)} style={{ cursor: 'pointer' }}>
                      <td><b>{l.firstName} {l.lastName}</b></td>
                      <td>{l.city}</td>
                      <td>{l.owner}</td>
                      <td style={{ fontFamily: 'var(--mono)' }}>{l.messages_sent || 0}</td>
                      <td style={{ fontFamily: 'var(--mono)' }}>{l.replies || 0}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--mono)' }}>
                        {l.nextFollowUp ? new Date(l.nextFollowUp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                      </td>
                      <td onClick={e => e.stopPropagation()}>
                        <select
                          className={`badge-select ${statusMap[l.status]?.cls || ''}`}
                          value={l.status}
                          onChange={e => handleStatusChange(l._id, e.target.value)}
                        >
                          {STATUS_LIST.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                      </td>
                      <td onClick={e => e.stopPropagation()}>
                        {l.linkedInUrl ? (
                          <a href={l.linkedInUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', fontSize: 12 }}>↗</a>
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 16px', borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--text-3)',
              }}>
                <span>Showing {((page - 1) * 25) + 1}–{Math.min(page * 25, pagination.total)} of {pagination.total}</span>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage(p => p - 1)}
                    style={{
                      padding: '4px 10px', borderRadius: 4, border: '1px solid var(--border)',
                      background: 'var(--s2)', color: 'var(--text-2)', cursor: page <= 1 ? 'default' : 'pointer',
                      opacity: page <= 1 ? 0.4 : 1, fontSize: 12,
                    }}
                  >← Prev</button>
                  <span style={{ padding: '4px 8px', fontSize: 12, color: 'var(--text-2)' }}>
                    {page} / {pagination.totalPages}
                  </span>
                  <button
                    disabled={page >= pagination.totalPages}
                    onClick={() => setPage(p => p + 1)}
                    style={{
                      padding: '4px 10px', borderRadius: 4, border: '1px solid var(--border)',
                      background: 'var(--s2)', color: 'var(--text-2)', cursor: page >= pagination.totalPages ? 'default' : 'pointer',
                      opacity: page >= pagination.totalPages ? 0.4 : 1, fontSize: 12,
                    }}
                  >Next →</button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right column: Follow-ups + Status Breakdown */}
        <div>
          <div className="card mb-14">
            <div className="card-head"><div className="card-head-l"><span className="ch-title">Follow-ups Due</span><span className="ch-count">{stats.followUpsDue}</span></div></div>
            <div>
              {todayLeads.length === 0 && <div className="empty" style={{ padding: 16 }}>No follow-ups due</div>}
              {todayLeads.slice(0, 8).map(r => (
                <div key={r._id} className="followup-item" onClick={() => setDetailId(r._id)} style={{ cursor: 'pointer' }}>
                  <div className="fu-avatar">{(r.firstName?.[0] || '') + (r.lastName?.[0] || '')}</div>
                  <div><div className="fu-name">{r.firstName} {r.lastName}</div><div className="fu-day">{r.owner}</div></div>
                  <span className="fu-due">Due {new Date(r.nextFollowUp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="card">
            <div className="card-head"><div className="card-head-l"><span className="ch-title">Status Breakdown</span></div></div>
            <div className="chart-pad" style={{ paddingBottom: 10 }}><div className="chart-wrap" style={{ height: 130 }}>
              <DoughnutChart id="c-li-status" labels={doughnutLabels} data={doughnutData} colors={doughnutColors} />
            </div></div>
            <div style={{ padding: '0 18px 14px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {STATUS_LIST.map(s => {
                const count = stats.statusCounts[s.value] || 0;
                if (count === 0) return null;
                return (
                  <span key={s.value} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-3)' }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: s.color, display: 'inline-block' }} />
                    {s.label} {count}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {modal === 'add' && <AddLeadModal currentUser={currentUser} onClose={() => setModal(null)} onSaved={onModalSaved} />}
      {modal === 'bulk' && <BulkUploadModal currentUser={currentUser} onClose={() => setModal(null)} onSaved={onModalSaved} />}
      {detailId && <LeadDetailPanel leadId={detailId} currentUser={currentUser} onClose={() => setDetailId(null)} onUpdated={() => fetchLeads(page)} />}
    </div>
  );
}
