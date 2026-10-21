import {
  Incident,
  TelemetryLog,
  MetricSample,
  DeploymentEvent,
  RemediationAction,
  ServiceNode,
  AuditLog,
  ScenarioPreset,
  InvestigationReport,
  User,
  DashboardStats,
} from '../types';
import { defaultAnomalyDetector } from './ml-anomaly-detector';
import { defaultInvestigationEngine } from './root-cause-engine';

export class NightwatchDataStore {
  public currentScenario: ScenarioPreset = 'db_exhaustion';
  public users: User[] = [
    {
      id: 'usr-1',
      name: 'Alex Vance (Lead SRE)',
      email: 'alex.vance@nightwatch.internal',
      role: 'Admin',
    },
    {
      id: 'usr-2',
      name: 'Elena Rostova (Incident Responder)',
      email: 'elena.rostova@nightwatch.internal',
      role: 'Engineer',
    },
    {
      id: 'usr-3',
      name: 'Devin Cole (Security Auditor)',
      email: 'devin.cole@nightwatch.internal',
      role: 'Viewer',
    },
  ];

  public incidents: Incident[] = [];
  public logs: TelemetryLog[] = [];
  public metrics: MetricSample[] = [];
  public deployments: DeploymentEvent[] = [];
  public remediations: RemediationAction[] = [];
  public services: ServiceNode[] = [];
  public auditLogs: AuditLog[] = [];
  public investigations: Record<string, InvestigationReport> = {};

  constructor() {
    this.seedScenario('db_exhaustion');
  }

