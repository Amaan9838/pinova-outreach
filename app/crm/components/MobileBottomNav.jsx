'use client';

const TABS = [
  { id: 'dashboard', icon: '⬡', label: 'Home' },
  { id: 'leads', icon: '◆', label: 'Leads' },
  { id: 'inbox', icon: '📬', label: 'Inbox' },
  { id: 'tasks', icon: '◻', label: 'Tasks' },
  { id: 'more', icon: '⋯', label: 'More' },
];

export default function MobileBottomNav({ activePage, onNav, onMore, unreadCount }) {
  return (
    <nav className="mobile-bnav">
      {TABS.map(tab => {
        const isActive = tab.id === 'more'
          ? !['dashboard','leads','inbox','tasks'].includes(activePage)
          : activePage === tab.id;
        return (
          <button
            key={tab.id}
            className={`mbn-tab ${isActive ? 'active' : ''}`}
            onClick={() => tab.id === 'more' ? (onMore && onMore()) : onNav(tab.id)}
          >
            <span className="mbn-icon">{tab.icon}</span>
            <span className="mbn-label">{tab.label}</span>
            {tab.id === 'inbox' && unreadCount > 0 && (
              <span className="mbn-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
