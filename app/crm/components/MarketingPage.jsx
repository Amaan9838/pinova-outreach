'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import MarketingDetailPanel from './MarketingDetailPanel';
import NewCampaignModal from './NewCampaignModal';

const CH_CLS = { LinkedIn: 'ch-li', Website: 'ch-web', Facebook: 'ch-fb', Instagram: 'ch-ig' };
const ST_CLS = { active: 'b-run', scheduled: 'b-prog', completed: 'b-com', paused: 'b-pau' };
const ST_LBL = { active: 'Active', scheduled: 'Scheduled', completed: 'Completed', paused: 'Paused' };

export default function MarketingPage({ currentUser }) {
  const [campaigns, setCampaigns] = useState([]);
  const [metrics, setMetrics] = useState({ activeCampaigns: 0, postsScheduled: 0, postsPublished: 0, totalEngagement: 0 });
  const [owners, setOwners] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [channelFilter, setChannelFilter] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('');

  const [sortKey, setSortKey] = useState('');
  const [sortDir, setSortDir] = useState(1);

  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [showNewModal, setShowNewModal] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      if (channelFilter) params.set('channel', channelFilter);
      if (ownerFilter) params.set('owner', ownerFilter);

      const res = await fetch(`/api/crm/marketing?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setCampaigns(json.campaigns);
        setMetrics(json.metrics);
        setOwners(json.owners || []);
      }
    } catch (err) {
      console.error('Failed to fetch marketing data:', err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, channelFilter, ownerFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const sorted = useMemo(() => {
    if (!sortKey) return campaigns;
    return [...campaigns].sort((a, b) => {
      let av = a[sortKey], bv = b[sortKey];
      if (typeof av === 'string') { av = av.toLowerCase(); bv = bv.toLowerCase(); }
      return (av > bv ? 1 : av < bv ? -1 : 0) * sortDir;
    });
  }, [campaigns, sortKey, sortDir]);

  const maxEng = Math.max(...sorted.map(c => c.engagement || 0), 1);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir(d => -d);
    } else {
      setSortKey(key);
      setSortDir(1);
    }
  };

  const sortIcon = (key) => {
    if (sortKey !== key) return '↕';
    return sortDir === 1 ? '↑' : '↓';
  };

  const handleCampaignCreated = () => {
    setShowNewModal(false);
    fetchData();
  };

  const handleDetailClose = () => {
    setSelectedCampaign(null);
    fetchData(); // refresh after any changes
  };

  if (loading) {
    return (
      <div className="page-content active" id="page-marketing">
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)' }}>Loading marketing campaigns...</div>
      </div>
    );
  }

  return (
    <div className="page-content active" id="page-marketing">
      {/* Header */}
      <div className="ph">
        <div className="ph-left">
          <h1>Marketing Campaigns</h1>
          <p>Track and monitor campaigns across website, LinkedIn, Facebook, and Instagram.</p>
        </div>
        <div className="ph-right" style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary" onClick={() => setShowNewModal(true)}>+ New Campaign</button>
        </div>
      </div>

      {/* Metrics */}
      <div className="metrics">
        <div className="mc">
          <div className="mc-top"><div className="mc-icon ic-g">◎</div></div>
          <div className="mc-num">{metrics.activeCampaigns}</div>
          <div className="mc-label">Active Campaigns</div>
        </div>
        <div className="mc">
          <div className="mc-top"><div className="mc-icon ic-b">⏱</div></div>
          <div className="mc-num">{metrics.postsScheduled}</div>
          <div className="mc-label">Posts Scheduled</div>
        </div>
        <div className="mc">
          <div className="mc-top"><div className="mc-icon ic-a">✓</div></div>
          <div className="mc-num">{metrics.postsPublished}</div>
          <div className="mc-label">Posts Published</div>
        </div>
        <div className="mc">
          <div className="mc-top"><div className="mc-icon ic-p">◈</div></div>
          <div className="mc-num">{metrics.totalEngagement.toLocaleString()}</div>
          <div className="mc-label">Total Engagement</div>
        </div>
      </div>

      {/* Campaigns Table */}
      <div className="card">
        <div className="card-head">
          <div className="card-head-l">
            <span className="ch-title">All Campaigns</span>
            <span className="ch-count">{sorted.length}</span>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input className="f-input" style={{ minWidth: 150 }} type="text" placeholder="Search campaigns…"
              value={search} onChange={e => setSearch(e.target.value)} />
            <select className="f-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="scheduled">Scheduled</option>
              <option value="paused">Paused</option>
              <option value="completed">Completed</option>
            </select>
            <select className="f-select" value={channelFilter} onChange={e => setChannelFilter(e.target.value)}>
              <option value="">All channels</option>
              <option value="LinkedIn">LinkedIn</option>
              <option value="Website">Website</option>
              <option value="Facebook">Facebook</option>
              <option value="Instagram">Instagram</option>
            </select>
            <select className="f-select" value={ownerFilter} onChange={e => setOwnerFilter(e.target.value)}>
              <option value="">All owners</option>
              {owners.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        </div>

        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                <th onClick={() => handleSort('name')} style={{ cursor: 'pointer' }}>
                  Campaign name <span className="sort-ic">{sortIcon('name')}</span>
                </th>
                <th>Channels</th>
                <th onClick={() => handleSort('posts')} style={{ cursor: 'pointer' }}>
                  Posts <span className="sort-ic">{sortIcon('posts')}</span>
                </th>
                <th onClick={() => handleSort('owner')} style={{ cursor: 'pointer' }}>
                  Owner <span className="sort-ic">{sortIcon('owner')}</span>
                </th>
                <th>Status</th>
                <th onClick={() => handleSort('startDate')} style={{ cursor: 'pointer' }}>
                  Start <span className="sort-ic">{sortIcon('startDate')}</span>
                </th>
                <th onClick={() => handleSort('endDate')} style={{ cursor: 'pointer' }}>
                  End <span className="sort-ic">{sortIcon('endDate')}</span>
                </th>
                <th onClick={() => handleSort('engagement')} style={{ cursor: 'pointer' }}>
                  Engagement <span className="sort-ic">{sortIcon('engagement')}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 && (
                <tr><td colSpan={8} className="empty">No campaigns found</td></tr>
              )}
              {sorted.map(c => {
                const pct = Math.round((c.engagement || 0) / maxEng * 100);
                const fmtDate = (d) => {
                  if (!d) return '—';
                  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                };
                return (
                  <tr key={c._id} onClick={() => setSelectedCampaign(c._id)} style={{ cursor: 'pointer' }}>
                    <td><b>{c.name}</b></td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {(c.channels || []).map(ch => (
                          <span key={ch} className={`ch-badge-sm ${CH_CLS[ch] || ''}`}>{ch}</span>
                        ))}
                      </div>
                    </td>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: '12.5px' }}>{c.posts || 0}</td>
                    <td>{c.owner}</td>
                    <td><span className={`badge ${ST_CLS[c.status] || 'b-com'}`}>{ST_LBL[c.status] || c.status}</span></td>
                    <td style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--mono)' }}>{fmtDate(c.startDate)}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--mono)' }}>{fmtDate(c.endDate)}</td>
                    <td>
                      {c.engagement > 0 ? (
                        <div className="pbar">
                          <div className="pbar-track"><div className="pbar-fill" style={{ width: `${pct}%` }} /></div>
                          <span className="pbar-pct">{c.engagement.toLocaleString()}</span>
                        </div>
                      ) : (
                        <span style={{ fontSize: 12, color: 'var(--text-4)' }}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Panel */}
      {selectedCampaign && (
        <MarketingDetailPanel
          campaignId={selectedCampaign}
          currentUser={currentUser}
          onClose={handleDetailClose}
        />
      )}

      {/* New Campaign Modal */}
      {showNewModal && (
        <NewCampaignModal
          currentUser={currentUser}
          onClose={() => setShowNewModal(false)}
          onCreated={handleCampaignCreated}
        />
      )}
    </div>
  );
}
