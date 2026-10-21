import test from 'node:test';
import assert from 'node:assert/strict';
import { RootCauseCorrelationEngine } from './root-cause-engine';
import { Incident, TelemetryLog, MetricSample, DeploymentEvent, ServiceNode } from '../types';

test('RootCauseCorrelationEngine synthesizes multi-signal evidence to rank DB exhaustion #1', () => {
  const engine = new RootCauseCorrelationEngine();

  const incident: Incident = {
    id: 'INC-4091',
    title: 'Payment API Latency Spike & Gateway Timeouts',
    description: 'Elevated latency and connection timeouts',
    severity: 'CRITICAL',
    status: 'INVESTIGATING',
    service: 'payment-api',
    environment: 'production',
    anomalyScore: 89,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    rootCauseStatus: 'ANALYZING',
    tags: ['latency', 'database', 'payment'],
  };

  const logs: TelemetryLog[] = [
    {
      id: 'log-1',
      timestamp: new Date().toISOString(),
      service: 'payment-api',
      environment: 'production',
      level: 'ERROR',
      message: 'Database connection timeout: pool exhausted after 5000ms',
      traceId: 'trace-101',
    },
  ];

  const metrics: MetricSample[] = [
    {
      id: 'met-1',
      timestamp: new Date().toISOString(),
      service: 'payment-api',
      environment: 'production',
      metricName: 'latency_p95',
      value: 4800,
      unit: 'ms',
    },
  ];

  const deployments: DeploymentEvent[] = [
    {
      id: 'dep-1',
      timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      service: 'postgres-primary',
      environment: 'production',
      version: 'cfg-v2.14',
      author: 'devops-bot',
      description: 'Tune connection pooling parameters for maintenance',
      rollbackAvailable: true,
      configChanges: ['pool_size=40'],
    },
  ];

  const services: ServiceNode[] = [
    {
      id: 'payment-api',
      name: 'payment-api',
      type: 'api',
      environment: 'production',
      health: 'CRITICAL',
      p95Latency: 4800,
      errorRate: 14.2,
      cpuUsage: 45,
      memUsage: 55,
      dependencies: ['postgres-primary'],
      dependents: ['checkout-svc'],
      owner: 'Payments Team',
      lastCheck: new Date().toISOString(),
    },
    {
      id: 'postgres-primary',
      name: 'postgres-primary',
      type: 'database',
      environment: 'production',
      health: 'DEGRADED',
      p95Latency: 1200,
      errorRate: 8.5,
      cpuUsage: 32,
      memUsage: 68,
      dependencies: [],
      dependents: ['payment-api'],
      owner: 'Database Infra',
      lastCheck: new Date().toISOString(),
    },
  ];

  const report = engine.analyze({
    incident,
    logs,
    metrics,
    deployments,
    services,
  });

  assert.equal(report.status, 'COMPLETED');
  assert.ok(report.hypotheses.length > 0);
  assert.equal(report.hypotheses[0].rank, 1);
  assert.equal(report.hypotheses[0].id, 'hyp-db-exhaustion');
  assert.ok(report.hypotheses[0].confidence > 80);
  assert.ok(report.hypotheses[0].supportingEvidence.length >= 2);
  assert.ok(report.hypotheses[0].recommendedChecks.length > 0);
});
