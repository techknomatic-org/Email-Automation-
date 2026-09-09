import React, { useState, useEffect } from 'react';
import { getDatasetValidationStats } from '../services/api';
import { Database, CheckCircle2, AlertTriangle, ShieldCheck, FileSpreadsheet, ChevronDown, ChevronUp, Layers, Check, Info } from 'lucide-react';

export default function DatasetValidationPanel({ compact = false }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    getDatasetValidationStats()
      .then((data) => setStats(data))
      .catch((err) => console.error('Failed to load dataset validation stats:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{
        padding: '0.65rem 1rem',
        backgroundColor: 'var(--bg-card)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border)',
        fontSize: '0.8rem',
        color: 'var(--text-muted)',
        marginBottom: '1rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem'
      }}>
        <div className="spinner" style={{ width: 14, height: 14 }} />
        <span>Inspecting dataset schema...</span>
      </div>
    );
  }

  if (!stats) return null;

  const completionRate = stats.total_records > 0
    ? Math.round((stats.usable_matching_records / stats.total_records) * 100)
    : 100;

  return (
    <div style={{
      backgroundColor: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      marginBottom: '1.25rem',
      boxShadow: 'var(--shadow-sm)',
      overflow: 'hidden',
      transition: 'var(--transition-base)'
    }}>
      {/* ── Main Compact Header Bar ────────────────────────────────────────── */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0.75rem 1.15rem',
          cursor: 'pointer',
          background: isExpanded ? 'var(--bg-inner)' : 'var(--bg-card)',
          transition: 'background 0.2s ease',
          userSelect: 'none',
          gap: '1rem',
          flexWrap: 'wrap'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 260 }}>
          <div style={{
            width: 34,
            height: 34,
            borderRadius: 'var(--radius-md)',
            background: stats.is_valid ? 'var(--success-light)' : 'var(--warning-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: stats.is_valid ? 'var(--success)' : 'var(--warning)',
            flexShrink: 0
          }}>
            <FileSpreadsheet size={18} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)' }}>
                Master Contact Dataset
              </span>
              <span style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 'var(--radius-full)',
                background: stats.is_valid ? 'var(--success-light)' : 'var(--warning-light)',
                color: stats.is_valid ? 'var(--success)' : 'var(--warning)',
                border: stats.is_valid ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(245,166,35,0.3)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3
              }}>
                {stats.is_valid ? <ShieldCheck size={11} /> : <AlertTriangle size={11} />}
                {stats.is_valid ? 'Schema Validated' : 'Partial Missing Fields'}
              </span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 1 }}>
              {stats.usable_matching_records} usable contacts out of {stats.total_records} total ({completionRate}% ready)
            </div>
          </div>
        </div>

        {/* Quick inline metric pill indicators */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            background: 'var(--bg-inner)',
            padding: '0.35rem 0.75rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-light)',
            fontSize: '0.75rem'
          }}>
            <span style={{ color: 'var(--text-muted)' }}>Total: <strong style={{ color: 'var(--text-main)' }}>{stats.total_records}</strong></span>
            <span style={{ color: 'var(--border)' }}>|</span>
            <span style={{ color: 'var(--text-muted)' }}>Job Title: <strong style={{ color: 'var(--text-main)' }}>{stats.records_with_job_title}</strong></span>
            <span style={{ color: 'var(--border)' }}>|</span>
            <span style={{ color: 'var(--text-muted)' }}>Dept: <strong style={{ color: 'var(--text-main)' }}>{stats.records_with_department}</strong></span>
            <span style={{ color: 'var(--border)' }}>|</span>
            <span style={{ color: 'var(--accent)', fontWeight: 700 }}>Usable: {stats.usable_matching_records}</span>
          </div>

          <button
            className="btn btn-ghost btn-sm"
            style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem', gap: 4, color: 'var(--text-muted)' }}
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
          >
            {isExpanded ? 'Hide Details' : 'Inspect Schema'}
            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* ── Expanded Schema Breakdown ────────────────────────────────────── */}
      {isExpanded && (
        <div style={{
          padding: '1rem 1.25rem 1.25rem',
          borderTop: '1px solid var(--border)',
          background: 'var(--bg-card)'
        }}>
          {/* Warning Banner if fields are missing */}
          {stats.missing_fields_warning && (
            <div style={{
              backgroundColor: 'var(--warning-light)',
              border: '1px solid rgba(245, 166, 35, 0.35)',
              borderRadius: 'var(--radius-md)',
              padding: '0.65rem 0.9rem',
              marginBottom: '1rem',
              fontSize: '0.78rem',
              color: 'var(--text-main)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontWeight: 500
            }}>
              <AlertTriangle size={15} style={{ flexShrink: 0, color: '#d97706' }} />
              <div>{stats.missing_fields_warning}</div>
            </div>
          )}

          {/* Record Counts Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: '0.65rem',
            textAlign: 'center'
          }}>
            {/* Total Records */}
            <div style={{
              backgroundColor: 'var(--bg-inner)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem 0.5rem'
            }}>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>
                Total Records
              </div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.2rem' }}>
                {stats.total_records}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-faint)', marginTop: '0.1rem' }}>
                Source Database
              </div>
            </div>

            {/* Job Title */}
            <div style={{
              backgroundColor: 'var(--bg-inner)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem 0.5rem'
            }}>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>
                Job Title
              </div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#10b981', marginTop: '0.2rem' }}>
                {stats.records_with_job_title}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-faint)', marginTop: '0.1rem' }}>
                {Math.round((stats.records_with_job_title / (stats.total_records || 1)) * 100)}% populated
              </div>
            </div>

            {/* Department */}
            <div style={{
              backgroundColor: 'var(--bg-inner)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem 0.5rem'
            }}>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>
                Department
              </div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#d97706', marginTop: '0.2rem' }}>
                {stats.records_with_department}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-faint)', marginTop: '0.1rem' }}>
                {Math.round((stats.records_with_department / (stats.total_records || 1)) * 100)}% populated
              </div>
            </div>

            {/* Seniority */}
            <div style={{
              backgroundColor: 'var(--bg-inner)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem 0.5rem'
            }}>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>
                Seniority
              </div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#ec4899', marginTop: '0.2rem' }}>
                {stats.records_with_seniority}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-faint)', marginTop: '0.1rem' }}>
                {Math.round((stats.records_with_seniority / (stats.total_records || 1)) * 100)}% populated
              </div>
            </div>

            {/* Industry */}
            <div style={{
              backgroundColor: 'var(--bg-inner)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem 0.5rem'
            }}>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>
                Industry
              </div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#8b5cf6', marginTop: '0.2rem' }}>
                {stats.records_with_industry}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-faint)', marginTop: '0.1rem' }}>
                {Math.round((stats.records_with_industry / (stats.total_records || 1)) * 100)}% populated
              </div>
            </div>

            {/* Country */}
            <div style={{
              backgroundColor: 'var(--bg-inner)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem 0.5rem'
            }}>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>
                Country
              </div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#2563eb', marginTop: '0.2rem' }}>
                {stats.records_with_country}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-faint)', marginTop: '0.1rem' }}>
                {Math.round((stats.records_with_country / (stats.total_records || 1)) * 100)}% populated
              </div>
            </div>

            {/* Usable Matching */}
            <div style={{
              backgroundColor: 'var(--accent-light)',
              border: '1px solid var(--border-glow)',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem 0.5rem'
            }}>
              <div style={{ fontSize: '0.68rem', color: 'var(--accent)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>
                Usable Matching
              </div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--accent)', marginTop: '0.2rem' }}>
                {stats.usable_matching_records}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--accent)', fontWeight: 600, marginTop: '0.1rem' }}>
                {completionRate}% Qualified
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

