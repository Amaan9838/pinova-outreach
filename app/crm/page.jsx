'use client';
import { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import DashboardPage from './components/DashboardPage';
import EmailCampaignsPage from './components/EmailCampaignsPage';
import LinkedInPage from './components/LinkedInPage';
import MarketingPage from './components/MarketingPage';
import InboxPage from './components/InboxPage';
import TasksPage from './components/TasksPage';
import ActivityPage from './components/ActivityPage';
import LeadsPage from './components/LeadsPage';
import ModalOverlay from './components/ModalOverlay';
import UserPickerModal from './components/UserPickerModal';
import MobileBottomNav from './components/MobileBottomNav';

export default function CrmPulsePage() {
  const [activePage, setActivePage] = useState('dashboard');
  const [modalType, setModalType] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [showUserPicker, setShowUserPicker] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  // Check user identity on mount
  useEffect(() => {
    const stored = localStorage.getItem('crm_user');
    if (stored) {
      setCurrentUser(stored);
    } else {
      setShowUserPicker(true);
    }
  }, []);

  const handleUserSelect = async (name) => {
    localStorage.setItem('crm_user', name);
    setCurrentUser(name);
    setShowUserPicker(false);
    try {
      await fetch('/api/crm/activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-crm-user': name },
        body: JSON.stringify({ action: 'logged in to CRM', target: '', type: 's' }),
      });
    } catch (err) { console.error('Failed to log session:', err); }
  };

  // Fetch dashboard data
  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/crm/dashboard');
        const json = await res.json();
        if (json.success) {
          setData(json);
        }
      } catch (err) {
        console.error('Failed to fetch CRM data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const nav = useCallback((page) => {
    setActivePage(page);
    setMobileMenuOpen(false);
    setShowMoreMenu(false);
  }, []);

  const openModal = useCallback((type) => {
    setModalType(type);
    document.body.style.overflow = 'hidden';
  }, []);

  const closeModal = useCallback(() => {
    setModalType(null);
    document.body.style.overflow = '';
  }, []);

  const campaignCount = data?.metrics?.activeCampaigns || 0;

  // Show user picker if no identity
  if (showUserPicker) {
    return <UserPickerModal onSelect={handleUserSelect} />;
  }

  return (
    <div className="pulse-root">
      <Sidebar
        activePage={activePage}
        onNav={nav}
        campaignCount={campaignCount}
        currentUser={currentUser}
        onSwitchUser={() => setShowUserPicker(true)}
      />
      <Topbar
        activePage={activePage}
        onOpenModal={openModal}
        currentUser={currentUser}
        onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
      />

      <div className="main-wrap">
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)' }}>
            Loading dashboard...
          </div>
        ) : (
          <>
            {activePage === 'dashboard' && (
              <DashboardPage data={data} onNav={nav} onOpenModal={openModal} />
            )}
            {activePage === 'leads' && (
              <LeadsPage currentUser={currentUser} />
            )}
            {activePage === 'email' && (
              <EmailCampaignsPage data={data} />
            )}
            {activePage === 'linkedin' && (
              <LinkedInPage currentUser={currentUser} />
            )}
            {activePage === 'marketing' && (
              <MarketingPage currentUser={currentUser} />
            )}
            {activePage === 'inbox' && (
              <InboxPage />
            )}
            {activePage === 'tasks' && (
              <TasksPage currentUser={currentUser} onOpenModal={openModal} />
            )}
            {activePage === 'activity' && (
              <ActivityPage data={data} currentUser={currentUser} />
            )}
          </>
        )}
      </div>

      {/* Mobile More Menu */}
      {showMoreMenu && (
        <div className="mobile-more-overlay" onClick={() => setShowMoreMenu(false)}>
          <div className="mobile-more-menu" onClick={e => e.stopPropagation()}>
            {[
              { id: 'email', icon: '✉', label: 'Email Campaigns' },
              { id: 'linkedin', icon: '◈', label: 'LinkedIn' },
              { id: 'marketing', icon: '◎', label: 'Marketing' },
              { id: 'activity', icon: '◑', label: 'Activity Log' },
            ].map(item => (
              <button key={item.id} className={`mm-item ${activePage === item.id ? 'active' : ''}`} onClick={() => nav(item.id)}>
                <span className="mm-icon">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <MobileBottomNav
        activePage={activePage}
        onNav={nav}
        onMore={() => setShowMoreMenu(!showMoreMenu)}
        unreadCount={0}
      />

      <ModalOverlay
        modalType={modalType}
        onClose={closeModal}
        activity={data?.activity}
        currentUser={currentUser}
      />
    </div>
  );
}
