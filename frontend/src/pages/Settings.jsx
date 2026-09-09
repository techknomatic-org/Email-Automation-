import React, { useEffect, useState } from 'react';
import { getSiteConfig, updateSiteConfig } from '../services/api';
import { Settings as SettingsIcon, Globe, Brain, Key, CheckCircle, User, LogOut, Sun, Moon, Palette, Calendar } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function Settings() {
  const { user, logout } = useAuth();
  const { theme, setTheme, isDark } = useTheme();
  const [config, setConfig] = useState({
    ai_model: 'openai:gpt-4o-mini',
    llm_api_key: '',
    lead_discovery_provider: 'web_search',
    country_code: 'US',
    meeting_link: ''
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getSiteConfig()
      .then((data) => {
        if (data) setConfig((prev) => ({ ...prev, ...data }));
      })
      .catch((err) => console.error(err));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await updateSiteConfig(config);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      alert('Error updating configuration: ' + err.message);
    }
  };

  return (
    <div style={{ maxWidth: '820px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <div style={{
          width: '38px',
          height: '38px',
          borderRadius: '10px',
          background: 'var(--accent-light)',
          color: 'var(--accent)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <SettingsIcon size={22} />
        </div>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
            Settings & User Profile
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Manage active user session, theme appearance, system configuration, and AI engine credentials.
          </p>
        </div>
      </div>

      {/* User Account Profile Card */}
      {user && (
        <div className="card" style={{
          padding: '1.25rem 1.5rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #E8622C 0%, #F5A623 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '1.15rem',
              boxShadow: '0 4px 12px rgba(232, 98, 44, 0.3)'
            }}>
              {user.full_name ? user.full_name[0].toUpperCase() : 'U'}
            </div>
            <div>
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>
                {user.full_name || 'Active User'}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                {user.email} · <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{user.role || 'Team Member'}</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            className="btn"
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              color: '#ef4444',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.85rem',
              padding: '8px 16px',
              fontWeight: 600
            }}
          >
            <LogOut size={15} /> Sign Out
          </button>
        </div>
      )}

      {/* Theme & Display Appearance Selection */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: '0.35rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Palette size={20} style={{ color: 'var(--accent)' }} /> Display & Theme Appearance
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
          Choose your preferred workspace aesthetic. Switch between Crisp White (Light) and Deep Slate (Dark) mode.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          {/* Light Mode Option */}
          <div
            onClick={() => setTheme('light')}
            style={{
              padding: '1.25rem',
              borderRadius: '12px',
              border: !isDark ? '2px solid var(--accent)' : '1px solid var(--border)',
              backgroundColor: !isDark ? 'var(--accent-light)' : 'var(--bg-main)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}
          >
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #CBD5E1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#E8622C',
              boxShadow: '0 2px 6px rgba(0,0,0,0.06)'
            }}>
              <Sun size={22} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)' }}>
                Light Mode
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Crisp White & High Contrast
              </div>
            </div>
            {!isDark && (
              <span style={{ marginLeft: 'auto', color: 'var(--accent)', fontWeight: 800, fontSize: '1.1rem' }}>✓</span>
            )}
          </div>

          {/* Dark Mode Option */}
          <div
            onClick={() => setTheme('dark')}
            style={{
              padding: '1.25rem',
              borderRadius: '12px',
              border: isDark ? '2px solid var(--accent)' : '1px solid var(--border)',
              backgroundColor: isDark ? 'var(--accent-light)' : 'var(--bg-main)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}
          >
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              backgroundColor: '#1E293B',
              border: '1px solid #334155',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FBBF24',
              boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
            }}>
              <Moon size={22} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)' }}>
                Dark Mode
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Deep Slate & Glow Accents
              </div>
            </div>
            {isDark && (
              <span style={{ marginLeft: 'auto', color: 'var(--accent)', fontWeight: 800, fontSize: '1.1rem' }}>✓</span>
            )}
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: '1.5rem', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        {saved && (
          <div style={{
            backgroundColor: 'rgba(16, 185, 129, 0.12)',
            color: '#10b981',
            padding: '0.85rem 1.25rem',
            borderRadius: '8px',
            marginBottom: '1.5rem',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            fontWeight: 600,
            fontSize: '0.9rem'
          }}>
            <CheckCircle size={18} /> Configuration saved successfully! Settings applied globally.
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Section 1: Active Lead Discovery Engine */}
          <div style={{ marginBottom: '1.75rem', borderBottom: '1px solid var(--border)', paddingBottom: '1.5rem' }}>
            <div style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: '0.35rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Globe size={19} style={{ color: '#10b981' }} /> Active Lead Discovery Architecture
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              OpenOutreach AI uses Real AI Web Search & OpenRouter Candidate Grounding to discover live B2B prospects.
            </p>

            <div className="form-group">
              <label style={{ fontWeight: 600, color: 'var(--text-main)' }}>Active Lead Discovery Provider</label>
              <select
                className="form-control"
                value="web_search"
                disabled
                style={{ backgroundColor: 'var(--bg-inner)', color: 'var(--text-main)', cursor: 'default' }}
              >
                <option value="web_search">Real AI Web Search (Live Retrieval & OpenRouter Candidate Grounding)</option>
              </select>
            </div>
          </div>

          {/* Section 2: AI Campaign Intelligence & LLM Setup */}
          <div style={{ marginBottom: '1.75rem', borderBottom: '1px solid var(--border)', paddingBottom: '1.5rem' }}>
            <div style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: '0.35rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Brain size={19} style={{ color: 'var(--accent)' }} /> AI Campaign Intelligence Engine
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Configure your primary language model for personalized pitch generation, sequence creation, and reply classification.
            </p>

            <div className="form-group">
              <label style={{ fontWeight: 600, color: 'var(--text-main)' }}>AI Model Identifier</label>
              <input
                className="form-control"
                value={config.ai_model || ''}
                onChange={(e) => setConfig({ ...config, ai_model: e.target.value })}
                placeholder="e.g. openai:gpt-4o-mini or meta-llama/llama-3.1-8b-instruct:free"
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ fontWeight: 600, color: 'var(--text-main)' }}>LLM / OpenRouter API Key</label>
              <input
                className="form-control"
                type="password"
                value={config.llm_api_key || ''}
                onChange={(e) => setConfig({ ...config, llm_api_key: e.target.value })}
                placeholder="sk-or-v1-..."
              />
            </div>
          </div>

          {/* Section 3: Meeting & Calendar Link Setup */}
          <div style={{ marginBottom: '1.75rem' }}>
            <div style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: '0.35rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Calendar size={19} style={{ color: '#3b82f6' }} /> Meeting & Calendar Link
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Your actual meeting or calendar booking URL (e.g., Google Meet, Calendly, Cal.com, Zoom) sent to prospects when executing demo invites.
            </p>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ fontWeight: 600, color: 'var(--text-main)' }}>Meeting / Calendar URL</label>
              <input
                className="form-control"
                type="text"
                value={config.meeting_link || ''}
                onChange={(e) => setConfig({ ...config, meeting_link: e.target.value })}
                placeholder="https://meet.google.com/abc-defg-hij or https://calendly.com/your-name"
              />
            </div>
          </div>

          <button type="submit" className="btn" style={{ padding: '0.65rem 1.6rem', fontSize: '0.9rem', fontWeight: 700 }}>
            Save Global Settings
          </button>
        </form>
      </div>
    </div>
  );
}
