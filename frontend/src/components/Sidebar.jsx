import React, { useEffect, useState } from 'react';
import {
  LayoutDashboard, Target, Users, Mail, Settings, Send,
  Database, BarChart3, Wand2, Play, Zap, Info, LogOut
} from 'lucide-react';
import { getSiteConfig } from '../services/api';
import { useAuth } from '../context/AuthContext';

const MENU_ITEMS = [
  { id: 'dashboard',  label: 'Dashboard',           icon: LayoutDashboard },
  { id: 'wizard',     label: 'AI Campaign Wizard',  icon: Wand2 },
  { id: 'masterdb',   label: 'Master Database',     icon: Database },
  { id: 'campaigns',  label: 'Campaigns',           icon: Target },
  { id: 'leads',      label: 'Leads Pool',          icon: Users },
  { id: 'deals',      label: 'Deals & Pipeline',    icon: Send },
  { id: 'live',       label: 'Campaign Execution',  icon: Play },
  { id: 'knowledge',  label: 'Company RAG Docs',    icon: Database },
  { id: 'analytics',  label: 'Analytics',           icon: BarChart3 },
  { id: 'mailboxes',  label: 'Mailboxes',           icon: Mail },
  { id: 'settings',   label: 'Settings',            icon: Settings },
];

export default function Sidebar({ currentTab, setCurrentTab }) {
  const [systemMode, setSystemMode] = useState('REAL');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const { user, logout } = useAuth();

  useEffect(() => {
    getSiteConfig()
      .then(cfg => { if (cfg?.mode) setSystemMode(cfg.mode.toUpperCase()); })
      .catch(() => setSystemMode('REAL'));
  }, []);

  const isReal = systemMode === 'REAL';

  const getUserInitials = () => {
    if (!user?.full_name) return 'U';
    const parts = user.full_name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return parts[0].substring(0, 2).toUpperCase();
  };

  const handleLogout = async () => {
    setShowLogoutConfirm(false);
    await logout();
  };

  return (
    <div className="sidebar" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* ── Logo ─────────────────────────────────────────────── */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-title">
          <div className="sidebar-logo-icon">
            <Zap size={16} />
          </div>
          <span>OpenOutreach</span>
        </div>

        {/* Mode badge */}
        <div
          className="sidebar-mode-badge"
          style={{
            backgroundColor: isReal ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)',
            color:           isReal ? '#34d399' : '#fbbf24',
            border: `1px solid ${isReal ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'}`,
          }}
        >
          <span style={{ fontSize: '0.55rem' }}>{isReal ? '🟢' : '🛠'}</span>
          {isReal ? 'Live Mode' : 'Demo Mode'}
        </div>
      </div>

      {/* ── Navigation ───────────────────────────────────────── */}
      <nav className="sidebar-nav" style={{ flex: 1, overflowY: 'auto' }}>
        {MENU_ITEMS.map(({ id, label, icon: Icon }) => (
          <div
            key={id}
            id={`nav-${id}`}
            className={`nav-item ${currentTab === id ? 'active' : ''}`}
            onClick={() => setCurrentTab(id)}
            role="button"
            tabIndex={0}
            onKeyDown={e => e.key === 'Enter' && setCurrentTab(id)}
            aria-label={label}
            aria-current={currentTab === id ? 'page' : undefined}
          >
            <Icon size={17} />
            <span>{label}</span>
          </div>
        ))}
      </nav>

      {/* ── User Profile & Logout Card ────────────────────────── */}
      {user && (
        <div style={{
          padding: '0.75rem',
          margin: '0.5rem 0.75rem',
          backgroundColor: 'rgba(30, 41, 59, 0.7)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '0.78rem',
              flexShrink: 0
            }}>
              {getUserInitials()}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{
                fontSize: '0.82rem',
                fontWeight: 600,
                color: '#f1f5f9',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {user.full_name || user.email?.split('@')[0]}
              </div>
              <div style={{
                fontSize: '0.7rem',
                color: '#94a3b8',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {user.role || 'Member'}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowLogoutConfirm(true)}
            title="Log Out"
            style={{
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              color: '#f87171',
              padding: '6px',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s ease',
              flexShrink: 0
            }}
          >
            <LogOut size={14} />
          </button>
        </div>
      )}

      {/* ── Footer ───────────────────────────────────────────── */}
      <div className="sidebar-footer">
        <Info size={13} />
        <span>v1.0 · FastAPI + React</span>
      </div>

      {/* ── Logout Confirmation Modal ────────────────────────── */}
      {showLogoutConfirm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            width: '90%',
            maxWidth: '400px',
            backgroundColor: '#0f172a',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '14px',
            padding: '1.5rem',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
            textAlign: 'center'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              color: '#f87171',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem auto'
            }}>
              <LogOut size={22} />
            </div>

            <h3 style={{ margin: '0 0 0.5rem 0', color: '#f8fafc', fontSize: '1.15rem' }}>
              Confirm Sign Out
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', lineHeight: 1.5, margin: '0 0 1.5rem 0' }}>
              Are you sure you want to log out of OpenOutreach? You will need to sign in again to access your campaigns.
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                style={{
                  flex: 1,
                  padding: '9px 16px',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  color: '#e2e8f0',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleLogout}
                style={{
                  flex: 1,
                  padding: '9px 16px',
                  backgroundColor: '#ef4444',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

