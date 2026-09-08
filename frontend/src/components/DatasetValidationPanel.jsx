import React, { useState, useEffect } from 'react';
import { getDatasetValidationStats } from '../services/api';
import { Database, CheckCircle2, AlertTriangle, ShieldCheck, FileSpreadsheet } from 'lucide-react';

export default function DatasetValidationPanel({ compact = false }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDatasetValidationStats()
      .then((data) => setStats(data))
      .catch((err) => console.error('Failed to load dataset validation stats:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '0.85rem 1.25rem', backgroundColor: 'rgba(15, 23, 42, 0.6)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        Validating dataset schema...
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div style={{
      backgroundColor: 'rgba(15, 23, 42, 0.8)',
      border: stats.is_valid ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid rgba(245, 158, 11, 0.35)',
      borderRadius: '12px',
      padding: compact ? '1rem 1.25rem' : '1.25rem 1.5rem',
      marginBottom: '1.5rem',
      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
      backdropFilter: 'blur(10px)'
    }}>
      {/* Header Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '0.6rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <FileSpreadsheet size={20} style={{ color: stats.is_valid ? '#34d399' : '#fbbf24' }} />
          <div>
            <h4 style={{ margin: 0, color: '#f8fafc', fontSize: '0.95rem', fontWeight: 700 }}>
              Dataset Validation Panel (Master_Contact_List)
            </h4>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
              Source of Truth schema inspection across 9 required fields
            </span>
          </div>
        </div>
        <span style={{
          fontSize: '0.72rem',
          padding: '3px 10px',
          borderRadius: '999px',
          background: stats.is_valid ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
          color: stats.is_valid ? '#34d399' : '#fbbf24',
          fontWeight: 700,
          border: stats.is_valid ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          {stats.is_valid ? <ShieldCheck size={13} /> : <AlertTriangle size={13} />}
          {stats.is_valid ? 'Dataset Fully Validated ✓' : 'Schema Validated'}
        </span>
      </div>

      {/* Warning Banner if fields are missing */}
      {stats.missing_fields_warning && (
        <div style={{
          backgroundColor: 'rgba(245, 158, 11, 0.12)',
          border: '1px solid rgba(245, 158, 11, 0.35)',
          borderRadius: '8px',
          padding: '0.75rem 1rem',
          marginBottom: '1rem',
          fontSize: '0.78rem',
          color: '#fde047',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <AlertTriangle size={16} style={{ flexShrink: 0 }} />
          <div>{stats.missing_fields_warning}</div>
        </div>
      )}

      {/* Record Counts Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '0.75rem', textAlign: 'center' }}>
        {/* Total Records */}
        <div style={{ backgroundColor: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.25)', borderRadius: '8px', padding: '0.75rem 0.4rem' }}>
          <div style={{ fontSize: '0.7rem', color: '#a5b4fc', textTransform: 'uppercase', fontWeight: 600 }}>Total Records</div>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#818cf8', marginTop: '0.2rem' }}>
            {stats.total_records}
          </div>
        </div>

        {/* Job Title */}
        <div style={{ backgroundColor: 'rgba(52, 211, 153, 0.08)', border: '1px solid rgba(52, 211, 153, 0.2)', borderRadius: '8px', padding: '0.75rem 0.4rem' }}>
          <div style={{ fontSize: '0.7rem', color: '#6ee7b7', textTransform: 'uppercase', fontWeight: 600 }}>Job Title</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#34d399', marginTop: '0.2rem' }}>
            {stats.records_with_job_title}
          </div>
        </div>

        {/* Department */}
        <div style={{ backgroundColor: 'rgba(251, 191, 36, 0.08)', border: '1px solid rgba(251, 191, 36, 0.2)', borderRadius: '8px', padding: '0.75rem 0.4rem' }}>
          <div style={{ fontSize: '0.7rem', color: '#fde047', textTransform: 'uppercase', fontWeight: 600 }}>Department</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fbbf24', marginTop: '0.2rem' }}>
            {stats.records_with_department}
          </div>
        </div>

        {/* Seniority */}
        <div style={{ backgroundColor: 'rgba(236, 72, 153, 0.08)', border: '1px solid rgba(236, 72, 153, 0.2)', borderRadius: '8px', padding: '0.75rem 0.4rem' }}>
          <div style={{ fontSize: '0.7rem', color: '#f472b6', textTransform: 'uppercase', fontWeight: 600 }}>Seniority</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ec4899', marginTop: '0.2rem' }}>
            {stats.records_with_seniority}
          </div>
        </div>

        {/* Industry */}
        <div style={{ backgroundColor: 'rgba(168, 85, 247, 0.08)', border: '1px solid rgba(168, 85, 247, 0.2)', borderRadius: '8px', padding: '0.75rem 0.4rem' }}>
          <div style={{ fontSize: '0.7rem', color: '#c084fc', textTransform: 'uppercase', fontWeight: 600 }}>Industry</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#c084fc', marginTop: '0.2rem' }}>
            {stats.records_with_industry}
          </div>
        </div>

        {/* Country */}
        <div style={{ backgroundColor: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.2)', borderRadius: '8px', padding: '0.75rem 0.4rem' }}>
          <div style={{ fontSize: '0.7rem', color: '#7dd3fc', textTransform: 'uppercase', fontWeight: 600 }}>Country</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#38bdf8', marginTop: '0.2rem' }}>
            {stats.records_with_country}
          </div>
        </div>

        {/* Usable Matching */}
        <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px', padding: '0.75rem 0.4rem' }}>
          <div style={{ fontSize: '0.7rem', color: '#34d399', textTransform: 'uppercase', fontWeight: 700 }}>Usable Matching</div>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#34d399', marginTop: '0.2rem' }}>
            {stats.usable_matching_records}
          </div>
        </div>
      </div>
    </div>
  );
}
