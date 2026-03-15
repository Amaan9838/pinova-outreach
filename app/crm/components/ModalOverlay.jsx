'use client';
import { useState, useEffect, useCallback } from 'react';

export default function ModalOverlay({ modalType, onClose, activity, currentUser }) {
  const [tasks, setTasks] = useState([]);
  const [userActivities, setUserActivities] = useState([]);
  const [activityTab, setActivityTab] = useState('user');
  const [newTask, setNewTask] = useState('');
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [loadingActivity, setLoadingActivity] = useState(false);

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Fetch tasks when todo modal opens
  const fetchTasks = useCallback(async () => {
    setLoadingTasks(true);
    try {
      const res = await fetch('/api/crm/tasks');
      const json = await res.json();
      if (json.success) setTasks(json.tasks || []);
    } catch (err) { console.error(err); }
    finally { setLoadingTasks(false); }
  }, []);

  // Fetch user activities when activity modal opens
  const fetchUserActivities = useCallback(async () => {
    setLoadingActivity(true);
    try {
      const res = await fetch('/api/crm/activity');
      const json = await res.json();
      if (json.success) setUserActivities(json.activities || []);
    } catch (err) { console.error(err); }
    finally { setLoadingActivity(false); }
  }, []);

  useEffect(() => {
    if (modalType === 'todo') fetchTasks();
    if (modalType === 'activity') fetchUserActivities();
  }, [modalType, fetchTasks, fetchUserActivities]);

  if (!modalType) return null;

  const toggleTodo = async (id, currentStatus) => {
    const newStatus = currentStatus === 'done' ? 'pending' : 'done';
    try {
      await fetch(`/api/crm/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-crm-user': currentUser || 'Unknown' },
        body: JSON.stringify({ status: newStatus }),
      });
      fetchTasks();
    } catch (err) { console.error(err); }
  };

  const addTask = async () => {
    if (!newTask.trim()) return;
    try {
      await fetch('/api/crm/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-crm-user': currentUser || 'Unknown' },
        body: JSON.stringify({ title: newTask.trim() }),
      });
      setNewTask('');
      fetchTasks();
    } catch (err) { console.error(err); }
  };

  const done = tasks.filter(t => t.status === 'done').length;
  const total = tasks.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const circ = 2 * Math.PI * 14;
  const off = circ - (pct / 100) * circ;

  const dotCls = { c: 'fd-c', l: 'fd-l', k: 'fd-k', t: 'fd-t', s: 'fd-t' };
  const systemActivity = activity || [];

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
                  : 'User & system activity'}
              </div>
            </div>
          </div>
          <button className="m-close" onClick={onClose}>✕</button>
        </div>

        {/* Activity tabs */}
        {modalType === 'activity' && (
          <div className="m-tabs">
            <button className={`m-tab ${activityTab === 'user' ? 'active' : ''}`} onClick={() => setActivityTab('user')}>👤 User</button>
            <button className={`m-tab ${activityTab === 'system' ? 'active' : ''}`} onClick={() => setActivityTab('system')}>⚡ System</button>
          </div>
        )}

        {/* Body */}
        <div className="m-body">
          {modalType === 'todo' && (
            <>
              {/* Progress */}
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
              {loadingTasks && <div className="empty">Loading tasks…</div>}
              {!loadingTasks && tasks.length === 0 && <div className="empty">No tasks yet — add one below</div>}
              {tasks.map(t => (
                <div key={t._id} className="todo-item">
                  <div className={`todo-chk ${t.status === 'done' ? 'checked' : ''}`} onClick={() => toggleTodo(t._id, t.status)} />
                  <div className="todo-body">
                    <div className={`todo-t ${t.status === 'done' ? 'done' : ''}`}>{t.title}</div>
                    <div className="todo-meta">
                      <span className="todo-owner">{t.owner}</span>
                      {t.dueDate && <span className="todo-due">Due {new Date(t.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}

          {modalType === 'activity' && (
            <div>
              {activityTab === 'user' && (
                loadingActivity
                  ? <div className="empty">Loading…</div>
                  : userActivities.length === 0
                    ? <div className="empty">No user activity yet</div>
                    : userActivities.map((a, i) => (
                      <div key={a._id || i} className="feed-item" style={{ padding: '10px 16px' }}>
                        <div className={`feed-dot ${dotCls[a.type] || 'fd-t'}`} />
                        <span className="feed-time">{a.time}</span>
                        <span style={{ fontSize: 10, color: 'var(--text-4)', marginRight: 6, fontFamily: 'var(--mono)' }}>{a.date}</span>
                        <span className="feed-text">
                          <span style={{ fontWeight: 600, color: 'var(--blue)' }}>{a.user} </span>
                          {a.action} <b>{a.target}</b>
                        </span>
                      </div>
                    ))
              )}
              {activityTab === 'system' && (
                systemActivity.length === 0
                  ? <div className="empty">No system activity logged yet</div>
                  : systemActivity.map((a, i) => (
                    <div key={i} className="feed-item" style={{ padding: '10px 16px' }}>
                      <div className={`feed-dot ${dotCls[a.type] || 'fd-t'}`} />
                      <span className="feed-time">{a.time}</span>
                      <span className="feed-text">{a.text} <b>{a.bold}</b></span>
                    </div>
                  ))
              )}
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
