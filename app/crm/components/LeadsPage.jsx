'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import LeadKanbanBoard from './LeadKanbanBoard';
import LeadDetailDrawer from './LeadDetailDrawer';
import AddLeadDrawer from './AddLeadDrawer';

const STAGES = [
  { id: 'prospect', label: 'Prospect', icon: '◇' },
  { id: 'lead', label: 'Lead', icon: '◈' },
  { id: 'qualified_lead', label: 'Qualified', icon: '◆' },
  { id: 'pipeline_opportunity', label: 'Opportunity', icon: '⬡' },
  { id: 'client', label: 'Client', icon: '★' },
  { id: 'churned', label: 'Churned', icon: '✕' },
];

const HEAT_CFG = {
  cold: { label: 'Cold', cls: 'heat-cold', icon: '❄' },
  warm: { label: 'Warm', cls: 'heat-warm', icon: '🌡' },
  hot: { label: 'Hot', cls: 'heat-hot', icon: '🔥' },
};

const INTENT_LABELS = {
  unknown: 'Unknown', curious: 'Curious', exploring: 'Exploring',
  looking_actively: 'Looking Actively', immediate_need: 'Immediate Need',
};

const SOURCE_LABELS = {
  apollo: 'Apollo', linkedin_outbound: 'LinkedIn', facebook_ads: 'Facebook Ads',
  organic_website: 'Organic', referral: 'Referral', cold_email: 'Cold Email',
  webinar: 'Webinar', newsletter: 'Newsletter', instagram: 'Instagram',
  manual_import: 'Manual', csv_import: 'CSV Import', google_ads: 'Google Ads',
  partnership: 'Partnership', other: 'Other',
};

const PRIORITY_CFG = {
  low: { cls: 'prio-low', label: 'Low' },
  medium: { cls: 'prio-med', label: 'Med' },
  high: { cls: 'prio-high', label: 'High' },
  urgent: { cls: 'prio-urgent', label: 'Urgent' },
};

