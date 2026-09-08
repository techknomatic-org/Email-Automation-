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
  ExternalLink, UploadCloud, CheckCircle2, ListChecks, ChevronDown, X, Trash2, Edit3
} from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';



// ── small helpers ────────────────────────────────────────────────────────────
function fitColor(score) {
  if (score >= 80) return '#10b981';
  if (score >= 65) return '#818cf8';
  return '#ef4444';
}

function FitBar({ score }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <span style={{ fontWeight: 700, fontSize: '0.85rem', color: fitColor(score) }}>{score}%</span>
      <div style={{ height: 4, borderRadius: 3, background: 'var(--border)', width: 60 }}>
        <div style={{ height: '100%', width: `${score}%`, borderRadius: 3, background: fitColor(score), transition: 'width 0.3s ease' }} />
      </div>
    </div>
  );
}

function SourceBadge({ type, url }) {
  const label = (type || 'excel').toUpperCase().replace(/_/g, ' ');
  const inner = (
    <span style={{
      fontSize: '0.68rem', fontWeight: 700, padding: '2px 7px', borderRadius: 'var(--radius-full)',
      background: url ? 'var(--success-light)' : 'var(--accent-light)',
      color: url ? '#34d399' : '#818cf8',
      border: `1px solid ${url ? 'rgba(16,185,129,0.3)' : 'rgba(99,102,241,0.3)'}`,
      display: 'inline-flex', alignItems: 'center', gap: 3, letterSpacing: '0.04em',
    }}>
      {label} {url && <ExternalLink size={9} />}
    </span>
  );
  return url
    ? <a href={url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>{inner}</a>
    : inner;
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
      setLoading(false); // Instant render from cache! No spinner on navigation!
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

    // Instant UI tab transition to Deals & Pipeline!
    if (setActiveCampaignId) setActiveCampaignId(selectedCampaignId);
    if (setActiveLeadId) setActiveLeadId(leadId);
    if (setCurrentTab) setCurrentTab('deals');

    try {
      // Fast backend update
      await acceptLead(selectedCampaignId, leadId);

      // Update Leads local state & cache
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

  // ── Bulk "Add to Deals & Pipeline" (Instant Navigation + Batch SQL) ───────────
  const handleBulkAddToDeals = async () => {
    if (selectedIds.size === 0 || addingToDeals) return;
    const targetLeadIds = Array.from(selectedIds);
    const acceptedSet = new Set(targetLeadIds);

    setAddingToDeals(true);

    // Instant UI tab transition to Deals & Pipeline!
    if (setActiveCampaignId) setActiveCampaignId(selectedCampaignId);
    if (setActiveLeadId && targetLeadIds.length > 0) setActiveLeadId(targetLeadIds[0]);
    if (setCurrentTab) setCurrentTab('deals');

    try {
      // 1. Batch backend update
      await acceptBatchLeads(selectedCampaignId, targetLeadIds);

      // 2. Update Leads local state & cache
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

      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.25rem' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em' }}>Lead Discovery Pool</h1>
            <span style={{
              fontSize: '0.68rem', fontWeight: 700, padding: '2px 9px', borderRadius: 'var(--radius-full)',
              background: 'var(--success-light)', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)',
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <Database size={10} /> PostgreSQL Dataset
            </span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
            AI-ranked prospects filtered by campaign targeting rules
          </p>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          {/* Campaign selector */}
          <select
            className="form-control"
            style={{ width: 240, fontSize: '0.85rem', fontWeight: 600, padding: '0.45rem 0.75rem' }}
            value={selectedCampaignId || ''}
            onChange={(e) => {
              const id = Number(e.target.value);
              setSelectedCampaignId(id);
              if (setActiveCampaignId) setActiveCampaignId(id);
            }}
          >
            {campaigns.map(c => <option key={c.id} value={c.id}>{c.name} (#{c.id})</option>)}
          </select>

          <button className="btn btn-ghost btn-sm" onClick={() => setShowCsvModal(true)}>
            <UploadCloud size={14} /> Upload CSV
          </button>

          <button className="btn btn-ghost btn-sm" onClick={() => { setEditingLead(null); setShowManualModal(true); }}>
            <Database size={14} /> Add Profile Manually
          </button>

          <button className="btn btn-sm" onClick={handleRefresh} disabled={refreshing}
            style={{ background: 'var(--gradient-accent)' }}>
            <RefreshCw size={13} style={{ animation: refreshing ? 'spin 0.7s linear infinite' : 'none' }} />
            {refreshing ? discoveryStage || 'Discovering...' : 'Discover Leads'}
          </button>

          <button
            className="btn btn-sm"
            onClick={handleAcceptAllLeads}
            style={{ background: 'var(--success-light)', color: '#34d399', border: '1px solid rgba(16,185,129,0.4)', fontWeight: 700 }}
          >
            <CheckCircle2 size={14} /> Accept All into Pipeline
          </button>
        </div>
      </div>

      {/* ── Dataset Validation ───────────────────────────────────────────── */}
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

      {/* ── Metrics Banner ───────────────────────────────────────────────── */}
      {statusMetrics && (
        <div style={{
          padding: '1rem 1.25rem', marginBottom: '1.25rem', borderRadius: 'var(--radius-lg)',
          background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                Showing&nbsp;
                <span style={{ color: '#34d399' }}>{statusMetrics?.dataset_stats?.matched ?? leads.length}</span>
                &nbsp;of&nbsp;
                <span style={{ color: '#818cf8' }}>{statusMetrics?.dataset_stats?.total ?? leads.length}</span>
                &nbsp;dataset profiles
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: 3 }}>
                Campaign: <strong style={{ color: 'var(--text-sub)' }}>{statusMetrics.campaign_name}</strong>
                {selectedCampaign?.campaign_target && ` — Target: ${selectedCampaign.campaign_target}`}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center', flexWrap: 'wrap' }}>
              {[
                { label: 'Total', value: statusMetrics?.dataset_stats?.total ?? leads.length, color: 'var(--text-sub)', bg: 'rgba(255,255,255,0.04)' },
                { label: 'Matched', value: statusMetrics?.dataset_stats?.matched ?? leads.length, color: '#34d399', bg: 'rgba(16,185,129,0.08)' },
                { label: 'Excluded', value: statusMetrics?.dataset_stats?.excluded ?? 0, color: '#f87171', bg: 'rgba(239,68,68,0.08)' },
                { label: 'Qualified', value: statusMetrics?.dataset_stats?.qualified ?? statusMetrics.relevant_count, color: '#a5b4fc', bg: 'rgba(129,140,248,0.08)' },
              ].map(({ label, value, color, bg }) => (
                <div key={label} style={{ textAlign: 'center', padding: '0.4rem 0.8rem', borderRadius: 8, background: bg, border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color }}>{value}</div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                </div>
              ))}

              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setShowCriteriaModal(true)}
              >
                <BrainCircuit size={13} /> Criteria
              </button>
              <button
                className="btn btn-sm"
                style={{ background: 'var(--warning-light)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.3)', fontWeight: 600 }}
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.65rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flex: 1, minWidth: 280 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-card)', padding: '0.45rem 0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', flex: 1, maxWidth: 380 }}>
            <Search size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Search name, company, title, email..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', fontSize: '0.85rem', width: '100%', outline: 'none' }}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}>
                <X size={13} />
              </button>
            )}
          </div>

          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#34d399', background: 'var(--success-light)', padding: '0.35rem 0.65rem', borderRadius: 'var(--radius-full)', border: '1px solid rgba(16,185,129,0.25)', whiteSpace: 'nowrap' }}>
            {filteredLeads.length} / {leads.length} profiles
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Filter size={14} style={{ color: 'var(--text-muted)' }} />
          <select
            className="form-control"
            style={{ width: 190, fontSize: '0.8rem', padding: '0.4rem 0.65rem' }}
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
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          padding: '0.7rem 1rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem',
          background: 'var(--success-light)', border: '1px solid rgba(16,185,129,0.3)',
          color: '#34d399', fontWeight: 600, fontSize: '0.875rem',
        }}>
          <CheckCircle2 size={16} /> {bulkSuccess}
          <button onClick={() => setBulkSuccess('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#34d399', cursor: 'pointer' }}>
            <X size={13} />
          </button>
        </div>
      )}

      {/* ── Lead Table ───────────────────────────────────────────────────── */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              {/* Checkbox column */}
              <th style={{ width: 40, textAlign: 'center' }}>
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={() => toggleSelectAll(filteredLeads)}
                  style={{ width: 15, height: 15, accentColor: 'var(--accent)', cursor: 'pointer' }}
                  title={allSelected ? 'Deselect all' : 'Select all visible'}
                />
              </th>
              <th>Source</th>
              <th>Lead / Prospect</th>
              <th>Company &amp; Industry</th>
              <th>Email Address</th>
              <th>Location</th>
              <th>Status</th>
              <th>Deal Workflow</th>
              <th>Intelligence</th>
              <th style={{ textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="10" style={{ textAlign: 'center', padding: '3rem' }}>
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
                <td colSpan="10" style={{ textAlign: 'center', padding: '3rem' }}>
                  <AlertCircle size={32} style={{ color: '#f59e0b', display: 'block', margin: '0 auto 0.6rem' }} />
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.4rem' }}>
                    No matching profiles found
                  </div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', maxWidth: 480, margin: '0 auto 1rem' }}>
                    Your dataset doesn't contain profiles matching the campaign criteria.
                    Upload a CSV with matching contacts or adjust the campaign target.
                  </p>
                  <button className="btn btn-sm" onClick={() => setShowCsvModal(true)}>
                    <UploadCloud size={14} /> Upload Matching CSV
                  </button>
                </td>
              </tr>
            ) : (
              filteredLeads.map((l) => {
                const isRowSelected = selectedIds.has(l.id);
                const inPipeline = l.deal_state && !['Lead Created', 'lead_created', 'Discovered', 'LEAD_CREATED'].includes(l.deal_state);

                return (
                  <tr
                    key={l.id}
                    onClick={() => toggleSelect(l.id)}
                    style={{
                      backgroundColor: isRowSelected
                        ? 'rgba(99,102,241,0.12)'
                        : 'transparent',
                      borderLeft: isRowSelected ? '3px solid var(--accent)' : '3px solid transparent',
                      cursor: 'pointer',
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
                    <td>
                      <SourceBadge type={l.source_type || l.provider || 'excel'} url={l.source_url || l.profile_url} />
                    </td>

                    {/* Lead / Prospect */}
                    <td>
                      <div style={{ fontWeight: 600, color: isRowSelected ? '#a5b4fc' : 'var(--text-main)' }}>{l.name}</div>
                      <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>{l.title}</div>
                    </td>

                    {/* Company & Industry */}
                    <td>
                      <div style={{ fontWeight: 500, color: 'var(--text-sub)' }}>{l.company}</div>
                      <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>{l.industry}</div>
                    </td>

                    {/* Email */}
                    <td>
                      {l.email && l.email.toLowerCase() !== 'not found' ? (
                        <>
                          <div style={{ fontSize: '0.83rem', color: 'var(--text-sub)' }}>{l.email}</div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--success)' }}>✓ Verified</div>
                        </>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--warning)' }}>Not verified</span>
                      )}
                    </td>

                    {/* Location */}
                    <td style={{ color: 'var(--text-sub)', fontSize: '0.83rem' }}>{l.location || '—'}</td>

                    {/* Status */}

                    <td>
                      {l.is_suppressed ? (
                        <span className="badge" style={{ background: 'var(--warning-light)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}>
                          <ShieldAlert size={11} /> Suppressed
                        </span>
                      ) : l.disqualified ? (
                        <span className="badge" style={{ background: 'var(--danger-light)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>
                          <XCircle size={11} /> Disqualified
                        </span>
                      ) : (
                        <span className="badge" style={{ background: 'var(--success-light)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}>
                          <CheckCircle size={11} /> Qualified
                        </span>
                      )}
                    </td>

                    {/* Deal Workflow */}
                    <td>
                      {inPipeline ? (
                        <span className="badge badge-emailed">
                          <CheckCircle2 size={11} /> In Pipeline
                        </span>
                      ) : (
                        <span className="badge badge-pending">Pending</span>
                      )}
                    </td>

                    {/* Intelligence */}
                    <td onClick={e => e.stopPropagation()}>
                      <button
                        className="btn btn-sm"
                        style={{ fontSize: '0.73rem', padding: '0.28rem 0.6rem', background: 'var(--accent-light)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)', fontWeight: 600 }}
                        onClick={() => setSelectedLeadId(l.id)}
                      >
                        ✨ Lead 360°
                      </button>
                    </td>

                    {/* Action */}
                    <td style={{ textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.4rem' }}>
                        {inPipeline ? (
                          <button
                            className="btn btn-sm btn-ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (setActiveCampaignId) setActiveCampaignId(selectedCampaignId);
                              if (setCurrentTab) setCurrentTab('deals');
                            }}
                            style={{ fontSize: '0.73rem', color: '#818cf8', fontWeight: 600 }}
                          >
                            View in Deals →
                          </button>
                        ) : (
                          <button
                            className="btn btn-sm"
                            style={{ fontSize: '0.73rem', background: 'var(--success-light)', color: '#34d399', border: '1px solid rgba(16,185,129,0.4)', fontWeight: 700 }}
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
                          style={{ fontSize: '0.73rem', background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)', padding: '0.28rem 0.5rem', cursor: 'pointer' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            triggerSingleDelete(l.id, l.name);
                          }}
                          title="Delete Lead"
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {[
                { label: 'Departments', val: statusMetrics?.strategy?.departments || statusMetrics?.strategy?.department, color: '#34d399' },
                { label: 'Seniority', val: statusMetrics?.strategy?.seniority_levels || statusMetrics?.strategy?.seniority, color: '#fbbf24' },
                { label: 'Job Titles', val: statusMetrics?.strategy?.job_titles || statusMetrics?.strategy?.job_title_keywords, color: '#c7d2fe' },
                { label: 'Locations', val: statusMetrics?.strategy?.locations || statusMetrics?.strategy?.country, color: '#a5b4fc' },
                { label: 'Industries', val: statusMetrics?.strategy?.industries || statusMetrics?.strategy?.industry_list, color: '#f472b6' },
                { label: 'Keywords', val: statusMetrics?.strategy?.keywords, color: '#38bdf8' },
              ].map(({ label, val, color }) => (
                <div key={label}>
                  <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                  <div style={{ fontWeight: 600, color, fontSize: '0.85rem' }}>
                    {(Array.isArray(val) ? val : val ? [val] : []).join(', ') || 'Any'}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
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
          border: '1px solid var(--border-light)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-lg), 0 0 32px rgba(99,102,241,0.2)',
          padding: '0.85rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1.25rem',
          animation: 'slideUp 0.2s ease',
          backdropFilter: 'blur(12px)',
          minWidth: 420,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
            <ListChecks size={18} color="var(--accent)" />
            <span style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.9rem' }}>
              {selectedIds.size} lead{selectedIds.size !== 1 ? 's' : ''} selected
            </span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>· click rows to deselect</span>
          </div>

          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setSelectedIds(new Set())}
          >
            <X size={13} /> Clear
          </button>

          <button
            className="btn"
            disabled={addingToDeals}
            onClick={triggerBulkDelete}
            style={{
              background: 'rgba(239,68,68,0.15)',
              color: '#f87171',
              border: '1px solid rgba(239,68,68,0.4)',
              fontWeight: 700, fontSize: '0.85rem', padding: '0.55rem 1rem',
              gap: '0.4rem', display: 'flex', alignItems: 'center'
            }}
          >
            <Trash2 size={14} /> Delete Selected ({selectedIds.size})
          </button>

          <button
            className="btn"
            disabled={addingToDeals}
            onClick={handleBulkAddToDeals}
            style={{
              background: addingToDeals ? 'var(--accent-light)' : 'var(--gradient-accent)',
              fontWeight: 700, fontSize: '0.875rem', padding: '0.55rem 1.25rem',
              gap: '0.5rem',
            }}
          >
            {addingToDeals
              ? <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Processing...</>
              : <><ArrowRight size={15} /> Add to Deals &amp; Pipeline</>
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
