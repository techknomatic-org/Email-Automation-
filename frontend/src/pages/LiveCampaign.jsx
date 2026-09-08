import React, { useState, useEffect } from 'react';
import {
  getCampaigns,
  getCampaignExecution,
  getDealExecution,
  getRunnerStatus,
  controlCampaign,
  updateCampaignSequenceTimer,
  seedTestRecipients,
  prepareEmail,
  sendCampaign,
  simulateEngagement,
  syncInbox,
  executeAction,
  getDeals,
  getSiteConfig
} from '../services/api';
import CampaignSequenceBuilder from '../components/CampaignSequenceBuilder';
import {
  Play,
  Pause,
  StopCircle,
  RefreshCw,
  Mail,
  Timer,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Sparkles,
  FileText,
  Eye,
  User,
  Activity,
  ArrowRight,
  ShieldAlert,
  Search,
  Filter,
  Clock,
  Building,
  Briefcase,
  ChevronRight,
  Bot,
  CheckSquare,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Cpu,
  Layers,
  Send,
  Calendar,
  Check,
  CheckCircle,
  Zap,
  ExternalLink,
  MessageSquare,
  Award,
  Sliders,
  X
} from 'lucide-react';

const STATE_CONFIGS = {
  'Lead Created': { label: 'Lead Created', color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.15)' },
  'Qualified': { label: 'Qualified', color: '#34d399', bg: 'rgba(52, 211, 153, 0.15)' },
  'Email Preparing': { label: 'Preparing Email...', color: '#818cf8', bg: 'rgba(129, 140, 248, 0.15)' },
  'Ready to Email': { label: 'Ready to Send', color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.15)' },
  'Email Sent': { label: 'Email Sent', color: '#60a5fa', bg: 'rgba(96, 165, 250, 0.15)' },
  'Delivered': { label: 'Delivered', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },
  'Waiting for Engagement': { label: 'Waiting Countdown', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
  'Opened': { label: 'Opened', color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.15)' },
  'Replied': { label: 'Replied', color: '#c084fc', bg: 'rgba(192, 132, 252, 0.15)' },
  'AI Analyzing Reply': { label: 'AI Analyzing Reply...', color: '#a78bfa', bg: 'rgba(167, 139, 250, 0.15)' },
  'Action Recommended': { label: 'Action Recommended', color: '#a78bfa', bg: 'rgba(167, 139, 250, 0.15)' },
  'Sales Handoff': { label: 'Sales Handoff 🎉', color: '#34d399', bg: 'rgba(52, 211, 153, 0.25)' },
  'Follow-up Scheduled': { label: 'Follow-up Scheduled', color: '#60a5fa', bg: 'rgba(96, 165, 250, 0.15)' },
  'Follow-up Sent': { label: 'Follow-up Sent', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.15)' },
  'Campaign Completed': { label: 'Completed ✔', color: '#34d399', bg: 'rgba(52, 211, 153, 0.2)' },
  'Unsubscribed': { label: 'Unsubscribed 🛑', color: '#f87171', bg: 'rgba(248, 113, 113, 0.15)' },
  'Campaign Stopped': { label: 'Stopped 🛑', color: '#f87171', bg: 'rgba(248, 113, 113, 0.15)' },
  'Bounced': { label: 'Bounced ⚠', color: '#f87171', bg: 'rgba(248, 113, 113, 0.15)' },
  'Failed': { label: 'Failed ⚠', color: '#f87171', bg: 'rgba(248, 113, 113, 0.15)' }
};

// 10-Minute Real-Time Backend Timer Component
function WaitingCountdownTimer({ targetIso, onExpire }) {
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (!targetIso) return;
    const calc = () => {
      const remaining = Math.max(0, Math.floor((new Date(targetIso).getTime() - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining === 0 && onExpire) onExpire();
    };
    calc();
    const timer = setInterval(calc, 1000);
    return () => clearInterval(timer);
  }, [targetIso, onExpire]);

  if (timeLeft === 0) {
    return (
      <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '4px', backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.4)', fontWeight: 700 }}>
        Evaluation Ready
      </span>
    );
  }

  const formatCountdown = (totalSecs) => {
    if (totalSecs >= 86400) {
      const d = Math.floor(totalSecs / 86400);
      const h = Math.floor((totalSecs % 86400) / 3600);
      const m = Math.floor((totalSecs % 3600) / 60);
      return `${d}d ${h.toString().padStart(2, '0')}h ${m.toString().padStart(2, '0')}m`;
    }
    if (totalSecs >= 3600) {
      const h = Math.floor(totalSecs / 3600);
      const m = Math.floor((totalSecs % 3600) / 60);
      const s = totalSecs % 60;
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '2px 8px', borderRadius: '6px', backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)', fontFamily: 'monospace', fontWeight: '700', fontSize: '0.73rem' }}>
      <Timer size={12} style={{ animation: 'spin 4s linear infinite' }} />
      <span>{formatCountdown(timeLeft)}</span>
    </div>
  );
}

const formatLocalTime = (dateInput) => {
  if (!dateInput) return 'Recently';
  let str = String(dateInput);
  if (!str.endsWith('Z') && !str.includes('+')) str += 'Z';
  const d = new Date(str);
  if (isNaN(d.getTime())) return 'Recently';
  return d.toLocaleString([], {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true
  });
};

// Toast Notification Toast
function ToastNotification({ toast, onClose }) {
  if (!toast) return null;
  const isError = toast.type === 'error';
  return (
    <div style={{
      position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999,
      backgroundColor: isError ? '#7f1d1d' : '#064e3b', color: '#fff',
      border: `1px solid ${isError ? '#ef4444' : '#10b981'}`, borderRadius: '8px',
      padding: '0.75rem 1.25rem', boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.85rem', fontWeight: 600
    }}>
      <span>{isError ? '⚠️' : '✅'}</span>
      <span>{toast.message}</span>
      <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', marginLeft: '0.5rem' }}>✕</button>
    </div>
  );
}

