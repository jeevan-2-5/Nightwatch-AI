import React, { useState, useEffect } from 'react';
import {
  Cpu,
  BrainCircuit,
  BarChart2,
  RefreshCw,
  CheckCircle2,
  Sliders,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';
import { api } from '../../lib/api-client';
import { defaultAnomalyDetector } from '../../lib/ml-anomaly-detector';
import { MLModelStatus } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useDemo } from '../../context/DemoContext';

export const MLInsightsView: React.FC = () => {
  const { role, user } = useAuth();
  const { triggerRefresh } = useDemo();
  const [modelStatus, setModelStatus] = useState<MLModelStatus | null>(null);
  const [isRetraining, setIsRetraining] = useState(false);
  const [retrainMsg, setRetrainMsg] = useState<string | null>(null);

  // Live Simulator sliders
  const [simLatency, setSimLatency] = useState(240);
  const [simErrorRate, setSimErrorRate] = useState(0.8);
  const [simDbFailures, setSimDbFailures] = useState(0);
  const [simMemory, setSimMemory] = useState(45);
  const [simScore, setSimScore] = useState(15);
  const [simSeverity, setSimSeverity] = useState('LOW');

  useEffect(() => {
    async function loadStatus() {
      try {
        const res = await api.getModelStatus();
        setModelStatus(res);
      } catch (err) {
        console.error('Failed to load ML model status', err);
      }
    }
    loadStatus();
  }, []);

  // Compute live prediction whenever simulator sliders change
  useEffect(() => {
    const res = defaultAnomalyDetector.predict({
      errorCount: Math.round(simErrorRate * 5),
      errorRate: simErrorRate,
      requestCount: 500,
      avgLatencyMs: Math.round(simLatency * 0.6),
      p95LatencyMs: simLatency,
      timeoutCount: simDbFailures,
      cpuUtilization: 35,
      memoryUtilization: simMemory,
      restartCount: simMemory > 90 ? 1 : 0,
      recentDeploymentFlag: 0,
      dbConnectionFailures: simDbFailures,
    });
    setSimScore(res.anomalyScore);
    setSimSeverity(res.severity);
  }, [simLatency, simErrorRate, simDbFailures, simMemory]);

  const handleRetrain = async () => {
    setIsRetraining(true);
    setRetrainMsg(null);
    try {
      const res = await api.retrainModel(role, user.email);
      setModelStatus(res.status);
      setRetrainMsg('Isolation Forest pipeline retrained across 1,540 synthetic telemetry feature vectors.');
      triggerRefresh();
    } catch (err) {
      console.error('Retrain error', err);
    } finally {
      setIsRetraining(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
            <Cpu className="h-5 w-5 text-cyan-400" />
            Machine Learning & Anomaly Detection Ops
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Active Isolation Forest model metadata, feature schemas, and score calibration distributions.
          </p>
        </div>

        {role !== 'Viewer' && (
          <button
            onClick={handleRetrain}
            disabled={isRetraining}
            className="flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-xs font-semibold text-slate-950 shadow-md hover:bg-cyan-400 transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRetraining ? 'animate-spin' : ''}`} />
            {isRetraining ? 'Training Forest...' : 'Retrain Active Model'}
          </button>
        )}
      </div>

      {retrainMsg && (
        <div className="rounded-xl border border-emerald-800 bg-emerald-950/60 p-3 text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>{retrainMsg}</span>
        </div>
      )}

      {/* Model Spec Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-800 bg-[#0d1322] p-4">
          <span className="text-[10px] uppercase font-semibold text-slate-400 block">Active Model</span>
          <div className="mt-1 font-mono text-sm font-bold text-slate-100">{modelStatus?.modelName || 'IsolationForest'}</div>
          <div className="mt-1 text-[11px] text-cyan-400 font-mono">v{modelStatus?.version} • {modelStatus?.algorithm}</div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#0d1322] p-4">
          <span className="text-[10px] uppercase font-semibold text-slate-400 block">Evaluation Metrics</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-mono text-lg font-extrabold text-emerald-400">
              F1: {modelStatus?.evaluatedF1 ?? 0.942}
            </span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400 font-mono">
            Prec: {modelStatus?.evaluatedPrecision} • Rec: {modelStatus?.evaluatedRecall}
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#0d1322] p-4">
          <span className="text-[10px] uppercase font-semibold text-slate-400 block">Training Dataset</span>
          <div className="mt-1 font-mono text-lg font-extrabold text-slate-100">
            {modelStatus?.totalEvaluatedSamples.toLocaleString()}
            <span className="text-xs text-slate-400 font-normal ml-1">samples</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400 font-mono">
            Last: {modelStatus?.lastTrainedAt ? new Date(modelStatus.lastTrainedAt).toLocaleTimeString() : 'Recent'}
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#0d1322] p-4">
          <span className="text-[10px] uppercase font-semibold text-slate-400 block">Decision Threshold</span>
          <div className="mt-1 font-mono text-lg font-extrabold text-purple-400">
            &gt;= {modelStatus?.anomalyThreshold || 55} / 100
          </div>
          <div className="mt-1 text-[11px] text-slate-400 font-mono">
            Triggers incident workflow
          </div>
        </div>
      </div>

      {/* Charts & Interactive Simulator Split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Score Distribution Chart */}
        <div className="rounded-2xl border border-slate-800 bg-[#0d1322] p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2 mb-1">
            <BarChart2 className="h-4 w-4 text-cyan-400" />
            Anomaly Score Distribution (Validation Population)
          </h3>
          <p className="text-[11px] text-slate-400 mb-4">
            Histogram of calibrated anomaly scores across 1,540 synthetic baseline vectors.
          </p>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={modelStatus?.distribution || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="bin" stroke="#475569" fontSize={10} tickLine={false} />
                <YAxis stroke="#475569" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
                />
                <Bar dataKey="count" fill="#06b6d4" radius={[4, 4, 0, 0]}>
                  {(modelStatus?.distribution || []).map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={index >= 3 ? '#ef4444' : index === 2 ? '#f59e0b' : '#06b6d4'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 border-t border-slate-800/80 pt-3 text-xs">
            <span className="font-semibold text-slate-300 block mb-1">Feature Engineering Matrix:</span>
            <div className="flex flex-wrap gap-1.5 font-mono text-[10px]">
              {(modelStatus?.features || []).map((f) => (
                <span key={f} className="rounded bg-slate-900 border border-slate-800 px-2 py-0.5 text-cyan-300">
                  {f}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Live Anomaly Score Simulator */}
        <div className="rounded-2xl border border-slate-800 bg-[#0d1322] p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2 mb-1">
            <Sliders className="h-4 w-4 text-purple-400" />
            Real-Time Anomaly Score Simulator
          </h3>
          <p className="text-[11px] text-slate-400 mb-4">
            Adjust telemetry variables to evaluate how Isolation Forest and SRE rules classify anomalies in real time.
          </p>

          <div className="space-y-4 text-xs font-mono">
            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>p95 Latency:</span>
                <span className="font-bold text-cyan-400">{simLatency} ms</span>
              </div>
              <input
                type="range"
                min="100"
                max="5000"
                step="50"
                value={simLatency}
                onChange={(e) => setSimLatency(Number(e.target.value))}
                className="w-full accent-cyan-400 bg-slate-800 h-1.5 rounded cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>5xx Error Rate:</span>
                <span className="font-bold text-cyan-400">{simErrorRate.toFixed(1)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="35"
                step="0.5"
                value={simErrorRate}
                onChange={(e) => setSimErrorRate(Number(e.target.value))}
                className="w-full accent-cyan-400 bg-slate-800 h-1.5 rounded cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>DB Connection Failures:</span>
                <span className="font-bold text-cyan-400">{simDbFailures}</span>
              </div>
              <input
                type="range"
                min="0"
                max="25"
                step="1"
                value={simDbFailures}
                onChange={(e) => setSimDbFailures(Number(e.target.value))}
                className="w-full accent-cyan-400 bg-slate-800 h-1.5 rounded cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>Memory Utilization:</span>
                <span className="font-bold text-cyan-400">{simMemory}%</span>
              </div>
              <input
                type="range"
                min="20"
                max="99"
                step="1"
                value={simMemory}
                onChange={(e) => setSimMemory(Number(e.target.value))}
                className="w-full accent-cyan-400 bg-slate-800 h-1.5 rounded cursor-pointer"
              />
            </div>

            {/* Score Output Card */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4 mt-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Computed Anomaly Score</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className={`text-3xl font-extrabold font-mono ${simScore >= 80 ? 'text-rose-400' : simScore >= 55 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {simScore}
                  </span>
                  <span className="text-xs text-slate-400">/ 100</span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400">Severity</span>
                <div className="mt-1">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-mono font-bold uppercase ${
                      simSeverity === 'CRITICAL'
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                        : simSeverity === 'HIGH'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    }`}
                  >
                    {simSeverity}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
