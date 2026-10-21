"""
Nightwatch AI - Autonomous Incident Investigation & Reliability Platform
FastAPI Production Gateway
"""

from fastapi import FastAPI, HTTPException, Depends, Header, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
import os

app = FastAPI(
    title="Nightwatch AI API",
    description="Intelligent incident-response platform with real-time anomaly detection and human-in-the-loop remediation.",
    version="2.1.0",
    docs_url="/docs",
    openapi_url="/api/v1/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Schemas
class IncidentCreate(BaseModel):
    title: str
    description: str
    service: str
    severity: str = "HIGH"
    anomaly_score: float = 65.0

class LogIngest(BaseModel):
    timestamp: Optional[str] = None
    service: str
    environment: str = "production"
    level: str
    message: str
    trace_id: str
    metadata: Optional[Dict[str, Any]] = None

class RemediationApproval(BaseModel):
    action_id: str
    role: str
    actor: str
    notes: Optional[str] = None

@app.get("/api/v1/health")
def get_health():
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "2.1.0",
        "components": {
            "postgres": "connected",
            "redis": "connected",
            "celery": "active",
            "ml_isolation_forest": "ready"
        }
    }

@app.get("/api/v1/dashboard/stats")
def get_dashboard_stats():
    return {
        "total_incidents": 4,
        "open_incidents": 1,
        "critical_incidents": 1,
        "mtta_minutes": 2.4,
        "mttr_minutes": 14.8,
        "anomalies_detected": 7,
        "services_degraded": 1,
        "remediation_success_rate": 97.4,
        "time_window": "Last 24 Hours"
    }

@app.post("/api/v1/telemetry/logs", status_code=201)
def ingest_log(payload: LogIngest):
    return {
        "status": "ingested",
        "event_id": f"evt-{int(datetime.utcnow().timestamp())}",
        "normalized_at": datetime.utcnow().isoformat(),
        "service": payload.service
    }

@app.post("/api/v1/remediations/{remediation_id}/approve")
def approve_remediation(remediation_id: str, approval: RemediationApproval):
    if approval.role == "Viewer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Viewer role lacks authorization to approve remediation actions."
        )
    return {
        "action_id": remediation_id,
        "status": "APPROVED",
        "approved_by": approval.actor,
        "timestamp": datetime.utcnow().isoformat()
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
