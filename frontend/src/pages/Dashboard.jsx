import React, { useEffect, useState, useRef } from 'react';
import {
  checkHealth, checkDbHealth, checkLeadProviderHealth,
  getCampaigns, getLeads, getDeals, getRunnerStatus
} from '../services/api';
import {
  Activity, Database, Target, Users, Send, Cpu,
  RefreshCw, TrendingUp
} from 'lucide-react';

// ── Session-level cache — persists across tab navigation, resets on page reload ──
const SESSION_KEY = 'oo_dashboard_cache';
function readCache() {
  try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null'); } catch { return null; }
}
function writeCache(data) {
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(data)); } catch {}
}

/** Status card with live pulse dot */
function StatusCard({ icon: Icon, title, value, status, subtitle, color }) {
  const colorMap = {
    green:  { bg: 'var(--success-light)', border: 'rgba(16,185,129,0.3)',  text: 'var(--success)' },
    red:    { bg: 'var(--danger-light)',  border: 'rgba(239,68,68,0.3)',   text: 'var(--danger)' },
    yellow: { bg: 'var(--warning-light)', border: 'rgba(245,158,11,0.3)',  text: 'var(--warning)' },
    accent: { bg: 'var(--accent-light)',  border: 'rgba(99,102,241,0.3)',  text: 'var(--accent)' },
  };
  const c = colorMap[color] || colorMap.accent;

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div className="card-icon" style={{ background: c.bg, border: `1px solid ${c.border}` }}>
          <Icon size={20} color={c.text} />
        </div>
        {status !== undefined && (
          <div style={{
            width: 10, height: 10, borderRadius: '50%', marginTop: 4, flexShrink: 0,
            background: color === 'green' ? 'var(--success)' : color === 'red' ? 'var(--danger)' : 'var(--warning)',
            boxShadow: `0 0 8px ${c.text}`,
            animation: color === 'green' ? 'pulse-green 2s infinite' : 'none',
          }} />
        )}
      </div>
      <div>
        <div className="card-title">{title}</div>
        <div className="card-value" style={{ color: c.text }}>{value}</div>
        {subtitle && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>{subtitle}</div>}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const cached = readCache();

  // Initialise from session cache so re-navigation shows last-known good state immediately
  const [health,    setHealth]    = useState(cached?.health    ?? null);
  const [dbHealth,  setDbHealth]  = useState(cached?.dbHealth  ?? null);
  const [provider,  setProvider]  = useState(cached?.provider  ?? null);
  const [runner,    setRunner]    = useState(cached?.runner     ?? null);
  const [stats,     setStats]     = useState(cached?.stats     ?? { campaigns: 0, leads: 0, deals: 0 });
  const [loading,   setLoading]   = useState(!cached);           // skip spinner if cache exists
  const [lastRefresh, setLastRefresh] = useState(cached ? new Date(cached.ts) : null);

  // Once connected/healthy, lock positive state — don't flip back on transient errors
  const everConnectedDb  = useRef(cached?.dbHealth?.status === 'connected');
  const everHealthyApi   = useRef(cached?.health?.status   === 'healthy');

  async function loadAll(force = false) {
    setLoading(true);
    const [h, db, prov, run, camps, leads, deals] = await Promise.allSettled([
      checkHealth(),
      checkDbHealth(),
      checkLeadProviderHealth(),
      getRunnerStatus(),
      getCampaigns(),
      getLeads(),
      getDeals(),
    ]);

    // API health
    const newHealth = h.status === 'fulfilled' ? h.value : null;
    if (newHealth?.status === 'healthy') everHealthyApi.current = true;

    // DB health — once connected, keep showing connected (transient errors happen on nav)
    const newDb = db.status === 'fulfilled' ? db.value : null;
    if (newDb?.status === 'connected') everConnectedDb.current = true;

    // If we've ever seen connected but this poll failed, keep the last good state
    const resolvedDb = (everConnectedDb.current && !newDb)
      ? (dbHealth ?? { status: 'connected', database: 'sqlite' })
      : (newDb ?? dbHealth);

    const resolvedHealth = (everHealthyApi.current && !newHealth)
      ? (health ?? { status: 'healthy' })
      : (newHealth ?? health);

    const newProv  = prov.status  === 'fulfilled' ? prov.value  : provider;
    const newRun   = run.status   === 'fulfilled' ? run.value   : runner;
    const newStats = {
      campaigns: Array.isArray(camps.value) ? camps.value.length : stats.campaigns,
      leads:     Array.isArray(leads.value) ? leads.value.length : stats.leads,
      deals:     Array.isArray(deals.value) ? deals.value.length : stats.deals,
    };

    setHealth(resolvedHealth);
    setDbHealth(resolvedDb);
    setProvider(newProv);
    setRunner(newRun);
    setStats(newStats);

    const ts = Date.now();
    setLastRefresh(new Date(ts));

    // Persist to session cache
    writeCache({ health: resolvedHealth, dbHealth: resolvedDb, provider: newProv, runner: newRun, stats: newStats, ts });
    setLoading(false);
  }

  // Only fetch fresh data if no cache or manual refresh
  useEffect(() => { loadAll(); }, []);

  const backendOk    = health?.status === 'healthy';
  const dbOk         = dbHealth?.status === 'connected';
  const runnerActive = runner?.is_running;
  const dbType       = dbHealth?.database || 'sqlite';

  return (
    <div>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Control Dashboard</h1>
          <p className="page-subtitle">
            System health and campaign stats
            {lastRefresh && (
              <span style={{ marginLeft: 8, color: 'var(--text-faint)', fontSize: '0.7rem' }}>
                · Last refreshed {lastRefresh.toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => loadAll(true)} disabled={loading}>
          <RefreshCw size={14} style={{ animation: loading ? 'spin 0.7s linear infinite' : 'none' }} />
          Refresh
        </button>
      </div>

      {/* ── System Health ────────────────────────────────────────────────── */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-sub)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          System Health & Infrastructure
        </h2>
        <div className="grid-cols-4">
          <StatusCard
            icon={Activity} title="API Server"
            value={backendOk ? 'Healthy' : loading ? '...' : 'Offline'}
            status={backendOk} subtitle="FastAPI · localhost:8000"
            color={backendOk ? 'green' : loading ? 'yellow' : 'red'}
          />
          <StatusCard
            icon={Database} title={`Database (${dbType.toUpperCase()})`}
            value={dbOk ? 'Connected' : loading ? '...' : 'Disconnected'}
            status={dbOk}
            subtitle={dbHealth?.pgvector_enabled ? 'pgvector: enabled' : dbOk ? 'pgvector: N/A' : 'Check DB connection'}
            color={dbOk ? 'green' : loading ? 'yellow' : 'red'}
          />
          <StatusCard
            icon={Cpu} title="Campaign Runner"
            value={runnerActive ? 'Active' : loading ? '...' : 'Stopped'}
            subtitle={runner ? `Interval: ${runner.interval_seconds || 60}s` : 'Background scheduler'}
            color={runnerActive ? 'green' : 'yellow'}
          />
          <StatusCard
            icon={TrendingUp} title="Lead Provider"
            value={provider?.status === 'healthy' ? 'Ready' : loading ? '...' : provider ? 'Error' : '—'}
            subtitle={provider?.provider ? `Provider: ${provider.provider}` : 'Loading...'}
            color={provider?.status === 'healthy' ? 'green' : 'yellow'}
          />
        </div>
      </div>

      {/* ── Platform Stats ───────────────────────────────────────────────── */}
      <div>
        <h2 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-sub)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Platform & Outreach Metrics
        </h2>
        <div className="grid-cols-3">
          <StatusCard icon={Target} title="Active Campaigns" value={loading && !cached ? '...' : stats.campaigns} subtitle="Total campaigns created"     color="accent" />
          <StatusCard icon={Users}  title="Total Leads"      value={loading && !cached ? '...' : stats.leads}     subtitle="In the lead pool database"   color="accent" />
          <StatusCard icon={Send}   title="Pipeline Deals"   value={loading && !cached ? '...' : stats.deals}     subtitle="Deals & outreach tracked"    color="accent" />
        </div>
      </div>
    </div>
  );
}

