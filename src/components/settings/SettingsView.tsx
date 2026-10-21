import React from 'react';
import {
  Settings as SettingsIcon,
  User,
  Shield,
  Layers,
  Sparkles,
  Server,
  Key,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useDemo } from '../../context/DemoContext';
import { ScenarioPreset } from '../../types';

export const SettingsView: React.FC = () => {
  const { user, role, setRole, usersList } = useAuth();
  const { scenario, setScenario, isLoading } = useDemo();

  const scenarios: { id: ScenarioPreset; title: string; desc: string }[] = [
    {
      id: 'db_exhaustion',
      title: 'Scenario 1: Database Connection Pool Exhaustion',
      desc: 'Simulates PgBouncer saturation, sudden p95 latency spikes to 4,800ms, and preceding config change on postgres-primary.',
    },
    {
      id: 'memory_pressure',
      title: 'Scenario 2: Celery Worker Memory Pressure & OOM Evictions',
      desc: 'Simulates worker memory leak, heap accumulation reaching 96%, periodic container evictions, and queue backpressure.',
    },
    {
      id: 'deployment_spike',
      title: 'Scenario 3: Deployment-Related HTTP 5xx Regression',
      desc: 'Simulates canary deployment of payment-api v4.18.2 introducing unhandled type exceptions and 500 error wave.',
    },
    {
      id: 'baseline_healthy',
      title: 'Scenario 4: Baseline Nominal Operations (Healthy)',
      desc: 'Simulates nominal steady-state production telemetry with zero anomalous tripwires and healthy sub-200ms latencies.',
    },
  ];

  return (
    <div className="space-y-6 pb-12 max-w-4xl">
      <div className="border-b border-slate-800/80 pb-5">
        <h1 className="text-xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
          <SettingsIcon className="h-5 w-5 text-cyan-400" />
          Platform Settings & Environment Configuration
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Manage operational scenarios, role-based access control, and telemetry ingestion keys.
        </p>
      </div>

      {/* RBAC Profile Card */}
      <div className="rounded-2xl border border-slate-800 bg-[#0d1322] p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
          <User className="h-4 w-4 text-cyan-400" />
          Active User Profile & Role Permissions
        </h3>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div>
            <div className="font-bold text-slate-100 text-sm">{user.name}</div>
            <div className="font-mono text-xs text-slate-400">{user.email}</div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Switch Role:</span>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-mono font-bold text-cyan-300 focus:border-cyan-500 focus:outline-none"
            >
              <option value="Admin">Admin (Full Control & Approvals)</option>
              <option value="Engineer">Engineer (Investigate & Remediate)</option>
              <option value="Viewer">Viewer (Read-Only Dashboards)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3">
            <span className="font-bold text-slate-200 block">Admin Privileges</span>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Manage users, configure allowlists, trigger retrain runs, and approve all remediations.
            </span>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3">
            <span className="font-bold text-slate-200 block">Engineer Privileges</span>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Investigate anomalies, trigger correlation engine, and execute approved fixes.
            </span>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3">
            <span className="font-bold text-slate-200 block">Viewer Privileges</span>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Audit dashboards, view telemetry and reports. Modifying state is strictly forbidden.
            </span>
          </div>
        </div>
      </div>

      {/* Scenario Sandbox Switcher */}
      <div className="rounded-2xl border border-slate-800 bg-[#0d1322] p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-cyan-400" />
          Deterministic Operational Scenario Sandbox
        </h3>
        <p className="text-xs text-slate-400">
          Switch the in-memory telemetry database state to test each of the 3 required incident failure modes.
        </p>

        <div className="space-y-2.5">
          {scenarios.map((sc) => (
            <button
              key={sc.id}
              onClick={() => setScenario(sc.id)}
              disabled={isLoading}
              className={`w-full text-left rounded-xl border p-4 transition text-xs ${
                scenario === sc.id
                  ? 'border-cyan-500 bg-cyan-950/20 ring-1 ring-cyan-500/30'
                  : 'border-slate-800 bg-slate-900/60 hover:bg-slate-800/50'
              }`}
            >
              <div className="flex items-center justify-between font-bold">
                <span className={scenario === sc.id ? 'text-cyan-300' : 'text-slate-200'}>
                  {sc.title}
                </span>
                {scenario === sc.id && (
                  <span className="flex items-center gap-1 text-[11px] font-mono text-cyan-400">
                    <CheckCircle2 className="h-3.5 w-3.5" /> ACTIVE
                  </span>
                )}
              </div>
              <p className="text-slate-400 mt-1 text-[11px] leading-relaxed">{sc.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Ingestion API Keys */}
      <div className="rounded-2xl border border-slate-800 bg-[#0d1322] p-6 shadow-sm space-y-3">
        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
          <Key className="h-4 w-4 text-cyan-400" />
          Machine Telemetry Ingestion Tokens
        </h3>
        <p className="text-xs text-slate-400">
          Use HTTP headers <code>x-nightwatch-api-key</code> to authenticate agent log shippers.
        </p>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-3 font-mono text-xs text-cyan-300 flex items-center justify-between">
          <span>nw_live_99f0b32c81d77a02e647</span>
          <span className="text-[10px] uppercase font-bold text-slate-500">Active Token</span>
        </div>
      </div>
    </div>
  );
};
