import React, { useState, useEffect } from 'react';
import {
  Network,
  Server,
  Database,
  Layers,
  Cpu,
  Activity,
  ArrowRight,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { api } from '../../lib/api-client';
import { ServiceNode } from '../../types';
import { useDemo } from '../../context/DemoContext';

export const ServicesTopology: React.FC = () => {
  const { refreshTrigger } = useDemo();
  const [services, setServices] = useState<ServiceNode[]>([]);
  const [selectedService, setSelectedService] = useState<ServiceNode | null>(null);

  useEffect(() => {
    async function loadServices() {
      try {
        const res = await api.getServices();
        setServices(res.items);
        if (res.items.length > 0 && !selectedService) {
          setSelectedService(res.items[0]);
        }
      } catch (err) {
        console.error('Failed to load services', err);
      }
    }
    loadServices();
  }, [refreshTrigger]);

  const nodePositions: Record<string, { x: number; y: number }> = {
    'auth-gateway': { x: 120, y: 160 },
    'payment-api': { x: 380, y: 100 },
    'checkout-svc': { x: 380, y: 240 },
    'postgres-primary': { x: 680, y: 80 },
    'redis-cache': { x: 680, y: 220 },
    'notification-worker': { x: 680, y: 340 },
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
            <Network className="h-5 w-5 text-cyan-400" />
            Service Topology & Dependency Graph
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time topology map showing latency propagation and cross-service dependencies.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5 text-slate-300">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
            Healthy
          </span>
          <span className="flex items-center gap-1.5 text-slate-300">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
            Degraded
          </span>
          <span className="flex items-center gap-1.5 text-slate-300">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500 animate-pulse" />
            Critical Anomaly
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Interactive SVG Dependency Canvas */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-[#0d1322] p-4 relative min-h-[460px] flex items-center justify-center overflow-hidden">
          <svg className="w-full h-[440px]" viewBox="0 0 850 420">
            <defs>
              <linearGradient id="edgeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.6" />
              </linearGradient>
            </defs>

            {/* Connecting Dependency Edges */}
            {services.map((svc) => {
              const srcPos = nodePositions[svc.id];
              if (!srcPos) return null;

              return svc.dependencies.map((depId) => {
                const dstPos = nodePositions[depId];
                if (!dstPos) return null;

                const isDegraded = svc.health !== 'HEALTHY';
                return (
                  <g key={`${svc.id}-${depId}`}>
                    <line
                      x1={srcPos.x + 80}
                      y1={srcPos.y + 25}
                      x2={dstPos.x}
                      y2={dstPos.y + 25}
                      stroke={isDegraded ? '#ef4444' : '#334155'}
                      strokeWidth={isDegraded ? 2.5 : 1.5}
                      strokeDasharray={isDegraded ? '5,5' : 'none'}
                    />
                    {/* Animated packet flow */}
                    <circle r="3" fill={isDegraded ? '#ef4444' : '#06b6d4'}>
                      <animateMotion
                        path={`M ${srcPos.x + 80} ${srcPos.y + 25} L ${dstPos.x} ${dstPos.y + 25}`}
                        dur={isDegraded ? '4s' : '2s'}
                        repeatCount="indefinite"
                      />
                    </circle>
                  </g>
                );
              });
            })}

            {/* Service Nodes */}
            {services.map((svc) => {
              const pos = nodePositions[svc.id] || { x: 200, y: 200 };
              const isSelected = selectedService?.id === svc.id;

              return (
                <g
                  key={svc.id}
                  transform={`translate(${pos.x}, ${pos.y})`}
                  className="cursor-pointer"
                  onClick={() => setSelectedService(svc)}
                >
                  <rect
                    width="140"
                    height="64"
                    rx="10"
                    fill="#111827"
                    stroke={
                      isSelected
                        ? '#06b6d4'
                        : svc.health === 'CRITICAL'
                        ? '#ef4444'
                        : svc.health === 'DEGRADED'
                        ? '#f59e0b'
                        : '#1e293b'
                    }
                    strokeWidth={isSelected ? 2.5 : 1.5}
                    className="transition hover:fill-slate-800"
                  />
                  <circle
                    cx="18"
                    cy="22"
                    r="5"
                    fill={
                      svc.health === 'CRITICAL'
                        ? '#ef4444'
                        : svc.health === 'DEGRADED'
                        ? '#f59e0b'
                        : '#10b981'
                    }
                  />
                  <text x="32" y="26" fill="#f1f5f9" fontSize="11" fontWeight="700" fontFamily="monospace">
                    {svc.name}
                  </text>
                  <text x="18" y="46" fill="#94a3b8" fontSize="9" fontFamily="monospace">
                    p95: {svc.p95Latency}ms • {svc.errorRate}% err
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Selected Service Detail Panel */}
        {selectedService && (
          <div className="rounded-2xl border border-slate-800 bg-[#0d1322] p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-400 font-mono">
                  Service Inspector
                </span>
                <h3 className="text-base font-bold text-slate-100 font-mono">
                  {selectedService.name}
                </h3>
              </div>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase ${
                  selectedService.health === 'HEALTHY'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : selectedService.health === 'DEGRADED'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                }`}
              >
                {selectedService.health}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-2.5">
                <span className="text-slate-400 text-[10px] block">p95 Latency</span>
                <span className="text-sm font-bold text-slate-100">{selectedService.p95Latency}ms</span>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-2.5">
                <span className="text-slate-400 text-[10px] block">Error Rate</span>
                <span className={`text-sm font-bold ${selectedService.errorRate > 2 ? 'text-rose-400' : 'text-slate-100'}`}>
                  {selectedService.errorRate}%
                </span>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-2.5">
                <span className="text-slate-400 text-[10px] block">CPU Usage</span>
                <span className="text-sm font-bold text-slate-100">{selectedService.cpuUsage}%</span>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-2.5">
                <span className="text-slate-400 text-[10px] block">Memory Usage</span>
                <span className={`text-sm font-bold ${selectedService.memUsage > 85 ? 'text-rose-400' : 'text-slate-100'}`}>
                  {selectedService.memUsage}%
                </span>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="text-[11px] font-semibold uppercase text-slate-400">
                Direct Dependencies ({selectedService.dependencies.length})
              </div>
              {selectedService.dependencies.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {selectedService.dependencies.map((d) => (
                    <span
                      key={d}
                      className="rounded border border-slate-800 bg-slate-900 px-2 py-1 font-mono text-[11px] text-cyan-300"
                    >
                      {d}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-slate-500 text-[11px]">Root node (no downstream dependencies)</span>
              )}
            </div>

            <div className="space-y-2 text-xs">
              <div className="text-[11px] font-semibold uppercase text-slate-400">
                Upstream Dependents ({selectedService.dependents.length})
              </div>
              {selectedService.dependents.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {selectedService.dependents.map((d) => (
                    <span
                      key={d}
                      className="rounded border border-slate-800 bg-slate-900 px-2 py-1 font-mono text-[11px] text-purple-300"
                    >
                      {d}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-slate-500 text-[11px]">Edge consumer (no callers)</span>
              )}
            </div>

            <div className="border-t border-slate-800 pt-3 text-[11px] text-slate-400 space-y-1">
              <div>Owner: <strong className="text-slate-200">{selectedService.owner}</strong></div>
              <div>Environment: <strong className="text-slate-200">{selectedService.environment}</strong></div>
              <div>Last Probe: <strong className="text-slate-200">{new Date(selectedService.lastCheck).toLocaleTimeString()}</strong></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
