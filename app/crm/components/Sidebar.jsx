'use client';

const USER_COLORS = { Amaan: '#2563eb', Ayushman: '#7c3aed' };
const USER_INITIALS = { Amaan: 'AM', Ayushman: 'AY' };

export default function Sidebar({ activePage, onNav, campaignCount, currentUser, onSwitchUser }) {
  const links = [
    { section: 'Workspace' },
    { id: 'dashboard', icon: '⬡', label: 'Dashboard' },
    { id: 'leads', icon: '◆', label: 'Leads' },
    { section: 'Outreach' },
    { id: 'email', icon: '✉', label: 'Email Campaigns', badge: campaignCount, badgeCls: 'green' },
    { id: 'linkedin', icon: '◈', label: 'LinkedIn Outreach' },
    { id: 'inbox', icon: '📬', label: 'Inbox' },
    { id: 'marketing', icon: '◎', label: 'Marketing' },
    { section: 'Productivity' },
    { id: 'tasks', icon: '◻', label: 'Tasks', badge: 6 },
    { section: 'Reports' },
    { id: 'activity', icon: '◑', label: 'Activity Log' },
  ];

  const color = USER_COLORS[currentUser] || '#2563eb';
  const initials = USER_INITIALS[currentUser] || '??';

  return (
    <aside className="sidebar" id="sidebar">
      <div className="sb-logo">
        <div className="sb-mark"><span /><span /><span /><span /></div>
        <span className="sb-brand">Pulse</span>
      </div>

      <nav className="sb-nav">
        {links.map((item, i) => {
          if (item.section) {
            return <div key={`s-${i}`} className="sb-section-label">{item.section}</div>;
          }
          return (
            <button
              key={item.id}
              className={`sb-link ${activePage === item.id ? 'active' : ''}`}
              onClick={() => onNav(item.id)}
            >
              <span className="sb-icon">{item.icon}</span>
              {item.label}
              {item.badge != null && (
                <span className={`sb-badge ${item.badgeCls || ''}`}>{item.badge}</span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="sb-footer">
        <div className="sb-user" onClick={onSwitchUser} style={{ cursor: 'pointer' }} title="Click to switch user">
          <div className="sb-avatar" style={{ background: color }}>{initials}</div>
          <div>
            <div className="sb-uname">{currentUser || 'Select User'}</div>
            <div className="sb-urole">Team Member</div>
          </div>
          <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-3)' }}>⇅</span>
        </div>
      </div>
    </aside>
  );
}
