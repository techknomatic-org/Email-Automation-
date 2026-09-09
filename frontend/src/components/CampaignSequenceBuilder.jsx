import React, { useState, useEffect } from 'react';
import {
  getCampaignSequence,
  saveCampaignSequence,
  resetCampaignSequenceDefault,
  addCampaignSequenceStep,
  deleteCampaignSequenceStep
} from '../services/api';
import {
  Timer,
  Clock,
  Play,
  CheckCircle2,
  XCircle,
  Plus,
  Trash2,
  ArrowDown,
  ArrowUp,
  RotateCcw,
  Save,
  Sparkles,
  Zap,
  Mail,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Sliders,
  Check,
  AlertCircle,
  Layers
} from 'lucide-react';

const ACTION_OPTIONS_REPLIED = [
  { value: 'sales_handoff', label: 'Assign to Sales Executive (Sales Handoff 🎉)' },
  { value: 'schedule_demo', label: 'Schedule Product Demo Call 📅' },
  { value: 'ai_reply', label: 'Generate Contextual AI Response 🤖' },
  { value: 'mark_completed', label: 'Mark Campaign Completed ✔' },
  { value: 'stop_sequence', label: 'Stop Sequence 🛑' }
];

const ACTION_OPTIONS_NO_REPLY = [
  { value: 'send_followup', label: 'Generate Follow-up Email & Send ✉' },
  { value: 'mark_completed', label: 'Mark Sequence Completed (Conclude) ✔' },
  { value: 'stop_sequence', label: 'Stop Outreach Sequence 🛑' }
];

const TIME_UNITS = [
  { value: 'sec', label: 'Seconds' },
  { value: 'min', label: 'Minutes' },
  { value: 'hr', label: 'Hours' },
  { value: 'day', label: 'Days' }
];

