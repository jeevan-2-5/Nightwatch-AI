import {
  Incident,
  InvestigationReport,
  RemediationAction,
  ServiceNode,
  MLModelStatus,
  AuditLog,
  DashboardStats,
  TelemetryLog,
  ScenarioPreset,
} from '../types';

export class ApiClient {
  private getHeaders(role: string = 'Engineer', email: string = 'elena.rostova@nightwatch.internal'): HeadersInit {
    return {
      'Content-Type': 'application/json',
      'x-user-role': role,
      'x-user-email': email,
    };
  }

  public async getHealth() {
    const res = await fetch('/api/v1/health');
    return res.json();
  }

  public async getStats(): Promise<DashboardStats> {
    const res = await fetch('/api/v1/dashboard/stats');
    return res.json();
  }

  public async getIncidents(params?: { severity?: string; status?: string; service?: string; search?: string }): Promise<{ items: Incident[]; total: number }> {
    const query = new URLSearchParams();
    if (params?.severity) query.set('severity', params.severity);
    if (params?.status) query.set('status', params.status);
    if (params?.service) query.set('service', params.service);
    if (params?.search) query.set('search', params.search);
    const res = await fetch(`/api/v1/incidents?${query.toString()}`);
    return res.json();
  }

  public async getIncident(id: string): Promise<Incident> {
    const res = await fetch(`/api/v1/incidents/${id}`);
    if (!res.ok) throw new Error(`Incident ${id} not found`);
    return res.json();
  }

  public async createIncident(data: Partial<Incident>, role: string, email: string): Promise<Incident> {
    const res = await fetch('/api/v1/incidents', {
      method: 'POST',
      headers: this.getHeaders(role, email),
      body: JSON.stringify(data),
    });
    return res.json();
  }

  public async updateIncident(id: string, updates: Partial<Incident>, role: string, email: string): Promise<Incident> {
    const res = await fetch(`/api/v1/incidents/${id}`, {
      method: 'PATCH',
      headers: this.getHeaders(role, email),
      body: JSON.stringify(updates),
    });
    return res.json();
  }

  public async triggerInvestigation(incidentId: string): Promise<InvestigationReport> {
    const res = await fetch(`/api/v1/incidents/${incidentId}/investigations`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    return res.json();
  }

  public async getInvestigation(id: string): Promise<InvestigationReport> {
    const res = await fetch(`/api/v1/investigations/${id}`);
    if (!res.ok) throw new Error(`Investigation not found`);
    return res.json();
  }

  public async getLogs(params?: { service?: string; level?: string; search?: string }): Promise<{ items: TelemetryLog[]; count: number }> {
    const query = new URLSearchParams();
    if (params?.service) query.set('service', params.service);
    if (params?.level) query.set('level', params.level);
    if (params?.search) query.set('search', params.search);
    const res = await fetch(`/api/v1/telemetry/logs?${query.toString()}`);
    return res.json();
  }

  public async ingestLog(log: Partial<TelemetryLog>): Promise<TelemetryLog> {
    const res = await fetch('/api/v1/telemetry/logs', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(log),
    });
    return res.json();
  }

  public async getServices(): Promise<{ items: ServiceNode[] }> {
    const res = await fetch('/api/v1/services');
    return res.json();
  }

  public async getModelStatus(): Promise<MLModelStatus> {
    const res = await fetch('/api/v1/models/status');
    return res.json();
  }

  public async retrainModel(role: string, email: string) {
    const res = await fetch('/api/v1/models/train', {
      method: 'POST',
      headers: this.getHeaders(role, email),
    });
    return res.json();
  }

  public async getRemediations(): Promise<{ items: RemediationAction[] }> {
    const res = await fetch('/api/v1/remediations');
    return res.json();
  }

  public async approveRemediation(id: string, role: string, email: string, notes?: string): Promise<RemediationAction> {
    const res = await fetch(`/api/v1/remediations/${id}/approve`, {
      method: 'POST',
      headers: this.getHeaders(role, email),
      body: JSON.stringify({ role, actor: email, notes }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to approve');
    }
    return res.json();
  }

  public async executeRemediation(id: string): Promise<{ success: boolean; action: RemediationAction; message: string }> {
    const res = await fetch(`/api/v1/remediations/${id}/execute`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to execute');
    }
    return res.json();
  }

  public async getAuditLogs(): Promise<{ items: AuditLog[] }> {
    const res = await fetch('/api/v1/audit-logs');
    return res.json();
  }

  public async seedScenario(scenario: ScenarioPreset): Promise<void> {
    await fetch('/api/v1/demo/seed', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ scenario }),
    });
  }
}

export const api = new ApiClient();
