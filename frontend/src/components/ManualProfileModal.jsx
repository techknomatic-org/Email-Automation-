import React, { useState, useEffect } from 'react';
import { X, User, Building2, MapPin, Briefcase, DollarSign, ShieldCheck, AlertTriangle, Check, Plus, Save, ArrowLeft, ArrowRight, Eye } from 'lucide-react';
import { checkLeadDuplicate, executeLeadDuplicateAction, createLead, updateLead, getLead } from '../services/api';
import ExistingProfileViewModal from './ExistingProfileViewModal';

export default function ManualProfileModal({ isOpen, onClose, onSaveSuccess, initialData = null }) {
  const [activeTab, setActiveTab] = useState('identity');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState(null); // stores duplicate match response
  const [viewingExistingLead, setViewingExistingLead] = useState(null);
  const [loadingExisting, setLoadingExisting] = useState(false);

  const isEditMode = Boolean(initialData && initialData.id);

  const defaultFormData = {
    // Identity & Contact
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    job_title: '',
    profile_url: '',
    linkedin_url: '',

    // Company Information
    company_name: '',
    company_website: '',
    company_domain: '',
    industry: '',
    company_info: '',
    company_size: '',
    company_revenue: '',
    company_founded_year: '',

    // Location Information
    country: '',
    country_code: '',
    state: '',
    city: '',
    location: '',
    timezone: '',

    // Professional / ICP Information
    seniority: '',
    department: '',
    skills: '',
    technologies: '',
    keywords: '',
    profile_headline: '',
    profile_summary: '',

    // Business Information
    products_services: '',
    business_model: '',
    funding_stage: '',
    funding_amount: '',
    last_funding_date: '',

    // Lead Verification & Source (Source automatically MANUAL_ENTRY)
    email_status: 'valid',
    email_verified: true,
    profile_verified: true,
    company_verified: true,
    data_source: 'Master Database',
    source: 'MANUAL_ENTRY',
    source_id: '',
  };

  const [formData, setFormData] = useState(defaultFormData);

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...defaultFormData,
        ...initialData,
        skills: Array.isArray(initialData.skills) ? initialData.skills.join(', ') : (initialData.skills || ''),
        technologies: Array.isArray(initialData.technologies) ? initialData.technologies.join(', ') : (initialData.technologies || ''),
        keywords: Array.isArray(initialData.keywords) ? initialData.keywords.join(', ') : (initialData.keywords || ''),
        source: 'MANUAL_ENTRY'
      });
    } else {
      setFormData(defaultFormData);
    }
    setErrorMsg('');
    setDuplicateWarning(null);
    setViewingExistingLead(null);
    setActiveTab('identity');
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateRequired = () => {
    if (!formData.first_name.trim()) return 'First Name is required.';
    if (!formData.last_name.trim()) return 'Last Name is required.';
    if (!formData.email.trim() || !formData.email.includes('@')) return 'Valid Email address is required.';
    if (!formData.job_title.trim()) return 'Job Title is required.';
    if (!formData.company_name.trim()) return 'Company Name is required.';
    if (!formData.industry.trim()) return 'Industry is required.';
    if (!formData.country.trim()) return 'Country is required.';
    if (!formData.seniority.trim()) return 'Seniority is required.';
    if (!formData.department.trim()) return 'Department is required.';
    return null;
  };

  const preparePayload = () => {
    const parseList = (val) => {
      if (Array.isArray(val)) return val;
      if (!val) return [];
      return String(val).split(',').map(s => s.trim()).filter(Boolean);
    };

    const normEmail = (formData.email || '').trim().toLowerCase();

    return {
      ...formData,
      email: normEmail,
      skills: parseList(formData.skills),
      technologies: parseList(formData.technologies),
      keywords: parseList(formData.keywords),
      company_info: formData.company_info || formData.company_description || '',
      source: 'MANUAL_ENTRY',
      source_type: 'MANUAL_ENTRY',
      data_source: 'Master Database'
    };
  };

  const handleSubmit = async (addAnother = false) => {
    setErrorMsg('');
    const valErr = validateRequired();
    if (valErr) {
      setErrorMsg(valErr);
      return;
    }

    setSaving(true);
    const payload = preparePayload();

    try {
      if (isEditMode) {
        await updateLead(initialData.id, payload);
        if (onSaveSuccess) onSaveSuccess();
        onClose();
        return;
      }

      // Check for duplicate prior to insertion
      let dupCheck = null;
      try {
        dupCheck = await checkLeadDuplicate(payload);
      } catch (checkErr) {
        console.warn('Duplicate check endpoint bypassed:', checkErr);
      }

      if (dupCheck && dupCheck.is_duplicate) {
        setDuplicateWarning({
          ...dupCheck,
          payload,
          addAnother
        });
        setSaving(false);
        return;
      }

      // If no duplicate, append new manual profile to Master DB
      await createLead(payload);
      if (onSaveSuccess) onSaveSuccess();

      if (addAnother) {
        setFormData(defaultFormData);
        setActiveTab('identity');
        setErrorMsg('Profile created! You can add another below.');
      } else {
        onClose();
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || err.message || 'Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleFetchViewExisting = async () => {
    if (!duplicateWarning || !duplicateWarning.matched_lead_id) return;
    setLoadingExisting(true);
    try {
      const existing = await getLead(duplicateWarning.matched_lead_id);
      setViewingExistingLead(existing);
    } catch (err) {
      setErrorMsg('Could not fetch existing lead details: ' + err.message);
    } finally {
      setLoadingExisting(false);
    }
  };


  const handleExecuteDuplicateAction = async (actionType) => {
    if (!duplicateWarning) return;
    setSaving(true);
    try {
      await executeLeadDuplicateAction({
        action: actionType,
        existing_lead_id: duplicateWarning.matched_lead_id,
        lead_data: duplicateWarning.payload
      });

      const addAnother = duplicateWarning.addAnother;
      setDuplicateWarning(null);

      if (onSaveSuccess) onSaveSuccess();

      if (addAnother) {
        setFormData(defaultFormData);
        setActiveTab('identity');
        setErrorMsg('Action completed! You can add another profile.');
      } else {
        onClose();
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to execute duplicate action.');
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'identity', label: 'Identity & Contact', icon: User },
    { id: 'company', label: 'Company Info', icon: Building2 },
    { id: 'location', label: 'Location', icon: MapPin },
    { id: 'icp', label: 'Professional / ICP', icon: Briefcase },
    { id: 'business', label: 'Business Info', icon: DollarSign },
    { id: 'verification', label: 'Verification & Source', icon: ShieldCheck },
  ];

  const tabIds = tabs.map(t => t.id);
  const currentTabIndex = tabIds.indexOf(activeTab);
  const isFirstTab = currentTabIndex === 0;
  const isLastTab = currentTabIndex === tabIds.length - 1;

  const handleNextTab = () => {
    if (currentTabIndex < tabIds.length - 1) {
      setActiveTab(tabIds[currentTabIndex + 1]);
    }
  };

  const handlePrevTab = () => {
    if (currentTabIndex > 0) {
      setActiveTab(tabIds[currentTabIndex - 1]);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999, padding: '20px'
    }}>
      <div style={{
        background: 'var(--surface, #1e293b)', borderRadius: '16px',
        border: '1px solid var(--border, #334155)', width: '100%', maxWidth: '850px',
        maxHeight: '90vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', overflow: 'hidden'
      }}>

        {/* Modal Header */}
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid var(--border, #334155)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'rgba(30, 41, 59, 0.8)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10, background: 'rgba(99, 102, 241, 0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#818cf8',
              border: '1px solid rgba(99, 102, 241, 0.3)'
            }}>
              <User size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main, #f8fafc)' }}>
                {isEditMode ? 'Edit Profile' : 'Add Profile Manually'}
              </h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted, #94a3b8)' }}>
                {isEditMode ? 'Update Master Lead Database profile record' : 'Add a new verified lead profile to the Master Lead Database'}
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div style={{
          display: 'flex', overflowX: 'auto', borderBottom: '1px solid var(--border, #334155)',
          background: 'rgba(15, 23, 42, 0.4)', padding: '0 12px'
        }}>
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '14px 16px',
                  background: 'none', border: 'none', cursor: 'pointer',
                  borderBottom: isActive ? '2px solid #818cf8' : '2px solid transparent',
                  color: isActive ? '#818cf8' : '#94a3b8', fontWeight: isActive ? 600 : 500,
                  fontSize: '0.85rem', whitespace: 'nowrap', transition: 'all 0.2s ease'
                }}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div style={{
            margin: '16px 24px 0', padding: '12px 16px', borderRadius: 8,
            background: errorMsg.includes('created') || errorMsg.includes('action') ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            border: errorMsg.includes('created') || errorMsg.includes('action') ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(239, 68, 68, 0.4)',
            color: errorMsg.includes('created') || errorMsg.includes('action') ? '#34d399' : '#f87171',
            fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: 8
          }}>
            <AlertTriangle size={18} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Modal Body / Tab Content */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>

          {/* TAB 1: Identity & Contact */}
          {activeTab === 'identity' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={labelStyle}>First Name <span style={{ color: '#ef4444' }}>*</span></label>
                <input style={inputStyle} value={formData.first_name} onChange={e => handleChange('first_name', e.target.value)} placeholder="e.g. Rahul" />
              </div>
              <div>
                <label style={labelStyle}>Last Name <span style={{ color: '#ef4444' }}>*</span></label>
                <input style={inputStyle} value={formData.last_name} onChange={e => handleChange('last_name', e.target.value)} placeholder="e.g. Sharma" />
              </div>
              <div>
                <label style={labelStyle}>Email Address <span style={{ color: '#ef4444' }}>*</span></label>
                <input style={inputStyle} type="email" value={formData.email} onChange={e => handleChange('email', e.target.value)} placeholder="rahul@enterprise.com" />
              </div>
              <div>
                <label style={labelStyle}>Phone Number</label>
                <input style={inputStyle} value={formData.phone} onChange={e => handleChange('phone', e.target.value)} placeholder="+91 98765 43210" />
              </div>
              <div>
                <label style={labelStyle}>Job Title <span style={{ color: '#ef4444' }}>*</span></label>
                <input style={inputStyle} value={formData.job_title} onChange={e => handleChange('job_title', e.target.value)} placeholder="e.g. Finance Director" />
              </div>
              <div>
                <label style={labelStyle}>LinkedIn URL</label>
                <input style={inputStyle} value={formData.linkedin_url} onChange={e => handleChange('linkedin_url', e.target.value)} placeholder="https://linkedin.com/in/rahulsharma" />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={labelStyle}>Profile / Web URL</label>
                <input style={inputStyle} value={formData.profile_url} onChange={e => handleChange('profile_url', e.target.value)} placeholder="https://company.com/team/rahul" />
              </div>
            </div>
          )}

          {/* TAB 2: Company Information */}
          {activeTab === 'company' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={labelStyle}>Company Name <span style={{ color: '#ef4444' }}>*</span></label>
                <input style={inputStyle} value={formData.company_name} onChange={e => handleChange('company_name', e.target.value)} placeholder="e.g. ABC Financial Corp" />
              </div>
              <div>
                <label style={labelStyle}>Company Website <span style={{ color: '#ef4444' }}>*</span></label>
                <input style={inputStyle} value={formData.company_website} onChange={e => handleChange('company_website', e.target.value)} placeholder="https://abcfinancial.com" />
              </div>
              <div>
                <label style={labelStyle}>Industry / Sector <span style={{ color: '#ef4444' }}>*</span></label>
                <input style={inputStyle} value={formData.industry} onChange={e => handleChange('industry', e.target.value)} placeholder="e.g. Banking / Financial Services" />
              </div>
              <div>
                <label style={labelStyle}>Company Domain</label>
                <input style={inputStyle} value={formData.company_domain} onChange={e => handleChange('company_domain', e.target.value)} placeholder="abcfinancial.com" />
              </div>
              <div>
                <label style={labelStyle}>Company Size / Employees</label>
                <input style={inputStyle} value={formData.company_size} onChange={e => handleChange('company_size', e.target.value)} placeholder="e.g. 500 - 1000 employees" />
              </div>
              <div>
                <label style={labelStyle}>Annual Revenue</label>
                <input style={inputStyle} value={formData.company_revenue} onChange={e => handleChange('company_revenue', e.target.value)} placeholder="e.g. $50M - $100M" />
              </div>
              <div>
                <label style={labelStyle}>Founded Year</label>
                <input style={inputStyle} value={formData.company_founded_year} onChange={e => handleChange('company_founded_year', e.target.value)} placeholder="e.g. 2012" />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={labelStyle}>Company Description</label>
                <textarea style={{ ...inputStyle, minHeight: 70 }} value={formData.company_info} onChange={e => handleChange('company_info', e.target.value)} placeholder="Brief overview of company business model & operations..." />
              </div>
            </div>
          )}

          {/* TAB 3: Location Information */}
          {activeTab === 'location' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={labelStyle}>Country <span style={{ color: '#ef4444' }}>*</span></label>
                <input style={inputStyle} value={formData.country} onChange={e => handleChange('country', e.target.value)} placeholder="e.g. India" />
              </div>
              <div>
                <label style={labelStyle}>Country Code</label>
                <input style={inputStyle} value={formData.country_code} onChange={e => handleChange('country_code', e.target.value)} placeholder="e.g. IN or US" />
              </div>
              <div>
                <label style={labelStyle}>State / Province</label>
                <input style={inputStyle} value={formData.state} onChange={e => handleChange('state', e.target.value)} placeholder="e.g. Maharashtra" />
              </div>
              <div>
                <label style={labelStyle}>City</label>
                <input style={inputStyle} value={formData.city} onChange={e => handleChange('city', e.target.value)} placeholder="e.g. Mumbai" />
              </div>
              <div>
                <label style={labelStyle}>Location String</label>
                <input style={inputStyle} value={formData.location} onChange={e => handleChange('location', e.target.value)} placeholder="e.g. Mumbai, Maharashtra, India" />
              </div>
              <div>
                <label style={labelStyle}>Timezone</label>
                <input style={inputStyle} value={formData.timezone} onChange={e => handleChange('timezone', e.target.value)} placeholder="e.g. Asia/Kolkata (UTC+5:30)" />
              </div>
            </div>
          )}

          {/* TAB 4: Professional / ICP Information */}
          {activeTab === 'icp' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={labelStyle}>Seniority Level <span style={{ color: '#ef4444' }}>*</span></label>
                <input style={inputStyle} value={formData.seniority} onChange={e => handleChange('seniority', e.target.value)} placeholder="e.g. Manager, Director, VP, Head, Executive..." />
              </div>
              <div>
                <label style={labelStyle}>Department / Function <span style={{ color: '#ef4444' }}>*</span></label>
                <input style={inputStyle} value={formData.department} onChange={e => handleChange('department', e.target.value)} placeholder="e.g. Finance, Customer Support, HR, Sales, IT..." />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={labelStyle}>Skills (comma separated)</label>
                <input style={inputStyle} value={formData.skills} onChange={e => handleChange('skills', e.target.value)} placeholder="Budgeting, FP&A, Financial Reporting, SAP" />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={labelStyle}>Technologies (comma separated)</label>
                <input style={inputStyle} value={formData.technologies} onChange={e => handleChange('technologies', e.target.value)} placeholder="Power BI, Salesforce, Oracle ERP, NetSuite" />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={labelStyle}>Target Keywords (comma separated)</label>
                <input style={inputStyle} value={formData.keywords} onChange={e => handleChange('keywords', e.target.value)} placeholder="Capital Allocation, Cash Flow, Forecasting" />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={labelStyle}>Profile Headline</label>
                <input style={inputStyle} value={formData.profile_headline} onChange={e => handleChange('profile_headline', e.target.value)} placeholder="Finance Director driving enterprise digital transformation" />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={labelStyle}>Profile Summary</label>
                <textarea style={{ ...inputStyle, minHeight: 60 }} value={formData.profile_summary} onChange={e => handleChange('profile_summary', e.target.value)} placeholder="Executive background & achievements..." />
              </div>
            </div>
          )}

          {/* TAB 5: Business Information */}
          {activeTab === 'business' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={labelStyle}>Products & Services Offered</label>
                <input style={inputStyle} value={formData.products_services} onChange={e => handleChange('products_services', e.target.value)} placeholder="Commercial Banking, Wealth Management, Treasury Solutions" />
              </div>
              <div>
                <label style={labelStyle}>Business Model</label>
                <input style={inputStyle} value={formData.business_model} onChange={e => handleChange('business_model', e.target.value)} placeholder="B2B / Enterprise Services" />
              </div>
              <div>
                <label style={labelStyle}>Funding Stage</label>
                <input style={inputStyle} value={formData.funding_stage} onChange={e => handleChange('funding_stage', e.target.value)} placeholder="e.g. Public / Series C" />
              </div>
              <div>
                <label style={labelStyle}>Funding Amount</label>
                <input style={inputStyle} value={formData.funding_amount} onChange={e => handleChange('funding_amount', e.target.value)} placeholder="e.g. $120M" />
              </div>
              <div>
                <label style={labelStyle}>Last Funding Date</label>
                <input style={inputStyle} value={formData.last_funding_date} onChange={e => handleChange('last_funding_date', e.target.value)} placeholder="e.g. 2024-03-15" />
              </div>
            </div>
          )}

          {/* TAB 6: Verification & Source */}
          {activeTab === 'verification' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={labelStyle}>Source Indicator <span style={{ color: '#ef4444' }}>*</span></label>
                <select style={inputStyle} value={formData.source} onChange={e => handleChange('source', e.target.value)}>
                  <option value="Manual Entry">Manual Entry</option>
                  <option value="CSV Import">CSV Import</option>
                  <option value="Excel Import">Excel Import</option>
                  <option value="Verified Outreach">Verified Outreach</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Data Source Name</label>
                <input style={inputStyle} value={formData.data_source} onChange={e => handleChange('data_source', e.target.value)} placeholder="Master Lead Database" />
              </div>
              <div>
                <label style={labelStyle}>Email Status</label>
                <select style={inputStyle} value={formData.email_status} onChange={e => handleChange('email_status', e.target.value)}>
                  <option value="valid">Valid / Verified</option>
                  <option value="unverified">Unverified</option>
                  <option value="catch_all">Catch-All</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Source ID</label>
                <input style={inputStyle} value={formData.source_id} onChange={e => handleChange('source_id', e.target.value)} placeholder="e.g. MAN-90812" />
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '16px 24px', borderTop: '1px solid var(--border, #334155)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'rgba(30, 41, 59, 0.8)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={onClose}
              style={{
                padding: '10px 18px', borderRadius: 8, border: '1px solid var(--border, #334155)',
                background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontWeight: 500
              }}
            >
              Cancel
            </button>

            {!isFirstTab && (
              <button
                onClick={handlePrevTab}
                style={{
                  padding: '10px 16px', borderRadius: 8, border: '1px solid var(--border, #334155)',
                  background: 'rgba(15, 23, 42, 0.6)', color: '#cbd5e1', cursor: 'pointer', fontWeight: 500,
                  display: 'flex', alignItems: 'center', gap: 6
                }}
              >
                <ArrowLeft size={16} />
                Previous
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            {!isLastTab ? (
              <button
                onClick={handleNextTab}
                style={{
                  padding: '10px 22px', borderRadius: 8, border: 'none',
                  background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                  color: '#ffffff', cursor: 'pointer', fontWeight: 600,
                  display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
                }}
              >
                Next Section
                <ArrowRight size={16} />
              </button>
            ) : (
              <>
                {!isEditMode && (
                  <button
                    onClick={() => handleSubmit(true)}
                    disabled={saving}
                    style={{
                      padding: '10px 18px', borderRadius: 8, border: '1px solid rgba(99, 102, 241, 0.3)',
                      background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', cursor: 'pointer', fontWeight: 600,
                      display: 'flex', alignItems: 'center', gap: 8
                    }}
                  >
                    <Plus size={16} />
                    Save & Add Another
                  </button>
                )}

                <button
                  onClick={() => handleSubmit(false)}
                  disabled={saving}
                  style={{
                    padding: '10px 22px', borderRadius: 8, border: 'none',
                    background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                    color: '#ffffff', cursor: 'pointer', fontWeight: 600,
                    display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
                  }}
                >
                  <Save size={16} />
                  {saving ? 'Saving...' : (isEditMode ? 'Update Profile' : 'Save Profile')}
                </button>
              </>
            )}
          </div>
        </div>

      </div>

      {/* Duplicate Warning Dialog Overlay */}
      {duplicateWarning && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: 20
        }}>
          <div style={{
            background: '#1e293b', border: '1px solid rgba(245, 158, 11, 0.5)',
            borderRadius: 16, width: '100%', maxWidth: '480px', padding: '24px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12, background: 'rgba(245, 158, 11, 0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b',
                border: '1px solid rgba(245, 158, 11, 0.3)', flexShrink: 0
              }}>
                <AlertTriangle size={24} />
              </div>
              <div>
                <h4 style={{ margin: 0, color: '#f8fafc', fontSize: '1.1rem', fontWeight: 700 }}>
                  Duplicate Profile
                </h4>
                <p style={{ margin: '2px 0 0', color: '#fbbf24', fontSize: '0.84rem', fontWeight: 600 }}>
                  A profile with this email already exists in the Master Database.
                </p>
              </div>
            </div>

            <div style={{
              background: 'rgba(15, 23, 42, 0.6)', padding: '12px 16px', borderRadius: 8,
              border: '1px solid #334155', marginBottom: 22, fontSize: '0.88rem'
            }}>
              <span style={{ color: '#94a3b8' }}>Matched Record: </span>
              <strong style={{ color: '#f8fafc' }}>{duplicateWarning.matched_lead_name || 'Existing Lead'}</strong>
              <span style={{ color: '#94a3b8' }}> (ID #{duplicateWarning.matched_lead_id})</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setDuplicateWarning(null)}
                style={{
                  padding: '0.55rem 1.15rem', borderRadius: 8, border: '1px solid #334155',
                  background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem'
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleFetchViewExisting}
                disabled={loadingExisting}
                style={{
                  padding: '0.55rem 1.25rem', borderRadius: 8, border: 'none',
                  background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                  color: '#ffffff', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem',
                  boxShadow: '0 4px 12px rgba(99, 102, 241, 0.35)', display: 'flex', alignItems: 'center', gap: '6px'
                }}
              >
                <Eye size={15} />
                {loadingExisting ? 'Loading...' : 'View Existing Profile'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Existing Profile View Modal */}
      <ExistingProfileViewModal
        isOpen={Boolean(viewingExistingLead)}
        onClose={() => setViewingExistingLead(null)}
        lead={viewingExistingLead}
      />
    </div>
  );
}

const labelStyle = {
  display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted, #cbd5e1)',
  marginBottom: '6px'
};

const inputStyle = {
  width: '100%', padding: '10px 14px', borderRadius: '8px',
  border: '1px solid var(--border, #334155)', background: 'rgba(15, 23, 42, 0.6)',
  color: 'var(--text-main, #f8fafc)', fontSize: '0.88rem', outline: 'none',
  boxSizing: 'border-box'
};

const dupBtnStyle = (color) => ({
  textAlign: 'left', padding: '12px 14px', borderRadius: 8,
  border: `1px solid ${color}40`, background: `${color}15`,
  color: '#f8fafc', cursor: 'pointer', fontSize: '0.83rem',
  transition: 'all 0.2s ease'
});
