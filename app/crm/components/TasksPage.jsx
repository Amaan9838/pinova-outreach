'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';

export default function TasksPage({ currentUser, onOpenModal }) {
  const [tasks, setTasks] = useState([]);
  const [followUpTasks, setFollowUpTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [ownerFilter, setOwnerFilter] = useState(currentUser || '');
  const [statusFilter, setStatusFilter] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [adding, setAdding] = useState(false);

  const fetchTasks = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (ownerFilter) params.set('owner', ownerFilter);
      if (statusFilter) params.set('status', statusFilter);
      if (search) params.set('search', search);
      const res = await fetch(`/api/crm/tasks?${params}`);
      const json = await res.json();
      if (json.success) setTasks(json.tasks || []);
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    } finally {
      setLoading(false);
    }
  }, [ownerFilter, statusFilter, search]);

  // Fetch follow-up tasks from dashboard data
  const fetchFollowUps = useCallback(async () => {
    try {
      const res = await fetch('/api/crm/dashboard');
      const json = await res.json();
      if (json.success) setFollowUpTasks(json.followUpTasks || []);
    } catch (err) {
      console.error('Failed to fetch follow-ups:', err);
    }
  }, []);

  useEffect(() => { fetchTasks(); fetchFollowUps(); }, [fetchTasks, fetchFollowUps]);

  const addTask = async () => {
    if (!newTitle.trim()) return;
    setAdding(true);
    try {
      const res = await fetch('/api/crm/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-crm-user': currentUser || 'Unknown' },
        body: JSON.stringify({ title: newTitle.trim(), dueDate: newDueDate || null }),
      });
      const json = await res.json();
      if (json.success) {
        setNewTitle('');
        setNewDueDate('');
        fetchTasks();
      }
    } catch (err) {
      console.error('Failed to add task:', err);
    } finally {
      setAdding(false);
    }
  };

  const toggleTask = async (id, currentStatus, isFollowUp) => {
    if (isFollowUp) return; // follow-ups can't be toggled here
    const newStatus = currentStatus === 'done' ? 'pending' : 'done';
    try {
      await fetch(`/api/crm/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-crm-user': currentUser || 'Unknown' },
        body: JSON.stringify({ status: newStatus }),
      });
      fetchTasks();
    } catch (err) {
      console.error('Failed to toggle task:', err);
    }
  };

  const deleteTask = async (id) => {
    if (!confirm('Delete this task?')) return;
    try {
      await fetch(`/api/crm/tasks/${id}`, {
        method: 'DELETE',
        headers: { 'x-crm-user': currentUser || 'Unknown' },
      });
      fetchTasks();
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  // Merge manual tasks + follow-up tasks (filtered by owner if needed)
  const allTasks = useMemo(() => {
    let fu = followUpTasks;
    if (ownerFilter) fu = fu.filter(f => f.owner === ownerFilter);
    if (statusFilter) fu = fu.filter(f => f.status === statusFilter);
    if (search) fu = fu.filter(f => f.title.toLowerCase().includes(search.toLowerCase()));
    return [...fu, ...tasks];
  }, [tasks, followUpTasks, ownerFilter, statusFilter, search]);

  const pending = allTasks.filter(t => t.status === 'pending').length;
  const done = allTasks.filter(t => t.status === 'done').length;

  const stCls = { pending: 'b-pend', done: 'b-done' };
  const stLabel = { pending: 'Pending', done: 'Done' };

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="page-content active" id="page-tasks">
      <div className="ph">
        <div className="ph-left"><h1>Team Tasks</h1><p>Track work, follow-ups, and to-dos.</p></div>
        <div className="ph-actions"><button className="t-btn accent" onClick={() => setAdding(!adding)}>{adding ? 'Cancel' : '+ Add Task'}</button></div>
      </div>

      {/* Add task form */}
      {adding && (
        <div className="card" style={{ marginBottom: 16, padding: '16px 20px' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              className="f-input"
              style={{ flex: 1, minWidth: 200 }}
              placeholder="Task title…"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addTask(); }}
              autoFocus
            />
            <input
              className="f-input"
              type="date"
              value={newDueDate}
              onChange={e => setNewDueDate(e.target.value)}
              style={{ width: 160 }}
            />
            <button className="t-btn accent" onClick={addTask} disabled={!newTitle.trim()}>Create</button>
          </div>
        </div>
      )}

      {/* Metrics */}
      <div className="metrics three">
        <div className="mc"><div className="mc-top"><div className="mc-icon ic-n">⏳</div></div><div className="mc-num">{pending}</div><div className="mc-label">Pending</div></div>
        <div className="mc"><div className="mc-top"><div className="mc-icon ic-g">✓</div></div><div className="mc-num">{done}</div><div className="mc-label">Completed</div></div>
        <div className="mc"><div className="mc-top"><div className="mc-icon ic-b">📋</div></div><div className="mc-num">{allTasks.length}</div><div className="mc-label">Total</div></div>
      </div>

      {/* Filters */}
      <div className="filter-row">
        <input className="f-input" type="text" placeholder="Search tasks…" value={search} onChange={e => setSearch(e.target.value)} />
        <select className="f-select" value={ownerFilter} onChange={e => setOwnerFilter(e.target.value)}>
          <option value="">All owners</option>
          <option value="Amaan">Amaan</option>
          <option value="Ayushman">Ayushman</option>
        </select>
        <select className="f-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="done">Done</option>
        </select>
      </div>

      {/* Table */}
      <div className="card">
        <div className="tbl-wrap">
          <table><thead><tr>
            <th style={{ width: 32 }}></th>
            <th>Task</th>
            <th>Owner</th>
            <th>Status</th>
            <th>Due</th>
            <th style={{ width: 48 }}></th>
          </tr></thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="empty">Loading tasks…</td></tr>}
            {!loading && allTasks.length === 0 && <tr><td colSpan={6} className="empty">No tasks found</td></tr>}
            {allTasks.map(t => (
              <tr key={t._id} style={t.isFollowUp ? { background: 'rgba(99,102,241,0.04)' } : {}}>
                <td>
                  <div
                    className={`qchk ${t.status === 'done' ? 'done' : ''}`}
                    onClick={() => toggleTask(t._id, t.status, t.isFollowUp)}
                    style={{ cursor: t.isFollowUp ? 'default' : 'pointer' }}
                  />
                </td>
                <td>
                  <b style={t.status === 'done' ? { textDecoration: 'line-through', opacity: 0.5 } : {}}>{t.title}</b>
                  {t.isFollowUp && <span style={{ fontSize: 10, color: 'var(--purple)', marginLeft: 6, fontWeight: 500 }}>FOLLOW-UP</span>}
                </td>
                <td>{t.owner}</td>
                <td><span className={`badge ${stCls[t.status] || 'b-pend'}`}>{stLabel[t.status] || t.status}</span></td>
                <td style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--mono)' }}>{formatDate(t.dueDate)}</td>
                <td>
                  {!t.isFollowUp && (
                    <button
                      onClick={() => deleteTask(t._id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-4)', fontSize: 14 }}
                      title="Delete task"
                    >🗑</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody></table>
        </div>
      </div>
    </div>
  );
}
