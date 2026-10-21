import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Clock,
  ShieldCheck,
  Activity,
  Flame,
  CheckCircle,
  TrendingUp,
  BrainCircuit,
  Server,
  ArrowRight,
  ExternalLink,
  Zap,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import { api } from '../../lib/api-client';
import { DashboardStats, Incident, ServiceNode, TelemetryLog } from '../../types';
import { useDemo } from '../../context/DemoContext';

interface OverviewDashboardProps {
  onSelectIncident: (id: string) => void;
  onNavigateTab: (tab: any) => void;
}

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({
  onSelectIncident,
  onNavigateTab,
}) => {
  const { refreshTrigger, scenario } = useDemo();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [services, setServices] = useState<ServiceNode[]>([]);
  const [logs, setLogs] = useState<TelemetryLog[]>([]);
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d'>('24h');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [s, inc, svc, lg] = await Promise.all([
          api.getStats(),
          api.getIncidents(),
          api.getServices(),
          api.getLogs(),
        ]);
        setStats(s);
        setIncidents(inc.items);
        setServices(svc.items);
        setLogs(lg.items.slice(0, 6));
      } catch (err) {
        console.error('Failed to load overview data', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [refreshTrigger, scenario]);

  // Telemetry chart data
  const telemetryTrendData = [
    { time: '00:00', latency: 190, anomalyScore: 12, errorRate: 0.1 },
    { time: '04:00', latency: 205, anomalyScore: 14, errorRate: 0.1 },
    { time: '08:00', latency: 240, anomalyScore: 18, errorRate: 0.2 },
    { time: '12:00', latency: 260, anomalyScore: 25, errorRate: 0.2 },
    { time: '16:00', latency: scenario === 'db_exhaustion' ? 4850 : 280, anomalyScore: scenario === 'db_exhaustion' ? 94 : 22, errorRate: scenario === 'deployment_spike' ? 24.5 : 0.3 },
    { time: '18:00', latency: scenario === 'db_exhaustion' ? 4910 : 250, anomalyScore: scenario === 'db_exhaustion' ? 92 : 19, errorRate: scenario === 'deployment_spike' ? 22.1 : 0.2 },
    { time: '20:00', latency: scenario === 'db_exhaustion' ? 4850 : 220, anomalyScore: scenario === 'db_exhaustion' ? 89 : 15, errorRate: 0.1 },
    { time: 'Now', latency: scenario === 'db_exhaustion' ? 4850 : 210, anomalyScore: scenario === 'db_exhaustion' ? 94 : 14, errorRate: 0.1 },
  ];

  const severityData = [
    { name: 'Critical', count: incidents.filter((i) => i.severity === 'CRITICAL').length, color: '#ef4444' },
    { name: 'High', count: incidents.filter((i) => i.severity === 'HIGH').length, color: '#f97316' },
    { name: 'Medium', count: incidents.filter((i) => i.severity === 'MEDIUM').length, color: '#eab308' },
    { name: 'Low', count: incidents.filter((i) => i.severity === 'LOW').length, color: '#06b6d4' },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header & Time Range Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-100 flex items-center gap-2.5">
            Reliability & Incident Command Center
            <span className="rounded-full bg-cyan-950/80 px-2.5 py-0.5 text-xs font-mono font-medium text-cyan-300 border border-cyan-800/60">
              Live Stream
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time multi-variate anomaly detection, service topology health, and automated root cause correlation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-slate-800 bg-slate-900/80 p-0.5 text-xs">
            {(['1h', '24h', '7d'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={`rounded px-3 py-1 font-medium transition ${
                  timeRange === r
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {r.toUpperCase()}
              </button>
            ))}
          </div>

          <button
            onClick={() => onNavigateTab('incidents')}
            className="flex items-center gap-1.5 rounded-lg bg-cyan-500 px-3.5 py-1.5 text-xs font-semibold text-slate-950 shadow-md shadow-cyan-950/50 hover:bg-cyan-400 transition"
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            Active Incidents ({stats?.openIncidents || 0})
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-4">
        {/* Open Incidents */}
        <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-[#0d1322] p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Open Incidents</span>
            <AlertTriangle className="h-4 w-4 text-rose-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-100 font-mono">
              {stats?.openIncidents ?? '--'}
            </span>
            <span className="text-[11px] font-mono text-rose-400">
              {stats?.criticalIncidents ?? 0} Critical
            </span>
          </div>
          <div className="mt-2 text-[10px] text-slate-500">
            Window: {stats?.timeWindow || '24h'}
          </div>
          <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-rose-500 to-amber-500" />
        </div>

        {/* MTTA (Mean Time to Acknowledge) */}
        <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-[#0d1322] p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>MTTA (Autonomous)</span>
            <Clock className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-100 font-mono">
              {stats?.mttaMinutes ?? 2.4}
              <span className="text-xs text-slate-400 ml-1 font-normal">min</span>
            </span>
            <span className="text-[11px] text-emerald-400 font-medium">↓ 68% vs Manual</span>
          </div>
          <div className="mt-2 text-[10px] text-slate-500">Autonomous log/metric tripwire</div>
          <div className="absolute inset-x-0 bottom-0 h-1 bg-cyan-500" />
        </div>

        {/* MTTR (Mean Time to Resolve) */}
        <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-[#0d1322] p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>MTTR (Mean Recovery)</span>
            <Activity className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-100 font-mono">
              {stats?.mttrMinutes ?? 14.8}
              <span className="text-xs text-slate-400 ml-1 font-normal">min</span>
            </span>
            <span className="text-[11px] text-emerald-400 font-medium">Target &lt; 20m</span>
          </div>
          <div className="mt-2 text-[10px] text-slate-500">Includes verification pass</div>
          <div className="absolute inset-x-0 bottom-0 h-1 bg-emerald-500" />
        </div>

        {/* Remediation Success Rate */}
        <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-[#0d1322] p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Remediation Verif. Rate</span>
            <ShieldCheck className="h-4 w-4 text-purple-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-100 font-mono">
              {stats?.remediationSuccessRate ?? 97.4}%
            </span>
            <span className="text-[11px] text-purple-300 font-medium">Allowlisted</span>
          </div>
          <div className="mt-2 text-[10px] text-slate-500">Human-authorized actions</div>
          <div className="absolute inset-x-0 bottom-0 h-1 bg-purple-500" />
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Anomaly Score & Latency Timeline */}
        <div className="lg:col-span-2 rounded-xl border border-slate-800 bg-[#0d1322] p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-cyan-400" />
                p95 Latency & Anomaly Score Correlation
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Isolation Forest Multi-Variate Anomaly Score vs Observed Service p95 Latency (ms)
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-cyan-300">
                <span className="h-2.5 w-2.5 rounded-full bg-cyan-400" />
                Latency (ms)
              </span>
              <span className="flex items-center gap-1.5 text-rose-400">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                Anomaly Score [0-100]
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={telemetryTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="latencyGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="anomalyGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" stroke="#475569" fontSize={11} tickLine={false} />
                <YAxis stroke="#475569" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
                />
                <Area
                  type="monotone"
                  dataKey="latency"
                  name="p95 Latency (ms)"
                  stroke="#06b6d4"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#latencyGradient)"
                />
                <Area
                  type="monotone"
                  dataKey="anomalyScore"
                  name="Anomaly Score"
                  stroke="#ef4444"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#anomalyGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right 1 Col: Severity Breakdown Donut */}
        <div className="rounded-xl border border-slate-800 bg-[#0d1322] p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Flame className="h-4 w-4 text-amber-400" />
              Incident Severity Breakdown
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Current operational distribution by severity grade
            </p>

            <div className="h-44 w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={severityData}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={4}
                  >
                    {severityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 border-t border-slate-800/80 pt-3">
            {severityData.map((s) => (
              <div key={s.name} className="flex items-center gap-2 text-xs">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="text-slate-400">{s.name}:</span>
                <span className="font-mono font-bold text-slate-200">{s.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Services Health & Active Incidents Split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Active Incidents Table */}
        <div className="rounded-xl border border-slate-800 bg-[#0d1322] p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-400" />
                Active Production Incidents
              </h3>
              <p className="text-[11px] text-slate-400">
                Click any incident to open the complete Investigation Workspace
              </p>
            </div>
            <button
              onClick={() => onNavigateTab('incidents')}
              className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-medium"
            >
              View All <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          <div className="space-y-2.5">
            {incidents.slice(0, 4).map((inc) => (
              <button
                key={inc.id}
                onClick={() => onSelectIncident(inc.id)}
                className="w-full text-left rounded-lg border border-slate-800 bg-slate-900/60 p-3 hover:border-cyan-500/50 hover:bg-slate-800/60 transition group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-cyan-400 group-hover:text-cyan-300">
                      {inc.id}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase font-mono ${
                        inc.severity === 'CRITICAL'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                          : inc.severity === 'HIGH'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      }`}
                    >
                      {inc.severity}
                    </span>
                  </div>
                  <span className="font-mono text-xs text-rose-400 font-semibold">
                    Anomaly: {inc.anomalyScore}/100
                  </span>
                </div>
                <div className="text-xs font-medium text-slate-200 mt-1.5 truncate">
                  {inc.title}
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
                  <span>Service: <span className="font-mono text-slate-300">{inc.service}</span></span>
                  <span className="font-mono text-cyan-400 flex items-center gap-1">
                    <BrainCircuit className="h-3 w-3" />
                    {inc.rootCauseStatus}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right: Service Health & Dependency Grid */}
        <div className="rounded-xl border border-slate-800 bg-[#0d1322] p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <Server className="h-4 w-4 text-cyan-400" />
                Service Topology Status
              </h3>
              <p className="text-[11px] text-slate-400">
                Core infrastructure nodes & observed health indicators
              </p>
            </div>
            <button
              onClick={() => onNavigateTab('services')}
              className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-medium"
            >
              Interactive Map <ExternalLink className="h-3 w-3" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {services.map((svc) => (
              <div
                key={svc.id}
                className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-slate-200">{svc.name}</span>
                  <span
                    className={`h-2 w-2 rounded-full ${
                      svc.health === 'HEALTHY'
                        ? 'bg-emerald-400'
                        : svc.health === 'DEGRADED'
                        ? 'bg-amber-400 animate-pulse'
                        : 'bg-rose-500 animate-ping'
                    }`}
                  />
                </div>
                <div className="mt-2 grid grid-cols-2 gap-1 text-[11px] font-mono text-slate-400">
                  <div>p95: <span className="text-slate-200">{svc.p95Latency}ms</span></div>
                  <div>Err: <span className={svc.errorRate > 5 ? 'text-rose-400' : 'text-slate-200'}>{svc.errorRate}%</span></div>
                  <div>CPU: <span className="text-slate-200">{svc.cpuUsage}%</span></div>
                  <div>Mem: <span className={svc.memUsage > 85 ? 'text-rose-400' : 'text-slate-200'}>{svc.memUsage}%</span></div>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Telemetry Stream Ticker */}
          <div className="mt-4 border-t border-slate-800/80 pt-3">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Zap className="h-3 w-3 text-cyan-400" />
              Latest Ingested Telemetry
            </div>
            <div className="space-y-1.5 font-mono text-[11px]">
              {logs.slice(0, 3).map((l) => (
                <div key={l.id} className="flex items-center gap-2 truncate text-slate-400">
                  <span
                    className={`rounded px-1 text-[9px] font-bold ${
                      l.level === 'FATAL' || l.level === 'ERROR'
                        ? 'bg-rose-950 text-rose-300 border border-rose-800'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {l.level}
                  </span>
                  <span className="text-slate-500">{l.service}:</span>
                  <span className="truncate text-slate-300">{l.message}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
