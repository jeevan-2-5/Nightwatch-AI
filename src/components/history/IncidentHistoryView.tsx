import React, { useState } from 'react';
import {
  History,
  Search,
  BookOpen,
  CheckCircle2,
  Calendar,
  ExternalLink,
  Tag,
  ArrowRight,
} from 'lucide-react';

interface HistoricalIncident {
  id: string;
  title: string;
  service: string;
  durationMinutes: number;
  resolvedAt: string;
  rootCause: string;
  remediationSummary: string;
  similarityScore: number;
  tags: string[];
}

export const IncidentHistoryView: React.FC = () => {
  const [search, setSearch] = useState('');

  const pastIncidents: HistoricalIncident[] = [
    {
      id: 'INC-3940',
      title: 'PgBouncer Client Connection Starvation during Flash Sale Peak',
      service: 'payment-api',
      durationMinutes: 18,
      resolvedAt: '2026-09-14T14:22:00Z',
      rootCause: 'Connection pool default max_connections exhausted by burst traffic.',
      remediationSummary: 'Dynamically scaled connection pool limits to 300 and restarted idling workers.',
      similarityScore: 96,
      tags: ['database', 'pgbouncer', 'latency', 'connection-pool'],
    },
    {
      id: 'INC-3610',
      title: 'Payment Gateway Stripe Webhook Idempotency Key Collisions',
      service: 'payment-api',
      durationMinutes: 42,
      resolvedAt: '2026-08-02T19:10:00Z',
      rootCause: 'Redis hash key eviction TTL expired before duplicate check completed.',
      remediationSummary: 'Extended Redis TTL to 24h and added in-memory LRU fallback layer.',
      similarityScore: 78,
      tags: ['payment-api', 'redis', 'idempotency'],
    },
    {
      id: 'INC-3205',
      title: 'Celery Notification Worker Heap Memory Leak under Bulk Broadcast',
      service: 'notification-worker',
      durationMinutes: 24,
      resolvedAt: '2026-06-18T11:45:00Z',
      rootCause: 'Unbounded array accumulation in email template compiler closure.',
      remediationSummary: 'Patched closure reference and capped max-tasks-per-child to 1000.',
      similarityScore: 84,
      tags: ['celery', 'memory-leak', 'oom'],
    },
    {
      id: 'INC-2980',
      title: 'PostgreSQL Secondary Replica Lag triggering Stale Read Panics',
      service: 'postgres-primary',
      durationMinutes: 35,
      resolvedAt: '2026-04-10T08:30:00Z',
      rootCause: 'Disk IOPS throttling on cloud storage volume during nightly indexing.',
      remediationSummary: 'Provisioned 10k IOPS SSD volume and adjusted autovacuum vacuum_cost_limit.',
      similarityScore: 72,
      tags: ['postgres', 'replication', 'disk-iops'],
    },
  ];

  const filtered = pastIncidents.filter(
    (inc) =>
      inc.title.toLowerCase().includes(search.toLowerCase()) ||
      inc.rootCause.toLowerCase().includes(search.toLowerCase()) ||
      inc.service.toLowerCase().includes(search.toLowerCase()) ||
      inc.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
            <History className="h-5 w-5 text-cyan-400" />
            Incident Knowledge Base & Similarity Retrieval
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Searchable historical postmortems, resolution playbooks, and root-cause pattern matching.
          </p>
        </div>

        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search symptoms, causes, tags..."
            className="w-full rounded-lg border border-slate-800 bg-slate-900/90 py-1.5 pl-9 pr-3 text-xs text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((item) => (
          <div
            key={item.id}
            className="rounded-2xl border border-slate-800 bg-[#0d1322] p-5 shadow-sm space-y-3 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-cyan-400 font-bold">{item.id}</span>
                  <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-300">
                    {item.service}
                  </span>
                </div>
                <span className="rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-800/60 px-2 py-0.5 text-[10px] font-mono font-semibold">
                  {item.similarityScore}% Match
                </span>
              </div>

              <h3 className="text-sm font-bold text-slate-100 mt-2">{item.title}</h3>

              <div className="rounded-lg border border-slate-800/80 bg-slate-900/80 p-3 mt-3 text-xs space-y-1.5">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Identified Root Cause:</span>
                  <span className="text-slate-200">{item.rootCause}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Remediation Executed:</span>
                  <span className="text-emerald-400">{item.remediationSummary}</span>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-800/80 pt-3 flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1 font-mono">
                <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                MTTR: {item.durationMinutes}m
              </span>
              <div className="flex items-center gap-1">
                {item.tags.slice(0, 2).map((t) => (
                  <span key={t} className="rounded bg-slate-800/80 px-1.5 py-0.5 text-[9px] font-mono text-slate-400">
                    #{t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
