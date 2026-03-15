'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';

function SafeHtml({ html }) {
  const clean = (html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '');
  return <div dangerouslySetInnerHTML={{ __html: clean }} style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-2)' }} />;
}

function TimeAgo({ date }) {
  if (!date) return null;
  const d = new Date(date);
  const now = new Date();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return <span>{diff}s ago</span>;
  if (diff < 3600) return <span>{Math.floor(diff / 60)}m ago</span>;
  if (diff < 86400) return <span>{Math.floor(diff / 3600)}h ago</span>;
  if (diff < 604800) return <span>{Math.floor(diff / 86400)}d ago</span>;
  return <span>{d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>;
}

export default function InboxPage() {
  const [threads, setThreads] = useState([]);
  const [mailboxes, setMailboxes] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedThread, setSelectedThread] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [mailboxFilter, setMailboxFilter] = useState('');
  const [search, setSearch] = useState('');
  const [threadPage, setThreadPage] = useState(1);
  const [pagination, setPagination] = useState({});

  const fetchInbox = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (mailboxFilter) params.set('mailbox', mailboxFilter);
      params.set('threadPage', String(threadPage));
      const res = await fetch(`/api/crm/inbox?${params}`);
      const json = await res.json();
      if (json.success) {
        setThreads(json.threads || []);
        setMailboxes(json.mailboxes || []);
        setStats(json.stats || {});
        setPagination(json.pagination || {});
      }
    } catch (err) {
      console.error('Failed to fetch inbox:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, mailboxFilter, threadPage]);

  useEffect(() => { fetchInbox(); }, [fetchInbox]);

  // Client-side search
  const filteredThreads = useMemo(() => {
    if (!search) return threads;
    const s = search.toLowerCase();
    return threads.filter(t =>
      (t.prospect?.name || '').toLowerCase().includes(s) ||
      (t.prospect?.email || '').toLowerCase().includes(s) ||
      (t.campaign?.name || '').toLowerCase().includes(s) ||
      t.messages.some(m => (m.subject || '').toLowerCase().includes(s))
    );
  }, [threads, search]);

  return (
    <div className="page-content active" id="page-inbox">
      <div className="ph">
        <div className="ph-left">
          <h1>📬 Inbox</h1>
          <p>Campaign emails and replies across all mailboxes</p>
        </div>
        <div className="ph-actions">
          <button className="t-btn" onClick={fetchInbox} title="Refresh">↻ Refresh</button>
        </div>
      </div>

      {/* Stats */}
      <div className="metrics three">
        <div className="mc"><div className="mc-top"><div className="mc-icon ic-b">📤</div></div><div className="mc-num">{stats.totalSent || 0}</div><div className="mc-label">Emails Sent</div></div>
        <div className="mc"><div className="mc-top"><div className="mc-icon ic-g">💬</div></div><div className="mc-num">{stats.totalReplied || 0}</div><div className="mc-label">Replies</div></div>
        <div className="mc"><div className="mc-top"><div className="mc-icon ic-a">🧵</div></div><div className="mc-num">{pagination.totalThreads || 0}</div><div className="mc-label">Threads</div></div>
      </div>

      {/* Filters */}
      <div className="filter-row">
        <input className="f-input" type="text" placeholder="Search by name, email, subject…" value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1 }} />
        <select className="f-select" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setSelectedThread(null); setThreadPage(1); }}>
          <option value="">All emails</option>
          <option value="replied">Replied only</option>
          <option value="sent">Sent only</option>
        </select>
        <select className="f-select" value={mailboxFilter} onChange={e => { setMailboxFilter(e.target.value); setSelectedThread(null); setThreadPage(1); }}>
          <option value="">All mailboxes</option>
          {mailboxes.map(m => <option key={m._id} value={m._id}>{m.fromEmail}</option>)}
        </select>
      </div>

      {/* Inbox Layout */}
      <div style={{ display: 'flex', gap: 0, minHeight: 500 }}>
        {/* Thread List */}
        <div className="card" style={{ width: selectedThread ? '38%' : '100%', borderRadius: selectedThread ? '12px 0 0 12px' : 12, overflow: 'hidden', transition: 'width 0.2s', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, maxHeight: 520, overflowY: 'auto' }}>
            {loading && <div className="empty">Loading inbox…</div>}
            {!loading && filteredThreads.length === 0 && (
              <div className="empty" style={{ padding: 32 }}>
                {statusFilter === 'replied' ? 'No replies found yet.' : 'No emails found.'}
              </div>
            )}
            {filteredThreads.map(t => {
              const isActive = selectedThread?.threadKey === t.threadKey;
              const lastMsg = t.messages[t.messages.length - 1];
              const preview = (lastMsg?.content || '').replace(/<[^>]*>/g, '').slice(0, 80);
              return (
                <div
                  key={t.threadKey}
                  onClick={() => setSelectedThread(t)}
                  style={{
                    padding: '12px 16px',
                    cursor: 'pointer',
                    borderBottom: '1px solid var(--border)',
                    background: isActive ? 'rgba(37,99,235,0.06)' : 'transparent',
                    borderLeft: isActive ? '3px solid var(--blue)' : '3px solid transparent',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--s2)'; }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = isActive ? 'rgba(37,99,235,0.06)' : 'transparent'; }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: t.hasReply ? 'var(--green)' : 'var(--blue)',
                      color: '#fff', fontSize: 12, fontWeight: 600,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      {(t.prospect?.name || '?')[0].toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {t.prospect?.name || 'Unknown'}
                        </span>
                        {t.hasReply && <span style={{ fontSize: 9, fontWeight: 600, padding: '1px 6px', borderRadius: 3, background: 'rgba(34,197,94,0.12)', color: 'var(--green)' }}>REPLIED</span>}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.prospect?.email}</div>
                    </div>
                    <div style={{ flexShrink: 0, textAlign: 'right' }}>
                      <div style={{ fontSize: 10, color: 'var(--text-4)', fontFamily: 'var(--mono)' }}><TimeAgo date={t.lastMessageAt} /></div>
                      <div style={{ fontSize: 10, color: 'var(--text-4)', marginTop: 2 }}>
                        {t.sentCount || 0} sent{t.replyCount > 0 && <span style={{ color: 'var(--green)' }}> · {t.replyCount} reply</span>}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingLeft: 40, marginTop: 3 }}>
                    {lastMsg?.subject || preview || '(no content)'}
                  </div>
                  {t.campaign && <div style={{ fontSize: 10, color: 'var(--text-4)', paddingLeft: 40, marginTop: 1 }}>📧 {t.campaign.name}</div>}
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {pagination.totalThreadPages > 1 && (
            <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-3)' }}>
              <span>Page {pagination.threadPage} of {pagination.totalThreadPages} ({pagination.totalThreads} threads)</span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="t-btn" disabled={threadPage <= 1} onClick={() => { setThreadPage(p => p - 1); setSelectedThread(null); }} style={{ fontSize: 11, padding: '4px 10px' }}>← Prev</button>
                <button className="t-btn" disabled={threadPage >= pagination.totalThreadPages} onClick={() => { setThreadPage(p => p + 1); setSelectedThread(null); }} style={{ fontSize: 11, padding: '4px 10px' }}>Next →</button>
              </div>
            </div>
          )}
        </div>

        {/* Conversation View */}
        {selectedThread && (
          <div className="card" style={{ flex: 1, borderRadius: '0 12px 12px 0', borderLeft: '1px solid var(--border)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', background: 'var(--s2)', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-1)' }}>{selectedThread.prospect?.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 1 }}>{selectedThread.prospect?.email}
                    {selectedThread.prospect?.company && <span> · {selectedThread.prospect.company}</span>}
                  </div>
                  {selectedThread.campaign && <div style={{ fontSize: 11, color: 'var(--blue)', marginTop: 2 }}>📧 {selectedThread.campaign.name}</div>}
                  {selectedThread.mailbox && <div style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 1 }}>via {selectedThread.mailbox.fromEmail}</div>}
                </div>
                <button onClick={() => setSelectedThread(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--text-3)', padding: 4 }}>✕</button>
              </div>
            </div>

            {/* Thread Messages */}
            <div style={{ flex: 1, maxHeight: 500, overflowY: 'auto', padding: '8px 0' }}>
              {selectedThread.messages.map((msg, idx) => {
                const isInbound = msg.direction === 'inbound';
                return (
                  <div key={msg._id || idx}>
                    {/* The sent/received message */}
                    <div style={{ padding: '12px 20px', borderBottom: msg.replies?.length ? 'none' : '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <div style={{
                          width: 26, height: 26, borderRadius: '50%',
                          background: isInbound ? 'var(--green)' : 'var(--blue)',
                          color: '#fff', fontSize: 10, fontWeight: 600,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}>
                          {isInbound ? '↙' : '↗'}
                        </div>
                        <div style={{ flex: 1 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: isInbound ? 'var(--green)' : 'var(--blue)' }}>
                            {isInbound ? selectedThread.prospect?.name : (selectedThread.mailbox?.fromName || 'You')}
                          </span>
                          <span style={{ fontSize: 11, color: 'var(--text-4)', marginLeft: 6 }}>
                            {isInbound ? '(reply)' : '(sent)'}
                          </span>
                          <span style={{ fontSize: 11, color: 'var(--text-4)', marginLeft: 8 }}>
                            {new Date(msg.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <span style={{
                          fontSize: 10, padding: '2px 6px', borderRadius: 3,
                          background: msg.status === 'replied' ? 'rgba(34,197,94,0.1)' : msg.status === 'opened' ? 'rgba(99,102,241,0.1)' : 'rgba(37,99,235,0.08)',
                          color: msg.status === 'replied' ? 'var(--green)' : msg.status === 'opened' ? 'var(--purple)' : 'var(--blue)',
                          fontWeight: 500
                        }}>
                          {msg.status}
                        </span>
                      </div>
                      {msg.subject && <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', marginBottom: 4, paddingLeft: 34 }}>{msg.subject}</div>}
                      <div style={{ paddingLeft: 34 }}>
                        {msg.content?.includes('<') ? <SafeHtml html={msg.content} /> : (
                          <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-2)', whiteSpace: 'pre-wrap' }}>{msg.content || '(no content)'}</div>
                        )}
                      </div>
                    </div>

                    {/* Inline replies extracted from events */}
                    {msg.replies?.map((reply, ri) => (
                      <div key={ri} style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', background: 'rgba(34,197,94,0.03)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <div style={{
                            width: 26, height: 26, borderRadius: '50%',
                            background: 'var(--green)', color: '#fff', fontSize: 10, fontWeight: 600,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                          }}>↙</div>
                          <div style={{ flex: 1 }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--green)' }}>
                              {selectedThread.prospect?.name || reply.from}
                            </span>
                            <span style={{ fontSize: 11, color: 'var(--text-4)', marginLeft: 6 }}>(reply)</span>
                            <span style={{ fontSize: 11, color: 'var(--text-4)', marginLeft: 8 }}>
                              {new Date(reply.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 3, background: 'rgba(34,197,94,0.1)', color: 'var(--green)', fontWeight: 500 }}>reply</span>
                        </div>
                        <div style={{ paddingLeft: 34 }}>
                          {reply.html ? <SafeHtml html={reply.html} /> : (
                            <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-2)', whiteSpace: 'pre-wrap' }}>{reply.text || '(empty reply)'}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
