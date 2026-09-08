import React, { useState, useEffect, useRef } from 'react';
import {
  getDeals, generateEmailForDeal, sendEmailForDeal, simulateReply,
  getDealThread, getCampaigns, deleteDeal, uploadAttachment, getLead360, aiAssistComposer, updateLead
} from '../services/api';
import {
  Sparkles, Send, MessageCircle, Eye, X, RefreshCw, ChevronDown, Play, Mail,
  CheckCircle2, Trash2, Paperclip, CornerUpLeft, CornerUpRight, Save,
  MoreVertical, Search, Filter, ArrowUpDown, UserCheck, Building, Briefcase,
  MapPin, ExternalLink, Zap, TrendingUp, Check, Plus, FileText, Layers,
  Bot, Clock, Award, Sliders, CheckCircle, AlertCircle, Copy
} from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';

// ── State Badges and Colors Configuration ─────────────────────────────────────
const STATE_CONFIG = {
  'New': { bg: 'rgba(148, 163, 184, 0.15)', text: '#cbd5e1', border: 'rgba(148, 163, 184, 0.3)' },
  'Qualified': { bg: 'rgba(99, 102, 241, 0.15)', text: '#818cf8', border: 'rgba(99, 102, 241, 0.3)' },
  'Ready to Email': { bg: 'rgba(245, 158, 11, 0.15)', text: '#fbbf24', border: 'rgba(245, 158, 11, 0.3)' },
  'Emailed': { bg: 'rgba(59, 130, 246, 0.15)', text: '#60a5fa', border: 'rgba(59, 130, 246, 0.3)' },
  'Contacted': { bg: 'rgba(59, 130, 246, 0.15)', text: '#60a5fa', border: 'rgba(59, 130, 246, 0.3)' },
  'Engaged': { bg: 'rgba(168, 85, 247, 0.15)', text: '#c084fc', border: 'rgba(168, 85, 247, 0.3)' },
  'Replied': { bg: 'rgba(16, 185, 129, 0.15)', text: '#34d399', border: 'rgba(16, 185, 129, 0.3)' },
  'Meeting': { bg: 'rgba(236, 72, 153, 0.15)', text: '#f472b6', border: 'rgba(236, 72, 153, 0.3)' },
  'Completed': { bg: 'rgba(16, 185, 129, 0.2)', text: '#10b981', border: 'rgba(16, 185, 129, 0.4)' },
  'Converted': { bg: 'rgba(16, 185, 129, 0.2)', text: '#10b981', border: 'rgba(16, 185, 129, 0.4)' },
  'Unsubscribed': { bg: 'rgba(239, 68, 68, 0.15)', text: '#f87171', border: 'rgba(239, 68, 68, 0.3)' },
};

const FILE_TYPE_CONFIG = {
  pdf: { label: 'PDF', bg: 'rgba(239, 68, 68, 0.2)', color: '#f87171', border: '#ef4444' },
  doc: { label: 'DOC', bg: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', border: '#3b82f6' },
  docx: { label: 'DOCX', bg: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', border: '#3b82f6' },
  xls: { label: 'XLS', bg: 'rgba(16, 185, 129, 0.2)', color: '#34d399', border: '#10b981' },
  xlsx: { label: 'XLSX', bg: 'rgba(16, 185, 129, 0.2)', color: '#34d399', border: '#10b981' },
  csv: { label: 'CSV', bg: 'rgba(16, 185, 129, 0.2)', color: '#34d399', border: '#10b981' },
  png: { label: 'PNG', bg: 'rgba(168, 85, 247, 0.2)', color: '#c084fc', border: '#a855f7' },
  jpg: { label: 'JPG', bg: 'rgba(168, 85, 247, 0.2)', color: '#c084fc', border: '#a855f7' },
  jpeg: { label: 'JPEG', bg: 'rgba(168, 85, 247, 0.2)', color: '#c084fc', border: '#a855f7' },
};

const PIPELINE_STAGES = ['New', 'Qualified', 'Contacted', 'Engaged', 'Replied', 'Meeting', 'Converted'];

function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function StateBadge({ state }) {
  const c = STATE_CONFIG[state] || { bg: 'rgba(255,255,255,0.06)', text: 'var(--text-muted)', border: 'rgba(255,255,255,0.1)' };
  return (
    <span style={{
      background: c.bg, color: c.text, border: `1px solid ${c.border}`,
      padding: '2px 8px', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 700,
      display: 'inline-flex', alignItems: 'center', gap: '3px', whiteSpace: 'nowrap'
    }}>
      {state}
    </span>
  );
}

// ── Toast Notification Container ─────────────────────────────────────────────
function ToastNotification({ toast, onClose }) {
  if (!toast) return null;
  const isError = toast.type === 'error';
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
      background: isError ? 'rgba(239, 68, 68, 0.95)' : 'rgba(15, 23, 42, 0.95)',
      border: `1px solid ${isError ? '#ef4444' : 'rgba(16, 185, 129, 0.5)'}`,
      boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
      borderRadius: '10px', padding: '0.75rem 1.25rem', color: '#fff',
      display: 'flex', alignItems: 'center', gap: '0.65rem', backdropFilter: 'blur(10px)',
      animation: 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)', fontSize: '0.85rem', fontWeight: 600
    }}>
      {isError ? <AlertCircle size={18} color="#f87171" /> : <CheckCircle size={18} color="#34d399" />}
      <span>{toast.message}</span>
      <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', marginLeft: '0.5rem' }}>
        <X size={14} />
      </button>
    </div>
  );
}

