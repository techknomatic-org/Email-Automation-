import React, { useState, useEffect, useRef } from 'react';
import { getCsvFiles, uploadCsvFile, getCsvPreview, deleteCsvFile } from '../services/api';
import {
  X, UploadCloud, FileText, CheckCircle2, AlertCircle,
  Users, Building2, Briefcase, ChevronRight, Trash2
} from 'lucide-react';

export default function CsvUploadModal({ isOpen, onClose, onSelectCsv }) {
  const [files, setFiles] = useState([]);
  const [selectedFilename, setSelectedFilename] = useState('');
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [importAsLeads, setImportAsLeads] = useState(true);   // ON by default
  const [dragActive, setDragActive] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  // ── Fetch available CSV/Excel files ──────────────────────────────────────
  const fetchFiles = async () => {
    setLoadingFiles(true);
    setError('');
    try {
      const res = await getCsvFiles();
      const list = res.files || [];
      setFiles(list);
      if (list.length > 0) {
        const nextSelected = list.find(f => f.filename === selectedFilename) ? selectedFilename : list[0].filename;
        setSelectedFilename(nextSelected);
        loadPreview(nextSelected);
      } else {
        setSelectedFilename('');
        setPreview(null);
      }
    } catch (err) {
      setError('Could not load file list. Is the backend running?');
    } finally {
      setLoadingFiles(false);
    }
  };

  const loadPreview = async (filename) => {
    if (!filename) { setPreview(null); return; }
    try {
      const res = await getCsvPreview(filename);
      setPreview(res);
    } catch {
      setPreview(null);
    }
  };

  const handleDeleteFile = async (filename, e) => {
    if (e) e.stopPropagation();
    if (!filename) return;
    if (!window.confirm(`Are you sure you want to delete dataset file '${filename}' and its imported contacts?`)) {
      return;
    }
    try {
      await deleteCsvFile(filename);
      setError('');
      if (selectedFilename === filename) {
        setSelectedFilename('');
        setPreview(null);
      }
      await fetchFiles();
    } catch (err) {
      setError('Failed to delete file: ' + (err.response?.data?.detail || err.message));
    }
  };

  useEffect(() => {
    if (isOpen) {
      setUploadSuccess(null);
      setError('');
      fetchFiles();
    }
  }, [isOpen]);

  const handleSelectFile = (filename) => {
    setSelectedFilename(filename);
    loadPreview(filename);
    setUploadSuccess(null);
  };

  // ── File upload handler ────────────────────────────────────────────────────
  const handleFileUpload = async (fileObj) => {
    if (!fileObj) return;
    if (!fileObj.name.toLowerCase().endsWith('.csv') && !fileObj.name.toLowerCase().endsWith('.xlsx')) {
      setError('Please select a valid .csv or .xlsx file.');
      return;
    }
    setUploading(true);
    setError('');
    setUploadSuccess(null);
    try {
      const res = await uploadCsvFile(fileObj, importAsLeads);
      setUploadSuccess(res.filename);
      await fetchFiles();
      setSelectedFilename(res.filename);
      if (res.metadata) setPreview(res.metadata);
    } catch (err) {
      setError('Upload failed: ' + (err.response?.data?.detail || err.message));
    } finally {
      setUploading(false);
    }
  };

  // Drag and drop
  const handleDrag = (e) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };
  const handleDrop = (e) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) handleFileUpload(e.dataTransfer.files[0]);
  };

  // ── Confirm & close — triggers dataset application into table view ─────────
  const handleConfirmSelect = () => {
    if (!selectedFilename) { setError('Please select or upload a CSV/Excel file first.'); return; }
    if (onSelectCsv) onSelectCsv(selectedFilename, preview);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal-box" style={{ maxWidth: 650 }}>
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10, background: 'var(--accent-light)',
              border: '1px solid rgba(99,102,241,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <UploadCloud size={18} color="var(--accent)" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)' }}>
                Upload Contact Data
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                CSV / Excel files stored in <code style={{ background: 'rgba(255,255,255,0.06)', padding: '1px 5px', borderRadius: 4 }}>data/input_csv/</code>
              </div>
            </div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {/* ── Upload Zone ─────────────────────────────────────────────────── */}
        <div
          onDragEnter={handleDrag} onDragLeave={handleDrag}
          onDragOver={handleDrag} onDrop={handleDrop}
          onClick={() => !uploading && fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${dragActive ? 'var(--accent)' : 'var(--border-light)'}`,
            borderRadius: 'var(--radius-lg)',
            padding: '1.75rem',
            textAlign: 'center',
            background: dragActive ? 'var(--accent-light)' : 'rgba(255,255,255,0.02)',
            transition: 'all 0.2s ease',
            cursor: uploading ? 'default' : 'pointer',
            marginBottom: '1.25rem',
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx"
            onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
            style={{ display: 'none' }}
          />

          {uploading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
              <div className="spinner spinner-lg" />
              <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Uploading and importing contacts...</span>
            </div>
          ) : uploadSuccess ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle2 size={32} color="var(--success)" />
              <div style={{ fontWeight: 700, color: 'var(--success)', fontSize: '0.95rem' }}>
                Uploaded: {uploadSuccess}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Contacts {importAsLeads ? 'imported into Lead Pool database ✓' : 'saved in input_csv'}
              </div>
            </div>
          ) : (
            <>
              <UploadCloud size={36} color="var(--accent)" style={{ marginBottom: '0.6rem', opacity: 0.8 }} />
              <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.3rem', fontSize: '0.95rem' }}>
                Drag & drop your CSV / Excel file here
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.85rem' }}>
                or click anywhere in this box to browse
              </div>
              <div
                className="btn btn-sm"
                style={{ display: 'inline-flex', pointerEvents: 'none', background: 'var(--gradient-accent)' }}
              >
                Choose File
              </div>
            </>
          )}
        </div>

        {/* Import toggle */}
        <label style={{
          display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer',
          padding: '0.6rem 0.85rem', borderRadius: 'var(--radius-md)',
          background: importAsLeads ? 'var(--success-light)' : 'var(--bg-input)',
          border: `1px solid ${importAsLeads ? 'rgba(16,185,129,0.3)' : 'var(--border)'}`,
          marginBottom: '1.25rem', transition: 'all 0.2s ease',
          fontSize: '0.875rem', fontWeight: 600,
          color: importAsLeads ? 'var(--success)' : 'var(--text-muted)',
        }}>
          <input
            type="checkbox"
            checked={importAsLeads}
            onChange={(e) => setImportAsLeads(e.target.checked)}
            style={{ width: 16, height: 16, accentColor: 'var(--success)', cursor: 'pointer' }}
          />
          <Users size={15} />
          Automatically import contacts into Lead Pool after upload
        </label>

        {/* ── Available Files ──────────────────────────────────────────────── */}
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{
            fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)',
            textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.6rem'
          }}>
            Available Dataset Files
          </div>

          {loadingFiles ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              <div className="spinner" /> Loading files...
            </div>
          ) : files.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No files yet — upload one above.</div>
          ) : (
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {files.map((f) => {
                const isSelected = selectedFilename === f.filename;
                return (
                  <div
                    key={f.filename}
                    style={{
                      display: 'inline-flex', alignItems: 'center',
                      borderRadius: 'var(--radius-full)',
                      border: isSelected ? '1px solid var(--accent)' : '1px solid var(--border)',
                      background: isSelected ? 'var(--accent-light)' : 'var(--bg-input)',
                      overflow: 'hidden', transition: 'all 0.15s ease'
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => handleSelectFile(f.filename)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.4rem',
                        padding: '0.4rem 0.65rem 0.4rem 0.85rem', background: 'none', border: 'none',
                        fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                        color: isSelected ? 'var(--accent)' : 'var(--text-muted)'
                      }}
                    >
                      <FileText size={13} />
                      {f.filename}
                      <span style={{
                        background: isSelected ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.07)',
                        borderRadius: 10, padding: '0 6px', fontSize: '0.7rem'
                      }}>
                        {f.total_rows} rows
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteFile(f.filename, e)}
                      title={`Delete file ${f.filename}`}
                      style={{
                        padding: '0.4rem 0.6rem 0.4rem 0.2rem', background: 'none', border: 'none',
                        color: 'rgba(239,68,68,0.7)', cursor: 'pointer', display: 'flex', alignItems: 'center',
                        transition: 'color 0.15s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                      onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(239,68,68,0.7)'}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Dataset Summary Insights (Clean Tags Only - No Sample Table) ──── */}
        {preview && (
          <div style={{
            background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)', padding: '1rem', marginBottom: '1.25rem',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.9rem' }}>
                <FileText size={16} color="var(--accent)" />
                {preview.filename || selectedFilename}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="badge badge-qualified" style={{ fontSize: '0.7rem' }}>
                  {preview.total_rows} total rows
                </span>
                <button
                  type="button"
                  onClick={(e) => handleDeleteFile(preview.filename || selectedFilename, e)}
                  style={{
                    background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
                    color: '#f87171', borderRadius: '6px', padding: '2px 8px', fontSize: '0.72rem',
                    cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px'
                  }}
                >
                  <Trash2 size={11} /> Delete File
                </button>
              </div>
            </div>

            {/* Detected Personas / Roles */}
            {preview.detected_roles?.length > 0 && (
              <div style={{ marginBottom: '0.65rem' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Briefcase size={11} /> Detected Roles / Personas
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                  {preview.detected_roles.map((r, i) => (
                    <span key={i} style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: 'var(--radius-full)', background: 'var(--accent-light)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.25)' }}>
                      {r}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Target Industries */}
            {preview.detected_industries?.length > 0 && (
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Building2 size={11} /> Target Industries
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                  {preview.detected_industries.map((ind, i) => (
                    <span key={i} style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: 'var(--radius-full)', background: 'var(--success-light)', color: '#34d399', border: '1px solid rgba(16,185,129,0.25)' }}>
                      {ind}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error message */}
        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 0.85rem', background: 'var(--danger-light)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.85rem', color: 'var(--danger)' }}>
            <AlertCircle size={15} /> {error}
          </div>
        )}

        {/* ── Footer Actions ───────────────────────────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button
            className="btn"
            onClick={handleConfirmSelect}
            disabled={!selectedFilename || uploading}
          >
            <ChevronRight size={16} />
            Use This Dataset
          </button>
        </div>
      </div>
    </div>
  );
}
