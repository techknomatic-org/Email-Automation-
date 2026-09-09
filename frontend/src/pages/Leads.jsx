import React, { useEffect, useState } from 'react';
import {
  getCampaigns, getCampaignLeads, getLeadPoolStatus,
  discoverCampaignLeads, regenerateLeadPool,
  checkLeadProviderHealth, acceptLead, acceptBatchLeads, acceptAllLeads,
  importCsvFile, deleteLead
} from '../services/api';

import Lead360Modal from '../components/Lead360Modal';
import CsvUploadModal from '../components/CsvUploadModal';
import ManualProfileModal from '../components/ManualProfileModal';
import DatasetValidationPanel from '../components/DatasetValidationPanel';
import {
  RefreshCw, Filter, Search, Sparkles, AlertCircle, CheckCircle,
  ShieldAlert, XCircle, ArrowRight, Zap, Database, BrainCircuit,
  ExternalLink, UploadCloud, CheckCircle2, ListChecks, ChevronDown, X, Trash2,
  Edit3, Plus, UserPlus, FileSpreadsheet, MapPin, Building, Mail, Check, Layers
} from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';

// ── Helpers ──────────────────────────────────────────────────────────────────
function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getAvatarColor(name) {
  const palette = [
    { bg: 'rgba(232, 98, 44, 0.12)', text: '#E8622C', border: 'rgba(232, 98, 44, 0.28)' },
    { bg: 'rgba(16, 185, 129, 0.12)', text: '#10b981', border: 'rgba(16, 185, 129, 0.28)' },
    { bg: 'rgba(59, 130, 246, 0.12)', text: '#3b82f6', border: 'rgba(59, 130, 246, 0.28)' },
    { bg: 'rgba(139, 92, 246, 0.12)', text: '#8b5cf6', border: 'rgba(139, 92, 246, 0.28)' },
    { bg: 'rgba(236, 72, 153, 0.12)', text: '#ec4899', border: 'rgba(236, 72, 153, 0.28)' },
    { bg: 'rgba(245, 166, 35, 0.12)', text: '#f5a623', border: 'rgba(245, 166, 35, 0.28)' },
  ];
  if (!name) return palette[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
}

function SourceBadge({ type, url }) {
  const raw = (type || 'Dataset').toString().trim();
  const lower = raw.toLowerCase();

  let label = 'Dataset';
  let icon = <Database size={11} />;
  let isManual = false;

  if (lower.includes('manual')) {
    label = 'Manual Entry';
    icon = <Edit3 size={11} />;
    isManual = true;
  } else if (lower.includes('xlsx') || lower.includes('excel') || lower.includes('master_contact') || lower.includes('csv') || lower.includes('master')) {
    label = 'Master Dataset';
    icon = <FileSpreadsheet size={11} />;
  } else if (lower.includes('linkedin')) {
    label = 'LinkedIn';
    icon = <ExternalLink size={11} />;
  } else if (lower.includes('apollo')) {
    label = 'Apollo';
    icon = <Zap size={11} />;
  } else if (lower.includes('api')) {
    label = 'API Feed';
    icon = <Zap size={11} />;
  } else {
    label = raw.replace(/\.[^/.]+$/, '').replace(/[_\-\.]+/g, ' ');
    if (label.length > 15) label = label.slice(0, 14) + '...';
  }

  const badgeStyle = {
    fontSize: '0.7rem',
    fontWeight: 600,
    padding: '3px 8px',
    borderRadius: 'var(--radius-full)',
    background: isManual ? 'var(--accent-light)' : 'var(--bg-inner)',
    color: isManual ? 'var(--accent)' : 'var(--text-sub)',
    border: `1px solid ${isManual ? 'var(--border-glow)' : 'var(--border)'}`,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    whiteSpace: 'nowrap',
    letterSpacing: '0.02em',
    maxWidth: 135,
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  };

  const content = (
    <span style={badgeStyle} title={`Source: ${raw}`}>
      {icon} {label}
      {url && <ExternalLink size={10} style={{ opacity: 0.8 }} />}
    </span>
  );

  return url ? (
    <a href={url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
      {content}
    </a>
  ) : content;
}

// Module-level in-memory cache to preserve lead pool data across tab navigation without reloading spinners
const _LEADS_CACHE = new Map();

// ── Main Component ───────────────────────────────────────────────────────────
export default function Leads({ activeCampaignId, setCurrentTab, setActiveCampaignId, setActiveLeadId }) {
  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState(activeCampaignId || null);
  const [leads, setLeads] = useState(() => {
    const cached = (activeCampaignId && _LEADS_CACHE.get(activeCampaignId));
    return cached ? cached.leads : [];
  });
  const [statusMetrics, setStatusMetrics] = useState(() => {
    const cached = (activeCampaignId && _LEADS_CACHE.get(activeCampaignId));
    return cached ? cached.metricsData : null;
  });
  const [providerHealth, setProviderHealth] = useState(null);
  const [loading, setLoading] = useState(() => {
    return activeCampaignId ? !_LEADS_CACHE.has(activeCampaignId) : true;
  });
  const [refreshing, setRefreshing] = useState(false);
  const [discoveryStage, setDiscoveryStage] = useState('');
  const [regenerating, setRegenerating] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [showCriteriaModal, setShowCriteriaModal] = useState(false);

  // ── Centered Confirm Modal State ─────────────────────────────────────────
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false, title: '', message: '', action: null, confirmText: 'Delete', isDanger: true, loading: false
  });

  // ── Multi-select state ────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [addingToDeals, setAddingToDeals] = useState(false);
  const [bulkSuccess, setBulkSuccess] = useState('');

  // ── Load campaigns + provider health ─────────────────────────────────────
  useEffect(() => {
    checkLeadProviderHealth()
      .then(setProviderHealth)
      .catch(() => { });

    getCampaigns()
      .then((data) => {
        setCampaigns(data);
        if (data.length > 0 && !selectedCampaignId) {
          const def = [...data].reverse().find(c => c.id >= 3) || data[data.length - 1];
          setSelectedCampaignId(def.id);
        }
      })
      .catch(() => { });
  }, []);

  // ── Load lead pool for selected campaign (with instant cache restoration) ──
  const loadCampaignLeadPool = async (campaignId, forceRefresh = false) => {
    if (!campaignId) { setLoading(false); return; }

    const cached = _LEADS_CACHE.get(campaignId);
    if (cached && !forceRefresh) {
      setLeads(cached.leads);
      setStatusMetrics(cached.metricsData);
      setLoading(false);
    } else if (!cached) {
      setLoading(true);
    }

    try {
      const [leadsData, metricsData] = await Promise.all([
        getCampaignLeads(campaignId),
        getLeadPoolStatus(campaignId),
      ]);
      setLeads(leadsData);
      setStatusMetrics(metricsData);
      _LEADS_CACHE.set(campaignId, { leads: leadsData, metricsData });
    } catch (err) {
      console.error('Error loading campaign lead pool:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCampaignId) loadCampaignLeadPool(selectedCampaignId);
  }, [selectedCampaignId]);

  // ── Discover leads ────────────────────────────────────────────────────────
  const handleRefresh = async () => {
    if (!selectedCampaignId) return;
    setRefreshing(true);
    setDiscoveryStage('Filtering dataset...');
    const s1 = setTimeout(() => setDiscoveryStage('Matching profiles...'), 400);
    const s2 = setTimeout(() => setDiscoveryStage('AI scoring...'), 800);
    try {
      const res = await discoverCampaignLeads(selectedCampaignId);
      if (res?.status) setDiscoveryStage(res.status);
      await loadCampaignLeadPool(selectedCampaignId, true);
    } catch (err) {
      console.error('Error discovering leads:', err);
    } finally {
      clearTimeout(s1); clearTimeout(s2);
      setRefreshing(false); setDiscoveryStage('');
    }
  };

  const triggerRegenerate = () => {
    if (!selectedCampaignId) return;
    setConfirmModal({
      isOpen: true,
      title: 'Regenerate Lead Pool',
      message: 'Re-analyze campaign context and regenerate the lead pool? Non-emailed leads in pipeline will be refreshed.',
      confirmText: 'Regenerate',
      isDanger: false,
      loading: false,
      action: async () => {
        setRegenerating(true);
        setDiscoveryStage('AI regenerating lead pool...');
        try {
          await regenerateLeadPool(selectedCampaignId);
          await loadCampaignLeadPool(selectedCampaignId, true);
        } catch (err) {
          console.error('Regenerate error:', err.response?.data?.detail || err.message);
        } finally {
          setRegenerating(false); setDiscoveryStage('');
        }
      }
    });
  };

  const triggerSingleDelete = (leadId, leadName) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Lead Profile',
      message: `Permanently delete lead '${leadName}' from the database? This action cannot be undone.`,
      confirmText: 'Delete Lead',
      isDanger: true,
      loading: false,
      action: async () => {
        await deleteLead(leadId);
        await loadCampaignLeadPool(selectedCampaignId, true);
        setBulkSuccess(`✓ Lead '${leadName}' deleted`);
        setTimeout(() => setBulkSuccess(''), 4000);
      }
    });
  };

  const triggerBulkDelete = () => {
    if (selectedIds.size === 0) return;
    setConfirmModal({
      isOpen: true,
      title: `Delete ${selectedIds.size} Selected Leads`,
      message: `Permanently delete ${selectedIds.size} selected lead profile(s) from the database? This action cannot be undone.`,
      confirmText: 'Delete Selected',
      isDanger: true,
      loading: false,
      action: async () => {
        let successCount = 0;
        for (const leadId of selectedIds) {
          try {
            await deleteLead(leadId);
            successCount++;
          } catch { }
        }
        await loadCampaignLeadPool(selectedCampaignId, true);
        setSelectedIds(new Set());
        setBulkSuccess(`✓ Deleted ${successCount} lead${successCount !== 1 ? 's' : ''}`);
        setTimeout(() => setBulkSuccess(''), 4000);
      }
    });
  };

  // ── Single accept ─────────────────────────────────────────────────────────
  const handleAcceptSingleLead = async (leadId) => {
    if (!selectedCampaignId || !leadId) return;

    if (setActiveCampaignId) setActiveCampaignId(selectedCampaignId);
    if (setActiveLeadId) setActiveLeadId(leadId);
    if (setCurrentTab) setCurrentTab('deals');

    try {
      await acceptLead(selectedCampaignId, leadId);
      setLeads(prevLeads =>
        prevLeads.map(l => l.id === leadId ? { ...l, deal_state: 'Qualified' } : l)
      );
      if (_LEADS_CACHE.has(selectedCampaignId)) {
        const cached = _LEADS_CACHE.get(selectedCampaignId);
        _LEADS_CACHE.set(selectedCampaignId, {
          ...cached,
          leads: cached.leads.map(l => l.id === leadId ? { ...l, deal_state: 'Qualified' } : l)
        });
      }
    } catch (err) {
      console.error('Error accepting lead:', err);
    }
  };

  // ── Accept ALL leads ──────────────────────────────────────────────────────
  const handleAcceptAllLeads = async () => {
    if (!selectedCampaignId) return;

    if (setActiveCampaignId) setActiveCampaignId(selectedCampaignId);
    if (setCurrentTab) setCurrentTab('deals');

    try {
      await acceptAllLeads(selectedCampaignId);
      setLeads(prevLeads =>
        prevLeads.map(l => ({ ...l, deal_state: 'Qualified' }))
      );
      if (_LEADS_CACHE.has(selectedCampaignId)) {
        const cached = _LEADS_CACHE.get(selectedCampaignId);
        _LEADS_CACHE.set(selectedCampaignId, {
          ...cached,
          leads: cached.leads.map(l => ({ ...l, deal_state: 'Qualified' }))
        });
      }
    } catch (err) {
      console.error('Error accepting all leads:', err);
    }
  };

  // ── Bulk "Add to Deals & Pipeline" ───────────────────────────────────────────
  const handleBulkAddToDeals = async () => {
    if (selectedIds.size === 0 || addingToDeals) return;
    const targetLeadIds = Array.from(selectedIds);
    const acceptedSet = new Set(targetLeadIds);

    setAddingToDeals(true);

    if (setActiveCampaignId) setActiveCampaignId(selectedCampaignId);
    if (setActiveLeadId && targetLeadIds.length > 0) setActiveLeadId(targetLeadIds[0]);
    if (setCurrentTab) setCurrentTab('deals');

    try {
      await acceptBatchLeads(selectedCampaignId, targetLeadIds);
      setLeads(prevLeads =>
        prevLeads.map(l => acceptedSet.has(l.id) ? { ...l, deal_state: 'Qualified' } : l)
      );
      if (_LEADS_CACHE.has(selectedCampaignId)) {
        const cached = _LEADS_CACHE.get(selectedCampaignId);
        _LEADS_CACHE.set(selectedCampaignId, {
          ...cached,
          leads: cached.leads.map(l => acceptedSet.has(l.id) ? { ...l, deal_state: 'Qualified' } : l)
        });
      }
      setSelectedIds(new Set());
    } catch (err) {
      console.error('Error in batch accept:', err);
    } finally {
      setAddingToDeals(false);
    }
  };

  // ── Checkbox helpers ──────────────────────────────────────────────────────
  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const isAllSelected = filteredLeads => filteredLeads.length > 0 && filteredLeads.every(l => selectedIds.has(l.id));

  const toggleSelectAll = (filteredLeads) => {
    if (isAllSelected(filteredLeads)) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredLeads.map(l => l.id)));
    }
  };

  // ── Filtering ─────────────────────────────────────────────────────────────
  const filteredLeads = leads
    .filter((l) => {
      const fitScore = l.fit_score || l.predictive_score || 0;
      const q = searchQuery.toLowerCase();
      const matchesSearch = !q || [l.name, l.email, l.company, l.title, l.department, l.location]
        .some(v => (v || '').toLowerCase().includes(q));
      if (!matchesSearch) return false;
      if (statusFilter === 'QUALIFIED') return !l.is_suppressed && !l.disqualified;
      if (statusFilter === 'HIGH_FIT') return fitScore >= 90;
      if (statusFilter === 'SUPPRESSED') return l.is_suppressed;
      if (statusFilter === 'DISQUALIFIED') return l.disqualified;
      return true;
    })
    .sort((a, b) => (b.fit_score || 0) - (a.fit_score || 0));

  const selectedCampaign = campaigns.find(c => c.id === Number(selectedCampaignId));
  const allSelected = isAllSelected(filteredLeads);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ position: 'relative', paddingBottom: selectedIds.size > 0 ? 90 : 0 }}>

      {/* ── Page Header & Action Controls ─────────────────────────────────── */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.25rem',
        flexWrap: 'wrap',
        gap: '1rem',
        paddingBottom: '0.75rem',
        borderBottom: '1px solid var(--border-light)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.25rem' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-main)', margin: 0 }}>
              Lead Discovery Pool
            </h1>
            <span style={{
              fontSize: '0.7rem', fontWeight: 700, padding: '2px 9px', borderRadius: 'var(--radius-full)',
              background: 'var(--success-light)', color: 'var(--success)', border: '1px solid rgba(16,185,129,0.3)',
              display: 'inline-flex', alignItems: 'center', gap: 4,
            }}>
              <Database size={11} /> PostgreSQL Dataset
            </span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: 0 }}>
            AI-ranked prospects filtered by campaign targeting rules and ideal customer profiles
          </p>
        </div>

        {/* Action Controls Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {/* Campaign Selector with Styled Wrap */}
          <div style={{ position: 'relative', minWidth: 230 }}>
            <select
              className="form-control"
              style={{
                fontSize: '0.82rem',
                fontWeight: 600,
                padding: '0.45rem 1.75rem 0.45rem 0.75rem',
                backgroundColor: 'var(--bg-input)',
                borderColor: 'var(--border)',
                color: 'var(--text-main)',
                width: '100%'
              }}
              value={selectedCampaignId || ''}
              onChange={(e) => {
                const id = Number(e.target.value);
                setSelectedCampaignId(id);
                if (setActiveCampaignId) setActiveCampaignId(id);
              }}
            >
              {campaigns.map(c => <option key={c.id} value={c.id}>{c.name} (#{c.id})</option>)}
            </select>
          </div>

          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setShowCsvModal(true)}
            style={{ fontSize: '0.8rem', padding: '0.45rem 0.75rem', gap: 5 }}
            title="Import contacts from CSV/Excel"
          >
            <UploadCloud size={14} /> Upload CSV
          </button>

          <button
            className="btn btn-ghost btn-sm"
            onClick={() => { setEditingLead(null); setShowManualModal(true); }}
            style={{ fontSize: '0.8rem', padding: '0.45rem 0.75rem', gap: 5 }}
            title="Add a custom lead directly"
          >
            <UserPlus size={14} /> Add Profile
          </button>

          <button
            className="btn btn-sm"
            onClick={handleRefresh}
            disabled={refreshing}
            style={{
              background: 'var(--gradient-accent)',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.8rem',
              padding: '0.45rem 0.9rem',
              gap: 6,
              boxShadow: '0 2px 8px rgba(232, 98, 44, 0.25)'
            }}
          >
            <RefreshCw size={13} style={{ animation: refreshing ? 'spin 0.7s linear infinite' : 'none' }} />
            {refreshing ? (discoveryStage || 'Discovering...') : 'Discover Leads'}
          </button>

          <button
            className="btn btn-sm"
            onClick={handleAcceptAllLeads}
            style={{
              background: 'var(--success-light)',
              color: '#059669',
              border: '1px solid rgba(16,185,129,0.35)',
              fontWeight: 700,
              fontSize: '0.8rem',
              padding: '0.45rem 0.9rem',
              gap: 5
            }}
          >
            <CheckCircle2 size={14} /> Accept All into Pipeline
          </button>
        </div>
      </div>

      {/* ── Dataset Validation Panel ───────────────────────────────────────── */}
      <DatasetValidationPanel compact={true} />

      {/* ── CSV Upload Modal ─────────────────────────────────────────────── */}
      <CsvUploadModal
        isOpen={showCsvModal}
        onClose={() => setShowCsvModal(false)}
        onSelectCsv={async (filename) => {
          if (selectedCampaignId) {
            setRefreshing(true);
            setDiscoveryStage(`Ingesting dataset '${filename}' into lead pool...`);
            try {
              if (filename) {
                await importCsvFile(filename, selectedCampaignId);
              }
              await discoverCampaignLeads(selectedCampaignId);
              await loadCampaignLeadPool(selectedCampaignId);
            } catch (err) {
              console.error('Error syncing dataset leads:', err);
              await loadCampaignLeadPool(selectedCampaignId);
            } finally {
              setRefreshing(false);
              setDiscoveryStage('');
            }
          }
        }}
      />

      {/* ── Manual Profile Modal ─────────────────────────────────────────── */}
      <ManualProfileModal
        isOpen={showManualModal}
        initialData={editingLead}
        onClose={() => { setShowManualModal(false); setEditingLead(null); }}
        onSaveSuccess={async () => {
          setShowManualModal(false);
          setEditingLead(null);
          await loadCampaignLeadPool(selectedCampaignId, true);
        }}
      />

      {/* ── Metrics Banner ───────────────────────────────────────────────── */}
      {statusMetrics && (
        <div style={{
          padding: '0.9rem 1.25rem',
          marginBottom: '1.25rem',
          borderRadius: 'var(--radius-lg)',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.98rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>Showing</span>
                <span style={{ color: 'var(--success)', background: 'var(--success-light)', padding: '1px 7px', borderRadius: 'var(--radius-sm)' }}>
                  {statusMetrics?.dataset_stats?.matched ?? leads.length}
                </span>
                <span>of</span>
                <span style={{ color: 'var(--accent)', background: 'var(--accent-light)', padding: '1px 7px', borderRadius: 'var(--radius-sm)' }}>
                  {statusMetrics?.dataset_stats?.total ?? leads.length}
                </span>
                <span>dataset profiles</span>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: 3, marginBottom: 0 }}>
                Campaign: <strong style={{ color: 'var(--text-sub)' }}>{statusMetrics.campaign_name}</strong>
                {selectedCampaign?.campaign_target && ` — Target: ${selectedCampaign.campaign_target}`}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              {[
                { label: 'Total', value: statusMetrics?.dataset_stats?.total ?? leads.length, color: 'var(--text-main)', bg: 'var(--bg-inner)' },
                { label: 'Matched', value: statusMetrics?.dataset_stats?.matched ?? leads.length, color: 'var(--success)', bg: 'var(--success-light)' },
                { label: 'Excluded', value: statusMetrics?.dataset_stats?.excluded ?? 0, color: 'var(--danger)', bg: 'var(--danger-light)' },
                { label: 'Qualified', value: statusMetrics?.dataset_stats?.qualified ?? statusMetrics.relevant_count, color: '#3b82f6', bg: 'var(--info-light)' },
              ].map(({ label, value, color, bg }) => (
                <div key={label} style={{
                  textAlign: 'center',
                  padding: '0.35rem 0.75rem',
                  borderRadius: 'var(--radius-md)',
                  background: bg,
                  border: '1px solid var(--border-light)',
                  minWidth: 68
                }}>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color }}>{value}</div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>{label}</div>
                </div>
              ))}

              <div style={{ height: 28, width: 1, backgroundColor: 'var(--border)', margin: '0 0.25rem' }} />

              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setShowCriteriaModal(true)}
                style={{ fontSize: '0.78rem', padding: '0.4rem 0.7rem', gap: 5 }}
              >
                <BrainCircuit size={13} /> Criteria
              </button>

              <button
                className="btn btn-sm"
                style={{
                  background: 'var(--warning-light)',
                  color: '#d97706',
                  border: '1px solid rgba(245,158,11,0.3)',
                  fontWeight: 600,
                  fontSize: '0.78rem',
                  padding: '0.4rem 0.75rem',
                  gap: 5
                }}
                onClick={triggerRegenerate}
                disabled={regenerating}
              >
                <RefreshCw size={12} style={{ animation: regenerating ? 'spin 0.7s linear infinite' : 'none' }} />
                {regenerating ? 'Regenerating...' : 'Regenerate Pool'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Search + Filter Bar ──────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1rem',
        flexWrap: 'wrap',
        gap: '0.75rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flex: 1, minWidth: 280 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'var(--bg-input)',
            padding: '0.45rem 0.85rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)',
            flex: 1,
            maxWidth: 380
          }}>
            <Search size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Search name, company, title, email, location..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-main)',
                fontSize: '0.85rem',
                width: '100%',
                outline: 'none'
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', padding: 2 }}
              >
                <X size={13} />
              </button>
            )}
          </div>

          <span style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            color: 'var(--success)',
            background: 'var(--success-light)',
            padding: '0.35rem 0.7rem',
            borderRadius: 'var(--radius-full)',
            border: '1px solid rgba(16,185,129,0.25)',
            whiteSpace: 'nowrap'
          }}>
            {filteredLeads.length} / {leads.length} profiles
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Filter size={14} style={{ color: 'var(--text-muted)' }} />
          <select
            className="form-control"
            style={{
              width: 200,
              fontSize: '0.82rem',
              padding: '0.4rem 0.65rem',
              backgroundColor: 'var(--bg-input)',
              borderColor: 'var(--border)',
              color: 'var(--text-main)'
            }}
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All Profiles ({leads.length})</option>
            <option value="QUALIFIED">Qualified ({leads.filter(l => !l.is_suppressed && !l.disqualified).length})</option>
            <option value="HIGH_FIT">High Fit 90%+ ({leads.filter(l => (l.fit_score || 0) >= 90).length})</option>
            <option value="SUPPRESSED">Suppressed ({leads.filter(l => l.is_suppressed).length})</option>
            <option value="DISQUALIFIED">Disqualified ({leads.filter(l => l.disqualified).length})</option>
          </select>
        </div>
      </div>

      {/* ── Bulk success toast ────────────────────────────────────────────── */}
      {bulkSuccess && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.7rem 1rem',
          borderRadius: 'var(--radius-md)',
          marginBottom: '1rem',
          background: 'var(--success-light)',
          border: '1px solid rgba(16,185,129,0.3)',
          color: 'var(--success)',
          fontWeight: 600,
          fontSize: '0.875rem',
        }}>
          <CheckCircle2 size={16} /> {bulkSuccess}
          <button
            onClick={() => setBulkSuccess('')}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--success)', cursor: 'pointer' }}
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* ── Lead Table ───────────────────────────────────────────────────── */}
      <div className="table-container" style={{
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-sm)',
        overflow: 'hidden'
      }}>
        <table>
          <thead>
            <tr>
              {/* Checkbox column */}
              <th style={{ width: 44, textAlign: 'center' }}>
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={() => toggleSelectAll(filteredLeads)}
                  style={{ width: 16, height: 16, accentColor: 'var(--accent)', cursor: 'pointer' }}
                  title={allSelected ? 'Deselect all' : 'Select all visible'}
                />
              </th>
              <th style={{ width: 140 }}>Source</th>
              <th>Lead / Prospect</th>
              <th>Company &amp; Industry</th>
              <th>Email Address</th>
              <th>Location</th>
              <th>Status</th>
              <th>Deal Workflow</th>
              <th style={{ textAlign: 'center' }}>Intelligence</th>
              <th style={{ textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="10" style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                    <div className="spinner spinner-lg" />
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                      {discoveryStage || 'Loading lead pool...'}
                    </span>
                  </div>
                </td>
              </tr>
            ) : filteredLeads.length === 0 ? (
              <tr>
                <td colSpan="10" style={{ textAlign: 'center', padding: '3.5rem 1.5rem' }}>
                  <AlertCircle size={36} style={{ color: 'var(--warning)', display: 'block', margin: '0 auto 0.75rem' }} />
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.4rem' }}>
                    No matching profiles found
                  </div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', maxWidth: 480, margin: '0 auto 1.25rem' }}>
                    Your dataset doesn't contain profiles matching the campaign criteria.
                    Upload a CSV with matching contacts or adjust the campaign target.
                  </p>
                  <button className="btn btn-sm" onClick={() => setShowCsvModal(true)} style={{ background: 'var(--gradient-accent)', color: '#fff' }}>
                    <UploadCloud size={14} /> Upload Matching CSV
                  </button>
                </td>
              </tr>
            ) : (
              filteredLeads.map((l) => {
                const isRowSelected = selectedIds.has(l.id);
                const inPipeline = l.deal_state && !['Lead Created', 'lead_created', 'Discovered', 'LEAD_CREATED'].includes(l.deal_state);
                const avatarStyle = getAvatarColor(l.name);
                const initials = getInitials(l.name);

                return (
                  <tr
                    key={l.id}
                    onClick={() => toggleSelect(l.id)}
                    style={{
                      backgroundColor: isRowSelected
                        ? 'var(--accent-light)'
                        : 'transparent',
                      borderLeft: isRowSelected ? '3px solid var(--accent)' : '3px solid transparent',
                      cursor: 'pointer',
                      transition: 'background 0.15s ease'
                    }}
                  >
                    {/* Checkbox */}
                    <td style={{ textAlign: 'center', verticalAlign: 'middle' }} onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isRowSelected}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleSelect(l.id);
                        }}
                        style={{ width: 16, height: 16, accentColor: 'var(--accent)', cursor: 'pointer' }}
                      />
                    </td>

                    {/* Source */}
                    <td style={{ verticalAlign: 'middle' }}>
                      <SourceBadge type={l.source_type || l.provider || 'excel'} url={l.source_url || l.profile_url} />
                    </td>

                    {/* Lead / Prospect with Initials Avatar */}
                    <td style={{ verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <div style={{
                          width: 32,
                          height: 32,
                          borderRadius: 'var(--radius-full)',
                          background: avatarStyle.bg,
                          color: avatarStyle.text,
                          border: `1px solid ${avatarStyle.border}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.75rem',
                          fontWeight: 800,
                          flexShrink: 0
                        }}>
                          {initials}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: isRowSelected ? 'var(--accent)' : 'var(--text-main)', fontSize: '0.88rem' }}>
                            {l.name}
                          </div>
                          <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>
                            {l.title || 'Professional'}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Company & Industry */}
                    <td style={{ verticalAlign: 'middle' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.85rem' }}>
                        {l.company || '—'}
                      </div>
                      <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>
                        {l.industry || 'General'}
                      </div>
                    </td>

                    {/* Email */}
                    <td style={{ verticalAlign: 'middle' }}>
                      {l.email && l.email.toLowerCase() !== 'not found' ? (
                        <div>
                          <div style={{ fontSize: '0.82rem', color: 'var(--text-main)', fontWeight: 500 }}>
                            {l.email}
                          </div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--success)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                            <Check size={10} /> Verified
                          </div>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-faint)' }}>Not available</span>
                      )}
                    </td>

                    {/* Location */}
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem', verticalAlign: 'middle' }}>
                      {l.location || '—'}
                    </td>

                    {/* Status */}
                    <td style={{ verticalAlign: 'middle' }}>
                      {l.is_suppressed ? (
                        <span className="badge" style={{ background: 'var(--warning-light)', color: '#d97706', border: '1px solid rgba(245,158,11,0.3)' }}>
                          <ShieldAlert size={11} /> Suppressed
                        </span>
                      ) : l.disqualified ? (
                        <span className="badge" style={{ background: 'var(--danger-light)', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.3)' }}>
                          <XCircle size={11} /> Disqualified
                        </span>
                      ) : (
                        <span className="badge" style={{ background: 'var(--success-light)', color: 'var(--success)', border: '1px solid rgba(16,185,129,0.3)' }}>
                          <CheckCircle size={11} /> Qualified
                        </span>
                      )}
                    </td>

                    {/* Deal Workflow */}
                    <td style={{ verticalAlign: 'middle' }}>
                      {inPipeline ? (
                        <span className="badge badge-emailed">
                          <CheckCircle2 size={11} /> In Pipeline
                        </span>
                      ) : (
                        <span className="badge badge-pending">Pending</span>
                      )}
                    </td>

                    {/* Intelligence */}
                    <td style={{ textAlign: 'center', verticalAlign: 'middle' }} onClick={e => e.stopPropagation()}>
                      <button
                        className="btn btn-sm"
                        style={{
                          fontSize: '0.72rem',
                          padding: '0.3rem 0.65rem',
                          background: 'var(--accent-light)',
                          color: 'var(--accent)',
                          border: '1px solid var(--border-glow)',
                          fontWeight: 700
                        }}
                        onClick={() => setSelectedLeadId(l.id)}
                      >
                        ✨ Lead 360°
                      </button>
                    </td>

                    {/* Action */}
                    <td style={{ textAlign: 'right', verticalAlign: 'middle' }} onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.35rem' }}>
                        {inPipeline ? (
                          <button
                            className="btn btn-sm btn-ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (setActiveCampaignId) setActiveCampaignId(selectedCampaignId);
                              if (setCurrentTab) setCurrentTab('deals');
                            }}
                            style={{ fontSize: '0.73rem', color: 'var(--accent)', fontWeight: 700 }}
                          >
                            In Deals →
                          </button>
                        ) : (
                          <button
                            className="btn btn-sm"
                            style={{
                              fontSize: '0.73rem',
                              background: 'var(--success-light)',
                              color: 'var(--success)',
                              border: '1px solid rgba(16,185,129,0.4)',
                              fontWeight: 700,
                              padding: '0.3rem 0.65rem'
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAcceptSingleLead(l.id);
                            }}
                          >
                            ✓ Accept
                          </button>
                        )}
                        <button
                          className="btn btn-sm"
                          style={{
                            fontSize: '0.73rem',
                            background: 'var(--danger-light)',
                            color: 'var(--danger)',
                            border: '1px solid rgba(239,68,68,0.25)',
                            padding: '0.3rem 0.5rem',
                            cursor: 'pointer'
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            triggerSingleDelete(l.id, l.name);
                          }}
                          title="Delete Lead Profile"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Lead 360 Modal ───────────────────────────────────────────────── */}
      {selectedLeadId && (
        <Lead360Modal leadId={selectedLeadId} onClose={() => setSelectedLeadId(null)} />
      )}

      {/* ── Search Criteria Modal ────────────────────────────────────────── */}
      {showCriteriaModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowCriteriaModal(false)}>
          <div className="modal-box" style={{ maxWidth: 580 }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <BrainCircuit size={18} color="var(--accent)" />
                <span className="modal-title">Campaign Search Criteria</span>
              </div>
              <button className="modal-close" onClick={() => setShowCriteriaModal(false)}><X size={18} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', padding: '0.5rem 0' }}>
              {[
                { label: 'Departments', val: statusMetrics?.strategy?.departments || statusMetrics?.strategy?.department, color: 'var(--success)' },
                { label: 'Seniority', val: statusMetrics?.strategy?.seniority_levels || statusMetrics?.strategy?.seniority, color: '#f59e0b' },
                { label: 'Job Titles', val: statusMetrics?.strategy?.job_titles || statusMetrics?.strategy?.job_title_keywords, color: 'var(--accent)' },
                { label: 'Locations', val: statusMetrics?.strategy?.locations || statusMetrics?.strategy?.country, color: '#3b82f6' },
                { label: 'Industries', val: statusMetrics?.strategy?.industries || statusMetrics?.strategy?.industry_list, color: '#ec4899' },
                { label: 'Keywords', val: statusMetrics?.strategy?.keywords, color: '#8b5cf6' },
              ].map(({ label, val, color }) => (
                <div key={label} style={{ background: 'var(--bg-inner)', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700 }}>
                    {label}
                  </div>
                  <div style={{ fontWeight: 600, color, fontSize: '0.85rem' }}>
                    {(Array.isArray(val) ? val : val ? [val] : []).join(', ') || 'Any'}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
              <button className="btn btn-ghost" onClick={() => setShowCriteriaModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Floating Bulk Action Bar ─────────────────────────────────────── */}
      {selectedIds.size > 0 && (
        <div style={{
          position: 'fixed',
          bottom: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 999,
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-full)',
          boxShadow: 'var(--shadow-lg), 0 0 24px rgba(232,98,44,0.18)',
          padding: '0.65rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          animation: 'slideUp 0.2s ease',
          backdropFilter: 'blur(12px)',
          minWidth: 420,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
            <ListChecks size={18} color="var(--accent)" />
            <span style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.88rem' }}>
              {selectedIds.size} lead{selectedIds.size !== 1 ? 's' : ''} selected
            </span>
          </div>

          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setSelectedIds(new Set())}
            style={{ fontSize: '0.8rem' }}
          >
            <X size={13} /> Clear
          </button>

          <button
            className="btn btn-sm"
            disabled={addingToDeals}
            onClick={triggerBulkDelete}
            style={{
              background: 'var(--danger-light)',
              color: 'var(--danger)',
              border: '1px solid rgba(239,68,68,0.3)',
              fontWeight: 700, fontSize: '0.8rem', padding: '0.45rem 0.85rem',
              gap: '0.35rem', display: 'flex', alignItems: 'center'
            }}
          >
            <Trash2 size={13} /> Delete ({selectedIds.size})
          </button>

          <button
            className="btn btn-sm"
            disabled={addingToDeals}
            onClick={handleBulkAddToDeals}
            style={{
              background: addingToDeals ? 'var(--accent-light)' : 'var(--gradient-accent)',
              color: '#ffffff',
              fontWeight: 700, fontSize: '0.82rem', padding: '0.45rem 1rem',
              gap: '0.4rem',
            }}
          >
            {addingToDeals
              ? <><div className="spinner" style={{ width: 13, height: 13, borderWidth: 2 }} /> Processing...</>
              : <><ArrowRight size={14} /> Add to Deals &amp; Pipeline</>
            }
          </button>
        </div>
      )}

      {/* Centered Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        isDanger={confirmModal.isDanger}
        loading={confirmModal.loading}
        onConfirm={async () => {
          setConfirmModal(prev => ({ ...prev, loading: true }));
          try {
            if (confirmModal.action) await confirmModal.action();
          } catch (err) {
            console.error(err);
          } finally {
            setConfirmModal({ isOpen: false, title: '', message: '', action: null, confirmText: 'Delete', isDanger: true, loading: false });
          }
        }}
        onClose={() => setConfirmModal({ isOpen: false, title: '', message: '', action: null, confirmText: 'Delete', isDanger: true, loading: false })}
      />
    </div>
  );
}
