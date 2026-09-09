import React, { useState } from 'react';
import {
  Zap, Mail, Lock, User, Eye, EyeOff, CheckCircle2,
  AlertCircle, ArrowRight, ShieldCheck, Sparkles, Building,
  Target, Inbox, Activity, Sun, Moon
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function AuthPage({ defaultTab = 'login' }) {
  const { login, signup } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  const [activeTab, setActiveTab] = useState(defaultTab); // 'login' | 'signup'

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Signup form state
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupRole, setSignupRole] = useState('Director of Growth');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);

  // Status & Feedback
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleLoginSubmit = async (e) => {
    e?.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const email = loginEmail.trim();
    if (!email || !loginPassword) {
      setErrorMsg('Please enter both your work email and password.');
      return;
    }

    setLoading(true);
    try {
      await login(email, loginPassword);
    } catch (err) {
      const detail = err.response?.data?.detail || err.message || 'Login failed. Please check credentials.';
      setErrorMsg(detail);
    } finally {
      setLoading(false);
    }
  };

  const handleSignupSubmit = async (e) => {
    e?.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const name = signupName.trim();
    const email = signupEmail.trim();

    if (!name) {
      setErrorMsg('Please enter your full name.');
      return;
    }
    if (!email) {
      setErrorMsg('Please enter your work email.');
      return;
    }
    if (signupPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }
    if (signupPassword !== signupConfirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await signup({
        fullName: name,
        email,
        password: signupPassword,
        role: signupRole
      });
      setSuccessMsg('Account created successfully! Logging you in...');
    } catch (err) {
      const detail = err.response?.data?.detail || err.message || 'Registration failed. Please try again.';
      setErrorMsg(detail);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoQuickLogin = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    setLoginEmail('admin@openoutreach.ai');
    setLoginPassword('Admin123!');
    setLoading(true);
    try {
      await login('admin@openoutreach.ai', 'Admin123!');
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || err.message || 'Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      width: '100vw',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: isDark
        ? 'radial-gradient(ellipse at 50% 20%, rgba(232, 98, 44, 0.12), transparent 70%), radial-gradient(ellipse at 80% 80%, rgba(27, 42, 74, 0.25), transparent 60%), #0B0F19'
        : 'radial-gradient(ellipse at 50% 20%, rgba(232, 98, 44, 0.08), transparent 70%), radial-gradient(ellipse at 80% 80%, rgba(245, 166, 35, 0.06), transparent 60%), #F8FAFC',
      color: 'var(--text-main, #0F172A)',
      fontFamily: "var(--font-sans, 'Inter', system-ui, -apple-system, sans-serif)",
      padding: '2rem 1rem',
      boxSizing: 'border-box',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background ambient accents matching Coral / Gold theme */}
      <div style={{
        position: 'absolute',
        top: '-10%',
        left: '15%',
        width: '500px',
        height: '500px',
        background: 'radial-gradient(circle, rgba(232, 98, 44, 0.1) 0%, transparent 70%)',
        filter: 'blur(70px)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute',
        bottom: '-10%',
        right: '15%',
        width: '450px',
        height: '450px',
        background: 'radial-gradient(circle, rgba(245, 166, 35, 0.08) 0%, transparent 70%)',
        filter: 'blur(70px)',
        pointerEvents: 'none',
      }} />

      {/* Main Container Card */}
      <div style={{
        width: '100%',
        maxWidth: '1020px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
        background: 'var(--bg-card, #FFFFFF)',
        border: '1px solid var(--border, #CBD5E1)',
        borderRadius: '20px',
        boxShadow: isDark
          ? '0 25px 50px -12px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(232, 98, 44, 0.15)'
          : '0 20px 40px -15px rgba(15, 23, 42, 0.08), 0 0 0 1px rgba(203, 213, 225, 0.8)',
        overflow: 'hidden',
        zIndex: 1,
        transition: 'all 0.3s ease'
      }}>
        {/* Left Branding Showcase Column */}
        <div style={{
          padding: '3rem 2.5rem',
          background: 'linear-gradient(135deg, #1B2A4A 0%, #0F172A 100%)',
          color: '#FFFFFF',
          borderRight: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}>
          <div>
            {/* Logo matching Sidebar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '2.25rem' }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #E8622C 0%, #F5A623 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 16px rgba(232, 98, 44, 0.35)',
                color: '#ffffff'
              }}>
                <Zap size={22} />
              </div>
              <div>
                <h1 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 700, letterSpacing: '-0.02em', color: '#ffffff' }}>
                  OpenOutreach
                </h1>
                <span style={{ fontSize: '0.76rem', color: '#94a3b8', fontWeight: 500 }}>
                  Autonomous B2B Pipeline & Cold Outreach
                </span>
              </div>
            </div>

            {/* Headline */}
            <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#f8fafc', lineHeight: 1.35, marginBottom: '1rem' }}>
              AI-Driven Cold Email Deliverability & Deal Pipeline
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '0.88rem', lineHeight: 1.6, marginBottom: '2rem' }}>
              Discover qualified enterprise decision-makers, launch hyper-personalized outreach sequences, and land directly in the Primary Inbox.
            </p>

            {/* Feature Highlights */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              {[
                { icon: Target, title: 'Precision ICP Match', desc: 'Strict multi-attribute conjunction discovery across titles, depts, and skills.' },
                { icon: Inbox, title: '100% Primary Inbox Reach', desc: 'Clean RFC MIME standards bypass spam and promotions tabs.' },
                { icon: Activity, title: 'Live Deal Intelligence', desc: 'Bidirectional thread sync, AI reply classification, and instant actions.' }
              ].map((feat, idx) => {
                const Icon = feat.icon;
                return (
                  <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <div style={{
                      padding: '7px',
                      borderRadius: '8px',
                      background: 'rgba(232, 98, 44, 0.15)',
                      color: '#FF8A50',
                      marginTop: '2px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Icon size={16} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#f1f5f9' }}>{feat.title}</div>
                      <div style={{ fontSize: '0.78rem', color: '#94a3b8', lineHeight: 1.4 }}>{feat.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Demo Pill */}
          <div style={{
            marginTop: '2.5rem',
            padding: '1rem',
            background: 'rgba(232, 98, 44, 0.08)',
            border: '1px solid rgba(232, 98, 44, 0.25)',
            borderRadius: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#FF8A50', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Sparkles size={13} /> Instant Demo Account
              </span>
              <span style={{ fontSize: '0.7rem', color: '#10b981', backgroundColor: 'rgba(16,185,129,0.15)', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>Ready</span>
            </div>
            <div style={{ fontSize: '0.78rem', color: '#cbd5e1', marginBottom: '8px' }}>
              Login as <strong>admin@openoutreach.ai</strong> (Pass: <code>Admin123!</code>)
            </div>
            <button
              type="button"
              onClick={handleDemoQuickLogin}
              disabled={loading}
              style={{
                width: '100%',
                padding: '7px 12px',
                fontSize: '0.8rem',
                fontWeight: 600,
                color: '#ffffff',
                background: 'linear-gradient(135deg, #E8622C 0%, #F5A623 100%)',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'opacity 0.2s ease',
                boxShadow: '0 2px 8px rgba(232, 98, 44, 0.3)'
              }}
            >
              <Zap size={13} /> 1-Click Demo Sign In
            </button>
          </div>
        </div>

        {/* Right Form Interaction Column */}
        <div style={{
          padding: '3rem 2.5rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          background: 'var(--bg-card, #FFFFFF)',
          position: 'relative'
        }}>
          {/* Header & Theme Toggle */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
            <div>
              <h3 style={{
                margin: 0,
                fontSize: '1.45rem',
                fontWeight: 700,
                color: 'var(--text-main, #0F172A)',
                letterSpacing: '-0.02em'
              }}>
                {activeTab === 'login' ? 'Welcome Back' : 'Create Account'}
              </h3>
              <p style={{
                margin: '4px 0 0 0',
                fontSize: '0.85rem',
                color: 'var(--text-muted, #475569)'
              }}>
                {activeTab === 'login'
                  ? 'Sign in to access your sales deals and outreach campaigns'
                  : 'Start discovering leads and running autonomous AI outreach'}
              </p>
            </div>

            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              title={isDark ? "Switch to Light theme" : "Switch to Dark theme"}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                border: '1px solid var(--border, #CBD5E1)',
                background: 'var(--bg-input, #FFFFFF)',
                color: 'var(--text-main, #0F172A)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              {isDark ? <Sun size={17} color="#F5A623" /> : <Moon size={17} color="#1B2A4A" />}
            </button>
          </div>

          {/* Tab Selector Buttons */}
          <div style={{
            display: 'flex',
            backgroundColor: isDark ? 'rgba(30, 41, 59, 0.6)' : 'var(--bg-inner, #F8FAFC)',
            border: '1px solid var(--border, #CBD5E1)',
            borderRadius: '10px',
            padding: '4px',
            marginBottom: '1.5rem'
          }}>
            <button
              type="button"
              onClick={() => { setActiveTab('login'); setErrorMsg(''); setSuccessMsg(''); }}
              style={{
                flex: 1,
                padding: '9px 16px',
                fontSize: '0.88rem',
                fontWeight: 600,
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                background: activeTab === 'login' ? 'linear-gradient(135deg, #E8622C 0%, #F5A623 100%)' : 'transparent',
                color: activeTab === 'login' ? '#ffffff' : 'var(--text-muted, #475569)',
                boxShadow: activeTab === 'login' ? '0 4px 12px rgba(232, 98, 44, 0.3)' : 'none'
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('signup'); setErrorMsg(''); setSuccessMsg(''); }}
              style={{
                flex: 1,
                padding: '9px 16px',
                fontSize: '0.88rem',
                fontWeight: 600,
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                background: activeTab === 'signup' ? 'linear-gradient(135deg, #E8622C 0%, #F5A623 100%)' : 'transparent',
                color: activeTab === 'signup' ? '#ffffff' : 'var(--text-muted, #475569)',
                boxShadow: activeTab === 'signup' ? '0 4px 12px rgba(232, 98, 44, 0.3)' : 'none'
              }}
            >
              Create Account
            </button>
          </div>

          {/* Feedback Banners */}
          {errorMsg && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '0.75rem 1rem',
              backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              borderRadius: '8px',
              color: isDark ? '#fca5a5' : '#B91C1C',
              fontSize: '0.84rem',
              marginBottom: '1.25rem'
            }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '0.75rem 1rem',
              backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              borderRadius: '8px',
              color: isDark ? '#6ee7b7' : '#047857',
              fontSize: '0.84rem',
              marginBottom: '1.25rem'
            }}>
              <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* ── SIGN IN (LOGIN) FORM ──────────────────────────────────────── */}
          {activeTab === 'login' && (
            <form onSubmit={handleLoginSubmit}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: 'var(--text-sub, #1E293B)',
                  marginBottom: '6px'
                }}>
                  Work Email Address
                </label>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint, #64748B)' }}>
                    <Mail size={16} />
                  </div>
                  <input
                    type="email"
                    required
                    placeholder="name@company.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '11px 12px 11px 38px',
                      backgroundColor: 'var(--bg-input, #FFFFFF)',
                      border: '1px solid var(--border-input, #CBD5E1)',
                      borderRadius: '8px',
                      color: 'var(--text-main, #0F172A)',
                      fontSize: '0.88rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                      transition: 'border-color 0.2s, box-shadow 0.2s'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#E8622C';
                      e.target.style.boxShadow = '0 0 0 3px rgba(232, 98, 44, 0.15)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'var(--border-input, #CBD5E1)';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    color: 'var(--text-sub, #1E293B)'
                  }}>
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => alert('For the local development instance, default credentials are: admin@openoutreach.ai / Admin123!')}
                    style={{ background: 'none', border: 'none', color: '#E8622C', fontSize: '0.76rem', cursor: 'pointer', padding: 0, fontWeight: 500 }}
                  >
                    Forgot Password?
                  </button>
                </div>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint, #64748B)' }}>
                    <Lock size={16} />
                  </div>
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '11px 38px 11px 38px',
                      backgroundColor: 'var(--bg-input, #FFFFFF)',
                      border: '1px solid var(--border-input, #CBD5E1)',
                      borderRadius: '8px',
                      color: 'var(--text-main, #0F172A)',
                      fontSize: '0.88rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                      transition: 'border-color 0.2s, box-shadow 0.2s'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#E8622C';
                      e.target.style.boxShadow = '0 0 0 3px rgba(232, 98, 44, 0.15)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'var(--border-input, #CBD5E1)';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-faint, #64748B)',
                      cursor: 'pointer',
                      padding: 0,
                      display: 'flex'
                    }}
                  >
                    {showLoginPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem' }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '0.82rem',
                  color: 'var(--text-muted, #475569)',
                  cursor: 'pointer'
                }}>
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    style={{ accentColor: '#E8622C', cursor: 'pointer' }}
                  />
                  Remember my session
                </label>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-faint, #64748B)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <ShieldCheck size={13} color="#10b981" /> 256-bit Encrypted
                </span>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'linear-gradient(135deg, #E8622C 0%, #F5A623 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '0.92rem',
                  fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(232, 98, 44, 0.35)',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                }}
              >
                {loading ? 'Authenticating...' : (
                  <>
                    Sign In to Dashboard <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          )}

          {/* ── SIGN UP (REGISTER) FORM ────────────────────────────────────── */}
          {activeTab === 'signup' && (
            <form onSubmit={handleSignupSubmit}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: 'var(--text-sub, #1E293B)',
                  marginBottom: '6px'
                }}>
                  Full Name
                </label>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint, #64748B)' }}>
                    <User size={16} />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Pooja Khalekar"
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px 10px 38px',
                      backgroundColor: 'var(--bg-input, #FFFFFF)',
                      border: '1px solid var(--border-input, #CBD5E1)',
                      borderRadius: '8px',
                      color: 'var(--text-main, #0F172A)',
                      fontSize: '0.88rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#E8622C';
                      e.target.style.boxShadow = '0 0 0 3px rgba(232, 98, 44, 0.15)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'var(--border-input, #CBD5E1)';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: 'var(--text-sub, #1E293B)',
                  marginBottom: '6px'
                }}>
                  Work Email Address
                </label>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint, #64748B)' }}>
                    <Mail size={16} />
                  </div>
                  <input
                    type="email"
                    required
                    placeholder="pooja.khalekar@company.com"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px 10px 38px',
                      backgroundColor: 'var(--bg-input, #FFFFFF)',
                      border: '1px solid var(--border-input, #CBD5E1)',
                      borderRadius: '8px',
                      color: 'var(--text-main, #0F172A)',
                      fontSize: '0.88rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#E8622C';
                      e.target.style.boxShadow = '0 0 0 3px rgba(232, 98, 44, 0.15)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'var(--border-input, #CBD5E1)';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: 'var(--text-sub, #1E293B)',
                  marginBottom: '6px'
                }}>
                  Role / Designation
                </label>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint, #64748B)' }}>
                    <Building size={16} />
                  </div>
                  <select
                    value={signupRole}
                    onChange={(e) => setSignupRole(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px 10px 38px',
                      backgroundColor: 'var(--bg-input, #FFFFFF)',
                      border: '1px solid var(--border-input, #CBD5E1)',
                      borderRadius: '8px',
                      color: 'var(--text-main, #0F172A)',
                      fontSize: '0.88rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="Director of Growth">Director of Growth</option>
                    <option value="Sales Leader / VP">Sales Leader / VP</option>
                    <option value="Account Executive">Account Executive (AE)</option>
                    <option value="Sales Development Rep">Sales Development Rep (SDR)</option>
                    <option value="Founder / CEO">Founder / CEO</option>
                    <option value="Revenue Operations">Revenue Operations (RevOps)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    color: 'var(--text-sub, #1E293B)',
                    marginBottom: '6px'
                  }}>
                    Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showSignupPassword ? 'text' : 'password'}
                      required
                      placeholder="Min 6 chars"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 32px 10px 12px',
                        backgroundColor: 'var(--bg-input, #FFFFFF)',
                        border: '1px solid var(--border-input, #CBD5E1)',
                        borderRadius: '8px',
                        color: 'var(--text-main, #0F172A)',
                        fontSize: '0.85rem',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#E8622C';
                        e.target.style.boxShadow = '0 0 0 3px rgba(232, 98, 44, 0.15)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = 'var(--border-input, #CBD5E1)';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignupPassword(!showSignupPassword)}
                      style={{
                        position: 'absolute',
                        right: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-faint, #64748B)',
                        cursor: 'pointer',
                        padding: 0
                      }}
                    >
                      {showSignupPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    color: 'var(--text-sub, #1E293B)',
                    marginBottom: '6px'
                  }}>
                    Confirm Password
                  </label>
                  <input
                    type={showSignupPassword ? 'text' : 'password'}
                    required
                    placeholder="Repeat password"
                    value={signupConfirmPassword}
                    onChange={(e) => setSignupConfirmPassword(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      backgroundColor: 'var(--bg-input, #FFFFFF)',
                      border: '1px solid var(--border-input, #CBD5E1)',
                      borderRadius: '8px',
                      color: 'var(--text-main, #0F172A)',
                      fontSize: '0.85rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#E8622C';
                      e.target.style.boxShadow = '0 0 0 3px rgba(232, 98, 44, 0.15)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'var(--border-input, #CBD5E1)';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'linear-gradient(135deg, #E8622C 0%, #F5A623 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '0.92rem',
                  fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(232, 98, 44, 0.35)'
                }}
              >
                {loading ? 'Creating Account...' : (
                  <>
                    Create Free Account <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
