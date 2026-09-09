import React, { useState, useEffect } from 'react';
import { getCampaigns, updateCampaign, deleteCampaign, getCampaignLead, generateEmailForDeal, sendEmailForDeal, simulateReply, regenerateLeadPool } from '../services/api';
import { Trash2, Users, ChevronRight, Rocket, User, Sparkles, Send, MessageCircle, RefreshCw, Filter, CheckCircle, ShieldAlert, XCircle, PlusCircle, Edit3, Save, X, Zap, Clock } from 'lucide-react';
import CampaignSequenceBuilder from '../components/CampaignSequenceBuilder';

export default function Campaigns({ setCurrentTab, activeCampaignId, setActiveCampaignId, activeLeadId, setActiveLeadId }) {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterCampaignId, setFilterCampaignId] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLeadData, setSelectedLeadData] = useState(null);
  const [leadLoading, setLeadLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState('');

  // Sequence Modal State
  const [sequenceModalCampaign, setSequenceModalCampaign] = useState(null);

  // Edit Campaign Modal State
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    campaign_target: '',
    objective: '',
    description: '',
    country_code: ''
  });
  const [savingEdit, setSavingEdit] = useState(false);

  const handleOpenEditModal = (camp) => {
    setEditingCampaign(camp);
    setEditFormData({
      name: camp.name || '',
      campaign_target: camp.campaign_target || '',
      objective: camp.objective || '',
      description: camp.description || '',
      country_code: camp.country_code || ''
    });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingCampaign) return;
    setSavingEdit(true);
    try {
      await updateCampaign(editingCampaign.id, editFormData);
      // Automatically regenerate lead pool with updated campaign target criteria
      try {
        await regenerateLeadPool(editingCampaign.id);
      } catch (err) {
        console.warn('Lead pool re-sync notice:', err);
      }
      await load();
      setEditingCampaign(null);
    } catch (err) {
      alert('Error updating campaign: ' + (err.response?.data?.detail || err.message));
    } finally {
      setSavingEdit(false);
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      const data = await getCampaigns();
      setCampaigns(data || []);
    } catch (e) {
      console.error('Error fetching campaigns:', e);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (activeCampaignId) {
      setFilterCampaignId(activeCampaignId.toString());
    }
  }, [activeCampaignId]);

  // Load single selected lead context if activeCampaignId and activeLeadId are provided
  const loadSelectedLeadContext = async (cId, lId) => {
    if (!cId || !lId) {
      setSelectedLeadData(null);
      return;
    }
    setLeadLoading(true);
    try {
      const leadData = await getCampaignLead(cId, lId);
      setSelectedLeadData(leadData);
    } catch (err) {
      console.error(`Error validating/loading lead ${lId} for campaign ${cId}:`, err);
      setSelectedLeadData(null);
    } finally {
      setLeadLoading(false);
    }
  };

  useEffect(() => {
    const targetCampaignId = filterCampaignId !== 'ALL' ? filterCampaignId : activeCampaignId;
    if (targetCampaignId && activeLeadId) {
      loadSelectedLeadContext(targetCampaignId, activeLeadId);
    } else {
      setSelectedLeadData(null);
    }
  }, [filterCampaignId, activeCampaignId, activeLeadId]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this campaign and all its deals?')) return;
    try {
      await deleteCampaign(id);
      load();
    } catch (e) {
      alert('Delete failed');
    }
  };

  const handleDealAction = async (action, dealId, leadEmail, cId) => {
    setActionLoading(action);
    try {
      if (action === 'generate') {
        if (dealId) {
          await generateEmailForDeal(dealId);
        }
        if (setActiveCampaignId && cId) setActiveCampaignId(cId);
        if (setCurrentTab) setCurrentTab('deals'); // Navigates directly to DEALS & PIPELINE!
      } else if (action === 'send') {
        if (dealId) {
          await sendEmailForDeal(dealId, {
            to_address: leadEmail || 'prospect@example.com',
            subject: 'Outreach Subject',
            body: 'Outreach Body',
            simulate: true
          });
          alert(`✅ Email sent (simulated) to ${leadEmail}`);
        }
        if (setActiveCampaignId && cId) setActiveCampaignId(cId);
        if (setCurrentTab) setCurrentTab('deals');
      } else if (action === 'reply') {
        if (dealId) {
          await simulateReply(dealId);
        }
        if (setActiveCampaignId && cId) setActiveCampaignId(cId);
        if (setCurrentTab) setCurrentTab('deals');
      }
      const targetCampaignId = filterCampaignId !== 'ALL' ? filterCampaignId : activeCampaignId;
      if (targetCampaignId && activeLeadId) {
        await loadSelectedLeadContext(targetCampaignId, activeLeadId);
      }
    } catch (err) {
      alert('Action error: ' + (err.response?.data?.detail || err.message));
    } finally {
      setActionLoading('');
    }
  };

  const STEPS = [
    { key: 'create', label: '① Create' },
    { key: 'leads', label: '② Lead Pool' },
    { key: 'generate', label: '③ Generate Email' },
    { key: 'send', label: '④ Send' },
    { key: 'reply', label: '⑤ Reply' }
  ];

  // Filter displayed campaigns based on Campaign Filter dropdown and search query
  const displayedCampaigns = (filterCampaignId === 'ALL'
    ? campaigns
    : campaigns.filter((c) => c.id === Number(filterCampaignId)))
    .filter((c) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        (c.name || '').toLowerCase().includes(q) ||
        (c.campaign_target || '').toLowerCase().includes(q) ||
        (c.description || '').toLowerCase().includes(q) ||
        (c.industry || '').toLowerCase().includes(q) ||
        (c.objective || '').toLowerCase().includes(q)
      );
    });

  return (
    <div>
      {/* Header & Campaign Filter Dropdown */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700 }}>Campaigns</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.2rem' }}>
            Campaign Filter → Selected Lead Context → Generate Email (Deals & Pipeline) → Send → Reply
          </p>
        </div>

        {/* Campaign Filter Dropdown replacing New AI Campaign button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Filter size={16} style={{ color: '#818cf8' }} />
          <input
            type="text"
            placeholder="Search campaigns..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="form-control"
            style={{ width: '260px', backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', border: '1px solid var(--border)', fontWeight: 600 }}
          />
          <select
            className="form-control"
            style={{ width: '260px', backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', border: '1px solid rgba(99,102,241,0.3)', fontWeight: 600 }}
            value={filterCampaignId}
            onChange={(e) => {
              const newFilter = e.target.value;
              setFilterCampaignId(newFilter);
              if (setActiveCampaignId && newFilter !== 'ALL') {
                setActiveCampaignId(Number(newFilter));
              }
              if (newFilter !== 'ALL' && activeCampaignId && Number(newFilter) !== Number(activeCampaignId)) {
                if (setActiveLeadId) setActiveLeadId(null);
              }
            }}
          >
            <option value="ALL">All Campaigns ({campaigns.length})</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} (#{c.id})
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading campaigns…</div>
      ) : displayedCampaigns.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <Rocket size={40} style={{ color: '#6366f1', marginBottom: '1rem' }} />
          <h3 style={{ marginBottom: '0.5rem' }}>No campaigns match current filter</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Select "All Campaigns" or create a campaign to view campaigns.</p>
          <button className="btn" onClick={() => setFilterCampaignId('ALL')}>View All Campaigns</button>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {displayedCampaigns.map((c) => {
              const isCampaignActive = activeCampaignId && Number(activeCampaignId) === c.id;
              const hasSelectedLead = isCampaignActive && activeLeadId && selectedLeadData;

              return (
                <div key={c.id} className="card" style={{ padding: '1.4rem 1.6rem', border: isCampaignActive ? '1px solid rgba(99,102,241,0.4)' : '1px solid var(--border)' }}>
                  {/* Campaign Header Row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: hasSelectedLead ? '1.2rem' : '0' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <span style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-main)' }}>{c.name}</span>
                        <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '999px', background: 'var(--accent-light)', color: 'var(--accent)', fontWeight: 700 }}>#{c.id}</span>
                      </div>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '3px' }}>
                        Targeting: {c.campaign_target || 'Target specified personas & role criteria'}
                      </p>
                    </div>

                    {/* Interactive Pipeline Stepper Buttons */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', flexWrap: 'wrap' }}>
                      {STEPS.map((s, i) => (
                        <React.Fragment key={s.key}>
                          <button
                            type="button"
                            style={{
                              padding: '4px 10px',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              backgroundColor: i === 0 || (i === 1 && hasSelectedLead) ? 'rgba(16, 185, 129, 0.12)' : 'var(--bg-inner)',
                              color: i === 0 || (i === 1 && hasSelectedLead) ? '#059669' : 'var(--text-muted)',
                              border: i === 0 || (i === 1 && hasSelectedLead) ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--border)',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              outline: 'none'
                            }}
                            onClick={() => {
                              if (setActiveCampaignId) setActiveCampaignId(c.id);
                              if (s.key === 'create') {
                                if (setCurrentTab) setCurrentTab('wizard');
                              } else if (s.key === 'leads') {
                                if (setCurrentTab) setCurrentTab('leads');
                              } else if (s.key === 'generate') {
                                handleDealAction('generate', selectedLeadData?.deal_id, selectedLeadData?.email, c.id);
                              } else if (s.key === 'send') {
                                handleDealAction('send', selectedLeadData?.deal_id, selectedLeadData?.email, c.id);
                              } else if (s.key === 'reply') {
                                handleDealAction('reply', selectedLeadData?.deal_id, selectedLeadData?.email, c.id);
                              }
                            }}
                          >
                            {s.label}
                          </button>
                          {i < STEPS.length - 1 && <ChevronRight size={12} style={{ color: 'var(--text-muted)' }} />}
                        </React.Fragment>
                      ))}
                    </div>

                    {/* Campaign Action Buttons */}
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        style={{ fontSize: '0.78rem', padding: '6px 12px', background: 'var(--bg-inner)', color: 'var(--text-main)', border: '1px solid var(--border)', borderRadius: '6px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                        onClick={() => setSequenceModalCampaign(c)}
                        title="Configure Campaign Automation Sequence & Timers"
                      >
                        <Zap size={13} color="var(--accent)" />
                        Automation Sequence
                      </button>
                      <button
                        type="button"
                        style={{ fontSize: '0.78rem', padding: '6px 12px', background: 'var(--bg-inner)', color: 'var(--text-main)', border: '1px solid var(--border)', borderRadius: '6px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                        onClick={() => handleOpenEditModal(c)}
                        title="Edit Campaign Details"
                      >
                        <Edit3 size={13} />
                        Edit
                      </button>
                      <button
                        type="button"
                        style={{ fontSize: '0.78rem', padding: '6px 14px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
                        onClick={() => {
                          if (setActiveCampaignId) setActiveCampaignId(c.id);
                          if (setCurrentTab) setCurrentTab('live');
                        }}
                      >
                        <Rocket size={13} style={{ marginRight: '4px', display: 'inline' }} />
                        Open Execution
                      </button>
                      <button
                        type="button"
                        style={{ fontSize: '0.78rem', padding: '6px 10px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '6px', cursor: 'pointer' }}
                        onClick={() => handleDelete(c.id)}
                        title="Delete Campaign"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* SELECTED LEAD ONLY CONTEXT CARD */}
                  {hasSelectedLead && (
                    <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px', padding: '1.1rem 1.25rem', marginTop: '0.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ padding: '0.4rem', borderRadius: '6px', backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#34d399' }}>
                            <User size={16} />
                          </div>
                          <div>
                            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>
                              Selected Prospect: {selectedLeadData.name} &nbsp;
                              <span className="badge badge-qualified" style={{ backgroundColor: 'var(--success-light)', color: '#059669', fontSize: '0.72rem' }}>
                                Fit Score: {selectedLeadData.fit_score}%
                              </span>
                            </div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                              {selectedLeadData.title} @ {selectedLeadData.company} &nbsp;·&nbsp; {selectedLeadData.email} &nbsp;·&nbsp; Location: {selectedLeadData.location}
                            </div>
                          </div>
                        </div>

                        <span className="badge" style={{ backgroundColor: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', border: '1px solid rgba(99, 102, 241, 0.3)', padding: '4px 10px', fontSize: '0.75rem', fontWeight: 600 }}>
                          Deal State: {selectedLeadData.deal_state}
                        </span>
                      </div>

                      {/* Qualification Explanation */}
                      {selectedLeadData.explanation && (
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontStyle: 'italic', marginBottom: '0.75rem' }}>
                          "{selectedLeadData.explanation}"
                        </p>
                      )}

                      {/* Selected Lead Specific Actions */}
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                        <button
                          className="btn"
                          style={{ fontSize: '0.75rem', padding: '5px 12px', background: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1px solid #4f46e5', fontWeight: 600 }}
                          onClick={() => handleDealAction('generate', selectedLeadData.deal_id, selectedLeadData.email, c.id)}
                          disabled={actionLoading === 'generate'}
                        >
                          <Sparkles size={12} style={{ marginRight: '4px', display: 'inline' }} />
                          {actionLoading === 'generate' ? 'Generating…' : '✨ Generate AI Email'}
                        </button>

                        <button
                          className="btn"
                          style={{ fontSize: '0.75rem', padding: '5px 12px', background: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: '1px solid #3b82f6', fontWeight: 600 }}
                          onClick={() => handleDealAction('send', selectedLeadData.deal_id, selectedLeadData.email, c.id)}
                          disabled={actionLoading === 'send'}
                        >
                          <Send size={12} style={{ marginRight: '4px', display: 'inline' }} />
                          {actionLoading === 'send' ? 'Sending…' : '📤 Send Email'}
                        </button>

                        <button
                          className="btn"
                          style={{ fontSize: '0.75rem', padding: '5px 12px', background: 'rgba(16,185,129,0.15)', color: '#34d399', border: '1px solid #059669', fontWeight: 600 }}
                          onClick={() => handleDealAction('reply', selectedLeadData.deal_id, selectedLeadData.email, c.id)}
                          disabled={actionLoading === 'reply'}
                        >
                          <MessageCircle size={12} style={{ marginRight: '4px', display: 'inline' }} />
                          {actionLoading === 'reply' ? 'Simulating…' : '💬 Simulate Reply'}
                        </button>

                        <button
                          className="btn"
                          style={{ fontSize: '0.75rem', padding: '5px 12px', background: '#4f46e5', color: '#fff', fontWeight: 600 }}
                          onClick={() => {
                            if (setActiveCampaignId) setActiveCampaignId(c.id);
                            if (setActiveLeadId) setActiveLeadId(selectedLeadData.lead_id);
                            if (setCurrentTab) setCurrentTab('live');
                          }}
                        >
                          <Rocket size={12} style={{ marginRight: '4px', display: 'inline' }} />
                          Open Live Execution Workspace →
                        </button>

                        <button
                          className="btn"
                          style={{ fontSize: '0.75rem', padding: '5px 12px', background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)', marginLeft: 'auto' }}
                          onClick={() => {
                            if (setActiveLeadId) setActiveLeadId(null);
                            if (setCurrentTab) setCurrentTab('leads');
                          }}
                        >
                          ↩ Select Another Lead from Pool
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pipeline Guide Card */}
          <div className="card" style={{ marginTop: '1.5rem', padding: '1.2rem 1.5rem', background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.2)' }}>
            <h4 style={{ color: '#818cf8', marginBottom: '0.75rem', fontSize: '0.9rem' }}>📋 Selected Lead Campaign Workflow</h4>
            <ol style={{ color: 'var(--text-muted)', fontSize: '0.8rem', lineHeight: '2.2', margin: 0, paddingLeft: '1.2rem' }}>
              <li>Select lead from <strong style={{ color: '#10b981' }}>Lead Pool</strong> → navigated directly to Campaigns page with selected lead context</li>
              <li>Click <strong style={{ color: '#818cf8' }}>✨ Generate AI Email</strong> → AI writes a personalized cold email for this prospect and opens <strong style={{ color: '#818cf8' }}>Deals & Pipeline</strong></li>
              <li>Click <strong>📤 Send Email</strong> → email sent (simulated) and deal moves to "Emailed" state</li>
              <li>Click <strong>💬 Simulate Reply</strong> → AI simulates a realistic reply and evaluates sentiment</li>
              <li>Click <strong style={{ color: '#818cf8' }}>Open Execution</strong> → monitor configurable sequence countdown timer and live AI next actions</li>
            </ol>
          </div>
        </>
      )}

      {/* ✏️ EDIT CAMPAIGN MODAL */}
      {editingCampaign && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, padding: '1rem'
        }}>
          <div style={{
            backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: '12px', width: '100%', maxWidth: '580px', padding: '1.5rem',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Edit3 size={18} style={{ color: 'var(--accent)' }} />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                  Edit Campaign #{editingCampaign.id}
                </h3>
              </div>
              <button
                onClick={() => setEditingCampaign(null)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: '4px' }}>
                  Campaign Name:
                </label>
                <input
                  type="text"
                  className="form-control"
                  required
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: '4px' }}>
                  Target Personas / Criteria:
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Finance Managers and Directors in UAE"
                  value={editFormData.campaign_target}
                  onChange={(e) => setEditFormData({ ...editFormData, campaign_target: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: '4px' }}>
                    Campaign Objective:
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Book Demo Meetings"
                    value={editFormData.objective}
                    onChange={(e) => setEditFormData({ ...editFormData, objective: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: '4px' }}>
                    Target Country Code:
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. UAE, US, IN"
                    value={editFormData.country_code}
                    onChange={(e) => setEditFormData({ ...editFormData, country_code: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: '4px' }}>
                  Description & Context:
                </label>
                <textarea
                  className="form-control"
                  rows={3}
                  placeholder="Provide additional details or persona specifics..."
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', marginTop: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setEditingCampaign(null)}
                  style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn"
                  disabled={savingEdit}
                  style={{ backgroundColor: '#4f46e5', color: '#fff', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <Save size={14} />
                  {savingEdit ? 'Saving...' : 'Save & Re-sync Lead Pool'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sequence Builder Modal */}
      {sequenceModalCampaign && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1.5rem'
        }}>
          <div style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '900px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '2rem',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.1)',
            position: 'relative'
          }}>
            <button
              onClick={() => setSequenceModalCampaign(null)}
              style={{
                position: 'absolute',
                top: '1.25rem',
                right: '1.25rem',
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '6px'
              }}
            >
              <X size={20} />
            </button>

            <CampaignSequenceBuilder
              campaignId={sequenceModalCampaign.id}
              campaignName={sequenceModalCampaign.name}
              onSaved={() => load()}
              onClose={() => setSequenceModalCampaign(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
