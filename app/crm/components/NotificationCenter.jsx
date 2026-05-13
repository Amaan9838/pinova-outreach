'use client';
import { useState, useEffect, useCallback, useRef } from 'react';

const NOTIF_ICONS = {
  lead_hot: '🔥', follow_up_due: '⚠', reply_received: '↙',
  lead_cooling: '🌡', deal_stalled: '⏸', stage_changed: '→',
  task_overdue: '⏰', new_lead: '◇', heat_change: '🌡',
};

const NOTIF_COLORS = {
  lead_hot: 'var(--red)', follow_up_due: 'var(--amber)', reply_received: 'var(--green)',
  lead_cooling: 'var(--blue)', deal_stalled: 'var(--amber)', stage_changed: 'var(--blue)',
  task_overdue: 'var(--red)', new_lead: 'var(--green)', heat_change: 'var(--amber)',
};

export default function NotificationCenter({ currentUser, onNavigateToLead }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);

  const fetchNotifs = useCallback(async () => {
    if (!currentUser) return;
    try {
      const res = await fetch(`/api/crm/notifications?user=${currentUser}&limit=20`);
      const json = await res.json();
      if (json.success) {
        setNotifications(json.notifications || []);
        setUnreadCount(json.unreadCount || 0);
      }
    } catch (err) { console.error(err); }
  }, [currentUser]);

  useEffect(() => { fetchNotifs(); const iv = setInterval(fetchNotifs, 60000); return () => clearInterval(iv); }, [fetchNotifs]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markRead = async (id) => {
    await fetch('/api/crm/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    fetchNotifs();
  };

  const markAllRead = async () => {
    await fetch('/api/crm/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markAllRead: true, user: currentUser }),
    });
    fetchNotifs();
  };

  const handleClick = (notif) => {
    if (!notif.read) markRead(notif._id);
    if (notif.leadId && onNavigateToLead) onNavigateToLead(notif.leadId);
    setOpen(false);
  };

  const timeAgo = (d) => {
    const diff = Math.floor((Date.now() - new Date(d)) / 1000);
    if (diff < 60) return 'now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
  };

  return (
    <div className="notif-center" ref={ref}>
      <button className="notif-bell" onClick={() => setOpen(!open)}>
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
          <path d="M10 2C7.24 2 5 4.24 5 7v3.5L3.5 12v1h13v-1L15 10.5V7c0-2.76-2.24-5-5-5z" fill="currentColor" opacity=".7"/>
          <path d="M8 14c0 1.1.9 2 2 2s2-.9 2-2" stroke="currentColor" strokeWidth="1.2" fill="none"/>
        </svg>
        {unreadCount > 0 && <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
      </button>

      {open && (
        <div className="notif-dropdown">
          <div className="notif-dd-header">
            <span className="notif-dd-title">Notifications</span>
            {unreadCount > 0 && <button className="notif-dd-clear" onClick={markAllRead}>Mark all read</button>}
          </div>
          <div className="notif-dd-body">
            {notifications.length === 0 && <div className="notif-dd-empty">No notifications</div>}
            {notifications.map(n => (
              <div key={n._id} className={`notif-item ${!n.read ? 'unread' : ''}`} onClick={() => handleClick(n)}>
                <div className="notif-item-icon" style={{ color: NOTIF_COLORS[n.type] || 'var(--text-3)' }}>
                  {NOTIF_ICONS[n.type] || '·'}
                </div>
                <div className="notif-item-body">
                  <div className="notif-item-title">{n.title}</div>
                  <div className="notif-item-msg">{n.message}</div>
                  <div className="notif-item-time">{timeAgo(n.createdAt)}</div>
                </div>
                {!n.read && <div className="notif-item-dot" />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
