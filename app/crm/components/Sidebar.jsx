'use client';

export default function Sidebar({ activePage, onNav, campaignCount }) {
  const links = [
    { section: 'Workspace' },
    { id: 'dashboard', icon: '⬡', label: 'Dashboard' },
    { section: 'Outreach' },
    { id: 'email', icon: '✉', label: 'Email Campaigns', badge: campaignCount, badgeCls: 'green' },
    { id: 'linkedin', icon: '◈', label: 'LinkedIn Outreach', badge: 14 },
    { id: 'marketing', icon: '◎', label: 'Marketing' },
    { section: 'Productivity' },
    { id: 'tasks', icon: '◻', label: 'Tasks', badge: 6 },
    { section: 'Reports' },
    { id: 'activity', icon: '◑', label: 'Activity Log' },
  ];

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
        <div className="sb-user">
          <div className="sb-avatar">FO</div>
          <div>
            <div className="sb-uname">Founder</div>
            <div className="sb-urole">Admin</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
