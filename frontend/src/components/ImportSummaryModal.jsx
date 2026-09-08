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
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 10002, padding: '20px'
    }}>
      <div style={{
        background: '#1e293b', border: '1px solid #334155', borderRadius: '16px',
        width: '100%', maxWidth: '540px', display: 'flex', flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)', overflow: 'hidden',
        maxHeight: '90vh'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid #334155',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'rgba(15, 23, 42, 0.7)',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 42, height: 42, borderRadius: 10, background: 'rgba(16, 185, 129, 0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#34d399',
              border: '1px solid rgba(16, 185, 129, 0.3)'
            }}>
              <CheckCircle2 size={24} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#f8fafc' }}>
                Import Completed
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.82rem', color: '#94a3b8' }}>
                Dataset ingestion results summary
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 4, borderRadius: '6px' }}>
            <X size={20} />
          </button>
        </div>

        {/* Body Content */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {/* File Info */}
          {filename && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '8px 14px', background: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid #334155', borderRadius: '8px',
              marginBottom: '16px', fontSize: '0.82rem', color: '#94a3b8'
            }}>
              <FileText size={16} style={{ color: '#818cf8', flexShrink: 0 }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                Dataset File: <strong style={{ color: '#34d399' }}>{filename}</strong>
              </span>
            </div>
          )}

          {/* Metric Breakdown Table */}
          <table style={{
            width: '100%', minWidth: '100%', borderCollapse: 'collapse', fontSize: '0.88rem',
            background: 'rgba(15, 23, 42, 0.5)', borderRadius: '10px', overflow: 'hidden',
            border: '1px solid #334155'
          }}>
            <thead>
              <tr style={{ background: 'rgba(30, 41, 59, 0.8)', borderBottom: '1px solid #334155' }}>
                <th style={{ textAlign: 'left', padding: '12px 16px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.5px' }}>
                  Result Metric
                </th>
                <th style={{ textAlign: 'right', padding: '12px 16px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.5px', width: '120px' }}>
                  Count
                </th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <td style={{ padding: '12px 16px', color: '#e0e7ff', fontWeight: 500 }}>
                  Total Records Processed
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: '#f8fafc', fontSize: '0.95rem' }}>
                  {totalRows.toLocaleString()}
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', backgroundColor: 'rgba(16, 185, 129, 0.08)' }}>
                <td style={{ padding: '12px 16px', color: '#34d399', fontWeight: 600 }}>
                  New Profiles Added
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: '#34d399', fontSize: '0.95rem' }}>
                  +{importedCount.toLocaleString()}
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', backgroundColor: 'rgba(245, 158, 11, 0.08)' }}>
                <td style={{ padding: '12px 16px', color: '#fbbf24', fontWeight: 500 }}>
                  Duplicate Profiles Skipped
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: '#fbbf24', fontSize: '0.95rem' }}>
                  {duplicateCount.toLocaleString()}
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <td style={{ padding: '12px 16px', color: '#94a3b8' }}>
                  Invalid Records Skipped
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: '#94a3b8', fontSize: '0.95rem' }}>
                  {invalidRows.toLocaleString()}
                </td>
              </tr>
              <tr style={{ backgroundColor: 'rgba(99, 102, 241, 0.12)' }}>
                <td style={{ padding: '14px 16px', color: '#818cf8', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Database size={15} /> Total Profiles in Master DB
                </td>
                <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 800, color: '#818cf8', fontSize: '1.05rem' }}>
                  {masterDbTotal}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px', borderTop: '1px solid #334155',
          display: 'flex', justifyContent: 'flex-end', background: 'rgba(15, 23, 42, 0.6)',
          flexShrink: 0
        }}>
          <button
            onClick={onClose}
            className="btn btn-primary"
            style={{
              padding: '0.65rem 1.75rem', fontWeight: 700, borderRadius: '8px',
              background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', color: '#ffffff',
              border: 'none', boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)', cursor: 'pointer'
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

