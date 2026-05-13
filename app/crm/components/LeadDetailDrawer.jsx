'use client';
import { useState, useEffect, useCallback } from 'react';

const TIMELINE_ICONS = {
  email_sent: '↗', email_opened: '👁', email_replied: '↙',
  linkedin_dm: '◈', call: '📞', meeting: '🗓', note: '📝',
  proposal_sent: '📄', stage_change: '→', heat_change: '🌡',
};

const TIMELINE_COLORS = {
  email_sent: 'var(--blue)', email_replied: 'var(--green)', call: 'var(--purple)',
  meeting: 'var(--amber)', note: 'var(--text-3)', stage_change: 'var(--blue)',
  heat_change: 'var(--red)', linkedin_dm: 'var(--blue)',
};

const STAGE_OPTS = [
  { id: 'prospect', l: 'Prospect' }, { id: 'lead', l: 'Lead' },
  { id: 'qualified_lead', l: 'Qualified Lead' }, { id: 'pipeline_opportunity', l: 'Opportunity' },
  { id: 'client', l: 'Client' }, { id: 'churned', l: 'Churned' },
];
const HEAT_OPTS = [{ id: 'cold', l: '❄ Cold' }, { id: 'warm', l: '🌡 Warm' }, { id: 'hot', l: '🔥 Hot' }];
const INTENT_OPTS = [
  { id: 'unknown', l: 'Unknown' }, { id: 'curious', l: 'Curious' },
  { id: 'exploring', l: 'Exploring' }, { id: 'looking_actively', l: 'Active' }, { id: 'immediate_need', l: 'Immediate' },
];
const REL_OPTS = [
  { id: 'stranger', l: 'Stranger' }, { id: 'aware', l: 'Aware' },
  { id: 'engaged', l: 'Engaged' }, { id: 'trusted', l: 'Trusted' }, { id: 'champion', l: 'Champion' },
];
const BUY_OPTS = [
  { id: 'not_ready', l: 'Not Ready' }, { id: 'researching', l: 'Researching' },
  { id: 'comparing_vendors', l: 'Comparing' }, { id: 'ready_to_buy', l: 'Ready' },
  { id: 'budget_planning', l: 'Budget' }, { id: 'scaling', l: 'Scaling' },
];
const ACT_TYPES = [
  { id: 'none', l: 'None' }, { id: 'email', l: 'Email' }, { id: 'call', l: 'Call' },
  { id: 'meeting', l: 'Meeting' }, { id: 'follow_up', l: 'Follow Up' },
  { id: 'proposal', l: 'Proposal' }, { id: 'demo', l: 'Demo' },
  { id: 'linkedin', l: 'LinkedIn' }, { id: 'task', l: 'Task' },
];

