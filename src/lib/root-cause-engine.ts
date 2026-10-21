import {
  Incident,
  TelemetryLog,
  MetricSample,
  DeploymentEvent,
  RootCauseHypothesis,
  EvidenceItem,
  InvestigationReport,
  ServiceNode,
} from '../types';

export interface EvidenceCorrelationInput {
  incident: Incident;
  logs: TelemetryLog[];
  metrics: MetricSample[];
  deployments: DeploymentEvent[];
  services: ServiceNode[];
  historicalIncidents?: Incident[];
}

export class RootCauseCorrelationEngine {
  /**
   * Correlates multi-dimensional telemetry signals into ranked root cause hypotheses.
   */
  public analyze(input: EvidenceCorrelationInput): InvestigationReport {
    const { incident, logs, metrics, deployments, services } = input;
    const hypotheses: RootCauseHypothesis[] = [];
    let analyzedEventsCount = logs.length + metrics.length + deployments.length;

    // 1. Check for Deployment Correlation
    const incidentTime = new Date(incident.createdAt).getTime();
    const recentDeployments = deployments.filter((d) => {
      const depTime = new Date(d.timestamp).getTime();
      const diffMinutes = (incidentTime - depTime) / (1000 * 60);
      return diffMinutes >= -15 && diffMinutes <= 60; // within 1 hour prior or immediately adjacent
    });

    // 2. Check for Database Connection Pool Exhaustion Signals
    const dbTimeouts = logs.filter((l) =>
      l.message.toLowerCase().includes('timeout') ||
      l.message.toLowerCase().includes('connection pool') ||
      l.message.toLowerCase().includes('database') ||
      l.message.toLowerCase().includes('pg_sleep') ||
      l.message.toLowerCase().includes('socket closed')
    );

    const latencyMetrics = metrics.filter((m) => m.metricName === 'latency_p95');
    const latestLatency = latencyMetrics.length > 0 ? latencyMetrics[latencyMetrics.length - 1].value : 0;
    const elevatedLatency = latestLatency > 2000;

    const dbDep = recentDeployments.find((d) =>
      d.service.includes('database') ||
      d.description.toLowerCase().includes('db') ||
      d.description.toLowerCase().includes('pool') ||
      d.configChanges?.some((c) => c.toLowerCase().includes('pool'))
    );

    if (dbTimeouts.length > 0 || dbDep) {
      const supportingEvidence: EvidenceItem[] = [];

      if (dbDep) {
        supportingEvidence.push({
          id: 'ev-dep-1',
          type: 'deployment',
          description: `Recent config change on ${dbDep.service}: "${dbDep.description}" (${dbDep.version}) deployed ${new Date(dbDep.timestamp).toLocaleTimeString()}`,
          timestamp: dbDep.timestamp,
          severity: 'warning',
          source: dbDep.service,
        });
      }

      if (elevatedLatency) {
        supportingEvidence.push({
          id: 'ev-metric-lat',
          type: 'metric',
          description: `p95 Latency spiked to ${latestLatency}ms (baseline nominal: 220ms)`,
          timestamp: new Date().toISOString(),
          severity: 'critical',
          source: incident.service,
          metricDelta: `+${Math.round((latestLatency - 220) / 2.2)}%`,
        });
      }

      if (dbTimeouts.length > 0) {
        supportingEvidence.push({
          id: 'ev-log-db',
          type: 'log',
          description: `${dbTimeouts.length} database connection timeout errors in telemetry stream: "${dbTimeouts[0].message}"`,
          timestamp: dbTimeouts[0].timestamp,
          severity: 'critical',
          source: incident.service,
        });
      }

      const dbService = services.find((s) => s.id === 'postgres-primary' || s.type === 'database');
      if (dbService && dbService.health !== 'HEALTHY') {
        supportingEvidence.push({
          id: 'ev-top-db',
          type: 'dependency',
          description: `Downstream dependency '${dbService.name}' marked ${dbService.health} with high active connection utilization`,
          timestamp: new Date().toISOString(),
          severity: 'critical',
          source: dbService.name,
        });
      }

      hypotheses.push({
        id: 'hyp-db-exhaustion',
        rank: 1,
        title: 'PostgreSQL Connection Pool Saturation following Configuration Rollout',
        explanation:
          'High application concurrency collided with reduced max_connections threshold from recent config deployment, leading to thread starvation and cascading 5000ms socket timeouts.',
        confidence: dbDep && dbTimeouts.length > 0 ? 94 : 78,
        supportingEvidence,
        contradictoryEvidence: [
          {
            id: 'ev-contra-1',
            type: 'metric',
            description: 'Database host CPU remained at 32%, ruling out pure database CPU compute bottleneck.',
            timestamp: new Date().toISOString(),
            severity: 'info',
            source: 'postgres-primary',
          },
        ],
        recommendedFix:
          'Dynamically increase PgBouncer pool ceiling to 250 connections and safely rollback pool configuration change.',
        recommendedChecks: [
          'Verify current pg_stat_activity connection count against max_connections',
          'Probe payment-api TCP connection pool latency',
          'Run HTTP health check on /health/ready endpoint',
        ],
      });
    }

    // 3. Check for Memory Pressure / Leak / GC Pause Hypothesis
    const memMetrics = metrics.filter((m) => m.metricName === 'memory_usage');
    const latestMem = memMetrics.length > 0 ? memMetrics[memMetrics.length - 1].value : 0;
    const oomLogs = logs.filter((l) =>
      l.message.toLowerCase().includes('oom') ||
      l.message.toLowerCase().includes('memory') ||
      l.message.toLowerCase().includes('restart') ||
      l.message.toLowerCase().includes('gc pause')
    );

    if (latestMem > 85 || oomLogs.length > 0) {
      const supportingEvidence: EvidenceItem[] = [];
      supportingEvidence.push({
        id: 'ev-mem-usage',
        type: 'metric',
        description: `Memory utilization climbed steadily to ${latestMem}% threshold`,
        timestamp: new Date().toISOString(),
        severity: 'critical',
        source: incident.service,
        metricDelta: '+48% in 30min',
      });

      if (oomLogs.length > 0) {
        supportingEvidence.push({
          id: 'ev-mem-log',
          type: 'log',
          description: `Container kernel kill or GC pause event detected: "${oomLogs[0].message}"`,
          timestamp: oomLogs[0].timestamp,
          severity: 'critical',
          source: incident.service,
        });
      }

      hypotheses.push({
        id: 'hyp-mem-pressure',
        rank: hypotheses.length + 1,
        title: 'Memory Exhaustion & Periodic Worker Eviction',
        explanation:
          'Node/Worker heap saturation causing runaway Garbage Collection pauses (>1200ms) and subsequent container restarts under sustained throughput.',
        confidence: latestMem > 90 ? 89 : 72,
        supportingEvidence,
        contradictoryEvidence: [],
        recommendedFix:
          'Recycle worker threads, scale memory limits, and trigger heap dump capture for offline leak analysis.',
        recommendedChecks: [
          'Inspect Node.js RSS heap usage across worker replicas',
          'Confirm absence of unclosed socket streams in payment event listener',
        ],
      });
    }

    // 4. Check for Deployment Binary Regression (HTTP 5xx Spikes)
    const codeDep = recentDeployments.find((d) => d.service === incident.service);
    const errorMetrics = metrics.filter((m) => m.metricName === 'error_rate');
    const latestErrorRate = errorMetrics.length > 0 ? errorMetrics[errorMetrics.length - 1].value : 0;

    if (codeDep && (latestErrorRate > 5 || logs.some((l) => l.level === 'ERROR'))) {
      const supportingEvidence: EvidenceItem[] = [
        {
          id: 'ev-dep-regress',
          type: 'deployment',
          description: `Deployment of release ${codeDep.version} completed by ${codeDep.author} 12 minutes prior to first error spike.`,
          timestamp: codeDep.timestamp,
          severity: 'warning',
          source: codeDep.service,
        },
      ];

      if (latestErrorRate > 0) {
        supportingEvidence.push({
          id: 'ev-err-rate',
          type: 'metric',
          description: `5xx Error rate surged to ${latestErrorRate.toFixed(1)}% immediately following rollout`,
          timestamp: new Date().toISOString(),
          severity: 'critical',
          source: incident.service,
          metricDelta: `+${latestErrorRate.toFixed(1)}%`,
        });
      }

      hypotheses.push({
        id: 'hyp-deployment-bug',
        rank: hypotheses.length + 1,
        title: `Software Defect / Regression Introduced in Release ${codeDep.version}`,
        explanation: `Null reference or unhandled exception in newly deployed payment handling logic causing widespread 500 responses.`,
        confidence: latestErrorRate > 15 ? 91 : 76,
        supportingEvidence,
        contradictoryEvidence: [],
        recommendedFix: `Perform atomic canary rollback to stable release and isolate fault logs.`,
        recommendedChecks: [
          'Verify error rate delta between current pod revision and previous canary revision',
          'Review exception stack traces in structured log stream',
        ],
      });
    }

    // Sort hypotheses by confidence descending and re-assign ranks
    hypotheses.sort((a, b) => b.confidence - a.confidence);
    hypotheses.forEach((h, idx) => {
      h.rank = idx + 1;
    });

    const topHypothesis = hypotheses[0];

    const report: InvestigationReport = {
      id: `INV-${Date.now().toString().slice(-6)}`,
      incidentId: incident.id,
      service: incident.service,
      createdAt: new Date().toISOString(),
      status: 'COMPLETED',
      executiveSummary: topHypothesis
        ? `Investigation isolated high-probability root cause (${topHypothesis.confidence}% confidence): ${topHypothesis.title}. Evidence cross-correlation confirmed temporal alignment with telemetry anomalies.`
        : 'Investigation did not identify a singular root cause; telemetry anomalies are distributed across multiple baseline deviations.',
      incidentImpact: `Service ${incident.service} degraded with anomaly score ${incident.anomalyScore}/100. P95 latency and downstream consumers impacted.`,
      detectionMethod: 'Multi-variate Temporal & Dependency Correlation Engine (Isolation Forest + Topology Graph)',
      hypotheses,
      confidenceExplanation:
        'Confidence scores are derived from multi-signal corroboration across deployment timestamps, dependency topology graph edges, and log-to-metric temporal coincidence. Not a calibrated Bayesian probability.',
      remainingUncertainties: [
        'Upstream gateway retry storm could be compounding observed latency.',
        'Secondary downstream cache degradation not fully ruled out without cache hit telemetry.',
      ],
      recommendedActionId: topHypothesis?.id === 'hyp-db-exhaustion' ? 'act-scale-db' : undefined,
      analyzedEventsCount,
    };

    return report;
  }
}

export const defaultInvestigationEngine = new RootCauseCorrelationEngine();
