import React from 'react';
import { X, User, Building2, MapPin, Briefcase, Mail, Globe, Calendar, ShieldCheck } from 'lucide-react';

export default function ExistingProfileViewModal({ isOpen, onClose, lead }) {
  if (!isOpen || !lead) return null;

  const fn = lead.first_name || '';
  const ln = lead.last_name || '';
  const fullName = `${fn} ${ln}`.trim() || 'Existing Contact';

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 10001, padding: '20px'
    }}>
      <div style={{
        background: '#1e293b', border: '1px solid #334155', borderRadius: '16px',
        width: '100%', maxWidth: '620px', maxHeight: '85vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)', overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 24px', borderBottom: '1px solid #334155',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'rgba(15, 23, 42, 0.6)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10, background: 'rgba(99, 102, 241, 0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#818cf8',
              border: '1px solid rgba(99, 102, 241, 0.3)'
            }}>
              <User size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc' }}>
                Existing Master Database Profile
              </h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>
                ID #{lead.id} • Matched Email Profile
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          <div style={{
            backgroundColor: 'rgba(15, 23, 42, 0.5)', border: '1px solid #334155',
            borderRadius: '12px', padding: '16px', marginBottom: '18px'
          }}>
            <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f8fafc', marginBottom: '4px' }}>
              {fullName}
            </div>
            <div style={{ fontSize: '0.88rem', color: '#818cf8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
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
          padding: '14px 24px', borderTop: '1px solid #334155',
          display: 'flex', justifyContent: 'flex-end', background: 'rgba(15, 23, 42, 0.6)'
        }}>
          <button
            onClick={onClose}
            className="btn btn-secondary"
            style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}
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
      background: 'rgba(15, 23, 42, 0.4)', border: '1px solid rgba(255, 255, 255, 0.06)',
      borderRadius: '8px', padding: '10px 12px'
    }}>
      <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '3px', display: 'flex', alignItems: 'center', gap: '5px' }}>
        <Icon size={12} color="#818cf8" /> {label}
      </div>
      <div style={{
        fontWeight: 600,
        color: highlight ? '#34d399' : '#f8fafc',
        wordBreak: 'break-all'
      }}>
        {badge ? (
          <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', background: 'rgba(99, 102, 241, 0.2)', color: '#818cf8', fontWeight: 700 }}>
            {value || 'N/A'}
          </span>
        ) : isLink && value ? (
          <a href={value.startsWith('http') ? value : `https://${value}`} target="_blank" rel="noreferrer" style={{ color: '#818cf8', textDecoration: 'underline' }}>
            {value}
          </a>
        ) : (
          value || '—'
        )}
      </div>
    </div>
  );
}
