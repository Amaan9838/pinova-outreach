'use client';

import { useState, useEffect, useRef, useCallback, useReducer } from 'react';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DESIGN TOKENS — Google Material You (Dark)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const C = {
  bg: '#0F0F0F', s1: '#1A1A1E', s2: '#222228', s3: '#2C2C33', s4: '#38383F',
  primary: '#D0BCFF', onPri: '#381E72',
  sec: '#CCC2DC', tertiary: '#EFB8C8', error: '#F2B8B5',
  t1: '#E6E1E5', t2: '#CAC4D0', t3: '#79747E', t4: '#49454F',
  border: 'rgba(255,255,255,0.06)', border2: 'rgba(255,255,255,0.12)',
  success: '#A8DAB5',
};

const AREAS = [
  { id: 'outbound', label: 'Outbound', color: '#FFB4AB' },
  { id: 'inbound', label: 'Inbound', color: '#A8C7FA' },
  { id: 'delivery', label: 'Delivery', color: '#A8DAB5' },
  { id: 'ops', label: 'Ops', color: '#E8B931' },
];

const ENERGY = [
  { id: 'low', label: 'Quick win', color: '#A8DAB5', icon: '⚡' },
  { id: 'medium', label: 'Moderate', color: '#E8B931', icon: '🔶' },
  { id: 'high', label: 'Deep work', color: '#FFB4AB', icon: '🔥' },
];

const api = {
  async getAll() {
    const r = await fetch('/api/flow/items?all=true');
    const d = await r.json();
    return d.items || [];
  },
  async create(item) {
    const r = await fetch('/api/flow/items', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item }),
    });
    const d = await r.json();
    return d.item;
  },
  async update(id, patch) {
    const r = await fetch(`/api/flow/items/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    const d = await r.json();
    return d.item;
  },
  async remove(id) {
    await fetch(`/api/flow/items/${id}`, { method: 'DELETE' });
  },
  async complete(id, nextAction) {
    const r = await fetch('/api/flow/complete', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, nextAction }),
    });
    return r.json();
  },
  async capture(thoughts) {
    const r = await fetch('/api/flow/capture', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ thoughts }),
    });
    return r.json();
  },
  async saveReview(date) {
    await fetch('/api/flow/complete', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviewDate: date }),
    });
  },
  async getState() {
    const r = await fetch('/api/flow/state');
    return r.json();
  },
  async getSops() {
    const r = await fetch('/api/flow/sops');
    const d = await r.json();
    return d.sops || [];
  },
  async updateSops(sops) {
    const r = await fetch('/api/flow/sops', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sops }),
    });
    const d = await r.json();
    return d.sops || [];
  },
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CSS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes slideUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes checkPop { 0% { transform: scale(1); } 50% { transform: scale(1.25); } 100% { transform: scale(1); } }
  @keyframes breathe { 0%,100% { opacity: 0.4; } 50% { opacity: 1; } }
  @keyframes streakGlow { 0%,100% { box-shadow: 0 0 0 0 rgba(168,218,181,0.3); } 50% { box-shadow: 0 0 8px 2px rgba(168,218,181,0.15); } }

  .fc { background: ${C.s1}; border: 1px solid ${C.border}; border-radius: 16px; padding: 16px 18px; animation: fadeIn 0.3s ease-out both; }
  .fc:hover { border-color: ${C.border2}; }

  .fi { width: 100%; background: ${C.s2}; border: 1px solid ${C.border2}; border-radius: 12px; padding: 12px 16px; color: ${C.t1}; font-size: 14px; font-family: var(--font-body, 'Source Sans 3', sans-serif); outline: none; transition: border-color 0.2s; }
  .fi:focus { border-color: ${C.primary}; }
  .fi::placeholder { color: ${C.t3}; }

  .fb { display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 10px 20px; border-radius: 12px; font-size: 14px; font-weight: 600; font-family: var(--font-body); cursor: pointer; border: none; transition: all 0.15s ease; }
  .fb:hover { filter: brightness(1.1); }
  .fb:active { transform: scale(0.97); }
  .fb-p { background: ${C.primary}; color: ${C.onPri}; }
  .fb-g { background: transparent; color: ${C.t2}; border: 1px solid ${C.border2}; }
  .fb-g:hover { background: ${C.s2}; }

  .fch { display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 8px; font-size: 11px; font-weight: 600; letter-spacing: 0.02em; border: none; cursor: pointer; font-family: var(--font-body); transition: all 0.15s ease; }

  .cc { width: 22px; height: 22px; border-radius: 50%; border: 2px solid ${C.t3}; flex-shrink: 0; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; background: transparent; }
  .cc:hover { border-color: ${C.primary}; background: rgba(208,188,255,0.08); }
  .cc.done { border-color: ${C.success}; background: ${C.success}; animation: checkPop 0.3s ease; }

  .ps { flex: 1; height: 4px; border-radius: 2px; background: ${C.s3}; transition: background 0.3s; cursor: pointer; }
  .ps.d { background: ${C.primary}; }
  .ps.c { background: ${C.primary}; animation: breathe 2s ease-in-out infinite; }

  .ni { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 8px 4px; flex: 1; cursor: pointer; background: none; border: none; font-family: var(--font-body); font-size: 10px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: ${C.t3}; transition: color 0.15s; position: relative; }
  .ni.a { color: ${C.primary}; }
  .ni.a::after { content: ''; position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 24px; height: 3px; border-radius: 3px 3px 0 0; background: ${C.primary}; }

  .badge { position: absolute; top: -4px; right: -4px; min-width: 18px; height: 18px; padding: 0 5px; border-radius: 9px; background: ${C.tertiary}; color: #1C1B1F; font-size: 10px; font-weight: 700; display: flex; align-items: center; justify-content: center; line-height: 1; }
  
  .ve { animation: slideUp 0.35s ease-out both; }
  .ed { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
  
  .streak-card { animation: streakGlow 3s ease-in-out infinite; }
  
  .review-banner { background: linear-gradient(135deg, ${C.tertiary}15 0%, ${C.primary}10 100%); border: 1px solid ${C.tertiary}30; border-radius: 14px; padding: 14px 16px; margin-bottom: 16px; cursor: pointer; transition: border-color 0.2s; }
  .review-banner:hover { border-color: ${C.tertiary}50; }

  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: ${C.s3}; border-radius: 2px; }
`;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SHARED COMPONENTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const itemId = (item) => item._id || item.id;

function SectionTitle({ children, right }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
      <div style={{ fontSize: 11, color: C.t3, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{children}</div>
      {right}
    </div>
  );
}

function AreaChip({ area, small }) {
  const a = AREAS.find(x => x.id === area);
  if (!a) return null;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4, padding: small ? '2px 7px' : '3px 9px', borderRadius: 6,
      background: `${a.color}15`, color: a.color, fontSize: small ? 10 : 11, fontWeight: 600,
      border: `1px solid ${a.color}25`, lineHeight: 1.2,
    }}>{a.label}</span>
  );
}

function EnergyDot({ energy }) {
  const e = ENERGY.find(x => x.id === energy);
  return <div className="ed" title={e?.label} style={{ background: e?.color || C.t3 }} />;
}

function Empty({ emoji, title, sub, action }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 24px', animation: 'fadeIn 0.5s ease-out' }}>
      <div style={{ fontSize: 48, marginBottom: 16, lineHeight: 1 }}>{emoji}</div>
      <div style={{ fontSize: 17, fontWeight: 600, color: C.t1, marginBottom: 6, fontFamily: 'var(--font-display)' }}>{title}</div>
      <div style={{ fontSize: 13, color: C.t3, lineHeight: 1.6, maxWidth: 280, margin: '0 auto' }}>{sub}</div>
      {action && <div style={{ marginTop: 18 }}>{action}</div>}
    </div>
  );
}

