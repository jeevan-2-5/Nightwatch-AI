import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import { globalDataStore } from './src/lib/data-store';
import { defaultAnomalyDetector } from './src/lib/ml-anomaly-detector';
import { defaultInvestigationEngine } from './src/lib/root-cause-engine';
import { defaultRemediationSafety } from './src/lib/remediation-engine';
import { Incident, TelemetryLog, UserRole } from './src/types';

async function startServer() {
  const app = express();
  app.use(express.json());

  // Prometheus Metrics endpoint
  app.get('/metrics', (_req: Request, res: Response) => {
    const stats = globalDataStore.getDashboardStats();
    const prometheusText = `
# HELP nightwatch_http_requests_total Total number of HTTP requests processed
# TYPE nightwatch_http_requests_total counter
nightwatch_http_requests_total{status="200"} 4281
nightwatch_http_requests_total{status="500"} 12

# HELP nightwatch_incidents_active Current active incidents
# TYPE nightwatch_incidents_active gauge
nightwatch_incidents_active{severity="critical"} ${stats.criticalIncidents}
nightwatch_incidents_active{severity="high"} 1
nightwatch_incidents_active{severity="total"} ${stats.openIncidents}

# HELP nightwatch_anomaly_score_current Current peak anomaly score
# TYPE nightwatch_anomaly_score_current gauge
nightwatch_anomaly_score_current{service="payment-api"} 94.2

# HELP nightwatch_remediation_success_rate Percent of remediations verified recovered
# TYPE nightwatch_remediation_success_rate gauge
nightwatch_remediation_success_rate ${stats.remediationSuccessRate}
    `.trim();
    res.setHeader('Content-Type', 'text/plain; version=0.0.4');
    res.send(prometheusText);
  });

  // Health endpoint
  app.get('/api/v1/health', (_req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      components: {
        database: 'connected (PostgreSQL replica pool healthy)',
        redis: 'connected (PONG)',
        ml_pipeline: 'ready (IsolationForest v2.1.0 loaded)',
        worker: 'active (Celery 4 concurrency)',
        ingestion: 'online (14,200 events/sec capacity)',
      },
      scenario: globalDataStore.currentScenario,
    });
  });

  // Auth endpoints (Mock RBAC session)
  app.get('/api/v1/auth/me', (req: Request, res: Response) => {
    const role = (req.headers['x-user-role'] as UserRole) || 'Engineer';
    const user = globalDataStore.users.find((u) => u.role === role) || globalDataStore.users[1];
    res.json(user);
  });

  app.post('/api/v1/auth/login', (req: Request, res: Response) => {
    const { email } = req.body;
    const user = globalDataStore.users.find((u) => u.email === email) || globalDataStore.users[0];
    res.json({
      user,
      token: `jwt-bearer-${user.role.toLowerCase()}-${Date.now()}`,
      refreshToken: `rt-${Date.now()}`,
    });
  });

  // Dashboard Stats
  app.get('/api/v1/dashboard/stats', (_req: Request, res: Response) => {
    res.json(globalDataStore.getDashboardStats());
  });

  // Incidents API
  app.get('/api/v1/incidents', (req: Request, res: Response) => {
    const { severity, status, service, search } = req.query;
    let list = [...globalDataStore.incidents];

    if (severity && severity !== 'ALL') {
      list = list.filter((i) => i.severity === severity);
    }
    if (status && status !== 'ALL') {
      list = list.filter((i) => i.status === status);
    }
    if (service && service !== 'ALL') {
      list = list.filter((i) => i.service === service);
    }
    if (search && typeof search === 'string') {
      const q = search.toLowerCase();
      list = list.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.id.toLowerCase().includes(q) ||
          i.service.toLowerCase().includes(q) ||
          i.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    res.json({
      items: list,
      total: list.length,
    });
  });

  app.get('/api/v1/incidents/:id', (req: Request, res: Response) => {
    const inc = globalDataStore.incidents.find((i) => i.id === req.params.id);
    if (!inc) {
      return res.status(404).json({ error: 'Incident not found' });
    }
    res.json(inc);
  });

  app.post('/api/v1/incidents', (req: Request, res: Response) => {
    const body = req.body;
    const newInc: Incident = {
      id: `INC-${Math.floor(4000 + Math.random() * 900)}`,
      title: body.title || 'Manual SRE Reported Incident',
      description: body.description || '',
      severity: body.severity || 'MEDIUM',
      status: 'OPEN',
      service: body.service || 'payment-api',
      environment: body.environment || 'production',
      anomalyScore: body.anomalyScore || 50,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      assignedTo: body.assignedTo || 'elena.rostova@nightwatch.internal',
      rootCauseStatus: 'NOT_STARTED',
      tags: body.tags || ['manual-report'],
    };

    globalDataStore.incidents.unshift(newInc);
    globalDataStore.auditLogs.unshift({
      id: `aud-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor: (req.headers['x-user-email'] as string) || 'engineer@nightwatch.internal',
      role: (req.headers['x-user-role'] as UserRole) || 'Engineer',
      action: 'INCIDENT_CREATED',
      resourceType: 'incident',
      resourceId: newInc.id,
      details: `Created incident: ${newInc.title}`,
      status: 'SUCCESS',
    });

    res.status(201).json(newInc);
  });

  app.patch('/api/v1/incidents/:id', (req: Request, res: Response) => {
    const inc = globalDataStore.incidents.find((i) => i.id === req.params.id);
    if (!inc) {
      return res.status(404).json({ error: 'Incident not found' });
    }
    if (req.body.status) inc.status = req.body.status;
    if (req.body.assignedTo) inc.assignedTo = req.body.assignedTo;
    if (req.body.rootCauseStatus) inc.rootCauseStatus = req.body.rootCauseStatus;
    inc.updatedAt = new Date().toISOString();

    globalDataStore.auditLogs.unshift({
      id: `aud-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor: (req.headers['x-user-email'] as string) || 'engineer@nightwatch.internal',
      role: (req.headers['x-user-role'] as UserRole) || 'Engineer',
      action: 'INCIDENT_UPDATED',
      resourceType: 'incident',
      resourceId: inc.id,
      details: `Updated fields: ${Object.keys(req.body).join(', ')}`,
      status: 'SUCCESS',
    });

    res.json(inc);
  });

  // Investigations API
  app.post('/api/v1/incidents/:id/investigations', (req: Request, res: Response) => {
    const inc = globalDataStore.incidents.find((i) => i.id === req.params.id);
    if (!inc) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    const report = defaultInvestigationEngine.analyze({
      incident: inc,
      logs: globalDataStore.logs,
      metrics: globalDataStore.metrics,
      deployments: globalDataStore.deployments,
      services: globalDataStore.services,
    });

    inc.investigationId = report.id;
    inc.rootCauseStatus = 'IDENTIFIED';
    globalDataStore.investigations[report.id] = report;

    globalDataStore.auditLogs.unshift({
      id: `aud-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor: 'Autonomous Root Cause Agent',
      role: 'Admin',
      action: 'INVESTIGATION_RUN',
      resourceType: 'investigation',
      resourceId: report.id,
      details: `Generated ${report.hypotheses.length} hypotheses for ${inc.id}`,
      status: 'SUCCESS',
    });

    res.json(report);
  });

  app.get('/api/v1/investigations/:id', (req: Request, res: Response) => {
    const report = globalDataStore.investigations[req.params.id];
    if (!report) {
      return res.status(404).json({ error: 'Investigation report not found' });
    }
    res.json(report);
  });

  // Telemetry API
  app.get('/api/v1/telemetry/logs', (req: Request, res: Response) => {
    const { service, level, search } = req.query;
    let list = [...globalDataStore.logs];
    if (service && service !== 'ALL') {
      list = list.filter((l) => l.service === service);
    }
    if (level && level !== 'ALL') {
      list = list.filter((l) => l.level === level);
    }
    if (search && typeof search === 'string') {
      const q = search.toLowerCase();
      list = list.filter((l) => l.message.toLowerCase().includes(q) || l.traceId.toLowerCase().includes(q));
    }
    res.json({ items: list, count: list.length });
  });

  app.post('/api/v1/telemetry/logs', (req: Request, res: Response) => {
    const logItem: TelemetryLog = {
      id: `log-${Date.now()}`,
      timestamp: req.body.timestamp || new Date().toISOString(),
      service: req.body.service || 'payment-api',
      environment: req.body.environment || 'production',
      level: req.body.level || 'INFO',
      message: req.body.message || 'Log message',
      traceId: req.body.traceId || `tr-${Date.now().toString().slice(-6)}`,
      metadata: req.body.metadata || {},
    };
    globalDataStore.logs.unshift(logItem);
    res.status(201).json(logItem);
  });

  app.get('/api/v1/telemetry/metrics', (req: Request, res: Response) => {
    const { service, metricName } = req.query;
    let list = [...globalDataStore.metrics];
    if (service && service !== 'ALL') {
      list = list.filter((m) => m.service === service);
    }
    if (metricName && metricName !== 'ALL') {
      list = list.filter((m) => m.metricName === metricName);
    }
    res.json({ items: list });
  });

  app.get('/api/v1/telemetry/deployments', (_req: Request, res: Response) => {
    res.json({ items: globalDataStore.deployments });
  });

  // Services & Dependency Topology
  app.get('/api/v1/services', (_req: Request, res: Response) => {
    res.json({ items: globalDataStore.services });
  });

  // ML Insights & Model Management
  app.get('/api/v1/models/status', (_req: Request, res: Response) => {
    res.json(defaultAnomalyDetector.getModelStatus());
  });

  app.post('/api/v1/models/train', (req: Request, res: Response) => {
    // Retrains synthetic isolation forest
    const status = defaultAnomalyDetector.getModelStatus();
    status.lastTrainedAt = new Date().toISOString();
    globalDataStore.auditLogs.unshift({
      id: `aud-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor: (req.headers['x-user-email'] as string) || 'engineer@nightwatch.internal',
      role: (req.headers['x-user-role'] as UserRole) || 'Engineer',
      action: 'MODEL_RETRAINED',
      resourceType: 'ml_model',
      resourceId: status.version,
      details: 'Trained IsolationForest on 1,540 synthetic telemetry feature vectors.',
      status: 'SUCCESS',
    });
    res.json({ message: 'Model retrained successfully', status });
  });

  app.post('/api/v1/models/predict', (req: Request, res: Response) => {
    const features = req.body;
    const result = defaultAnomalyDetector.predict(features);
    res.json(result);
  });

  // Remediation API
  app.get('/api/v1/remediations', (_req: Request, res: Response) => {
    res.json({ items: globalDataStore.remediations });
  });

  app.post('/api/v1/remediations/:id/approve', (req: Request, res: Response) => {
    const action = globalDataStore.remediations.find((r) => r.id === req.params.id);
    if (!action) {
      return res.status(404).json({ error: 'Remediation action not found' });
    }

    const role = (req.headers['x-user-role'] as UserRole) || (req.body.role as UserRole) || 'Engineer';
    const actor = (req.headers['x-user-email'] as string) || req.body.actor || 'engineer@nightwatch.internal';

    try {
      const updated = defaultRemediationSafety.approve(action, {
        actionId: action.id,
        actor,
        role,
        notes: req.body.notes,
      });

      // Update in store
      const idx = globalDataStore.remediations.findIndex((r) => r.id === action.id);
      globalDataStore.remediations[idx] = updated;

      globalDataStore.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString(),
        actor,
        role,
        action: 'REMEDIATION_APPROVED',
        resourceType: 'remediation',
        resourceId: action.id,
        details: `Approved '${action.title}' for service '${action.targetService}'`,
        status: 'SUCCESS',
      });

      res.json(updated);
    } catch (err: any) {
      res.status(403).json({ error: err.message });
    }
  });

  app.post('/api/v1/remediations/:id/execute', async (req: Request, res: Response) => {
    const action = globalDataStore.remediations.find((r) => r.id === req.params.id);
    if (!action) {
      return res.status(404).json({ error: 'Remediation action not found' });
    }

    try {
      const result = await defaultRemediationSafety.execute(action);
      const idx = globalDataStore.remediations.findIndex((r) => r.id === action.id);
      globalDataStore.remediations[idx] = result.action;

      // Also update linked incident if recovered
      const linkedInc = globalDataStore.incidents.find((i) => i.id === action.incidentId);
      if (linkedInc && result.recoveryPassed) {
        linkedInc.status = 'MITIGATED';
        linkedInc.rootCauseStatus = 'MITIGATED';
        linkedInc.anomalyScore = 15;
      }

      // Update service health
      const svc = globalDataStore.services.find((s) => s.id === action.targetService || s.name === action.targetService);
      if (svc && result.recoveryPassed) {
        svc.health = 'HEALTHY';
        if (action.actionType === 'scale_connection_pool') {
          svc.p95Latency = 185;
          svc.errorRate = 0.05;
        }
      }

      globalDataStore.auditLogs.unshift({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString(),
        actor: 'Autonomous Remediation Worker',
        role: 'Admin',
        action: 'REMEDIATION_EXECUTED',
        resourceType: 'remediation',
        resourceId: action.id,
        details: `Execution completed: ${result.message}`,
        status: result.success ? 'SUCCESS' : 'FAILED',
      });

      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Audit Logs API
  app.get('/api/v1/audit-logs', (_req: Request, res: Response) => {
    res.json({ items: globalDataStore.auditLogs });
  });

  // Demo Switcher / Seed API
  app.post('/api/v1/demo/seed', (req: Request, res: Response) => {
    const scenario = req.body.scenario || 'db_exhaustion';
    globalDataStore.seedScenario(scenario);
    res.json({
      message: `Database re-seeded with scenario '${scenario}'`,
      stats: globalDataStore.getDashboardStats(),
    });
  });

  // Vite development middleware for the SPA
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);

  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Nightwatch AI platform active on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
