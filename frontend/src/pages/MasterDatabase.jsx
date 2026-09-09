import React, { useState, useEffect } from 'react';
import {
  Database, UploadCloud, Plus, RefreshCw, Trash2, Search,
  Users, FileText, CheckCircle2, AlertCircle, Filter, Copy, Check
} from 'lucide-react';
import { getLeads, resetMasterDb } from '../services/api';
import ImportDatasetModal from '../components/ImportDatasetModal';
import ImportSummaryModal from '../components/ImportSummaryModal';
import ConfirmModal from '../components/ConfirmModal';
import ManualProfileModal from '../components/ManualProfileModal';

export default function MasterDatabase() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState('ALL');

  // Metrics
  const [totalCount, setTotalCount] = useState(0);
  const [csvCount, setCsvCount] = useState(0);
  const [manualCount, setManualCount] = useState(0);
  const [lastUpdated, setLastUpdated] = useState(() => new Date().toLocaleString());

  // Modals & Triggers
  const [showImportModal, setShowImportModal] = useState(false);
  const [importInitialMode, setImportInitialMode] = useState('append');
  const [selectedFile, setSelectedFile] = useState(null);
  const [importSummaryStats, setImportSummaryStats] = useState(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resettingDb, setResettingDb] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);

  // Toast
  const [toastMsg, setToastMsg] = useState('');
  const [copiedEmail, setCopiedEmail] = useState(null);

  const fileInputRef = React.useRef(null);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4000);
  };

  const fetchLeadsData = async () => {
    setLoading(true);
    try {
      const data = await getLeads();
      if (Array.isArray(data)) {
        setLeads(data);
        setTotalCount(data.length);

        const manual = data.filter(l => {
          const src = `${l.source || ''} ${l.source_type || ''} ${l.source_file || ''} ${l.profile_url || ''}`.toLowerCase();
          return src.includes('manual');
        }).length;

        setManualCount(manual);
        setCsvCount(data.length - manual);
        setLastUpdated(new Date().toLocaleString());
      }
    } catch (err) {
      console.error('Failed to fetch leads from Master Database:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeadsData();
  }, []);

  const handleTriggerFilePicker = (mode = 'append') => {
    setImportInitialMode(mode);
    fileInputRef.current?.click();
  };

  const handleFileChosen = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setShowImportModal(true);
    }
    e.target.value = '';
  };

  const handleExecuteResetDb = async () => {
    setResettingDb(true);
    try {
      await resetMasterDb();
      setLeads([]);
      setTotalCount(0);
      setCsvCount(0);
      setManualCount(0);
      setLastUpdated(new Date().toLocaleString());
      setShowResetConfirm(false);
      await fetchLeadsData();
      showToast('Master Database successfully formatted & reset.');
    } catch (err) {
      alert('Failed to reset Master Database: ' + (err.response?.data?.detail || err.message));
    } finally {
      setResettingDb(false);
    }
  };

  const handleCopyEmail = (email) => {
    if (!email) return;
    navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  // Filtered Leads Calculation
  const filteredLeads = leads.filter(l => {
    const matchesSearch =
      !searchQuery ||
      `${l.first_name || ''} ${l.last_name || ''}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.company_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.job_title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.department || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.source || '').toLowerCase().includes(searchQuery.toLowerCase());

    const srcLower = `${l.source || ''} ${l.source_type || ''} ${l.source_file || ''}`.toLowerCase();
    const matchesSource =
      sourceFilter === 'ALL' ||
      (sourceFilter === 'MANUAL' && srcLower.includes('manual')) ||
      (sourceFilter === 'CSV' && !srcLower.includes('manual'));

    return matchesSearch && matchesSource;
  });

  return (
    <div className="page-container" style={{ paddingBottom: '3rem' }}>
      {/* Toast Notification */}
      {toastMsg && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 99999,
          backgroundColor: '#10b981',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: '10px',
          fontWeight: 600,
          fontSize: '0.9rem',
          boxShadow: '0 10px 25px rgba(16, 185, 129, 0.4)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          animation: 'slideUp 0.2s ease'
        }}>
          <CheckCircle2 size={18} /> {toastMsg}
        </div>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        onChange={handleFileChosen}
        style={{ display: 'none' }}
      />

      {/* Page Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '1.75rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
            <div style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: 'var(--accent-light)',
              border: '1px solid rgba(232, 98, 44, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent)'
            }}>
              <Database size={22} />
            </div>
            <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)' }}>
              Master Database
            </h1>
            <span style={{
              fontSize: '0.75rem',
              padding: '2px 10px',
              borderRadius: 999,
              background: 'var(--success-light)',
              color: '#059669',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              fontWeight: 700
            }}>
              Single Source of Truth
            </span>
          </div>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            Manage unified lead dataset profiles, CSV/Excel ingestion, and profile deduplication.
          </p>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => handleTriggerFilePicker('append')}
            style={{
              padding: '0.65rem 1.25rem',
              fontSize: '0.88rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              cursor: 'pointer'
            }}
          >
            <UploadCloud size={16} /> Upload / Add Dataset
          </button>

          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setShowManualModal(true)}
            style={{
              padding: '0.65rem 1.1rem',
              fontSize: '0.88rem',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              cursor: 'pointer',
              color: 'var(--accent)',
              border: '1px solid var(--border)'
            }}
          >
            <Plus size={16} /> Add Profile Manually
          </button>

          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setShowResetConfirm(true)}
            style={{
              border: '1px solid rgba(239, 68, 68, 0.35)',
              color: '#ef4444',
              fontWeight: 600,
              padding: '0.65rem 1.1rem',
              fontSize: '0.88rem',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              cursor: 'pointer'
            }}
          >
            <Trash2 size={16} /> Format / Reset DB
          </button>
        </div>
      </div>

      {/* Database KPI Metrics Overview Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: '1rem',
        marginBottom: '1.75rem'
      }}>
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '1.1rem 1.25rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Total Profiles
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: '0.5rem' }}>
            <span style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)' }}>
              {totalCount.toLocaleString()}
            </span>
            <span style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: 999,
              background: totalCount > 0 ? 'var(--success-light)' : 'var(--warning-light)',
              color: totalCount > 0 ? '#059669' : '#d97706',
              border: `1px solid ${totalCount > 0 ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`
            }}>
              {totalCount > 0 ? 'Ready' : 'Empty'}
            </span>
          </div>
        </div>

        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '1.1rem 1.25rem',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
            CSV / Excel Imports
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--accent)', marginTop: '0.5rem' }}>
            {csvCount.toLocaleString()}
          </div>
        </div>

        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '1.1rem 1.25rem',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
            Manual Entries
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#d97706', marginTop: '0.5rem' }}>
            {manualCount.toLocaleString()}
          </div>
        </div>

        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '1.1rem 1.25rem',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
            Last Sync / Update
          </div>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-sub)', marginTop: '0.75rem' }}>
            {lastUpdated}
          </div>
        </div>
      </div>

      {/* Search & Source Filter Bar */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '1rem 1.25rem',
        marginBottom: '1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        flexWrap: 'wrap',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{
          position: 'relative',
          flex: '1',
          minWidth: '260px'
        }}>
          <Search size={17} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search Master DB profiles by name, title, company, email, department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              backgroundColor: 'var(--bg-input)',
              border: '1px solid var(--border-input)',
              borderRadius: '8px',
              padding: '0.55rem 0.85rem 0.55rem 2.4rem',
              color: 'var(--text-main)',
              fontSize: '0.88rem'
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            <Filter size={15} /> Source:
          </div>
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            style={{
              backgroundColor: 'var(--bg-input)',
              border: '1px solid var(--border-input)',
              borderRadius: '8px',
              padding: '0.55rem 0.85rem',
              color: 'var(--text-main)',
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            <option value="ALL">All Sources</option>
            <option value="CSV">CSV / Excel Uploads</option>
            <option value="MANUAL">Manual Entries</option>
          </select>
        </div>
      </div>

      {/* Profiles Data Table */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-sm)'
      }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <RefreshCw size={24} className="spin" style={{ marginBottom: '0.5rem', color: 'var(--accent)' }} />
            <div>Loading Master Database profiles...</div>
          </div>
        ) : filteredLeads.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
            <Database size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
            <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-main)', fontWeight: 700 }}>
              {totalCount === 0 ? 'Master Database is Empty' : 'No Matching Profiles Found'}
            </h3>
            <p style={{ margin: '0 0 1.5rem 0', color: 'var(--text-muted)', fontSize: '0.88rem', maxWidth: '420px', marginLeft: 'auto', marginRight: 'auto' }}>
              {totalCount === 0
                ? 'Upload your first CSV or Excel file to populate the unified Master Database.'
                : 'Try adjusting your search query or source filter.'}
            </p>
            {totalCount === 0 && (
              <button
                type="button"
                className="btn"
                onClick={() => handleTriggerFilePicker('append')}
                style={{
                  padding: '0.65rem 1.35rem',
                  fontSize: '0.88rem',
                  borderRadius: '8px',
                  border: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  cursor: 'pointer',
                  backgroundColor: 'var(--accent)',
                  color: '#ffffff',
                  fontWeight: 700
                }}
              >
                <UploadCloud size={16} /> Upload First Dataset
              </button>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-inner)', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.85rem 1rem' }}>Profile Name</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Job Title &amp; Seniority</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Company &amp; Dept</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Contact Email</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Industry &amp; Location</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Source</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map((lead) => {
                  const fullName = `${lead.first_name || ''} ${lead.last_name || ''}`.trim() || 'Unnamed Lead';
                  const srcLower = `${lead.source || ''} ${lead.source_file || ''}`.toLowerCase();
                  const isManual = srcLower.includes('manual');

                  return (
                    <tr
                      key={lead.id}
                      style={{
                        borderBottom: '1px solid var(--border)',
                        transition: 'background 0.15s ease'
                      }}
                    >
                      <td style={{ padding: '0.85rem 1rem', color: 'var(--text-main)', fontWeight: 600 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <div style={{
                            width: 30, height: 30, borderRadius: '50%',
                            background: isManual ? 'rgba(245, 158, 11, 0.15)' : 'var(--accent-light)',
                            color: isManual ? '#d97706' : 'var(--accent)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.78rem', fontWeight: 700
                          }}>
                            {fullName.charAt(0).toUpperCase()}
                          </div>
                          <span>{fullName}</span>
                        </div>
                      </td>

                      <td style={{ padding: '0.85rem 1rem', color: 'var(--text-sub)' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{lead.job_title || '—'}</div>
                        {lead.seniority && (
                          <span style={{
                            fontSize: '0.7rem', color: 'var(--accent)', background: 'var(--accent-light)',
                            padding: '1px 6px', borderRadius: 4, display: 'inline-block', marginTop: 2, fontWeight: 600
                          }}>
                            {lead.seniority}
                          </span>
                        )}
                      </td>

                      <td style={{ padding: '0.85rem 1rem', color: 'var(--text-sub)' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{lead.company_name || '—'}</div>
                        {lead.department && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{lead.department}</div>
                        )}
                      </td>

                      <td style={{ padding: '0.85rem 1rem', color: 'var(--text-sub)' }}>
                        {lead.email ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <span style={{ color: '#0284c7', fontWeight: 600 }}>{lead.email}</span>
                            <button
                              type="button"
                              onClick={() => handleCopyEmail(lead.email)}
                              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 2 }}
                              title="Copy Email"
                            >
                              {copiedEmail === lead.email ? <Check size={13} style={{ color: '#059669' }} /> : <Copy size={13} />}
                            </button>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>No email</span>
                        )}
                      </td>

                      <td style={{ padding: '0.85rem 1rem', color: 'var(--text-sub)' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{lead.industry || '—'}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{lead.country || lead.country_code || 'Global'}</div>
                      </td>

                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span style={{
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: '6px',
                          backgroundColor: isManual ? 'rgba(245, 158, 11, 0.15)' : 'var(--accent-light)',
                          color: isManual ? '#d97706' : 'var(--accent)',
                          border: `1px solid ${isManual ? 'rgba(245, 158, 11, 0.3)' : 'var(--border)'}`
                        }}>
                          {isManual ? 'Manual Entry' : (lead.source_file || lead.source || 'CSV Import')}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODALS */}
      <ImportDatasetModal
        isOpen={showImportModal}
        onClose={() => {
          setShowImportModal(false);
          setSelectedFile(null);
        }}
        initialFile={selectedFile}
        initialMode={importInitialMode}
        onAddManualProfile={() => setShowManualModal(true)}
        onImportComplete={(res, stats) => {
          setImportSummaryStats(stats);
          fetchLeadsData();
          showToast(res.message || 'Dataset imported successfully.');
        }}
      />

      <ImportSummaryModal
        isOpen={Boolean(importSummaryStats)}
        onClose={() => setImportSummaryStats(null)}
        stats={importSummaryStats}
      />

      <ConfirmModal
        isOpen={showResetConfirm}
        title="Format / Reset Master Database?"
        message="Are you sure you want to permanently format and delete all lead records from the Master Database? All CSV imports and manually added profiles will be deleted. This action cannot be undone."
        confirmText="Yes, Format Database"
        cancelText="Cancel"
        isDanger={true}
        loading={resettingDb}
        onConfirm={handleExecuteResetDb}
        onClose={() => setShowResetConfirm(false)}
      />

      <ManualProfileModal
        isOpen={showManualModal}
        onClose={() => setShowManualModal(false)}
        onSaveSuccess={() => {
          fetchLeadsData();
          showToast('Profile successfully added to Master Database.');
        }}
      />
    </div>
  );
}
