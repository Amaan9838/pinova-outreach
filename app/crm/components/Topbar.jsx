'use client';

const pageTitles = {
  dashboard: 'Dashboard',
  email: 'Email Campaigns',
  linkedin: 'LinkedIn Outreach',
  marketing: 'Marketing',
  tasks: 'Tasks',
  activity: 'Activity Log',
};

export default function Topbar({ activePage, onOpenModal }) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  });

  return (
    <header className="topbar">
      <div className="topbar-left">
        <span className="topbar-title">{pageTitles[activePage] || 'Dashboard'}</span>
      </div>
      <div className="topbar-right">
        <span className="topbar-date">{dateStr}</span>
        <button className="t-modal-btn" onClick={() => onOpenModal('todo')}>
          <div className="tmb-pip" style={{ background: 'var(--amber)' }} />Tasks
        </button>
        <button className="t-modal-btn" onClick={() => onOpenModal('activity')}>
          <div className="tmb-pip" style={{ background: 'var(--blue)' }} />Activity
        </button>
        <div className="avatar">FO</div>
      </div>
    </header>
  );
}
