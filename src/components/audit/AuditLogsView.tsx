import React, { useState, useEffect } from 'react';
import {
  ScrollText,
  Shield,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import { api } from '../../lib/api-client';
import { AuditLog } from '../../types';
import { useDemo } from '../../context/DemoContext';

export const AuditLogsView: React.FC = () => {
  const { refreshTrigger } = useDemo();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function loadLogs() {
      try {
        const res = await api.getAuditLogs();
        setLogs(res.items);
      } catch (err) {
        console.error('Failed to load audit logs', err);
      }
    }
    loadLogs();
  }, [refreshTrigger]);

  const filtered = logs.filter(
    (l) =>
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      l.actor.toLowerCase().includes(search.toLowerCase()) ||
      l.details.toLowerCase().includes(search.toLowerCase()) ||
      l.resourceId.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
            <ScrollText className="h-5 w-5 text-cyan-400" />
            Compliance & Security Audit Logs
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Immutable records of all incident status modifications, investigation runs, and remediation approvals.
          </p>
        </div>

        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search audit actions, actors..."
            className="w-full rounded-lg border border-slate-800 bg-slate-900/90 py-1.5 pl-9 pr-3 text-xs text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-[#0d1322] shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="border-b border-slate-800 bg-slate-900/80 text-[11px] font-semibold uppercase text-slate-400">
              <tr>
                <th className="py-3.5 pl-4 pr-3">Timestamp</th>
                <th className="px-3 py-3.5">Actor & Role</th>
                <th className="px-3 py-3.5">Action</th>
                <th className="px-3 py-3.5">Resource</th>
                <th className="px-3 py-3.5">Details</th>
                <th className="py-3.5 pl-3 pr-4 text-right">Outcome</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {filtered.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-3.5 pl-4 pr-3 text-slate-400 text-[11px]">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="px-3 py-3.5">
                    <div className="text-slate-200">{log.actor}</div>
                    <span className="text-[10px] text-cyan-400 uppercase font-semibold">{log.role}</span>
                  </td>
                  <td className="px-3 py-3.5">
                    <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-300">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-3 py-3.5 text-cyan-300 font-bold">
                    {log.resourceType}: {log.resourceId}
                  </td>
                  <td className="px-3 py-3.5 text-slate-300 font-sans text-xs max-w-sm truncate">
                    {log.details}
                  </td>
                  <td className="py-3.5 pl-3 pr-4 text-right">
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-bold ${
                        log.status === 'SUCCESS' ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {log.status === 'SUCCESS' ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
