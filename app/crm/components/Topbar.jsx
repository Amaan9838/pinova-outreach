'use client';
import NotificationCenter from './NotificationCenter';

const pageTitles = {
  dashboard: 'Dashboard',
  leads: 'Lead Operating System',
  email: 'Email Campaigns',
  linkedin: 'LinkedIn Outreach',
  inbox: 'Inbox',
  marketing: 'Marketing',
  tasks: 'Tasks',
  activity: 'Activity Log',
};

export default function Topbar({ activePage, onOpenModal, currentUser, onToggleMobileMenu }) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  });

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="topbar-hamburger" onClick={onToggleMobileMenu}>
          <span /><span /><span />
        </button>
        <span className="topbar-title">{pageTitles[activePage] || 'Dashboard'}</span>
      </div>
      <div className="topbar-right">
        <span className="topbar-date">{dateStr}</span>
        <NotificationCenter currentUser={currentUser} />
        <button className="t-modal-btn" onClick={() => onOpenModal('todo')}>
          <div className="tmb-pip" style={{ background: 'var(--amber)' }} />Tasks
        </button>
        <button className="t-modal-btn hide-mobile" onClick={() => onOpenModal('activity')}>
          <div className="tmb-pip" style={{ background: 'var(--blue)' }} />Activity
        </button>
      </div>
    </header>
  );
}
