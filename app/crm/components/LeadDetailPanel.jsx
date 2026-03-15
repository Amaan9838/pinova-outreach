'use client';
import { useState, useEffect, useRef } from 'react';

const STATUS_LIST = [
  { value: 'new', label: 'New', cls: 'b-new' },
  { value: 'messaged', label: 'Messaged', cls: 'b-msg' },
  { value: 'replied', label: 'Replied', cls: 'b-repl' },
  { value: 'conversation', label: 'Conversation', cls: 'b-conv' },
  { value: 'interested', label: 'Interested', cls: 'b-int' },
  { value: 'demo', label: 'Demo', cls: 'b-demo' },
  { value: 'closed_won', label: 'Closed Won', cls: 'b-won' },
  { value: 'closed_lost', label: 'Closed Lost', cls: 'b-lost' },
  { value: 'not_interested', label: 'Not Interested', cls: 'b-noint' },
];

const DIR_OPTIONS = [
  { value: 'outbound', label: '↗ Sent', icon: '↗' },
  { value: 'inbound', label: '↙ Received', icon: '↙' },
  { value: 'note', label: '📝 Note', icon: '📝' },
];

export default function LeadDetailPanel({ leadId, onClose, currentUser, onUpdated }) {
  const [lead, setLead] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newMsg, setNewMsg] = useState('');
  const [msgDir, setMsgDir] = useState('outbound');
  const [sending, setSending] = useState(false);
  const [editFollowUp, setEditFollowUp] = useState('');
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!leadId) return;
    fetchLead();
  }, [leadId]);

  const fetchLead = async () => {
    setLoading(true);
    try {
      const [leadRes, convRes] = await Promise.all([
        fetch(`/api/crm/linkedin/${leadId}`),
        fetch(`/api/crm/linkedin/${leadId}/conversations`),
      ]);
      const leadData = await leadRes.json();
      const convData = await convRes.json();
      if (leadData.success) {
        setLead(leadData.lead);
        setEditFollowUp(leadData.lead.nextFollowUp ? leadData.lead.nextFollowUp.split('T')[0] : '');
      }
      if (convData.success) setConversations(convData.conversations || []);
    } catch (err) { console.error(err); }
    setLoading(false);
    setTimeout(() => scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight), 100);
  };

  const updateField = async (field, value) => {
    try {
      const res = await fetch(`/api/crm/linkedin/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-crm-user': currentUser },
        body: JSON.stringify({ [field]: value }),
      });
      const data = await res.json();
      if (data.success) { setLead(data.lead); if (onUpdated) onUpdated(); }
    } catch (err) { console.error(err); }
  };

  const deleteLead = async () => {
    if (!confirm('Are you sure you want to delete this lead?')) return;
    try {
      const res = await fetch(`/api/crm/linkedin/${leadId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        if (onUpdated) onUpdated();
        onClose();
      }
    } catch (err) { console.error(err); }
  };

  const addConversation = async () => {
    if (!newMsg.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/crm/linkedin/${leadId}/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-crm-user': currentUser },
        body: JSON.stringify({ message: newMsg, direction: msgDir }),
      });
      const data = await res.json();
      if (data.success) {
        setConversations(data.conversations);
        setNewMsg('');
        setTimeout(() => scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight), 100);
      }
    } catch (err) { console.error(err); }
    setSending(false);
  };

  if (!leadId) return null;

  const statusObj = STATUS_LIST.find(s => s.value === lead?.status) || STATUS_LIST[0];
  const fieldStyle = {
    width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border)',
    background: 'var(--s2)', color: 'var(--text-1)', fontSize: 12, outline: 'none',
  };

  return (
    <div className="m-overlay open" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="m-panel" style={{ maxWidth: 440 }}>
        <div className="m-head">
          <div className="m-head-l">
            <div className="m-icon ic-b" style={{ fontSize: 14 }}>◈</div>
            <div>
              <div className="m-title">{loading ? 'Loading…' : `${lead?.firstName} ${lead?.lastName}`}</div>
              <div className="m-sub">{lead?.city}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {lead && (
              <button 
                onClick={deleteLead}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 16, color: '#dc2626', padding: '4px', opacity: 0.7, transition: 'opacity 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.opacity = 1}
                onMouseLeave={e => e.currentTarget.style.opacity = 0.7}
                title="Delete Lead"
              >
                🗑️
              </button>
            )}
            <button className="m-close" onClick={onClose}>✕</button>
          </div>
        </div>

        {loading ? (
          <div className="m-body" style={{ padding: 32, textAlign: 'center', color: 'var(--text-3)' }}>Loading lead…</div>
        ) : (
          <>
            {/* Lead info */}
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--s2)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '.5px' }}>Status</div>
                  <select style={fieldStyle} value={lead.status} onChange={e => updateField('status', e.target.value)}>
                    {STATUS_LIST.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '.5px' }}>Owner</div>
                  <select style={fieldStyle} value={lead.owner} onChange={e => updateField('owner', e.target.value)}>
                    <option value="Amaan">Amaan</option><option value="Ayushman">Ayushman</option>
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '.5px' }}>Next Follow-up</div>
                <input
                  type="date" style={fieldStyle} value={editFollowUp}
                  onChange={e => { setEditFollowUp(e.target.value); updateField('nextFollowUp', e.target.value || null); }}
                />
              </div>
              {lead.linkedInUrl && (
                <a href={lead.linkedInUrl} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: 12, color: '#2563eb', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                  🔗 View LinkedIn Profile
                </a>
              )}
            </div>

            {/* Conversation timeline */}
            <div style={{ padding: '10px 16px 4px', fontSize: 11, fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '.5px' }}>
              Conversation Log ({conversations.length})
            </div>
            <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '0 16px 8px' }}>
              {conversations.length === 0 && (
                <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-3)', fontSize: 12 }}>
                  No conversations logged yet
                </div>
              )}
              {conversations.map((c, i) => {
                const isOut = c.direction === 'outbound';
                const isNote = c.direction === 'note';
                return (
                  <div key={c._id || i} style={{
                    padding: '8px 10px', borderRadius: 8, marginTop: 6, fontSize: 12, lineHeight: 1.5,
                    background: isNote ? 'var(--s2)' : isOut ? '#eef2ff' : '#f0fdf4',
                    borderLeft: `3px solid ${isNote ? 'var(--border)' : isOut ? '#2563eb' : '#16a34a'}`,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontWeight: 500, color: isNote ? 'var(--text-3)' : isOut ? '#2563eb' : '#16a34a', fontSize: 10, textTransform: 'uppercase' }}>
                        {isNote ? '📝 Note' : isOut ? '↗ Sent' : '↙ Received'}
                      </span>
                      <span style={{ fontSize: 10, color: 'var(--text-3)' }}>
                        {c.loggedBy} · {new Date(c.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <div style={{ color: 'var(--text-1)' }}>{c.message}</div>
                  </div>
                );
              })}
            </div>

            {/* Add conversation */}
            <div className="m-foot" style={{ flexDirection: 'column', gap: 6, padding: 12 }}>
              <div style={{ display: 'flex', gap: 6 }}>
                {DIR_OPTIONS.map(d => {
                  const isSel = msgDir === d.value;
                  let bgHover = 'var(--text-2)';
                  if (d.value === 'outbound') bgHover = '#2563eb';
                  if (d.value === 'inbound') bgHover = '#16a34a';

                  return (
                    <button key={d.value}
                      onClick={() => setMsgDir(d.value)}
                      style={{
                        padding: '4px 10px', borderRadius: 4, 
                        border: `1px solid ${isSel ? bgHover : 'var(--border)'}`,
                        background: isSel ? bgHover : 'transparent',
                        color: isSel ? '#fff' : 'var(--text-2)',
                        fontSize: 11, cursor: 'pointer', fontWeight: isSel ? 600 : 500,
                        transition: 'all 0.15s ease'
                      }}
                    >{d.icon} {d.label.split(' ')[1]}</button>
                  );
                })}
              </div>
              <div style={{ display: 'flex', gap: 6, width: '100%' }}>
                <textarea
                  className="m-inp" placeholder="Log a message or note…"
                  value={newMsg} onChange={e => setNewMsg(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addConversation(); } }}
                  style={{ resize: 'none', minHeight: 36, flex: 1 }}
                />
                <button className="m-add-btn" onClick={addConversation} disabled={sending || !newMsg.trim()}>
                  {sending ? '…' : 'Log'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
