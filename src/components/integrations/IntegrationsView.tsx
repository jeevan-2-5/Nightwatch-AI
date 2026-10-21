import React, { useState } from 'react';
import {
  Boxes,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Shield,
  Zap,
  Key,
} from 'lucide-react';

interface IntegrationItem {
  id: string;
  name: string;
  category: 'Telemetry Ingestion' | 'Alerting & On-Call' | 'Observability';
  status: 'CONNECTED' | 'SIMULATED' | 'CONFIGURED';
  description: string;
  endpoint?: string;
}

export const IntegrationsView: React.FC = () => {
  const [integrations] = useState<IntegrationItem[]>([
    {
      id: 'otlp',
      name: 'OpenTelemetry (OTLP Collector)',
      category: 'Telemetry Ingestion',
      status: 'CONNECTED',
      description: 'Ingests distributed traces, structured logs, and service metrics via standard OTLP/HTTP.',
      endpoint: '/api/v1/telemetry/otlp',
    },
    {
      id: 'prometheus',
      name: 'Prometheus Scrape Target',
      category: 'Observability',
      status: 'CONNECTED',
      description: 'Exposes Nightwatch internal telemetry and incident counts on port 3000 /metrics.',
      endpoint: 'http://localhost:3000/metrics',
    },
    {
      id: 'grafana',
      name: 'Grafana SRE Dashboards',
      category: 'Observability',
      status: 'CONFIGURED',
      description: 'Pre-provisioned dashboards for anomaly scores, MTTR trends, and queue latencies.',
      endpoint: 'http://localhost:3001',
    },
    {
      id: 'pagerduty',
      name: 'PagerDuty Incident Sync',
      category: 'Alerting & On-Call',
      status: 'SIMULATED',
      description: 'Bi-directional incident synchronization and automated responder escalation.',
    },
    {
      id: 'datadog',
      name: 'Datadog APM Agent',
      category: 'Telemetry Ingestion',
      status: 'SIMULATED',
      description: 'Synthesizes Datadog synthetic monitor triggers and live host memory telemetry.',
    },
    {
      id: 'slack',
      name: 'Slack Incident Channel Bot',
      category: 'Alerting & On-Call',
      status: 'CONFIGURED',
      description: 'Broadcasts investigation reports and remediation approval prompts into #incident-war-room.',
    },
  ]);

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
            <Boxes className="h-5 w-5 text-cyan-400" />
            Integrations & Observability Connectors
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure telemetry inputs, scrape targets, and external incident notification channels.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {integrations.map((item) => (
          <div
            key={item.id}
            className="rounded-2xl border border-slate-800 bg-[#0d1322] p-5 shadow-sm flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">
                  {item.category}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[9px] font-mono font-bold uppercase ${
                    item.status === 'CONNECTED'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : item.status === 'CONFIGURED'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  }`}
                >
                  {item.status}
                </span>
              </div>

              <h3 className="text-sm font-bold text-slate-100">{item.name}</h3>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{item.description}</p>
            </div>

            <div className="mt-4 border-t border-slate-800/80 pt-3">
              {item.endpoint ? (
                <div className="font-mono text-[10px] text-cyan-400 truncate">
                  Endpoint: {item.endpoint}
                </div>
              ) : (
                <div className="font-mono text-[10px] text-slate-500">
                  Mode: Local Simulation Adapter
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
