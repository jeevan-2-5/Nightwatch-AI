import test from 'node:test';
import assert from 'node:assert/strict';
import { RemediationSafetyEngine } from './remediation-engine';
import { RemediationAction } from '../types';

test('RemediationSafetyEngine forbids Viewer role from authorizing remediation', () => {
  const engine = new RemediationSafetyEngine();
  const check = engine.canApprove('Viewer', 'scale_connection_pool');
  assert.equal(check.allowed, false);
  assert.ok(check.reason?.includes('Viewer'));
});

test('RemediationSafetyEngine permits Engineer and Admin roles for allowlisted actions', () => {
  const engine = new RemediationSafetyEngine();
  const engCheck = engine.canApprove('Engineer', 'scale_connection_pool');
  assert.equal(engCheck.allowed, true);

  const adminCheck = engine.canApprove('Admin', 'rollback_deployment');
  assert.equal(adminCheck.allowed, true);
});

test('RemediationSafetyEngine rejects unknown non-allowlisted actions', () => {
  const engine = new RemediationSafetyEngine();
  const check = engine.canApprove('Admin', 'arbitrary_bash_command');
  assert.equal(check.allowed, false);
  assert.ok(check.reason?.includes('allowlist'));
});

test('RemediationSafetyEngine runs approval, execution, and deterministic post-recovery check', async () => {
  const engine = new RemediationSafetyEngine();

  const initialAction: RemediationAction = {
    id: 'act-scale-db',
    incidentId: 'INC-4091',
    title: 'Scale Connection Pool & Recycle Idle Threads',
    description: 'Safely expand PgBouncer max pool limit to 250',
    actionType: 'scale_connection_pool',
    targetService: 'postgres-primary',
    parameters: { maxPoolSize: 250 },
    status: 'PENDING_APPROVAL',
    executionLogs: [],
  };

  // 1. Approve
  const approvedAction = engine.approve(initialAction, {
    actionId: initialAction.id,
    actor: 'sre-lead@nightwatch.internal',
    role: 'Engineer',
    notes: 'Approved after checking DB memory headroom',
  });

  assert.equal(approvedAction.status, 'APPROVED');
  assert.equal(approvedAction.approver, 'sre-lead@nightwatch.internal');

  // 2. Execute & Verify
  const result = await engine.execute(approvedAction);
  assert.equal(result.success, true);
  assert.equal(result.action.status, 'SUCCEEDED');
  assert.equal(result.action.recoveryStatus, 'RECOVERED');
  assert.ok(result.action.recoveryMetrics);
  assert.ok(result.action.recoveryMetrics.postValue <= result.action.recoveryMetrics.threshold);
  assert.ok(result.action.executionLogs.some((l) => l.includes('RECOVER')));
});
