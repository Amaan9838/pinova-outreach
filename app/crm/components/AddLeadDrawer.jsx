'use client';
import { useState } from 'react';

const SOURCES = [
  { id: 'apollo', l: 'Apollo' }, { id: 'linkedin_outbound', l: 'LinkedIn' },
  { id: 'facebook_ads', l: 'Facebook Ads' }, { id: 'organic_website', l: 'Organic Website' },
  { id: 'referral', l: 'Referral' }, { id: 'cold_email', l: 'Cold Email' },
  { id: 'webinar', l: 'Webinar' }, { id: 'newsletter', l: 'Newsletter' },
  { id: 'instagram', l: 'Instagram' }, { id: 'google_ads', l: 'Google Ads' },
  { id: 'manual_import', l: 'Manual Import' }, { id: 'other', l: 'Other' },
];

const OFFERS = [
  { id: 'website', l: 'Website' }, { id: 'ai_website', l: 'AI Website' },
  { id: 'platform', l: 'Platform' }, { id: 'saas', l: 'SaaS' },
  { id: 'custom_ai_solution', l: 'Custom AI' }, { id: 'automation', l: 'Automation' },
  { id: 'crm', l: 'CRM' }, { id: 'lead_gen_system', l: 'Lead Gen' },
  { id: 'ai_assistant', l: 'AI Assistant' }, { id: 'other', l: 'Other' },
];

const INDUSTRIES = [
  { id: 'real_estate', l: 'Real Estate' }, { id: 'healthcare', l: 'Healthcare' },
  { id: 'agency', l: 'Agency' }, { id: 'ecommerce', l: 'E-Commerce' },
  { id: 'education', l: 'Education' }, { id: 'finance', l: 'Finance' },
  { id: 'saas', l: 'SaaS' }, { id: 'consulting', l: 'Consulting' }, { id: 'other', l: 'Other' },
];

