import React, { useState, useEffect } from 'react';
import {
  BrainCircuit,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Terminal,
  Activity,
  Layers,
  Wrench,
  ShieldCheck,
  Zap,
  Play,
  RotateCcw,
  UserCheck,
  FileText,
  AlertCircle,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';
import { api } from '../../lib/api-client';
import {
  Incident,
  InvestigationReport,
  RemediationAction,
  TelemetryLog,
  MetricSample,
  DeploymentEvent,
  RootCauseHypothesis,
} from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useDemo } from '../../context/DemoContext';

interface InvestigationWorkspaceProps {
  incidentId: string;
  onBack: () => void;
}

export const InvestigationWorkspace: React.FC<InvestigationWorkspaceProps> = ({
  incidentId,
  onBack,
}) => {
  const { role, user } = useAuth();
  const { refreshTrigger, triggerRefresh } = useDemo();
  const [incident, setIncident] = useState<Incident | null>(null);
  const [report, setReport] = useState<InvestigationReport | null>(null);
  const [remediations, setRemediations] = useState<RemediationAction[]>([]);
  const [logs, setLogs] = useState<TelemetryLog[]>([]);
  const [deployments, setDeployments] = useState<DeploymentEvent[]>([]);
  const [activeTab, setActiveTab] = useState<'hypotheses' | 'timeline' | 'logs' | 'remediation' | 'audit'>('hypotheses');
  const [isInvestigating, setIsInvestigating] = useState(false);
  const [isExecutingRemediation, setIsExecutingRemediation] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadIncidentData() {
      try {
        const inc = await api.getIncident(incidentId);
        setIncident(inc);

        const [rems, lgs, deps] = await Promise.all([
          api.getRemediations(),
          api.getLogs({ service: inc.service }),
          fetch('/api/v1/telemetry/deployments').then((r) => r.json()),
        ]);

        setRemediations(rems.items.filter((r) => r.incidentId === incidentId || r.targetService.includes(inc.service)));
        setLogs(lgs.items);
        setDeployments(deps.items || []);

        // Load or auto-run investigation report
        if (inc.investigationId) {
          try {
            const rep = await api.getInvestigation(inc.investigationId);
            setReport(rep);
          } catch {
            const rep = await api.triggerInvestigation(incidentId);
            setReport(rep);
          }
        } else {
          const rep = await api.triggerInvestigation(incidentId);
          setReport(rep);
        }
      } catch (err: any) {
        console.error('Failed to load incident detail', err);
        setErrorMsg(err.message);
      }
    }
    loadIncidentData();
  }, [incidentId, refreshTrigger]);

  const handleRunInvestigation = async () => {
    setIsInvestigating(true);
    setErrorMsg(null);
    try {
      const rep = await api.triggerInvestigation(incidentId);
      setReport(rep);
      const updatedInc = await api.getIncident(incidentId);
      setIncident(updatedInc);
      triggerRefresh();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsInvestigating(false);
    }
  };

  const handleStatusChange = async (newStatus: any) => {
    if (!incident) return;
    try {
      const updated = await api.updateIncident(incident.id, { status: newStatus }, role, user.email);
      setIncident(updated);
      triggerRefresh();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleApproveAction = async (actionId: string) => {
    setErrorMsg(null);
    try {
      await api.approveRemediation(actionId, role, user.email, approvalNotes || 'Reviewed and approved by engineer');
      const rems = await api.getRemediations();
      setRemediations(rems.items.filter((r) => r.incidentId === incidentId || r.targetService.includes(incident?.service || '')));
      triggerRefresh();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleExecuteAction = async (actionId: string) => {
    setIsExecutingRemediation(true);
    setErrorMsg(null);
    try {
      await api.executeRemediation(actionId);
      const rems = await api.getRemediations();
      setRemediations(rems.items.filter((r) => r.incidentId === incidentId || r.targetService.includes(incident?.service || '')));
      const updatedInc = await api.getIncident(incidentId);
      setIncident(updatedInc);
      triggerRefresh();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsExecutingRemediation(false);
    }
  };

  if (!incident) {
    return (
      <div className="flex h-96 items-center justify-center text-slate-400">
        <Clock className="h-6 w-6 animate-spin text-cyan-400 mr-2" />
        Loading Incident Investigation Workspace...
      </div>
    );
  }

  const activeRemediation = remediations[0];

  return (
    <div className="space-y-6 pb-16">
      {/* Back button and breadcrumb */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-cyan-300 transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Incidents List
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Lifecycle Status:</span>
          <select
            value={incident.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            disabled={role === 'Viewer'}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-mono font-bold text-slate-200 focus:border-cyan-500 focus:outline-none"
          >
            <option value="OPEN">OPEN</option>
            <option value="INVESTIGATING">INVESTIGATING</option>
            <option value="MITIGATED">MITIGATED</option>
            <option value="RESOLVED">RESOLVED</option>
          </select>

          <button
            onClick={handleRunInvestigation}
            disabled={isInvestigating}
            className="flex items-center gap-1.5 rounded-lg bg-cyan-500/20 border border-cyan-500/40 px-3 py-1.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/30 transition shadow-sm"
          >
            <BrainCircuit className="h-3.5 w-3.5 text-cyan-400" />
            {isInvestigating ? 'Correlating Evidence...' : 'Re-run Investigation'}
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="rounded-xl border border-rose-800 bg-rose-950/60 p-3 text-xs text-rose-300 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Incident Header Card */}
      <div className="rounded-2xl border border-slate-800 bg-[#0d1322] p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
          <div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-base font-extrabold text-cyan-400">
                {incident.id}
              </span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-mono font-bold uppercase ${
                  incident.severity === 'CRITICAL'
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                }`}
              >
                {incident.severity}
              </span>
              <span className="rounded-md bg-slate-800 px-2.5 py-0.5 text-xs font-mono text-slate-300">
                Service: <strong className="text-white">{incident.service}</strong>
              </span>
              <span className="rounded-md bg-slate-800 px-2.5 py-0.5 text-xs font-mono text-slate-400">
                Env: {incident.environment}
              </span>
            </div>

            <h1 className="text-lg font-bold text-slate-100 mt-2">
              {incident.title}
            </h1>
            <p className="text-xs text-slate-300 mt-1 max-w-3xl leading-relaxed">
              {incident.description}
            </p>
          </div>

          <div className="flex md:flex-col items-end justify-between border-t md:border-t-0 md:border-l border-slate-800 md:pl-6 pt-3 md:pt-0">
            <div className="text-right">
              <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                Peak Anomaly Score
              </div>
              <div className="font-mono text-2xl font-extrabold text-rose-400">
                {incident.anomalyScore}
                <span className="text-xs text-slate-500 font-normal">/100</span>
              </div>
            </div>
            <div className="text-right mt-1">
              <span className="text-[11px] text-slate-400 font-mono">
                Assigned: <span className="text-slate-200">{incident.assignedTo || 'Unassigned'}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Executive Summary Callout */}
        {report && (
          <div className="mt-4 rounded-xl border border-cyan-800/40 bg-cyan-950/20 p-4">
            <div className="flex items-center gap-2 text-xs font-bold text-cyan-300 uppercase tracking-wider">
              <BrainCircuit className="h-4 w-4 text-cyan-400" />
              Autonomous Investigation Findings
            </div>
            <p className="text-xs text-slate-200 mt-1.5 leading-relaxed font-normal">
              {report.executiveSummary}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-4 text-[11px] text-slate-400 font-mono">
              <span>Detection: {report.detectionMethod}</span>
              <span>•</span>
              <span>Events Evaluated: {report.analyzedEventsCount}</span>
            </div>
          </div>
        )}

        {/* Workspace Navigation Tabs */}
        <div className="mt-6 flex flex-wrap items-center gap-2 border-b border-slate-800 pb-px text-xs font-medium">
          <button
            onClick={() => setActiveTab('hypotheses')}
            className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition ${
              activeTab === 'hypotheses'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-500/10 rounded-t'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <BrainCircuit className="h-4 w-4" />
            Ranked Root-Cause Hypotheses ({report?.hypotheses.length || 0})
          </button>

          <button
            onClick={() => setActiveTab('timeline')}
            className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition ${
              activeTab === 'timeline'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-500/10 rounded-t'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="h-4 w-4" />
            Correlated Event Timeline
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition ${
              activeTab === 'logs'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-500/10 rounded-t'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="h-4 w-4" />
            Telemetry Stream & Traces ({logs.length})
          </button>

          <button
            onClick={() => setActiveTab('remediation')}
            className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition ${
              activeTab === 'remediation'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-500/10 rounded-t'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Wrench className="h-4 w-4" />
            Remediation & Recovery Verification ({remediations.length})
          </button>
        </div>
      </div>

      {/* Tab 1: Ranked Root-Cause Hypotheses */}
      {activeTab === 'hypotheses' && report && (
        <div className="space-y-4">
          {report.hypotheses.map((hyp) => (
            <div
              key={hyp.id}
              className={`rounded-2xl border p-6 transition shadow-sm ${
                hyp.rank === 1
                  ? 'border-cyan-500/50 bg-[#0d1322] ring-1 ring-cyan-500/20'
                  : 'border-slate-800 bg-[#0d1322]/80'
              }`}
            >
              {/* Hypothesis Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-lg font-mono text-xs font-bold ${
                      hyp.rank === 1
                        ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-950/60'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    #{hyp.rank}
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-slate-100">{hyp.title}</h3>
                    <span className="text-[11px] text-slate-400 font-mono">
                      Ranked via multi-signal temporal proximity and topology correlation
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">
                      Relative Confidence
                    </div>
                    <div className="font-mono text-base font-extrabold text-cyan-400">
                      {hyp.confidence}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Explanation */}
              <p className="mt-3 text-xs text-slate-200 leading-relaxed font-normal">
                {hyp.explanation}
              </p>

              {/* Supporting Evidence Citations */}
              <div className="mt-4 space-y-2">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  Supporting Telemetry Signals ({hyp.supportingEvidence.length})
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {hyp.supportingEvidence.map((ev) => (
                    <div
                      key={ev.id}
                      className="rounded-lg border border-slate-800 bg-slate-900/80 p-3 text-xs flex flex-col justify-between"
                    >
                      <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                        <span className="uppercase text-cyan-400 font-semibold">{ev.type}</span>
                        <span className="text-slate-500">{new Date(ev.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <div className="text-slate-200">{ev.description}</div>
                      {ev.metricDelta && (
                        <div className="mt-2 text-[10px] font-mono text-rose-400 font-bold">
                          Delta: {ev.metricDelta}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Contradictory Evidence Citations */}
              {hyp.contradictoryEvidence.length > 0 && (
                <div className="mt-4 space-y-2">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <HelpCircle className="h-3.5 w-3.5 text-amber-400" />
                    Contradictory / Disproving Evidence ({hyp.contradictoryEvidence.length})
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-xs text-slate-300">
                    {hyp.contradictoryEvidence[0].description}
                  </div>
                </div>
              )}

              {/* Recommended Fix & Verification Checks */}
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-800/80 pt-4 text-xs">
                <div>
                  <span className="font-semibold text-cyan-300 block mb-1">
                    Recommended Fix Strategy:
                  </span>
                  <div className="rounded-lg border border-slate-800 bg-slate-900/80 p-2.5 text-slate-200">
                    {hyp.recommendedFix}
                  </div>
                </div>

                <div>
                  <span className="font-semibold text-slate-300 block mb-1">
                    Recommended Additional Verification Checks:
                  </span>
                  <ul className="space-y-1 list-disc list-inside text-slate-400">
                    {hyp.recommendedChecks.map((chk, idx) => (
                      <li key={idx} className="truncate">{chk}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}

          {/* Uncertainty & Caveat Box */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-xs text-slate-400">
            <span className="font-semibold text-slate-300 uppercase tracking-wider text-[11px] block mb-1">
              Methodology & Remaining Uncertainties
            </span>
            <p className="leading-relaxed">
              {report.confidenceExplanation}
            </p>
            <ul className="mt-2 space-y-1 list-disc list-inside text-slate-400">
              {report.remainingUncertainties.map((u, i) => (
                <li key={i}>{u}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Tab 2: Correlated Event Timeline */}
      {activeTab === 'timeline' && (
        <div className="rounded-2xl border border-slate-800 bg-[#0d1322] p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2 mb-4">
            <Clock className="h-4 w-4 text-cyan-400" />
            Chronological Correlation Timeline
          </h3>

          <div className="relative pl-6 space-y-6 before:absolute before:bottom-0 before:left-2.5 before:top-2 before:w-0.5 before:bg-slate-800">
            {/* Deployments in timeline */}
            {deployments.map((d) => (
              <div key={d.id} className="relative">
                <span className="absolute -left-6 top-1 h-3.5 w-3.5 rounded-full border-2 border-[#0d1322] bg-purple-500 ring-2 ring-purple-900" />
                <div className="rounded-xl border border-purple-900/60 bg-purple-950/20 p-3 text-xs">
                  <div className="flex items-center justify-between text-[11px] font-mono text-purple-300">
                    <span>DEPLOYMENT: {d.service} ({d.version})</span>
                    <span>{new Date(d.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <div className="text-slate-200 mt-1">{d.description}</div>
                  <div className="text-[10px] text-slate-400 mt-1">Author: {d.author}</div>
                </div>
              </div>
            ))}

            {/* Error logs in timeline */}
            {logs.filter((l) => l.level === 'ERROR' || l.level === 'FATAL').map((l) => (
              <div key={l.id} className="relative">
                <span className="absolute -left-6 top-1 h-3.5 w-3.5 rounded-full border-2 border-[#0d1322] bg-rose-500 ring-2 ring-rose-900 animate-pulse" />
                <div className="rounded-xl border border-rose-900/60 bg-rose-950/20 p-3 text-xs">
                  <div className="flex items-center justify-between text-[11px] font-mono text-rose-300">
                    <span>{l.level} INGESTED: {l.service}</span>
                    <span>{new Date(l.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <div className="font-mono text-slate-200 mt-1">{l.message}</div>
                  <div className="text-[10px] text-slate-400 mt-1 font-mono">Trace ID: {l.traceId}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Telemetry Stream & Traces */}
      {activeTab === 'logs' && (
        <div className="rounded-2xl border border-slate-800 bg-[#0d1322] p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Terminal className="h-4 w-4 text-cyan-400" />
              Correlated Logs & Distributed Traces
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              Filtered for service: <strong className="text-cyan-400">{incident.service}</strong>
            </span>
          </div>

          <div className="space-y-2 font-mono text-xs">
            {logs.map((l) => (
              <div
                key={l.id}
                className="rounded-lg border border-slate-800 bg-slate-900/80 p-3 transition hover:bg-slate-800/60"
              >
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded px-1.5 py-0.2 text-[9px] font-bold ${
                        l.level === 'FATAL' || l.level === 'ERROR'
                          ? 'bg-rose-950 text-rose-400 border border-rose-800'
                          : l.level === 'WARN'
                          ? 'bg-amber-950 text-amber-300 border border-amber-800'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {l.level}
                    </span>
                    <span className="text-slate-300 font-semibold">{l.service}</span>
                    <span className="text-slate-500">[{l.environment}]</span>
                  </div>
                  <span className="text-slate-500">{new Date(l.timestamp).toLocaleTimeString()}</span>
                </div>
                <div className="mt-1.5 text-slate-200">{l.message}</div>
                <div className="mt-2 text-[10px] text-slate-500 flex items-center gap-3">
                  <span>Trace: {l.traceId}</span>
                  {l.metadata && Object.keys(l.metadata).length > 0 && (
                    <span>Meta: {JSON.stringify(l.metadata)}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Remediation & Recovery Verification */}
      {activeTab === 'remediation' && (
        <div className="space-y-6">
          {remediations.map((rem) => (
            <div
              key={rem.id}
              className="rounded-2xl border border-slate-800 bg-[#0d1322] p-6 shadow-sm space-y-5"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-slate-400">{rem.id}</span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase ${
                        rem.status === 'SUCCEEDED'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                          : rem.status === 'APPROVED'
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                          : rem.status === 'PENDING_APPROVAL'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {rem.status}
                    </span>
                    <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-300">
                      Target: {rem.targetService}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-100 mt-2">{rem.title}</h3>
                  <p className="text-xs text-slate-300 mt-0.5">{rem.description}</p>
                </div>

                {/* Status Indicator */}
                {rem.recoveryStatus && (
                  <div className="rounded-xl border border-emerald-800/80 bg-emerald-950/40 p-3 text-right">
                    <span className="text-[10px] text-emerald-300 uppercase tracking-wider font-semibold block">
                      Post-Action Recovery
                    </span>
                    <span className="font-mono text-sm font-bold text-emerald-400">
                      {rem.recoveryStatus}
                    </span>
                  </div>
                )}
              </div>

              {/* Action Parameters */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3 text-xs">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 block mb-1">
                  Parameters & Safe Allowlist Contract:
                </span>
                <pre className="font-mono text-[11px] text-cyan-300 overflow-x-auto">
                  {JSON.stringify(rem.parameters, null, 2)}
                </pre>
              </div>

              {/* Human-in-the-Loop Approval Action Controls */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-xs font-bold text-slate-200 flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-cyan-400" />
                      Human Authorization Gate (RBAC Policy)
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {rem.approver
                        ? `Approved by ${rem.approver} at ${new Date(rem.approvedAt || '').toLocaleTimeString()}`
                        : 'Requires authorized Engineer or Admin role approval before dispatching changes.'}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    {rem.status === 'PENDING_APPROVAL' || rem.status === 'PROPOSED' ? (
                      <button
                        onClick={() => handleApproveAction(rem.id)}
                        disabled={role === 'Viewer'}
                        className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold shadow-md transition ${
                          role === 'Viewer'
                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                        }`}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Authorize & Approve Fix
                      </button>
                    ) : rem.status === 'APPROVED' ? (
                      <button
                        onClick={() => handleExecuteAction(rem.id)}
                        disabled={isExecutingRemediation}
                        className="flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-400 transition"
                      >
                        <Play className="h-3.5 w-3.5" />
                        {isExecutingRemediation ? 'Executing & Verifying...' : 'Execute Remediation & Verify'}
                      </button>
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold font-mono">
                        <CheckCircle2 className="h-4 w-4" />
                        RECOVERY VERIFIED
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Execution & Post-Recovery Health Check Logs */}
              {rem.executionLogs.length > 0 && (
                <div className="rounded-xl border border-slate-800 bg-[#090d16] p-4 font-mono text-[11px] text-slate-300">
                  <div className="flex items-center justify-between text-slate-500 mb-2 border-b border-slate-800 pb-1">
                    <span>EXECUTION AUDIT LOGS</span>
                    <span>Adapter: Safe Sandboxed SRE Runner</span>
                  </div>
                  <div className="space-y-1">
                    {rem.executionLogs.map((log, idx) => (
                      <div
                        key={idx}
                        className={
                          log.includes('RECOVERED')
                            ? 'text-emerald-400 font-bold'
                            : log.includes('EXEC')
                            ? 'text-cyan-300'
                            : log.includes('VERIFY')
                            ? 'text-amber-300'
                            : 'text-slate-400'
                        }
                      >
                        {log}
                      </div>
                    ))}
                  </div>

                  {rem.recoveryMetrics && (
                    <div className="mt-3 rounded border border-emerald-900/60 bg-emerald-950/20 p-2 text-xs">
                      <span className="text-emerald-300 font-semibold">
                        Telemetry Verification Outcome:
                      </span>{' '}
                      {rem.recoveryMetrics.metric} changed from{' '}
                      <span className="text-rose-400 font-bold">{rem.recoveryMetrics.preValue}{rem.recoveryMetrics.unit}</span>{' '}
                      to{' '}
                      <span className="text-emerald-400 font-bold">{rem.recoveryMetrics.postValue}{rem.recoveryMetrics.unit}</span>{' '}
                      (Threshold: &lt;= {rem.recoveryMetrics.threshold}{rem.recoveryMetrics.unit})
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
