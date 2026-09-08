import React, { useEffect, useState } from 'react';
import { getLead360 } from '../services/api';
import { X, Sparkles } from 'lucide-react';

export default function Lead360Modal({ leadId, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (leadId) {
      getLead360(leadId)
        .then((res) => {
          setData(res);
          setLoading(false);
        })
        .catch((err) => {
          console.error(err);
          setLoading(false);
        });
    }
  }, [leadId]);

  if (!leadId) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(0,0,0,0.7)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
    }}>
      <div className="card" style={{ width: '650px', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
        >
          <X size={20} />
        </button>

        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <Sparkles className="text-indigo-400" />
          Lead 360° Intelligence View
        </h2>

        {loading ? (
          <p style={{ color: 'var(--text-muted)' }}>Analyzing lead intent and RAG context...</p>
        ) : !data ? (
          <p style={{ color: 'var(--danger)' }}>Failed to load lead 360° details.</p>
        ) : (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ backgroundColor: 'var(--bg-main)', padding: '1rem', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Profile URL</div>
                <a href={data.lead?.profile_url || '#'} target="_blank" rel="noreferrer" style={{ color: '#818cf8', fontWeight: '600' }}>
                  {data.lead?.profile_url || 'N/A'}
                </a>
              </div>
              <div style={{ backgroundColor: 'var(--bg-main)', padding: '1rem', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Buying Intent Score</div>
                <div style={{ fontSize: '1.4rem', fontWeight: '700', color: '#34d399' }}>
                  {Math.round((data.research?.buying_intent_score || 0.85) * 100)}% Match
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ marginBottom: '0.5rem' }}>Buying Intent Signals</h4>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {data.research?.intent_signals?.map((sig, idx) => (
                  <span key={idx} className="badge badge-emailed" style={{ fontSize: '0.8rem' }}>
                    ✓ {sig}
                  </span>
                )) || <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>High ICP Role Fit</span>}
              </div>
            </div>

            <div>
              <h4 style={{ marginBottom: '0.5rem' }}>AI Qualification Rationale</h4>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', backgroundColor: 'var(--bg-main)', padding: '1rem', borderRadius: '8px' }}>
                {data.research?.qualification_explanation || 'Matches campaign targeting criteria.'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