export default function LiveCampaign({ setCurrentTab, activeCampaignId, setActiveCampaignId, activeLeadId, setActiveLeadId }) {
  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  const [executionData, setExecutionData] = useState(null);
  const [deals, setDeals] = useState([]);
  const [selectedDealId, setSelectedDealId] = useState(null);
  const [dealDetail, setDealDetail] = useState(null);
  const [runnerStatus, setRunnerStatus] = useState(null);

  // Filters & State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPipelineFilter, setSelectedPipelineFilter] = useState('ALL');
  const [leadCategoryFilter, setLeadCategoryFilter] = useState('ALL');
  const [inspectorTab, setInspectorTab] = useState('overview'); // overview, thread, ai, timeline
  const [devControlsOpen, setDevControlsOpen] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [timerValue, setTimerValue] = useState(10);
  const [timerUnit, setTimerUnit] = useState('min');
  const [updatingTimer, setUpdatingTimer] = useState(false);
  const [toast, setToast] = useState(null);

  // Sequence Modal State
  const [showSequenceModal, setShowSequenceModal] = useState(false);

  // Editable Action Draft Modal state
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionDraft, setActionDraft] = useState({
    dealId: null,
    recipient: '',
    subject: '',
    body: '',
    meetingLink: ''
  });

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    const currentCamp = campaigns.find(c => c.id === parseInt(selectedCampaignId));
    if (currentCamp) {
      const u = currentCamp.sequence_interval_unit || 'min';
      setTimerUnit(u);
      if (currentCamp.sequence_interval_seconds) {
        if (u === 'sec') setTimerValue(currentCamp.sequence_interval_seconds);
        else if (u === 'hr') setTimerValue(Math.round((currentCamp.sequence_interval_seconds / 3600) * 10) / 10);
        else if (u === 'day') setTimerValue(Math.round((currentCamp.sequence_interval_seconds / 86400) * 10) / 10);
        else setTimerValue(Math.round(currentCamp.sequence_interval_seconds / 60));
      } else if (currentCamp.sequence_interval_minutes) {
        setTimerValue(currentCamp.sequence_interval_minutes);
      }
    }
  }, [selectedCampaignId, campaigns]);

  const handleSaveSequenceTimer = async (valOverride, unitOverride) => {
    const val = parseFloat(valOverride !== undefined ? valOverride : timerValue);
    const unit = unitOverride || timerUnit;
    if (!selectedCampaignId || isNaN(val) || val <= 0) {
      showToast('Please enter a valid timer duration', 'error');
      return;
    }
    setUpdatingTimer(true);
    try {
      const res = await updateCampaignSequenceTimer(selectedCampaignId, val, unit);
      setTimerValue(val);
      setTimerUnit(unit);
      setCampaigns(prev => prev.map(c => c.id === parseInt(selectedCampaignId) ? { ...c, sequence_interval_seconds: res.sequence_interval_seconds, sequence_interval_unit: unit } : c));
      await loadExecutionData(selectedCampaignId);
      if (selectedDealId) await loadDealDetail(selectedDealId);
      showToast(`✓ Sequence Timer updated to ${val} ${unit}!`);
    } catch (err) {
      showToast("Error updating sequence timer: " + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setUpdatingTimer(false);
    }
  };

  // Load Campaigns
  useEffect(() => {
    getCampaigns().then(res => {
      setCampaigns(res || []);
      if (activeCampaignId) {
        setSelectedCampaignId(activeCampaignId.toString());
      } else if (res && res.length > 0) {
        setSelectedCampaignId(res[0].id.toString());
      }
    });
  }, [activeCampaignId]);

  useEffect(() => {
    if (activeCampaignId) {
      setSelectedCampaignId(activeCampaignId.toString());
    }
  }, [activeCampaignId]);

  // Load Execution Data & Deals
  const loadExecutionData = async (cId) => {
    if (!cId) return;
    try {
      const [execRes, dealsRes, runnerRes] = await Promise.all([
        getCampaignExecution(cId).catch(() => null),
        getDeals().catch(() => []),
        getRunnerStatus().catch(() => null)
      ]);

      if (execRes) setExecutionData(execRes);
      if (runnerRes) setRunnerStatus(runnerRes);
      if (dealsRes) {
        const filtered = dealsRes.filter(d => d.campaign_id === parseInt(cId));
        setDeals(filtered);

        if (activeLeadId && filtered.length > 0) {
          const matchingDeal = filtered.find(d => d.lead_id === parseInt(activeLeadId) || d.lead?.id === parseInt(activeLeadId));
          if (matchingDeal) {
            setSelectedDealId(matchingDeal.id);
          } else if (filtered.length > 0) {
            setSelectedDealId(filtered[0].id);
          }
        } else if (filtered.length > 0 && !selectedDealId) {
          setSelectedDealId(filtered[0].id);
        }
      }
    } catch (err) {
      console.error("Error loading execution data:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadDealDetail = async (dId) => {
    if (!dId) return;
    try {
      const detail = await getDealExecution(dId);
      setDealDetail(detail);
    } catch (err) {
      console.error(`Error loading deal execution for ${dId}:`, err);
    }
  };

  useEffect(() => {
    if (selectedCampaignId) {
      loadExecutionData(selectedCampaignId);
    }
  }, [selectedCampaignId, activeLeadId]);

  useEffect(() => {
    if (selectedDealId) {
      loadDealDetail(selectedDealId);
    }
  }, [selectedDealId]);

  // Auto Refresh Polling (5 Seconds)
  useEffect(() => {
    if (!autoRefresh || !selectedCampaignId) return;
    const interval = setInterval(() => {
      loadExecutionData(selectedCampaignId);
      if (selectedDealId) {
        loadDealDetail(selectedDealId);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, selectedCampaignId, selectedDealId]);

  // Action Handlers
  const handleControl = async (action) => {
    if (!selectedCampaignId) return;
    setActionLoading(true);
    try {
      await controlCampaign(selectedCampaignId, action);
      await loadExecutionData(selectedCampaignId);
      showToast(`Campaign ${action}ed successfully!`);
    } catch (err) {
      showToast(`Unable to ${action} campaign: ` + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const [syncingInbox, setSyncingInbox] = useState(false);

  const handleSyncInbox = async (dealId) => {
    if (!dealId) return;
    setSyncingInbox(true);
    try {
      const data = await syncInbox(dealId);
      if (data.status === 'success') {
        const sender = data.latest_reply?.from || data.latest_reply?.sender || 'prospect';
        showToast(`🎉 Real Prospect Email Reply Synced from ${sender}!`);
      } else if (data.status === 'imap_connection_error') {
        showToast(data.message || 'IMAP Connection Error: Failed to connect to email provider inbox.', 'error');
      } else {
        showToast(data.message || 'No new replies found yet.');
      }
      await loadDealDetail(dealId);
      if (selectedCampaignId) await loadExecutionData(selectedCampaignId);
    } catch (err) {
      const errMsg = err.response?.data?.detail || err.message || 'IMAP sync failed';
      showToast('IMAP Sync Notice: ' + errMsg, 'error');
    } finally {
      setSyncingInbox(false);
    }
  };

  const [meetingLink, setMeetingLink] = useState('https://meet.google.com/your-meeting-id');

  useEffect(() => {
    getSiteConfig().then(cfg => {
      if (cfg && cfg.meeting_link) setMeetingLink(cfg.meeting_link);
    }).catch(() => { });
  }, []);

  const handleExecuteAction = async (dealId, customLink) => {
    if (!dealId) return;
    if (dealDetail && (dealDetail.deal_id === dealId || dealDetail.id === dealId)) {
      handleOpenActionModal(dealDetail);
      return;
    }
    try {
      const dDetail = await getDealExecution(dealId);
      if (dDetail) handleOpenActionModal(dDetail);
    } catch (err) {
      showToast("Error loading deal for action: " + err.message, "error");
    }
  };

  const handleOpenActionModal = (dDetail) => {
    if (!dDetail) return;
    const lName = (dDetail.lead?.source_fields?.name) || dDetail.lead?.first_name || 'there';
    const comp = (dDetail.lead?.source_fields?.company) || dDetail.lead?.company_name || 'your organization';
    const rawSubj = dDetail.email_subject || 'Outreach Follow-up';
    const cleanSubj = rawSubj.toLowerCase().startsWith('re:') ? rawSubj : `Re: ${rawSubj}`;

    const aiClass = (dDetail.ai_decision?.classification || '').toUpperCase();
    const isMeeting = aiClass.includes('INTERESTED') || aiClass.includes('MEETING') || dDetail.deal_state === 'Sales Handoff';

    let defaultBody = "";
    if (isMeeting) {
      defaultBody = `Hi ${lName},\n\nThank you for getting back to us! I would be delighted to connect and walk you through a brief 10-minute demo tailored for ${comp}.\n\nYou can choose a time that works best for your schedule directly using this link:\n${meetingLink}\n\nLooking forward to speaking with you!\n\nBest regards,\nOpenOutreach Team`;
    } else {
      let actionTxt = dDetail.reason || '';
      if (actionTxt.includes('Next Action Plan:')) {
        actionTxt = actionTxt.split('Next Action Plan:')[1].trim();
      } else if (actionTxt.includes('AI Next Action:')) {
        actionTxt = actionTxt.split('AI Next Action:')[1].trim();
      } else if (actionTxt.startsWith('Why')) {
        actionTxt = '';
      }

      if (actionTxt) {
        defaultBody = `Hi ${lName},\n\nThank you for your response regarding ${comp}.\n\n${actionTxt}\n\nWould you have 5-10 minutes this week to connect?\nYou can schedule a quick chat directly using this link:\n${meetingLink}\n\nBest regards,\nOpenOutreach Team`;
      } else {
        defaultBody = `Hi ${lName},\n\nThank you for your response. Following up regarding our solutions for ${comp}, are you available for a brief 10-minute demo call this week?\n\nYou can pick a time directly using this link:\n${meetingLink}\n\nBest regards,\nOpenOutreach Team`;
      }
    }

    setActionDraft({
      dealId: dDetail.deal_id,
      recipient: dDetail.lead?.email || '',
      subject: cleanSubj,
      body: defaultBody,
      meetingLink: meetingLink
    });
    setShowActionModal(true);
  };

  const handleExecuteActionSubmit = async () => {
    if (!actionDraft.dealId) return;
    setActionLoading(true);
    try {
      const data = await executeAction(actionDraft.dealId, {
        meeting_link: actionDraft.meetingLink,
        subject: actionDraft.subject,
        body: actionDraft.body
      });
      showToast(`🎉 Email Dispatched to ${data.recipient || actionDraft.recipient}!`);
      setShowActionModal(false);
      if (selectedDealId) await loadDealDetail(selectedDealId);
      if (selectedCampaignId) await loadExecutionData(selectedCampaignId);
    } catch (err) {
      showToast('Execute Action Error: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSimulate = async (dealId, action) => {
    if (!dealId) return;
    setActionLoading(true);
    try {
      await simulateEngagement(dealId, action);
      await loadExecutionData(selectedCampaignId);
      await loadDealDetail(dealId);
      showToast(`Simulated engagement action: ${action}`);
    } catch (err) {
      showToast("Simulation error: " + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSeedRecipients = async () => {
    if (!selectedCampaignId) return;
    setActionLoading(true);
    try {
      const res = await seedTestRecipients(selectedCampaignId);
      showToast(`Seeded ${res.count} prospects into campaign!`);
      await loadExecutionData(selectedCampaignId);
    } catch (err) {
      showToast("Seed error: " + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePrepareEmails = async () => {
    if (!selectedCampaignId) return;
    setActionLoading(true);
    try {
      const res = await prepareEmail(selectedCampaignId);
      showToast(`Prepared AI cold emails for ${res.prepared_count} prospects!`);
      await loadExecutionData(selectedCampaignId);
    } catch (err) {
      showToast("Prepare error: " + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendCampaign = async () => {
    if (!selectedCampaignId) return;
    setActionLoading(true);
    try {
      const res = await sendCampaign(selectedCampaignId);
      showToast(`Dispatched emails to ${res.sent_count} prospects!`);
      await loadExecutionData(selectedCampaignId);
    } catch (err) {
      showToast("Send error: " + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Pre-send states that belong in Deals & Pipeline — NOT shown here
  const PRE_SEND_STATES = ['Lead Created', 'Qualified', 'Email Preparing', 'Ready to Email'];

  // Only show post-send execution deals on this page
  const executionDeals = deals.filter(d => !PRE_SEND_STATES.includes(d.state));

  // Filter Deals Logic
  let filteredDeals = executionDeals.filter(d => {
    if (activeLeadId) {
      const matchesActiveLead = d.lead_id === parseInt(activeLeadId) || d.lead?.id === parseInt(activeLeadId);
      if (!matchesActiveLead) return false;
    }

    // Horizontal Pipeline Stage Filter
    if (selectedPipelineFilter !== 'ALL') {
      if (selectedPipelineFilter === 'Contacted' && d.state !== 'Email Sent' && d.state !== 'Delivered' && d.state !== 'Waiting for Engagement') return false;
      if (selectedPipelineFilter === 'Opened' && d.state !== 'Opened') return false;
      if (selectedPipelineFilter === 'Replied' && d.state !== 'Replied' && d.state !== 'AI Analyzing Reply' && d.state !== 'Action Recommended') return false;
      if (selectedPipelineFilter === 'Meeting' && d.state !== 'Sales Handoff' && d.state !== 'Follow-up Scheduled' && d.state !== 'Follow-up Sent') return false;
      if (selectedPipelineFilter === 'Converted' && d.state !== 'Campaign Completed' && d.state !== 'Converted') return false;
      if (selectedPipelineFilter === 'Stopped' && d.state !== 'Unsubscribed' && d.state !== 'Bounced' && d.state !== 'Failed' && d.state !== 'Campaign Stopped') return false;
    }

    // Lead Category Filter
    if (leadCategoryFilter !== 'ALL') {
      if (leadCategoryFilter === 'Waiting' && d.state !== 'Waiting for Engagement' && d.state !== 'Email Sent' && d.state !== 'Delivered') return false;
      if (leadCategoryFilter === 'Needs Action' && d.state !== 'Action Recommended' && d.state !== 'Replied' && d.state !== 'AI Analyzing Reply') return false;
      if (leadCategoryFilter === 'Replied' && d.state !== 'Replied' && d.state !== 'AI Analyzing Reply') return false;
      if (leadCategoryFilter === 'Meeting' && d.state !== 'Sales Handoff' && d.state !== 'Follow-up Scheduled' && d.state !== 'Follow-up Sent') return false;
      if (leadCategoryFilter === 'Converted' && d.state !== 'Campaign Completed' && d.state !== 'Converted') return false;
      if (leadCategoryFilter === 'Stopped' && d.state !== 'Unsubscribed' && d.state !== 'Bounced' && d.state !== 'Failed' && d.state !== 'Campaign Stopped') return false;
    }

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const leadName = (d.lead?.source_fields?.name || d.lead?.email || '').toLowerCase();
    const leadEmail = (d.lead?.email || '').toLowerCase();
    const company = (d.lead?.source_fields?.company || d.lead?.company_name || '').toLowerCase();
    const title = (d.lead?.source_fields?.title || d.lead?.job_title || '').toLowerCase();
    return leadName.includes(q) || leadEmail.includes(q) || company.includes(q) || title.includes(q);
  });

  const selectedCampaign = campaigns.find(c => c.id === parseInt(selectedCampaignId));
  const currentStatus = (executionData?.campaign?.status || executionData?.campaign_status || 'running').toLowerCase();
  const isRunning = currentStatus === 'running';
  const isPaused = currentStatus === 'paused';
  const isStopped = currentStatus === 'stopped';

  // KPI Bar Calculations — execution-relevant metrics only
  const kpiData = {
    inExecution: executionDeals.length,
    contacted: executionDeals.filter(d => d.state === 'Email Sent' || d.state === 'Delivered' || d.state === 'Waiting for Engagement').length,
    opened: executionDeals.filter(d => d.state === 'Opened').length,
    replied: executionDeals.filter(d => d.state === 'Replied' || d.state === 'AI Analyzing Reply' || d.state === 'Action Recommended').length,
    meetings: executionDeals.filter(d => d.state === 'Sales Handoff' || d.state === 'Follow-up Scheduled' || d.state === 'Follow-up Sent').length,
    converted: executionDeals.filter(d => d.state === 'Campaign Completed' || d.state === 'Converted').length,
    stopped: executionDeals.filter(d => d.state === 'Unsubscribed' || d.state === 'Bounced' || d.state === 'Failed' || d.state === 'Campaign Stopped').length,
  };

  // Active Deal Data for Right Panel
  const activeDealObj = deals.find(d => d.id === selectedDealId);
  const activeLead = activeDealObj?.lead || {};
  const leadName = activeLead.source_fields?.name || activeLead.name || [activeLead.first_name, activeLead.last_name].filter(Boolean).join(' ') || (activeLead.email ? activeLead.email.split('@')[0] : `Lead #${activeDealObj?.lead_id}`);
  const company = activeLead.source_fields?.company || activeLead.company_name || 'Enterprise Client';
  const jobTitle = activeLead.source_fields?.title || activeLead.job_title || 'Executive Lead';
  const fitScore = activeLead.gp_confidence ? Math.round(activeLead.gp_confidence * 100) : (activeDealObj?.predictive_score || 85);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', minHeight: 'calc(100vh - 100px)' }}>
      <ToastNotification toast={toast} onClose={() => setToast(null)} />

      {/* ── 1. COMPACT CAMPAIGN HEADER & RUN CONTROLS ───────────────────────────── */}
      <div style={{
        backgroundColor: 'rgba(15, 23, 42, 0.75)', borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.08)', padding: '0.85rem 1.25rem',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem'
      }}>
        {/* Title & Campaign Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#f8fafc' }}>
                {selectedCampaign?.name || 'Campaign Execution Workspace'}
              </h1>
              <span style={{
                fontSize: '0.68rem', fontWeight: 800, padding: '2px 8px', borderRadius: '4px',
                backgroundColor: isRunning ? 'rgba(16, 185, 129, 0.2)' : isPaused ? 'rgba(245, 158, 11, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                color: isRunning ? '#34d399' : isPaused ? '#fbbf24' : '#f87171',
                border: `1px solid ${isRunning ? 'rgba(16, 185, 129, 0.4)' : isPaused ? 'rgba(245, 158, 11, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`
              }}>
                ● {currentStatus.toUpperCase()}
              </span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Real-time campaign execution pipeline &amp; AI Next-Best Action orchestrator
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Switch Campaign:</label>
            <select
              value={selectedCampaignId}
              onChange={e => {
                const newCampaignId = e.target.value;
                setSelectedCampaignId(newCampaignId);
                if (setActiveCampaignId) setActiveCampaignId(Number(newCampaignId));
                if (setActiveLeadId) setActiveLeadId(null);
              }}
              style={{
                width: '210px', padding: '0.35rem 0.6rem', fontSize: '0.8rem',
                backgroundColor: 'rgba(0,0,0,0.4)', color: '#fff', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px'
              }}
            >
              {campaigns.map(c => (
                <option key={c.id} value={c.id.toString()}>{c.name} (#{c.id})</option>
              ))}
            </select>
          </div>
        </div>

        {/* Cadence Timer & Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Sequence Timer Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', backgroundColor: 'rgba(99, 102, 241, 0.12)', padding: '0.3rem 0.65rem', borderRadius: '8px', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
            <Timer size={13} style={{ color: '#818cf8' }} />
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#c7d2fe' }}>Timer:</span>
            <input
              type="number"
              step="any"
              min="0.1"
              value={timerValue}
              onChange={e => setTimerValue(e.target.value)}
              style={{
                width: '50px', padding: '2px 4px', fontSize: '0.75rem', fontWeight: 700, color: '#fbbf24',
                backgroundColor: 'rgba(0,0,0,0.5)', border: '1px solid rgba(245, 158, 11, 0.5)', borderRadius: '4px', textAlign: 'center'
              }}
            />
            <select
              value={timerUnit}
              onChange={e => setTimerUnit(e.target.value)}
              style={{
                padding: '2px 4px', fontSize: '0.72rem', fontWeight: 600, color: '#e0e7ff',
                backgroundColor: 'rgba(0,0,0,0.5)', border: '1px solid rgba(99, 102, 241, 0.4)', borderRadius: '4px', cursor: 'pointer'
              }}
            >
              <option value="sec">sec</option>
              <option value="min">min</option>
              <option value="hr">hr</option>
              <option value="day">day</option>
            </select>
            <button
              onClick={() => handleSaveSequenceTimer()}
              disabled={updatingTimer}
              style={{
                fontSize: '0.68rem', padding: '2px 7px', backgroundColor: '#6366f1', color: '#fff',
                fontWeight: 700, border: 'none', borderRadius: '4px', cursor: 'pointer'
              }}
            >
              {updatingTimer ? 'Saving...' : 'Set'}
            </button>
          </div>

          {/* Pause / Resume Controls */}
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button
              onClick={() => setShowSequenceModal(true)}
              style={{
                fontSize: '0.75rem', padding: '0.35rem 0.85rem',
                backgroundColor: 'rgba(99, 102, 241, 0.2)',
                color: '#c7d2fe',
                border: '1px solid rgba(99, 102, 241, 0.4)',
                borderRadius: '6px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
              }}
              title="Open Campaign Automation Sequence Builder"
            >
              <Zap size={13} className="text-amber-400" />
              Automation Sequence
            </button>

            <button
              onClick={() => handleControl(isRunning ? 'pause' : 'resume')}
              disabled={actionLoading}
              style={{
                fontSize: '0.75rem', padding: '0.35rem 0.85rem',
                backgroundColor: isRunning ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                color: isRunning ? '#fbbf24' : '#34d399',
                border: `1px solid ${isRunning ? 'rgba(245, 158, 11, 0.35)' : 'rgba(16, 185, 129, 0.35)'}`,
                borderRadius: '6px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
              }}
            >
              {isRunning ? <Pause size={13} /> : <Play size={13} />}
              {isRunning ? 'Pause Execution' : 'Resume Execution'}
            </button>

            <button
              onClick={() => { if (window.confirm('Are you sure you want to stop campaign execution?')) handleControl('stop'); }}
              disabled={actionLoading || isStopped}
              style={{
                fontSize: '0.75rem', padding: '0.35rem 0.75rem', backgroundColor: 'rgba(239, 68, 68, 0.15)',
                color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '6px', fontWeight: 700, cursor: 'pointer'
              }}
            >
              <StopCircle size={13} /> Stop
            </button>

            <button
              onClick={() => loadExecutionData(selectedCampaignId)}
              style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem', backgroundColor: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', cursor: 'pointer' }}
              title="Refresh campaign execution state"
            >
              <RefreshCw size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* ── 2. KPI SUMMARY ROW (INTERACTIVE CLICKABLE CARDS) ─────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem' }}>
        {[
          { label: 'In Execution', value: kpiData.inExecution, color: '#818cf8', icon: Activity, key: 'ALL' },
          { label: 'Contacted', value: kpiData.contacted, color: '#60a5fa', icon: Mail, key: 'Contacted' },
          { label: 'Opened', value: kpiData.opened, color: '#06b6d4', icon: Eye, key: 'Opened' },
          { label: 'Replies', value: kpiData.replied, color: '#c084fc', icon: MessageSquare, key: 'Replied' },
          { label: 'Meetings', value: kpiData.meetings, color: '#f472b6', icon: Calendar, key: 'Meeting' },
          { label: 'Converted', value: kpiData.converted, color: '#10b981', icon: Award, key: 'Converted' },
          { label: 'Stopped / Bounced', value: kpiData.stopped, color: '#f87171', icon: XCircle, key: 'Stopped' }
        ].map((kpi, idx) => {
          const IconComp = kpi.icon;
          const isActive = selectedPipelineFilter === kpi.key;

          return (
            <div
              key={idx}
              onClick={() => {
                setSelectedPipelineFilter(kpi.key);
                const matches = executionDeals.filter(d => {
                  if (kpi.key === 'ALL') return true;
                  if (kpi.key === 'Contacted') return d.state === 'Email Sent' || d.state === 'Delivered' || d.state === 'Waiting for Engagement';
                  if (kpi.key === 'Opened') return d.state === 'Opened';
                  if (kpi.key === 'Replied') return d.state === 'Replied' || d.state === 'AI Analyzing Reply' || d.state === 'Action Recommended';
                  if (kpi.key === 'Meeting') return d.state === 'Sales Handoff' || d.state === 'Follow-up Scheduled' || d.state === 'Follow-up Sent';
                  if (kpi.key === 'Converted') return d.state === 'Campaign Completed' || d.state === 'Converted';
                  if (kpi.key === 'Stopped') return d.state === 'Unsubscribed' || d.state === 'Bounced' || d.state === 'Failed' || d.state === 'Campaign Stopped';
                  return true;
                });
                if (matches.length > 0) setSelectedDealId(matches[0].id);
              }}
              style={{
                backgroundColor: isActive ? `${kpi.color}22` : 'rgba(15, 23, 42, 0.65)',
                borderRadius: '10px',
                border: isActive ? `2px solid ${kpi.color}` : '1px solid rgba(255, 255, 255, 0.08)',
                boxShadow: isActive ? `0 4px 20px ${kpi.color}44` : 'none',
                padding: '0.75rem 1rem',
                display: 'flex', flexDirection: 'column', gap: '0.3rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                transform: isActive ? 'translateY(-2px)' : 'none',
                position: 'relative'
              }}
            >
              {isActive && (
                <div style={{ position: 'absolute', top: '-6px', right: '10px', fontSize: '0.58rem', fontWeight: 800, padding: '1px 6px', borderRadius: '4px', backgroundColor: kpi.color, color: '#fff' }}>
                  FILTERED
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem', color: isActive ? '#fff' : 'var(--text-muted)', fontWeight: 700 }}>
                <span>{kpi.label}</span>
                <IconComp size={14} style={{ color: kpi.color }} />
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: isActive ? kpi.color : '#fff' }}>{kpi.value}</div>
              <div style={{ fontSize: '0.65rem', color: isActive ? '#e0e7ff' : 'var(--text-sub)' }}>
                {isActive ? '● Active Filter' : 'Click to inspect →'}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── 3. MODERN CLICKABLE HORIZONTAL PIPELINE STEPPER ────────────────────── */}
      <div style={{
        backgroundColor: 'rgba(15, 23, 42, 0.65)', borderRadius: '10px',
        border: '1px solid rgba(99, 102, 241, 0.2)', padding: '0.65rem 1rem',
        display: 'flex', alignItems: 'center', gap: '0.5rem', overflowX: 'auto'
      }}>
        <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap', marginRight: '0.5rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Layers size={13} /> Pipeline Stage:
        </div>

        {['ALL', 'Contacted', 'Opened', 'Replied', 'Meeting', 'Converted', 'Stopped'].map((stage, idx, arr) => {
          const isActive = selectedPipelineFilter === stage;
          const count = stage === 'ALL' ? executionDeals.length :
            stage === 'Contacted' ? executionDeals.filter(d => d.state === 'Email Sent' || d.state === 'Delivered' || d.state === 'Waiting for Engagement').length :
              stage === 'Opened' ? executionDeals.filter(d => d.state === 'Opened').length :
                stage === 'Replied' ? executionDeals.filter(d => d.state === 'Replied' || d.state === 'AI Analyzing Reply' || d.state === 'Action Recommended').length :
                  stage === 'Meeting' ? executionDeals.filter(d => d.state === 'Sales Handoff' || d.state === 'Follow-up Scheduled' || d.state === 'Follow-up Sent').length :
                    stage === 'Converted' ? executionDeals.filter(d => d.state === 'Campaign Completed' || d.state === 'Converted').length :
                      executionDeals.filter(d => d.state === 'Unsubscribed' || d.state === 'Bounced' || d.state === 'Failed' || d.state === 'Campaign Stopped').length;

          return (
            <React.Fragment key={stage}>
              <button
                type="button"
                onClick={() => setSelectedPipelineFilter(stage)}
                style={{
                  fontSize: '0.72rem', padding: '5px 12px', borderRadius: '6px',
                  border: isActive ? '1.5px solid #6366f1' : '1px solid rgba(255,255,255,0.08)',
                  backgroundColor: isActive ? 'rgba(99, 102, 241, 0.22)' : 'rgba(0,0,0,0.25)',
                  color: isActive ? '#fff' : 'var(--text-muted)', fontWeight: isActive ? 700 : 500,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap'
                }}
              >
                <span>{stage}</span>
                <span style={{ fontSize: '0.65rem', padding: '1px 5px', borderRadius: '999px', backgroundColor: isActive ? '#6366f1' : 'rgba(255,255,255,0.1)', color: '#fff', fontWeight: 800 }}>
                  {count}
                </span>
              </button>
              {idx < arr.length - 1 && <ChevronRight size={12} style={{ color: 'rgba(255,255,255,0.15)', flexShrink: 0 }} />}
            </React.Fragment>
          );
        })}
      </div>

      {/* ── 4. TWO-COLUMN CRM WORKSPACE (LEFT: LEAD LIST | RIGHT: INTELLIGENCE PANEL) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: selectedDealId ? '1fr 1.15fr' : '1fr', gap: '1.2rem', alignItems: 'start' }}>

        {/* ── LEFT COLUMN: SEARCHABLE & FILTERABLE LEAD EXECUTION LIST ────────── */}
        <div style={{
          backgroundColor: 'rgba(15, 23, 42, 0.7)', borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.08)', padding: '1rem',
          display: 'flex', flexDirection: 'column', gap: '0.85rem'
        }}>
          {/* KPI Drill-Down Filter Banner */}
          {selectedPipelineFilter !== 'ALL' && (
            <div style={{
              backgroundColor: 'rgba(99, 102, 241, 0.15)', borderRadius: '8px', border: '1px solid rgba(99, 102, 241, 0.4)',
              padding: '0.6rem 0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Filter size={14} style={{ color: '#818cf8' }} />
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#fff' }}>
                  KPI Drill-Down: <strong>{selectedPipelineFilter}</strong> ({filteredDeals.length} Lead{filteredDeals.length !== 1 ? 's' : ''})
                </span>
              </div>
              <button
                onClick={() => setSelectedPipelineFilter('ALL')}
                style={{ fontSize: '0.7rem', padding: '3px 8px', borderRadius: '4px', backgroundColor: 'rgba(255,255,255,0.1)', color: '#e0e7ff', border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer', fontWeight: 700 }}
              >
                ← Back to All Leads
              </button>
            </div>
          )}

          {/* Search & Filter Bar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'rgba(0,0,0,0.3)', padding: '0.45rem 0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <Search size={14} style={{ color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search lead by name, company, job title..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '0.82rem', width: '100%', outline: 'none' }}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>✕</button>
              )}
            </div>

            {/* Quick Category Filter Pills */}
            <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
              {['ALL', 'Waiting', 'Needs Action', 'Replied', 'Meeting', 'Converted', 'Stopped'].map(cat => {
                const isActive = leadCategoryFilter === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setLeadCategoryFilter(cat)}
                    style={{
                      fontSize: '0.68rem', padding: '3px 8px', borderRadius: '4px',
                      border: isActive ? '1px solid #818cf8' : '1px solid rgba(255,255,255,0.06)',
                      backgroundColor: isActive ? 'rgba(99,102,241,0.2)' : 'rgba(0,0,0,0.2)',
                      color: isActive ? '#a5b4fc' : 'var(--text-muted)', fontWeight: isActive ? 700 : 500, cursor: 'pointer'
                    }}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Lead List / Table */}
          <div style={{ maxHeight: '600px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
            {loading ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading execution leads...</div>
            ) : filteredDeals.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                No prospects match the selected filter.
              </div>
            ) : (
              filteredDeals.map(d => {
                const lead = d.lead || {};
                const name = lead.source_fields?.name || lead.name || [lead.first_name, lead.last_name].filter(Boolean).join(' ') || (lead.email ? lead.email.split('@')[0] : `Lead #${d.lead_id}`);
                const companyName = lead.source_fields?.company || lead.company_name || 'Client';
                const title = lead.source_fields?.title || lead.job_title || 'Executive';
                const score = lead.gp_confidence ? Math.round(lead.gp_confidence * 100) : (d.predictive_score || 85);
                const isSelected = selectedDealId === d.id;
                const stConfig = STATE_CONFIGS[d.state] || { label: d.state, color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.15)' };

                return (
                  <div
                    key={d.id}
                    onClick={() => setSelectedDealId(d.id)}
                    style={{
                      padding: '0.75rem 0.85rem', borderRadius: '8px', cursor: 'pointer',
                      border: isSelected ? '1.5px solid #6366f1' : '1px solid rgba(255,255,255,0.06)',
                      backgroundColor: isSelected ? 'rgba(99, 102, 241, 0.12)' : 'rgba(0,0,0,0.2)',
                      transition: 'all 0.15s ease', position: 'relative'
                    }}
                  >
                    {isSelected && (
                      <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: '3px', background: '#6366f1', borderTopLeftRadius: '8px', borderBottomLeftRadius: '8px' }} />
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '3px' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.85rem', color: isSelected ? '#a5b4fc' : '#f8fafc' }}>
                        {name}
                      </span>
                      <span style={{ fontSize: '0.65rem', fontWeight: 800, padding: '1px 6px', borderRadius: '4px', background: 'rgba(16,185,129,0.15)', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)' }}>
                        {score}% Fit
                      </span>
                    </div>

                    <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginBottom: '0.45rem' }}>
                      {title} @ <strong>{companyName}</strong>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '0.4rem' }}>
                      <span style={{ fontSize: '0.68rem', padding: '2px 7px', borderRadius: '4px', backgroundColor: stConfig.bg, color: stConfig.color, border: `1px solid ${stConfig.color}44`, fontWeight: 600 }}>
                        {stConfig.label}
                      </span>

                      {(d.state === 'Waiting for Engagement' || d.state === 'Opened' || d.state === 'Follow-up Scheduled') && (d.next_step_at || d.timer_expires_at || d.not_before) ? (
                        <WaitingCountdownTimer targetIso={d.next_step_at || d.timer_expires_at || d.not_before} onExpire={() => loadExecutionData(selectedCampaignId)} />
                      ) : (
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{d.next_action || 'Evaluate'}</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── RIGHT COLUMN: SELECTED LEAD INTELLIGENCE & ACTION COMMAND CENTER ── */}
        {selectedDealId && dealDetail ? (
          <div style={{
            backgroundColor: 'rgba(15, 23, 42, 0.75)', borderRadius: '12px',
            border: '1.5px solid #6366f1', padding: '1rem',
            display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: 'calc(100vh - 120px)', overflowY: 'auto'
          }}>

            {/* Profile Overview Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.75rem' }}>
              <div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>{leadName}</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '2px 7px', borderRadius: '4px', background: 'rgba(16,185,129,0.2)', color: '#34d399', border: '1px solid #10b981' }}>
                    {fitScore}% Fit Match
                  </span>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {jobTitle} @ <strong>{company}</strong> · {activeLead.email}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button
                  onClick={() => handleSyncInbox(dealDetail.deal_id)}
                  disabled={syncingInbox}
                  style={{ fontSize: '0.72rem', padding: '4px 9px', backgroundColor: '#10b981', color: '#fff', fontWeight: 700, border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  <RefreshCw size={11} style={{ animation: syncingInbox ? 'spin 1s linear infinite' : 'none' }} />
                  {syncingInbox ? 'Syncing...' : 'Check Reply Inbox'}
                </button>
                <button onClick={() => setSelectedDealId(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}>✕</button>
              </div>
            </div>

            {/* 🎯 PROMINENT DYNAMIC AI NEXT-BEST-ACTION COMMAND CARD */}
            {(() => {
              const currentState = dealDetail.deal_state;
              const outcome = dealDetail.outcome || '';
              const reason = dealDetail.reason || '';

              const isNegativeReply = (
                currentState === 'Unsubscribed' || currentState === 'Bounced' || currentState === 'Campaign Stopped' || currentState === 'Failed' ||
                outcome === 'not_interested' || outcome === 'wrong_fit' ||
                reason.toLowerCase().includes('not interested') || reason.toLowerCase().includes('unsubscribe') || reason.toLowerCase().includes('opted out')
              );

              let actionTitle = 'Execute Next Best Action';
              let actionDesc = 'AI recommends advancing prospect sequence';
              let buttonLabel = '🚀 Execute Action';
              let buttonColor = '#6366f1';
              let actionFn = () => handleExecuteAction(dealDetail.deal_id);

              if (isNegativeReply) {
                actionTitle = '🛑 Sequence Halted — Prospect Opted Out / Declined';
                actionDesc = 'Prospect expressed negative interest or requested unsubscribe. AI automatically halted sequence and added prospect to suppression list.';
                buttonLabel = '🛑 Sequence Stopped';
                buttonColor = '#f87171';
                actionFn = () => showToast('Sequence is halted for this prospect.', 'error');
              } else if (currentState === 'Email Sent' || currentState === 'Delivered' || currentState === 'Waiting for Engagement') {
                actionTitle = 'Simulate Prospect Engagement';
                actionDesc = 'Email dispatched. Waiting for prospect open/reply countdown or simulate engagement test.';
                buttonLabel = '👁 Simulate Prospect Open';
                buttonColor = '#06b6d4';
                actionFn = () => handleSimulate(dealDetail.deal_id, 'open');
              } else if (currentState === 'Opened') {
                actionTitle = 'Check for Prospect Response';
                actionDesc = 'Prospect opened cold email. Sync live inbox or check for replies.';
                buttonLabel = '💬 Check Inbox for Reply';
                buttonColor = '#c084fc';
                actionFn = () => handleSyncInbox(dealDetail.deal_id);
              } else if (currentState === 'Replied' || currentState === 'AI Analyzing Reply' || currentState === 'Action Recommended') {
                actionTitle = 'Execute AI Recommended Next Step';
                actionDesc = dealDetail.ai_decision?.recommended_action || 'Prospect replied. Review and edit proposed follow-up / meeting email.';
                buttonLabel = '📝 Review & Edit Action Plan';
                buttonColor = '#34d399';
                actionFn = () => handleOpenActionModal(dealDetail);
              } else if (currentState === 'Sales Handoff' || currentState === 'Follow-up Scheduled') {
                actionTitle = 'Schedule Demo & Convert Deal';
                actionDesc = 'Meeting invitation ready to send. Edit email details and dispatch to prospect.';
                buttonLabel = '📝 Edit Email & Schedule Demo';
                buttonColor = '#f472b6';
                actionFn = () => handleOpenActionModal(dealDetail);
              } else if (currentState === 'Campaign Completed' || currentState === 'Converted') {
                actionTitle = 'Deal Successfully Converted 🎉';
                actionDesc = 'Prospect completed campaign sequence and scheduled demo meeting.';
                buttonLabel = '🎉 Converted!';
                buttonColor = '#10b981';
                actionFn = () => showToast('Deal already converted!');
              }

              return (
                <div style={{
                  background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.18) 0%, rgba(15, 23, 42, 0.9) 100%)',
                  borderRadius: '10px', border: `1.5px solid ${buttonColor}66`, padding: '1rem',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap'
                }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 800, color: buttonColor, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '3px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Zap size={12} /> AI Next-Best Action Recommendation
                    </div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#fff' }}>{actionTitle}</div>
                    <div style={{ fontSize: '0.73rem', color: 'var(--text-sub)', marginTop: '2px', lineHeight: 1.4 }}>{actionDesc}</div>
                  </div>

                  <button
                    onClick={actionFn}
                    disabled={actionLoading}
                    style={{
                      fontSize: '0.8rem', padding: '8px 18px', background: buttonColor, color: '#fff',
                      fontWeight: 800, border: 'none', borderRadius: '6px', cursor: 'pointer',
                      boxShadow: `0 4px 12px ${buttonColor}44`, display: 'inline-flex', alignItems: 'center', gap: '6px', flexShrink: 0
                    }}
                  >
                    {buttonLabel}
                  </button>
                </div>
              );
            })()}

            {/* Tab Selector Buttons */}
            <div style={{ display: 'flex', gap: '0.4rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.5rem', flexWrap: 'wrap' }}>
              {[
                { id: 'overview', label: 'Overview' },
                { id: 'sequence', label: '⚡ Automation Sequence & Timers' },
                { id: 'thread', label: `Email Thread (${dealDetail.messages ? dealDetail.messages.length : 0})` },
                { id: 'ai', label: 'AI Intelligence' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setInspectorTab(tab.id)}
                  style={{
                    fontSize: '0.75rem', padding: '4px 10px', borderRadius: '6px',
                    backgroundColor: inspectorTab === tab.id ? '#4f46e5' : 'transparent',
                    color: inspectorTab === tab.id ? '#fff' : 'var(--text-muted)',
                    border: 'none', fontWeight: inspectorTab === tab.id ? 700 : 500, cursor: 'pointer'
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* TAB 1 — OVERVIEW */}
            {inspectorTab === 'overview' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {/* Live Sequence & Timer Status Card */}
                {dealDetail.timer && (
                  <div style={{
                    backgroundColor: 'rgba(15, 23, 42, 0.85)',
                    border: '1px solid rgba(99, 102, 241, 0.25)',
                    borderRadius: '10px',
                    padding: '0.9rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.65rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Zap size={15} className="text-indigo-400" />
                        Live Campaign Automation Sequence
                      </div>
                      <span style={{
                        fontSize: '0.7rem',
                        padding: '2px 8px',
                        borderRadius: '999px',
                        backgroundColor: dealDetail.timer.sequence_state === 'REPLIED' ? 'rgba(16, 185, 129, 0.2)' : (dealDetail.timer.sequence_state === 'COMPLETED' ? 'rgba(52, 211, 153, 0.2)' : 'rgba(245, 158, 11, 0.2)'),
                        color: dealDetail.timer.sequence_state === 'REPLIED' ? '#34d399' : (dealDetail.timer.sequence_state === 'COMPLETED' ? '#34d399' : '#fbbf24'),
                        fontWeight: 700
                      }}>
                        {dealDetail.timer.sequence_state || 'TIMER_RUNNING'}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.5rem' }}>
                      <div style={{ padding: '0.5rem', borderRadius: '6px', backgroundColor: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.04)' }}>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Current Step</div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#e0e7ff' }}>
                          Step #{dealDetail.timer.current_step_number}: {dealDetail.timer.current_step_name}
                        </div>
                      </div>

                      <div style={{ padding: '0.5rem', borderRadius: '6px', backgroundColor: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.04)' }}>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Timer Countdown</div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#fbbf24' }}>
                          {dealDetail.timer.is_waiting && dealDetail.timer.timer_expires_at ? (
                            <WaitingCountdownTimer targetIso={dealDetail.timer.timer_expires_at} onExpire={() => loadExecutionData(selectedCampaignId)} />
                          ) : (
                            dealDetail.timer.sequence_state === 'REPLIED' ? 'Cancelled (Replied)' : (dealDetail.timer.sequence_state === 'COMPLETED' ? 'Sequence Completed' : 'Not Active')
                          )}
                        </div>
                      </div>

                      <div style={{ padding: '0.5rem', borderRadius: '6px', backgroundColor: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.04)' }}>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Reply Status</div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: dealDetail.timer.sequence_state === 'REPLIED' ? '#34d399' : '#94a3b8' }}>
                          {dealDetail.timer.sequence_state === 'REPLIED' ? 'Replied ✔' : 'Not Received'}
                        </div>
                      </div>

                      <div style={{ padding: '0.5rem', borderRadius: '6px', backgroundColor: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.04)' }}>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Follow-ups Sent</div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#60a5fa' }}>
                          {dealDetail.timer.follow_up_count || 0} Sent
                        </div>
                      </div>
                    </div>

                    {/* Step Stepper Progression Pills */}
                    {dealDetail.timer.steps_overview && dealDetail.timer.steps_overview.length > 0 && (
                      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.4rem' }}>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '0.3rem', fontWeight: 600 }}>Sequence Stepper:</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', alignItems: 'center' }}>
                          {dealDetail.timer.steps_overview.map((st, i) => {
                            const isCurrent = st.step_number === dealDetail.timer.current_step_number;
                            const isPast = st.step_number < dealDetail.timer.current_step_number;
                            return (
                              <React.Fragment key={i}>
                                <span style={{
                                  fontSize: '0.68rem',
                                  padding: '2px 7px',
                                  borderRadius: '5px',
                                  backgroundColor: isCurrent ? 'rgba(99, 102, 241, 0.3)' : (isPast ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.05)'),
                                  color: isCurrent ? '#c7d2fe' : (isPast ? '#34d399' : '#64748b'),
                                  border: isCurrent ? '1px solid #6366f1' : (isPast ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(255, 255, 255, 0.08)'),
                                  fontWeight: isCurrent ? 800 : 600
                                }}>
                                  {isPast ? '✔ ' : ''}{st.step_number}. {st.step_name}
                                </span>
                                {i < dealDetail.timer.steps_overview.length - 1 && (
                                  <span style={{ fontSize: '0.65rem', color: '#475569' }}>→</span>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                  <div style={{ backgroundColor: 'rgba(0,0,0,0.25)', padding: '0.65rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Email</div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#fff' }}>{dealDetail.lead?.email}</div>
                  </div>
                  <div style={{ backgroundColor: 'rgba(0,0,0,0.25)', padding: '0.65rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Fit Score</div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#34d399' }}>{fitScore}% Match</div>
                  </div>
                  <div style={{ backgroundColor: 'rgba(0,0,0,0.25)', padding: '0.65rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Location</div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#fff' }}>{dealDetail.lead?.country_code || 'US'}</div>
                  </div>
                  <div style={{ backgroundColor: 'rgba(0,0,0,0.25)', padding: '0.65rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Current Deal Status</div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#818cf8' }}>{dealDetail.deal_state}</div>
                  </div>
                </div>

                {/* Qualification Rationale */}
                {dealDetail.qualification_explanation && (
                  <div style={{ backgroundColor: 'rgba(0,0,0,0.25)', padding: '0.65rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '2px' }}>AI Qualification Rationale</div>
                    <div style={{ fontSize: '0.75rem', fontStyle: 'italic', color: 'var(--text-sub)' }}>
                      "{dealDetail.qualification_explanation}"
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB: AUTOMATION SEQUENCE */}
            {inspectorTab === 'sequence' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <CampaignSequenceBuilder
                  campaignId={parseInt(selectedCampaignId)}
                  campaignName={executionData?.campaign?.name}
                  onSaved={() => {
                    loadExecutionData(selectedCampaignId);
                    if (selectedDealId) loadDealDetail(selectedDealId);
                  }}
                />
              </div>
            )}

            {/* TAB 2 — EMAIL THREAD */}
            {inspectorTab === 'thread' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '380px', overflowY: 'auto' }}>
                {!dealDetail.messages || dealDetail.messages.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>No cold email messages recorded yet for this prospect.</p>
                ) : (
                  dealDetail.messages.map((m, idx) => {
                    const isOutbound = m.direction === 'outbound';
                    let displayBody = m.body || '';
                    if (!isOutbound && displayBody.includes('>')) {
                      const nonQuoted = displayBody.split('\n').filter(line => !line.trim().startsWith('>')).join('\n').trim();
                      displayBody = nonQuoted || displayBody;
                    }

                    return (
                      <div
                        key={idx}
                        style={{
                          padding: '0.85rem', borderRadius: '8px',
                          backgroundColor: isOutbound ? 'rgba(99, 102, 241, 0.1)' : 'rgba(16, 185, 129, 0.12)',
                          border: isOutbound ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid rgba(16, 185, 129, 0.4)'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                          <span style={{ fontWeight: 700, color: isOutbound ? '#818cf8' : '#34d399', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {isOutbound ? '📤 Outbound Email' : '📥 Prospect Response'}
                          </span>
                          <span>{formatLocalTime(m.sent_at || m.created_at || m.timestamp)}</span>
                        </div>

                        {m.subject && (
                          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#e0e7ff', marginBottom: '0.35rem' }}>
                            {m.subject}
                          </div>
                        )}

                        <div style={{ fontSize: '0.82rem', color: isOutbound ? 'var(--text-muted)' : '#f3f4f6', whiteSpace: 'pre-wrap', lineHeight: '1.45' }}>
                          {displayBody}
                        </div>

                        {isOutbound && (
                          <div style={{ marginTop: '0.75rem', paddingTop: '0.65rem', borderTop: '1px dashed rgba(99, 102, 241, 0.25)' }}>
                            <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#34d399', marginBottom: '0.3rem' }}>
                              📎 Attachment: Corporate_Capabilities_Overview.pdf
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* TAB 3 — AI INTELLIGENCE */}
            {inspectorTab === 'ai' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div style={{ backgroundColor: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.3)', borderRadius: '8px', padding: '0.85rem' }}>
                  <div style={{ fontSize: '0.7rem', color: '#818cf8', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.3rem' }}>
                    🟢 AI Classification
                  </div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#34d399' }}>
                    {dealDetail.ai_decision?.classification || 'Evaluating Engagement...'}
                  </div>
                </div>

                <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px', padding: '0.85rem' }}>
                  <div style={{ fontSize: '0.7rem', color: '#34d399', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.3rem' }}>
                    🎯 Recommended Action
                  </div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#e0e7ff' }}>
                    {dealDetail.ai_decision?.recommended_action || dealDetail.next_action || 'Continue Sequence'}
                  </div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontStyle: 'italic', marginTop: '0.3rem', margin: 0 }}>
                    "{dealDetail.ai_decision?.reason || 'Reasoning based on engagement status.'}"
                  </p>
                </div>

                {/* Meeting Link Input Override */}
                <div style={{ backgroundColor: 'rgba(0,0,0,0.25)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <label style={{ fontSize: '0.73rem', fontWeight: 600, color: '#e0e7ff', display: 'block', marginBottom: '0.35rem' }}>
                    🔗 Meeting Link URL to Send:
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={meetingLink}
                    onChange={(e) => setMeetingLink(e.target.value)}
                    placeholder="https://meet.google.com/your-meeting-id"
                    style={{ fontSize: '0.8rem', padding: '0.4rem 0.65rem', backgroundColor: 'rgba(0,0,0,0.4)', color: '#fff', border: '1px solid #6366f1' }}
                  />
                </div>
              </div>
            )}

          </div>
        ) : (
          <div style={{ backgroundColor: 'rgba(15,23,42,0.6)', borderRadius: '12px', padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Select a prospect from the execution list to inspect intelligence &amp; run AI actions.
          </div>
        )}

      </div>

      {/* ── EDITABLE ACTION DRAFT MODAL ── */}
      {showActionModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem'
        }}>
          <div style={{
            backgroundColor: '#0f172a', border: '1.5px solid #6366f1', borderRadius: '12px',
            width: '100%', maxWidth: '650px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.7)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.75rem' }}>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Sparkles size={18} color="#6366f1" />
                <span>AI Next-Best Action — Edit Email Plan</span>
              </div>
              <button onClick={() => setShowActionModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                Recipient Email
              </label>
              <input
                type="text"
                value={actionDraft.recipient}
                disabled
                style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', backgroundColor: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)', fontSize: '0.85rem' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#e0e7ff', display: 'block', marginBottom: '4px' }}>
                Email Subject Line
              </label>
              <input
                type="text"
                value={actionDraft.subject}
                onChange={(e) => setActionDraft({ ...actionDraft, subject: e.target.value })}
                placeholder="Enter subject..."
                style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', backgroundColor: '#1e293b', color: '#fff', border: '1px solid #6366f1', fontSize: '0.88rem' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#e0e7ff', display: 'block', marginBottom: '4px' }}>
                Email Body Text (Editable)
              </label>
              <textarea
                rows={7}
                value={actionDraft.body}
                onChange={(e) => setActionDraft({ ...actionDraft, body: e.target.value })}
                placeholder="Type or edit email body message..."
                style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', backgroundColor: '#1e293b', color: '#fff', border: '1px solid #6366f1', fontSize: '0.85rem', fontFamily: 'inherit', resize: 'vertical', lineHeight: '1.5' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#e0e7ff', display: 'block', marginBottom: '4px' }}>
                🔗 Meeting / Demo Link URL
              </label>
              <input
                type="text"
                value={actionDraft.meetingLink}
                onChange={(e) => {
                  const newLink = e.target.value;
                  setMeetingLink(newLink);
                  setActionDraft({ ...actionDraft, meetingLink: newLink });
                }}
                placeholder="https://meet.google.com/your-meeting-id"
                style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', backgroundColor: '#1e293b', color: '#fff', border: '1px solid #6366f1', fontSize: '0.85rem' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                onClick={() => setShowActionModal(false)}
                style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.2)', backgroundColor: 'transparent', color: '#fff', cursor: 'pointer', fontSize: '0.82rem' }}
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteActionSubmit}
                disabled={actionLoading}
                style={{ padding: '0.5rem 1.25rem', borderRadius: '6px', border: 'none', backgroundColor: '#4f46e5', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                {actionLoading ? 'Sending...' : '🚀 Send Email'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sequence Builder Modal in Live Campaign */}
      {showSequenceModal && selectedCampaignId && (
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
            backgroundColor: '#0f172a',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '900px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '2rem',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            position: 'relative'
          }}>
            <button
              onClick={() => setShowSequenceModal(false)}
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
              ✕
            </button>

            <CampaignSequenceBuilder
              campaignId={parseInt(selectedCampaignId)}
              campaignName={executionData?.campaign?.name}
              onSaved={() => {
                loadExecutionData(selectedCampaignId);
                if (selectedDealId) loadDealDetail(selectedDealId);
              }}
              onClose={() => setShowSequenceModal(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
