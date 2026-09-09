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
      <div style={{ padding: '0.85rem 1.25rem', backgroundColor: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        Validating dataset schema...
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div style={{
      backgroundColor: 'var(--bg-card)',
      border: stats.is_valid ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(245, 158, 11, 0.4)',
      borderRadius: '12px',
      padding: compact ? '1rem 1.25rem' : '1.25rem 1.5rem',
      marginBottom: '1.5rem',
      boxShadow: 'var(--shadow-sm)'
    }}>
      {/* Header Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <FileSpreadsheet size={20} style={{ color: stats.is_valid ? '#10b981' : '#f59e0b' }} />
          <div>
            <h4 style={{ margin: 0, color: 'var(--text-main)', fontSize: '0.98rem', fontWeight: 800 }}>
              Dataset Validation Panel (Master_Contact_List)
            </h4>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Source of Truth schema inspection across 9 required fields
            </span>
          </div>
        </div>
        <span style={{
          fontSize: '0.75rem',
          padding: '4px 12px',
          borderRadius: '999px',
          background: stats.is_valid ? 'var(--success-light)' : 'var(--warning-light)',
          color: stats.is_valid ? '#059669' : '#d97706',
          fontWeight: 700,
          border: stats.is_valid ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid rgba(245, 166, 35, 0.35)',
          display: 'flex',
          alignItems: 'center',
          gap: '5px'
        }}>
          {stats.is_valid ? <ShieldCheck size={14} /> : <AlertTriangle size={14} />}
          {stats.is_valid ? 'Dataset Fully Validated ✓' : 'Schema Validated'}
        </span>
      </div>

      {/* Warning Banner if fields are missing */}
      {stats.missing_fields_warning && (
        <div style={{
          backgroundColor: 'var(--warning-light)',
          border: '1px solid rgba(245, 166, 35, 0.35)',
          borderRadius: '8px',
          padding: '0.75rem 1rem',
          marginBottom: '1rem',
          fontSize: '0.8rem',
          color: 'var(--text-main)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontWeight: 600
        }}>
          <AlertTriangle size={17} style={{ flexShrink: 0, color: '#d97706' }} />
          <div>{stats.missing_fields_warning}</div>
        </div>
      )}

      {/* Record Counts Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '0.75rem', textAlign: 'center' }}>
        {/* Total Records */}
        <div style={{ backgroundColor: 'var(--bg-inner)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.75rem 0.4rem' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Total Records</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.2rem' }}>
            {stats.total_records}
          </div>
        </div>

        {/* Job Title */}
        <div style={{ backgroundColor: 'var(--bg-inner)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.75rem 0.4rem' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Job Title</div>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#10b981', marginTop: '0.2rem' }}>
            {stats.records_with_job_title}
          </div>
        </div>

        {/* Department */}
        <div style={{ backgroundColor: 'var(--bg-inner)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.75rem 0.4rem' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Department</div>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#d97706', marginTop: '0.2rem' }}>
            {stats.records_with_department}
          </div>
        </div>

        {/* Seniority */}
        <div style={{ backgroundColor: 'var(--bg-inner)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.75rem 0.4rem' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Seniority</div>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#ec4899', marginTop: '0.2rem' }}>
            {stats.records_with_seniority}
          </div>
        </div>

        {/* Industry */}
        <div style={{ backgroundColor: 'var(--bg-inner)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.75rem 0.4rem' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Industry</div>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#8b5cf6', marginTop: '0.2rem' }}>
            {stats.records_with_industry}
          </div>
        </div>

        {/* Country */}
        <div style={{ backgroundColor: 'var(--bg-inner)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.75rem 0.4rem' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Country</div>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#2563eb', marginTop: '0.2rem' }}>
            {stats.records_with_country}
          </div>
        </div>

        {/* Usable Matching */}
        <div style={{ backgroundColor: 'var(--accent-light)', border: '1px solid rgba(232, 98, 44, 0.3)', borderRadius: '8px', padding: '0.75rem 0.4rem' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--accent)', textTransform: 'uppercase', fontWeight: 700 }}>Usable Matching</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent)', marginTop: '0.2rem' }}>
            {stats.usable_matching_records}
          </div>
        </div>
      </div>
    </div>
  );
}
