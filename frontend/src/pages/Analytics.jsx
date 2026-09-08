import React, { useState, useEffect } from 'react';
import { getPipelineAnalytics } from '../services/api';
import { TrendingUp, Mail, Users, CheckCircle, RefreshCw } from 'lucide-react';

const FUNNEL_STAGES = [
  { key: 'total_leads',      label: '1. Discovered Leads',         color: '#6366f1' },
  { key: 'qualified_leads',  label: '2. Qualified & In Pipeline',  color: '#818cf8' },
  { key: 'emails_sent',      label: '3. Emails Sent',              color: '#3b82f6' },
  { key: 'converted',        label: '4. Converted (Replied +ve)',  color: '#10b981' },
];

export default function Analytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const load = async () => {
    setLoading(true);
    try {
      const res = await getPipelineAnalytics();
      setData(res);
      setLastRefresh(new Date());
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const max = data ? Math.max(data.total_leads, 1) : 1;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700 }}>Campaign Analytics</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.2rem' }}>
            Live pipeline metrics · Last updated {lastRefresh.toLocaleTimeString()}
          </p>
        </div>
        <button className="btn" onClick={load} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem' }}>
          <RefreshCw size={14} className={loading ? 'spinning' : ''} /> Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { icon: <Users size={20} />, label: 'Total Leads', value: data?.total_leads ?? 0, color: '#6366f1' },
          { icon: <CheckCircle size={20} />, label: 'Qualified Leads', value: data?.qualified_leads ?? 0, color: '#818cf8' },
          { icon: <Mail size={20} />, label: 'Emails Sent', value: data?.emails_sent ?? 0, color: '#3b82f6' },
          { icon: <TrendingUp size={20} />, label: 'Conversion Rate', value: `${data?.conversion_rate ?? 0}%`, color: '#10b981' },
        ].map((kpi, i) => (
          <div key={i} className="card" style={{ padding: '1.2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ color: kpi.color, background: `${kpi.color}20`, padding: '0.6rem', borderRadius: '10px' }}>{kpi.icon}</div>
            <div>
              <div style={{ fontSize: '1.6rem', fontWeight: 700, color: kpi.color, lineHeight: 1 }}>{kpi.value}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>{kpi.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Funnel Chart */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h3 style={{ marginBottom: '1.5rem' }}>📊 Outreach Funnel Drop-off</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {FUNNEL_STAGES.map((s, i) => {
            const val = data ? (data[s.key] ?? 0) : 0;
            const pct = Math.max(4, Math.round((val / max) * 100));
            return (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.8rem' }}>
                  <span style={{ color: 'var(--text)' }}>{s.label}</span>
                  <span style={{ color: s.color, fontWeight: 600 }}>{val}</span>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '99px', height: '10px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${pct}%`,
                    height: '100%',
                    background: `linear-gradient(90deg, ${s.color}99, ${s.color})`,
                    borderRadius: '99px',
                    transition: 'width 0.6s ease',
                  }} />
                </div>
                {i < FUNNEL_STAGES.length - 1 && val > 0 && data?.[FUNNEL_STAGES[i+1].key] > 0 && (
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px', textAlign: 'right' }}>
                    Drop-off: {val - (data?.[FUNNEL_STAGES[i+1].key] ?? 0)} ({Math.round(((val - (data?.[FUNNEL_STAGES[i+1].key] ?? 0)) / Math.max(val,1)) * 100)}%)
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Per-Campaign Breakdown */}
      {data?.campaigns?.length > 0 && (
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>📋 Campaign Breakdown</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Campaign', 'Total Deals', 'Emails Sent', 'Converted', 'Rate'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '0.5rem 0.75rem', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.72rem', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.campaigns.map((c, i) => {
                const rate = c.emailed > 0 ? Math.round((c.converted / c.emailed) * 100) : 0;
                return (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '0.75rem', fontWeight: 500 }}>{c.campaign}</td>
                    <td style={{ padding: '0.75rem', color: '#818cf8' }}>{c.deals}</td>
                    <td style={{ padding: '0.75rem', color: '#60a5fa' }}>{c.emailed}</td>
                    <td style={{ padding: '0.75rem', color: '#34d399' }}>{c.converted}</td>
                    <td style={{ padding: '0.75rem' }}>
                      <span style={{ color: rate > 30 ? '#10b981' : rate > 10 ? '#f59e0b' : '#f87171', fontWeight: 600 }}>{rate}%</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!data && !loading && (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          No data yet. Run the pipeline first: Campaigns → Seed Demo Leads → Deals → Send Email → Simulate Reply.
        </div>
      )}
    </div>
  );
}