export default function CampaignSequenceBuilder({ campaignId, campaignName, onSaved, onClose }) {
  const [sequence, setSequence] = useState(null);
  const [steps, setSteps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');
  const [expandedCustomPrompt, setExpandedCustomPrompt] = useState({});

  const showNotification = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 4000);
  };

  const loadSequence = async () => {
    if (!campaignId) return;
    setLoading(true);
    setError('');
    try {
      const data = await getCampaignSequence(campaignId);
      setSequence(data);
      setSteps(data.steps || []);
    } catch (err) {
      console.error('Error loading sequence:', err);
      setError(err.response?.data?.detail || 'Failed to load campaign sequence.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSequence();
  }, [campaignId]);

  const handleStepChange = (index, field, value) => {
    const updated = [...steps];
    updated[index] = { ...updated[index], [field]: value };
    // Auto recalculate normalized seconds
    if (field === 'delay_value' || field === 'delay_unit') {
      const val = parseInt(field === 'delay_value' ? value : updated[index].delay_value) || 1;
      const unit = field === 'delay_unit' ? value : updated[index].delay_unit;
      let multiplier = 60;
      if (unit === 'sec') multiplier = 1;
      else if (unit === 'min') multiplier = 60;
      else if (unit === 'hr') multiplier = 3600;
      else if (unit === 'day') multiplier = 86400;
      updated[index].delay_seconds = val * multiplier;
    }
    setSteps(updated);
  };

  const handleAddStep = () => {
    const nextStepNum = steps.length + 1;
    const defaultDelays = [10, 30, 2, 1];
    const defaultUnits = ['min', 'min', 'hr', 'day'];
    const idx = Math.min(nextStepNum - 2, defaultDelays.length - 1);
    const delayVal = defaultDelays[idx >= 0 ? idx : 0];
    const delayUnit = defaultUnits[idx >= 0 ? idx : 0];

    let multiplier = 60;
    if (delayUnit === 'sec') multiplier = 1;
    else if (delayUnit === 'min') multiplier = 60;
    else if (delayUnit === 'hr') multiplier = 3600;
    else if (delayUnit === 'day') multiplier = 86400;

    const newStep = {
      step_number: nextStepNum,
      step_name: `Follow-up #${nextStepNum - 1}`,
      action_type: 'send_followup',
      delay_value: delayVal,
      delay_unit: delayUnit,
      delay_seconds: delayVal * multiplier,
      condition_type: 'did_receiver_reply',
      if_replied_action: 'sales_handoff',
      if_no_reply_action: nextStepNum >= 4 ? 'mark_completed' : 'send_followup',
      custom_instructions: '',
      is_enabled: true
    };
    setSteps([...steps, newStep]);
    showNotification(`Added Step #${nextStepNum}`);
  };

  const handleRemoveStep = (index) => {
    if (steps.length <= 2) {
      alert('A campaign sequence must have at least an initial step and one follow-up step.');
      return;
    }
    const filtered = steps.filter((_, i) => i !== index);
    const renumbered = filtered.map((st, i) => ({
      ...st,
      step_number: i + 1,
      step_name: i === 0 ? 'Send Initial Email' : `Follow-up #${i}`
    }));
    setSteps(renumbered);
  };

  const handleMoveUp = (index) => {
    if (index <= 1) return; // Cannot move above step 1
    const copy = [...steps];
    const temp = copy[index];
    copy[index] = copy[index - 1];
    copy[index - 1] = temp;
    const renumbered = copy.map((st, i) => ({
      ...st,
      step_number: i + 1,
      step_name: i === 0 ? 'Send Initial Email' : `Follow-up #${i}`
    }));
    setSteps(renumbered);
  };

  const handleMoveDown = (index) => {
    if (index === 0 || index >= steps.length - 1) return;
    const copy = [...steps];
    const temp = copy[index];
    copy[index] = copy[index + 1];
    copy[index + 1] = temp;
    const renumbered = copy.map((st, i) => ({
      ...st,
      step_number: i + 1,
      step_name: i === 0 ? 'Send Initial Email' : `Follow-up #${i}`
    }));
    setSteps(renumbered);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const payload = {
        name: sequence?.name || `Sequence for Campaign #${campaignId}`,
        is_active: true,
        steps: steps.map((s, idx) => ({
          ...s,
          step_number: idx + 1
        }))
      };
      const result = await saveCampaignSequence(campaignId, payload);
      setSequence(result);
      setSteps(result.steps || []);
      showNotification('Campaign automation sequence saved successfully!');
      if (onSaved) onSaved(result);
    } catch (err) {
      console.error('Error saving sequence:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to save sequence.');
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefault = async () => {
    if (!window.confirm('Reset this campaign to the recommended default 4-step sequence?')) return;
    setLoading(true);
    try {
      const result = await resetCampaignSequenceDefault(campaignId);
      setSequence(result);
      setSteps(result.steps || []);
      showNotification('Reset to recommended default sequence!');
      if (onSaved) onSaved(result);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to reset sequence.');
    } finally {
      setLoading(false);
    }
  };

  const formatDelayLabel = (val, unit) => {
    const v = val || 1;
    const u = unit || 'min';
    if (u === 'sec') return `${v} Second${v !== 1 ? 's' : ''}`;
    if (u === 'min') return `${v} Minute${v !== 1 ? 's' : ''}`;
    if (u === 'hr') return `${v} Hour${v !== 1 ? 's' : ''}`;
    if (u === 'day') return `${v} Day${v !== 1 ? 's' : ''}`;
    return `${v} ${u}`;
  };

  if (loading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
        <div style={{ display: 'inline-block', animation: 'spin 1s linear infinite', marginBottom: '1rem' }}>
          <Clock size={32} className="text-indigo-400" />
        </div>
        <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>Loading Campaign Automation Sequence...</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header Banner */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '1.25rem 1.5rem',
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Zap size={20} color="var(--accent)" />
              Campaign Automation & Timer Sequence Builder
            </h3>
            <span style={{
              fontSize: '0.72rem',
              padding: '2px 8px',
              borderRadius: '999px',
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              color: '#059669',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              fontWeight: 700
            }}>
              Campaign Isolated
            </span>
          </div>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Configure the persistent backend timer workflow for <strong style={{ color: 'var(--text-main)' }}>{campaignName || `Campaign #${campaignId}`}</strong>. Timers run server-side even when closed.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <button
            type="button"
            onClick={handleResetDefault}
            disabled={saving}
            className="btn btn-secondary"
            style={{ fontSize: '0.78rem', padding: '0.45rem 0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            title="Reset to recommended sequence"
          >
            <RotateCcw size={14} /> Reset Defaults
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="btn btn-primary"
            style={{ fontSize: '0.82rem', padding: '0.45rem 1.1rem', display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 700 }}
          >
            {saving ? <Clock size={15} className="animate-spin" /> : <Save size={15} />}
            {saving ? 'Saving...' : 'Save Sequence'}
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              style={{ fontSize: '0.8rem', padding: '0.45rem 0.75rem' }}
            >
              Close
            </button>
          )}
        </div>
      </div>

      {toast && (
        <div style={{
          padding: '0.75rem 1rem',
          backgroundColor: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid rgba(16, 185, 129, 0.35)',
          borderRadius: '8px',
          color: '#059669',
          fontSize: '0.85rem',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <CheckCircle2 size={16} /> {toast}
        </div>
      )}

      {error && (
        <div style={{
          padding: '0.75rem 1rem',
          backgroundColor: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.35)',
          borderRadius: '8px',
          color: '#ef4444',
          fontSize: '0.85rem',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Sequence Steps Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {steps.map((st, index) => {
          const isInitial = index === 0;
          const isEnabled = st.is_enabled !== false;

          return (
            <React.Fragment key={st.id || `step-${index}`}>
              {/* Connector Flow Arrow */}
              {index > 0 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '-0.35rem 0' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '3px 12px',
                    borderRadius: '999px',
                    backgroundColor: 'var(--accent-light)',
                    border: '1px solid var(--border)',
                    color: 'var(--accent)',
                    fontSize: '0.72rem',
                    fontWeight: 700
                  }}>
                    <ArrowDown size={13} />
                    <span>Wait {formatDelayLabel(st.delay_value, st.delay_unit)}</span>
                  </div>
                </div>
              )}

              {/* Step Card Container */}
              <div style={{
                backgroundColor: isInitial ? 'var(--bg-card)' : (isEnabled ? 'var(--bg-card)' : 'var(--bg-inner)'),
                border: isInitial ? '1px solid var(--accent)' : (isEnabled ? '1px solid var(--border)' : '1px dashed var(--border)'),
                borderRadius: '12px',
                padding: '1.25rem',
                boxShadow: isEnabled ? 'var(--shadow-sm)' : 'none',
                opacity: isEnabled ? 1 : 0.65,
                transition: 'all 0.2s ease'
              }}>
                {/* Step Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.65rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      backgroundColor: isInitial ? 'var(--accent)' : '#2563eb',
                      color: '#ffffff',
                      fontWeight: 800,
                      fontSize: '0.8rem'
                    }}>
                      {st.step_number || index + 1}
                    </span>
                    <input
                      type="text"
                      value={st.step_name}
                      onChange={(e) => handleStepChange(index, 'step_name', e.target.value)}
                      disabled={isInitial}
                      style={{
                        backgroundColor: 'transparent',
                        border: 'none',
                        borderBottom: isInitial ? 'none' : '1px dashed var(--border)',
                        color: 'var(--text-main)',
                        fontWeight: 700,
                        fontSize: '0.95rem',
                        padding: '2px 4px',
                        outline: 'none',
                        minWidth: '180px'
                      }}
                    />
                    {isInitial ? (
                      <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', backgroundColor: 'var(--accent-light)', color: 'var(--accent)', fontWeight: 700 }}>
                        Trigger / Outreach Start
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#2563eb', fontWeight: 700 }}>
                        Automated Step
                      </span>
                    )}
                  </div>

                  {/* Right Action Tools */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    {!isInitial && (
                      <>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--text-muted)', cursor: 'pointer', marginRight: '0.5rem' }}>
                          <input
                            type="checkbox"
                            checked={isEnabled}
                            onChange={(e) => handleStepChange(index, 'is_enabled', e.target.checked)}
                          />
                          Enabled
                        </label>
                        <button
                          type="button"
                          onClick={() => handleMoveUp(index)}
                          disabled={index <= 1}
                          className="btn btn-secondary"
                          style={{ padding: '3px 6px', fontSize: '0.7rem' }}
                          title="Move step up"
                        >
                          <ArrowUp size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveDown(index)}
                          disabled={index >= steps.length - 1}
                          className="btn btn-secondary"
                          style={{ padding: '3px 6px', fontSize: '0.7rem' }}
                          title="Move step down"
                        >
                          <ArrowDown size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveStep(index)}
                          className="btn btn-secondary"
                          style={{ padding: '3px 6px', fontSize: '0.7rem', color: '#ef4444' }}
                          title="Remove step"
                        >
                          <Trash2 size={13} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Step Body Content */}
                {isInitial ? (
                  /* Step 1: Initial Send Info */
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.5rem 0.25rem' }}>
                    <div style={{ padding: '0.6rem', borderRadius: '8px', backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}>
                      <Mail size={22} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)' }}>
                        ACTION: Send Initial Personalized Outreach Email
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                        When outreach begins for a qualified prospect, Step 1 immediately personalizes and dispatches the opening cold email, then starts the Step 2 timer sequence.
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Step 2..N: Wait Timer + Condition + Branching Decisions */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                    {/* Timer Duration Config Row */}
                    <div style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.75rem 1rem',
                      backgroundColor: 'var(--bg-inner)',
                      borderRadius: '8px',
                      border: '1px solid var(--border)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#d97706', fontSize: '0.82rem', fontWeight: 700 }}>
                        <Timer size={16} /> WAIT DURATION:
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <input
                          type="number"
                          min="1"
                          max="9999"
                          value={st.delay_value || 10}
                          onChange={(e) => handleStepChange(index, 'delay_value', e.target.value)}
                          style={{
                            width: '75px',
                            padding: '0.35rem 0.5rem',
                            borderRadius: '6px',
                            border: '1px solid var(--border-input)',
                            backgroundColor: 'var(--bg-input)',
                            color: 'var(--text-main)',
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            textAlign: 'center'
                          }}
                        />
                        <select
                          value={st.delay_unit || 'min'}
                          onChange={(e) => handleStepChange(index, 'delay_unit', e.target.value)}
                          style={{
                            padding: '0.35rem 0.6rem',
                            borderRadius: '6px',
                            border: '1px solid var(--border-input)',
                            backgroundColor: 'var(--bg-input)',
                            color: 'var(--text-main)',
                            fontSize: '0.82rem',
                            fontWeight: 600
                          }}
                        >
                          {TIME_UNITS.map((u) => (
                            <option key={u.value} value={u.value}>{u.label}</option>
                          ))}
                        </select>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                        ⏱ Normalized backend countdown: <strong style={{ color: 'var(--text-main)' }}>{st.delay_seconds || (st.delay_value * 60)}s</strong>
                      </div>
                    </div>

                    {/* Condition & Decision Branching Grid */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                      gap: '0.75rem'
                    }}>
                      {/* Branch IF YES: Replied */}
                      <div style={{
                        padding: '0.9rem',
                        backgroundColor: 'rgba(16, 185, 129, 0.08)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        borderRadius: '8px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#059669', fontSize: '0.8rem', fontWeight: 800 }}>
                          <CheckCircle2 size={15} /> IF YES (PROSPECT REPLIED):
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          → Active timer immediately stops
                          <br />
                          → Pending follow-up is cancelled
                        </div>
                        <div style={{ marginTop: '0.25rem' }}>
                          <label style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 700, display: 'block', marginBottom: '0.2rem' }}>
                            Execute Configured Next Action:
                          </label>
                          <select
                            value={st.if_replied_action || 'sales_handoff'}
                            onChange={(e) => handleStepChange(index, 'if_replied_action', e.target.value)}
                            style={{
                              width: '100%',
                              padding: '0.4rem 0.5rem',
                              borderRadius: '6px',
                              border: '1px solid var(--border-input)',
                              backgroundColor: 'var(--bg-input)',
                              color: 'var(--text-main)',
                              fontSize: '0.78rem',
                              fontWeight: 600
                            }}
                          >
                            {ACTION_OPTIONS_REPLIED.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Branch IF NO: No Reply (Timer Expired) */}
                      <div style={{
                        padding: '0.9rem',
                        backgroundColor: 'rgba(37, 99, 235, 0.08)',
                        border: '1px solid rgba(37, 99, 235, 0.3)',
                        borderRadius: '8px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#2563eb', fontSize: '0.8rem', fontWeight: 800 }}>
                          <XCircle size={15} /> IF NO (NO REPLY BEFORE EXPIRY):
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          → Final pre-send reply check executes
                          <br />
                          → AI generates contextual message
                        </div>
                        <div style={{ marginTop: '0.25rem' }}>
                          <label style={{ fontSize: '0.72rem', color: '#2563eb', fontWeight: 700, display: 'block', marginBottom: '0.2rem' }}>
                            Action After Timer Expiry:
                          </label>
                          <select
                            value={st.if_no_reply_action || 'send_followup'}
                            onChange={(e) => handleStepChange(index, 'if_no_reply_action', e.target.value)}
                            style={{
                              width: '100%',
                              padding: '0.4rem 0.5rem',
                              borderRadius: '6px',
                              border: '1px solid var(--border-input)',
                              backgroundColor: 'var(--bg-input)',
                              color: 'var(--text-main)',
                              fontSize: '0.78rem',
                              fontWeight: 600
                            }}
                          >
                            {ACTION_OPTIONS_NO_REPLY.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Step Custom AI Prompt Instructions (Collapsible) */}
                    <div>
                      <button
                        type="button"
                        onClick={() => setExpandedCustomPrompt(prev => ({ ...prev, [index]: !prev[index] }))}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--accent)',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0'
                        }}
                      >
                        <Sparkles size={13} />
                        {expandedCustomPrompt[index] ? 'Hide AI Follow-up Prompt Customization' : 'Customize AI Follow-up Prompt for this step'}
                        {expandedCustomPrompt[index] ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      </button>

                      {expandedCustomPrompt[index] && (
                        <div style={{ marginTop: '0.5rem', padding: '0.75rem', backgroundColor: 'var(--bg-inner)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                          <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>
                            Step-Specific AI Directives / Angle:
                          </label>
                          <textarea
                            value={st.custom_instructions || ''}
                            onChange={(e) => handleStepChange(index, 'custom_instructions', e.target.value)}
                            placeholder="e.g. Focus on case study metrics and propose a quick 5-min demo call next Tuesday."
                            rows={2}
                            style={{
                              width: '100%',
                              padding: '0.45rem 0.6rem',
                              borderRadius: '6px',
                              border: '1px solid var(--border-input)',
                              backgroundColor: 'var(--bg-input)',
                              color: 'var(--text-main)',
                              fontSize: '0.78rem',
                              resize: 'vertical'
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {/* Add Step Button */}
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '0.5rem' }}>
        <button
          type="button"
          onClick={handleAddStep}
          style={{
            padding: '0.65rem 1.25rem',
            fontSize: '0.85rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            border: '1px dashed var(--accent)',
            backgroundColor: 'var(--accent-light)',
            color: 'var(--accent)',
            borderRadius: '10px',
            cursor: 'pointer'
          }}
        >
          <Plus size={16} /> + Add Sequence Step (Timer & Follow-up)
        </button>
      </div>

      {/* Sequence Visual Flowchart Preview */}
      <div style={{
        marginTop: '1rem',
        padding: '1.25rem',
        backgroundColor: 'var(--bg-inner)',
        border: '1px solid var(--border)',
        borderRadius: '12px'
      }}>
        <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Layers size={14} /> Sequence Flow Diagram
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem' }}>
          <span style={{ padding: '4px 10px', borderRadius: '6px', backgroundColor: 'var(--accent-light)', color: 'var(--accent)', fontWeight: 700 }}>
            1. Send Initial Email
          </span>
          {steps.slice(1).map((st, i) => (
            <React.Fragment key={`diagram-${i}`}>
              <span style={{ color: 'var(--text-muted)' }}>→</span>
              <span style={{ padding: '4px 10px', borderRadius: '6px', backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#d97706', fontWeight: 700 }}>
                Wait {formatDelayLabel(st.delay_value, st.delay_unit)}
              </span>
              <span style={{ color: 'var(--text-muted)' }}>→</span>
              <span style={{ padding: '4px 10px', borderRadius: '6px', backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#2563eb', fontWeight: 700 }}>
                Check Reply → {st.if_no_reply_action === 'send_followup' ? `Send ${st.step_name}` : 'Conclude'}
              </span>
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
