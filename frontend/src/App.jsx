import React, { useState } from 'react';
import { Zap } from 'lucide-react';
import Sidebar from './components/Sidebar';
import ErrorBoundary from './components/ErrorBoundary';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import Campaigns from './pages/Campaigns';
import CampaignWizard from './pages/CampaignWizard';
import MasterDatabase from './pages/MasterDatabase';
import LiveCampaign from './pages/LiveCampaign';
import Leads from './pages/Leads';
import Deals from './pages/Deals';
import KnowledgeBase from './pages/KnowledgeBase';
import Analytics from './pages/Analytics';
import Mailboxes from './pages/Mailboxes';
import Settings from './pages/Settings';

function MainApp() {
  const { isAuthenticated, loading } = useAuth();
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [activeCampaignId, setActiveCampaignId] = useState(null);
  const [activeLeadId, setActiveLeadId] = useState(null);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        width: '100vw',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0b0f19',
        color: '#f8fafc',
        fontFamily: "'Inter', sans-serif"
      }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, #E8622C 0%, #F5A623 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8px 24px rgba(232, 98, 44, 0.4)',
          marginBottom: '1rem',
          animation: 'pulse 1.5s infinite'
        }}>
          <Zap size={28} color="#ffffff" />
        </div>
        <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#94a3b8' }}>
          Loading OpenOutreach...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  const sharedProps = {
    setCurrentTab,
    activeCampaignId,
    setActiveCampaignId,
    activeLeadId,
    setActiveLeadId,
  };

  const renderContent = () => {
    switch (currentTab) {
      case 'dashboard':
        return <Dashboard {...sharedProps} />;
      case 'wizard':
        return (
          <CampaignWizard
            onComplete={(c) => {
              if (c?.id) setActiveCampaignId(c.id);
              setCurrentTab('leads');
            }}
          />
        );
      case 'masterdb':
        return <MasterDatabase />;
      case 'campaigns':
        return <Campaigns {...sharedProps} />;
      case 'live':
        return <LiveCampaign {...sharedProps} />;
      case 'leads':
        return <Leads {...sharedProps} />;
      case 'deals':
        return <Deals {...sharedProps} />;
      case 'knowledge':
        return <KnowledgeBase />;
      case 'analytics':
        return <Analytics />;
      case 'mailboxes':
        return <Mailboxes />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="app-container">
      <Sidebar currentTab={currentTab} setCurrentTab={setCurrentTab} />
      <div className="main-content">
        <ErrorBoundary pageName={currentTab}>
          {renderContent()}
        </ErrorBoundary>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