  public seedScenario(scenario: ScenarioPreset) {
    this.currentScenario = scenario;
    const now = Date.now();
    const isoNow = new Date(now).toISOString();

    // 1. Services
    this.services = [
      {
        id: 'payment-api',
        name: 'payment-api',
        type: 'api',
        environment: 'production',
        health: scenario === 'db_exhaustion' || scenario === 'deployment_spike' ? 'CRITICAL' : 'HEALTHY',
        p95Latency: scenario === 'db_exhaustion' ? 4850 : scenario === 'deployment_spike' ? 1420 : 185,
        errorRate: scenario === 'deployment_spike' ? 24.8 : scenario === 'db_exhaustion' ? 12.4 : 0.05,
        cpuUsage: 48,
        memUsage: 54,
        dependencies: ['postgres-primary', 'redis-cache'],
        dependents: ['checkout-svc', 'auth-gateway'],
        owner: 'Core Payments Squad',
        lastCheck: isoNow,
      },
      {
        id: 'checkout-svc',
        name: 'checkout-svc',
        type: 'api',
        environment: 'production',
        health: scenario === 'db_exhaustion' ? 'DEGRADED' : 'HEALTHY',
        p95Latency: scenario === 'db_exhaustion' ? 3200 : 160,
        errorRate: scenario === 'db_exhaustion' ? 6.8 : 0.02,
        cpuUsage: 35,
        memUsage: 46,
        dependencies: ['payment-api', 'redis-cache'],
        dependents: ['auth-gateway'],
        owner: 'Storefront Experience',
        lastCheck: isoNow,
      },
      {
        id: 'notification-worker',
        name: 'notification-worker',
        type: 'worker',
        environment: 'production',
        health: scenario === 'memory_pressure' ? 'CRITICAL' : 'HEALTHY',
        p95Latency: scenario === 'memory_pressure' ? 2900 : 95,
        errorRate: scenario === 'memory_pressure' ? 18.2 : 0.0,
        cpuUsage: scenario === 'memory_pressure' ? 88 : 22,
        memUsage: scenario === 'memory_pressure' ? 96 : 38,
        dependencies: ['redis-cache'],
        dependents: [],
        owner: 'Async Platform',
        lastCheck: isoNow,
      },
      {
        id: 'auth-gateway',
        name: 'auth-gateway',
        type: 'gateway',
        environment: 'production',
        health: 'HEALTHY',
        p95Latency: 45,
        errorRate: 0.01,
        cpuUsage: 28,
        memUsage: 31,
        dependencies: ['redis-cache'],
        dependents: [],
        owner: 'Edge & Security',
        lastCheck: isoNow,
      },
      {
        id: 'postgres-primary',
        name: 'postgres-primary',
        type: 'database',
        environment: 'production',
        health: scenario === 'db_exhaustion' ? 'DEGRADED' : 'HEALTHY',
        p95Latency: scenario === 'db_exhaustion' ? 2400 : 18,
        errorRate: scenario === 'db_exhaustion' ? 9.2 : 0.0,
        cpuUsage: 34,
        memUsage: 65,
        dependencies: [],
        dependents: ['payment-api'],
        owner: 'Data Infrastructure',
        lastCheck: isoNow,
      },
      {
        id: 'redis-cache',
        name: 'redis-cache',
        type: 'cache',
        environment: 'production',
        health: 'HEALTHY',
        p95Latency: 2.1,
        errorRate: 0.0,
        cpuUsage: 19,
        memUsage: 42,
        dependencies: [],
        dependents: ['payment-api', 'checkout-svc', 'notification-worker', 'auth-gateway'],
        owner: 'Data Infrastructure',
        lastCheck: isoNow,
      },
    ];

    // 2. Deployments
    this.deployments = [
      {
        id: 'dep-101',
        timestamp: new Date(now - 38 * 60 * 1000).toISOString(),
        service: 'postgres-primary',
        environment: 'production',
        version: 'cfg-v2.14.8',
        author: 'ci-bot@nightwatch.internal',
        description: 'Applied PgBouncer pooling parameters update (pool_size=30, max_connections=120)',
        rollbackAvailable: true,
        configChanges: ['pool_size reduced to 30', 'idle_transaction_timeout=5000'],
      },
      {
        id: 'dep-102',
        timestamp: new Date(now - 110 * 60 * 1000).toISOString(),
        service: 'payment-api',
        environment: 'production',
        version: 'v4.18.2-rc4',
        author: 'marcus.k@engineering.internal',
        description: 'Refactor Stripe idempotency key headers and card processing pipeline',
        rollbackAvailable: true,
      },
      {
        id: 'dep-103',
        timestamp: new Date(now - 320 * 60 * 1000).toISOString(),
        service: 'auth-gateway',
        environment: 'production',
        version: 'v2.8.0',
        author: 'sec-infra@nightwatch.internal',
        description: 'Rotate JWT signing keys & update rate limit tier buckets',
        rollbackAvailable: false,
      },
    ];

    // 3. Incidents
    this.incidents = [
      {
        id: 'INC-4091',
        title: 'Payment API Latency Spike & DB Connection Pool Exhaustion',
        description:
          'Payment endpoints experiencing severe latency degradation (p95 > 4.8s). Gateway timeouts cascading to checkout-svc. Telemetry indicates connection starvation on postgres-primary.',
        severity: 'CRITICAL',
        status: scenario === 'db_exhaustion' ? 'INVESTIGATING' : 'RESOLVED',
        service: 'payment-api',
        environment: 'production',
        anomalyScore: scenario === 'db_exhaustion' ? 94 : 18,
        createdAt: new Date(now - 35 * 60 * 1000).toISOString(),
        updatedAt: isoNow,
        assignedTo: 'elena.rostova@nightwatch.internal',
        rootCauseStatus: 'IDENTIFIED',
        tags: ['latency', 'database', 'pgbouncer', 'p0-blocker'],
        investigationId: 'inv-4091',
        remediationId: 'rem-4091',
      },
      {
        id: 'INC-3882',
        title: 'Notification Worker Heap Exhaustion & OOM Container Evictions',
        description:
          'Notification worker instances triggering OOM-kill signal every 8 minutes. Queue processing delayed by 18,000 backlogged events.',
        severity: scenario === 'memory_pressure' ? 'CRITICAL' : 'HIGH',
        status: scenario === 'memory_pressure' ? 'INVESTIGATING' : 'RESOLVED',
        service: 'notification-worker',
        environment: 'production',
        anomalyScore: scenario === 'memory_pressure' ? 91 : 24,
        createdAt: new Date(now - 90 * 60 * 1000).toISOString(),
        updatedAt: new Date(now - 20 * 60 * 1000).toISOString(),
        assignedTo: 'alex.vance@nightwatch.internal',
        rootCauseStatus: scenario === 'memory_pressure' ? 'IDENTIFIED' : 'MITIGATED',
        tags: ['memory-leak', 'oom', 'celery-worker'],
        investigationId: 'inv-3882',
        remediationId: 'rem-3882',
      },
      {
        id: 'INC-4105',
        title: 'Spike in 502 Bad Gateway following v4.18.2 Canary Rollout',
        description:
          'Elevated 5xx rate on /v1/charges endpoint immediately following deployment. Unhandled type error on null billing customer payload.',
        severity: scenario === 'deployment_spike' ? 'CRITICAL' : 'MEDIUM',
        status: scenario === 'deployment_spike' ? 'INVESTIGATING' : 'RESOLVED',
        service: 'payment-api',
        environment: 'production',
        anomalyScore: scenario === 'deployment_spike' ? 88 : 15,
        createdAt: new Date(now - 14 * 60 * 1000).toISOString(),
        updatedAt: isoNow,
        assignedTo: 'elena.rostova@nightwatch.internal',
        rootCauseStatus: 'IDENTIFIED',
        tags: ['http-502', 'regression', 'canary'],
      },
      {
        id: 'INC-3720',
        title: 'Redis Cluster Node Failover & Ephemeral Cache Miss Wave',
        description:
          'Primary Redis shard failover triggered transient cache miss cascade. Auto-healed within 90s.',
        severity: 'LOW',
        status: 'RESOLVED',
        service: 'redis-cache',
        environment: 'production',
        anomalyScore: 19,
        createdAt: new Date(now - 24 * 3600 * 1000).toISOString(),
        updatedAt: new Date(now - 23 * 3600 * 1000).toISOString(),
        assignedTo: 'alex.vance@nightwatch.internal',
        rootCauseStatus: 'MITIGATED',
        tags: ['redis', 'failover', 'cache'],
      },
    ];

    // 4. Telemetry Logs
    this.logs = [
      {
        id: 'log-101',
        timestamp: new Date(now - 32 * 60 * 1000).toISOString(),
        service: 'payment-api',
        environment: 'production',
        level: 'ERROR',
        message: 'Database connection timeout: pool exhausted after 5000ms waiting for available client slot',
        traceId: 'tr-9981-a01',
        metadata: { client_ip: '10.244.3.18', latency_ms: 5003, pool_wait_ms: 5000 },
      },
      {
        id: 'log-102',
        timestamp: new Date(now - 31 * 60 * 1000).toISOString(),
        service: 'payment-api',
        environment: 'production',
        level: 'FATAL',
        message: 'PgBouncer [postgres-primary]: server_login_retry: connection limit exceeded (max 120)',
        traceId: 'tr-9981-a02',
        metadata: { max_conn: 120, current_active: 120 },
      },
      {
        id: 'log-103',
        timestamp: new Date(now - 28 * 60 * 1000).toISOString(),
        service: 'checkout-svc',
        environment: 'production',
        level: 'WARN',
        message: 'Upstream call to payment-api /v1/charge timed out after 3000ms. Fallback queue queued.',
        traceId: 'tr-9981-a03',
        metadata: { upstream: 'http://payment-api.internal:8080' },
      },
      {
        id: 'log-104',
        timestamp: new Date(now - 25 * 60 * 1000).toISOString(),
        service: 'notification-worker',
        environment: 'production',
        level: 'WARN',
        message: 'Process memory RSS reached 1,842MB (limit: 2,048MB). Initiating GC pass.',
        traceId: 'tr-mem-04',
        metadata: { heap_used_mb: 1842, heap_total_mb: 2048 },
      },
      {
        id: 'log-105',
        timestamp: new Date(now - 12 * 60 * 1000).toISOString(),
        service: 'payment-api',
        environment: 'production',
        level: 'ERROR',
        message: 'HTTP 500 Internal Server Error: Unhandled promise rejection: TypeError: Cannot read properties of undefined (reading "card_token")',
        traceId: 'tr-err-500',
        metadata: { path: '/v1/charge', status_code: 500 },
      },
      {
        id: 'log-106',
        timestamp: new Date(now - 5 * 60 * 1000).toISOString(),
        service: 'auth-gateway',
        environment: 'production',
        level: 'INFO',
        message: 'Edge ingress healthy. 14,200 req/min passing authentication checks without degradation.',
        traceId: 'tr-gw-ok',
      },
    ];

    // 5. Metrics (timeline for charts)
    this.metrics = [];
    const points = 24;
    for (let i = points; i >= 0; i--) {
      const t = new Date(now - i * 15 * 60 * 1000).toISOString();
      const isIncidentWindow = i <= 3;

      this.metrics.push({
        id: `met-lat-${i}`,
        timestamp: t,
        service: 'payment-api',
        environment: 'production',
        metricName: 'latency_p95',
        value: scenario === 'db_exhaustion' && isIncidentWindow ? 4850 : 210 + Math.round(Math.random() * 40),
        unit: 'ms',
      });

      this.metrics.push({
        id: `met-err-${i}`,
        timestamp: t,
        service: 'payment-api',
        environment: 'production',
        metricName: 'error_rate',
        value: scenario === 'deployment_spike' && isIncidentWindow ? 24.5 : scenario === 'db_exhaustion' && isIncidentWindow ? 12.8 : 0.08,
        unit: '%',
      });

      this.metrics.push({
        id: `met-mem-${i}`,
        timestamp: t,
        service: 'notification-worker',
        environment: 'production',
        metricName: 'memory_usage',
        value: scenario === 'memory_pressure' ? Math.min(98, 45 + (points - i) * 2.2) : 42 + Math.round(Math.random() * 8),
        unit: '%',
      });

      this.metrics.push({
        id: `met-cpu-${i}`,
        timestamp: t,
        service: 'postgres-primary',
        environment: 'production',
        metricName: 'cpu_usage',
        value: 32 + Math.round(Math.random() * 8),
        unit: '%',
      });
    }

    // 6. Remediation Actions
    this.remediations = [
      {
        id: 'rem-4091',
        incidentId: 'INC-4091',
        title: 'Scale PgBouncer Connection Pool to 250 & Recycle Idle Sockets',
        description:
          'Dynamically increase max_client_conn on postgres pooler to resolve client socket starvation and restore p95 latency.',
        actionType: 'scale_connection_pool',
        targetService: 'postgres-primary',
        parameters: { maxPoolSize: 250, idleTimeoutSeconds: 15, poolMode: 'transaction' },
        status: 'PENDING_APPROVAL',
        executionLogs: [
          `[${new Date(now - 30 * 60 * 1000).toISOString()}] [PLAN] Action proposed by Autonomous Investigation Engine.`,
          `[${new Date(now - 29 * 60 * 1000).toISOString()}] [SAFETY] Pre-flight check passed: Postgres host has 68% memory headroom.`,
        ],
      },
      {
        id: 'rem-3882',
        incidentId: 'INC-3882',
        title: 'Recycle Celery Notification Worker Threads & Flush Queue Backlog',
        description:
          'Gracefully restart exhausted workers, evict orphaned heap allocation, and scale replica count from 3 to 6.',
        actionType: 'recycle_worker_threads',
        targetService: 'notification-worker',
        parameters: { replicaCount: 6, maxMemoryPerChildMb: 512 },
        status: 'PROPOSED',
        executionLogs: [
          `[${new Date(now - 80 * 60 * 1000).toISOString()}] [PLAN] Proposed mitigation for high heap watermark.`,
        ],
      },
      {
        id: 'rem-4105',
        incidentId: 'INC-4105',
        title: 'Rollback payment-api Canary Deployment to Previous Stable SHA',
        description:
          'Atomic rollback of pod deployment from v4.18.2-rc4 to v4.18.1 to stop 500 error propagation.',
        actionType: 'rollback_deployment',
        targetService: 'payment-api',
        parameters: { targetRevision: 'v4.18.1', drainGracePeriodSec: 30 },
        status: 'PROPOSED',
        executionLogs: [
          `[${new Date(now - 12 * 60 * 1000).toISOString()}] [PLAN] Rollback recommendation triggered by canary anomaly.`,
        ],
      },
    ];

    // 7. Audit Logs
    this.auditLogs = [
      {
        id: 'aud-1',
        timestamp: new Date(now - 35 * 60 * 1000).toISOString(),
        actor: 'Autonomous ML SRE Agent',
        role: 'Admin',
        action: 'INCIDENT_CREATED',
        resourceType: 'incident',
        resourceId: 'INC-4091',
        details: 'Incident created from Isolation Forest score 94/100 threshold alert.',
        status: 'SUCCESS',
      },
      {
        id: 'aud-2',
        timestamp: new Date(now - 30 * 60 * 1000).toISOString(),
        actor: 'Autonomous Investigation Agent',
        role: 'Admin',
        action: 'INVESTIGATION_GENERATED',
        resourceType: 'investigation',
        resourceId: 'inv-4091',
        details: 'Ranked hypothesis DB connection pool exhaustion with 94% confidence.',
        status: 'SUCCESS',
      },
      {
        id: 'aud-3',
        timestamp: new Date(now - 25 * 60 * 1000).toISOString(),
        actor: 'elena.rostova@nightwatch.internal',
        role: 'Engineer',
        action: 'INCIDENT_STATUS_CHANGE',
        resourceType: 'incident',
        resourceId: 'INC-4091',
        details: 'Status transitioned from OPEN to INVESTIGATING.',
        status: 'SUCCESS',
      },
    ];

    // Generate investigation report for the primary incident
    const primaryInc = this.incidents.find((i) => i.id === 'INC-4091');
    if (primaryInc) {
      this.investigations['inv-4091'] = defaultInvestigationEngine.analyze({
        incident: primaryInc,
        logs: this.logs,
        metrics: this.metrics,
        deployments: this.deployments,
        services: this.services,
      });
    }
  }

  public getDashboardStats(): DashboardStats {
    const openIncidents = this.incidents.filter((i) => i.status === 'OPEN' || i.status === 'INVESTIGATING').length;
    const criticalIncidents = this.incidents.filter((i) => i.severity === 'CRITICAL').length;
    const servicesDegraded = this.services.filter((s) => s.health !== 'HEALTHY').length;
    const anomaliesDetected = this.currentScenario === 'baseline_healthy' ? 0 : 7;

    return {
      totalIncidents: this.incidents.length,
      openIncidents,
      criticalIncidents,
      mttaMinutes: 2.4,
      mttrMinutes: 14.8,
      anomaliesDetected,
      servicesDegraded,
      remediationSuccessRate: 97.4,
      timeWindow: 'Last 24 Hours',
    };
  }
}

export const globalDataStore = new NightwatchDataStore();
