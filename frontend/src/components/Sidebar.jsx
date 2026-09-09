import React, { useEffect, useState } from 'react';
import {
  LayoutDashboard, Target, Users, Mail, Settings, Send,
  Database, BarChart3, Wand2, Play, Zap, Info, LogOut,
  ChevronLeft, ChevronRight, PanelLeftClose, PanelLeftOpen,
  Sun, Moon
} from 'lucide-react';
import { getSiteConfig } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

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
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem('sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const { user, logout } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();

  useEffect(() => {
    getSiteConfig()
      .then(cfg => { if (cfg?.mode) setSystemMode(cfg.mode.toUpperCase()); })
      .catch(() => setSystemMode('REAL'));
  }, []);

  const isReal = systemMode === 'REAL';

  const toggleCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

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
    <div
      className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}
      style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
    >
      {/* ── Logo & Minimize Toggle ─────────────────────────────── */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-title">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}>
            <div
              className="sidebar-logo-icon"
              onClick={isCollapsed ? toggleCollapse : undefined}
              style={{ cursor: isCollapsed ? 'pointer' : 'default' }}
              title={isCollapsed ? "Click to expand sidebar" : undefined}
            >
              <Zap size={16} />
            </div>
            {!isCollapsed && (
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                OpenOutreach
              </span>
            )}
          </div>

          {/* Minimize / Expand Toggle Button at Header */}
          <button
            type="button"
            className="sidebar-toggle-btn"
            onClick={toggleCollapse}
            aria-label={isCollapsed ? "Expand Sidebar" : "Minimize Sidebar"}
            title={isCollapsed ? "Expand Sidebar" : "Minimize Sidebar"}
          >
            {isCollapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
          </button>
        </div>

        {/* Mode badge */}
        {!isCollapsed ? (
          <div
            className="sidebar-mode-badge"
            style={{
              backgroundColor: isReal ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)',
              color:           isReal ? '#059669' : '#d97706',
              border: `1px solid ${isReal ? 'rgba(16,185,129,0.25)' : 'rgba(245,158,11,0.25)'}`,
            }}
          >
            <span style={{ fontSize: '0.55rem' }}>{isReal ? '🟢' : '🛠'}</span>
            {isReal ? 'Live Mode' : 'Demo Mode'}
          </div>
        ) : (
          <div
            title={isReal ? "Live Mode" : "Demo Mode"}
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: isReal ? '#10b981' : '#f5a623',
              boxShadow: `0 0 6px ${isReal ? '#10b981' : '#f5a623'}`,
              margin: '2px auto 0 auto'
            }}
          />
        )}
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
            title={isCollapsed ? label : undefined}
          >
            <Icon size={17} />
            {!isCollapsed && <span>{label}</span>}
          </div>
        ))}
      </nav>

      {/* ── Theme Mode Toggle (Light / Dark) ────────────────── */}
      <div style={{
        margin: isCollapsed ? '0.5rem 0' : '0.5rem 0.75rem',
        padding: isCollapsed ? '0.4rem 0.2rem' : '0.45rem 0.65rem',
        backgroundColor: 'var(--bg-main)',
        border: '1px solid var(--border)',
        borderRadius: '10px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: isCollapsed ? 'center' : 'space-between',
        cursor: 'pointer',
        transition: 'all 0.2s ease'
      }}
      onClick={toggleTheme}
      title={isDark ? "Switch to Crisp Light Theme" : "Switch to Deep Dark Theme"}
      >
        {!isCollapsed ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)' }}>
              {isDark ? (
                <Moon size={15} style={{ color: '#fbbf24' }} />
              ) : (
                <Sun size={15} style={{ color: '#e8622c' }} />
              )}
              <span>{isDark ? 'Dark Theme' : 'Light Theme'}</span>
            </div>
            <div style={{
              width: '36px',
              height: '20px',
              borderRadius: '12px',
              backgroundColor: isDark ? '#e8622c' : '#cbd5e1',
              padding: '2px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: isDark ? 'flex-end' : 'flex-start',
              transition: 'all 0.2s ease'
            }}>
              <div style={{
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                backgroundColor: '#ffffff',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
              }} />
            </div>
          </>
        ) : (
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: isDark ? '#fbbf24' : '#e8622c'
          }}>
            {isDark ? <Moon size={16} /> : <Sun size={16} />}
          </div>
        )}
      </div>

      {/* ── User Profile & Logout Card ────────────────────────── */}
      {user && (
        <div style={{
          padding: isCollapsed ? '0.5rem 0.25rem' : '0.75rem',
          margin: isCollapsed ? '0.5rem 0' : '0.5rem 0.75rem',
          backgroundColor: 'var(--bg-main)',
          border: '1px solid var(--border)',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: isCollapsed ? 'center' : 'space-between',
          gap: '8px'
        }}>
          <div
            onClick={isCollapsed ? () => setShowLogoutConfirm(true) : undefined}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: isCollapsed ? 'center' : 'flex-start',
              gap: '8px',
              minWidth: 0,
              flex: 1,
              cursor: isCollapsed ? 'pointer' : 'default'
            }}
            title={isCollapsed ? `${user.full_name || user.email} (Click to sign out)` : undefined}
          >
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #E8622C 0%, #F5A623 100%)',
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
            {!isCollapsed && (
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: 'var(--text-main)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {user.full_name || user.email?.split('@')[0]}
                </div>
                <div style={{
                  fontSize: '0.7rem',
                  color: 'var(--text-muted)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {user.role || 'Member'}
                </div>
              </div>
            )}
          </div>

          {!isCollapsed && (
            <button
              type="button"
              onClick={() => setShowLogoutConfirm(true)}
              title="Log Out"
              style={{
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                color: '#dc2626',
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
          )}
        </div>
      )}

      {/* ── Footer ───────────────────────────────────────────── */}
      <div className="sidebar-footer">
        {!isCollapsed ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Info size={13} />
              <span>v1.0 · OpenOutreach</span>
            </div>
            <button
              type="button"
              className="sidebar-toggle-btn"
              onClick={toggleCollapse}
              title="Minimize sidebar"
              style={{ width: 22, height: 22 }}
            >
              <ChevronLeft size={13} />
            </button>
          </>
        ) : (
          <button
            type="button"
            className="sidebar-toggle-btn"
            onClick={toggleCollapse}
            title="Expand sidebar"
          >
            <ChevronRight size={14} />
          </button>
        )}
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
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '14px',
            padding: '1.5rem',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
            textAlign: 'center'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              color: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem auto'
            }}>
              <LogOut size={22} />
            </div>

            <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-main)', fontSize: '1.15rem', fontWeight: 700 }}>
              Confirm Sign Out
            </h3>
            <p style={{ color: 'var(--text-sub)', fontSize: '0.85rem', lineHeight: 1.5, margin: '0 0 1.5rem 0' }}>
              Are you sure you want to log out of OpenOutreach? You will need to sign in again to access your campaigns.
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                style={{
                  flex: 1,
                  padding: '9px 16px',
                  backgroundColor: 'var(--bg-main)',
                  color: 'var(--text-main)',
                  border: '1px solid var(--border)',
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