function ActionRow({ item, onComplete, onTap, showProject, showArea, projectName }) {
  const [justDone, setJustDone] = useState(false);
  const handleComplete = (ev) => {
    ev.stopPropagation();
    setJustDone(true);
    setTimeout(() => onComplete(itemId(item)), 400);
  };
  return (
    <div onClick={() => onTap?.(item)} className="fc"
      style={{ marginBottom: 8, padding: '13px 16px', cursor: onTap ? 'pointer' : 'default', opacity: justDone ? 0.3 : 1, transition: 'opacity 0.4s', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <div className={`cc ${justDone ? 'done' : ''}`} onClick={handleComplete} style={{ marginTop: 1 }}>
        {justDone && <span style={{ color: C.onPri, fontSize: 12, fontWeight: 700 }}>✓</span>}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, color: C.t1, lineHeight: 1.5, wordBreak: 'break-word' }}>{item.text}</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6, flexWrap: 'wrap' }}>
          {showArea && item.area && <AreaChip area={item.area} small />}
          {showProject && projectName && <span style={{ fontSize: 11, color: C.t3 }}>📋 {projectName}</span>}
          {item.estimatedMin && <span style={{ fontSize: 11, color: C.t3 }}>{item.estimatedMin}m</span>}
          <EnergyDot energy={item.energy} />
          {item.isPriority && <span style={{ fontSize: 10, color: C.primary, fontWeight: 700, letterSpacing: '0.05em' }}>★ ONE THING</span>}
        </div>
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// VIEW: TODAY
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function TodayView({ items, meta, refresh, setView }) {
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const todayStr = now.toISOString().slice(0, 10);

  const todayActions = items
    .filter(i => i.type === 'action' && i.isToday && !i.completedAt)
    .sort((a, b) => {
      if (a.isPriority && !b.isPriority) return -1;
      if (!a.isPriority && b.isPriority) return 1;
      const order = { low: 0, medium: 1, high: 2 };
      return (order[a.energy] || 1) - (order[b.energy] || 1);
    });

  const quickWins = todayActions.filter(i => i.energy === 'low' && !i.isPriority);
  const priority = todayActions.find(i => i.isPriority);
  const mainFocus = todayActions.filter(i => i.energy !== 'low' && !i.isPriority);

  // Routines for today
  const routines = items.filter(i => i.type === 'routine');
  const todayRoutines = routines.filter(r => {
    if (r.recurrence?.frequency === 'weekdays') {
      const day = now.getDay();
      return day >= 1 && day <= 5;
    }
    return true; // daily shows every day, weekly shows every day (user picks when)
  });
  const pendingRoutines = todayRoutines.filter(r => r.recurrence?.lastCompletedDate !== todayStr);
  const doneRoutines = todayRoutines.filter(r => r.recurrence?.lastCompletedDate === todayStr);

  const waitingItems = items.filter(i => i.type === 'waiting' && !i.completedAt);
  const doneToday = items.filter(i => i.completedAt && new Date(i.completedAt).toDateString() === now.toDateString()).length;

  // Weekly review auto-prompt
  const needsReview = meta.needsReview;
  const daysSinceReview = meta.daysSinceReview;

  const completeAction = async (id) => {
    await api.complete(id);
    refresh();
  };

  const completeRoutine = async (id) => {
    await api.complete(id);
    refresh();
  };

  const getProjectName = (pid) => {
    if (!pid) return null;
    const p = items.find(i => itemId(i) === pid);
    return p?.text || null;
  };

  return (
    <div className="ve" style={{ padding: '24px 20px', maxWidth: 520, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12, color: C.t3, fontWeight: 500, marginBottom: 4 }}>{dateStr}</div>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, lineHeight: 1.2, fontFamily: 'var(--font-display)', letterSpacing: '-0.03em' }}>{greeting}</h1>
        {doneToday > 0 && <div style={{ fontSize: 13, color: C.success, marginTop: 6, fontWeight: 500 }}>✓ {doneToday} completed today</div>}
      </div>

      {/* Weekly Review Banner */}
      {needsReview && (
        <div className="review-banner" onClick={() => setView('review')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 22 }}>🔄</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.tertiary }}>Weekly Review needed</div>
              <div style={{ fontSize: 12, color: C.t3 }}>
                {daysSinceReview !== null ? `${daysSinceReview} days since last review` : 'You haven\'t done one yet'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Routines — Don't Break the Chain */}
      {todayRoutines.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <SectionTitle>🔁 Daily routines</SectionTitle>
          {pendingRoutines.map(r => (
            <RoutineRow key={itemId(r)} item={r} onComplete={() => completeRoutine(itemId(r))} />
          ))}
          {doneRoutines.map(r => (
            <RoutineRow key={itemId(r)} item={r} completed />
          ))}
        </div>
      )}

      {/* The ONE Thing */}
      {priority && (
        <div style={{ marginBottom: 24 }}>
          <SectionTitle>★ The ONE thing</SectionTitle>
          <ActionRow item={priority} onComplete={completeAction} showProject showArea projectName={getProjectName(priority.projectId)} />
        </div>
      )}

      {/* Quick wins */}
      {quickWins.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <SectionTitle>⚡ Quick wins — start here</SectionTitle>
          {quickWins.map(item => (
            <ActionRow key={itemId(item)} item={item} onComplete={completeAction} showProject showArea projectName={getProjectName(item.projectId)} />
          ))}
        </div>
      )}

      {/* Main focus */}
      {mainFocus.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <SectionTitle>🎯 Main focus</SectionTitle>
          {mainFocus.map(item => (
            <ActionRow key={itemId(item)} item={item} onComplete={completeAction} showProject showArea projectName={getProjectName(item.projectId)} />
          ))}
        </div>
      )}

      {todayActions.length === 0 && pendingRoutines.length === 0 && doneRoutines.length === 0 && (
        <Empty emoji="☀️" title="Nothing planned for today" sub="Go to Actions and flag some items, or process your inbox." />
      )}

      {/* Waiting for pulse */}
      {waitingItems.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <SectionTitle>⏳ Waiting for</SectionTitle>
          <div className="fc" style={{ padding: '12px 16px' }}>
            {waitingItems.map((w, i) => {
              const days = w.waitingSince ? Math.floor((Date.now() - new Date(w.waitingSince).getTime()) / 86400000) : 0;
              const heat = days > 14 ? C.error : days > 7 ? '#E8B931' : C.t2;
              return (
                <div key={itemId(w)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderTop: i > 0 ? `1px solid ${C.border}` : 'none' }}>
                  <div>
                    <span style={{ fontSize: 13, color: C.t1 }}>{w.waitingOn || w.text}</span>
                    {w.area && <> <AreaChip area={w.area} small /></>}
                  </div>
                  <span style={{ fontSize: 11, color: heat, fontWeight: 600, flexShrink: 0, marginLeft: 8 }}>{days}d</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
      <div style={{ height: 100 }} />
    </div>
  );
}

// Routine row with streak display
function RoutineRow({ item, completed, onComplete }) {
  const [justDone, setJustDone] = useState(false);
  const streak = item.recurrence?.streak || 0;
  const bestStreak = item.recurrence?.bestStreak || 0;

  const handleComplete = () => {
    if (completed || justDone) return;
    setJustDone(true);
    setTimeout(() => onComplete?.(), 400);
  };

  const isDone = completed || justDone;

  return (
    <div className={`fc ${streak >= 3 && !isDone ? 'streak-card' : ''}`}
      style={{ marginBottom: 8, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, opacity: isDone ? 0.5 : 1, transition: 'opacity 0.4s' }}>
      <div className={`cc ${isDone ? 'done' : ''}`} onClick={handleComplete} style={{ cursor: isDone ? 'default' : 'pointer' }}>
        {isDone && <span style={{ color: C.onPri, fontSize: 12, fontWeight: 700 }}>✓</span>}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, color: isDone ? C.t3 : C.t1, textDecoration: isDone ? 'line-through' : 'none' }}>{item.text}</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
          {item.area && <AreaChip area={item.area} small />}
          <EnergyDot energy={item.energy} />
        </div>
      </div>
      {/* Streak counter */}
      <div style={{ textAlign: 'center', flexShrink: 0 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: streak >= 7 ? C.success : streak >= 3 ? '#E8B931' : C.t3, fontFamily: 'var(--font-display)', lineHeight: 1 }}>
          {isDone ? streak + (justDone ? 1 : 0) : streak}
        </div>
        <div style={{ fontSize: 9, color: C.t3, letterSpacing: '0.05em' }}>STREAK</div>
        {bestStreak > 0 && <div style={{ fontSize: 9, color: C.t4 }}>best: {bestStreak}</div>}
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// VIEW: INBOX
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function InboxView({ items, refresh }) {
  const inboxItems = items.filter(i => i.type === 'inbox');
  const [step, setStep] = useState(0);
  const [nextAction, setNextAction] = useState('');
  const [isProject, setIsProject] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [area, setArea] = useState(null);
  const [energy, setEnergy] = useState('medium');
  const [doToday, setDoToday] = useState(false);

  const current = inboxItems[0];

  const reset = () => { setStep(0); setNextAction(''); setIsProject(false); setProjectName(''); setArea(null); setEnergy('medium'); setDoToday(false); };

  const handleNotActionable = async (dest) => {
    if (dest === 'trash') await api.remove(itemId(current));
    else if (dest === 'someday') await api.update(itemId(current), { type: 'someday' });
    reset(); refresh();
  };

  const handleSave = async () => {
    if (isProject) {
      const proj = await api.create({ text: projectName.trim() || current.text, type: 'project', area });
      await api.create({ text: nextAction.trim(), type: 'action', projectId: itemId(proj), area, energy, isToday: doToday });
      await api.remove(itemId(current));
    } else {
      await api.update(itemId(current), { text: nextAction.trim() || current.text, type: 'action', area, energy, isToday: doToday });
    }
    reset(); refresh();
  };

  if (inboxItems.length === 0) {
    return (
      <div className="ve" style={{ padding: '24px 20px', maxWidth: 520, margin: '0 auto' }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-display)', margin: '0 0 8px', letterSpacing: '-0.02em' }}>Inbox</h2>
        <Empty emoji="🌊" title="Inbox zero" sub="Mind like water. Everything is captured and processed." />
      </div>
    );
  }

  return (
    <div className="ve" style={{ padding: '24px 20px', maxWidth: 520, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-display)', margin: 0, letterSpacing: '-0.02em' }}>Inbox</h2>
        <span style={{ background: `${C.tertiary}20`, color: C.tertiary, padding: '4px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600 }}>{inboxItems.length} item{inboxItems.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Current item */}
      <div className="fc" style={{ padding: '24px 22px', marginBottom: 16, border: `1px solid ${C.primary}20`, background: `linear-gradient(135deg, ${C.s1} 0%, ${C.s2} 100%)` }}>
        <div style={{ fontSize: 10, color: C.t3, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>Processing</div>
        <div style={{ fontSize: 17, color: C.t1, lineHeight: 1.55, fontWeight: 500 }}>{current.text}</div>
      </div>

      {/* Step 0: Actionable? */}
      {step === 0 && (
        <div style={{ animation: 'fadeIn 0.25s ease-out' }}>
          <div style={{ fontSize: 14, color: C.t2, marginBottom: 14, fontWeight: 500 }}>Is this actionable?</div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="fb fb-p" style={{ flex: 1 }} onClick={() => setStep(1)}>Yes — I can act on this</button>
            <button className="fb fb-g" style={{ flex: 1 }} onClick={() => setStep('na')}>No</button>
          </div>
        </div>
      )}

      {step === 'na' && (
        <div style={{ animation: 'fadeIn 0.25s ease-out', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 14, color: C.t2, marginBottom: 6, fontWeight: 500 }}>What should happen?</div>
          <button className="fb fb-g" onClick={() => handleNotActionable('someday')}>💭 Someday / Maybe</button>
          <button className="fb fb-g" onClick={() => handleNotActionable('trash')} style={{ color: C.t3 }}>🗑️ Delete</button>
          <button className="fb fb-g" onClick={() => setStep(0)} style={{ color: C.t3, fontSize: 12 }}>← Back</button>
        </div>
      )}

      {/* Step 1: Next action */}
      {step === 1 && (
        <div style={{ animation: 'fadeIn 0.25s ease-out' }}>
          <div style={{ fontSize: 14, color: C.t2, marginBottom: 6, fontWeight: 500 }}>What's the very next physical action?</div>
          <div style={{ fontSize: 12, color: C.t3, marginBottom: 12, lineHeight: 1.5 }}>Be specific. Not "work on proposal" → "Write the pricing section"</div>
          <input className="fi" value={nextAction} onChange={e => setNextAction(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && nextAction.trim() && setStep(2)}
            placeholder="e.g. Send Rahul the pricing PDF" autoFocus />
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button className="fb fb-p" style={{ flex: 1 }} onClick={() => nextAction.trim() && setStep(2)} disabled={!nextAction.trim()}>Next</button>
            <button className="fb fb-g" onClick={() => setStep(0)}>← Back</button>
          </div>
        </div>
      )}

      {/* Step 2: Organize */}
      {step === 2 && (
        <div style={{ animation: 'fadeIn 0.25s ease-out' }}>
          {/* Project? */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 14, color: C.t2, marginBottom: 10, fontWeight: 500 }}>More than one step?</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className={`fb ${isProject ? 'fb-p' : 'fb-g'}`} style={{ flex: 1 }} onClick={() => setIsProject(true)}>Yes — it's a project</button>
              <button className={`fb ${!isProject ? 'fb-p' : 'fb-g'}`} style={{ flex: 1 }} onClick={() => setIsProject(false)}>No — just this action</button>
            </div>
            {isProject && <input className="fi" style={{ marginTop: 10 }} value={projectName} onChange={e => setProjectName(e.target.value)} placeholder="Project name (the outcome)" autoFocus />}
          </div>
          {/* Area */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 13, color: C.t2, marginBottom: 8, fontWeight: 500 }}>Which area?</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {AREAS.map(a => (
                <button key={a.id} className="fch" onClick={() => setArea(a.id)} style={{
                  background: area === a.id ? `${a.color}25` : C.s3, color: area === a.id ? a.color : C.t2,
                  border: `1px solid ${area === a.id ? a.color + '40' : 'transparent'}`,
                }}>{a.label}</button>
              ))}
            </div>
          </div>
          {/* Energy */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 13, color: C.t2, marginBottom: 8, fontWeight: 500 }}>How much energy?</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {ENERGY.map(e => (
                <button key={e.id} className="fch" onClick={() => setEnergy(e.id)} style={{
                  background: energy === e.id ? `${e.color}25` : C.s3, color: energy === e.id ? e.color : C.t2,
                  border: `1px solid ${energy === e.id ? e.color + '40' : 'transparent'}`, flex: 1, justifyContent: 'center',
                }}>{e.icon} {e.label}</button>
              ))}
            </div>
          </div>
          {/* Today? */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 13, color: C.t2, marginBottom: 8, fontWeight: 500 }}>Do this today?</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className={`fb ${doToday ? 'fb-p' : 'fb-g'}`} style={{ flex: 1 }} onClick={() => setDoToday(true)}>Yes</button>
              <button className={`fb ${!doToday ? 'fb-p' : 'fb-g'}`} style={{ flex: 1 }} onClick={() => setDoToday(false)}>Not today</button>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="fb fb-p" style={{ flex: 1 }} onClick={handleSave}>Save & Next</button>
            <button className="fb fb-g" onClick={() => setStep(1)}>← Back</button>
          </div>
        </div>
      )}
      <div style={{ height: 100 }} />
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// VIEW: NEXT ACTIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function ActionsView({ items, refresh }) {
  const [fa, setFa] = useState(null);
  const [fe, setFe] = useState(null);

  const actions = items
    .filter(i => i.type === 'action' && !i.completedAt)
    .filter(i => !fa || i.area === fa)
    .filter(i => !fe || i.energy === fe)
    .sort((a, b) => {
      const order = { low: 0, medium: 1, high: 2 };
      return (order[a.energy] || 1) - (order[b.energy] || 1);
    });

  const getProjectName = (pid) => { if (!pid) return null; const p = items.find(i => itemId(i) === pid); return p?.text || null; };
  const completeAction = async (id) => { await api.complete(id); refresh(); };
  const toggleToday = async (item) => { await api.update(itemId(item), { isToday: !item.isToday }); refresh(); };

  return (
    <div className="ve" style={{ padding: '24px 20px', maxWidth: 520, margin: '0 auto' }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-display)', margin: '0 0 16px', letterSpacing: '-0.02em' }}>Next Actions</h2>
      {/* Area filter */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
        <button className="fch" onClick={() => setFa(null)} style={{ background: !fa ? `${C.primary}20` : C.s3, color: !fa ? C.primary : C.t3, border: `1px solid ${!fa ? C.primary + '30' : 'transparent'}` }}>All</button>
        {AREAS.map(a => (
          <button key={a.id} className="fch" onClick={() => setFa(fa === a.id ? null : a.id)} style={{
            background: fa === a.id ? `${a.color}20` : C.s3, color: fa === a.id ? a.color : C.t3, border: `1px solid ${fa === a.id ? a.color + '30' : 'transparent'}`,
          }}>{a.label}</button>
        ))}
      </div>
      {/* Energy filter */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        <button className="fch" onClick={() => setFe(null)} style={{ background: !fe ? `${C.primary}20` : C.s3, color: !fe ? C.primary : C.t3, border: `1px solid ${!fe ? C.primary + '30' : 'transparent'}` }}>All energy</button>
        {ENERGY.map(e => (
          <button key={e.id} className="fch" onClick={() => setFe(fe === e.id ? null : e.id)} style={{
            background: fe === e.id ? `${e.color}20` : C.s3, color: fe === e.id ? e.color : C.t3, border: `1px solid ${fe === e.id ? e.color + '30' : 'transparent'}`,
          }}>{e.icon} {e.label}</button>
        ))}
      </div>
      {actions.length === 0 ? (
        <Empty emoji="✨" title="No actions here" sub={fa || fe ? "Try removing filters." : "Process your inbox to create actions."} />
      ) : actions.map(item => (
        <div key={itemId(item)} style={{ position: 'relative' }}>
          <ActionRow item={item} onComplete={completeAction} showArea showProject projectName={getProjectName(item.projectId)} onTap={toggleToday} />
          {item.isToday && <div style={{ position: 'absolute', top: 8, right: 8, fontSize: 9, color: C.primary, fontWeight: 600, background: `${C.primary}15`, padding: '2px 6px', borderRadius: 4, letterSpacing: '0.05em', textTransform: 'uppercase' }}>TODAY</div>}
        </div>
      ))}
      <div style={{ height: 100 }} />
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// VIEW: PROJECTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function ProjectDetail({ project, items, refresh, onBack }) {
  const [showAdd, setShowAdd] = useState(false);
  const [newAction, setNewAction] = useState('');
  const [newEnergy, setNewEnergy] = useState('medium');
  const pid = itemId(project);
  const projectActions = items.filter(i => i.projectId === pid && i.type === 'action' && !i.completedAt);
  const doneActions = items.filter(i => i.projectId === pid && i.completedAt);
  const waitingItems = items.filter(i => i.projectId === pid && i.type === 'waiting' && !i.completedAt);

  const addAction = async () => {
    if (!newAction.trim()) return;
    await api.create({ text: newAction.trim(), type: 'action', projectId: pid, area: project.area, energy: newEnergy });
    setNewAction(''); setShowAdd(false); refresh();
  };

  return (
    <div className="ve" style={{ padding: '24px 20px', maxWidth: 520, margin: '0 auto' }}>
      <button onClick={onBack} className="fb fb-g" style={{ marginBottom: 16, padding: '6px 12px', fontSize: 13 }}>← Projects</button>
      <div style={{ marginBottom: 20 }}>
        {project.area && <AreaChip area={project.area} />}
        <h2 style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-display)', margin: '6px 0 0', letterSpacing: '-0.02em', lineHeight: 1.3 }}>{project.text}</h2>
        {project.notes && <p style={{ fontSize: 13, color: C.t3, marginTop: 8, lineHeight: 1.55 }}>{project.notes}</p>}
      </div>
      <SectionTitle right={<button onClick={() => setShowAdd(v => !v)} className="fch" style={{ background: `${C.primary}15`, color: C.primary, border: `1px solid ${C.primary}30` }}>+ Add action</button>}>🎯 Next actions ({projectActions.length})</SectionTitle>
      {showAdd && (
        <div className="fc" style={{ marginBottom: 12, border: `1px solid ${C.primary}25` }}>
          <input className="fi" value={newAction} onChange={e => setNewAction(e.target.value)} onKeyDown={e => e.key === 'Enter' && addAction()} placeholder="Next physical action..." autoFocus style={{ marginBottom: 10 }} />
          <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
            {ENERGY.map(e => (<button key={e.id} className="fch" onClick={() => setNewEnergy(e.id)} style={{ background: newEnergy === e.id ? `${e.color}25` : C.s3, color: newEnergy === e.id ? e.color : C.t3, border: `1px solid ${newEnergy === e.id ? e.color + '40' : 'transparent'}`, flex: 1, justifyContent: 'center' }}>{e.icon} {e.label}</button>))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="fb fb-p" style={{ flex: 1 }} onClick={addAction}>Save</button>
            <button className="fb fb-g" onClick={() => setShowAdd(false)}>Cancel</button>
          </div>
        </div>
      )}
      {projectActions.length === 0 && !showAdd && (
        <div className="fc" style={{ textAlign: 'center', padding: '20px 16px', marginBottom: 16, border: `1px solid ${C.error}30` }}>
          <div style={{ fontSize: 13, color: C.error, fontWeight: 600 }}>⚠️ No next action — this project is stuck</div>
        </div>
      )}
      {projectActions.map(item => (<ActionRow key={itemId(item)} item={item} onComplete={async (id) => { await api.complete(id); refresh(); }} />))}
      {waitingItems.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <SectionTitle>⏳ Waiting for</SectionTitle>
          {waitingItems.map(w => { const days = w.waitingSince ? Math.floor((Date.now() - new Date(w.waitingSince).getTime()) / 86400000) : 0; return (
            <div key={itemId(w)} className="fc" style={{ marginBottom: 8, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: C.t1 }}>{w.waitingOn || w.text}</span>
              <span style={{ fontSize: 11, color: days > 7 ? C.error : C.t3, fontWeight: 600 }}>{days}d</span>
            </div>
          ); })}
        </div>
      )}
      {doneActions.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <SectionTitle>✓ Completed ({doneActions.length})</SectionTitle>
          {doneActions.map(item => (<div key={itemId(item)} style={{ padding: '6px 0', fontSize: 13, color: C.t3, textDecoration: 'line-through' }}>{item.text}</div>))}
        </div>
      )}
      <div style={{ height: 100 }} />
    </div>
  );
}

function ProjectsView({ items, refresh }) {
  const [sel, setSel] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newArea, setNewArea] = useState(null);
  const projects = items.filter(i => i.type === 'project' && !i.completedAt);

  if (sel) {
    const proj = items.find(i => itemId(i) === sel);
    if (!proj) { setSel(null); return null; }
    return <ProjectDetail project={proj} items={items} refresh={refresh} onBack={() => setSel(null)} />;
  }

  const addProject = async () => {
    if (!newName.trim()) return;
    await api.create({ text: newName.trim(), type: 'project', area: newArea });
    setNewName(''); setNewArea(null); setShowAdd(false); refresh();
  };

  return (
    <div className="ve" style={{ padding: '24px 20px', maxWidth: 520, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-display)', margin: 0, letterSpacing: '-0.02em' }}>Projects</h2>
        <button onClick={() => setShowAdd(v => !v)} className="fch" style={{ background: `${C.primary}15`, color: C.primary, border: `1px solid ${C.primary}30`, padding: '5px 12px', fontSize: 12 }}>+ New</button>
      </div>
      {showAdd && (
        <div className="fc" style={{ marginBottom: 16, border: `1px solid ${C.primary}25` }}>
          <input className="fi" value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addProject()} placeholder="Project name (the outcome)" autoFocus style={{ marginBottom: 10 }} />
          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            {AREAS.map(a => (<button key={a.id} className="fch" onClick={() => setNewArea(a.id)} style={{ background: newArea === a.id ? `${a.color}25` : C.s3, color: newArea === a.id ? a.color : C.t3, border: `1px solid ${newArea === a.id ? a.color + '40' : 'transparent'}`, flex: 1, justifyContent: 'center' }}>{a.label}</button>))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="fb fb-p" style={{ flex: 1 }} onClick={addProject}>Create</button>
            <button className="fb fb-g" onClick={() => setShowAdd(false)}>Cancel</button>
          </div>
        </div>
      )}
      {projects.length === 0 && !showAdd ? (
        <Empty emoji="📋" title="No active projects" sub="A project is any outcome requiring more than one step." />
      ) : projects.map(proj => {
        const na = items.find(i => i.projectId === itemId(proj) && i.type === 'action' && !i.completedAt);
        const cnt = items.filter(i => i.projectId === itemId(proj) && i.type === 'action' && !i.completedAt).length;
        const stuck = !na;
        return (
          <div key={itemId(proj)} className="fc" onClick={() => setSel(itemId(proj))}
            style={{ marginBottom: 10, cursor: 'pointer', border: stuck ? `1px solid ${C.error}30` : `1px solid ${C.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, gap: 8 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: C.t1, lineHeight: 1.4, flex: 1 }}>{proj.text}</div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                {proj.area && <AreaChip area={proj.area} small />}
                <span style={{ fontSize: 11, color: C.t3 }}>{cnt}</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{ color: stuck ? C.error : C.primary, fontSize: 13 }}>→</span>
              <span style={{ fontSize: 13, lineHeight: 1.4, color: stuck ? C.error : C.t2, fontStyle: stuck ? 'italic' : 'normal' }}>
                {stuck ? 'No next action — stuck!' : na.text}
              </span>
            </div>
          </div>
        );
      })}
      <div style={{ height: 100 }} />
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// VIEW: WAITING FOR
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function WaitingView({ items, refresh }) {
  const [showAdd, setShowAdd] = useState(false);
  const [t, setT] = useState(''); const [w, setW] = useState(''); const [a, setA] = useState(null);
  const waiting = items.filter(i => i.type === 'waiting' && !i.completedAt).sort((a, b) => {
    const dA = a.waitingSince ? new Date(a.waitingSince).getTime() : Date.now();
    const dB = b.waitingSince ? new Date(b.waitingSince).getTime() : Date.now();
    return dA - dB;
  });

  const addW = async () => {
    if (!t.trim()) return;
    await api.create({ text: t.trim(), type: 'waiting', waitingOn: w.trim() || null, area: a, waitingSince: new Date().toISOString() });
    setT(''); setW(''); setA(null); setShowAdd(false); refresh();
  };

  return (
    <div className="ve" style={{ padding: '24px 20px', maxWidth: 520, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-display)', margin: 0, letterSpacing: '-0.02em' }}>Waiting For</h2>
        <button onClick={() => setShowAdd(v => !v)} className="fch" style={{ background: `${C.primary}15`, color: C.primary, border: `1px solid ${C.primary}30`, padding: '5px 12px', fontSize: 12 }}>+ Add</button>
      </div>
      {showAdd && (
        <div className="fc" style={{ marginBottom: 16, border: `1px solid ${C.primary}25` }}>
          <input className="fi" value={t} onChange={e => setT(e.target.value)} placeholder="What are you waiting for?" autoFocus style={{ marginBottom: 8 }} />
          <input className="fi" value={w} onChange={e => setW(e.target.value)} placeholder="Who from?" style={{ marginBottom: 8 }} />
          <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
            {AREAS.map(ar => (<button key={ar.id} className="fch" onClick={() => setA(ar.id)} style={{ background: a === ar.id ? `${ar.color}25` : C.s3, color: a === ar.id ? ar.color : C.t3, flex: 1, justifyContent: 'center', border: `1px solid ${a === ar.id ? ar.color + '40' : 'transparent'}` }}>{ar.label}</button>))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}><button className="fb fb-p" style={{ flex: 1 }} onClick={addW}>Save</button><button className="fb fb-g" onClick={() => setShowAdd(false)}>Cancel</button></div>
        </div>
      )}
      {waiting.length === 0 && !showAdd ? (
        <Empty emoji="📨" title="Nothing waiting" sub="Track things you're waiting on here." />
      ) : waiting.map(item => {
        const days = item.waitingSince ? Math.floor((Date.now() - new Date(item.waitingSince).getTime()) / 86400000) : 0;
        const heat = days > 14 ? C.error : days > 7 ? '#E8B931' : C.t2;
        const bar = Math.min(100, (days / 14) * 100);
        return (
          <div key={itemId(item)} className="fc" style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6, gap: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, color: C.t1, fontWeight: 500, lineHeight: 1.4 }}>{item.text}</div>
                {item.waitingOn && <div style={{ fontSize: 12, color: C.t3, marginTop: 3 }}>from {item.waitingOn}</div>}
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: heat, fontFamily: 'var(--font-display)', lineHeight: 1 }}>{days}</div>
                <div style={{ fontSize: 10, color: C.t3 }}>days</div>
              </div>
            </div>
            <div style={{ height: 3, background: C.s3, borderRadius: 2, marginBottom: 10, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${bar}%`, background: heat, borderRadius: 2, transition: 'width 0.3s' }} />
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {item.area && <AreaChip area={item.area} small />}
              <div style={{ flex: 1 }} />
              <button className="fch" onClick={async () => { await api.create({ text: `Follow up with ${item.waitingOn || 'them'} about: ${item.text}`, type: 'action', area: item.area, energy: 'low', projectId: item.projectId, isToday: true }); refresh(); }} style={{ background: `${C.primary}12`, color: C.primary, fontSize: 11 }}>Follow up</button>
              <button className="fch" onClick={async () => { await api.complete(itemId(item)); refresh(); }} style={{ background: `${C.success}12`, color: C.success, fontSize: 11 }}>Received ✓</button>
            </div>
          </div>
        );
      })}
      <div style={{ height: 100 }} />
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// VIEW: ROUTINES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function RoutinesView({ items, refresh }) {
  const [showAdd, setShowAdd] = useState(false);
  const [t, setT] = useState(''); const [a, setA] = useState(null);
  const [e, setE] = useState('low'); const [f, setF] = useState('daily');
  const routines = items.filter(i => i.type === 'routine');

  const addR = async () => {
    if (!t.trim()) return;
    await api.create({ text: t.trim(), type: 'routine', area: a, energy: e, recurrence: { frequency: f, streak: 0, bestStreak: 0, lastCompletedDate: null } });
    setT(''); setA(null); setE('low'); setF('daily'); setShowAdd(false); refresh();
  };

  const deleteR = async (id) => { await api.remove(id); refresh(); };

  return (
    <div className="ve" style={{ padding: '24px 20px', maxWidth: 520, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-display)', margin: 0, letterSpacing: '-0.02em' }}>Routines</h2>
        <button onClick={() => setShowAdd(v => !v)} className="fch" style={{ background: `${C.primary}15`, color: C.primary, border: `1px solid ${C.primary}30`, padding: '5px 12px', fontSize: 12 }}>+ Add</button>
      </div>
      <div style={{ fontSize: 13, color: C.t3, marginBottom: 18, lineHeight: 1.5 }}>
        Daily habits that build momentum. Don't break the chain.
      </div>

      {showAdd && (
        <div className="fc" style={{ marginBottom: 16, border: `1px solid ${C.primary}25` }}>
          <input className="fi" value={t} onChange={e => setT(e.target.value)} placeholder="e.g. Find 5 new prospects" autoFocus style={{ marginBottom: 8 }} />
          <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
            {[{ id: 'daily', label: '🔄 Daily' }, { id: 'weekdays', label: '📅 Weekdays' }, { id: 'weekly', label: '📆 Weekly' }].map(fr => (
              <button key={fr.id} className="fch" onClick={() => setF(fr.id)} style={{
                background: f === fr.id ? `${C.primary}25` : C.s3, color: f === fr.id ? C.primary : C.t3, flex: 1, justifyContent: 'center',
                border: `1px solid ${f === fr.id ? C.primary + '40' : 'transparent'}`,
              }}>{fr.label}</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
            {AREAS.map(ar => (<button key={ar.id} className="fch" onClick={() => setA(ar.id)} style={{ background: a === ar.id ? `${ar.color}25` : C.s3, color: a === ar.id ? ar.color : C.t3, flex: 1, justifyContent: 'center', border: `1px solid ${a === ar.id ? ar.color + '40' : 'transparent'}` }}>{ar.label}</button>))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}><button className="fb fb-p" style={{ flex: 1 }} onClick={addR}>Create routine</button><button className="fb fb-g" onClick={() => setShowAdd(false)}>Cancel</button></div>
        </div>
      )}

      {routines.length === 0 && !showAdd ? (
        <Empty emoji="🔁" title="No routines yet" sub="Create daily habits that compound over time. Start small." action={<button className="fb fb-p" onClick={() => setShowAdd(true)}>+ Create first routine</button>} />
      ) : routines.map(r => (
        <div key={itemId(r)} className="fc" style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, color: C.t1, fontWeight: 500 }}>{r.text}</div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 4 }}>
              {r.area && <AreaChip area={r.area} small />}
              <span style={{ fontSize: 10, color: C.t3 }}>{r.recurrence?.frequency}</span>
            </div>
          </div>
          <div style={{ textAlign: 'center', flexShrink: 0, marginRight: 8 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: (r.recurrence?.streak || 0) >= 7 ? C.success : (r.recurrence?.streak || 0) >= 3 ? '#E8B931' : C.t3, fontFamily: 'var(--font-display)', lineHeight: 1 }}>{r.recurrence?.streak || 0}</div>
            <div style={{ fontSize: 9, color: C.t3, letterSpacing: '0.05em' }}>STREAK</div>
          </div>
          <button className="fch" onClick={() => deleteR(itemId(r))} style={{ background: `${C.error}12`, color: C.error, fontSize: 11, flexShrink: 0 }}>×</button>
        </div>
      ))}
      <div style={{ height: 100 }} />
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// VIEW: SOMEDAY
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function SomedayView({ items, refresh }) {
  const [showAdd, setShowAdd] = useState(false);
  const [t, setT] = useState('');
  const list = items.filter(i => i.type === 'someday' && !i.completedAt);

  const addS = async () => { if (!t.trim()) return; await api.create({ text: t.trim(), type: 'someday' }); setT(''); setShowAdd(false); refresh(); };

  return (
    <div className="ve" style={{ padding: '24px 20px', maxWidth: 520, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-display)', margin: 0, letterSpacing: '-0.02em' }}>Someday / Maybe</h2>
        <button onClick={() => setShowAdd(v => !v)} className="fch" style={{ background: `${C.primary}15`, color: C.primary, border: `1px solid ${C.primary}30`, padding: '5px 12px', fontSize: 12 }}>+ Add</button>
      </div>
      <div style={{ fontSize: 13, color: C.t3, marginBottom: 18, lineHeight: 1.5 }}>Ideas for later. No pressure. Reviewed weekly.</div>
      {showAdd && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <input className="fi" value={t} onChange={e => setT(e.target.value)} onKeyDown={e => e.key === 'Enter' && addS()} placeholder="Maybe someday..." autoFocus style={{ flex: 1 }} />
          <button className="fb fb-p" onClick={addS} style={{ padding: '10px 16px' }}>Save</button>
        </div>
      )}
      {list.length === 0 && !showAdd ? <Empty emoji="💭" title="Nothing here" sub="Parking lot for ideas not ready for action." /> :
        list.map(item => (
          <div key={itemId(item)} className="fc" style={{ marginBottom: 8, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14, color: C.t1, flex: 1 }}>{item.text}</span>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <button className="fch" onClick={async () => { await api.update(itemId(item), { type: 'inbox' }); refresh(); }} style={{ background: `${C.primary}12`, color: C.primary, fontSize: 11 }}>Activate</button>
              <button className="fch" onClick={async () => { await api.remove(itemId(item)); refresh(); }} style={{ background: `${C.error}12`, color: C.error, fontSize: 11 }}>×</button>
            </div>
          </div>
        ))}
      <div style={{ height: 100 }} />
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// VIEW: WEEKLY REVIEW
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const RS = [
  { id: 'dump', label: 'Brain Dump', icon: '🧠', desc: 'Get everything out of your head.' },
  { id: 'inbox', label: 'Inbox Zero', icon: '📥', desc: 'Process every inbox item.' },
  { id: 'projects', label: 'Projects', icon: '📋', desc: 'Is each next action still current?' },
  { id: 'waiting', label: 'Waiting For', icon: '⏳', desc: 'Anyone to follow up with?' },
  { id: 'routines', label: 'Routines', icon: '🔁', desc: 'Keep, modify, or drop routines?' },
  { id: 'someday', label: 'Someday', icon: '💭', desc: 'Promote or delete?' },
  { id: 'focus', label: 'Set the Week', icon: '🎯', desc: 'Pick top actions for tomorrow.' },
  { id: 'done', label: 'Complete', icon: '✅', desc: '' },
];

function ReviewView({ items, meta, refresh, setView }) {
  const [step, setStep] = useState(0);
  const [dump, setDump] = useState('');
  const cs = RS[step];
  const projects = items.filter(i => i.type === 'project' && !i.completedAt);
  const waiting = items.filter(i => i.type === 'waiting' && !i.completedAt);
  const routines = items.filter(i => i.type === 'routine');
  const someday = items.filter(i => i.type === 'someday' && !i.completedAt);
  const inboxCount = items.filter(i => i.type === 'inbox').length;
  const allActions = items.filter(i => i.type === 'action' && !i.completedAt);

  const handleDump = async () => {
    if (dump.trim()) { await api.capture(dump); refresh(); }
    setDump(''); setStep(1);
  };
  const finish = async () => { await api.saveReview(new Date().toISOString()); refresh(); setStep(RS.length - 1); };

  return (
    <div className="ve" style={{ padding: '24px 20px', maxWidth: 520, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-display)', margin: 0, letterSpacing: '-0.02em' }}>Weekly Review</h2>
        <span style={{ fontSize: 11, color: C.t3 }}>{meta.lastReviewDate ? `Last: ${new Date(meta.lastReviewDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : 'Never'}</span>
      </div>
      {/* Progress */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24 }}>
        {RS.slice(0, -1).map((s, i) => (<div key={s.id} className={`ps ${i < step ? 'd' : i === step ? 'c' : ''}`} onClick={() => i <= step && setStep(i)} />))}
      </div>
      {step < RS.length - 1 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>{cs.icon}</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: C.t1, marginBottom: 4, fontFamily: 'var(--font-display)' }}>Step {step + 1}: {cs.label}</div>
          <div style={{ fontSize: 14, color: C.t2, lineHeight: 1.55 }}>{cs.desc}</div>
        </div>
      )}

      {/* Step 0: Dump */}
      {step === 0 && (<div>
        <textarea className="fi" value={dump} onChange={e => setDump(e.target.value)} placeholder={"What's on your mind?\nOne item per line."} rows={8} style={{ resize: 'vertical', lineHeight: 1.6 }} />
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button className="fb fb-p" style={{ flex: 1 }} onClick={handleDump}>Capture & continue</button>
          <button className="fb fb-g" onClick={() => setStep(1)}>Skip</button>
        </div>
      </div>)}

      {/* Step 1: Inbox */}
      {step === 1 && (<div>
        {inboxCount > 0 ? (<>
          <div className="fc" style={{ marginBottom: 16, textAlign: 'center', padding: '20px' }}>
            <div style={{ fontSize: 36, fontWeight: 700, color: C.tertiary, fontFamily: 'var(--font-display)' }}>{inboxCount}</div>
            <div style={{ fontSize: 13, color: C.t3 }}>items in inbox</div>
          </div>
          <button className="fb fb-p" style={{ width: '100%', marginBottom: 8 }} onClick={() => setView('inbox')}>Go process inbox →</button>
        </>) : <div style={{ textAlign: 'center', padding: '24px' }}><div style={{ fontSize: 28, marginBottom: 8 }}>🌊</div><div style={{ fontSize: 14, color: C.success, fontWeight: 600 }}>Inbox zero!</div></div>}
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}><button className="fb fb-g" onClick={() => setStep(0)}>← Back</button><button className="fb fb-p" style={{ flex: 1 }} onClick={() => setStep(2)}>Next →</button></div>
      </div>)}

      {/* Step 2: Projects */}
      {step === 2 && (<div>
        {projects.length === 0 ? <div style={{ textAlign: 'center', padding: '24px', fontSize: 13, color: C.t3 }}>No active projects.</div> :
          projects.map(p => {
            const na = items.find(i => i.projectId === itemId(p) && i.type === 'action' && !i.completedAt);
            return (<div key={itemId(p)} className="fc" style={{ marginBottom: 10, border: !na ? `1px solid ${C.error}30` : undefined }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.t1, marginBottom: 6 }}>{p.text}</div>
              <div style={{ fontSize: 13, color: !na ? C.error : C.t2, fontStyle: !na ? 'italic' : 'normal' }}>→ {!na ? '⚠️ Stuck!' : na.text}</div>
            </div>);
          })}
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}><button className="fb fb-g" onClick={() => setStep(1)}>← Back</button><button className="fb fb-p" style={{ flex: 1 }} onClick={() => setStep(3)}>Next →</button></div>
      </div>)}

      {/* Step 3: Waiting */}
      {step === 3 && (<div>
        {waiting.length === 0 ? <div style={{ textAlign: 'center', padding: '24px', fontSize: 13, color: C.t3 }}>Nothing waiting.</div> :
          waiting.map(w => { const days = w.waitingSince ? Math.floor((Date.now() - new Date(w.waitingSince).getTime()) / 86400000) : 0; return (
            <div key={itemId(w)} className="fc" style={{ marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div><div style={{ fontSize: 14, color: C.t1 }}>{w.text}</div>{w.waitingOn && <div style={{ fontSize: 12, color: C.t3 }}>from {w.waitingOn}</div>}</div>
              <span style={{ fontSize: 13, fontWeight: 600, color: days > 7 ? C.error : C.t3 }}>{days}d</span>
            </div>); })}
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}><button className="fb fb-g" onClick={() => setStep(2)}>← Back</button><button className="fb fb-p" style={{ flex: 1 }} onClick={() => setStep(4)}>Next →</button></div>
      </div>)}

      {/* Step 4: Routines */}
      {step === 4 && (<div>
        {routines.length === 0 ? <div style={{ textAlign: 'center', padding: '24px', fontSize: 13, color: C.t3 }}>No routines to review.</div> :
          routines.map(r => (
            <div key={itemId(r)} className="fc" style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1 }}><div style={{ fontSize: 14, color: C.t1 }}>{r.text}</div><div style={{ fontSize: 12, color: C.t3 }}>{r.recurrence?.frequency} · streak: {r.recurrence?.streak || 0}</div></div>
              <button className="fch" onClick={async () => { await api.remove(itemId(r)); refresh(); }} style={{ background: `${C.error}12`, color: C.error, fontSize: 11 }}>Drop</button>
            </div>
          ))}
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}><button className="fb fb-g" onClick={() => setStep(3)}>← Back</button><button className="fb fb-p" style={{ flex: 1 }} onClick={() => setStep(5)}>Next →</button></div>
      </div>)}

      {/* Step 5: Someday */}
      {step === 5 && (<div>
        {someday.length === 0 ? <div style={{ textAlign: 'center', padding: '24px', fontSize: 13, color: C.t3 }}>No someday items.</div> :
          someday.map(item => (
            <div key={itemId(item)} className="fc" style={{ marginBottom: 8, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 14, color: C.t1 }}>{item.text}</span>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button className="fch" onClick={async () => { await api.update(itemId(item), { type: 'inbox' }); refresh(); }} style={{ background: `${C.primary}12`, color: C.primary, fontSize: 11 }}>Activate</button>
                <button className="fch" onClick={async () => { await api.remove(itemId(item)); refresh(); }} style={{ background: `${C.error}12`, color: C.error, fontSize: 11 }}>×</button>
              </div>
            </div>))}
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}><button className="fb fb-g" onClick={() => setStep(4)}>← Back</button><button className="fb fb-p" style={{ flex: 1 }} onClick={() => setStep(6)}>Next →</button></div>
      </div>)}

      {/* Step 6: Set week */}
      {step === 6 && (<div>
        <div style={{ fontSize: 13, color: C.t2, marginBottom: 14, lineHeight: 1.5 }}>Pick your top actions for tomorrow. Tap to flag.</div>
        {allActions.slice(0, 12).map(item => (
          <div key={itemId(item)} className="fc" onClick={async () => { await api.update(itemId(item), { isToday: !item.isToday }); refresh(); }}
            style={{ marginBottom: 8, padding: '12px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12,
              border: item.isToday ? `1px solid ${C.primary}40` : undefined, background: item.isToday ? `${C.primary}08` : C.s1 }}>
            <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${item.isToday ? C.primary : C.t3}`, background: item.isToday ? C.primary : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {item.isToday && <span style={{ color: C.onPri, fontSize: 11, fontWeight: 700 }}>✓</span>}
            </div>
            <div style={{ flex: 1 }}><div style={{ fontSize: 13, color: C.t1 }}>{item.text}</div><div style={{ display: 'flex', gap: 6, marginTop: 4 }}>{item.area && <AreaChip area={item.area} small />}<EnergyDot energy={item.energy} /></div></div>
          </div>
        ))}
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}><button className="fb fb-g" onClick={() => setStep(5)}>← Back</button><button className="fb fb-p" style={{ flex: 1 }} onClick={finish}>Complete review ✓</button></div>
      </div>)}

      {/* Done */}
      {step === RS.length - 1 && (
        <div style={{ textAlign: 'center', padding: '40px 20px', animation: 'slideUp 0.5s ease-out' }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: C.t1, fontFamily: 'var(--font-display)', marginBottom: 8 }}>Review complete</div>
          <div style={{ fontSize: 14, color: C.t2, lineHeight: 1.6, maxWidth: 300, margin: '0 auto 24px' }}>Your system is current. Go execute.</div>
          <button className="fb fb-p" onClick={() => setView('today')}>Go to Today →</button>
        </div>
      )}
      <div style={{ height: 100 }} />
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CAPTURE MODAL
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function CaptureModal({ onClose, refresh }) {
  const [text, setText] = useState('');
  const ref = useRef(null);
  useEffect(() => { setTimeout(() => ref.current?.focus(), 100); }, []);

  const save = async () => {
    if (!text.trim()) return;
    await api.capture(text);
    refresh();
    onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', animation: 'fadeIn 0.2s ease-out' }} onClick={onClose}>
      <div style={{ width: '100%', maxWidth: 520, padding: '24px 20px 32px', background: C.s2, borderRadius: '20px 20px 0 0', border: `1px solid ${C.border2}`, borderBottom: 'none', animation: 'slideUp 0.3s ease-out' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>📥 Quick Capture</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.t3, fontSize: 22, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>
        <div style={{ fontSize: 12, color: C.t3, marginBottom: 12, lineHeight: 1.4 }}>Dump it. One per line. Process later.</div>
        <textarea ref={ref} className="fi" value={text} onChange={e => setText(e.target.value)} placeholder={"What's on your mind?"} rows={4} style={{ resize: 'vertical', lineHeight: 1.6, marginBottom: 12 }} />
        <button className="fb fb-p" style={{ width: '100%' }} onClick={save} disabled={!text.trim()}>Capture →</button>
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// VIEW: SOPs (Standard Operating Procedures)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function SopsView({ items, sops, setSops, refresh, setView }) {
  const [sel, setSel] = useState(null);
  const [name, setName] = useState('');
  const [starting, setStarting] = useState(false);

  // Editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editLabel, setEditLabel] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editSteps, setEditSteps] = useState([]);
  const [saving, setSaving] = useState(false);

  const startSop = async () => {
    if (!name.trim() || !sel) return;
    setStarting(true);
    const sop = sops.find(s => s.id === sel);
    const projectName = `${sop.label}: ${name.trim()}`;

    // Create project
    const projRes = await api.create({ text: projectName, type: 'project', area: sop.area, notes: `SOP: ${sop.label}\nDescription: ${sop.desc}` });
    const projId = itemId(projRes);

    // Create all actions
    const actions = sop.steps.map((step, i) => ({
      text: step.text.replace(/\{name\}/g, name.trim()),
      type: 'action', area: sop.area, energy: step.energy,
      projectId: projId, isToday: i === 0,
    }));

    for (const action of actions) { await api.create(action); }

    setSel(null); setName(''); setStarting(false);
    refresh(); setView('projects');
  };

  const handleStartEdit = () => {
    const sop = sops.find(s => s.id === sel);
    if (!sop) return;
    setEditLabel(sop.label);
    setEditDesc(sop.desc || '');
    setEditSteps(sop.steps.map(s => ({ ...s })));
    setIsEditing(true);
  };

  const handleAddStep = () => {
    setEditSteps([...editSteps, { text: '', energy: 'medium' }]);
  };

  const handleStepTextChange = (idx, text) => {
    const newSteps = [...editSteps];
    newSteps[idx].text = text;
    setEditSteps(newSteps);
  };

  const handleStepEnergyChange = (idx, energy) => {
    const newSteps = [...editSteps];
    newSteps[idx].energy = energy;
    setEditSteps(newSteps);
  };

  const handleRemoveStep = (idx) => {
    const newSteps = editSteps.filter((_, i) => i !== idx);
    setEditSteps(newSteps);
  };

  const handleSaveBlueprint = async () => {
    if (!editLabel.trim()) return;
    setSaving(true);
    try {
      const updatedSops = sops.map(s => {
        if (s.id === sel) {
          return {
            ...s,
            label: editLabel.trim(),
            desc: editDesc.trim(),
            steps: editSteps.filter(step => step.text.trim() !== '')
          };
        }
        return s;
      });
      const saved = await api.updateSops(updatedSops);
      setSops(saved);
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to save blueprint:', err);
    }
    setSaving(false);
  };

  if (isEditing) {
    const sop = sops.find(s => s.id === sel);
    return (
      <div className="ve" style={{ padding: '24px 20px', maxWidth: 520, margin: '0 auto' }}>
        <button onClick={() => setIsEditing(false)} className="fb fb-g" style={{ marginBottom: 16, padding: '6px 12px', fontSize: 13 }}>← Cancel Edit</button>
        <h2 style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-display)', margin: '0 0 16px', letterSpacing: '-0.02em' }}>Edit Blueprint: {sop.label}</h2>
        
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 13, color: C.t2, marginBottom: 6, fontWeight: 600 }}>SOP Label</div>
          <input className="fi" value={editLabel} onChange={e => setEditLabel(e.target.value)} placeholder="e.g. Prospect → Campaign" style={{ marginBottom: 14 }} />
          
          <div style={{ fontSize: 13, color: C.t2, marginBottom: 6, fontWeight: 600 }}>Description</div>
          <textarea className="fi" value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder="What does this SOP do?" rows={2} style={{ resize: 'vertical', lineHeight: 1.5, marginBottom: 14 }} />
        </div>

        <div style={{ marginBottom: 20 }}>
          <SectionTitle right={<button onClick={handleAddStep} className="fch" style={{ background: `${C.primary}15`, color: C.primary, border: `1px solid ${C.primary}30` }}>+ Add Step</button>}>Blueprint Steps</SectionTitle>
          
          {editSteps.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px 10px', color: C.t3, fontSize: 13, fontStyle: 'italic' }}>No steps. Add one!</div>
          ) : (
            editSteps.map((step, idx) => (
              <div key={idx} className="fc" style={{ marginBottom: 10, padding: 12, border: `1px solid ${C.border2}` }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: C.t3 }}>Step {idx + 1}</span>
                  <div style={{ flex: 1 }} />
                  <button onClick={() => handleRemoveStep(idx)} className="fch" style={{ background: `${C.error}12`, color: C.error, border: 'none', padding: '3px 8px', fontSize: 11 }}>Remove ×</button>
                </div>
                <input className="fi" value={step.text} onChange={e => handleStepTextChange(idx, e.target.value)} placeholder="Task text (use {name} for dynamic substitution)" style={{ marginBottom: 8 }} />
                <div style={{ display: 'flex', gap: 6 }}>
                  {ENERGY.map(e => (
                    <button key={e.id} type="button" className="fch" onClick={() => handleStepEnergyChange(idx, e.id)} style={{
                      background: step.energy === e.id ? `${e.color}25` : C.s3, color: step.energy === e.id ? e.color : C.t2,
                      border: `1px solid ${step.energy === e.id ? e.color + '40' : 'transparent'}`, flex: 1, justifyContent: 'center',
                    }}>{e.icon} {e.label}</button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        <button className="fb fb-p" style={{ width: '100%', marginBottom: 8 }} onClick={handleSaveBlueprint} disabled={saving || !editLabel.trim()}>
          {saving ? 'Saving...' : 'Save Blueprint ✓'}
        </button>
      </div>
    );
  }

  return (
    <div className="ve" style={{ padding: '24px 20px', maxWidth: 520, margin: '0 auto' }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-display)', margin: '0 0 4px', letterSpacing: '-0.02em' }}>SOPs</h2>
      <div style={{ fontSize: 13, color: C.t3, marginBottom: 20, lineHeight: 1.5 }}>
        Standard Operating Procedures. Predictable work, zero thinking.
      </div>

      {!sel ? (
        sops.map(sop => {
          const areaInfo = AREAS.find(a => a.id === sop.area);
          return (
            <div key={sop.id} className="fc" onClick={() => setSel(sop.id)}
              style={{ marginBottom: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ fontSize: 28, flexShrink: 0 }}>{sop.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                  <span style={{ fontSize: 15, fontWeight: 600, color: C.t1 }}>{sop.label}</span>
                  <AreaChip area={sop.area} small />
                </div>
                <div style={{ fontSize: 12, color: C.t3 }}>{sop.desc}</div>
                <div style={{ fontSize: 11, color: C.t4, marginTop: 2 }}>{sop.steps?.length || 0} steps</div>
              </div>
              <span style={{ color: C.t3, fontSize: 16 }}>›</span>
            </div>
          );
        })
      ) : (
        <div style={{ animation: 'fadeIn 0.25s ease-out' }}>
          {(() => {
            const sop = sops.find(s => s.id === sel);
            return (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <button onClick={() => setSel(null)} className="fb fb-g" style={{ padding: '6px 12px', fontSize: 13 }}>← All SOPs</button>
                  <button onClick={handleStartEdit} className="fb fb-g" style={{ padding: '6px 12px', fontSize: 13, color: C.primary, borderColor: `${C.primary}30` }}>✏ Edit Blueprint</button>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <span style={{ fontSize: 32 }}>{sop.icon}</span>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>{sop.label}</div>
                    <div style={{ fontSize: 13, color: C.t3 }}>{sop.desc}</div>
                  </div>
                </div>

                {/* Name input */}
                <div style={{ marginBottom: 18 }}>
                  <div style={{ fontSize: 14, color: C.t2, marginBottom: 8, fontWeight: 500 }}>Who is this for?</div>
                  <input className="fi" value={name} onChange={e => setName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && name.trim() && startSop()}
                    placeholder="e.g. Rahul from Growthify" autoFocus />
                </div>

                {/* Preview steps */}
                <div style={{ marginBottom: 18 }}>
                  <SectionTitle>{sop.steps?.length || 0} steps will be created</SectionTitle>
                  {(sop.steps || []).map((step, i) => (
                    <div key={i} style={{
                      display: 'flex', gap: 10, alignItems: 'flex-start', padding: '8px 0',
                      borderBottom: i < sop.steps.length - 1 ? `1px solid ${C.border}` : 'none',
                    }}>
                      <span style={{ fontSize: 11, color: i === 0 ? C.primary : C.t3, fontWeight: 700, minWidth: 20, textAlign: 'right' }}>{i + 1}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, color: C.t1, lineHeight: 1.4 }}>{step.text.replace(/\{name\}/g, name.trim() || '___')}</div>
                        <div style={{ display: 'flex', gap: 6, marginTop: 3 }}>
                          <EnergyDot energy={step.energy} />
                          <span style={{ fontSize: 10, color: C.t3 }}>{ENERGY.find(e => e.id === step.energy)?.label}</span>
                          {i === 0 && <span style={{ fontSize: 10, color: C.primary, fontWeight: 600 }}>TODAY</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button className="fb fb-p" style={{ width: '100%' }} onClick={startSop} disabled={!name.trim() || starting}>
                  {starting ? 'Creating...' : `Start SOP → Create project with ${sop.steps?.length || 0} actions`}
                </button>
              </>
            );
          })()}
        </div>
      )}
      <div style={{ height: 100 }} />
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MORE MENU
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function MoreMenu({ setView, items, meta }) {
  const wc = items.filter(i => i.type === 'waiting' && !i.completedAt).length;
  const sc = items.filter(i => i.type === 'someday' && !i.completedAt).length;
  const rc = items.filter(i => i.type === 'routine').length;
  const nr = meta.needsReview;
  const dsr = meta.daysSinceReview;

  const list = [
    { icon: '📐', label: 'SOPs', count: null, sub: 'Start a standard workflow', view: 'sops' },
    { icon: '🔁', label: 'Routines', count: rc, sub: 'Daily habits with streaks', view: 'routines' },
    { icon: '⏳', label: 'Waiting For', count: wc, sub: 'Track what you\'re waiting on', view: 'waiting' },
    { icon: '💭', label: 'Someday / Maybe', count: sc, sub: 'Ideas for later', view: 'someday' },
    { icon: '🔄', label: 'Weekly Review', count: null, sub: nr ? (meta.lastReviewDate ? `⚠️ ${dsr} days since last` : '⚠️ Never reviewed') : `Last: ${dsr}d ago`, view: 'review', hl: nr },
  ];

  return (
    <div className="ve" style={{ padding: '24px 20px', maxWidth: 520, margin: '0 auto' }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-display)', margin: '0 0 20px', letterSpacing: '-0.02em' }}>More</h2>
      {list.map(item => (
        <div key={item.view} className="fc" onClick={() => setView(item.view)}
          style={{ marginBottom: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14, border: item.hl ? `1px solid ${C.tertiary}30` : undefined }}>
          <div style={{ fontSize: 24, flexShrink: 0 }}>{item.icon}</div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: C.t1 }}>{item.label}</span>
              {item.count > 0 && <span style={{ background: `${C.primary}20`, color: C.primary, padding: '1px 7px', borderRadius: 6, fontSize: 11, fontWeight: 600 }}>{item.count}</span>}
            </div>
            <div style={{ fontSize: 12, color: item.hl ? C.tertiary : C.t3, marginTop: 2 }}>{item.sub}</div>
          </div>
          <span style={{ color: C.t3, fontSize: 16 }}>›</span>
        </div>
      ))}
      <div style={{ height: 100 }} />
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ROOT APP
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default function FlowOS() {
  const [items, setItems] = useState(null);
  const [sops, setSops] = useState(null);
  const [meta, setMeta] = useState({ needsReview: false, daysSinceReview: null, lastReviewDate: null });
  const [view, setView] = useState('today');
  const [showCapture, setShowCapture] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const [itemsRes, stateRes, sopsRes] = await Promise.all([
        api.getAll(),
        api.getState(),
        api.getSops(),
      ]);
      setItems(itemsRes);
      if (stateRes.state) {
        setMeta({
          needsReview: stateRes.state.needsReview,
          daysSinceReview: stateRes.state.daysSinceReview,
          lastReviewDate: stateRes.state.lastReviewDate,
        });
      }
      setSops(sopsRes);
    } catch (err) {
      console.error('FlowOS refresh error:', err);
    }
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  if (loading || !items || !sops) return (
    <div style={{ background: C.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-body, sans-serif)', fontSize: 13, color: C.t3 }}>
      <div style={{ textAlign: 'center' }}><div style={{ fontSize: 28, marginBottom: 12 }}>⚡</div>Loading your system…</div>
    </div>
  );

  const inboxCount = items.filter(i => i.type === 'inbox').length;
  const NAV = [
    { id: 'today', label: 'Today', icon: '☀️' },
    { id: 'inbox', label: 'Inbox', icon: '📥', badge: inboxCount },
    { id: 'actions', label: 'Actions', icon: '🎯' },
    { id: 'projects', label: 'Projects', icon: '📋' },
    { id: 'more', label: 'More', icon: '⋯' },
  ];

  const isSubView = ['waiting', 'someday', 'review', 'routines', 'sops'].includes(view);

  const renderView = () => {
    switch (view) {
      case 'today': return <TodayView items={items} meta={meta} refresh={refresh} setView={setView} />;
      case 'inbox': return <InboxView items={items} refresh={refresh} />;
      case 'actions': return <ActionsView items={items} refresh={refresh} />;
      case 'projects': return <ProjectsView items={items} refresh={refresh} />;
      case 'waiting': return <WaitingView items={items} refresh={refresh} />;
      case 'someday': return <SomedayView items={items} refresh={refresh} />;
      case 'routines': return <RoutinesView items={items} refresh={refresh} />;
      case 'sops': return <SopsView items={items} sops={sops} setSops={setSops} refresh={refresh} setView={setView} />;
      case 'review': return <ReviewView items={items} meta={meta} refresh={refresh} setView={setView} />;
      case 'more': return <MoreMenu setView={setView} items={items} meta={meta} />;
      default: return <TodayView items={items} meta={meta} refresh={refresh} setView={setView} />;
    }
  };

  return (
    <div style={{ background: C.bg, minHeight: '100vh', fontFamily: 'var(--font-body, "Source Sans 3", sans-serif)', color: C.t1, display: 'flex', flexDirection: 'column' }}>
      <style>{CSS}</style>
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 80 }}>{renderView()}</div>
      {/* FAB */}
      <button onClick={() => setShowCapture(true)} style={{
        position: 'fixed', bottom: 80, right: 'max(16px, calc(50% - 260px + 440px))',
        width: 52, height: 52, borderRadius: 16, background: C.primary, color: C.onPri,
        border: 'none', cursor: 'pointer', fontSize: 24, fontWeight: 300, lineHeight: 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 16px rgba(208,188,255,0.25)', zIndex: 50, transition: 'transform 0.15s',
      }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>+</button>
      {/* Bottom Nav */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: C.s1, borderTop: `1px solid ${C.border}`, display: 'flex', justifyContent: 'center', zIndex: 40 }}>
        <div style={{ display: 'flex', maxWidth: 520, width: '100%' }}>
          {NAV.map(n => {
            const act = view === n.id || (n.id === 'more' && isSubView);
            return (
              <button key={n.id} className={`ni ${act ? 'a' : ''}`} onClick={() => setView(n.id)}>
                <span style={{ fontSize: 18, lineHeight: 1, position: 'relative' }}>{n.icon}{n.badge > 0 && <span className="badge">{n.badge}</span>}</span>
                {n.label}
              </button>
            );
          })}
        </div>
      </div>
      {showCapture && <CaptureModal onClose={() => setShowCapture(false)} refresh={refresh} />}
    </div>
  );
}
