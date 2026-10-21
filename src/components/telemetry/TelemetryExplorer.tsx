import React, { useState, useEffect } from 'react';
import {
  Terminal,
  Activity,
  Layers,
  Send,
  Search,
  Filter,
  CheckCircle2,
  RefreshCw,
  Plus,
  Flame,
} from 'lucide-react';
import { api } from '../../lib/api-client';
import { TelemetryLog, MetricSample, DeploymentEvent } from '../../types';
import { useDemo } from '../../context/DemoContext';

export const TelemetryExplorer: React.FC = () => {
  const { refreshTrigger, triggerRefresh } = useDemo();
  const [logs, setLogs] = useState<TelemetryLog[]>([]);
  const [deployments, setDeployments] = useState<DeploymentEvent[]>([]);
  const [activeTab, setActiveTab] = useState<'logs' | 'metrics' | 'deployments' | 'ingest'>('logs');

  // Log filters
  const [serviceFilter, setServiceFilter] = useState('ALL');
  const [levelFilter, setLevelFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  // Ingestion form state
  const [ingestService, setIngestService] = useState('payment-api');
  const [ingestLevel, setIngestLevel] = useState<'INFO' | 'WARN' | 'ERROR' | 'FATAL'>('ERROR');
  const [ingestMessage, setIngestMessage] = useState('Database connection timeout: pool exhausted after 5000ms');
  const [ingestTraceId, setIngestTraceId] = useState(`tr-${Date.now().toString().slice(-6)}`);
  const [ingestSuccess, setIngestSuccess] = useState(false);

  useEffect(() => {
    async function loadTelemetry() {
      try {
        const [lgs, deps] = await Promise.all([
          api.getLogs({ service: serviceFilter, level: levelFilter, search }),
          fetch('/api/v1/telemetry/deployments').then((r) => r.json()),
        ]);
        setLogs(lgs.items);
        setDeployments(deps.items || []);
      } catch (err) {
        console.error('Failed to load telemetry', err);
      }
    }
    loadTelemetry();
  }, [refreshTrigger, serviceFilter, levelFilter, search]);

  const handleIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ingestMessage.trim()) return;
    try {
      await api.ingestLog({
        service: ingestService,
        level: ingestLevel,
        message: ingestMessage,
        traceId: ingestTraceId,
        metadata: { region: 'ap-south-1', manual_test_injection: true },
      });
      setIngestSuccess(true);
      setTimeout(() => setIngestSuccess(false), 3000);
      triggerRefresh();
    } catch (err) {
      console.error('Failed to ingest log', err);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
            <Terminal className="h-5 w-5 text-cyan-400" />
            Telemetry Explorer & Ingestion Pipeline
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Query structured logs, inspect distributed traces, and test real telemetry ingestion API endpoints.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-slate-800 bg-slate-900/80 p-0.5 text-xs">
            {(['logs', 'deployments', 'ingest'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={`rounded px-3 py-1 font-medium capitalize transition ${
                  activeTab === t
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab: Logs */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-[#0d1322] p-3 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter logs or trace IDs..."
                  className="w-full rounded-md border border-slate-800 bg-slate-900/90 py-1.5 pl-8 pr-3 text-xs text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <select
                value={serviceFilter}
                onChange={(e) => setServiceFilter(e.target.value)}
                className="rounded-md border border-slate-800 bg-slate-900/90 px-3 py-1.5 text-xs text-slate-300 focus:border-cyan-500 focus:outline-none"
              >
                <option value="ALL">All Services</option>
                <option value="payment-api">payment-api</option>
                <option value="checkout-svc">checkout-svc</option>
                <option value="notification-worker">notification-worker</option>
                <option value="auth-gateway">auth-gateway</option>
                <option value="postgres-primary">postgres-primary</option>
                <option value="redis-cache">redis-cache</option>
              </select>

              <select
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
                className="rounded-md border border-slate-800 bg-slate-900/90 px-3 py-1.5 text-xs text-slate-300 focus:border-cyan-500 focus:outline-none"
              >
                <option value="ALL">All Levels</option>
                <option value="FATAL">FATAL</option>
                <option value="ERROR">ERROR</option>
                <option value="WARN">WARN</option>
                <option value="INFO">INFO</option>
              </select>
            </div>

            <div className="text-slate-400 font-mono text-[11px]">
              Showing <span className="text-cyan-400 font-semibold">{logs.length}</span> structured events
            </div>
          </div>

          {/* Stream */}
          <div className="space-y-2 font-mono text-xs">
            {logs.map((log) => (
              <div
                key={log.id}
                className="rounded-xl border border-slate-800 bg-[#0d1322] p-3.5 transition hover:bg-slate-800/40"
              >
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded px-1.5 py-0.2 text-[9px] font-bold ${
                        log.level === 'FATAL' || log.level === 'ERROR'
                          ? 'bg-rose-950 text-rose-300 border border-rose-800'
                          : log.level === 'WARN'
                          ? 'bg-amber-950 text-amber-300 border border-amber-800'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {log.level}
                    </span>
                    <span className="font-semibold text-slate-200">{log.service}</span>
                    <span className="text-slate-500">[{log.environment}]</span>
                  </div>
                  <span className="text-slate-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
                </div>
                <div className="mt-1.5 text-slate-200">{log.message}</div>
                <div className="mt-2 text-[10px] text-slate-500 flex items-center gap-4">
                  <span>Trace ID: <strong className="text-slate-400">{log.traceId}</strong></span>
                  {log.metadata && (
                    <span>Meta: {JSON.stringify(log.metadata)}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Deployments */}
      {activeTab === 'deployments' && (
        <div className="space-y-3 font-mono text-xs">
          {deployments.map((d) => (
            <div key={d.id} className="rounded-xl border border-slate-800 bg-[#0d1322] p-4">
              <div className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-purple-950/80 text-purple-300 border border-purple-800/60 px-2 py-0.5 font-bold">
                    {d.version}
                  </span>
                  <span className="font-bold text-slate-200">{d.service}</span>
                </div>
                <span className="text-slate-400">{new Date(d.timestamp).toLocaleString()}</span>
              </div>
              <p className="mt-2 text-slate-300">{d.description}</p>
              <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
                <span>Author: {d.author}</span>
                <span>Rollback Available: {d.rollbackAvailable ? 'YES' : 'NO'}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab: Ingest Test Bench */}
      {activeTab === 'ingest' && (
        <div className="max-w-xl rounded-2xl border border-slate-800 bg-[#0d1322] p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <Send className="h-4 w-4 text-cyan-400" />
            Ingest Telemetry Log (Simulated Ingestion Endpoint)
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Sends a real POST request to <code>/api/v1/telemetry/logs</code> to test normalization and tripwire alerts.
          </p>

          <form onSubmit={handleIngest} className="mt-5 space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Target Service</label>
              <select
                value={ingestService}
                onChange={(e) => setIngestService(e.target.value)}
                className="w-full rounded-lg border border-slate-800 bg-slate-900 p-2.5 text-slate-200 focus:border-cyan-500 focus:outline-none"
              >
                <option value="payment-api">payment-api</option>
                <option value="checkout-svc">checkout-svc</option>
                <option value="notification-worker">notification-worker</option>
                <option value="postgres-primary">postgres-primary</option>
                <option value="auth-gateway">auth-gateway</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Log Level</label>
              <select
                value={ingestLevel}
                onChange={(e) => setIngestLevel(e.target.value as any)}
                className="w-full rounded-lg border border-slate-800 bg-slate-900 p-2.5 text-slate-200 focus:border-cyan-500 focus:outline-none"
              >
                <option value="FATAL">FATAL</option>
                <option value="ERROR">ERROR</option>
                <option value="WARN">WARN</option>
                <option value="INFO">INFO</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Message Payload</label>
              <textarea
                rows={3}
                value={ingestMessage}
                onChange={(e) => setIngestMessage(e.target.value)}
                className="w-full rounded-lg border border-slate-800 bg-slate-900 p-2.5 text-slate-200 focus:border-cyan-500 focus:outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Trace ID</label>
              <input
                type="text"
                value={ingestTraceId}
                onChange={(e) => setIngestTraceId(e.target.value)}
                className="w-full rounded-lg border border-slate-800 bg-slate-900 p-2.5 text-slate-200 focus:border-cyan-500 focus:outline-none font-mono"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              {ingestSuccess ? (
                <span className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold">
                  <CheckCircle2 className="h-4 w-4" /> Ingested & Normalized into Postgres
                </span>
              ) : (
                <span className="text-[11px] text-slate-500">Validated with Pydantic v2 schema</span>
              )}
              <button
                type="submit"
                className="flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 font-semibold text-slate-950 hover:bg-cyan-400 transition"
              >
                <Send className="h-3.5 w-3.5" />
                Ingest Payload
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
