import React, { useEffect, useState } from 'react';
import { getSiteConfig, updateSiteConfig } from '../services/api';
import { Settings as SettingsIcon, Globe, Brain, Key, CheckCircle, User, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Settings() {
  const { user, logout } = useAuth();
  const [config, setConfig] = useState({
    ai_model: 'openai:gpt-4o-mini',
    llm_api_key: '',
    lead_discovery_provider: 'web_search',
    country_code: 'US',
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
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <SettingsIcon size={24} style={{ color: '#818cf8' }} />
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700 }}>Settings & User Profile</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Manage active user session, system configuration, and AI engine credentials.
          </p>
        </div>
      </div>

      {/* User Account Profile Card */}
      {user && (
        <div className="card" style={{ padding: '1.25rem 1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(30, 41, 59, 0.6)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '1.1rem'
            }}>
              {user.full_name ? user.full_name[0].toUpperCase() : 'U'}
            </div>
            <div>
              <div style={{ fontSize: '1rem', fontWeight: 600, color: '#f8fafc' }}>
                {user.full_name || 'Active User'}
              </div>
              <div style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                {user.email} · <span style={{ color: '#818cf8', fontWeight: 500 }}>{user.role || 'Team Member'}</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            className="btn"
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              color: '#f87171',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.85rem',
              padding: '8px 14px'
            }}
          >
            <LogOut size={15} /> Sign Out
          </button>
        </div>
      )}

      <div className="card" style={{ padding: '1.5rem' }}>
        {saved && (
          <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#34d399', padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '1.25rem', border: '1px solid rgba(16, 185, 129, 0.3)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle size={16} /> Configuration saved successfully! Settings applied globally.
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Section 1: Active Lead Discovery Engine */}
          <div style={{ marginBottom: '1.75rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '1.25rem' }}>
            <div style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '0.5rem', color: '#e0e7ff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Globe size={18} style={{ color: '#34d399' }} /> Active Lead Discovery Architecture
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
              OpenOutreach AI uses Real AI Web Search & OpenRouter Candidate Grounding to discover live B2B prospects.
            </p>

            <div className="form-group">
              <label style={{ fontWeight: 500 }}>Active Lead Discovery Provider</label>
              <select
                className="form-control"
                value="web_search"
                disabled
                style={{ backgroundColor: 'var(--bg-card)', color: '#fff', border: '1px solid rgba(255,255,255,0.15)', cursor: 'default' }}
              >
                <option value="web_search">Real AI Web Search (Live Retrieval & OpenRouter Candidate Grounding)</option>
              </select>
            </div>
          </div>

          {/* Section 2: AI Campaign Intelligence & LLM Setup */}
          <div style={{ marginBottom: '1.75rem' }}>
            <div style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '0.5rem', color: '#e0e7ff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Brain size={18} style={{ color: '#818cf8' }} /> AI Campaign Intelligence Engine
            </div>
            <div className="form-group">
              <label style={{ fontWeight: 500 }}>AI Model Identifier</label>
              <input
                className="form-control"
                value={config.ai_model || ''}
                onChange={(e) => setConfig({ ...config, ai_model: e.target.value })}
                placeholder="e.g. openai:gpt-4o-mini or meta-llama/llama-3.1-8b-instruct:free"
              />
            </div>

            <div className="form-group">
              <label style={{ fontWeight: 500 }}>LLM / OpenRouter API Key</label>
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
          <div style={{ marginBottom: '1.75rem', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1.25rem' }}>
            <div style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '0.5rem', color: '#e0e7ff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              📅 Meeting & Calendar Link
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
              Your actual meeting or calendar booking URL (e.g., Google Meet, Calendly, Cal.com, Zoom) sent to prospects when executing demo invites.
            </p>

            <div className="form-group">
              <label style={{ fontWeight: 500 }}>Meeting / Calendar URL</label>
              <input
                className="form-control"
                type="text"
                value={config.meeting_link || ''}
                onChange={(e) => setConfig({ ...config, meeting_link: e.target.value })}
                placeholder="https://meet.google.com/abc-defg-hij or https://calendly.com/your-name"
              />
            </div>
          </div>

          <button type="submit" className="btn" style={{ padding: '0.6rem 1.5rem', fontSize: '0.9rem', fontWeight: 600 }}>
            Save Global Settings
          </button>
        </form>
      </div>
    </div>
  );
}
