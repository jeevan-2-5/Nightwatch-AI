export type IncidentSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type IncidentStatus = 'OPEN' | 'INVESTIGATING' | 'MITIGATED' | 'RESOLVED';
export type UserRole = 'Admin' | 'Engineer' | 'Viewer';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
}

export interface Incident {
  id: string;
  title: string;
  description: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  service: string;
  environment: string;
  anomalyScore: number; // 0 - 100
  createdAt: string;
  updatedAt: string;
  assignedTo?: string;
  rootCauseStatus: 'NOT_STARTED' | 'ANALYZING' | 'IDENTIFIED' | 'MITIGATED';
  tags: string[];
  investigationId?: string;
  remediationId?: string;
}

export interface TelemetryLog {
  id: string;
  timestamp: string;
  service: string;
  environment: string;
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';
  message: string;
  traceId: string;
  metadata?: Record<string, any>;
}

export interface MetricSample {
  id: string;
  timestamp: string;
  service: string;
  environment: string;
  metricName: 'latency_p95' | 'error_rate' | 'cpu_usage' | 'memory_usage' | 'db_connections' | 'request_rate';
  value: number;
  unit: string;
}

export interface DeploymentEvent {
  id: string;
  timestamp: string;
  service: string;
  environment: string;
  version: string;
  author: string;
  description: string;
  rollbackAvailable: boolean;
  configChanges?: string[];
}

export interface EvidenceItem {
  id: string;
  type: 'metric' | 'log' | 'deployment' | 'dependency';
  description: string;
  timestamp: string;
  severity: 'critical' | 'warning' | 'info';
  source: string;
  metricDelta?: string;
}

export interface RootCauseHypothesis {
  id: string;
  rank: number;
  title: string;
  explanation: string;
  confidence: number; // 0 - 100
  supportingEvidence: EvidenceItem[];
  contradictoryEvidence: EvidenceItem[];
  recommendedFix: string;
  recommendedChecks: string[];
}

export interface InvestigationReport {
  id: string;
  incidentId: string;
  service: string;
  createdAt: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  executiveSummary: string;
  incidentImpact: string;
  detectionMethod: string;
  hypotheses: RootCauseHypothesis[];
  confidenceExplanation: string;
  remainingUncertainties: string[];
  recommendedActionId?: string;
  analyzedEventsCount: number;
}

export type RemediationLifecycle =
  | 'PROPOSED'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'EXECUTING'
  | 'VERIFYING'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'REJECTED'
  | 'CANCELLED';

export interface RemediationAction {
  id: string;
  incidentId: string;
  title: string;
  description: string;
  actionType:
    | 'scale_connection_pool'
    | 'rollback_deployment'
    | 'recycle_worker_threads'
    | 'flush_query_cache'
    | 'http_health_check'
    | 'trigger_canary_drain';
  targetService: string;
  parameters: Record<string, any>;
  status: RemediationLifecycle;
  approver?: string;
  approvedAt?: string;
  executedAt?: string;
  completedAt?: string;
  executionLogs: string[];
  recoveryStatus?: 'RECOVERED' | 'DEGRADED' | 'FAILED' | 'INCONCLUSIVE';
  recoveryMetrics?: {
    preValue: number;
    postValue: number;
    threshold: number;
    metric: string;
    unit: string;
  };
}

export interface ServiceNode {
  id: string;
  name: string;
  type: 'api' | 'worker' | 'database' | 'cache' | 'gateway';
  environment: string;
  health: 'HEALTHY' | 'DEGRADED' | 'CRITICAL' | 'UNKNOWN';
  p95Latency: number; // ms
  errorRate: number; // %
  cpuUsage: number; // %
  memUsage: number; // %
  dependencies: string[];
  dependents: string[];
  owner: string;
  lastCheck: string;
}

export interface MLModelStatus {
  modelName: string;
  version: string;
  algorithm: string;
  status: 'READY' | 'TRAINING' | 'DEGRADED' | 'NOT_READY';
  lastTrainedAt: string;
  anomalyThreshold: number;
  features: string[];
  evaluatedF1: number;
  evaluatedPrecision: number;
  evaluatedRecall: number;
  totalEvaluatedSamples: number;
  distribution: { bin: string; count: number }[];
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actor: string;
  role: UserRole;
  action: string;
  resourceType: string;
  resourceId: string;
  details: string;
  status: 'SUCCESS' | 'DENIED' | 'FAILED';
  ipAddress?: string;
}

export interface DashboardStats {
  totalIncidents: number;
  openIncidents: number;
  criticalIncidents: number;
  mttaMinutes: number;
  mttrMinutes: number;
  anomaliesDetected: number;
  servicesDegraded: number;
  remediationSuccessRate: number;
  timeWindow: string;
}

export type ScenarioPreset = 'db_exhaustion' | 'memory_pressure' | 'deployment_spike' | 'baseline_healthy';
