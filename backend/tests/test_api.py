"""
Backend Pytest Suite for Nightwatch AI
"""

from fastapi.testclient import TestClient
from app.main import app
import pytest

client = TestClient(app)

def test_health_check():
    res = client.get("/api/v1/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert "postgres" in data["components"]

def test_dashboard_stats():
    res = client.get("/api/v1/dashboard/stats")
    assert res.status_code == 200
    data = res.json()
    assert "open_incidents" in data
    assert "remediation_success_rate" in data

def test_telemetry_log_ingest():
    payload = {
        "service": "payment-api",
        "level": "ERROR",
        "message": "Database socket timeout",
        "trace_id": "tr-test-01"
    }
    res = client.post("/api/v1/telemetry/logs", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert data["status"] == "ingested"

def test_viewer_remediation_approval_forbidden():
    payload = {
        "action_id": "act-scale-pool",
        "role": "Viewer",
        "actor": "auditor@nightwatch.internal"
    }
    res = client.post("/api/v1/remediations/act-scale-pool/approve", json=payload)
    assert res.status_code == 403
