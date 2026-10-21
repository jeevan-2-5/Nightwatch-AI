import React, { useState, useEffect } from 'react';
import {
  Wrench,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Play,
  RotateCcw,
  AlertTriangle,
  FileText,
  Activity,
  Layers,
} from 'lucide-react';
import { api } from '../../lib/api-client';
import { RemediationAction } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useDemo } from '../../context/DemoContext';

export const RemediationCenter: React.FC = () => {
  const { role, user } = useAuth();
  const { refreshTrigger, triggerRefresh } = useDemo();
  const [remediations, setRemediations] = useState<RemediationAction[]>([]);
  const [selectedAction, setSelectedAction] = useState<RemediationAction | null>(null);
  const [executing, setExecuting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadRemediations() {
      try {
        const res = await api.getRemediations();
        setRemediations(res.items);
        if (res.items.length > 0 && !selectedAction) {
          setSelectedAction(res.items[0]);
        }
      } catch (err) {
        console.error('Failed to load remediations', err);
      }
    }
    loadRemediations();
  }, [refreshTrigger]);

  const handleApprove = async (actionId: string) => {
    setErrorMsg(null);
    try {
      const updated = await api.approveRemediation(actionId, role, user.email, 'Approved via Remediation Center');
      setSelectedAction(updated);
      triggerRefresh();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleExecute = async (actionId: string) => {
    setExecuting(true);
    setErrorMsg(null);
    try {
      const res = await api.executeRemediation(actionId);
      setSelectedAction(res.action);
      triggerRefresh();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
            <Wrench className="h-5 w-5 text-cyan-400" />
            Remediation Center & Safe Execution Engine
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Human-in-the-loop approval, allowlisted actions, and post-execution recovery verification.
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs text-slate-400">
          <span>Active Role: <strong className="text-cyan-400">{role}</strong></span>
        </div>
      </div>

      {errorMsg && (
        <div className="rounded-xl border border-rose-800 bg-rose-950/60 p-3 text-xs text-rose-300 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Actions List */}
        <div className="space-y-3">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
            Proposed & Active Mitigations ({remediations.length})
          </div>
          {remediations.map((rem) => (
            <button
              key={rem.id}
              onClick={() => setSelectedAction(rem)}
              className={`w-full text-left rounded-xl border p-4 transition text-xs ${
                selectedAction?.id === rem.id
                  ? 'border-cyan-500 bg-cyan-950/20 shadow-md ring-1 ring-cyan-500/30'
                  : 'border-slate-800 bg-[#0d1322] hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-cyan-400 font-bold">{rem.id}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[9px] font-mono font-bold uppercase ${
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
              </div>
              <div className="font-bold text-slate-200 mt-2 line-clamp-1">{rem.title}</div>
              <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2 font-mono">
                <span>Target: {rem.targetService}</span>
                <span>Linked: {rem.incidentId}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Selected Action Details & Verification Runner */}
        {selectedAction && (
          <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-[#0d1322] p-6 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <span className="font-mono text-xs text-cyan-400">{selectedAction.id}</span>
                <h2 className="text-base font-bold text-slate-100 mt-1">{selectedAction.title}</h2>
                <p className="text-xs text-slate-300 mt-1">{selectedAction.description}</p>
              </div>

              {selectedAction.recoveryStatus && (
                <div className="rounded-xl border border-emerald-800 bg-emerald-950/40 p-3 text-right">
                  <span className="text-[10px] uppercase font-bold text-emerald-300 block">Verification Pass</span>
                  <span className="font-mono text-sm font-bold text-emerald-400">
                    {selectedAction.recoveryStatus}
                  </span>
                </div>
              )}
            </div>

            {/* Parameters & Allowlist Check */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 text-xs font-mono">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
                Action Registry & Parameter Bounds
              </span>
              <pre className="text-cyan-300 text-[11px] overflow-x-auto">
                {JSON.stringify(
                  {
                    actionType: selectedAction.actionType,
                    targetService: selectedAction.targetService,
                    parameters: selectedAction.parameters,
                    safetyAllowlist: 'ALLOWLISTED_SECURE_ADAPTER',
                  },
                  null,
                  2
                )}
              </pre>
            </div>

            {/* Approval Controls */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-cyan-400" />
                    Human Authorization Gate
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {selectedAction.approver
                      ? `Authorized by ${selectedAction.approver}`
                      : 'Approval required before executing state changes.'}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {selectedAction.status === 'PROPOSED' || selectedAction.status === 'PENDING_APPROVAL' ? (
                    <button
                      onClick={() => handleApprove(selectedAction.id)}
                      disabled={role === 'Viewer'}
                      className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold shadow-md transition ${
                        role === 'Viewer'
                          ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                          : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                      }`}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Approve Action
                    </button>
                  ) : selectedAction.status === 'APPROVED' ? (
                    <button
                      onClick={() => handleExecute(selectedAction.id)}
                      disabled={executing}
                      className="flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-400 transition"
                    >
                      <Play className="h-4 w-4" />
                      {executing ? 'Executing & Verifying...' : 'Execute Remediation'}
                    </button>
                  ) : (
                    <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold font-mono">
                      <CheckCircle2 className="h-4 w-4" />
                      RECOVERY VERIFIED & RESOLVED
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Execution Audit Log Stream */}
            {selectedAction.executionLogs.length > 0 && (
              <div className="rounded-xl border border-slate-800 bg-[#090d16] p-4 font-mono text-[11px]">
                <div className="text-slate-500 uppercase tracking-wider text-[10px] mb-2 border-b border-slate-800 pb-1">
                  Post-Action Verification Output
                </div>
                <div className="space-y-1">
                  {selectedAction.executionLogs.map((log, i) => (
                    <div
                      key={i}
                      className={
                        log.includes('RECOVERED')
                          ? 'text-emerald-400 font-bold'
                          : log.includes('VERIFY')
                          ? 'text-amber-300'
                          : log.includes('EXEC')
                          ? 'text-cyan-300'
                          : 'text-slate-400'
                      }
                    >
                      {log}
                    </div>
                  ))}
                </div>

                {selectedAction.recoveryMetrics && (
                  <div className="mt-3 rounded border border-emerald-900/60 bg-emerald-950/20 p-2 text-xs">
                    <span className="text-emerald-300 font-semibold">Verified Metric Recovery:</span>{' '}
                    {selectedAction.recoveryMetrics.metric} shifted from{' '}
                    <span className="text-rose-400 font-bold">{selectedAction.recoveryMetrics.preValue}{selectedAction.recoveryMetrics.unit}</span>{' '}
                    to{' '}
                    <span className="text-emerald-400 font-bold">{selectedAction.recoveryMetrics.postValue}{selectedAction.recoveryMetrics.unit}</span>{' '}
                    (Target Threshold: &lt;= {selectedAction.recoveryMetrics.threshold}{selectedAction.recoveryMetrics.unit})
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
