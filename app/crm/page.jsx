'use client';
import { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import DashboardPage from './components/DashboardPage';
import EmailCampaignsPage from './components/EmailCampaignsPage';
import LinkedInPage from './components/LinkedInPage';
import MarketingPage from './components/MarketingPage';
import TasksPage from './components/TasksPage';
import ActivityPage from './components/ActivityPage';
import ModalOverlay from './components/ModalOverlay';
import UserPickerModal from './components/UserPickerModal';

export default function CrmPulsePage() {
  const [activePage, setActivePage] = useState('dashboard');
  const [modalType, setModalType] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [showUserPicker, setShowUserPicker] = useState(false);

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
    // Log session activity
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
      <Topbar activePage={activePage} onOpenModal={openModal} />

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
            {activePage === 'email' && (
              <EmailCampaignsPage data={data} />
            )}
            {activePage === 'linkedin' && (
              <LinkedInPage currentUser={currentUser} />
            )}
            {activePage === 'marketing' && (
              <MarketingPage />
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

      <ModalOverlay
        modalType={modalType}
        onClose={closeModal}
        activity={data?.activity}
        currentUser={currentUser}
      />
    </div>
  );
}