export default function AddLeadDrawer({ currentUser, onClose, onCreated }) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '', company: '', role: '',
    linkedin: '', website: '',
    source: 'other', offerCategory: 'other', industry: 'other',
    heatLevel: 'cold', intentLevel: 'unknown',
    nextAction: { type: 'none', description: '', dueDate: '', priority: 'medium', owner: currentUser || '' },
    owner: currentUser || 'Amaan',
  });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const setNA = (k, v) => setForm(p => ({ ...p, nextAction: { ...p.nextAction, [k]: v } }));

  const submit = async () => {
    if (!form.firstName.trim()) return;
    setSaving(true);
    try {
      const body = { ...form };
      if (body.nextAction.dueDate) body.nextAction.dueDate = new Date(body.nextAction.dueDate);
      else delete body.nextAction.dueDate;
      const res = await fetch('/api/crm/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-crm-user': currentUser || 'Unknown' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.success) onCreated();
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  return (
    <>
      <div className="ld-drawer-overlay" onClick={onClose} />
      <div className="ld-drawer ld-add-drawer">
        <div className="ld-drawer-header">
          <div className="ld-drawer-header-left">
            <div className="ld-drawer-avatar heat-cold">+</div>
            <div><div className="ld-drawer-name">Add New Lead</div><div className="ld-drawer-meta">Step {step} of 3</div></div>
          </div>
          <button className="ld-drawer-close" onClick={onClose}>✕</button>
        </div>

        {/* Step Indicator */}
        <div className="ld-steps">
          {[1,2,3].map(s => (
            <div key={s} className={`ld-step ${step >= s ? 'active' : ''} ${step === s ? 'current' : ''}`}>
              <div className="ld-step-dot">{s}</div>
              <span className="ld-step-label">{['Identity','Source & Offer','First Action'][s-1]}</span>
            </div>
          ))}
        </div>

        <div className="ld-drawer-body">
          {step === 1 && (
            <div className="ld-add-form">
              <div className="ld-form-row">
                <div className="ld-form-field"><label>First Name *</label><input className="ld-inline-input" value={form.firstName} onChange={e=>set('firstName',e.target.value)} autoFocus placeholder="John"/></div>
                <div className="ld-form-field"><label>Last Name</label><input className="ld-inline-input" value={form.lastName} onChange={e=>set('lastName',e.target.value)} placeholder="Smith"/></div>
              </div>
              <div className="ld-form-row">
                <div className="ld-form-field"><label>Email</label><input className="ld-inline-input" type="email" value={form.email} onChange={e=>set('email',e.target.value)} placeholder="john@company.com"/></div>
                <div className="ld-form-field"><label>Phone</label><input className="ld-inline-input" value={form.phone} onChange={e=>set('phone',e.target.value)} placeholder="+1 555 123 4567"/></div>
              </div>
              <div className="ld-form-row">
                <div className="ld-form-field"><label>Company</label><input className="ld-inline-input" value={form.company} onChange={e=>set('company',e.target.value)} placeholder="Acme Inc"/></div>
                <div className="ld-form-field"><label>Role</label><input className="ld-inline-input" value={form.role} onChange={e=>set('role',e.target.value)} placeholder="CEO"/></div>
              </div>
              <div className="ld-form-row">
                <div className="ld-form-field"><label>LinkedIn</label><input className="ld-inline-input" value={form.linkedin} onChange={e=>set('linkedin',e.target.value)} placeholder="linkedin.com/in/..."/></div>
                <div className="ld-form-field"><label>Website</label><input className="ld-inline-input" value={form.website} onChange={e=>set('website',e.target.value)} placeholder="https://..."/></div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="ld-add-form">
              <div className="ld-form-field"><label>Source</label>
                <div className="ld-chip-grid">{SOURCES.map(s=>(
                  <button key={s.id} className={`ld-chip-opt ${form.source===s.id?'active':''}`} onClick={()=>set('source',s.id)}>{s.l}</button>
                ))}</div>
              </div>
              <div className="ld-form-field"><label>What We're Selling</label>
                <div className="ld-chip-grid">{OFFERS.map(o=>(
                  <button key={o.id} className={`ld-chip-opt ${form.offerCategory===o.id?'active':''}`} onClick={()=>set('offerCategory',o.id)}>{o.l}</button>
                ))}</div>
              </div>
              <div className="ld-form-field"><label>Industry</label>
                <div className="ld-chip-grid">{INDUSTRIES.map(i=>(
                  <button key={i.id} className={`ld-chip-opt ${form.industry===i.id?'active':''}`} onClick={()=>set('industry',i.id)}>{i.l}</button>
                ))}</div>
              </div>
              <div className="ld-form-row">
                <div className="ld-form-field"><label>Heat Level</label>
                  <div className="ld-heat-selector">
                    {[{id:'cold',i:'❄',l:'Cold'},{id:'warm',i:'🌡',l:'Warm'},{id:'hot',i:'🔥',l:'Hot'}].map(h=>(
                      <button key={h.id} className={`ld-heat-opt ${form.heatLevel===h.id?'active':''} heat-${h.id}`} onClick={()=>set('heatLevel',h.id)}>{h.i} {h.l}</button>
                    ))}
                  </div>
                </div>
                <div className="ld-form-field"><label>Owner</label>
                  <select className="ld-state-sel" value={form.owner} onChange={e=>set('owner',e.target.value)}>
                    <option value="Amaan">Amaan</option><option value="Ayushman">Ayushman</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="ld-add-form">
              <div className="ld-form-field">
                <label>First Action Type</label>
                <select className="ld-state-sel" value={form.nextAction.type} onChange={e=>setNA('type',e.target.value)}>
                  <option value="none">None</option><option value="email">Email</option><option value="call">Call</option>
                  <option value="meeting">Meeting</option><option value="follow_up">Follow Up</option>
                  <option value="linkedin">LinkedIn</option><option value="proposal">Proposal</option>
                </select>
              </div>
              <div className="ld-form-field"><label>Description</label><input className="ld-inline-input" placeholder="e.g. Send intro email with proposal…" value={form.nextAction.description} onChange={e=>setNA('description',e.target.value)}/></div>
              <div className="ld-form-row">
                <div className="ld-form-field"><label>Due Date</label><input className="ld-inline-input" type="date" value={form.nextAction.dueDate} onChange={e=>setNA('dueDate',e.target.value)}/></div>
                <div className="ld-form-field"><label>Priority</label>
                  <select className="ld-state-sel" value={form.nextAction.priority} onChange={e=>setNA('priority',e.target.value)}>
                    <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="ld-drawer-footer">
          {step > 1 ? <button className="t-btn" onClick={()=>setStep(s=>s-1)}>← Back</button> : <button className="t-btn" onClick={onClose}>Cancel</button>}
          {step < 3 ? (
            <button className="t-btn accent" onClick={()=>setStep(s=>s+1)} disabled={step===1&&!form.firstName.trim()}>Next →</button>
          ) : (
            <button className="t-btn accent" onClick={submit} disabled={saving||!form.firstName.trim()}>{saving?'Creating…':'Create Lead'}</button>
          )}
        </div>
      </div>
    </>
  );
}
