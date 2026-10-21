import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Search,
  Filter,
  Plus,
  ArrowUpDown,
  BrainCircuit,
  Clock,
  UserCheck,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { api } from '../../lib/api-client';
import { Incident, IncidentSeverity, IncidentStatus } from '../../types';
import { useDemo } from '../../context/DemoContext';
import { useAuth } from '../../context/AuthContext';

interface IncidentsListProps {
  onSelectIncident: (id: string) => void;
  searchFilter?: string;
}

export const IncidentsList: React.FC<IncidentsListProps> = ({
  onSelectIncident,
  searchFilter = '',
}) => {
  const { refreshTrigger } = useDemo();
  const { role, user } = useAuth();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState(searchFilter);
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [serviceFilter, setServiceFilter] = useState<string>('ALL');

  // Create Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newService, setNewService] = useState('payment-api');
  const [newSeverity, setNewSeverity] = useState<IncidentSeverity>('HIGH');

  useEffect(() => {
    async function fetchIncidents() {
      setLoading(true);
      try {
        const res = await api.getIncidents({
          severity: severityFilter,
          status: statusFilter,
          service: serviceFilter,
          search: search || searchFilter,
        });
        setIncidents(res.items);
      } catch (err) {
        console.error('Failed to fetch incidents', err);
      } finally {
        setLoading(false);
      }
    }
    fetchIncidents();
  }, [refreshTrigger, severityFilter, statusFilter, serviceFilter, search, searchFilter]);

  const handleCreateIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    try {
      const created = await api.createIncident(
        {
          title: newTitle,
          description: newDesc,
          service: newService,
          severity: newSeverity,
          anomalyScore: newSeverity === 'CRITICAL' ? 92 : 65,
        },
        role,
        user.email
      );
      setShowCreateModal(false);
      setNewTitle('');
      setNewDesc('');
      onSelectIncident(created.id);
    } catch (err) {
      console.error('Failed to create incident', err);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-rose-400" />
            Incident Management Hub
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Track, prioritize, and investigate anomalies across production microservices.
          </p>
        </div>

        {role !== 'Viewer' && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 rounded-lg bg-cyan-500 px-3.5 py-2 text-xs font-semibold text-slate-950 shadow-md shadow-cyan-950/60 hover:bg-cyan-400 transition"
          >
            <Plus className="h-4 w-4" />
            Report Incident
          </button>
        )}
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-[#0d1322] p-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by title, ID, tag..."
              className="w-full rounded-md border border-slate-800 bg-slate-900/90 py-1.5 pl-8 pr-3 text-xs text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
            />
          </div>

          {/* Severity Filter */}
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="rounded-md border border-slate-800 bg-slate-900/90 px-3 py-1.5 text-xs text-slate-300 focus:border-cyan-500 focus:outline-none"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-md border border-slate-800 bg-slate-900/90 px-3 py-1.5 text-xs text-slate-300 focus:border-cyan-500 focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="INVESTIGATING">Investigating</option>
            <option value="MITIGATED">Mitigated</option>
            <option value="RESOLVED">Resolved</option>
          </select>

          {/* Service Filter */}
          <select
            value={serviceFilter}
            onChange={(e) => setServiceFilter(e.target.value)}
            className="rounded-md border border-slate-800 bg-slate-900/90 px-3 py-1.5 text-xs text-slate-300 focus:border-cyan-500 focus:outline-none"
          >
            <option value="ALL">All Services</option>
            <option value="payment-api">payment-api</option>
            <option value="checkout-svc">checkout-svc</option>
            <option value="notification-worker">notification-worker</option>
            <option value="postgres-primary">postgres-primary</option>
            <option value="redis-cache">redis-cache</option>
          </select>
        </div>

        <div className="text-slate-400 font-mono text-[11px]">
          Showing <span className="text-cyan-400 font-semibold">{incidents.length}</span> recorded incidents
        </div>
      </div>

      {/* Incidents Table */}
      <div className="overflow-hidden rounded-xl border border-slate-800 bg-[#0d1322] shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 bg-slate-900/80 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="py-3.5 pl-4 pr-3">Incident ID</th>
                <th className="px-3 py-3.5">Severity</th>
                <th className="px-3 py-3.5">Title & Context</th>
                <th className="px-3 py-3.5">Service</th>
                <th className="px-3 py-3.5">Anomaly Score</th>
                <th className="px-3 py-3.5">Root Cause Status</th>
                <th className="px-3 py-3.5">Status</th>
                <th className="py-3.5 pl-3 pr-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {incidents.map((inc) => (
                <tr
                  key={inc.id}
                  onClick={() => onSelectIncident(inc.id)}
                  className="cursor-pointer transition hover:bg-slate-800/40 group"
                >
                  <td className="py-3.5 pl-4 pr-3 font-mono font-bold text-cyan-400 group-hover:text-cyan-300">
                    {inc.id}
                  </td>
                  <td className="px-3 py-3.5">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-mono font-bold uppercase ${
                        inc.severity === 'CRITICAL'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                          : inc.severity === 'HIGH'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : inc.severity === 'MEDIUM'
                          ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40'
                          : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      }`}
                    >
                      {inc.severity}
                    </span>
                  </td>
                  <td className="px-3 py-3.5 max-w-xs">
                    <div className="truncate text-slate-200 group-hover:text-white font-medium">
                      {inc.title}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1">
                      <span className="font-mono">{new Date(inc.createdAt).toLocaleTimeString()}</span>
                      <span>•</span>
                      <span className="truncate">{inc.assignedTo || 'Unassigned'}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3.5 font-mono text-slate-300">
                    {inc.service}
                  </td>
                  <td className="px-3 py-3.5 font-mono">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-800">
                        <div
                          className={`h-full ${
                            inc.anomalyScore >= 80 ? 'bg-rose-500' : inc.anomalyScore >= 50 ? 'bg-amber-500' : 'bg-cyan-400'
                          }`}
                          style={{ width: `${inc.anomalyScore}%` }}
                        />
                      </div>
                      <span
                        className={`text-xs font-bold ${
                          inc.anomalyScore >= 80 ? 'text-rose-400' : 'text-slate-300'
                        }`}
                      >
                        {inc.anomalyScore}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-3.5 font-mono text-[11px]">
                    <span className="flex items-center gap-1.5 text-cyan-300">
                      <BrainCircuit className="h-3.5 w-3.5 text-cyan-400" />
                      {inc.rootCauseStatus}
                    </span>
                  </td>
                  <td className="px-3 py-3.5">
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-mono font-semibold ${
                        inc.status === 'INVESTIGATING'
                          ? 'bg-amber-950/80 text-amber-300 border border-amber-800/60'
                          : inc.status === 'OPEN'
                          ? 'bg-rose-950/80 text-rose-300 border border-rose-800/60'
                          : 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60'
                      }`}
                    >
                      {inc.status}
                    </span>
                  </td>
                  <td className="py-3.5 pl-3 pr-4 text-right">
                    <span className="inline-flex items-center gap-1 rounded bg-slate-800 px-2.5 py-1 text-[11px] font-medium text-cyan-300 group-hover:bg-cyan-500 group-hover:text-slate-950 transition">
                      Investigate <ExternalLink className="h-3 w-3" />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Report Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-[#0d1322] p-6 shadow-2xl">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-cyan-400" />
              Report New Incident
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Triggers telemetry correlation and automated hypothesis ranking.
            </p>

            <form onSubmit={handleCreateIncident} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-300 mb-1">Incident Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Ingress Gateway Error Rate Spike"
                  className="w-full rounded-lg border border-slate-800 bg-slate-900 p-2.5 text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">Affected Service</label>
                <select
                  value={newService}
                  onChange={(e) => setNewService(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-900 p-2.5 text-slate-200 focus:border-cyan-500 focus:outline-none"
                >
                  <option value="payment-api">payment-api</option>
                  <option value="checkout-svc">checkout-svc</option>
                  <option value="notification-worker">notification-worker</option>
                  <option value="postgres-primary">postgres-primary</option>
                  <option value="redis-cache">redis-cache</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">Severity Grade</label>
                <select
                  value={newSeverity}
                  onChange={(e) => setNewSeverity(e.target.value as IncidentSeverity)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-900 p-2.5 text-slate-200 focus:border-cyan-500 focus:outline-none"
                >
                  <option value="CRITICAL">Critical (P0 - Service Down / Severe Anomaly)</option>
                  <option value="HIGH">High (P1 - Core Flow Degraded)</option>
                  <option value="MEDIUM">Medium (P2 - Non-critical Path)</option>
                  <option value="LOW">Low (P3 - Minor Deviation)</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">Summary / Observations</label>
                <textarea
                  rows={3}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Observed error logs, latency spikes, or customer impact..."
                  className="w-full rounded-lg border border-slate-800 bg-slate-900 p-2.5 text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-lg border border-slate-800 px-4 py-2 font-medium text-slate-400 hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-cyan-500 px-4 py-2 font-semibold text-slate-950 hover:bg-cyan-400 transition"
                >
                  Create & Analyze
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
