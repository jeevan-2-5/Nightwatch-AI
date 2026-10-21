import test from 'node:test';
import assert from 'node:assert/strict';
import { IsolationForestEngine, averagePathLength } from './ml-anomaly-detector';

test('averagePathLength formula calculates correct known mathematical values', () => {
  assert.equal(averagePathLength(1), 0);
  assert.equal(averagePathLength(2), 1);
  const n64 = averagePathLength(64);
  assert.ok(n64 > 5 && n64 < 10, `Expected c(64) ~7.35, got ${n64}`);
});

test('IsolationForestEngine identifies normal operational telemetry as non-anomaly', () => {
  const engine = new IsolationForestEngine(20);
  const normalSample = {
    errorCount: 1,
    errorRate: 0.2,
    requestCount: 450,
    avgLatencyMs: 110,
    p95LatencyMs: 210,
    timeoutCount: 0,
    cpuUtilization: 35,
    memoryUtilization: 42,
    restartCount: 0,
    recentDeploymentFlag: 0 as const,
    dbConnectionFailures: 0,
  };

  const result = engine.predict(normalSample);
  assert.equal(result.isAnomaly, false);
  assert.ok(result.anomalyScore < 55, `Expected score < 55, got ${result.anomalyScore}`);
});

test('IsolationForestEngine triggers CRITICAL anomaly on DB connection pool exhaustion', () => {
  const engine = new IsolationForestEngine(20);
  const dbFailureSample = {
    errorCount: 48,
    errorRate: 18.5,
    requestCount: 620,
    avgLatencyMs: 2400,
    p95LatencyMs: 4800,
    timeoutCount: 22,
    cpuUtilization: 38,
    memoryUtilization: 52,
    restartCount: 0,
    recentDeploymentFlag: 1 as const,
    dbConnectionFailures: 14,
  };

  const result = engine.predict(dbFailureSample);
  assert.equal(result.isAnomaly, true);
  assert.equal(result.severity, 'CRITICAL');
  assert.ok(result.anomalyScore >= 80, `Expected critical score >= 80, got ${result.anomalyScore}`);
  assert.ok(result.contributingFeatures.length > 0);
  assert.ok(result.reasons.some((r) => r.toLowerCase().includes('connection') || r.toLowerCase().includes('latency')));
});

test('IsolationForestEngine reports valid model status with feature schema and evaluation stats', () => {
  const engine = new IsolationForestEngine(10);
  const status = engine.getModelStatus();
  assert.equal(status.status, 'READY');
  assert.ok(status.features.includes('p95LatencyMs'));
  assert.ok(status.evaluatedF1 > 0.8);
  assert.ok(status.totalEvaluatedSamples > 1000);
});
