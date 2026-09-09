import React from 'react';
import { X, CheckCircle2, Database, AlertCircle, FileText, Check, Users, Layers } from 'lucide-react';

export default function ImportSummaryModal({ isOpen, onClose, stats }) {
  if (!isOpen || !stats) return null;

  // Compute values safely
  const importedCount = typeof stats.imported_count === 'number' ? stats.imported_count : 0;
  const duplicateCount = typeof stats.duplicate_count === 'number' ? stats.duplicate_count : 0;
  const invalidRows = typeof stats.invalid_rows === 'number' ? stats.invalid_rows : 0;
  
  let totalRows = stats.total_rows;
  if (typeof totalRows !== 'number' || isNaN(totalRows)) {
    totalRows = importedCount + duplicateCount + invalidRows;
  }
  
  const masterDbTotal = stats.total_master_db_count !== undefined && stats.total_master_db_count !== null
    ? stats.total_master_db_count.toLocaleString()
    : 'Updated';

  const filename = stats.filename || '';

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{
        maxWidth: '540px', display: 'flex', flexDirection: 'column',
        overflow: 'hidden', maxHeight: '90vh', padding: 0
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'var(--bg-inner)',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 42, height: 42, borderRadius: 10, background: 'var(--success-light)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669',
              border: '1px solid rgba(16, 185, 129, 0.3)'
            }}>
              <CheckCircle2 size={24} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)' }}>
                Import Completed
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Dataset ingestion results summary
              </p>
            </div>
          </div>
          <button onClick={onClose} className="modal-close" style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4, borderRadius: '6px' }}>
            <X size={20} />
          </button>
        </div>

        {/* Body Content */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1, backgroundColor: 'var(--bg-card)' }}>
          {/* File Info */}
          {filename && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '8px 14px', background: 'var(--bg-inner)',
              border: '1px solid var(--border)', borderRadius: '8px',
              marginBottom: '16px', fontSize: '0.82rem', color: 'var(--text-muted)'
            }}>
              <FileText size={16} style={{ color: 'var(--accent)', flexShrink: 0 }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                Dataset File: <strong style={{ color: 'var(--text-main)' }}>{filename}</strong>
              </span>
            </div>
          )}

          {/* Metric Breakdown Table */}
          <table style={{
            width: '100%', minWidth: '100%', borderCollapse: 'collapse', fontSize: '0.88rem',
            background: 'var(--bg-inner)', borderRadius: '10px', overflow: 'hidden',
            border: '1px solid var(--border)'
          }}>
            <thead>
              <tr style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.5px' }}>
                  Result Metric
                </th>
                <th style={{ textAlign: 'right', padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.5px', width: '120px' }}>
                  Count
                </th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '12px 16px', color: 'var(--text-main)', fontWeight: 500 }}>
                  Total Records Processed
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 800, color: 'var(--text-main)', fontSize: '0.95rem' }}>
                  {totalRows.toLocaleString()}
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--success-light)' }}>
                <td style={{ padding: '12px 16px', color: '#059669', fontWeight: 700 }}>
                  New Profiles Added
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 800, color: '#059669', fontSize: '0.95rem' }}>
                  +{importedCount.toLocaleString()}
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--warning-light)' }}>
                <td style={{ padding: '12px 16px', color: '#d97706', fontWeight: 700 }}>
                  Duplicate Profiles Skipped
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 800, color: '#d97706', fontSize: '0.95rem' }}>
                  {duplicateCount.toLocaleString()}
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>
                  Invalid Records Skipped
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                  {invalidRows.toLocaleString()}
                </td>
              </tr>
              <tr style={{ backgroundColor: 'var(--accent-light)' }}>
                <td style={{ padding: '14px 16px', color: 'var(--accent)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Database size={15} /> Total Profiles in Master DB
                </td>
                <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 800, color: 'var(--accent)', fontSize: '1.05rem' }}>
                  {masterDbTotal}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px', borderTop: '1px solid var(--border)',
          display: 'flex', justifyContent: 'flex-end', background: 'var(--bg-inner)',
          flexShrink: 0
        }}>
          <button
            onClick={onClose}
            className="btn btn-primary"
            style={{
              padding: '0.65rem 1.75rem', fontWeight: 700, borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

