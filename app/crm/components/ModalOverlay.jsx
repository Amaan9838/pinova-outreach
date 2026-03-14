'use client';
import { useState, useEffect } from 'react';

// Static tasks for modal — placeholder until Task model exists
const INITIAL_TASKS = [
  { id: 1, title: 'Review campaign performance', owner: 'Sam', status: 'in_progress', due_date: 'Mar 13', priority: 'high' },
  { id: 2, title: 'Send 25 LinkedIn messages', owner: 'Alex', status: 'completed', due_date: 'Mar 13', priority: 'med' },
  { id: 3, title: 'Follow up with yesterday replies', owner: 'Maria', status: 'pending', due_date: 'Mar 13', priority: 'high' },
  { id: 4, title: 'Import 50 new leads', owner: 'Jordan', status: 'pending', due_date: 'Mar 13', priority: 'med' },
  { id: 5, title: 'Build LinkedIn Lead List', owner: 'Alex', status: 'in_progress', due_date: 'Mar 14', priority: 'high' },
];

export default function ModalOverlay({ modalType, onClose, activity }) {
  const [tasks, setTasks] = useState(INITIAL_TASKS);
  const [tabIdx, setTabIdx] = useState(0);
  const [newTask, setNewTask] = useState('');

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!modalType) return null;

  const toggleTodo = (id) => {
    setTasks(prev => prev.map(t =>
      t.id === id ? { ...t, status: t.status === 'completed' ? 'pending' : 'completed' } : t
    ));
  };

  const addTask = () => {
    if (!newTask.trim()) return;
    setTasks(prev => [{ id: Date.now(), title: newTask.trim(), owner: 'Me', status: 'pending', due_date: 'Today', priority: 'med' }, ...prev]);
    setNewTask('');
  };

  const tabs = ['All', 'Pending', 'In Progress', 'Done'];
  const tabFilters = [null, 'pending', 'in_progress', 'completed'];
  const filteredTasks = tabFilters[tabIdx] ? tasks.filter(t => t.status === tabFilters[tabIdx]) : tasks;
  const done = tasks.filter(t => t.status === 'completed').length;
  const total = tasks.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const circ = 2 * Math.PI * 14;
  const off = circ - (pct / 100) * circ;
  const pc = { high: 'tp-h', med: 'tp-m', low: 'tp-l' };
  const pl = { high: 'High', med: 'Med', low: 'Low' };

  const dotCls = { c: 'fd-c', l: 'fd-l', k: 'fd-k', t: 'fd-t' };

  return (
    <div className={`m-overlay ${modalType ? 'open' : ''}`} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="m-panel">
        {/* Header */}
        <div className="m-head">
          <div className="m-head-l">
            <div className={`m-icon ${modalType === 'todo' ? 'ic-a' : 'ic-b'}`}>
              {modalType === 'todo' ? '✓' : '⚡'}
            </div>
            <div>
              <div className="m-title">{modalType === 'todo' ? "Today's Tasks" : 'Activity Feed'}</div>
              <div className="m-sub">
                {modalType === 'todo'
                  ? `${total - done} remaining · ${done} done`
                  : 'Live engine actions'}
              </div>
            </div>
          </div>
          <button className="m-close" onClick={onClose}>✕</button>
        </div>

        {/* Tabs (todo only) */}
        {modalType === 'todo' && (
          <div className="m-tabs">
            {tabs.map((t, i) => (
              <button key={t} className={`m-tab ${tabIdx === i ? 'active' : ''}`} onClick={() => setTabIdx(i)}>{t}</button>
            ))}
          </div>
        )}

        {/* Body */}
        <div className="m-body">
          {modalType === 'todo' && (
            <>
              {/* Progress bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--s2)' }}>
                <svg className="pring" viewBox="0 0 32 32">
                  <circle className="pr-bg" cx="16" cy="16" r="14" />
                  <circle className="pr-fill" cx="16" cy="16" r="14" strokeDasharray={circ.toFixed(2)} strokeDashoffset={off.toFixed(2)} />
                  <text className="pr-txt" x="16" y="16">{pct}%</text>
                </svg>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-1)' }}>{done} of {total} complete</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>{total - done} tasks remaining</div>
                </div>
              </div>

              {/* Task list */}
              {filteredTasks.length === 0 && <div className="empty">No tasks in this category</div>}
              {filteredTasks.map(t => (
                <div key={t.id} className="todo-item">
                  <div className={`todo-chk ${t.status === 'completed' ? 'checked' : ''}`} onClick={() => toggleTodo(t.id)} />
                  <div className="todo-body">
                    <div className={`todo-t ${t.status === 'completed' ? 'done' : ''}`}>{t.title}</div>
                    <div className="todo-meta">
                      <span className="todo-owner">{t.owner}</span>
                      <span className="todo-due">Due {t.due_date}</span>
                      <span className={`todo-prio ${pc[t.priority]}`}>{pl[t.priority]}</span>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}

          {modalType === 'activity' && (
            <div>
              {(!activity || activity.length === 0) && <div className="empty">No activity logged yet</div>}
              {(activity || []).map((a, i) => (
                <div key={i} className="feed-item" style={{ padding: '10px 16px' }}>
                  <div className={`feed-dot ${dotCls[a.type] || 'fd-t'}`} />
                  <span className="feed-time">{a.time}</span>
                  <span className="feed-text">{a.text} <b>{a.bold}</b></span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer (todo only) */}
        {modalType === 'todo' && (
          <div className="m-foot">
            <input
              className="m-inp"
              placeholder="Add a task…"
              value={newTask}
              onChange={e => setNewTask(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addTask(); }}
            />
            <button className="m-add-btn" onClick={addTask}>Add</button>
          </div>
        )}
      </div>
    </div>
  );
}
