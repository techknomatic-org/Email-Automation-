import React, { useState, useEffect, useRef } from 'react';
import { uploadCsvFile } from '../services/api';
import {
  X, UploadCloud, FileText, CheckCircle2, AlertCircle,
  Database, RefreshCw, Plus, Trash2, ShieldAlert
} from 'lucide-react';
import ConfirmModal from './ConfirmModal';

export default function ImportDatasetModal({
  isOpen,
  onClose,
  initialFile = null,
  initialMode = 'append',
  onImportComplete,
  onAddManualProfile
}) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewMeta, setPreviewMeta] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setError('');
      setUploading(false);
      setShowResetConfirm(false);
      setPendingAction(null);
      if (initialFile) {
        handleFileSelect(initialFile, null);
      } else {
        setSelectedFile(null);
        setPreviewMeta(null);
      }
    }
  }, [isOpen, initialFile]);

  if (!isOpen) return null;

  const processAndUploadFile = async (fileObj, mode) => {
    setUploading(true);
    setError('');
    try {
      const res = await uploadCsvFile(fileObj, true, mode);
      const stats = res.import_stats || {
        filename: fileObj.name,
        total_rows: previewMeta?.total_rows || 0,
        imported_count: 0,
        duplicate_count: 0,
        invalid_rows: 0,
        total_master_db_count: 0
      };
      if (onImportComplete) onImportComplete(res, stats);
      onClose();
    } catch (err) {
      setError((mode === 'reset' ? 'Reset & Upload failed: ' : 'Import failed: ') + (err.response?.data?.detail || err.message));
    } finally {
      setUploading(false);
      setPendingAction(null);
    }
  };

  const handleFileSelect = (fileObj, targetMode = pendingAction) => {
    if (!fileObj) return;
    const nameLower = fileObj.name.toLowerCase();
    if (!nameLower.endsWith('.csv') && !nameLower.endsWith('.xlsx') && !nameLower.endsWith('.xls')) {
      setError('Please select a valid CSV (.csv) or Excel (.xlsx, .xls) file.');
      return;
    }
    setError('');
    setSelectedFile(fileObj);

    // Quick client-side line count estimate
    if (nameLower.endsWith('.csv')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target.result || '';
        const lines = text.split('\n').filter(line => line.trim().length > 0);
        const rowCount = Math.max(0, lines.length - 1);
        setPreviewMeta({ filename: fileObj.name, total_rows: rowCount });
      };
      reader.readAsText(fileObj);
    } else {
      setPreviewMeta({ filename: fileObj.name, total_rows: 'Excel File' });
    }

    if (targetMode === 'append') {
      processAndUploadFile(fileObj, 'append');
    } else if (targetMode === 'reset') {
      setShowResetConfirm(true);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };

  const handleDrop = (e) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) handleFileSelect(e.dataTransfer.files[0]);
  };

  // Option A – Append New Data
  const handleExecuteAppend = async () => {
    if (!selectedFile) {
      setPendingAction('append');
      fileInputRef.current?.click();
      return;
    }
    await processAndUploadFile(selectedFile, 'append');
  };

  // Option B – Reset Master DB & Upload New Dataset (After user confirms)
  const handleExecuteResetAndUpload = async () => {
    if (!selectedFile) {
      setPendingAction('reset');
      fileInputRef.current?.click();
      return;
    }
    setShowResetConfirm(false);
    await processAndUploadFile(selectedFile, 'reset');
  };

  const handleOptionBClick = () => {
    if (!selectedFile) {
      setPendingAction('reset');
      fileInputRef.current?.click();
      return;
    }
    setShowResetConfirm(true);
  };

  return (
    <>
      <div
        className="modal-overlay"
        onClick={(e) => e.target === e.currentTarget && !uploading && onClose()}
      >
        <div className="modal-box" style={{ maxWidth: 660, maxHeight: '90vh', padding: 0, overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column' }}>
          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
            style={{ display: 'none' }}
          />

          {/* ANIMATED UPLOADING OVERLAY */}
          {uploading && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.97)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justify: 'center',
              zIndex: 50,
              padding: '2rem',
              textAlign: 'center'
            }}>
              <div className="spinner spinner-lg" style={{ marginBottom: '1.25rem', width: 44, height: 44, borderWidth: 3 }} />
              <h3 style={{ color: '#f8fafc', fontSize: '1.15rem', fontWeight: 700, margin: '0 0 0.5rem 0' }}>
                {pendingAction === 'reset' ? 'Resetting & Ingesting Dataset...' : 'Uploading & Ingesting Dataset...'}
              </h3>
              <p style={{ color: '#818cf8', fontSize: '0.88rem', fontWeight: 600, margin: '0 0 0.4rem 0' }}>
                Processing profile records into Master Database
              </p>
              <p style={{ color: '#94a3b8', fontSize: '0.78rem', margin: 0, maxWidth: '380px', lineHeight: 1.5 }}>
                Validating email normalization (<code style={{ color: '#a5b4fc' }}>LOWER(TRIM(email))</code>) and applying deduplication.
              </p>
            </div>
          )}

          {/* Header */}
          <div style={{
            padding: '20px 24px', borderBottom: '1px solid #334155',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'rgba(15, 23, 42, 0.8)', flexShrink: 0
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10, background: 'rgba(99, 102, 241, 0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#818cf8',
                border: '1px solid rgba(99, 102, 241, 0.3)'
              }}>
                <UploadCloud size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#f8fafc' }}>
                  Import Dataset Options
                </h3>
                <p style={{ margin: 0, fontSize: '0.82rem', color: '#94a3b8' }}>
                  Choose dataset import mode into unified Master Database
                </p>
              </div>
            </div>
            <button onClick={onClose} disabled={uploading} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 4 }}>
              <X size={20} />
            </button>
          </div>

          <div style={{ padding: '24px', overflowY: 'auto', flex: 1, maxHeight: 'calc(90vh - 130px)' }}>
            {/* File Drop/Chooser Zone */}
            {!selectedFile ? (
              <div
                onDragEnter={handleDrag} onDragLeave={handleDrag}
                onDragOver={handleDrag} onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: `2px dashed ${dragActive ? '#818cf8' : 'rgba(99, 102, 241, 0.35)'}`,
                  borderRadius: '12px',
                  padding: '1.75rem 1.5rem',
                  textAlign: 'center',
                  background: dragActive ? 'rgba(99, 102, 241, 0.12)' : 'rgba(15, 23, 42, 0.5)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  marginBottom: '1.5rem'
                }}
              >
                <UploadCloud size={38} style={{ color: '#818cf8', margin: '0 auto 0.5rem auto' }} />
                <div style={{ fontWeight: 700, color: '#f8fafc', fontSize: '0.98rem', marginBottom: '0.2rem' }}>
                  Click to select CSV or Excel file
                </div>
                <div style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                  or drag & drop .csv / .xlsx file here
                </div>
              </div>
            ) : (
              /* Selected File Details Banner */
              <div style={{
                background: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                borderRadius: '12px',
                padding: '1rem 1.25rem',
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                justify: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <div style={{ width: 38, height: 38, borderRadius: 8, background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FileText size={20} style={{ color: '#818cf8' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#f8fafc' }}>
                      Dataset Name: <span style={{ color: '#34d399' }}>{selectedFile.name}</span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '2px' }}>
                      Records Found: <strong style={{ color: '#e0e7ff' }}>{previewMeta?.total_rows ?? 'Calculating...'}</strong>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedFile(null)}
                  disabled={uploading}
                  style={{
                    background: 'none', border: '1px solid #334155', color: '#94a3b8',
                    borderRadius: '6px', padding: '4px 10px', fontSize: '0.78rem', cursor: 'pointer'
                  }}
                >
                  Change File
                </button>
              </div>
            )}

            {/* ERROR DISPLAY */}
            {error && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem',
                background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)',
                borderRadius: '8px', marginBottom: '1.25rem', fontSize: '0.85rem', color: '#f87171'
              }}>
                <AlertCircle size={16} /> {error}
              </div>
            )}

            {/* TWO MAIN IMPORT OPTIONS */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.25rem' }}>

              {/* OPTION A: APPEND NEW DATA */}
              <div style={{
                border: '1px solid rgba(99, 102, 241, 0.4)',
                borderRadius: '12px',
                padding: '1.25rem',
                backgroundColor: 'rgba(99, 102, 241, 0.05)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span>Option A – Append New Data</span>
                      <span style={{ fontSize: '0.7rem', padding: '1px 8px', borderRadius: 999, background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', fontWeight: 700 }}>
                        Recommended (Safer)
                      </span>
                    </div>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.5 }}>
                      Keep all existing Master DB records. Validate incoming rows against normalized email (<code style={{ color: '#818cf8' }}>LOWER(TRIM(email))</code>). Add unique records and skip duplicates.
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="btn"
                    onClick={handleExecuteAppend}
                    disabled={uploading}
                    style={{
                      backgroundColor: '#6366f1',
                      color: '#ffffff',
                      fontWeight: 700,
                      padding: '0.6rem 1.35rem',
                      fontSize: '0.88rem',
                      borderRadius: '8px',
                      border: 'none',
                      boxShadow: '0 4px 12px rgba(99, 102, 241, 0.35)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      cursor: uploading ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {uploading ? 'Importing...' : <><Plus size={16} /> Append to Master DB</>}
                  </button>
                </div>
              </div>

              {/* OPTION B: RESET MASTER DB & UPLOAD NEW DATASET */}
              <div style={{
                border: '1px solid rgba(245, 158, 11, 0.4)',
                borderRadius: '12px',
                padding: '1.25rem',
                backgroundColor: 'rgba(245, 158, 11, 0.05)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span>Option B – Reset Master DB &amp; Upload New Dataset</span>
                    </div>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.5 }}>
                      Replaces the current Master Database. All existing profiles will be deleted and replaced with this newly uploaded dataset.
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="btn"
                    onClick={handleOptionBClick}
                    disabled={uploading}
                    style={{
                      backgroundColor: 'rgba(245, 158, 11, 0.15)',
                      border: '1px solid rgba(245, 158, 11, 0.5)',
                      color: '#fbbf24',
                      fontWeight: 700,
                      padding: '0.6rem 1.35rem',
                      fontSize: '0.88rem',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      cursor: uploading ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {uploading ? 'Processing Reset...' : <><RefreshCw size={16} /> Reset Master DB &amp; Upload</>}
                  </button>
                </div>
              </div>

              {/* OPTION C: ADD RECORD MANUALLY */}
              <div style={{
                border: '1px solid rgba(16, 185, 129, 0.35)',
                borderRadius: '12px',
                padding: '1.25rem',
                backgroundColor: 'rgba(16, 185, 129, 0.04)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#34d399', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span>Option C – Add Records Manually</span>
                    </div>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.5 }}>
                      Add individual prospect profiles manually to the Master Database with complete custom contact, company, and location details.
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => {
                      onClose();
                      if (onAddManualProfile) onAddManualProfile();
                    }}
                    disabled={uploading}
                    style={{
                      backgroundColor: 'rgba(16, 185, 129, 0.15)',
                      border: '1px solid rgba(16, 185, 129, 0.4)',
                      color: '#34d399',
                      fontWeight: 700,
                      padding: '0.6rem 1.35rem',
                      fontSize: '0.88rem',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      cursor: 'pointer'
                    }}
                  >
                    <Plus size={16} /> Add Profile Manually
                  </button>
                </div>
              </div>

            </div>
          </div>

          {/* Footer */}
          <div style={{
            padding: '14px 24px', borderTop: '1px solid #334155',
            display: 'flex', justifyContent: 'flex-end', background: 'rgba(15, 23, 42, 0.6)',
            flexShrink: 0
          }}>
            <button
              onClick={onClose}
              disabled={uploading}
              style={{
                background: 'none', border: '1px solid #334155', color: '#94a3b8',
                borderRadius: '8px', padding: '0.5rem 1.2rem', fontSize: '0.85rem', cursor: 'pointer'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      {/* Mandatory Confirmation Dialog for Option B */}
      <ConfirmModal
        isOpen={showResetConfirm}
        title="Reset Master Database?"
        message="You are about to permanently delete all existing profiles from the Master Database and replace them with the newly uploaded dataset. This action cannot be undone."
        confirmText="Confirm Reset & Upload"
        cancelText="Cancel"
        isDanger={true}
        loading={uploading}
        onConfirm={handleExecuteResetAndUpload}
        onClose={() => setShowResetConfirm(false)}
      />
    </>
  );
}

