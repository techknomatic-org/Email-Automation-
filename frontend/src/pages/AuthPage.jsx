import React, { useState } from 'react';
import {
  Zap, Mail, Lock, User, Eye, EyeOff, CheckCircle2,
  AlertCircle, ArrowRight, ShieldCheck, Sparkles, Building,
  Target, Inbox, Activity
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AuthPage({ defaultTab = 'login' }) {
  const { login, signup } = useAuth();
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
      background: 'radial-gradient(ellipse at 50% 20%, rgba(99, 102, 241, 0.15), transparent 70%), radial-gradient(ellipse at 80% 80%, rgba(245, 158, 11, 0.08), transparent 60%), #0b0f19',
      color: '#f8fafc',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      padding: '2rem 1rem',
      boxSizing: 'border-box',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Subtle background glow effect */}
      <div style={{
        position: 'absolute',
        top: '-10%',
        left: '20%',
        width: '500px',
        height: '500px',
        background: 'radial-gradient(circle, rgba(99, 102, 241, 0.12) 0%, transparent 70%)',
        filter: 'blur(60px)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute',
        bottom: '-10%',
        right: '15%',
        width: '450px',
        height: '450px',
        background: 'radial-gradient(circle, rgba(16, 185, 129, 0.08) 0%, transparent 70%)',
        filter: 'blur(60px)',
        pointerEvents: 'none',
      }} />

      {/* Main Container Card */}
      <div style={{
        width: '100%',
        maxWidth: '1000px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
        background: 'rgba(17, 24, 39, 0.75)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '20px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(99, 102, 241, 0.15)',
        overflow: 'hidden',
        zIndex: 1
      }}>
        {/* Left Branding Showcase Column */}
        <div style={{
          padding: '3rem 2.5rem',
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.9) 100%)',
          borderRight: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}>
          <div>
            {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '2rem' }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 16px rgba(99, 102, 241, 0.35)',
                color: '#ffffff'
              }}>
                <Zap size={22} />
              </div>
              <div>
                <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700, letterSpacing: '-0.02em', color: '#ffffff' }}>
                  OpenOutreach
                </h1>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 500 }}>
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {[
                { icon: Target, title: 'Precision ICP Match', desc: 'Strict AND condition discovery across titles, depts, and skills.' },
                { icon: Inbox, title: '100% Primary Inbox Reach', desc: 'Clean headers & RFC standards bypass spam and promotions tabs.' },
                { icon: Activity, title: 'Live Deal Intelligence', desc: 'Full bidirectional thread sync, AI reply classification & NBA.' }
              ].map((feat, idx) => {
                const Icon = feat.icon;
                return (
                  <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <div style={{
                      padding: '7px',
                      borderRadius: '8px',
                      background: 'rgba(99, 102, 241, 0.15)',
                      color: '#818cf8',
                      marginTop: '2px'
                    }}>
                      <Icon size={16} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.86rem', fontWeight: 600, color: '#f1f5f9' }}>{feat.title}</div>
                      <div style={{ fontSize: '0.78rem', color: '#64748b', lineHeight: 1.4 }}>{feat.desc}</div>
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
            background: 'rgba(99, 102, 241, 0.08)',
            border: '1px solid rgba(99, 102, 241, 0.25)',
            borderRadius: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#a5b4fc', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Sparkles size={13} /> Instant Demo Account
              </span>
              <span style={{ fontSize: '0.7rem', color: '#34d399', backgroundColor: 'rgba(16,185,129,0.15)', padding: '2px 6px', borderRadius: '4px' }}>Ready</span>
            </div>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: '8px' }}>
              Login as <strong>admin@openoutreach.ai</strong> (Pass: <code>Admin123!</code>)
            </div>
            <button
              type="button"
              onClick={handleDemoQuickLogin}
              disabled={loading}
              style={{
                width: '100%',
                padding: '6px 12px',
                fontSize: '0.78rem',
                fontWeight: 600,
                color: '#ffffff',
                background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'opacity 0.2s'
              }}
            >
              <Zap size={13} /> One-Click Quick Demo Sign In
            </button>
          </div>
        </div>

        {/* Right Form Column */}
        <div style={{ padding: '3rem 2.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          {/* Tab Navigation */}
          <div style={{
            display: 'flex',
            background: 'rgba(30, 41, 59, 0.8)',
            padding: '4px',
            borderRadius: '10px',
            marginBottom: '2rem',
            border: '1px solid rgba(255, 255, 255, 0.06)'
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
                background: activeTab === 'login' ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' : 'transparent',
                color: activeTab === 'login' ? '#ffffff' : '#94a3b8',
                boxShadow: activeTab === 'login' ? '0 4px 12px rgba(99, 102, 241, 0.3)' : 'none'
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
                background: activeTab === 'signup' ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' : 'transparent',
                color: activeTab === 'signup' ? '#ffffff' : '#94a3b8',
                boxShadow: activeTab === 'signup' ? '0 4px 12px rgba(99, 102, 241, 0.3)' : 'none'
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
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              borderRadius: '8px',
              color: '#fca5a5',
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
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              borderRadius: '8px',
              color: '#6ee7b7',
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
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                  Work Email Address
                </label>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}>
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
                      padding: '10px 12px 10px 38px',
                      backgroundColor: 'rgba(15, 23, 42, 0.6)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '8px',
                      color: '#f8fafc',
                      fontSize: '0.88rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1' }}>
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => alert('For the local development instance, default credentials are: admin@openoutreach.ai / Admin123!')}
                    style={{ background: 'none', border: 'none', color: '#818cf8', fontSize: '0.75rem', cursor: 'pointer', padding: 0 }}
                  >
                    Forgot Password?
                  </button>
                </div>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}>
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
                      padding: '10px 38px 10px 38px',
                      backgroundColor: 'rgba(15, 23, 42, 0.6)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '8px',
                      color: '#f8fafc',
                      fontSize: '0.88rem',
                      outline: 'none',
                      boxSizing: 'border-box'
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
                      color: '#64748b',
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
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: '#94a3b8', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    style={{ accentColor: '#6366f1', cursor: 'pointer' }}
                  />
                  Remember my session
                </label>
                <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <ShieldCheck size={13} color="#34d399" /> 256-bit Encrypted
                </span>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: '#6366f1',
                  background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
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
                  boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)',
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
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                  Full Name
                </label>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}>
                    <User size={16} />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Alex Morgan"
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px 10px 38px',
                      backgroundColor: 'rgba(15, 23, 42, 0.6)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '8px',
                      color: '#f8fafc',
                      fontSize: '0.88rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                  Work Email Address
                </label>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}>
                    <Mail size={16} />
                  </div>
                  <input
                    type="email"
                    required
                    placeholder="alex@company.com"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px 10px 38px',
                      backgroundColor: 'rgba(15, 23, 42, 0.6)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '8px',
                      color: '#f8fafc',
                      fontSize: '0.88rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                  Role / Designation
                </label>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}>
                    <Building size={16} />
                  </div>
                  <select
                    value={signupRole}
                    onChange={(e) => setSignupRole(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px 10px 38px',
                      backgroundColor: '#0f172a',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '8px',
                      color: '#f8fafc',
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
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
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
                        backgroundColor: 'rgba(15, 23, 42, 0.6)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: '8px',
                        color: '#f8fafc',
                        fontSize: '0.85rem',
                        outline: 'none',
                        boxSizing: 'border-box'
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
                        color: '#64748b',
                        cursor: 'pointer',
                        padding: 0
                      }}
                    >
                      {showSignupPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
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
                      backgroundColor: 'rgba(15, 23, 42, 0.6)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '8px',
                      color: '#f8fafc',
                      fontSize: '0.85rem',
                      outline: 'none',
                      boxSizing: 'border-box'
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
                  backgroundColor: '#6366f1',
                  background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
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
                  boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)'
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