export default function LeadDetailDrawer({ leadId, currentUser, onClose, onSaved, heatCfg }) {
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [tlType, setTlType] = useState('note');
  const [tlContent, setTlContent] = useState('');
  const [addingTl, setAddingTl] = useState(false);

  const fetchLead = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/crm/leads/${leadId}`);
      const json = await res.json();
      if (json.success) setLead(json.lead);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [leadId]);

  useEffect(() => { fetchLead(); }, [fetchLead]);

  const updateField = async (field, value) => {
    setSaving(true);
    try {
      const body = {};
      if (field.includes('.')) { const p = field.split('.'); body[p[0]] = { ...lead[p[0]], [p[1]]: value }; }
      else body[field] = value;
      const res = await fetch(`/api/crm/leads/${leadId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-crm-user': currentUser },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.success) setLead(json.lead);
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const addTimelineEntry = async () => {
    if (!tlContent.trim()) return;
    setAddingTl(true);
    try {
      await fetch(`/api/crm/leads/${leadId}/timeline`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-crm-user': currentUser },
        body: JSON.stringify({ type: tlType, content: tlContent }),
      });
      setTlContent('');
      fetchLead();
    } catch (err) { console.error(err); }
    finally { setAddingTl(false); }
  };

  const updateNA = async (u) => { const na = { ...(lead?.nextAction || {}), ...u }; await updateField('nextAction', na); };

  if (loading || !lead) {
    return (<><div className="ld-drawer-overlay" onClick={onClose}/><div className="ld-drawer"><div className="ld-drawer-loading">Loading…</div></div></>);
  }

  const heat = heatCfg?.[lead.heatLevel] || { label: 'Cold', cls: 'heat-cold', icon: '❄' };
  const stg = STAGE_OPTS.find(s => s.id === lead.pipelineStage) || STAGE_OPTS[0];
  const isOverdue = lead.nextAction?.dueDate && new Date(lead.nextAction.dueDate) < new Date();
  const tl = lead.timeline || [];

  return (
    <>
      <div className="ld-drawer-overlay" onClick={onClose}/>
      <div className="ld-drawer">
        {/* Header */}
        <div className="ld-drawer-header">
          <div className="ld-drawer-header-left">
            <div className={`ld-drawer-avatar ${heat.cls}`}>{(lead.firstName?.[0]||'?').toUpperCase()}</div>
            <div>
              <div className="ld-drawer-name">{lead.firstName} {lead.lastName}</div>
              <div className="ld-drawer-meta">{lead.company}{lead.role ? ` · ${lead.role}` : ''}</div>
              <div className="ld-drawer-badges">
                <span className={`ld-heat-badge ${heat.cls}`}>{heat.icon} {heat.label}</span>
                <span className="ld-stage-badge">{stg.l}</span>
                {lead.engagementScore > 0 && <span className="ld-score-badge">Score: {lead.engagementScore}</span>}
              </div>
            </div>
          </div>
          <button className="ld-drawer-close" onClick={onClose}>✕</button>
        </div>

        {/* Quick Actions */}
        <div className="ld-drawer-actions">
          {[{t:'note',i:'📝',l:'Note'},{t:'call',i:'📞',l:'Call'},{t:'email_sent',i:'✉',l:'Email'},{t:'meeting',i:'🗓',l:'Meeting'},{t:'linkedin_dm',i:'◈',l:'LinkedIn'}].map(a=>(
            <button key={a.t} className="ld-qa-btn" onClick={()=>{setActiveTab('timeline');setTlType(a.t);}}><span>{a.i}</span><span>{a.l}</span></button>
          ))}
        </div>

        {/* Tabs */}
        <div className="ld-drawer-tabs">
          {['overview','timeline','deal','intel'].map(t=>(
            <button key={t} className={`ld-tab ${activeTab===t?'active':''}`} onClick={()=>setActiveTab(t)}>{t[0].toUpperCase()+t.slice(1)}</button>
          ))}
        </div>

        <div className="ld-drawer-body">
          {activeTab==='overview' && (
            <div className="ld-drawer-section">
              <div className={`ld-next-action-card ${isOverdue?'overdue':''}`}>
                <div className="ld-nac-header"><span className="ld-nac-title">⚡ Next Action</span>{isOverdue&&<span className="ld-nac-overdue">OVERDUE</span>}</div>
                <div className="ld-nac-body">
                  <select className="ld-inline-sel" value={lead.nextAction?.type||'none'} onChange={e=>updateNA({type:e.target.value})}>{ACT_TYPES.map(a=><option key={a.id} value={a.id}>{a.l}</option>)}</select>
                  <input className="ld-inline-input" placeholder="What needs to happen?" value={lead.nextAction?.description||''} onBlur={e=>updateNA({description:e.target.value})} onChange={e=>setLead(p=>({...p,nextAction:{...p.nextAction,description:e.target.value}}))}/>
                  <div className="ld-nac-row">
                    <input className="ld-inline-input sm" type="date" value={lead.nextAction?.dueDate?new Date(lead.nextAction.dueDate).toISOString().split('T')[0]:''} onChange={e=>updateNA({dueDate:e.target.value?new Date(e.target.value):null})}/>
                    <select className="ld-inline-sel sm" value={lead.nextAction?.priority||'medium'} onChange={e=>updateNA({priority:e.target.value})}><option value="low">Low</option><option value="medium">Med</option><option value="high">High</option><option value="urgent">Urgent</option></select>
                    <select className="ld-inline-sel sm" value={lead.nextAction?.owner||''} onChange={e=>updateNA({owner:e.target.value})}><option value="">—</option><option value="Amaan">Amaan</option><option value="Ayushman">Ayushman</option></select>
                  </div>
                </div>
              </div>
              <div className="ld-state-grid">
                <div className="ld-state-item"><span className="ld-state-label">Pipeline</span><select className="ld-state-sel" value={lead.pipelineStage} onChange={e=>updateField('pipelineStage',e.target.value)}>{STAGE_OPTS.map(s=><option key={s.id} value={s.id}>{s.l}</option>)}</select></div>
                <div className="ld-state-item"><span className="ld-state-label">Heat</span><select className="ld-state-sel" value={lead.heatLevel} onChange={e=>updateField('heatLevel',e.target.value)}>{HEAT_OPTS.map(h=><option key={h.id} value={h.id}>{h.l}</option>)}</select></div>
                <div className="ld-state-item"><span className="ld-state-label">Intent</span><select className="ld-state-sel" value={lead.intentLevel} onChange={e=>updateField('intentLevel',e.target.value)}>{INTENT_OPTS.map(i=><option key={i.id} value={i.id}>{i.l}</option>)}</select></div>
                <div className="ld-state-item"><span className="ld-state-label">Relationship</span><select className="ld-state-sel" value={lead.relationshipStage} onChange={e=>updateField('relationshipStage',e.target.value)}>{REL_OPTS.map(r=><option key={r.id} value={r.id}>{r.l}</option>)}</select></div>
                <div className="ld-state-item"><span className="ld-state-label">Buying</span><select className="ld-state-sel" value={lead.buyingReadiness} onChange={e=>updateField('buyingReadiness',e.target.value)}>{BUY_OPTS.map(b=><option key={b.id} value={b.id}>{b.l}</option>)}</select></div>
                <div className="ld-state-item"><span className="ld-state-label">Score</span><div className="ld-score-bar"><div className="ld-score-fill" style={{width:`${lead.engagementScore}%`}}/><span className="ld-score-num">{lead.engagementScore}</span></div></div>
              </div>
              <div className="ld-drawer-subsection"><div className="ld-subsection-title">Contact</div>
                <div className="ld-contact-grid">
                  {lead.email&&<a href={`mailto:${lead.email}`} className="ld-contact-item"><span className="ld-ci-icon">✉</span>{lead.email}</a>}
                  {lead.phone&&<a href={`tel:${lead.phone}`} className="ld-contact-item"><span className="ld-ci-icon">📞</span>{lead.phone}</a>}
                  {lead.linkedin&&<a href={lead.linkedin} target="_blank" rel="noopener noreferrer" className="ld-contact-item"><span className="ld-ci-icon">◈</span>LinkedIn</a>}
                </div>
              </div>
              <div className="ld-drawer-subsection"><div className="ld-subsection-title">Notes</div>
                <textarea className="ld-notes-area" value={lead.notes||''} placeholder="Add notes…" onChange={e=>setLead(p=>({...p,notes:e.target.value}))} onBlur={e=>updateField('notes',e.target.value)} rows={3}/>
              </div>
            </div>
          )}

          {activeTab==='timeline' && (
            <div className="ld-drawer-section">
              <div className="ld-tl-form">
                <select className="ld-tl-type-sel" value={tlType} onChange={e=>setTlType(e.target.value)}>
                  <option value="note">📝 Note</option><option value="call">📞 Call</option><option value="email_sent">✉ Email</option><option value="meeting">🗓 Meeting</option><option value="linkedin_dm">◈ LinkedIn</option>
                </select>
                <div className="ld-tl-input-wrap">
                  <textarea className="ld-tl-input" placeholder={`Log a ${tlType.replace('_',' ')}…`} value={tlContent} onChange={e=>setTlContent(e.target.value)} rows={2}/>
                  <button className="ld-tl-submit" onClick={addTimelineEntry} disabled={addingTl||!tlContent.trim()}>{addingTl?'…':'Add'}</button>
                </div>
              </div>
              <div className="ld-timeline">
                {tl.length===0&&<div className="ld-tl-empty">No activity yet</div>}
                {tl.map((e,i)=>(
                  <div key={i} className="ld-tl-entry">
                    <div className="ld-tl-dot" style={{background:TIMELINE_COLORS[e.type]||'var(--text-4)'}}>{TIMELINE_ICONS[e.type]||'·'}</div>
                    <div className="ld-tl-content">
                      <div className="ld-tl-text">{e.content}</div>
                      <div className="ld-tl-meta"><span>{e.by}</span><span>·</span><span>{new Date(e.timestamp).toLocaleDateString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab==='deal' && (
            <div className="ld-drawer-section">
              <div className="ld-deal-grid">
                <div className="ld-deal-item"><label>Deal Value ($)</label><input className="ld-inline-input" type="number" value={lead.dealValue||0} onChange={e=>setLead(p=>({...p,dealValue:parseInt(e.target.value)||0}))} onBlur={e=>updateField('dealValue',parseInt(e.target.value)||0)}/></div>
                <div className="ld-deal-item"><label>Probability (%)</label><input className="ld-inline-input" type="number" min="0" max="100" value={lead.dealProbability||0} onChange={e=>setLead(p=>({...p,dealProbability:parseInt(e.target.value)||0}))} onBlur={e=>updateField('dealProbability',parseInt(e.target.value)||0)}/></div>
                <div className="ld-deal-item"><label>Timeline</label><select className="ld-state-sel" value={lead.buyingTimeline} onChange={e=>updateField('buyingTimeline',e.target.value)}><option value="immediate">Immediate</option><option value="1_month">1 Month</option><option value="1_3_months">1–3 Mo</option><option value="3_6_months">3–6 Mo</option><option value="6_12_months">6–12 Mo</option><option value="unknown">Unknown</option></select></div>
                <div className="ld-deal-item full"><label>Weighted Value</label><div className="ld-weighted-val">${Math.round((lead.dealValue||0)*((lead.dealProbability||0)/100)).toLocaleString()}</div></div>
              </div>
            </div>
          )}

          {activeTab==='intel' && (
            <div className="ld-drawer-section">
              <div className="ld-intel-header">Follow-Up Intelligence</div>
              <div className="ld-intel-grid">
                <div className="ld-intel-item"><label>What happened?</label><textarea className="ld-intel-input" placeholder="e.g. Opened email…" value={lead.followUpIntel?.lastOutcome||''} onChange={e=>setLead(p=>({...p,followUpIntel:{...p.followUpIntel,lastOutcome:e.target.value}}))} onBlur={e=>updateField('followUpIntel',{...lead.followUpIntel,lastOutcome:e.target.value})} rows={2}/></div>
                <div className="ld-intel-item"><label>Why no reply?</label><textarea className="ld-intel-input" placeholder="e.g. Likely busy…" value={lead.followUpIntel?.whyNoReply||''} onChange={e=>setLead(p=>({...p,followUpIntel:{...p.followUpIntel,whyNoReply:e.target.value}}))} onBlur={e=>updateField('followUpIntel',{...lead.followUpIntel,whyNoReply:e.target.value})} rows={2}/></div>
                <div className="ld-intel-item"><label>What next?</label><textarea className="ld-intel-input" placeholder="e.g. Send ROI example…" value={lead.followUpIntel?.whatNext||''} onChange={e=>setLead(p=>({...p,followUpIntel:{...p.followUpIntel,whatNext:e.target.value}}))} onBlur={e=>updateField('followUpIntel',{...lead.followUpIntel,whatNext:e.target.value})} rows={2}/></div>
              </div>
              <div className="ld-intel-section"><div className="ld-intel-header">Nurture Status</div>
                <select className="ld-state-sel" value={lead.nurtureStatus} onChange={e=>updateField('nurtureStatus',e.target.value)}><option value="active_outreach">Active Outreach</option><option value="nurture_sequence">Nurture</option><option value="manual_follow_up">Manual</option><option value="on_hold">On Hold</option><option value="do_not_contact">Do Not Contact</option></select>
              </div>
            </div>
          )}
        </div>

        <div className="ld-drawer-footer">
          <button className="t-btn" onClick={onClose}>Close</button>
          <div style={{display:'flex',gap:6}}>
            <button className="t-btn" onClick={()=>{if(confirm('Delete this lead?')){fetch(`/api/crm/leads/${leadId}`,{method:'DELETE'}).then(()=>onSaved());}}} style={{color:'var(--red)'}}>Delete</button>
            <button className="t-btn accent" onClick={onSaved}>Done</button>
          </div>
        </div>
      </div>
    </>
  );
}
