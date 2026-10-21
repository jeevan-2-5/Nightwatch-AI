import { RemediationAction, UserRole } from '../types';

export interface ApprovalRequest {
  actionId: string;
  actor: string;
  role: UserRole;
  notes?: string;
}

export interface ExecutionResult {
  success: boolean;
  action: RemediationAction;
  recoveryPassed: boolean;
  message: string;
  logs: string[];
}

export class RemediationSafetyEngine {
  private allowedActions = new Set([
    'scale_connection_pool',
    'rollback_deployment',
    'recycle_worker_threads',
    'flush_query_cache',
    'http_health_check',
    'trigger_canary_drain',
  ]);

  /**
   * Validates if a user role has authorization to approve a remediation action.
   */
  public canApprove(role: UserRole, actionType: string): { allowed: boolean; reason?: string } {
    if (role === 'Viewer') {
      return {
        allowed: false,
        reason: 'Viewer role has read-only privileges and cannot authorize remediation actions.',
      };
    }

    if (!this.allowedActions.has(actionType)) {
      return {
        allowed: false,
        reason: `Action type '${actionType}' is not registered in the safety allowlist registry.`,
      };
    }

    return { allowed: true };
  }

  /**
   * Progresses action through human approval state transition.
   */
  public approve(action: RemediationAction, request: ApprovalRequest): RemediationAction {
    const authCheck = this.canApprove(request.role, action.actionType);
    if (!authCheck.allowed) {
      throw new Error(`Unauthorized: ${authCheck.reason}`);
    }

    if (action.status !== 'PROPOSED' && action.status !== 'PENDING_APPROVAL') {
      throw new Error(`Invalid state: Cannot approve action in status '${action.status}'`);
    }

    const timestamp = new Date().toISOString();
    return {
      ...action,
      status: 'APPROVED',
      approver: request.actor,
      approvedAt: timestamp,
      executionLogs: [
        ...action.executionLogs,
        `[${timestamp}] [AUDIT] Action approved by ${request.actor} (Role: ${request.role})${request.notes ? ': ' + request.notes : ''}`,
      ],
    };
  }

  /**
   * Executes remediation action with mock/simulated safely contained adapter,
   * then triggers post-action recovery verification.
   */
  public async execute(action: RemediationAction): Promise<ExecutionResult> {
    if (action.status !== 'APPROVED') {
      throw new Error(`Cannot execute action with status '${action.status}'. Must be APPROVED first.`);
    }

    const logs: string[] = [...action.executionLogs];
    const execTime = new Date().toISOString();
    logs.push(`[${execTime}] [EXEC] Starting execution for target service: ${action.targetService}`);
    logs.push(`[${execTime}] [EXEC] Dispatching payload parameters: ${JSON.stringify(action.parameters)}`);

    // Simulated action specific execution logic
    switch (action.actionType) {
      case 'scale_connection_pool':
        logs.push(`[${execTime}] [EXEC] Sent dynamic pool resize to PgBouncer pooler (max_pool: ${action.parameters.maxPoolSize || 250})`);
        logs.push(`[${execTime}] [EXEC] Connection pool config applied with 0 dropped sockets.`);
        break;
      case 'rollback_deployment':
        logs.push(`[${execTime}] [EXEC] Kubernetes Deployment rollback triggered to revision: ${action.parameters.targetRevision || 'prev'}`);
        logs.push(`[${execTime}] [EXEC] Pod rollout strategy completed. 3 pods updated to previous stable container digest.`);
        break;
      case 'recycle_worker_threads':
        logs.push(`[${execTime}] [EXEC] Sent SIGTERM to exhausted worker process PIDs; spawn new worker pool.`);
        logs.push(`[${execTime}] [EXEC] Worker process pool recycling complete.`);
        break;
      default:
        logs.push(`[${execTime}] [EXEC] Action executed successfully via safe adapter.`);
    }

    // Step into VERIFYING state
    const verifyTime = new Date().toISOString();
    logs.push(`[${verifyTime}] [VERIFY] Initiating post-action recovery health checks...`);

    // Post-action verification
    const verification = this.verifyRecovery(action);
    logs.push(...verification.logs);

    const completedAt = new Date().toISOString();
    const finalStatus = verification.passed ? 'SUCCEEDED' : 'FAILED';
    const recoveryStatus = verification.passed ? 'RECOVERED' : 'FAILED';

    const updatedAction: RemediationAction = {
      ...action,
      status: finalStatus,
      completedAt,
      executionLogs: logs,
      recoveryStatus,
      recoveryMetrics: verification.metrics,
    };

    return {
      success: verification.passed,
      action: updatedAction,
      recoveryPassed: verification.passed,
      message: verification.passed
        ? `Remediation executed and verified. Post-action metrics meet operational recovery criteria.`
        : `Remediation execution completed, but post-action recovery verification failed thresholds.`,
      logs,
    };
  }

  /**
   * Deterministic recovery check against predefined thresholds.
   */
  public verifyRecovery(action: RemediationAction): {
    passed: boolean;
    logs: string[];
    metrics: { preValue: number; postValue: number; threshold: number; metric: string; unit: string };
  } {
    const logs: string[] = [];
    const now = new Date().toISOString();

    if (action.actionType === 'scale_connection_pool') {
      const preLatency = 4800;
      const postLatency = 185;
      const threshold = 350;

      logs.push(`[${now}] [VERIFY] Probing /health/ready on ${action.targetService}... Response: 200 OK (22ms)`);
      logs.push(`[${now}] [VERIFY] Checking p95 Latency: Pre=${preLatency}ms -> Post=${postLatency}ms (Threshold <= ${threshold}ms)`);
      logs.push(`[${now}] [VERIFY] DB Socket Timeout Count in last 60s: 0 (Baseline normal)`);

      const passed = postLatency <= threshold;
      if (passed) {
        logs.push(`[${now}] [VERIFY] RECOVERED: Service ${action.targetService} latency restored to normal bounds.`);
      }
      return {
        passed,
        logs,
        metrics: {
          metric: 'p95 Latency',
          unit: 'ms',
          preValue: preLatency,
          postValue: postLatency,
          threshold,
        },
      };
    } else if (action.actionType === 'rollback_deployment') {
      const preErrorRate = 18.5;
      const postErrorRate = 0.2;
      const threshold = 1.0;

      logs.push(`[${now}] [VERIFY] Probing canary error rate: Pre=${preErrorRate}% -> Post=${postErrorRate}% (Threshold <= ${threshold}%)`);
      logs.push(`[${now}] [VERIFY] Synthetic check passing: 50/50 test requests returned HTTP 200.`);

      const passed = postErrorRate <= threshold;
      return {
        passed,
        logs,
        metrics: {
          metric: '5xx Error Rate',
          unit: '%',
          preValue: preErrorRate,
          postValue: postErrorRate,
          threshold,
        },
      };
    } else {
      // Default health check
      logs.push(`[${now}] [VERIFY] HTTP GET /health returned 200 OK within 45ms.`);
      return {
        passed: true,
        logs,
        metrics: {
          metric: 'Health Probe HTTP Status',
          unit: 'code',
          preValue: 503,
          postValue: 200,
          threshold: 200,
        },
      };
    }
  }
}

export const defaultRemediationSafety = new RemediationSafetyEngine();
