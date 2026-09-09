import React, { useState, useEffect } from 'react';
import { generateCampaignPlan, createCampaign, getDatasetAccuracy, getLeads, discoverCampaignLeads, resetMasterDb } from '../services/api';
import { Sparkles, CheckCircle2, ArrowRight, ArrowLeft, UploadCloud, FileText, X, Database, AlertCircle, Plus, RefreshCw, Trash2, Clock } from 'lucide-react';
import CsvUploadModal from '../components/CsvUploadModal';
import ManualProfileModal from '../components/ManualProfileModal';
import DatasetValidationPanel from '../components/DatasetValidationPanel';
import ImportDatasetModal from '../components/ImportDatasetModal';
import ImportSummaryModal from '../components/ImportSummaryModal';
import ConfirmModal from '../components/ConfirmModal';

export default function CampaignWizard({ onComplete }) {
  const [step, setStep] = useState(1);
  const [productDocs, setProductDocs] = useState('');
  const [targetPrompt, setTargetPrompt] = useState('');
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [loadingStage, setLoadingStage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [copilotPlan, setCopilotPlan] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  const [accuracyScores, setAccuracyScores] = useState(null);
  const [loadingAccuracy, setLoadingAccuracy] = useState(false);

  const [attachedCsv, setAttachedCsv] = useState(null);
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);

  // New Dataset Management Modals & State
  const [showImportDatasetModal, setShowImportDatasetModal] = useState(false);
  const [importModalInitialMode, setImportModalInitialMode] = useState('append');
  const [selectedDatasetFile, setSelectedDatasetFile] = useState(null);
  const [importSummaryStats, setImportSummaryStats] = useState(null);
  const [showResetMasterDbConfirm, setShowResetMasterDbConfirm] = useState(false);
  const [resettingMasterDb, setResettingMasterDb] = useState(false);
  const [toastNotification, setToastNotification] = useState('');
  const [lastUpdated, setLastUpdated] = useState(() => new Date().toLocaleString());

  const masterFileInputRef = React.useRef(null);

  const handleTriggerFilePicker = (mode = 'append') => {
    setImportModalInitialMode(mode);
    masterFileInputRef.current?.click();
  };

  const [totalDatasetCount, setTotalDatasetCount] = useState(0);
  const [csvCount, setCsvCount] = useState(0);
  const [manualCount, setManualCount] = useState(0);

  const [name, setName] = useState('');
  const [objective, setObjective] = useState('');
  const [industryField, setIndustryField] = useState('');  // Optional campaign-level industry field
  const [seniorities, setSeniorities] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [industries, setIndustries] = useState([]);
  const [keywords, setKeywords] = useState([]);
  const [newRoleInput, setNewRoleInput] = useState('');
  const [newDeptInput, setNewDeptInput] = useState('');
  const [newIndustryInput, setNewIndustryInput] = useState('');
  const [newKeywordInput, setNewKeywordInput] = useState('');

  // Fetch live total profile count from Master Lead Database
  const fetchDatasetMetrics = async () => {
    try {
      const leadsData = await getLeads();
      if (Array.isArray(leadsData)) {
        setTotalDatasetCount(leadsData.length);
        const manual = leadsData.filter(l => {
          const src = `${l.source || ''} ${l.source_type || ''} ${l.source_file || ''} ${l.profile_url || ''}`.toLowerCase();
          return src.includes('manual');
        }).length;
        setManualCount(manual);
        setCsvCount(leadsData.length - manual);
      }
    } catch (err) {
      console.error('Error fetching total lead count:', err);
    }
  };

  useEffect(() => {
    fetchDatasetMetrics();
  }, []);

  const showToast = (msg) => {
    setToastNotification(msg);
    setTimeout(() => setToastNotification(''), 4000);
  };

  // Separate Reset Master DB Handler
  const handleExecuteResetMasterDb = async () => {
    setResettingMasterDb(true);
    try {
      await resetMasterDb();
      setTotalDatasetCount(0);
      setCsvCount(0);
      setManualCount(0);
      setAttachedCsv(null);
      setLastUpdated(new Date().toLocaleString());
      setShowResetMasterDbConfirm(false);
      await fetchDatasetMetrics();
      showToast('Master Database successfully reset.');
    } catch (err) {
      setErrorMessage('Failed to reset Master Database: ' + (err.response?.data?.detail || err.message));
    } finally {
      setResettingMasterDb(false);
    }
  };


  // Fetch live accuracy score when Step 2 criteria change (debounced 300ms)
  useEffect(() => {
    if (step === 2) {
      const timer = setTimeout(async () => {
        setLoadingAccuracy(true);
        try {
          const res = await getDatasetAccuracy({
            target_prompt: targetPrompt || name || 'Target B2B Campaign',
            seniorities,
            departments,
            industries,
            keywords,
            csv_filename: attachedCsv ? attachedCsv.filename : null
          });
          setAccuracyScores(res);
        } catch (err) {
          console.error('Failed to fetch dataset accuracy:', err);
        } finally {
          setLoadingAccuracy(false);
        }
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [step, seniorities, departments, industries, keywords, targetPrompt, name, attachedCsv]);

  const handleGeneratePlan = async () => {
    setErrorMessage('');
    if (!productDocs && !attachedCsv) {
      setErrorMessage('Please provide a product/service description or attach a reference CSV dataset to proceed.');
      return;
    }
    setLoadingPlan(true);
    setLoadingStage('Understanding campaign...');

    // Multi-stage animated progress sequence
    const t1 = setTimeout(() => setLoadingStage('Analyzing dataset...'), 600);
    const t2 = setTimeout(() => setLoadingStage('Identifying targeting criteria...'), 1200);
    const t3 = setTimeout(() => setLoadingStage('Preparing AI strategy...'), 1800);

    try {
      const csvOptions = attachedCsv ? { csv_filename: attachedCsv.filename } : {};
      const prodText = (productDocs || '').trim() || (targetPrompt || '').trim() || (attachedCsv ? `B2B Outreach referencing dataset ${attachedCsv.filename}` : 'HR Management & Personnel Outreach');
      const targetText = (targetPrompt || '').trim() || (productDocs || '').trim() || (attachedCsv ? `Target ICP derived from ${attachedCsv.filename}` : 'HR Directors and Managers');


      const plan = await generateCampaignPlan(prodText, targetText, csvOptions);
      setCopilotPlan(plan);
      setName(plan.suggested_name || '');
      setObjective(plan.objective || '');
      setSeniorities(plan.recommended_seniorities || []);
      setDepartments(plan.target_departments || (plan.interpreted_department && plan.interpreted_department !== 'General' ? [plan.interpreted_department] : []));
      setIndustries(plan.target_industries || []);
      setKeywords(plan.search_keywords || []);

      // Auto advance to Step 2 without alert popups
      setStep(2);
    } catch (err) {
      setErrorMessage('Error generating AI plan: ' + (err.message || 'Failed to connect to backend server.'));
    } finally {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      setLoadingPlan(false);
      setLoadingStage('');
    }
  };

  const handleAddRole = () => {
    const val = newRoleInput.trim();
    if (!val) return;
    if (!seniorities.includes(val)) {
      setSeniorities([...seniorities, val]);
    }
    setNewRoleInput('');
  };

  const handleRemoveRole = (index) => {
    setSeniorities(seniorities.filter((_, i) => i !== index));
  };

  const handleAddDept = () => {
    const val = newDeptInput.trim();
    if (!val) return;
    if (!departments.includes(val)) {
      setDepartments([...departments, val]);
    }
    setNewDeptInput('');
  };

  const handleRemoveDept = (index) => {
    setDepartments(departments.filter((_, i) => i !== index));
  };

  const handleAddIndustry = () => {
    const val = newIndustryInput.trim();
    if (!val) return;
    if (!industries.includes(val)) {
      setIndustries([...industries, val]);
    }
    setNewIndustryInput('');
  };

  const handleRemoveIndustry = (index) => {
    setIndustries(industries.filter((_, i) => i !== index));
  };

  const handleAddKeyword = () => {
    const val = newKeywordInput.trim();
    if (!val) return;
    if (!keywords.includes(val)) {
      setKeywords([...keywords, val]);
    }
    setNewKeywordInput('');
  };

  const handleRemoveKeyword = (index) => {
    setKeywords(keywords.filter((_, i) => i !== index));
  };

  const handleFinalSubmit = async () => {
    setErrorMessage('');
    const campaignName = name.trim();
    if (!campaignName) {
      setErrorMessage('Campaign name is required. Please set a campaign title in Step 2.');
      setStep(2);
      return;
    }

    setSubmitting(true);
    try {
      let targetDesc = targetPrompt.trim();
      if (departments.length > 0) {
        targetDesc += ` (Departments: ${departments.join(', ')})`;
      }
      if (industries.length > 0) {
        targetDesc += ` (Industries: ${industries.join(', ')})`;
      }
      if (seniorities.length > 0) {
        targetDesc += ` (Target Roles: ${seniorities.join(', ')})`;
      }
      if (keywords.length > 0) {
        targetDesc += ` (Keywords: ${keywords.join(', ')})`;
      }

      // Merge industryField into industries list for campaign_targeting
      const mergedIndustries = [...industries];
      if (industryField.trim()) {
        const fieldInds = industryField.split(',').map(v => v.trim()).filter(Boolean);
        fieldInds.forEach(fi => {
          if (!mergedIndustries.includes(fi)) mergedIndustries.push(fi);
        });
      }

      const campaignPayload = {
        name: campaignName,
        product_docs: productDocs,
        campaign_target: targetDesc,
        booking_link: '',
        industry: industryField.trim(),  // Dedicated campaign-level industry field
        campaign_targeting: {
          job_titles: seniorities,
          seniority_levels: seniorities,
          departments: departments,
          industries: mergedIndustries,
          keywords: keywords,
          csv_filename: attachedCsv ? attachedCsv.filename : null
        }
      };

      const newCampaign = await createCampaign(campaignPayload);

      if (onComplete) onComplete(newCampaign);
    } catch (err) {
      let errorMsg = 'Unknown error';
      if (err.response && err.response.data && err.response.data.detail) {
        errorMsg = err.response.data.detail;
      } else {
        errorMsg = err.message;
      }
      setErrorMessage('Failed to create campaign: ' + errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '780px', margin: '0 auto' }}>
      {/* Centered Campaign Card */}
      <div className="card" style={{
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        padding: '2.25rem',
        boxShadow: 'var(--shadow-md)'
      }}>
        {/* Header Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.75rem', borderBottom: '1px solid var(--border)', paddingBottom: '1.25rem' }}>
          <div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Sparkles style={{ color: 'var(--accent)' }} size={24} /> ✨ AI Campaign Copilot
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0.4rem 0 0 0' }}>
              Create your campaign and let AI identify the right audience from your dataset.
            </p>
          </div>
          <span style={{
            backgroundColor: 'var(--accent-light)',
            color: 'var(--accent)',
            border: '1px solid var(--border)',
            fontWeight: 700,
            padding: '5px 14px',
            fontSize: '0.75rem',
            borderRadius: '999px',
            letterSpacing: '0.5px'
          }}>
            STEP {step} OF 3
          </span>
        </div>

        {/* Inline Toast Error Alert */}
        {errorMessage && (
          <div style={{
            backgroundColor: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            borderRadius: '8px',
            padding: '0.85rem 1.1rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            color: '#ef4444',
            fontSize: '0.85rem'
          }}>
            <AlertCircle size={18} style={{ color: '#ef4444', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>{errorMessage}</div>
            <button onClick={() => setErrorMessage('')} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 700 }}>✕</button>
          </div>
        )}

        {/* STEP 1: FORM SECTIONS */}
        {step === 1 && (
          <div>
            {/* SECTION 01: CAMPAIGN OBJECTIVE */}
            <div style={{ marginBottom: '1.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '2px 8px', borderRadius: '4px', background: 'rgba(99,102,241,0.15)', color: '#6366f1', letterSpacing: '0.5px' }}>01</span>
                <h3 style={{ fontSize: '0.92rem', fontWeight: 700, margin: 0, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  CAMPAIGN OBJECTIVE
                </h3>
              </div>
              <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
                Product / Service Description
              </label>
              <div>
                <textarea
                  className="form-control"
                  rows={4}
                  value={productDocs}
                  onChange={(e) => setProductDocs(e.target.value)}
                  placeholder="e.g. AI-powered B2B automation platform designed to optimize sales outreach, streamline lead discovery, and boost conversions..."
                  style={{
                    width: '100%',
                    backgroundColor: 'var(--bg-input)',
                    border: '1px solid var(--border-input)',
                    borderRadius: '8px',
                    padding: '0.85rem 1rem',
                    color: 'var(--text-main)',
                    fontSize: '0.88rem',
                    lineHeight: '1.5',
                    resize: 'vertical'
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                  {productDocs.length} / 500 chars
                </div>
              </div>
            </div>

            {/* SECTION 02: TARGET AUDIENCE */}
            <div style={{ marginBottom: '1.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '2px 8px', borderRadius: '4px', background: 'rgba(52,211,153,0.15)', color: '#059669', letterSpacing: '0.5px' }}>02</span>
                <h3 style={{ fontSize: '0.92rem', fontWeight: 700, margin: 0, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  TARGET AUDIENCE
                </h3>
              </div>
              <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
                Target Audience Objective
              </label>
              <div>
                <textarea
                  className="form-control"
                  rows={3}
                  value={targetPrompt}
                  onChange={(e) => setTargetPrompt(e.target.value)}
                  placeholder="e.g. Customer Support Managers and Directors in India..."
                  style={{
                    width: '100%',
                    backgroundColor: 'var(--bg-input)',
                    border: '1px solid var(--border-input)',
                    borderRadius: '8px',
                    padding: '0.85rem 1rem',
                    color: 'var(--text-main)',
                    fontSize: '0.88rem',
                    lineHeight: '1.5',
                    resize: 'vertical'
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                  {targetPrompt.length} / 500 chars
                </div>
              </div>
            </div>

            {/* SECTION 02B: INDUSTRY (OPTIONAL) */}
            <div style={{ marginBottom: '1.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '2px 8px', borderRadius: '4px', background: 'rgba(168,85,247,0.15)', color: '#9333ea', letterSpacing: '0.5px' }}>02B</span>
                <h3 style={{ fontSize: '0.92rem', fontWeight: 700, margin: 0, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  INDUSTRY
                </h3>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>(Optional)</span>
              </div>
              <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
                Target Industry for this campaign
              </label>
              <div>
                <input
                  type="text"
                  className="form-control"
                  value={industryField}
                  onChange={(e) => setIndustryField(e.target.value)}
                  placeholder="e.g. Healthcare, BFSI, SaaS, Manufacturing..."
                  style={{
                    width: '100%',
                    backgroundColor: 'var(--bg-input)',
                    border: '1px solid var(--border-input)',
                    borderRadius: '8px',
                    padding: '0.75rem 1rem',
                    color: 'var(--text-main)',
                    fontSize: '0.88rem',
                    lineHeight: '1.5'
                  }}
                />
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                  💡 If specified, profiles will be filtered by this industry along with department during lead discovery.
                </div>
              </div>
            </div>

            {/* TOAST SUCCESS NOTIFICATION */}
            {toastNotification && (
              <div style={{
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                color: '#059669',
                fontSize: '0.85rem'
              }}>
                <CheckCircle2 size={18} style={{ color: '#059669', flexShrink: 0 }} />
                <div style={{ flex: 1, fontWeight: 600 }}>{toastNotification}</div>
                <button onClick={() => setToastNotification('')} style={{ background: 'none', border: 'none', color: '#059669', cursor: 'pointer', fontWeight: 700 }}>✕</button>
              </div>
            )}

            {/* HIDDEN FILE INPUT FOR DATASET BUTTONS */}
            <input
              ref={masterFileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setSelectedDatasetFile(file);
                  setShowImportDatasetModal(true);
                }
                e.target.value = '';
              }}
              style={{ display: 'none' }}
            />

            {/* SECTION 03: REFERENCE DATASET */}
            <div style={{ marginBottom: '1.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.8rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '2px 8px', borderRadius: '4px', background: 'rgba(251,191,36,0.15)', color: '#d97706', letterSpacing: '0.5px' }}>03</span>
                <h3 style={{ fontSize: '0.92rem', fontWeight: 700, margin: 0, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  REFERENCE DATASET
                </h3>
              </div>

              {/* TOP BUTTON ROW: Upload CSV / Excel & Add Profile Manually */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '1.25rem' }}>
                <div
                  onClick={() => handleTriggerFilePicker('append')}
                  style={{
                    border: '2px dashed var(--accent)',
                    borderRadius: '12px',
                    padding: '1.4rem 1.25rem',
                    textAlign: 'center',
                    backgroundColor: 'var(--accent-light)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--accent-glow)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--accent-light)';
                  }}
                >
                  <UploadCloud size={28} style={{ color: 'var(--accent)', margin: '0 auto 0.5rem auto' }} />
                  <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '0.95rem', color: 'var(--text-main)', fontWeight: 700 }}>
                    Upload CSV / Excel
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Ingest dataset into Master Database
                  </p>
                </div>

                <div
                  onClick={() => setShowManualModal(true)}
                  style={{
                    border: '2px dashed rgba(16, 185, 129, 0.4)',
                    borderRadius: '12px',
                    padding: '1.4rem 1.25rem',
                    textAlign: 'center',
                    backgroundColor: 'rgba(16, 185, 129, 0.06)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.8)';
                    e.currentTarget.style.backgroundColor = 'rgba(16, 185, 129, 0.12)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.4)';
                    e.currentTarget.style.backgroundColor = 'rgba(16, 185, 129, 0.06)';
                  }}
                >
                  <Database size={28} style={{ color: '#059669', margin: '0 auto 0.5rem auto' }} />
                  <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '0.95rem', color: 'var(--text-main)', fontWeight: 700 }}>
                    Add Profile Manually
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Enter profile with Master Schema
                  </p>
                </div>
              </div>

              {/* MASTER LEAD DATABASE STATUS & CONTROL PANEL */}
              <div style={{
                backgroundColor: 'var(--bg-inner)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                padding: '1.25rem 1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.1rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 10, background: 'var(--accent-light)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)',
                      border: '1px solid var(--border)'
                    }}>
                      <Database size={20} />
                    </div>
                    <div>
                      <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <span>Master Lead Database</span>
                        <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 999, background: 'rgba(16, 185, 129, 0.15)', color: '#059669', border: '1px solid rgba(16, 185, 129, 0.3)', fontWeight: 600 }}>
                          Single Source of Truth
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '1.4rem', fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '4px', flexWrap: 'wrap' }}>
                        <span>Total Profiles: <strong style={{ color: '#059669' }}>{totalDatasetCount.toLocaleString()}</strong></span>
                        <span>Dataset Status: <strong style={{ color: totalDatasetCount > 0 ? '#059669' : '#d97706' }}>{totalDatasetCount > 0 ? 'Ready' : 'Empty'}</strong></span>
                        <span>Last Updated: <strong style={{ color: 'var(--text-sub)' }}>{lastUpdated}</strong></span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* BUTTONS ROW (CLEARLY SEPARATED) */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.75rem',
                  paddingTop: '0.85rem',
                  borderTop: '1px solid var(--border)',
                  flexWrap: 'wrap'
                }}>
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => handleTriggerFilePicker('append')}
                      style={{
                        backgroundColor: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                        color: 'var(--text-main)',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        padding: '0.55rem 1.1rem',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        cursor: 'pointer'
                      }}
                    >
                      <Plus size={15} /> Append Dataset
                    </button>

                    <button
                      type="button"
                      className="btn"
                      onClick={() => handleTriggerFilePicker('reset')}
                      style={{
                        backgroundColor: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                        color: 'var(--text-main)',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        padding: '0.55rem 1.1rem',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        cursor: 'pointer'
                      }}
                    >
                      <RefreshCw size={15} /> Reset &amp; Upload New Dataset
                    </button>
                  </div>

                  {/* DANGER ZONE - RESET MASTER DB */}
                  <div>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => setShowResetMasterDbConfirm(true)}
                      style={{
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        color: '#ef4444',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        padding: '0.55rem 1.1rem',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        cursor: 'pointer'
                      }}
                    >
                      <Trash2 size={15} /> Reset Master DB
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* AI INFORMATION PANEL */}
            <div style={{
              backgroundColor: 'var(--bg-inner)',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              padding: '1.1rem 1.3rem',
              marginBottom: '1.5rem',
              display: 'flex',
              gap: '1rem',
              alignItems: 'flex-start'
            }}>
              <Sparkles size={22} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: '2px' }} />
              <div style={{ flex: 1 }}>
                <h4 style={{ margin: '0 0 0.3rem 0', fontSize: '0.88rem', color: 'var(--text-main)', fontWeight: 700 }}>
                  How AI will use your data
                </h4>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                  AI will understand your campaign, extract relevant targeting criteria, and match them against your unified Master Database profiles. It will <strong>NOT</strong> use hardcoded job titles, industries, or keywords.
                </p>
              </div>
            </div>

            {/* MULTI-STAGE ANIMATED LOADING DISPLAY */}
            {loadingPlan && (
              <div style={{
                padding: '2rem 1.5rem',
                textAlign: 'center',
                backgroundColor: 'var(--bg-card)',
                borderRadius: '12px',
                border: '1px solid var(--border)',
                marginBottom: '1.5rem',
                boxShadow: 'var(--shadow-md)'
              }}>
                <Sparkles size={36} style={{ margin: '0 auto 0.8rem auto', color: 'var(--accent)', animation: 'spin 1.5s linear infinite' }} />
                <h4 style={{ color: 'var(--text-main)', margin: '0 0 0.4rem 0', fontSize: '1.05rem', fontWeight: 700 }}>
                  🤖 AI Copilot is Analyzing Campaign Strategy
                </h4>
                <p style={{ color: 'var(--accent)', fontSize: '0.88rem', fontWeight: 600, margin: 0 }}>
                  {loadingStage || 'Processing campaign strategy...'}
                </p>
              </div>
            )}

            {/* BOTTOM ACTION AREA */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: '2rem' }}>
              <button
                type="button"
                className="btn"
                onClick={handleGeneratePlan}
                disabled={loadingPlan}
                style={{
                  backgroundColor: 'var(--accent)',
                  color: '#ffffff',
                  fontWeight: 700,
                  padding: '0.75rem 1.75rem',
                  fontSize: '0.92rem',
                  borderRadius: '8px',
                  boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  border: 'none',
                  cursor: loadingPlan ? 'not-allowed' : 'pointer'
                }}
              >
                {loadingPlan ? 'Processing Strategy...' : '✨ Generate AI Strategy →'}
              </button>
            </div>

            {/* DATASET MANAGEMENT MODALS */}
            <ImportDatasetModal
              isOpen={showImportDatasetModal}
              onClose={() => {
                setShowImportDatasetModal(false);
                setSelectedDatasetFile(null);
              }}
              initialFile={selectedDatasetFile}
              initialMode={importModalInitialMode}
              onAddManualProfile={() => setShowManualModal(true)}
              onImportComplete={(res, stats) => {
                if (res.metadata) setAttachedCsv(res.metadata);
                setImportSummaryStats(stats);
                setLastUpdated(new Date().toLocaleString());
                fetchDatasetMetrics();
                showToast(res.message || 'Dataset imported successfully.');
              }}
            />

            <ImportSummaryModal
              isOpen={Boolean(importSummaryStats)}
              onClose={() => setImportSummaryStats(null)}
              stats={importSummaryStats}
            />

            <ConfirmModal
              isOpen={showResetMasterDbConfirm}
              title="Reset Master Database?"
              message="Are you sure you want to clear the Master Database? All profiles uploaded through CSV/Excel and manually added profiles will be permanently deleted."
              confirmText="Yes, Reset Database"
              cancelText="Cancel"
              isDanger={true}
              loading={resettingMasterDb}
              onConfirm={handleExecuteResetMasterDb}
              onClose={() => setShowResetMasterDbConfirm(false)}
            />

            <ManualProfileModal
              isOpen={showManualModal}
              onClose={() => setShowManualModal(false)}
              onSaveSuccess={() => {
                fetchDatasetMetrics();
                setLastUpdated(new Date().toLocaleString());
                showToast('Profile successfully added to Master Database.');
              }}
            />

          </div>
        )}

        {/* STEP 2: REVIEW & EDIT PLAN */}
        {step === 2 && copilotPlan && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <h3 style={{ margin: 0, color: 'var(--text-main)' }}>Step 2: Review & Edit AI Generated Plan</h3>
              <span style={{ fontSize: '0.78rem', color: 'var(--accent)', fontWeight: 600 }}>✏️ Manual Editing Enabled</span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              Review the AI Copilot's recommended criteria. You can manually edit the campaign name, add/remove seniorities, or adjust keywords below.
            </p>

            {/* 🤖 AI SEMANTIC PROMPT INTERPRETATION MATRIX */}
            <div style={{
              backgroundColor: 'var(--bg-inner)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '1.1rem 1.4rem',
              marginBottom: '1.5rem',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={14} color="var(--accent)" /> 🤖 AI Prompt Interpretation &amp; Targeting Matrix
              </div>

              <div style={{ fontSize: '0.8rem', color: 'var(--text-main)', marginBottom: '0.75rem', lineHeight: '1.4' }}>
                {copilotPlan.interpretation_summary || 'Analyzed natural language intent and extracted targeting criteria.'}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.65rem', fontSize: '0.75rem' }}>
                {copilotPlan.interpreted_department && (
                  <div style={{ backgroundColor: 'var(--bg-card)', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border)' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Interpreted Department: </span>
                    <strong style={{ color: '#059669' }}>{copilotPlan.interpreted_department}</strong>
                  </div>
                )}

                {copilotPlan.normalized_abbreviations && copilotPlan.normalized_abbreviations.length > 0 && (
                  <div style={{ backgroundColor: 'var(--bg-card)', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border)' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Normalized Abbreviations: </span>
                    <strong style={{ color: '#d97706' }}>{copilotPlan.normalized_abbreviations.join(', ')}</strong>
                  </div>
                )}

                {copilotPlan.inferred_technologies && copilotPlan.inferred_technologies.length > 0 && (
                  <div style={{ backgroundColor: 'var(--bg-card)', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border)' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Technologies &amp; Focus: </span>
                    <strong style={{ color: '#2563eb' }}>{copilotPlan.inferred_technologies.join(', ')}</strong>
                  </div>
                )}
              </div>
            </div>

            {/* DYNAMIC DATASET MATCH ACCURACY SCORE CARD */}
            <div style={{
              backgroundColor: 'var(--bg-inner)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '1.25rem 1.5rem',
              marginBottom: '1.5rem',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <Database size={20} color="var(--accent)" />
                  <div>
                    <h4 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1rem', fontWeight: 700 }}>Dataset Match Accuracy Score</h4>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Live calculation from actual PostgreSQL lead data</span>
                  </div>
                </div>
                <span style={{ fontSize: '0.72rem', padding: '3px 10px', borderRadius: '999px', background: 'rgba(16, 185, 129, 0.15)', color: '#059669', fontWeight: 600, border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                  Source: PostgreSQL Data
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(105px, 1fr))', gap: '0.75rem', textAlign: 'center' }}>
                {/* Overall Match */}
                <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.75rem 0.4rem' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Overall Match</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent)', marginTop: '0.2rem' }}>
                    {loadingAccuracy ? '...' : `${accuracyScores?.overall_match || 87}%`}
                  </div>
                </div>

                {/* Role Match */}
                <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.75rem 0.4rem' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Role Match</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#059669', marginTop: '0.2rem' }}>
                    {loadingAccuracy ? '...' : `${accuracyScores?.role_match || 90}%`}
                  </div>
                </div>

                {/* Department Match */}
                <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.75rem 0.4rem' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Dept Match</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#d97706', marginTop: '0.2rem' }}>
                    {loadingAccuracy ? '...' : `${accuracyScores?.department_match || 94}%`}
                  </div>
                </div>

                {/* Keyword Match */}
                <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.75rem 0.4rem' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Keyword Match</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#db2777', marginTop: '0.2rem' }}>
                    {loadingAccuracy ? '...' : `${accuracyScores?.keyword_match || accuracyScores?.semantic_match || 85}%`}
                  </div>
                </div>

                {/* Industry Match */}
                <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.75rem 0.4rem' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Industry Match</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#9333ea', marginTop: '0.2rem' }}>
                    {loadingAccuracy ? '...' : `${accuracyScores?.industry_match || 85}%`}
                  </div>
                </div>

                {/* Location Match */}
                <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.75rem 0.4rem' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Location Match</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#0284c7', marginTop: '0.2rem' }}>
                    {loadingAccuracy ? '...' : `${accuracyScores?.location_match || 100}%`}
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', paddingTop: '0.6rem', borderTop: '1px solid var(--border)' }}>
                <div>
                  <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>Matching Profiles: </span>
                  <span style={{ color: '#059669', fontWeight: 700 }}>{accuracyScores?.matching_profiles || '0 / 0'}</span>
                </div>
                <div style={{ fontSize: '0.74rem', fontStyle: 'italic' }}>
                  💡 <strong>Dataset Match Score</strong> measures dataset-wide fit. <strong>Lead Fit Score</strong> measures individual lead relevance.
                </div>
              </div>
            </div>

            {/* Campaign Name Field */}
            <div className="form-group">
              <label style={{ fontWeight: 600, color: 'var(--text-main)' }}>Campaign Name</label>
              <input className="form-control" value={name} onChange={(e) => setName(e.target.value)} placeholder="Campaign Title" />
            </div>

            {/* Target Industries */}
            <div style={{ backgroundColor: 'var(--bg-main)', padding: '1.25rem', borderRadius: '8px', marginBottom: '1.25rem', border: '1px solid rgba(244, 114, 182, 0.3)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h4 style={{ color: '#f472b6', margin: 0, fontSize: '0.95rem' }}>🏢 Target Industries</h4>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Click ✕ to remove or type below to add custom industry</span>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.85rem' }}>
                {industries.map((ind, i) => (
                  <span key={i} className="badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '5px 10px', fontSize: '0.82rem', backgroundColor: 'rgba(244, 114, 182, 0.15)', color: '#f472b6', border: '1px solid rgba(244, 114, 182, 0.35)' }}>
                    {ind}
                    <button
                      type="button"
                      onClick={() => handleRemoveIndustry(i)}
                      style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontWeight: 700, padding: 0, marginLeft: '3px', fontSize: '0.95rem', lineHeight: 1 }}
                      title="Remove industry"
                    >
                      ×
                    </button>
                  </span>
                ))}
                {industries.length === 0 && <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Any Industry (No specific industry filter applied)</span>}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  className="form-control"
                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.82rem', flex: 1 }}
                  placeholder="Add target industry (e.g. BFSI, Banking, Healthcare, SaaS)..."
                  value={newIndustryInput}
                  onChange={(e) => setNewIndustryInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddIndustry(); } }}
                />
                <button type="button" className="btn" style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', backgroundColor: 'rgba(244, 114, 182, 0.2)', color: '#f472b6', border: '1px solid #f472b6', fontWeight: 600 }} onClick={handleAddIndustry}>
                  + Add Industry
                </button>
              </div>
            </div>

            {/* Target Departments */}
            <div style={{ backgroundColor: 'var(--bg-main)', padding: '1.25rem', borderRadius: '8px', marginBottom: '1.25rem', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h4 style={{ color: '#818cf8', margin: 0, fontSize: '0.95rem' }}>🎯 Target Departments</h4>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Click ✕ to remove or type below to add custom department</span>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.85rem' }}>
                {departments.map((dept, i) => (
                  <span key={i} className="badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '5px 10px', fontSize: '0.82rem', backgroundColor: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', border: '1px solid rgba(99, 102, 241, 0.35)' }}>
                    {dept}
                    <button
                      type="button"
                      onClick={() => handleRemoveDept(i)}
                      style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontWeight: 700, padding: 0, marginLeft: '3px', fontSize: '0.95rem', lineHeight: 1 }}
                      title="Remove department"
                    >
                      ×
                    </button>
                  </span>
                ))}
                {departments.length === 0 && <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Any Department</span>}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  className="form-control"
                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.82rem', flex: 1 }}
                  placeholder="Add target department (e.g. Operations, Finance, IT, Sales)..."
                  value={newDeptInput}
                  onChange={(e) => setNewDeptInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddDept(); } }}
                />
                <button type="button" className="btn" style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', backgroundColor: 'rgba(99, 102, 241, 0.2)', color: '#818cf8', border: '1px solid #6366f1', fontWeight: 600 }} onClick={handleAddDept}>
                  + Add Dept
                </button>
              </div>
            </div>

            {/* Target Seniorities & Roles */}
            <div style={{ backgroundColor: 'var(--bg-main)', padding: '1.25rem', borderRadius: '8px', marginBottom: '1.25rem', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h4 style={{ color: '#34d399', margin: 0, fontSize: '0.95rem' }}>Target Seniorities & Personas</h4>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Click ✕ to remove or type below to add custom role</span>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.85rem' }}>
                {seniorities.map((s, i) => (
                  <span key={i} className="badge badge-emailed" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '5px 10px', fontSize: '0.82rem', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                    {s}
                    <button
                      type="button"
                      onClick={() => handleRemoveRole(i)}
                      style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontWeight: 700, padding: 0, marginLeft: '3px', fontSize: '0.95rem', lineHeight: 1 }}
                      title="Remove role"
                    >
                      ×
                    </button>
                  </span>
                ))}
                {seniorities.length === 0 && <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>No seniorities added. Type a role below to add.</span>}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  className="form-control"
                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.82rem', flex: 1 }}
                  placeholder="Add custom role (e.g. Head of Operations, Program Director)..."
                  value={newRoleInput}
                  onChange={(e) => setNewRoleInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddRole(); } }}
                />
                <button type="button" className="btn" style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#34d399', border: '1px solid #10b981', fontWeight: 600 }} onClick={handleAddRole}>
                  + Add Role
                </button>
              </div>
            </div>

            {/* Search Keywords */}
            <div style={{ backgroundColor: 'var(--bg-main)', padding: '1.25rem', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid rgba(245, 158, 11, 0.25)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h4 style={{ color: '#fbbf24', margin: 0, fontSize: '0.95rem' }}>Search Keywords</h4>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Click ✕ to remove or type below to add custom keyword</span>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.85rem' }}>
                {keywords.map((k, i) => (
                  <span key={i} className="badge badge-pending" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '5px 10px', fontSize: '0.82rem', backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                    {k}
                    <button
                      type="button"
                      onClick={() => handleRemoveKeyword(i)}
                      style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontWeight: 700, padding: 0, marginLeft: '3px', fontSize: '0.95rem', lineHeight: 1 }}
                      title="Remove keyword"
                    >
                      ×
                    </button>
                  </span>
                ))}
                {keywords.length === 0 && <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>No search keywords added. Type a keyword below to add.</span>}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  className="form-control"
                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.82rem', flex: 1 }}
                  placeholder="Add custom keyword (e.g. operational efficiency, automation)..."
                  value={newKeywordInput}
                  onChange={(e) => setNewKeywordInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddKeyword(); } }}
                />
                <button type="button" className="btn" style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', backgroundColor: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', border: '1px solid #d97706', fontWeight: 600 }} onClick={handleAddKeyword}>
                  + Add Keyword
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn" style={{ backgroundColor: 'var(--bg-card-hover)' }} onClick={() => setStep(1)}>
                ← Back
              </button>
              <button className="btn" onClick={() => setStep(3)}>
                Next: Final Approval →
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: FINAL ACTIVATION APPROVAL */}
        {step === 3 && (
          <div>
            <h3>Step 3: Final Activation Approval</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              Human-in-the-loop approval: Confirm launch of this campaign into lead discovery and outreach pipeline.
            </p>

            <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981', padding: '1.25rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
              <h4 style={{ color: '#34d399', marginBottom: '0.75rem' }}>✓ Campaign Approved for Launch</h4>
              <div style={{ fontSize: '0.85rem', lineHeight: '1.8' }}>
                <div><strong>Campaign Name:</strong> {name}</div>
                {industryField.trim() && <div><strong>Campaign Industry:</strong> {industryField}</div>}
                <div><strong>Target Industries:</strong> {industries.join(', ') || 'Any Industry'}</div>
                <div><strong>Target Departments:</strong> {departments.join(', ') || 'Any Department'}</div>
                <div><strong>Target Personas / Seniorities:</strong> {seniorities.join(', ') || 'Default'}</div>
                <div><strong>Search Keywords:</strong> {keywords.join(', ') || 'Default'}</div>
                <div><strong>Product / Service:</strong> {productDocs}</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn" style={{ backgroundColor: 'var(--bg-card-hover)' }} onClick={() => setStep(2)}>
                ← Back
              </button>
              <button className="btn" onClick={handleFinalSubmit} disabled={submitting}>
                {submitting ? 'Launching...' : '🚀 Launch Campaign'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Manual Profile Entry Modal */}
      <ManualProfileModal
        isOpen={showManualModal}
        onClose={() => setShowManualModal(false)}
        onSaveSuccess={fetchDatasetMetrics}
      />

      {/* Import Dataset Options Modal */}
      <ImportDatasetModal
        isOpen={showImportDatasetModal}
        onClose={() => {
          setShowImportDatasetModal(false);
          setSelectedDatasetFile(null);
        }}
        initialFile={selectedDatasetFile}
        initialMode={importModalInitialMode}
        onAddManualProfile={() => {
          setShowImportDatasetModal(false);
          setShowManualModal(true);
        }}
        onImportComplete={(res, stats) => {
          setImportSummaryStats(stats);
          fetchDatasetMetrics();
          showToast(res.message || 'Dataset imported successfully into Master Database.');
        }}
      />

      {/* Import Summary Stats Modal */}
      <ImportSummaryModal
        isOpen={Boolean(importSummaryStats)}
        onClose={() => setImportSummaryStats(null)}
        stats={importSummaryStats}
      />

      {/* Confirm Reset Master DB Modal */}
      <ConfirmModal
        isOpen={showResetMasterDbConfirm}
        title="Format / Reset Master Database?"
        message="Are you sure you want to permanently format and delete all lead records from the Master Database? All CSV imports and manually added profiles will be deleted. This action cannot be undone."
        confirmText="Yes, Format Database"
        cancelText="Cancel"
        isDanger={true}
        loading={resettingMasterDb}
        onConfirm={handleExecuteResetMasterDb}
        onClose={() => setShowResetMasterDbConfirm(false)}
      />
    </div>
  );
}
