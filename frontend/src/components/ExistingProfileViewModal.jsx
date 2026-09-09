import React from 'react';
import { X, User, Building2, MapPin, Briefcase, Mail, Globe, Calendar, ShieldCheck } from 'lucide-react';

export default function ExistingProfileViewModal({ isOpen, onClose, lead }) {
  if (!isOpen || !lead) return null;

  const fn = lead.first_name || '';
  const ln = lead.last_name || '';
  const fullName = `${fn} ${ln}`.trim() || 'Existing Contact';

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{
        maxWidth: '620px',
        padding: 0,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--bg-inner)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: 'var(--accent-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent)',
              border: '1px solid rgba(232, 98, 44, 0.25)'
            }}>
              <User size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)' }}>
                Existing Master Database Profile
              </h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                ID #{lead.id} • Matched Email Profile
              </p>
            </div>
          </div>
          <button onClick={onClose} className="modal-close" aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1, backgroundColor: 'var(--bg-card)' }}>
          <div style={{
            backgroundColor: 'var(--bg-inner)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '18px'
          }}>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '4px' }}>
              {fullName}
            </div>
            <div style={{ fontSize: '0.88rem', color: 'var(--accent)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Briefcase size={14} />
              {lead.job_title || 'No Job Title'} {lead.company_name ? `at ${lead.company_name}` : ''}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', fontSize: '0.85rem' }}>
            <DetailItem icon={Mail} label="Email Address" value={lead.email} highlight />
            <DetailItem icon={Briefcase} label="Department" value={lead.department} />
            <DetailItem icon={User} label="Seniority" value={lead.seniority} />
            <DetailItem icon={Building2} label="Company Name" value={lead.company_name} />
            <DetailItem icon={Globe} label="Company Website" value={lead.company_website || lead.company_domain} isLink />
            <DetailItem icon={Building2} label="Industry" value={lead.industry} />
            <DetailItem icon={MapPin} label="Country" value={lead.country || lead.country_code} />
            <DetailItem icon={ShieldCheck} label="Source" value={lead.source || lead.source_type || 'MANUAL_ENTRY'} badge />
            <DetailItem icon={Calendar} label="Created At" value={lead.creation_date ? new Date(lead.creation_date).toLocaleString() : 'N/A'} />
            <DetailItem icon={Calendar} label="Last Updated" value={lead.update_date ? new Date(lead.update_date).toLocaleString() : 'N/A'} />
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 24px',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'flex-end',
          background: 'var(--bg-inner)'
        }}>
          <button
            onClick={onClose}
            className="btn btn-ghost"
            style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem', fontWeight: 700 }}
          >
            Close View
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailItem({ icon: Icon, label, value, highlight, isLink, badge }) {
  return (
    <div style={{
      background: 'var(--bg-inner)',
      border: '1px solid var(--border)',
      borderRadius: '8px',
      padding: '10px 12px'
    }}>
      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '3px', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 700 }}>
        <Icon size={12} style={{ color: 'var(--accent)' }} /> {label}
      </div>
      <div style={{
        fontWeight: 600,
        color: highlight ? 'var(--success)' : 'var(--text-main)',
        wordBreak: 'break-all'
      }}>
        {badge ? (
          <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', background: 'var(--accent-light)', color: 'var(--accent)', fontWeight: 700, border: '1px solid rgba(232, 98, 44, 0.25)' }}>
            {value || 'N/A'}
          </span>
        ) : isLink && value ? (
          <a href={value.startsWith('http') ? value : `https://${value}`} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>
            {value}
          </a>
        ) : (
          value || '—'
        )}
      </div>
    </div>
  );
}
