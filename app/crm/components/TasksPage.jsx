'use client';
import { useState, useMemo } from 'react';

const TASKS_DATA = [
  { id: 1, title: 'Review campaign performance', owner: 'Sam', status: 'in_progress', created_at: 'Mar 13', due_date: 'Mar 13', priority: 'high' },
  { id: 2, title: 'Send 25 LinkedIn messages', owner: 'Alex', status: 'completed', created_at: 'Mar 12', due_date: 'Mar 13', priority: 'med' },
  { id: 3, title: 'Follow up with yesterday replies', owner: 'Maria', status: 'pending', created_at: 'Mar 13', due_date: 'Mar 13', priority: 'high' },
  { id: 4, title: 'Import 50 new leads', owner: 'Jordan', status: 'pending', created_at: 'Mar 12', due_date: 'Mar 13', priority: 'med' },
  { id: 5, title: 'Build LinkedIn Lead List', owner: 'Alex', status: 'in_progress', created_at: 'Mar 10', due_date: 'Mar 14', priority: 'high' },
  { id: 6, title: 'Optimize Email Copy', owner: 'Sam', status: 'pending', created_at: 'Mar 12', due_date: 'Mar 15', priority: 'low' },
  { id: 7, title: 'A/B test subject lines', owner: 'Casey', status: 'completed', created_at: 'Mar 11', due_date: 'Mar 14', priority: 'med' },
  { id: 8, title: 'Update CRM with new leads', owner: 'Maria', status: 'in_progress', created_at: 'Mar 13', due_date: 'Mar 16', priority: 'low' },
  { id: 9, title: 'Write follow-up email templates', owner: 'Sam', status: 'pending', created_at: 'Mar 10', due_date: 'Mar 17', priority: 'low' },
  { id: 10, title: 'Analyze LinkedIn reply rates', owner: 'Jordan', status: 'pending', created_at: 'Mar 12', due_date: 'Mar 18', priority: 'med' },
];

export default function TasksPage({ onOpenModal }) {
  const [search, setSearch] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const filtered = useMemo(() => {
    return TASKS_DATA.filter(r =>
      (!search || r.title.toLowerCase().includes(search.toLowerCase())) &&
      (!ownerFilter || r.owner === ownerFilter) &&
      (!statusFilter || r.status === statusFilter)
    );
  }, [search, ownerFilter, statusFilter]);

  const stCls = { pending: 'b-pend', in_progress: 'b-prog', completed: 'b-done' };
  const stLabel = { pending: 'Pending', in_progress: 'In Progress', completed: 'Done' };
  const pc = { high: 'tp-h', med: 'tp-m', low: 'tp-l' };

  const pending = TASKS_DATA.filter(t => t.status === 'pending').length;
  const inProg = TASKS_DATA.filter(t => t.status === 'in_progress').length;
  const done = TASKS_DATA.filter(t => t.status === 'completed').length;

  return (
    <div className="page-content active" id="page-tasks">
      <div className="ph">
        <div className="ph-left"><h1>Team Tasks</h1><p>Visibility on what your team is working on.</p></div>
        <div className="ph-actions"><button className="t-btn accent" onClick={() => onOpenModal('todo')}>+ Add Task</button></div>
      </div>

      <div className="metrics three">
        <div className="mc"><div className="mc-top"><div className="mc-icon ic-n">⏳</div></div><div className="mc-num">{pending}</div><div className="mc-label">Pending</div></div>
        <div className="mc"><div className="mc-top"><div className="mc-icon ic-b">⚡</div></div><div className="mc-num">{inProg}</div><div className="mc-label">In Progress</div></div>
        <div className="mc"><div className="mc-top"><div className="mc-icon ic-g">✓</div></div><div className="mc-num">{done}</div><div className="mc-label">Completed</div></div>
      </div>

      <div className="filter-row">
        <input className="f-input" type="text" placeholder="Search tasks…" value={search} onChange={e => setSearch(e.target.value)} />
        <select className="f-select" value={ownerFilter} onChange={e => setOwnerFilter(e.target.value)}>
          <option value="">All owners</option>
          <option>Alex</option><option>Sam</option><option>Maria</option><option>Jordan</option><option>Casey</option>
        </select>
        <select className="f-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          <option value="pending">Pending</option><option value="in_progress">In Progress</option><option value="completed">Completed</option>
        </select>
      </div>

      <div className="card">
        <div className="tbl-wrap">
          <table><thead><tr>
            <th>Task<span className="sort-ic">↕</span></th>
            <th>Owner<span className="sort-ic">↕</span></th>
            <th>Priority</th><th>Status</th>
            <th>Created<span className="sort-ic">↕</span></th>
            <th>Due<span className="sort-ic">↕</span></th>
          </tr></thead>
          <tbody>
            {filtered.length === 0 && <tr><td colSpan={6} className="empty">No tasks found</td></tr>}
            {filtered.map(r => (
              <tr key={r.id}>
                <td><b>{r.title}</b></td>
                <td>{r.owner}</td>
                <td><span className={`badge ${pc[r.priority]}`} style={{ padding: '2px 6px', borderRadius: 3, fontSize: 10 }}>{r.priority.charAt(0).toUpperCase() + r.priority.slice(1)}</span></td>
                <td><span className={`badge ${stCls[r.status]}`}>{stLabel[r.status]}</span></td>
                <td style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--mono)' }}>{r.created_at}</td>
                <td style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--mono)' }}>{r.due_date}</td>
              </tr>
            ))}
          </tbody></table>
        </div>
      </div>
    </div>
  );
}