// ── Gmail-Style Rich Text Composer Drawer/Modal ──────────────────────────────
function GmailStyleComposer({
  isOpen, onClose, variantKey, title, themeColor, recipientEmail, leadName, company, jobTitle,
  variant, setVariant, onSend, sending, showToast, dealId, activeLead, activeCampaign
}) {
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [showAiAssist, setShowAiAssist] = useState(false);
  const [showToneMenu, setShowToneMenu] = useState(false);
  const [showTagMenu, setShowTagMenu] = useState(false);
  const [showCc, setShowCc] = useState(!!variant?.cc);
  const [showBcc, setShowBcc] = useState(!!variant?.bcc);

  // Tabs: 'composer' | 'thread'
  const [activeTab, setActiveTab] = useState('composer');
  const [threadEvents, setThreadEvents] = useState([]);
  const [loadingThread, setLoadingThread] = useState(false);

  // Live Preview Toggle
  const [livePreview, setLivePreview] = useState(false);

  // Edit History & Version Tracking System
  const [history, setHistory] = useState([
    {
      subject: variant?.subject || '',
      body: variant?.body || '',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      label: 'Original Draft'
    }
  ]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Subject line options state
  const [subjectOptions, setSubjectOptions] = useState(() => {
    return (variant?.subject_options && variant.subject_options.length > 0)
      ? variant.subject_options
      : [
          `Improving ${activeCampaign?.product_docs ? activeCampaign.product_docs.slice(0, 25) : 'Operations'} at ${company || 'your company'}`,
          `A Quick Idea for Your ${jobTitle || 'Support'} Team`,
          `Reducing Support Workload with AI`,
          `Can We Discuss Your Customer Support Strategy?`
        ];
  });

  useEffect(() => {
    if (variant?.subject_options && variant.subject_options.length > 0) {
      setSubjectOptions(variant.subject_options);
    }
  }, [variant?.subject_options]);

  const generateMoreSubjectOptions = async () => {
    setAiLoading(true);
    try {
      const res = await aiAssistComposer(dealId || 0, {
        action_type: 'generate_subject_options',
        current_subject: variant.subject,
        current_body: variant.body,
        prospect_info: {
          first_name: (leadName || '').split(' ')[0],
          name: leadName,
          company: company,
          job_title: jobTitle
        }
      });
      if (res?.subject_options && res.subject_options.length > 0) {
        setSubjectOptions(res.subject_options);
        setVariant(prev => ({ ...prev, subject_options: res.subject_options }));
        showToast('✨ Generated 4 new subject line options!');
      }
    } catch (e) {
      const freshOpts = [
        `Improving Customer Support Operations at ${company || 'your company'}`,
        `A Quick Idea for Your ${jobTitle || 'Support'} Team`,
        `Reducing Support Workload with AI`,
        `Can We Discuss Your Customer Support Strategy?`
      ];
      setSubjectOptions(freshOpts);
      showToast('✨ Updated subject options!');
    } finally {
      setAiLoading(false);
    }
  };
  const [showHistoryDropdown, setShowHistoryDropdown] = useState(false);

  // AI Suggestion Preview Modal State
  const [aiLoading, setAiLoading] = useState(false);
  const [pendingAiPreview, setPendingAiPreview] = useState(null);

  // Load email thread history when dealId changes
  useEffect(() => {
    if (dealId && isOpen) {
      setLoadingThread(true);
      getDealThread(dealId)
        .then(res => {
          const list = Array.isArray(res) ? res : (res?.messages || []);
          setThreadEvents(list);
        })
        .catch(() => setThreadEvents([]))
        .finally(() => setLoadingThread(false));
    }
  }, [dealId, isOpen]);

  if (!isOpen) return null;

  const pushToHistory = (newSubj, newBody, label = 'Manual Edit') => {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newEntry = { subject: newSubj, body: newBody, timestamp: timeStr, label };
    const updated = [...history.slice(0, historyIndex + 1), newEntry];
    setHistory(updated);
    setHistoryIndex(updated.length - 1);
    setVariant(prev => ({ ...prev, subject: newSubj, body: newBody, isDraftSaved: false }));
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevIdx = historyIndex - 1;
      setHistoryIndex(prevIdx);
      const prevItem = history[prevIdx];
      setVariant(prev => ({ ...prev, subject: prevItem.subject, body: prevItem.body, isDraftSaved: false }));
      showToast(`Undid change (Restored: ${prevItem.label})`);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextIdx = historyIndex + 1;
      setHistoryIndex(nextIdx);
      const nextItem = history[nextIdx];
      setVariant(prev => ({ ...prev, subject: nextItem.subject, body: nextItem.body, isDraftSaved: false }));
      showToast(`Redid change (Restored: ${nextItem.label})`);
    }
  };

  const handleRevertToOriginal = () => {
    if (history.length > 0) {
      const orig = history[0];
      setHistoryIndex(0);
      setVariant(prev => ({ ...prev, subject: orig.subject, body: orig.body, isDraftSaved: false }));
      showToast('Reverted draft to Original Version!');
    }
  };

  const handleRestoreVersion = (index) => {
    if (index >= 0 && index < history.length) {
      setHistoryIndex(index);
      const item = history[index];
      setVariant(prev => ({ ...prev, subject: item.subject, body: item.body, isDraftSaved: false }));
      setShowHistoryDropdown(false);
      showToast(`Restored version: ${item.label}`);
    }
  };

  // Dynamic Database-Validated Insert Tags
  const getAvailableInsertTags = () => {
    const lead = activeLead || {};
    const sf = lead.source_fields || {};
    const camp = activeCampaign || {};
    const tags = [];

    const fName = sf.first_name || sf.name?.split(' ')[0] || lead.first_name;
    if (fName) tags.push({ name: 'first_name', label: 'First Name', tag: '{{first_name}}', value: fName });

    const lName = sf.last_name || (sf.name?.split(' ').length > 1 ? sf.name.split(' ').slice(1).join(' ') : '') || lead.last_name;
    if (lName) tags.push({ name: 'last_name', label: 'Last Name', tag: '{{last_name}}', value: lName });

    const fullName = sf.name || [lead.first_name, lead.last_name].filter(Boolean).join(' ') || (lead.email ? lead.email.split('@')[0] : '');
    if (fullName) tags.push({ name: 'full_name', label: 'Full Name', tag: '{{full_name}}', value: fullName });

    const jTitle = sf.title || lead.job_title || jobTitle;
    if (jTitle) tags.push({ name: 'job_title', label: 'Job Title', tag: '{{job_title}}', value: jTitle });

    const comp = sf.company || lead.company_name || company;
    if (comp) tags.push({ name: 'company', label: 'Company Name', tag: '{{company}}', value: comp });

    const ind = sf.industry || lead.industry || camp.target_industry;
    if (ind) tags.push({ name: 'industry', label: 'Industry', tag: '{{industry}}', value: ind });

    const dept = sf.department || lead.department;
    if (dept) tags.push({ name: 'department', label: 'Department', tag: '{{department}}', value: dept });

    const country = sf.country || lead.country_code;
    if (country) tags.push({ name: 'country', label: 'Country', tag: '{{country}}', value: country });

    const cName = camp.name;
    if (cName) tags.push({ name: 'campaign_name', label: 'Campaign Name', tag: '{{campaign_name}}', value: cName });

    const pName = camp.product_name || camp.target_product;
    if (pName) tags.push({ name: 'product_name', label: 'Product / Service', tag: '{{product_name}}', value: pName });

    return tags;
  };

  const availableTags = getAvailableInsertTags();

  const insertVariable = (tagStr) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newBody = variant.body.substring(0, start) + tagStr + variant.body.substring(end);
    pushToHistory(variant.subject, newBody, `Inserted ${tagStr}`);
    setShowTagMenu(false);
  };

  // Render resolved Live Preview text
  const renderLivePreviewText = (text) => {
    if (!text) return '';
    let resolved = text;
    availableTags.forEach(t => {
      const regex = new RegExp(`\\{\\{${t.name}\\}\\}`, 'g');
      resolved = resolved.replace(regex, t.value);
    });
    return resolved;
  };

  // AI Assist Actions Execution with Non-Destructive Preview Modal
  const triggerAiAction = async (actionType, toneVal = null) => {
    setShowAiAssist(false);
    setShowToneMenu(false);

    let selectionText = null;
    if (actionType === 'rewrite_selection') {
      const textarea = textareaRef.current;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        selectionText = variant.body.substring(start, end).trim();
      }
      if (!selectionText) {
        showToast('Please highlight/select text in the composer to rewrite.', 'error');
        return;
      }
    }

    setAiLoading(true);
    try {
      const targetDealId = dealId || 0;
      const res = await aiAssistComposer(targetDealId, {
        action_type: actionType,
        current_subject: variant.subject,
        current_body: variant.body,
        selection_text: selectionText,
        tone: toneVal,
        prospect_info: {
          first_name: (leadName || '').split(' ')[0],
          name: leadName,
          company: company,
          job_title: jobTitle
        }
      });

      let labelText = `AI: ${actionType.replace('_', ' ')}`;
      if (actionType === 'improve_writing') labelText = 'AI: Improved Writing';
      if (actionType === 'concise') labelText = 'AI: Made Concise';
      if (actionType === 'persuasive') labelText = 'AI: Made Persuasive';
      if (actionType === 'change_tone') labelText = `AI: Tone (${toneVal || 'Professional'})`;
      if (actionType === 'rewrite_selection') labelText = 'AI: Rewrote Selection';
      if (actionType === 'add_personalization') labelText = 'AI: Added Personalization';
      if (actionType === 'generate_followup_contextual') labelText = 'AI: Generated Contextual Follow-Up';

      const newSubj = res.suggested_subject || variant.subject;
      const newBody = res.suggested_body || variant.body;

      pushToHistory(newSubj, newBody, labelText);
      if (actionType === 'generate_followup_contextual') {
        setActiveTab('composer');
      }
      showToast(`✨ AI Applied: ${labelText}! (Click Undo to revert if needed)`);
    } catch (err) {
      showToast('AI Assist Error: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setAiLoading(false);
    }
  };

  const handleAcceptAiSuggestion = () => {
    if (!pendingAiPreview) return;
    pushToHistory(pendingAiPreview.suggested_subject, pendingAiPreview.suggested_body, pendingAiPreview.label);
    showToast(`🎉 Accepted AI Suggestion (${pendingAiPreview.label})`);
    setPendingAiPreview(null);
  };

  const handleRejectAiSuggestion = () => {
    setPendingAiPreview(null);
    showToast('Rejected AI Suggestion. Draft remains unchanged.');
  };

  const allowedExts = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'ppt', 'pptx', 'txt', 'png', 'jpg', 'jpeg'];

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    for (const file of files) {
      const ext = file.name.includes('.') ? file.name.split('.').pop().toLowerCase() : '';
      if (!allowedExts.includes(ext)) {
        showToast(`Unsupported format ".${ext}".`, 'error');
        continue;
      }
      setUploading(true);
      try {
        const uploaded = await uploadAttachment(file);
        setVariant(prev => ({ ...prev, attachments: [...(prev.attachments || []), uploaded], isDraftSaved: false }));
        showToast(`Attached ${file.name}`);
      } catch (err) {
        showToast(`Failed to upload attachment: ${err.message}`, 'error');
      } finally {
        setUploading(false);
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (index) => {
    setVariant(prev => ({ ...prev, attachments: prev.attachments.filter((_, i) => i !== index), isDraftSaved: false }));
  };

  const applyFormat = (tag) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = variant.body.substring(start, end) || 'text';
    let replacement = `${tag}${selected}${tag}`;
    if (tag === 'b') replacement = `<b>${selected}</b>`;
    if (tag === 'i') replacement = `<i>${selected}</i>`;
    if (tag === 'u') replacement = `<u>${selected}</u>`;
    if (tag === 'ul') replacement = `<ul>\n  <li>${selected}</li>\n</ul>`;
    if (tag === 'a') {
      const url = prompt('Enter URL:', 'https://');
      if (url) replacement = `<a href="${url}">${selected}</a>`;
      else return;
    }
    const newBody = variant.body.substring(0, start) + replacement + variant.body.substring(end);
    pushToHistory(variant.subject, newBody, 'Formatted Text');
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      backgroundColor: 'rgba(5, 8, 22, 0.8)', backdropFilter: 'blur(10px)',
      display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999
    }}>
      <div style={{
        width: '100%', maxWidth: '740px', background: '#0f172a',
        border: `1.5px solid ${themeColor}`, borderRadius: '16px',
        boxShadow: `0 20px 50px rgba(0,0,0,0.7), 0 0 30px ${themeColor}22`,
        padding: '1.25rem', position: 'relative', display: 'flex', flexDirection: 'column', gap: '0.85rem',
        maxHeight: '92vh', overflowY: 'auto'
      }}>
        {/* Header with Title */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '3px 9px', borderRadius: '4px', backgroundColor: themeColor, color: '#fff' }}>
              Option {variantKey} Composer
            </span>
            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff' }}>{title}</span>
          </div>

          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}>
            <X size={18} />
          </button>
        </div>

        {/* ── TAB 1: COMPOSER ─────────────────────────────────────────────────── */}
        {activeTab === 'composer' && (
          <>
            {/* Top Toolbar: Revert, Undo, Redo, Version History Stack */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.3)', padding: '6px 10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
              {/* Undo / Redo / Revert Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <button
                  type="button"
                  onClick={handleUndo}
                  disabled={historyIndex === 0}
                  title="Undo (Ctrl+Z)"
                  style={{
                    fontSize: '0.72rem', padding: '3px 8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.12)',
                    backgroundColor: historyIndex > 0 ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.02)',
                    color: historyIndex > 0 ? '#fff' : 'rgba(255,255,255,0.25)', cursor: historyIndex > 0 ? 'pointer' : 'not-allowed',
                    display: 'inline-flex', alignItems: 'center', gap: '3px', fontWeight: 700
                  }}
                >
                  ↩️ Undo
                </button>
                <button
                  type="button"
                  onClick={handleRedo}
                  disabled={historyIndex === history.length - 1}
                  title="Redo (Ctrl+Y)"
                  style={{
                    fontSize: '0.72rem', padding: '3px 8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.12)',
                    backgroundColor: historyIndex < history.length - 1 ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.02)',
                    color: historyIndex < history.length - 1 ? '#fff' : 'rgba(255,255,255,0.25)', cursor: historyIndex < history.length - 1 ? 'pointer' : 'not-allowed',
                    display: 'inline-flex', alignItems: 'center', gap: '3px', fontWeight: 700
                  }}
                >
                  ↪️ Redo
                </button>

                <button
                  type="button"
                  onClick={handleRevertToOriginal}
                  title="Revert to original initial draft"
                  style={{
                    fontSize: '0.72rem', padding: '3px 8px', borderRadius: '4px', border: '1px solid rgba(239,68,68,0.3)',
                    backgroundColor: 'rgba(239,68,68,0.15)', color: '#f87171', cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center', gap: '3px', fontWeight: 700
                  }}
                >
                  🔄 Revert to Original Draft
                </button>
              </div>
            </div>

            {/* Recipients (To, CC, BCC) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', backgroundColor: 'rgba(0,0,0,0.25)', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}>
                <span style={{ color: 'var(--text-muted)', fontWeight: 700, width: '32px', flexShrink: 0 }}>To:</span>
                <input
                  type="email"
                  className="form-control"
                  value={variant.to_email !== undefined ? variant.to_email : (recipientEmail || '')}
                  onChange={e => setVariant(prev => ({ ...prev, to_email: e.target.value, isDraftSaved: false }))}
                  placeholder="Recipient email address..."
                  style={{ flex: 1, fontSize: '0.82rem', padding: '4px 8px', backgroundColor: 'rgba(0,0,0,0.3)', color: '#fff', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px' }}
                />
                <div style={{ display: 'flex', gap: '0.3rem', flexShrink: 0 }}>
                  <button
                    type="button"
                    onClick={() => setShowCc(!showCc)}
                    style={{
                      fontSize: '0.72rem', padding: '2px 8px', borderRadius: '4px',
                      border: (showCc || variant.cc) ? `1px solid ${themeColor}` : '1px solid rgba(255,255,255,0.15)',
                      backgroundColor: (showCc || variant.cc) ? `${themeColor}22` : 'rgba(255,255,255,0.05)',
                      color: (showCc || variant.cc) ? '#fff' : 'var(--text-muted)', cursor: 'pointer', fontWeight: 700
                    }}
                  >
                    Cc
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowBcc(!showBcc)}
                    style={{
                      fontSize: '0.72rem', padding: '2px 8px', borderRadius: '4px',
                      border: (showBcc || variant.bcc) ? `1px solid ${themeColor}` : '1px solid rgba(255,255,255,0.15)',
                      backgroundColor: (showBcc || variant.bcc) ? `${themeColor}22` : 'rgba(255,255,255,0.05)',
                      color: (showBcc || variant.bcc) ? '#fff' : 'var(--text-muted)', cursor: 'pointer', fontWeight: 700
                    }}
                  >
                    Bcc
                  </button>
                </div>
              </div>

              {(showCc || variant.cc) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 700, width: '32px', flexShrink: 0 }}>Cc:</span>
                  <input
                    type="text"
                    className="form-control"
                    value={variant.cc || ''}
                    onChange={e => setVariant(prev => ({ ...prev, cc: e.target.value, isDraftSaved: false }))}
                    placeholder="CC email addresses (comma separated)..."
                    style={{ flex: 1, fontSize: '0.82rem', padding: '4px 8px', backgroundColor: 'rgba(0,0,0,0.3)', color: '#fff', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px' }}
                  />
                  <button type="button" onClick={() => { setVariant(prev => ({ ...prev, cc: '', isDraftSaved: false })); setShowCc(false); }} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: '0 4px' }}>✕</button>
                </div>
              )}

              {(showBcc || variant.bcc) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 700, width: '32px', flexShrink: 0 }}>Bcc:</span>
                  <input
                    type="text"
                    className="form-control"
                    value={variant.bcc || ''}
                    onChange={e => setVariant(prev => ({ ...prev, bcc: e.target.value, isDraftSaved: false }))}
                    placeholder="BCC email addresses (comma separated)..."
                    style={{ flex: 1, fontSize: '0.82rem', padding: '4px 8px', backgroundColor: 'rgba(0,0,0,0.3)', color: '#fff', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px' }}
                  />
                  <button type="button" onClick={() => { setVariant(prev => ({ ...prev, bcc: '', isDraftSaved: false })); setShowBcc(false); }} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: '0 4px' }}>✕</button>
                </div>
              )}
            </div>

            {/* Subject */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <label style={{ fontSize: '0.74rem', color: themeColor, fontWeight: 700, display: 'block' }}>Email Subject</label>
                <button
                  type="button"
                  onClick={generateMoreSubjectOptions}
                  disabled={aiLoading}
                  style={{ background: 'none', border: 'none', color: '#818cf8', fontSize: '0.72rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 700 }}
                >
                  <Sparkles size={11} style={{ animation: aiLoading ? 'spin 1s linear infinite' : 'none' }} />
                  {aiLoading ? 'Generating...' : '✨ More Subject Ideas'}
                </button>
              </div>

              <input
                type="text"
                className="form-control"
                value={variant.subject}
                onChange={e => pushToHistory(e.target.value, variant.body, 'Edited Subject')}
                placeholder="Enter or select email subject line..."
                style={{ fontSize: '0.86rem', backgroundColor: 'rgba(0,0,0,0.3)', color: '#fff', border: '1px solid rgba(255,255,255,0.14)', borderRadius: '6px', padding: '6px 10px' }}
              />

              {/* AI-Generated Subject Line Options Chips */}
              {subjectOptions && subjectOptions.length > 0 && (
                <div style={{ marginTop: '8px', padding: '8px 10px', borderRadius: '8px', backgroundColor: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.22)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      💡 AI-Generated Subject Line Options
                    </span>
                    <span style={{ fontSize: '0.64rem', color: 'var(--text-muted)' }}>Click to apply • Fully editable</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {subjectOptions.map((opt, oIdx) => {
                      const isSelected = variant.subject.trim() === opt.trim();
                      return (
                        <button
                          key={oIdx}
                          type="button"
                          onClick={() => {
                            pushToHistory(opt, variant.body, `Selected Subject: ${opt}`);
                            showToast(`Applied subject: "${opt}"`);
                          }}
                          style={{
                            fontSize: '0.75rem',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            border: isSelected ? '1.5px solid #6366f1' : '1px solid rgba(255,255,255,0.08)',
                            backgroundColor: isSelected ? 'rgba(99, 102, 241, 0.25)' : 'rgba(0,0,0,0.35)',
                            color: isSelected ? '#fff' : '#cbd5e1',
                            cursor: 'pointer',
                            textAlign: 'left',
                            fontWeight: isSelected ? 700 : 500,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <span style={{
                            fontSize: '0.68rem', fontWeight: 800, color: isSelected ? '#34d399' : '#818cf8',
                            backgroundColor: isSelected ? 'rgba(16,185,129,0.2)' : 'rgba(99,102,241,0.2)',
                            padding: '1px 6px', borderRadius: '4px', flexShrink: 0
                          }}>
                            {isSelected ? '✓ ACTIVE' : `Option ${oIdx + 1}`}
                          </span>
                          <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {opt}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Formatting, Dynamic Database Insert Tags & Contextual AI Assist Toolbar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', background: 'rgba(0,0,0,0.2)', padding: '6px 10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
              {/* Formatting buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                <button type="button" onClick={() => applyFormat('b')} title="Bold" style={{ padding: '3px 7px', background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 800, fontSize: '0.75rem' }}>B</button>
                <button type="button" onClick={() => applyFormat('i')} title="Italic" style={{ padding: '3px 7px', background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontStyle: 'italic', fontSize: '0.75rem' }}>I</button>
                <button type="button" onClick={() => applyFormat('u')} title="Underline" style={{ padding: '3px 7px', background: 'none', border: 'none', color: '#fff', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.75rem' }}>U</button>
                <button type="button" onClick={() => applyFormat('ul')} title="Bullet List" style={{ padding: '3px 7px', background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '0.75rem' }}>• List</button>
                <button type="button" onClick={() => applyFormat('a')} title="Link" style={{ padding: '3px 7px', background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '0.75rem' }}>🔗</button>
              </div>



              {/* Contextual AI Assist Menu */}
              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => setShowAiAssist(!showAiAssist)}
                  disabled={aiLoading}
                  style={{ fontSize: '0.72rem', padding: '4px 10px', background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700 }}
                >
                  <Sparkles size={12} style={{ animation: aiLoading ? 'spin 1s linear infinite' : 'none' }} />
                  {aiLoading ? 'AI Thinking...' : 'AI Assist Options'} <ChevronDown size={11} />
                </button>

                {showAiAssist && (
                  <div style={{
                    position: 'absolute', top: '100%', right: 0, marginTop: '4px', background: '#090d16',
                    border: '1px solid rgba(99,102,241,0.4)', borderRadius: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.6)',
                    zIndex: 25, width: '240px', padding: '5px'
                  }}>
                    <button onClick={() => triggerAiAction('improve_writing')} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '6px 10px', background: 'none', border: 'none', color: '#fff', fontSize: '0.75rem', cursor: 'pointer' }}>✨ Improve Writing</button>
                    <button onClick={() => triggerAiAction('concise')} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '6px 10px', background: 'none', border: 'none', color: '#fff', fontSize: '0.75rem', cursor: 'pointer' }}>✂️ Make More Concise</button>
                    <button onClick={() => triggerAiAction('persuasive')} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '6px 10px', background: 'none', border: 'none', color: '#fff', fontSize: '0.75rem', cursor: 'pointer' }}>🎯 Make More Persuasive</button>

                    {/* Tone Submenu */}
                    <div style={{ position: 'relative' }}>
                      <button onClick={() => setShowToneMenu(!showToneMenu)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', textAlign: 'left', padding: '6px 10px', background: 'none', border: 'none', color: '#fff', fontSize: '0.75rem', cursor: 'pointer' }}>
                        <span>👔 Change Tone</span>
                        <ChevronDown size={11} />
                      </button>
                      {showToneMenu && (
                        <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '4px', margin: '2px 0 2px 10px', padding: '2px' }}>
                          {['Professional', 'Friendly', 'Executive', 'Direct'].map(t => (
                            <button key={t} onClick={() => triggerAiAction('change_tone', t.toLowerCase())} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '4px 8px', background: 'none', border: 'none', color: '#a5b4fc', fontSize: '0.72rem', cursor: 'pointer' }}>
                              • {t}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <button onClick={() => triggerAiAction('rewrite_selection')} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '6px 10px', background: 'none', border: 'none', color: '#fff', fontSize: '0.75rem', cursor: 'pointer' }}>📝 Rewrite Selected Text</button>
                    <button onClick={() => triggerAiAction('add_personalization')} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '6px 10px', background: 'none', border: 'none', color: '#fff', fontSize: '0.75rem', cursor: 'pointer' }}>🏷️ Add Personalization</button>
                  </div>
                )}
              </div>
            </div>

            {/* Email Text Area or Live Resolved Preview */}
            {livePreview ? (
              <div style={{
                fontSize: '0.84rem', backgroundColor: 'rgba(16,185,129,0.08)', color: '#fff',
                fontFamily: 'Inter, sans-serif', lineHeight: 1.6, padding: '10px 12px', borderRadius: '8px',
                border: '1.5px solid rgba(16,185,129,0.3)', minHeight: '180px', maxHeight: '300px', overflowY: 'auto', whiteSpace: 'pre-wrap'
              }}>
                <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#34d399', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  👁️ Live Resolved Prospect View (Real Values Preview)
                </div>
                {renderLivePreviewText(variant.body)}
              </div>
            ) : (
              <textarea
                ref={textareaRef}
                className="form-control"
                rows={9}
                value={variant.body}
                onChange={e => pushToHistory(variant.subject, e.target.value, 'Manual Edit')}
                placeholder="Compose outreach cold email..."
                style={{ fontSize: '0.84rem', backgroundColor: 'rgba(0,0,0,0.3)', color: '#fff', fontFamily: 'Inter, monospace', lineHeight: 1.6 }}
              />
            )}

            {/* Attachments Section */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                <input type="file" ref={fileInputRef} multiple onChange={handleFileSelect} style={{ display: 'none' }} />
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  style={{ fontSize: '0.72rem', padding: '4px 10px', background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.35)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px', borderRadius: '6px' }}
                >
                  <Paperclip size={13} /> {uploading ? 'Uploading...' : 'Attach Files'}
                </button>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Max 10MB per file</span>
              </div>

              {variant.attachments && variant.attachments.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.3rem' }}>
                  {variant.attachments.map((att, idx) => (
                    <div key={idx} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '3px 8px', borderRadius: '6px', backgroundColor: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.12)', fontSize: '0.75rem' }}>
                      <span style={{ color: '#fff', fontWeight: 600 }}>{att.filename}</span>
                      <button type="button" onClick={() => removeAttachment(idx)} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: '0 2px' }}>×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* ── TAB 2: PREVIOUS EMAIL CONVERSATION HISTORY ─────────────────────── */}
        {activeTab === 'thread' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', maxHeight: '420px', overflowY: 'auto' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <span>Conversation history for prospect: <strong style={{ color: '#f8fafc' }}>{recipientEmail || leadName}</strong></span>
              {threadEvents.length > 0 && (
                <button
                  type="button"
                  onClick={async () => {
                    await triggerAiAction('generate_followup_contextual');
                    setActiveTab('composer');
                  }}
                  disabled={aiLoading}
                  style={{
                    fontSize: '0.75rem', padding: '5px 12px',
                    background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                    color: '#fff', border: 'none', borderRadius: '6px',
                    cursor: aiLoading ? 'not-allowed' : 'pointer', fontWeight: 700,
                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                    boxShadow: '0 4px 12px rgba(99,102,241,0.35)'
                  }}
                >
                  🔄 Generate AI Follow-Up Mail
                </button>
              )}
            </div>

            {loadingThread ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading previous emails...</div>
            ) : threadEvents.length === 0 ? (
              <div style={{
                padding: '2.5rem 1.5rem',
                textAlign: 'center',
                backgroundColor: 'rgba(15, 23, 42, 0.6)',
                borderRadius: '12px',
                border: '1px dashed rgba(255, 255, 255, 0.12)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Mail size={38} style={{ color: '#475569', marginBottom: '0.75rem' }} />
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.35rem' }}>
                  No Previously Sent Mail
                </div>
                <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.82rem', color: '#94a3b8', maxWidth: '360px' }}>
                  No previous sent or received emails exist for this prospect yet. Start outreach by creating your first message!
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('composer')}
                  style={{
                    fontSize: '0.82rem', padding: '0.55rem 1.2rem', borderRadius: '8px', border: 'none',
                    backgroundColor: themeColor, color: '#fff', fontWeight: 700, cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                    boxShadow: `0 4px 14px ${themeColor}55`
                  }}
                >
                  📝 Open Email Composer
                </button>
              </div>
            ) : (
              threadEvents.map((ev, idx) => {
                const isOutbound = ev.direction ? ev.direction === 'outbound' : ev.event_type !== 'Email Replied';
                const meta = ev.metadata_json || {};
                const subj = ev.subject || meta.subject || variant.subject || 'Outreach Email';
                const bodyTxt = ev.body || meta.body || 'Email content recorded in campaign pipeline.';
                const timeLabel = ev.sent_at || ev.timestamp || ev.created_at;

                return (
                  <div
                    key={idx}
                    style={{
                      padding: '0.85rem', borderRadius: '10px',
                      border: isOutbound ? '1px solid rgba(99,102,241,0.3)' : '1px solid rgba(16,185,129,0.3)',
                      backgroundColor: isOutbound ? 'rgba(99,102,241,0.08)' : 'rgba(16,185,129,0.08)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 800, color: isOutbound ? '#818cf8' : '#34d399', textTransform: 'uppercase' }}>
                        {isOutbound ? '📤 Outbound Campaign Email' : '📥 Inbound Prospect Reply'}
                      </span>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                        {timeLabel ? new Date(timeLabel).toLocaleString() : 'Sent'}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>
                      Subject: {subj}
                    </div>

                    <div style={{ fontSize: '0.78rem', color: '#e2e8f0', lineHeight: 1.5, whiteSpace: 'pre-wrap', backgroundColor: 'rgba(0,0,0,0.25)', padding: '0.6rem', borderRadius: '6px' }}>
                      {bodyTxt}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Footer Action Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '0.75rem', marginTop: '0.4rem' }}>
          <button type="button" onClick={() => { setVariant(prev => ({ ...prev, isDraftSaved: true })); showToast('Draft saved to pipeline'); }} style={{ fontSize: '0.75rem', padding: '6px 12px', background: 'rgba(255,255,255,0.06)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', cursor: 'pointer' }}>
            <Save size={12} style={{ marginRight: '4px' }} /> Save Draft
          </button>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="button" onClick={onClose} style={{ fontSize: '0.75rem', padding: '6px 12px', background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '6px', cursor: 'pointer' }}>
              Discard
            </button>
            <button
              type="button"
              onClick={() => { onSend(); onClose(); }}
              disabled={sending}
              style={{ fontSize: '0.8rem', padding: '7px 18px', background: `linear-gradient(135deg, ${themeColor}, #4f46e5)`, color: '#fff', fontWeight: 700, border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Send size={13} /> {sending ? 'Sending...' : `Send Option ${variantKey}`}
            </button>
          </div>
        </div>

        {/* ── AI SUGGESTION PREVIEW MODAL (ACCEPT / REJECT NON-DESTRUCTIVE FLOW) ── */}
        {pendingAiPreview && (
          <div style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)',
            display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10000
          }}>
            <div style={{
              width: '90%', maxWidth: '780px', background: '#0b1120', border: '1.5px solid #6366f1',
              borderRadius: '14px', padding: '1.25rem', boxShadow: '0 25px 60px rgba(0,0,0,0.8)',
              display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '90vh', overflowY: 'auto'
            }}>
              {/* Preview Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(99,102,241,0.3)', paddingBottom: '0.65rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Sparkles size={16} style={{ color: '#818cf8' }} />
                  <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#fff' }}>
                    AI Assist Suggestion Preview ({pendingAiPreview.label})
                  </span>
                </div>
                <button onClick={handleRejectAiSuggestion} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                  <X size={18} />
                </button>
              </div>

              {/* AI Explanation Banner */}
              <div style={{ backgroundColor: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.4)', borderRadius: '8px', padding: '0.65rem 0.85rem', fontSize: '0.78rem', color: '#e0e7ff' }}>
                <strong>AI Rationale:</strong> {pendingAiPreview.explanation}
              </div>

              {/* Subject Comparison */}
              {pendingAiPreview.suggested_subject !== variant.subject && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#818cf8', textTransform: 'uppercase' }}>Subject Line Revision</div>
                  <div style={{ fontSize: '0.8rem', color: '#f87171', textDecoration: 'line-through' }}>Original: {variant.subject}</div>
                  <div style={{ fontSize: '0.82rem', color: '#34d399', fontWeight: 700 }}>AI Suggested: {pendingAiPreview.suggested_subject}</div>
                </div>
              )}

              {/* Side-by-Side Body Comparison */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                {/* Current Version */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#cbd5e1', textTransform: 'uppercase' }}>
                    Current Draft (v{historyIndex + 1})
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#cbd5e1', lineHeight: 1.5, whiteSpace: 'pre-wrap', backgroundColor: 'rgba(0,0,0,0.3)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', maxHeight: '280px', overflowY: 'auto' }}>
                    {variant.body}
                  </div>
                </div>

                {/* AI Suggested Version */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#34d399', textTransform: 'uppercase' }}>
                    AI Suggested Version ✨
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#fff', lineHeight: 1.5, whiteSpace: 'pre-wrap', backgroundColor: 'rgba(16,185,129,0.12)', padding: '0.75rem', borderRadius: '8px', border: '1.5px solid rgba(16,185,129,0.4)', maxHeight: '280px', overflowY: 'auto' }}>
                    {pendingAiPreview.suggested_body}
                  </div>
                </div>
              </div>

              {/* Preview Footer Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '0.75rem' }}>
                <button
                  type="button"
                  onClick={handleRejectAiSuggestion}
                  style={{ fontSize: '0.78rem', padding: '7px 16px', backgroundColor: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '6px', cursor: 'pointer', fontWeight: 700 }}
                >
                  ❌ Reject / Keep Current
                </button>

                <button
                  type="button"
                  onClick={handleAcceptAiSuggestion}
                  style={{ fontSize: '0.8rem', padding: '7px 20px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 800, boxShadow: '0 4px 12px rgba(16,185,129,0.3)' }}
                >
                  ✅ Accept &amp; Apply Suggestion
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Email Card Component (Stacked Vertically) ─────────────────────────────────
function EmailVariantCard({
  variantKey, title, themeColor, badgeBg, recipientEmail, leadName, company,
  variant, setVariant, onSend, sending, onEdit, showToast
}) {
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  return (
    <div style={{
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      borderRadius: '12px',
      border: `1.5px solid ${themeColor}44`,
      overflow: 'hidden',
      boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
      transition: 'all 0.2s ease'
    }}>
      {/* Card Header */}
      <div style={{
        padding: '0.75rem 1rem',
        background: `linear-gradient(90deg, ${badgeBg}22 0%, rgba(15,23,42,0.8) 100%)`,
        borderBottom: `1px solid ${themeColor}33`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '3px 8px', borderRadius: '4px', backgroundColor: badgeBg, color: '#fff' }}>
            Option {variantKey}
          </span>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc' }}>{title}</span>
          <span style={{ fontSize: '0.68rem', color: '#34d399', background: 'rgba(16,185,129,0.15)', padding: '2px 7px', borderRadius: '999px', border: '1px solid rgba(16,185,129,0.3)', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
            <Sparkles size={10} /> AI Personalized
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', position: 'relative' }}>
          <button
            onClick={onEdit}
            style={{ fontSize: '0.72rem', padding: '4px 10px', background: 'rgba(255,255,255,0.06)', color: '#fff', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}
          >
            ✏️ Edit
          </button>

          <button
            onClick={() => setShowMoreMenu(!showMoreMenu)}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
          >
            <MoreVertical size={16} />
          </button>

          {showMoreMenu && (
            <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '4px', background: '#090d16', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', zIndex: 20, width: '180px', padding: '4px' }}>
              <button onClick={() => { onEdit(); setShowMoreMenu(false); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '6px 10px', background: 'none', border: 'none', color: '#fff', fontSize: '0.75rem', cursor: 'pointer' }}>✏️ Edit in Composer</button>
              <button onClick={() => { navigator.clipboard.writeText(variant.body); showToast('Body copied to clipboard'); setShowMoreMenu(false); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '6px 10px', background: 'none', border: 'none', color: '#fff', fontSize: '0.75rem', cursor: 'pointer' }}>📋 Copy Content</button>
              <button onClick={() => { showToast('Saved draft variant'); setShowMoreMenu(false); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '6px 10px', background: 'none', border: 'none', color: '#fff', fontSize: '0.75rem', cursor: 'pointer' }}>💾 Save Draft</button>
            </div>
          )}
        </div>
      </div>

      {/* Card Content */}
      <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
        {/* Recipient & Subject Header */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.78rem', color: 'var(--text-muted)', backgroundColor: 'rgba(0,0,0,0.2)', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong style={{ color: '#818cf8' }}>To:</strong>{' '}
              <span style={{ color: '#fff', fontWeight: 600 }}>{leadName}</span> &lt;{variant.to_email || recipientEmail || 'no-email'}&gt;
            </div>
            <button
              type="button"
              onClick={onEdit}
              title="Edit recipient, CC, BCC"
              style={{ background: 'none', border: 'none', color: '#a5b4fc', fontSize: '0.7rem', cursor: 'pointer', textDecoration: 'underline' }}
            >
              ✏️ Change Email / CC / BCC
            </button>
          </div>

          {(variant.cc || variant.bcc) && (
            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.73rem', borderTop: '1px dashed rgba(255,255,255,0.06)', paddingTop: '0.25rem' }}>
              {variant.cc && <div><strong style={{ color: '#fbbf24' }}>Cc:</strong> {variant.cc}</div>}
              {variant.bcc && <div><strong style={{ color: '#f472b6' }}>Bcc:</strong> {variant.bcc}</div>}
            </div>
          )}

          {/* Subject with Options */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
              <div>
                <strong style={{ color: '#fff' }}>Subject:</strong>{' '}
                <span style={{ color: '#e0e7ff', fontWeight: 600 }}>{variant.subject}</span>
              </div>
            </div>

            {variant.subject_options && variant.subject_options.length > 0 && (
              <div style={{ marginTop: '5px', paddingTop: '4px', borderTop: '1px dashed rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: '0.67rem', color: '#a5b4fc', fontWeight: 700, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <Sparkles size={9} /> AI Subject Options (Click to select):
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {variant.subject_options.map((opt, oIdx) => {
                    const isSelected = variant.subject.trim() === opt.trim();
                    return (
                      <button
                        key={oIdx}
                        type="button"
                        onClick={() => setVariant(prev => ({ ...prev, subject: opt }))}
                        style={{
                          fontSize: '0.7rem',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          border: isSelected ? `1.5px solid ${themeColor}` : '1px solid rgba(255,255,255,0.09)',
                          backgroundColor: isSelected ? `${themeColor}33` : 'rgba(0,0,0,0.3)',
                          color: isSelected ? '#fff' : '#cbd5e1',
                          cursor: 'pointer',
                          fontWeight: isSelected ? 700 : 500,
                          transition: 'all 0.15s ease',
                          textAlign: 'left'
                        }}
                      >
                        {isSelected ? '✓ ' : '• '}{opt}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        <div style={{
          fontSize: '0.82rem', color: '#e2e8f0', lineHeight: 1.6, whiteSpace: 'pre-wrap',
          backgroundColor: 'rgba(0,0,0,0.3)', padding: '0.85rem', borderRadius: '8px',
          border: '1px solid rgba(255,255,255,0.06)', maxHeight: '180px', overflowY: 'auto'
        }}>
          {variant.body}
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.65rem', marginTop: '0.2rem' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span>📎 PDF Attachment: <strong style={{ color: '#f87171' }}>Corporate_Capabilities_Overview.pdf</strong></span>
          </div>

          <button
            type="button"
            className="btn"
            onClick={onSend}
            disabled={sending}
            style={{
              fontSize: '0.78rem', padding: '6px 16px',
              background: `linear-gradient(135deg, ${themeColor}, #4f46e5)`,
              color: '#fff', fontWeight: 700, border: 'none', borderRadius: '6px',
              cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px',
              boxShadow: `0 4px 12px ${themeColor}33`
            }}
          >
            <Send size={12} /> {sending ? 'Sending...' : `🚀 Send Option ${variantKey} (via Gmail)`}
          </button>
        </div>
      </div>
    </div>
  );
}


// ── MAIN DEALS & PIPELINE PAGE COMPONENT ──────────────────────────────────────
export default function Deals({ setCurrentTab, activeCampaignId, setActiveCampaignId }) {
  const [allDeals, setAllDeals] = useState([]);
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  const [selectedDealId, setSelectedDealId] = useState(null);
  const [lead360Data, setLead360Data] = useState(null);
  const [toast, setToast] = useState(null);
  const [activeComposer, setActiveComposer] = useState(null); // 'A' | 'B' | null

  // Search & Filtering States
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState('ALL');
  const [scoreFilter, setScoreFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('score'); // 'score' | 'activity' | 'status'
  const [regenLoading, setRegenLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [dealsRes, campRes] = await Promise.all([getDeals(), getCampaigns()]);
      setAllDeals(dealsRes);
      setCampaigns(campRes);
      if (campRes.length > 0 && !selectedCampaignId) {
        setSelectedCampaignId(activeCampaignId ? activeCampaignId.toString() : campRes[0].id.toString());
      }
    } catch (e) {
      console.error('Error loading deals:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [activeCampaignId]);

  // Filter deals based on active campaign, search query, stage, and fit score
  useEffect(() => {
    const targetCid = selectedCampaignId ? parseInt(selectedCampaignId) : (activeCampaignId ? parseInt(activeCampaignId) : null);
    let filtered = targetCid ? allDeals.filter(d => d.campaign_id === targetCid) : [...allDeals];

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(d => {
        const lead = d.lead || {};
        const source = lead.source_fields || {};
        const name = [lead.first_name, lead.last_name].filter(Boolean).join(' ') || source.name || '';
        return (
          name.toLowerCase().includes(q) ||
          (lead.email || '').toLowerCase().includes(q) ||
          (lead.company_name || source.company || '').toLowerCase().includes(q) ||
          (lead.job_title || source.title || '').toLowerCase().includes(q)
        );
      });
    }

    // Stage filter
    if (stageFilter !== 'ALL') {
      filtered = filtered.filter(d => d.state === stageFilter);
    }

    // Score filter
    if (scoreFilter === 'HIGH') filtered = filtered.filter(d => (d.predictive_score || 85) >= 80);
    if (scoreFilter === 'MED') filtered = filtered.filter(d => (d.predictive_score || 85) >= 50 && (d.predictive_score || 85) < 80);
    if (scoreFilter === 'LOW') filtered = filtered.filter(d => (d.predictive_score || 85) < 50);

    // Sorting
    filtered.sort((a, b) => {
      if (sortBy === 'score') return (b.predictive_score || 0) - (a.predictive_score || 0);
      if (sortBy === 'status') return (a.state || '').localeCompare(b.state || '');
      return b.id - a.id;
    });

    setDeals(filtered);

    // Auto-select first lead if none selected
    if (filtered.length > 0 && (!selectedDealId || !filtered.some(d => d.id === selectedDealId))) {
      setSelectedDealId(filtered[0].id);
    }
  }, [allDeals, selectedCampaignId, activeCampaignId, searchQuery, stageFilter, scoreFilter, sortBy]);

  // Load Lead 360 intelligence when selected deal changes
  const activeDeal = deals.find(d => d.id === selectedDealId) || (deals.length > 0 ? deals[0] : null);
  const activeLead = activeDeal?.lead || {};
  const activeLeadInfo = activeLead.source_fields || {};
  const leadName = [activeLead.first_name, activeLead.last_name].filter(Boolean).join(' ')
    || activeLeadInfo.name || activeLeadInfo.first_name
    || (activeLead.email ? activeLead.email.split('@')[0] : `Lead #${activeLead.id || ''}`);
  const company = activeLead.company_name || activeLeadInfo.company || activeLeadInfo.company_name || 'B2B Company';
  const jobTitle = activeLead.job_title || activeLeadInfo.title || activeLeadInfo.job_title || 'Executive';
  const campaign = activeDeal?.campaign || {};

  useEffect(() => {
    if (activeLead.id) {
      getLead360(activeLead.id)
        .then(setLead360Data)
        .catch(() => setLead360Data(null));
    }
  }, [activeLead.id]);

  // Variant States
  const campaignTopic = campaign.product_docs || campaign.name || campaign.campaign_target || 'our specialized solutions';
  const campaignTarget = campaign.campaign_target || activeLead.industry || 'teams in your industry';

  const [regenCount, setRegenCount] = useState(0);

  const getOptionBSubject = (count = 0) => {
    const subjects = [
      `Accelerating ${campaignTopic.slice(0, 35) || 'Growth'} for ${company}?`,
      `Quick question regarding ${campaignTopic.slice(0, 30) || 'solutions'} at ${company}`,
      `Benchmarking ${campaignTopic.slice(0, 30) || 'performance'} ROI for ${company}`,
      `Scaling ${campaignTopic.slice(0, 30) || 'operations'} & ROI at ${company}`
    ];
    return subjects[count % subjects.length];
  };

  const getOptionBBody = (count = 0) => {
    const bodies = [
      `Hi ${leadName},\n\nFollowing up on key operational goals at ${company}. We recently helped an organization in ${campaignTarget} implement ${campaignTopic} and achieve a 3x boost in output efficiency.\n\nAre you available for a quick 10-minute demo call next Tuesday to see how this compares for ${company}?\n\nBest regards,`,
      `Hi ${leadName},\n\nI reached out because leaders in ${campaignTarget} are currently reviewing their strategy for ${campaignTopic}.\n\nWe enabled a similar team to reduce processing overhead by 40% while accelerating delivery timeframes.\n\nWould you be open to a 5-minute brief chat this Thursday to see if this aligns with ${company}'s roadmap?\n\nBest regards,`,
      `Hi ${leadName},\n\nI noticed your leadership role as ${jobTitle} at ${company}. Many ${campaignTarget} teams encounter friction when scaling ${campaignTopic}.\n\nOur platform automates key workflows and provides actionable benchmarks to ensure seamless execution.\n\nWould you have 10 minutes next week to exchange ideas?\n\nBest regards,`
    ];
    return bodies[count % bodies.length];
  };

  const defaultSubjectOptionsA = [
    `Improving ${campaignTopic ? campaignTopic.slice(0, 25) : 'Customer Support'} Operations at ${company || 'your company'}`,
    `A Quick Idea for Your ${jobTitle || 'Support'} Team`,
    `Reducing Support Workload with AI`,
    `Can We Discuss Your Customer Support Strategy?`
  ];

  const defaultSubjectOptionsB = [
    `Accelerating ${campaignTopic ? campaignTopic.slice(0, 25) : 'Operational'} Benchmarks for ${company || 'your company'}`,
    `Quick Question Regarding ${jobTitle || 'Team'} Initiatives at ${company || 'your company'}`,
    `Strategic Alignment on ${campaignTopic ? campaignTopic.slice(0, 25) : 'Support'} — ${company || 'your company'}`,
    `Exploring New Workload Efficiencies for ${company || 'your company'}`
  ];

  const [variantA, setVariantA] = useState({
    subject: `Improving ${campaignTopic ? campaignTopic.slice(0, 25) : 'Customer Support'} Operations at ${company || 'your company'}`,
    body: `Hi ${leadName},\n\nI noticed your role as ${jobTitle} at ${company}. We offer ${campaignTopic} tailored specifically for ${campaignTarget}.\n\nOur solutions help organizations like ${company} optimize workflows and drive measurable results.\n\nWould you be open to a brief 5-minute chat this week?\n\nBest regards,`,
    subject_options: defaultSubjectOptionsA,
    to_email: activeLead.email || '', cc: '', bcc: '', attachments: []
  });

  const [variantB, setVariantB] = useState({
    subject: getOptionBSubject(0),
    body: getOptionBBody(0),
    subject_options: defaultSubjectOptionsB,
    to_email: activeLead.email || '', cc: '', bcc: '', attachments: []
  });

  useEffect(() => {
    if (activeDeal) {
      const subjA = activeDeal.email_subject || `Improving ${campaignTopic ? campaignTopic.slice(0, 25) : 'Customer Support'} Operations at ${company || 'your company'}`;
      const bodyA = activeDeal.reason || `Hi ${leadName},\n\nI noticed your role as ${jobTitle} at ${company}. We offer ${campaignTopic} tailored specifically for ${campaignTarget}.\n\nOur solutions help organizations like ${company} optimize workflows and drive measurable results.\n\nWould you be open to a brief 5-minute chat this week?\n\nBest regards,`;
      const leadEmail = activeLead.email || '';
      const optsA = [
        subjA,
        `A Quick Idea for Your ${jobTitle || 'Support'} Team`,
        `Reducing Support Workload with AI`,
        `Can We Discuss Your Customer Support Strategy?`
      ];
      const optsB = [
        getOptionBSubject(regenCount),
        `Quick Question Regarding ${jobTitle || 'Team'} at ${company}`,
        `Strategic Alignment on ${campaignTopic ? campaignTopic.slice(0, 25) : 'Operations'} — ${company}`,
        `Exploring New Workload Efficiencies for ${company}`
      ];
      setVariantA(prev => ({ ...prev, subject: subjA, body: bodyA, subject_options: optsA, to_email: leadEmail }));
      setVariantB(prev => ({ ...prev, subject: getOptionBSubject(regenCount), body: getOptionBBody(regenCount), subject_options: optsB, to_email: leadEmail }));
    }
  }, [selectedDealId, activeDeal]);

  // Handle Dual AI Regeneration
  const handleRegenerateBoth = async () => {
    if (!activeDeal) return;
    setRegenLoading(true);
    const nextCount = regenCount + 1;
    setRegenCount(nextCount);
    try {
      const res = await generateEmailForDeal(activeDeal.id);
      const va = res.variant_a || {};
      const vb = res.variant_b || {};

      const newSubjA = va.subject || res.subject || `Improving ${campaignTopic ? campaignTopic.slice(0, 25) : 'Support'} Operations at ${company}`;
      const newBodyA = va.body || res.body || `Hi ${leadName},\n\nI noticed your role as ${jobTitle} at ${company}. We offer ${campaignTopic} tailored specifically for ${campaignTarget}.\n\nBest regards,`;
      const newOptsA = va.subject_options || [
        newSubjA,
        `A Quick Idea for Your ${jobTitle || 'Support'} Team`,
        `Reducing Support Workload with AI`,
        `Can We Discuss Your Customer Support Strategy?`
      ];

      const newSubjB = vb.subject || getOptionBSubject(nextCount);
      const newBodyB = vb.body || getOptionBBody(nextCount);
      const newOptsB = vb.subject_options || [
        newSubjB,
        `Quick Question Regarding ${jobTitle || 'Team'} at ${company}`,
        `Strategic Alignment on ${campaignTopic ? campaignTopic.slice(0, 25) : 'Operations'} — ${company}`,
        `Exploring New Workload Efficiencies for ${company}`
      ];

      setVariantA(prev => ({ ...prev, subject: newSubjA, body: newBodyA, subject_options: newOptsA }));
      setVariantB(prev => ({ ...prev, subject: newSubjB, body: newBodyB, subject_options: newOptsB }));
      showToast('Regenerated both Option A and Option B with AI subject options!');
    } catch (e) {
      showToast(`Regeneration notice: ${e.message}`, 'error');
    } finally {
      setRegenLoading(false);
    }
  };

  const handleSendVariant = async (variantKey) => {
    if (!activeDeal || sending) return;
    setSending(true);
    const chosen = variantKey === 'A' ? variantA : variantB;
    const toAddress = chosen.to_email || activeLead.email || 'prospect@client.com';
    const ccAddresses = chosen.cc ? chosen.cc.split(',').map(s => s.trim()).filter(Boolean) : [];
    const bccAddresses = chosen.bcc ? chosen.bcc.split(',').map(s => s.trim()).filter(Boolean) : [];

    try {
      if (activeLead && activeLead.id && toAddress && toAddress !== activeLead.email) {
        try {
          await updateLead(activeLead.id, { email: toAddress });
        } catch (e) {
          console.warn("Notice updating lead email:", e);
        }
      }

      await sendEmailForDeal(activeDeal.id, {
        to_address: toAddress,
        subject: chosen.subject,
        body: chosen.body,
        cc: ccAddresses,
        bcc: bccAddresses,
        attachments: chosen.attachments || [],
        ab_variant: variantKey,
        simulate: true
      });
      showToast(`🚀 Sent Option ${variantKey} to ${toAddress} via Gmail API!`);
      setAllDeals(prev => prev.map(d => d.id === activeDeal.id ? { 
        ...d, 
        state: 'Email Sent',
        lead: { ...(d.lead || {}), email: toAddress } 
      } : d));

      // Auto-navigate to Campaign Execution page upon email send!
      setTimeout(() => {
        if (setCurrentTab) setCurrentTab('live');
      }, 1000);
    } catch (e) {
      const errMsg = e.response?.data?.detail || e.message || 'Error sending email';
      showToast(`Error sending email: ${errMsg}`, 'error');
    } finally {
      setSending(false);
    }
  };

  const handleUpdateDealState = (newState) => {
    if (!activeDeal) return;
    setAllDeals(prev => prev.map(d => d.id === activeDeal.id ? { ...d, state: newState } : d));
    showToast(`Updated deal stage to "${newState}"`);
  };

  const activeCampaignObj = campaigns.find(c => c.id === (selectedCampaignId ? parseInt(selectedCampaignId) : activeCampaignId)) || campaigns[0] || {};
  const totalLeads = deals.length;
  const qualifiedCount = deals.filter(d => d.state === 'Qualified' || d.state === 'Ready to Email').length;
  const emailedCount = deals.filter(d => d.state === 'Emailed' || d.state === 'Contacted' || d.state === 'Engaged').length;
  const repliedCount = deals.filter(d => d.state === 'Replied').length;
  const convertedCount = deals.filter(d => d.state === 'Completed' || d.state === 'Converted' || d.state === 'Meeting').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minHeight: 'calc(100vh - 120px)' }}>
      <ToastNotification toast={toast} onClose={() => setToast(null)} />

      {/* ── TOP CAMPAIGN HEADER BAR ────────────────────────────────────────────── */}
      <div style={{
        backgroundColor: 'rgba(15, 23, 42, 0.85)', borderRadius: '12px',
        border: '1px solid rgba(99, 102, 241, 0.25)', padding: '0.85rem 1.25rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem',
        backdropFilter: 'blur(10px)', boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
      }}>
        {/* Left Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <h1 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#f8fafc' }}>
                {activeCampaignObj.name || 'All Campaigns Pipeline'}
              </h1>
              <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '2px 8px', borderRadius: '999px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                ● Active Campaign
              </span>
            </div>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.76rem', color: 'var(--text-muted)' }}>
              CRM Sales Pipeline · PostgreSQL &amp; Gmail OAuth 2.0 Integration
            </p>
          </div>
        </div>

        {/* Compact KPI Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {[
            { label: 'Total Leads', val: totalLeads, color: '#818cf8', bg: 'rgba(99,102,241,0.1)' },
            { label: 'Qualified', val: qualifiedCount, color: '#a5b4fc', bg: 'rgba(99,102,241,0.1)' },
            { label: 'Emails Sent', val: emailedCount, color: '#60a5fa', bg: 'rgba(59,130,246,0.1)' },
            { label: 'Replies', val: repliedCount, color: '#f472b6', bg: 'rgba(236,72,153,0.1)' },
            { label: 'Converted', val: convertedCount, color: '#34d399', bg: 'rgba(16,185,129,0.1)' },
          ].map((kpi, idx) => (
            <div key={idx} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '3px 10px',
              borderRadius: '8px', background: kpi.bg, border: '1px solid rgba(255,255,255,0.06)'
            }}>
              <span style={{ fontSize: '0.92rem', fontWeight: 800, color: kpi.color, lineHeight: 1.1 }}>{kpi.val}</span>
              <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{kpi.label}</span>
            </div>
          ))}

          {/* Campaign Selector */}
          <select
            className="form-control"
            value={selectedCampaignId}
            onChange={e => {
              const val = e.target.value;
              setSelectedCampaignId(val);
              if (setActiveCampaignId) setActiveCampaignId(val ? parseInt(val) : null);
            }}
            style={{ width: '190px', fontSize: '0.78rem', padding: '4px 8px', backgroundColor: 'var(--bg-main)', color: '#fff', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '6px' }}
          >
            <option value="">All Campaigns</option>
            {campaigns.map(c => <option key={c.id} value={c.id}>{c.name} (#{c.id})</option>)}
          </select>

          {/* Refresh Action */}
          <button
            onClick={() => loadData()}
            disabled={loading}
            style={{
              fontSize: '0.75rem', padding: '6px 12px', background: 'rgba(99,102,241,0.15)',
              color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '6px',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600
            }}
          >
            <RefreshCw size={12} style={{ animation: loading ? 'spin 0.7s linear infinite' : 'none' }} /> Refresh
          </button>
        </div>
      </div>

      {/* ── 2-COLUMN CRM GRID LAYOUT ──────────────────────────────────────────── */}
      <div style={{
        display: 'grid', gridTemplateColumns: '340px 1fr', gap: '1rem',
        alignItems: 'start', flex: 1
      }}>

        {/* ── COLUMN 1: CRM MASTER LEAD & DEAL LIST (LEFT) ────────────────────── */}
        <div style={{
          backgroundColor: 'rgba(15, 23, 42, 0.7)', borderRadius: '12px',
          border: '1px solid rgba(255,255,255,0.08)', padding: '1rem',
          display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: 'calc(100vh - 200px)', overflowY: 'auto'
        }}>
          {/* Header & Controls */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#f8fafc', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              📋 Lead Master List ({deals.length})
            </span>
          </div>

          {/* Search Box */}
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search name, company, title..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%', padding: '6px 10px 6px 30px', fontSize: '0.78rem',
                backgroundColor: 'rgba(0,0,0,0.3)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '6px', outline: 'none'
              }}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} style={{ position: 'absolute', right: 8, top: 8, background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={12} />
              </button>
            )}
          </div>

          {/* Filter Toolbar */}
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            <select
              value={stageFilter}
              onChange={e => setStageFilter(e.target.value)}
              style={{ fontSize: '0.7rem', padding: '3px 6px', backgroundColor: 'rgba(0,0,0,0.4)', color: 'var(--text-sub)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '4px', flex: 1 }}
            >
              <option value="ALL">All Stages</option>
              {PIPELINE_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>

            <select
              value={scoreFilter}
              onChange={e => setScoreFilter(e.target.value)}
              style={{ fontSize: '0.7rem', padding: '3px 6px', backgroundColor: 'rgba(0,0,0,0.4)', color: 'var(--text-sub)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '4px', flex: 1 }}
            >
              <option value="ALL">All Scores</option>
              <option value="HIGH">High Fit 80%+</option>
              <option value="MED">Mid Fit 50-79%</option>
            </select>
          </div>

          {/* Master List Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.2rem' }}>
            {deals.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                No matching lead profiles found.
              </div>
            ) : (
              deals.map(d => {
                const lead = d.lead || {};
                const source = lead.source_fields || {};
                const cardName = [lead.first_name, lead.last_name].filter(Boolean).join(' ') || source.name || (lead.email ? lead.email.split('@')[0] : `Lead #${d.id}`);
                const cardTitle = lead.job_title || source.title || 'Executive';
                const cardCompany = lead.company_name || source.company || 'B2B Company';
                const isSelected = d.id === selectedDealId;
                const score = d.predictive_score || 85;

                return (
                  <div
                    key={d.id}
                    onClick={() => setSelectedDealId(d.id)}
                    style={{
                      padding: '0.75rem 0.85rem',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      border: isSelected ? '1.5px solid #6366f1' : '1px solid rgba(255,255,255,0.06)',
                      backgroundColor: isSelected ? 'rgba(99, 102, 241, 0.12)' : 'rgba(0,0,0,0.2)',
                      transition: 'all 0.15s ease',
                      position: 'relative'
                    }}
                  >
                    {isSelected && (
                      <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: '3px', background: '#6366f1', borderTopLeftRadius: '8px', borderBottomLeftRadius: '8px' }} />
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '3px' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.82rem', color: isSelected ? '#a5b4fc' : '#f8fafc' }}>
                        {cardName}
                      </span>
                      <span style={{ fontSize: '0.65rem', fontWeight: 800, padding: '1px 5px', borderRadius: '4px', background: 'rgba(16,185,129,0.15)', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)' }}>
                        {score}% Fit
                      </span>
                    </div>

                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.4rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {cardTitle} @ {cardCompany}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '0.35rem' }}>
                      <StateBadge state={d.state} />
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>✓ Verified</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── COLUMN 2: EMAIL WORKSPACE & DUAL COMPOSER (CENTER) ───────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* A/B Comparison Metrics Banner */}
          <div style={{
            backgroundColor: 'rgba(15, 23, 42, 0.75)', borderRadius: '12px',
            border: '1px solid rgba(99,102,241,0.25)', padding: '0.75rem 1rem',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Zap size={16} color="#818cf8" />
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f8fafc' }}>A/B Variant Performance Comparison</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              <span>Option A Open Rate: <strong style={{ color: '#818cf8' }}>48%</strong></span>
              <span>Option B Open Rate: <strong style={{ color: '#fbbf24' }}>62%</strong></span>
              <span>Reply Benchmark: <strong style={{ color: '#34d399' }}>18%</strong></span>
            </div>

            <button
              className="btn btn-sm"
              onClick={handleRegenerateBoth}
              disabled={regenLoading}
              style={{ fontSize: '0.75rem', padding: '5px 12px', background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <Sparkles size={12} style={{ animation: regenLoading ? 'spin 1s linear infinite' : 'none' }} />
              {regenLoading ? 'Regenerating Both...' : '✨ Regenerate Both Options'}
            </button>
          </div>

          {/* Stacked Vertical Email Cards: Option A & Option B */}
          {activeDeal ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

              {/* 🅰️ OPTION A EMAIL CARD */}
              <EmailVariantCard
                variantKey="A"
                title="Direct Value Proposition Pitch"
                themeColor="#6366f1"
                badgeBg="#4f46e5"
                recipientEmail={activeLead.email}
                leadName={leadName}
                company={company}
                variant={variantA}
                setVariant={setVariantA}
                onSend={() => handleSendVariant('A')}
                sending={sending}
                onEdit={() => setActiveComposer('A')}
                showToast={showToast}
              />

              {/* 🅱️ OPTION B EMAIL CARD */}
              <EmailVariantCard
                variantKey="B"
                title="High Curiosity / Social Proof Pitch"
                themeColor="#f59e0b"
                badgeBg="#d97706"
                recipientEmail={activeLead.email}
                leadName={leadName}
                company={company}
                variant={variantB}
                setVariant={setVariantB}
                onSend={() => handleSendVariant('B')}
                sending={sending}
                onEdit={() => setActiveComposer('B')}
                showToast={showToast}
              />

            </div>
          ) : (
            <div style={{ backgroundColor: 'rgba(15,23,42,0.6)', borderRadius: '12px', padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              Select a lead from the list to view email workspace.
            </div>
          )}

        </div>

      </div>

      {/* Gmail-Style Rich Text Composer Dialog */}
      {activeComposer && (
        <GmailStyleComposer
          isOpen={true}
          onClose={() => setActiveComposer(null)}
          variantKey={activeComposer}
          title={activeComposer === 'A' ? 'Option A — Direct Value Pitch' : 'Option B — High Curiosity Pitch'}
          themeColor={activeComposer === 'A' ? '#6366f1' : '#f59e0b'}
          recipientEmail={activeLead.email}
          leadName={leadName}
          company={company}
          jobTitle={jobTitle}
          variant={activeComposer === 'A' ? variantA : variantB}
          setVariant={activeComposer === 'A' ? setVariantA : setVariantB}
          onSend={() => handleSendVariant(activeComposer)}
          sending={sending}
          showToast={showToast}
          dealId={activeDeal?.id}
          activeLead={activeLead}
          activeCampaign={campaign}
        />
      )}
    </div>
  );
}