export default function LeadsPage({ currentUser }) {
  const [leads, setLeads] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('table'); // 'table' | 'kanban'
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 0 });

  // Filters
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [heatFilter, setHeatFilter] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [overdueFilter, setOverdueFilter] = useState(false);
  const [sort, setSort] = useState('-lastActivityAt');

  // Drawers
  const [selectedLead, setSelectedLead] = useState(null);
  const [showAddDrawer, setShowAddDrawer] = useState(false);

  const fetchLeads = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(pagination.limit));
      params.set('sort', sort);
      if (search) params.set('search', search);
      if (stageFilter) params.set('stage', stageFilter);
      if (heatFilter) params.set('heat', heatFilter);
      if (ownerFilter) params.set('owner', ownerFilter);
      if (sourceFilter) params.set('source', sourceFilter);
      if (overdueFilter) params.set('overdue', 'true');

      const res = await fetch(`/api/crm/leads?${params}`);
      const json = await res.json();
      if (json.success) {
        setLeads(json.leads || []);
        setPagination(json.pagination || {});
        setStats(json.stats || {});
      }
    } catch (err) { console.error('Failed to fetch leads:', err); }
    finally { setLoading(false); }
  }, [search, stageFilter, heatFilter, ownerFilter, sourceFilter, overdueFilter, sort, pagination.limit]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const handleLeadClick = (lead) => setSelectedLead(lead);
  const handleCloseDetail = () => setSelectedLead(null);
  const handleLeadSaved = () => { fetchLeads(pagination.page); setSelectedLead(null); };
  const handleLeadCreated = () => { fetchLeads(1); setShowAddDrawer(false); };

  const handleStageDrop = async (leadId, newStage) => {
    try {
      await fetch(`/api/crm/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-crm-user': currentUser || 'Unknown' },
        body: JSON.stringify({ pipelineStage: newStage }),
      });
      fetchLeads(pagination.page);
    } catch (err) { console.error('Stage drop failed:', err); }
  };

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const timeAgo = (d) => {
    if (!d) return '—';
    const diff = Math.floor((Date.now() - new Date(d)) / 1000);
    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
    return formatDate(d);
  };

  // Active filter count
  const filterCount = [stageFilter, heatFilter, ownerFilter, sourceFilter, overdueFilter].filter(Boolean).length;

  return (
    <div className="page-content active" id="page-leads">
      {/* Page Header */}
      <div className="ph">
        <div className="ph-left">
          <h1>Lead Operating System</h1>
          <p>{stats.total || 0} total leads · {stats.heatCounts?.hot || 0} hot · {stats.overdueActions || 0} overdue</p>
        </div>
        <div className="ph-actions">
          <div className="ld-view-toggle">
            <button className={`ld-vt-btn ${view === 'table' ? 'active' : ''}`} onClick={() => setView('table')} title="Table View">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="1" y="2" width="14" height="3" rx="1" fill="currentColor" opacity=".7"/><rect x="1" y="7" width="14" height="3" rx="1" fill="currentColor" opacity=".5"/><rect x="1" y="12" width="14" height="3" rx="1" fill="currentColor" opacity=".3"/></svg>
            </button>
            <button className={`ld-vt-btn ${view === 'kanban' ? 'active' : ''}`} onClick={() => setView('kanban')} title="Kanban View">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="4" height="14" rx="1" fill="currentColor" opacity=".7"/><rect x="6" y="1" width="4" height="10" rx="1" fill="currentColor" opacity=".5"/><rect x="11" y="1" width="4" height="12" rx="1" fill="currentColor" opacity=".3"/></svg>
            </button>
          </div>
          <button className="t-btn accent" onClick={() => setShowAddDrawer(true)}>+ Add Lead</button>
        </div>
      </div>

      {/* Quick Stats Chips */}
      <div className="ld-stat-chips">
        {STAGES.filter(s => s.id !== 'churned').map(s => (
          <button
            key={s.id}
            className={`ld-chip ${stageFilter === s.id ? 'active' : ''}`}
            onClick={() => setStageFilter(stageFilter === s.id ? '' : s.id)}
          >
            <span className="ld-chip-icon">{s.icon}</span>
            <span className="ld-chip-label">{s.label}</span>
            <span className="ld-chip-count">{stats.stageCounts?.[s.id]?.count ?? stats.stageCounts?.[s.id] ?? 0}</span>
          </button>
        ))}
      </div>

      {/* Filters Row */}
      <div className="ld-filter-row">
        <div className="ld-search-wrap">
          <svg className="ld-search-icon" width="14" height="14" viewBox="0 0 16 16"><circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5" fill="none"/><line x1="10" y1="10.5" x2="14" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          <input className="ld-search" type="text" placeholder="Search leads…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="ld-filter-sel" value={heatFilter} onChange={e => setHeatFilter(e.target.value)}>
          <option value="">All Heat</option>
          <option value="cold">❄ Cold</option>
          <option value="warm">🌡 Warm</option>
          <option value="hot">🔥 Hot</option>
        </select>
        <select className="ld-filter-sel" value={ownerFilter} onChange={e => setOwnerFilter(e.target.value)}>
          <option value="">All Owners</option>
          <option value="Amaan">Amaan</option>
          <option value="Ayushman">Ayushman</option>
        </select>
        <select className="ld-filter-sel" value={sourceFilter} onChange={e => setSourceFilter(e.target.value)}>
          <option value="">All Sources</option>
          {Object.entries(SOURCE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button className={`ld-filter-btn ${overdueFilter ? 'active' : ''}`} onClick={() => setOverdueFilter(!overdueFilter)}>
          ⚠ Overdue
        </button>
        {filterCount > 0 && (
          <button className="ld-filter-clear" onClick={() => { setStageFilter(''); setHeatFilter(''); setOwnerFilter(''); setSourceFilter(''); setOverdueFilter(false); }}>
            Clear ({filterCount})
          </button>
        )}
      </div>

      {/* Content Area */}
      {view === 'kanban' ? (
        <LeadKanbanBoard
          leads={leads}
          stages={STAGES.filter(s => s.id !== 'churned')}
          heatCfg={HEAT_CFG}
          onLeadClick={handleLeadClick}
          onStageDrop={handleStageDrop}
          loading={loading}
          timeAgo={timeAgo}
        />
      ) : (
        <>
          {/* Table */}
          <div className="card ld-table-card">
            <div className="tbl-wrap">
              <table className="ld-table">
                <thead>
                  <tr>
                    <th className="ld-th-name">Lead</th>
                    <th className="ld-th-heat">Heat</th>
                    <th className="ld-th-stage">Stage</th>
                    <th className="ld-th-intent hide-mobile">Intent</th>
                    <th className="ld-th-next">Next Action</th>
                    <th className="ld-th-owner hide-mobile">Owner</th>
                    <th className="ld-th-activity hide-mobile">Activity</th>
                    <th className="ld-th-value hide-mobile">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && <tr><td colSpan={8} className="empty">Loading leads…</td></tr>}
                  {!loading && leads.length === 0 && (
                    <tr><td colSpan={8} className="empty">
                      <div style={{ padding: 32 }}>
                        <div style={{ fontSize: 28, marginBottom: 8 }}>◇</div>
                        <div style={{ fontWeight: 600, marginBottom: 4 }}>No leads found</div>
                        <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Add your first lead to get started</div>
                      </div>
                    </td></tr>
                  )}
                  {leads.map(lead => {
                    const heat = HEAT_CFG[lead.heatLevel] || HEAT_CFG.cold;
                    const stageCfg = STAGES.find(s => s.id === lead.pipelineStage) || STAGES[0];
                    const prio = PRIORITY_CFG[lead.priority] || PRIORITY_CFG.medium;
                    const isOverdue = lead.nextAction?.dueDate && new Date(lead.nextAction.dueDate) < new Date();

                    return (
                      <tr key={lead._id} className="ld-row" onClick={() => handleLeadClick(lead)}>
                        <td className="ld-td-name">
                          <div className={`ld-avatar ${heat.cls}`}>
                            {(lead.firstName?.[0] || '?').toUpperCase()}
                          </div>
                          <div className="ld-name-wrap">
                            <div className="ld-name">{lead.firstName} {lead.lastName}</div>
                            <div className="ld-company">{lead.company || lead.email}</div>
                          </div>
                        </td>
                        <td>
                          <span className={`ld-heat-badge ${heat.cls}`}>{heat.icon} {heat.label}</span>
                        </td>
                        <td>
                          <span className="ld-stage-badge">{stageCfg.icon} {stageCfg.label}</span>
                        </td>
                        <td className="hide-mobile">
                          <span className="ld-intent-tag">{INTENT_LABELS[lead.intentLevel] || '—'}</span>
                        </td>
                        <td>
                          {lead.nextAction?.type && lead.nextAction.type !== 'none' ? (
                            <div className={`ld-next-action ${isOverdue ? 'overdue' : ''}`}>
                              <span className="ld-na-text">{lead.nextAction.description || lead.nextAction.type}</span>
                              {lead.nextAction.dueDate && (
                                <span className={`ld-na-date ${isOverdue ? 'overdue' : ''}`}>{formatDate(lead.nextAction.dueDate)}</span>
                              )}
                            </div>
                          ) : (
                            <span className="ld-no-action">No action set</span>
                          )}
                        </td>
                        <td className="hide-mobile">
                          <span className="ld-owner-tag">{lead.owner}</span>
                        </td>
                        <td className="hide-mobile">
                          <span className="ld-activity-ago">{timeAgo(lead.lastActivityAt)}</span>
                        </td>
                        <td className="hide-mobile">
                          {lead.dealValue > 0 ? (
                            <span className="ld-deal-val">${lead.dealValue.toLocaleString()}</span>
                          ) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="ld-pagination">
                <span className="ld-pag-info">
                  {((pagination.page - 1) * pagination.limit) + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                </span>
                <div className="ld-pag-btns">
                  <button className="t-btn" disabled={pagination.page <= 1} onClick={() => fetchLeads(pagination.page - 1)}>← Prev</button>
                  <button className="t-btn" disabled={pagination.page >= pagination.totalPages} onClick={() => fetchLeads(pagination.page + 1)}>Next →</button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Lead Detail Drawer */}
      {selectedLead && (
        <LeadDetailDrawer
          leadId={selectedLead._id}
          currentUser={currentUser}
          onClose={handleCloseDetail}
          onSaved={handleLeadSaved}
          heatCfg={HEAT_CFG}
          stages={STAGES}
        />
      )}

      {/* Add Lead Drawer */}
      {showAddDrawer && (
        <AddLeadDrawer
          currentUser={currentUser}
          onClose={() => setShowAddDrawer(false)}
          onCreated={handleLeadCreated}
        />
      )}
    </div>
  );
}
